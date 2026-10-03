import dataclasses

import pytest

from bot.broker import BUY, SELL
from bot.config import Config
from bot.dry_run_broker import DryRunBroker
from bot.server import create_app
from bot.trader import Trader, round_volume_down

SECRET = "test-secret-123456"


@pytest.fixture
def cfg(tmp_path):
    return Config(
        webhook_secret=SECRET, mode="dry_run", mt5_login=None, mt5_password="", mt5_server="",
        mt5_path="", symbol="XAUUSD", allowed_tickers=("XAUUSD", "GOLD"), risk_percent=1.0,
        sl_mode="fixed", sl_atr_mult=1.5, atr_period=14, atr_timeframe="M15",
        sl_fixed_distance=5.0, tp_rr=2.0, max_daily_loss_percent=3.0, max_spread=1.0,
        max_lot=1.0, reverse_on_opposite=True, magic=1, dedupe_seconds=30,
        deviation_points=50, host="127.0.0.1", port=8080, dry_run_balance=10_000,
        log_dir=str(tmp_path),
    )


@pytest.fixture
def broker():
    return DryRunBroker(balance=10_000, spread=0.20)


def signal(action, price, ticker="XAUUSD"):
    return {"secret": SECRET, "action": action, "ticker": ticker, "price": price}


def test_round_volume_down():
    assert round_volume_down(0.209999, 0.01) == 0.20
    assert round_volume_down(0.2, 0.01) == 0.2
    assert round_volume_down(3.7, 1) == 3


def test_buy_sizes_position_to_one_percent_risk(cfg, broker):
    res = Trader(cfg, broker).handle_signal(signal("buy", 2400.0))
    assert res["status"] == "ok"
    [pos] = broker.open
    # $5 SL on gold = $500 per lot, 1% of 10k = $100 -> 0.20 lots
    assert pos.side == BUY and pos.volume == 0.20
    assert pos.open_price == 2400.10                      # filled at the ask
    assert pos.sl == pytest.approx(2395.10)
    assert pos.tp == pytest.approx(2410.10)               # 2R
    assert res["risk"] == pytest.approx(100.0)


def test_opposite_signal_closes_and_reverses(cfg, broker):
    trader = Trader(cfg, broker)
    trader.handle_signal(signal("buy", 2400.0))
    res = trader.handle_signal(signal("sell", 2404.0))
    assert res["status"] == "ok"
    [pos] = broker.open
    assert pos.side == SELL
    assert broker.balance() > 10_000                      # the long closed in profit


def test_opposite_signal_only_closes_when_reverse_disabled(cfg, broker):
    trader = Trader(dataclasses.replace(cfg, reverse_on_opposite=False), broker)
    trader.handle_signal(signal("buy", 2400.0))
    trader.handle_signal(signal("sell", 2404.0))
    assert broker.open == []


def test_same_direction_does_not_stack(cfg, broker):
    trader = Trader(dataclasses.replace(cfg, dedupe_seconds=0), broker)
    trader.handle_signal(signal("buy", 2400.0))
    res = trader.handle_signal(signal("buy", 2401.0))
    assert len(broker.open) == 1
    assert "already buy" in res["actions"][-1]


def test_duplicate_alert_ignored(cfg, broker):
    trader = Trader(cfg, broker)
    trader.handle_signal(signal("buy", 2400.0))
    res = trader.handle_signal(signal("buy", 2400.0))
    assert res["status"] == "skipped"


def test_stop_loss_hit_between_alerts(cfg, broker):
    trader = Trader(cfg, broker)
    trader.handle_signal(signal("buy", 2400.0))
    trader.handle_signal(signal("close", 2390.0))         # price fell through the SL first
    assert broker.open == []
    assert broker.balance() == pytest.approx(9_900.0)     # lost exactly 1%


def test_daily_loss_limit_blocks_new_trades(cfg, broker):
    trader = Trader(dataclasses.replace(cfg, dedupe_seconds=0, max_daily_loss_percent=2.5), broker)
    for _ in range(3):                                    # three ~1% losses = 2.97%
        trader.handle_signal(signal("buy", 2400.0))
        trader.handle_signal(signal("close", 2390.0))
    res = trader.handle_signal(signal("buy", 2400.0))
    assert res["status"] == "skipped"
    assert "daily loss limit" in res["reason"]
    assert broker.open == []


def test_wide_spread_blocks_trade(cfg):
    broker = DryRunBroker(spread=2.0)
    res = Trader(cfg, broker).handle_signal(signal("buy", 2400.0))
    assert res["status"] == "skipped" and "spread" in res["reason"]


def test_account_too_small_skips_instead_of_over_risking(cfg):
    broker = DryRunBroker(balance=100)                    # 1% = $1 but min lot risks $5
    res = Trader(cfg, broker).handle_signal(signal("buy", 2400.0))
    assert res["status"] == "skipped" and "too small" in res["reason"]


def test_max_lot_cap(cfg):
    broker = DryRunBroker(balance=1_000_000)
    Trader(cfg, broker).handle_signal(signal("buy", 2400.0))
    assert broker.open[0].volume == 1.0


def test_wrong_ticker_rejected(cfg, broker):
    res = Trader(cfg, broker).handle_signal(signal("buy", 1.1, ticker="EURUSD"))
    assert res["status"] == "skipped"
    assert broker.open == []


def test_exchange_prefixed_ticker_accepted(cfg, broker):
    res = Trader(cfg, broker).handle_signal(signal("buy", 2400.0, ticker="OANDA:XAUUSD"))
    assert res["status"] == "ok"


def test_webhook_rejects_bad_secret_and_bad_json(cfg, broker):
    client = create_app(Trader(cfg, broker)).test_client()
    assert client.post("/webhook", data="not json").status_code == 400
    bad = {**signal("buy", 2400.0), "secret": "wrong"}
    assert client.post("/webhook", json=bad).status_code == 401
    assert broker.open == []


def test_webhook_accepts_text_plain_json(cfg, broker):
    # TradingView sometimes sends the JSON with a text/plain content type
    client = create_app(Trader(cfg, broker)).test_client()
    body = '{"secret": "%s", "action": "buy", "ticker": "XAUUSD", "price": 2400}' % SECRET
    r = client.post("/webhook", data=body, content_type="text/plain")
    assert r.status_code == 200 and r.get_json()["status"] == "ok"
    assert len(broker.open) == 1
