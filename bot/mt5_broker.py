"""MetaTrader 5 broker (IUX). Requires Windows + the MT5 terminal installed and logged in."""
import logging
from datetime import datetime, timedelta

from .broker import BUY, SELL, Broker, OrderResult, Position, SymbolSpec

log = logging.getLogger(__name__)

try:
    import MetaTrader5 as mt5
except ImportError:  # non-Windows machines
    mt5 = None

# symbol_info().filling_mode bit flags
_SYMBOL_FILLING_FOK = 1
_SYMBOL_FILLING_IOC = 2


class MT5Broker(Broker):
    def __init__(self, cfg):
        if mt5 is None:
            raise RuntimeError("The MetaTrader5 package is not installed. It only runs on Windows: "
                               "pip install MetaTrader5")
        self.cfg = cfg

    # --- connection ---------------------------------------------------------
    def connect(self) -> None:
        kwargs = {}
        if self.cfg.mt5_path:
            kwargs["path"] = self.cfg.mt5_path
        if self.cfg.mt5_login:
            kwargs.update(login=self.cfg.mt5_login, password=self.cfg.mt5_password,
                          server=self.cfg.mt5_server)
        if not mt5.initialize(**kwargs):
            raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")
        acc = mt5.account_info()
        log.info("Connected to MT5: account %s on %s, balance %.2f %s, %s account",
                 acc.login, acc.server, acc.balance, acc.currency,
                 "DEMO" if acc.trade_mode == mt5.ACCOUNT_TRADE_MODE_DEMO else "REAL")
        if not mt5.symbol_select(self.cfg.symbol, True):
            raise RuntimeError(f"Symbol '{self.cfg.symbol}' not found. Check the exact name in "
                               "MT5 Market Watch (IUX may use a suffix) and set SYMBOL in .env")

    def _ensure(self) -> None:
        if mt5.terminal_info() is None:
            log.warning("MT5 connection lost, reconnecting")
            self.connect()

    def shutdown(self) -> None:
        mt5.shutdown()

    # --- account ------------------------------------------------------------
    def equity(self) -> float:
        self._ensure()
        return mt5.account_info().equity

    def balance(self) -> float:
        self._ensure()
        return mt5.account_info().balance

    def trading_allowed(self) -> tuple[bool, str]:
        self._ensure()
        if not mt5.terminal_info().trade_allowed:
            return False, "'Algo Trading' is switched off in the MT5 terminal"
        if not mt5.account_info().trade_allowed:
            return False, "trading is disabled for this account"
        return True, ""

    # --- market data --------------------------------------------------------
    def symbol_spec(self, symbol: str) -> SymbolSpec:
        self._ensure()
        s = mt5.symbol_info(symbol)
        if s is None:
            raise RuntimeError(f"symbol_info({symbol}) failed: {mt5.last_error()}")
        tick_value = getattr(s, "trade_tick_value_loss", 0) or s.trade_tick_value
        return SymbolSpec(digits=s.digits, point=s.point, tick_size=s.trade_tick_size,
                          tick_value=tick_value, volume_min=s.volume_min,
                          volume_max=s.volume_max, volume_step=s.volume_step,
                          stops_level=s.trade_stops_level)

    def quote(self, symbol: str) -> tuple[float, float]:
        self._ensure()
        t = mt5.symbol_info_tick(symbol)
        if t is None:
            raise RuntimeError(f"No price for {symbol}: {mt5.last_error()}")
        return t.bid, t.ask

    def atr(self, symbol: str, timeframe: str, period: int) -> float | None:
        self._ensure()
        tf = getattr(mt5, f"TIMEFRAME_{timeframe}", None)
        if tf is None:
            raise ValueError(f"Unknown ATR_TIMEFRAME '{timeframe}' (use M1, M5, M15, H1, H4, D1...)")
        # start at 1 to skip the bar that is still forming
        rates = mt5.copy_rates_from_pos(symbol, tf, 1, period + 1)
        if rates is None or len(rates) < period + 1:
            return None
        trs = []
        for prev, cur in zip(rates[:-1], rates[1:]):
            trs.append(max(cur["high"] - cur["low"],
                           abs(cur["high"] - prev["close"]),
                           abs(cur["low"] - prev["close"])))
        return sum(trs) / len(trs)

    # --- trading ------------------------------------------------------------
    def positions(self, symbol: str, magic: int) -> list[Position]:
        self._ensure()
        result = []
        for p in mt5.positions_get(symbol=symbol) or ():
            if p.magic != magic:
                continue  # leave manual trades alone
            result.append(Position(ticket=p.ticket, symbol=p.symbol,
                                   side=BUY if p.type == mt5.POSITION_TYPE_BUY else SELL,
                                   volume=p.volume, open_price=p.price_open,
                                   sl=p.sl, tp=p.tp, profit=p.profit))
        return result

    def _filling(self, symbol: str) -> int:
        mode = mt5.symbol_info(symbol).filling_mode
        if mode & _SYMBOL_FILLING_FOK:
            return mt5.ORDER_FILLING_FOK
        if mode & _SYMBOL_FILLING_IOC:
            return mt5.ORDER_FILLING_IOC
        return mt5.ORDER_FILLING_RETURN

    def _send(self, request: dict) -> OrderResult:
        res = mt5.order_send(request)
        if res is None:
            return OrderResult(False, f"order_send failed: {mt5.last_error()}")
        if res.retcode not in (mt5.TRADE_RETCODE_DONE, mt5.TRADE_RETCODE_PLACED):
            return OrderResult(False, f"rejected: retcode {res.retcode} ({res.comment})")
        return OrderResult(True, "filled", ticket=res.order, price=res.price)

    def open_market(self, symbol, side, volume, sl, tp, magic, comment) -> OrderResult:
        self._ensure()
        bid, ask = self.quote(symbol)
        return self._send({
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": mt5.ORDER_TYPE_BUY if side == BUY else mt5.ORDER_TYPE_SELL,
            "price": ask if side == BUY else bid,
            "sl": sl,
            "tp": tp,
            "deviation": self.cfg.deviation_points,
            "magic": magic,
            "comment": comment[:31],
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": self._filling(symbol),
        })

    def close_position(self, position: Position, magic: int) -> OrderResult:
        self._ensure()
        bid, ask = self.quote(position.symbol)
        return self._send({
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": position.volume,
            "type": mt5.ORDER_TYPE_SELL if position.side == BUY else mt5.ORDER_TYPE_BUY,
            "position": position.ticket,
            "price": bid if position.side == BUY else ask,
            "deviation": self.cfg.deviation_points,
            "magic": magic,
            "comment": "close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": self._filling(position.symbol),
        })

    def realized_pnl_today(self, magic: int) -> float:
        self._ensure()
        start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        # broker server time is often ahead of local time, so look a day past "now"
        deals = mt5.history_deals_get(start, datetime.now() + timedelta(days=1)) or ()
        return sum(d.profit + d.commission + d.swap + getattr(d, "fee", 0.0)
                   for d in deals if d.magic == magic)
