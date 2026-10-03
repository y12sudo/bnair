"""Start the auto-trader: python run.py"""
import logging
import os
import sys

from waitress import serve

from bot.config import Config
from bot.server import create_app
from bot.trader import Trader


def main() -> None:
    cfg = Config.from_env()
    os.makedirs(cfg.log_dir, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout),
                  logging.FileHandler(os.path.join(cfg.log_dir, "bot.log"), encoding="utf-8")],
    )

    if cfg.mode == "mt5":
        from bot.mt5_broker import MT5Broker
        broker = MT5Broker(cfg)
    else:
        from bot.dry_run_broker import DryRunBroker
        broker = DryRunBroker(balance=cfg.dry_run_balance)
    broker.connect()

    app = create_app(Trader(cfg, broker))
    logging.info("Listening for TradingView alerts on http://%s:%s/webhook", cfg.host, cfg.port)
    try:
        serve(app, host=cfg.host, port=cfg.port, threads=4)
    finally:
        broker.shutdown()


if __name__ == "__main__":
    main()
