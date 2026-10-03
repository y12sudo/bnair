"""Settings, loaded from environment variables (or a .env file)."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv


def _bool(value: str) -> bool:
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _list(value: str) -> tuple:
    return tuple(v.strip().upper() for v in value.split(",") if v.strip())


@dataclass(frozen=True)
class Config:
    # Security
    webhook_secret: str

    # "dry_run" = in-memory simulation (no MT5 needed), "mt5" = real MT5 terminal
    mode: str

    # MetaTrader 5 / IUX login (leave blank to use the account already open in the terminal)
    mt5_login: int | None
    mt5_password: str
    mt5_server: str
    mt5_path: str

    # What to trade
    symbol: str                 # symbol name as shown in IUX MT5 Market Watch
    allowed_tickers: tuple      # TradingView tickers accepted from alerts

    # Risk
    risk_percent: float         # % of equity lost if the stop-loss is hit
    sl_mode: str                # "atr" or "fixed"
    sl_atr_mult: float
    atr_period: int
    atr_timeframe: str
    sl_fixed_distance: float    # price distance, e.g. 5.0 = $5 on gold
    tp_rr: float                # take-profit = SL distance * tp_rr
    max_daily_loss_percent: float
    max_spread: float           # in price units, 0 = no check
    max_lot: float
    reverse_on_opposite: bool   # opposite signal closes AND opens the other way

    # Plumbing
    magic: int
    dedupe_seconds: int
    deviation_points: int
    host: str
    port: int
    dry_run_balance: float
    log_dir: str

    @classmethod
    def from_env(cls, env_file: str | None = ".env") -> "Config":
        if env_file:
            load_dotenv(env_file)
        g = os.getenv
        login = g("MT5_LOGIN", "").strip()
        cfg = cls(
            webhook_secret=g("WEBHOOK_SECRET", ""),
            mode=g("MODE", "dry_run").strip().lower(),
            mt5_login=int(login) if login else None,
            mt5_password=g("MT5_PASSWORD", ""),
            mt5_server=g("MT5_SERVER", ""),
            mt5_path=g("MT5_PATH", ""),
            symbol=g("SYMBOL", "XAUUSD"),
            allowed_tickers=_list(g("ALLOWED_TICKERS", "XAUUSD,GOLD")),
            risk_percent=float(g("RISK_PERCENT", "1.0")),
            sl_mode=g("SL_MODE", "atr").strip().lower(),
            sl_atr_mult=float(g("SL_ATR_MULT", "1.5")),
            atr_period=int(g("ATR_PERIOD", "14")),
            atr_timeframe=g("ATR_TIMEFRAME", "M15").strip().upper(),
            sl_fixed_distance=float(g("SL_FIXED_DISTANCE", "5.0")),
            tp_rr=float(g("TP_RR", "2.0")),
            max_daily_loss_percent=float(g("MAX_DAILY_LOSS_PERCENT", "3.0")),
            max_spread=float(g("MAX_SPREAD", "1.0")),
            max_lot=float(g("MAX_LOT", "1.0")),
            reverse_on_opposite=_bool(g("REVERSE_ON_OPPOSITE", "true")),
            magic=int(g("MAGIC", "250302")),
            dedupe_seconds=int(g("DEDUPE_SECONDS", "30")),
            deviation_points=int(g("DEVIATION_POINTS", "50")),
            host=g("HOST", "0.0.0.0"),
            port=int(g("PORT", "80")),
            dry_run_balance=float(g("DRY_RUN_BALANCE", "10000")),
            log_dir=g("LOG_DIR", "logs"),
        )
        cfg.validate()
        return cfg

    def validate(self) -> None:
        if len(self.webhook_secret) < 12:
            raise ValueError("WEBHOOK_SECRET must be set and at least 12 characters long")
        if self.mode not in ("dry_run", "mt5"):
            raise ValueError("MODE must be 'dry_run' or 'mt5'")
        if self.sl_mode not in ("atr", "fixed"):
            raise ValueError("SL_MODE must be 'atr' or 'fixed'")
        if not 0 < self.risk_percent <= 5:
            raise ValueError("RISK_PERCENT must be between 0 and 5")
        if self.tp_rr <= 0 or self.sl_fixed_distance <= 0 or self.sl_atr_mult <= 0:
            raise ValueError("TP_RR, SL_FIXED_DISTANCE and SL_ATR_MULT must be positive")
