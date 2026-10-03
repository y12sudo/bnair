"""In-memory simulated broker for testing the wiring without MetaTrader 5.

Prices come from the alerts themselves ({{close}}), so stop-loss / take-profit
are only checked when the next alert arrives. For realistic paper trading use
an IUX *demo* account with MODE=mt5 instead.
"""
import itertools
import logging
from datetime import date

from .broker import BUY, Broker, OrderResult, Position, SymbolSpec

log = logging.getLogger(__name__)

# Typical gold CFD contract: 100 oz per lot, 0.01 price tick worth $1 per lot
GOLD_SPEC = SymbolSpec(digits=2, point=0.01, tick_size=0.01, tick_value=1.0,
                       volume_min=0.01, volume_max=100.0, volume_step=0.01, stops_level=0)


class DryRunBroker(Broker):
    def __init__(self, balance: float = 10_000.0, spread: float = 0.20,
                 spec: SymbolSpec = GOLD_SPEC):
        self._balance = balance
        self.spread = spread
        self.spec = spec
        self.prices: dict[str, float] = {}
        self.open: list[Position] = []
        self.closed_pnl: dict[date, float] = {}
        self._tickets = itertools.count(1)

    def connect(self) -> None:
        log.info("DRY RUN mode: simulated account with %.2f balance, no real orders", self._balance)

    def shutdown(self) -> None:
        pass

    def _pnl(self, p: Position, exit_price: float) -> float:
        diff = exit_price - p.open_price if p.side == BUY else p.open_price - exit_price
        return diff / self.spec.tick_size * self.spec.tick_value * p.volume

    def _exit_price(self, p: Position) -> float:
        bid, ask = self.quote(p.symbol)
        return bid if p.side == BUY else ask

    def equity(self) -> float:
        return self._balance + sum(self._pnl(p, self._exit_price(p)) for p in self.open)

    def balance(self) -> float:
        return self._balance

    def trading_allowed(self) -> tuple[bool, str]:
        return True, ""

    def symbol_spec(self, symbol: str) -> SymbolSpec:
        return self.spec

    def quote(self, symbol: str) -> tuple[float, float]:
        if symbol not in self.prices:
            raise RuntimeError(f"No price yet for {symbol} (send 'price' in the alert)")
        mid = self.prices[symbol]
        return round(mid - self.spread / 2, self.spec.digits), round(mid + self.spread / 2, self.spec.digits)

    def atr(self, symbol: str, timeframe: str, period: int) -> float | None:
        return None  # no price history; the trader falls back to SL_FIXED_DISTANCE

    def on_alert_price(self, symbol: str, price: float) -> None:
        self.prices[symbol] = price
        # Check whether the move since the last alert would have hit SL or TP
        for p in list(self.open):
            if p.symbol != symbol:
                continue
            exit_price = self._exit_price(p)
            hit_sl = p.sl and (exit_price <= p.sl if p.side == BUY else exit_price >= p.sl)
            hit_tp = p.tp and (exit_price >= p.tp if p.side == BUY else exit_price <= p.tp)
            if hit_sl or hit_tp:
                level = p.sl if hit_sl else p.tp
                self._close(p, level, "stop-loss" if hit_sl else "take-profit")

    def positions(self, symbol: str, magic: int) -> list[Position]:
        return [p for p in self.open if p.symbol == symbol]

    def open_market(self, symbol, side, volume, sl, tp, magic, comment) -> OrderResult:
        bid, ask = self.quote(symbol)
        price = ask if side == BUY else bid
        p = Position(ticket=next(self._tickets), symbol=symbol, side=side, volume=volume,
                     open_price=price, sl=sl, tp=tp)
        self.open.append(p)
        return OrderResult(True, "filled (simulated)", ticket=p.ticket, price=price)

    def _close(self, p: Position, price: float, reason: str) -> float:
        pnl = self._pnl(p, price)
        self._balance += pnl
        self.closed_pnl[date.today()] = self.closed_pnl.get(date.today(), 0.0) + pnl
        self.open.remove(p)
        log.info("[dry run] closed #%s %s %.2f @ %.2f by %s, P/L %.2f, balance %.2f",
                 p.ticket, p.side, p.volume, price, reason, pnl, self._balance)
        return pnl

    def close_position(self, position: Position, magic: int) -> OrderResult:
        price = self._exit_price(position)
        self._close(position, price, "signal")
        return OrderResult(True, "closed (simulated)", ticket=position.ticket, price=price)

    def realized_pnl_today(self, magic: int) -> float:
        return self.closed_pnl.get(date.today(), 0.0)
