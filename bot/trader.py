"""Turns a TradingView signal into broker orders, with risk controls."""
import csv
import logging
import math
import os
import threading
import time
from datetime import datetime

from .broker import BUY, SELL, Broker
from .config import Config

log = logging.getLogger(__name__)

ACTIONS = {
    "buy": BUY, "long": BUY,
    "sell": SELL, "short": SELL,
    "close": "close", "exit": "close", "flat": "close",
}


def round_volume_down(volume: float, step: float) -> float:
    decimals = max(0, -int(math.floor(math.log10(step)))) if step < 1 else 0
    return round(math.floor(volume / step + 1e-9) * step, decimals)


class Trader:
    def __init__(self, cfg: Config, broker: Broker):
        self.cfg = cfg
        self.broker = broker
        self._lock = threading.Lock()
        self._recent: dict[tuple, float] = {}
        os.makedirs(cfg.log_dir, exist_ok=True)
        self._journal = os.path.join(cfg.log_dir, "trades.csv")

    # --- public -------------------------------------------------------------
    def handle_signal(self, payload: dict) -> dict:
        action = ACTIONS.get(str(payload.get("action", "")).strip().lower())
        if action is None:
            return self._skip(f"unknown action {payload.get('action')!r} (use buy, sell or close)")

        ticker = str(payload.get("ticker", "")).strip().upper()
        if ticker and self.cfg.allowed_tickers and not self._ticker_allowed(ticker):
            return self._skip(f"ticker {ticker} not in ALLOWED_TICKERS")

        with self._lock:
            key = (action, ticker)
            now = time.monotonic()
            if now - self._recent.get(key, -1e9) < self.cfg.dedupe_seconds:
                return self._skip("duplicate alert ignored")
            self._recent[key] = now

            price = payload.get("price")
            if price not in (None, ""):
                try:
                    self.broker.on_alert_price(self.cfg.symbol, float(price))
                except ValueError:
                    return self._skip(f"bad price {price!r}")

            try:
                return self._execute(action)
            except Exception as exc:  # never let one bad alert kill the server
                log.exception("Error handling %s signal", action)
                return {"status": "error", "message": str(exc)}

    # --- internals ----------------------------------------------------------
    def _ticker_allowed(self, ticker: str) -> bool:
        bare = ticker.split(":")[-1]  # "OANDA:XAUUSD" -> "XAUUSD"
        return bare in self.cfg.allowed_tickers or ticker in self.cfg.allowed_tickers

    def _skip(self, reason: str) -> dict:
        log.info("Skipped: %s", reason)
        return {"status": "skipped", "reason": reason}

    def _execute(self, action: str) -> dict:
        cfg, broker = self.cfg, self.broker
        symbol = cfg.symbol
        actions_taken = []

        # 1. Close positions that point the other way (or everything on "close")
        closed_any = False
        for pos in broker.positions(symbol, cfg.magic):
            if action == "close" or pos.side != action:
                res = broker.close_position(pos, cfg.magic)
                self._record("close", pos.side, pos.volume, res.price, pos.sl, pos.tp, res)
                actions_taken.append(f"closed {pos.side} #{pos.ticket}: {res.message}")
                if not res.ok:
                    return {"status": "error", "message": f"could not close #{pos.ticket}: "
                                                          f"{res.message}", "actions": actions_taken}
                closed_any = True

        if action == "close":
            return {"status": "ok", "actions": actions_taken or ["nothing to close"]}
        if closed_any and not cfg.reverse_on_opposite:
            return {"status": "ok", "actions": actions_taken}

        # 2. Already in this direction? Don't stack trades.
        if any(p.side == action for p in broker.positions(symbol, cfg.magic)):
            return {"status": "ok", "actions": actions_taken + [f"already {action}, no new trade"]}

        # 3. Safety checks
        allowed, why = broker.trading_allowed()
        if not allowed:
            return self._skip_with(actions_taken, why)

        blocked = self._daily_loss_block()
        if blocked:
            return self._skip_with(actions_taken, blocked)

        spec = broker.symbol_spec(symbol)
        bid, ask = broker.quote(symbol)
        spread = ask - bid
        if cfg.max_spread and spread > cfg.max_spread:
            return self._skip_with(actions_taken, f"spread {spread:.2f} > MAX_SPREAD {cfg.max_spread}")

        # 4. Stop-loss / take-profit distances
        sl_dist = None
        if cfg.sl_mode == "atr":
            atr = broker.atr(symbol, cfg.atr_timeframe, cfg.atr_period)
            if atr:
                sl_dist = atr * cfg.sl_atr_mult
            else:
                log.warning("ATR not available, using SL_FIXED_DISTANCE")
        if sl_dist is None:
            sl_dist = cfg.sl_fixed_distance
        min_dist = spec.stops_level * spec.point + spread
        sl_dist = max(sl_dist, min_dist)
        tp_dist = max(sl_dist * cfg.tp_rr, min_dist)

        entry = ask if action == BUY else bid
        if action == BUY:
            sl, tp = entry - sl_dist, entry + tp_dist
        else:
            sl, tp = entry + sl_dist, entry - tp_dist
        sl, tp = round(sl, spec.digits), round(tp, spec.digits)

        # 5. Position size so that hitting the SL loses RISK_PERCENT of equity
        equity = broker.equity()
        risk_money = equity * cfg.risk_percent / 100
        loss_per_lot = sl_dist / spec.tick_size * spec.tick_value
        volume = round_volume_down(risk_money / loss_per_lot, spec.volume_step)
        volume = min(volume, cfg.max_lot, spec.volume_max)
        volume = round_volume_down(volume, spec.volume_step)
        if volume < spec.volume_min:
            return self._skip_with(actions_taken,
                                   f"account too small: {cfg.risk_percent}% risk = {risk_money:.2f} "
                                   f"but minimum lot {spec.volume_min} would risk "
                                   f"{loss_per_lot * spec.volume_min:.2f}")

        # 6. Send it
        res = broker.open_market(symbol, action, volume, sl, tp, cfg.magic, "sniper-bot")
        self._record("open", action, volume, res.price, sl, tp, res)
        actions_taken.append(f"opened {action} {volume} {symbol} @ {res.price} SL {sl} TP {tp}: "
                             f"{res.message}" if res.ok else f"open {action} failed: {res.message}")
        log.info(actions_taken[-1])
        return {"status": "ok" if res.ok else "error", "actions": actions_taken,
                "risk": round(loss_per_lot * volume, 2)}

    def _skip_with(self, actions_taken: list, reason: str) -> dict:
        log.warning("No new trade: %s", reason)
        return {"status": "skipped", "reason": reason, "actions": actions_taken}

    def _daily_loss_block(self) -> str | None:
        if not self.cfg.max_daily_loss_percent:
            return None
        realized = self.broker.realized_pnl_today(self.cfg.magic)
        balance = self.broker.balance()
        floating = self.broker.equity() - balance
        start_of_day = balance - realized
        loss = -(realized + floating)
        limit = start_of_day * self.cfg.max_daily_loss_percent / 100
        if loss >= limit:
            return (f"daily loss limit hit ({loss:.2f} >= {limit:.2f}); "
                    "no new trades until tomorrow")
        return None

    def _record(self, event, side, volume, price, sl, tp, res) -> None:
        new_file = not os.path.exists(self._journal)
        with open(self._journal, "a", newline="") as f:
            w = csv.writer(f)
            if new_file:
                w.writerow(["time", "mode", "event", "side", "volume", "price", "sl", "tp",
                            "ok", "ticket", "message"])
            w.writerow([datetime.now().isoformat(timespec="seconds"), self.cfg.mode, event, side,
                        volume, price, sl, tp, res.ok, res.ticket, res.message])
