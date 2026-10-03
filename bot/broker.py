"""Broker interface shared by the MT5 and dry-run implementations."""
from abc import ABC, abstractmethod
from dataclasses import dataclass

BUY = "buy"
SELL = "sell"


@dataclass
class SymbolSpec:
    digits: int
    point: float
    tick_size: float
    tick_value: float        # account-currency value of one tick move for 1.0 lot (loss side)
    volume_min: float
    volume_max: float
    volume_step: float
    stops_level: int         # minimum SL/TP distance in points


@dataclass
class Position:
    ticket: int
    symbol: str
    side: str
    volume: float
    open_price: float
    sl: float
    tp: float
    profit: float = 0.0


@dataclass
class OrderResult:
    ok: bool
    message: str
    ticket: int | None = None
    price: float | None = None


class Broker(ABC):
    @abstractmethod
    def connect(self) -> None: ...

    @abstractmethod
    def shutdown(self) -> None: ...

    @abstractmethod
    def equity(self) -> float: ...

    @abstractmethod
    def balance(self) -> float: ...

    @abstractmethod
    def trading_allowed(self) -> tuple[bool, str]:
        """(allowed, reason) - e.g. MT5 'Algo Trading' button switched off."""

    @abstractmethod
    def symbol_spec(self, symbol: str) -> SymbolSpec: ...

    @abstractmethod
    def quote(self, symbol: str) -> tuple[float, float]:
        """(bid, ask)"""

    @abstractmethod
    def atr(self, symbol: str, timeframe: str, period: int) -> float | None:
        """Average True Range on closed bars, or None if not available."""

    @abstractmethod
    def positions(self, symbol: str, magic: int) -> list[Position]: ...

    @abstractmethod
    def open_market(self, symbol: str, side: str, volume: float, sl: float, tp: float,
                    magic: int, comment: str) -> OrderResult: ...

    @abstractmethod
    def close_position(self, position: Position, magic: int) -> OrderResult: ...

    @abstractmethod
    def realized_pnl_today(self, magic: int) -> float: ...

    def on_alert_price(self, symbol: str, price: float) -> None:
        """Hook for the dry-run broker, which uses the alert price as its market price."""
