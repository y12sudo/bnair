"""Webhook endpoint that TradingView alerts post to."""
import hmac
import json
import logging

from flask import Flask, jsonify, request

from .trader import Trader

log = logging.getLogger(__name__)


def create_app(trader: Trader) -> Flask:
    app = Flask(__name__)
    secret = trader.cfg.webhook_secret

    @app.get("/health")
    def health():
        return jsonify(status="ok", mode=trader.cfg.mode, symbol=trader.cfg.symbol)

    @app.post("/webhook")
    def webhook():
        raw = request.get_data(as_text=True)
        try:
            payload = json.loads(raw)
            if not isinstance(payload, dict):
                raise ValueError
        except ValueError:
            log.warning("Rejected non-JSON alert body: %.200s", raw)
            return jsonify(status="error", message="alert message must be JSON"), 400

        if not hmac.compare_digest(str(payload.get("secret", "")), secret):
            log.warning("Rejected alert with wrong secret from %s", request.remote_addr)
            return jsonify(status="error", message="unauthorized"), 401

        log.info("Alert received: action=%s ticker=%s price=%s", payload.get("action"),
                 payload.get("ticker"), payload.get("price"))
        return jsonify(trader.handle_signal(payload))

    return app
