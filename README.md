# SniperV.02 → IUX auto-trader (XAU/USD)

Places trades automatically on your **IUX MetaTrader 5** account when the
**SniperV.02** indicator fires a Buy or Sell alert on TradingView, and closes
them automatically.

```
TradingView alert ──webhook──▶ this bot (Python, on Windows) ──▶ MT5 terminal ──▶ IUX
```

## ⚠️ Read this first

- **This is not free money.** An indicator that looks perfect on the chart
  often loses money live. Many community indicators *repaint*: signals move or
  disappear after the candle closes, so the chart history looks far better than
  real trading. Gold is volatile, and spread and slippage eat into every trade.
- **Run it on an IUX demo account for at least 2–4 weeks** and check
  `logs/trades.csv` and your MT5 history before you even think about real money.
- Never risk money you can't afford to lose. Leverage up to 1:3000 can wipe out an account
  in minutes. That is why the bot sizes every trade from a stop-loss.

## What the bot does

| Event | Action |
|---|---|
| **Buy** alert | Closes any short, then opens a long |
| **Sell** alert | Closes any long, then opens a short |
| Same signal twice | Ignored. Trades never stack. |
| Price hits stop-loss / take-profit | MT5 closes it. SL/TP sit on IUX's server, so they work even if your PC is off. |
| `close` alert (optional) | Closes everything |

So a trade exits on **whichever comes first**: the opposite signal, the TP, or the SL.

**Risk controls (all in `.env`):**
- **1% risk per trade.** The lot size is calculated so that hitting the stop-loss loses 1% of equity.
- **Stop-loss** = 1.5 × ATR(14) (adapts to volatility), or a fixed $ distance.
- **Take-profit** = 2 × the stop distance.
- **Daily loss limit** (3%). No new trades for the rest of the day once it's hit.
- **Max spread filter.** Skips the trade when spreads blow out (news, rollover).
- **Max lot cap.**
- **Duplicate alert filter.** If TradingView sends the same alert twice, the bot trades once.
- **Leaves your manual trades alone.** It only manages trades tagged with its `MAGIC` number.
- **Skips the trade if your account is too small** to keep risk at 1% with the minimum lot, instead of over-risking.

## What you need

1. **A Windows PC or Windows VPS** that stays on. The MetaTrader5 Python
   library only works on Windows. A cheap Windows VPS is best, because the bot
   has to be running whenever a signal fires.
2. **MetaTrader 5 from IUX**, logged into an **IUX demo account**.
3. **Python 3.10+ (64-bit)** from python.org. Tick *"Add Python to PATH"* during install.
4. **A paid TradingView plan** (Essential or higher). Webhook alerts aren't available on the free plan.
5. **ngrok** (free) to give your PC a public `https://` address that TradingView can reach.

## Setup

### 1. MetaTrader 5
1. Install MT5 from IUX and log into your **demo** account.
2. Open **Market Watch** (Ctrl+M), find gold, and note the **exact** symbol name
   (e.g. `XAUUSD`, or something with a suffix).
3. **Tools → Options → Expert Advisors** → tick **Allow algorithmic trading**.
4. Make sure the **Algo Trading** button in the toolbar is green.
5. Leave MT5 open.

### 2. The bot
Open Command Prompt in this folder:
```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
notepad .env
```
In `.env`, set at least:
- `WEBHOOK_SECRET`: a long random password
- `SYMBOL`: the exact gold symbol from step 1.2
- `ATR_TIMEFRAME`: the timeframe you run SniperV.02 on (e.g. `M15`)
- Keep `MODE=dry_run` for now

Start it:
```bat
python run.py
```

### 3. Make it reachable from TradingView
TradingView only sends webhooks to ports 80/443. In a second Command Prompt:
```bat
ngrok http 80
```
Copy the `https://xxxx.ngrok-free.app` address it shows. Your webhook URL is:
```
https://xxxx.ngrok-free.app/webhook
```
> On the free ngrok plan the address can change when you restart ngrok. If it
> does, update your alerts. (A free static ngrok domain or a VPS with a fixed IP avoids this.)

### 4. TradingView alerts (create TWO)
Open an **XAUUSD** chart on the timeframe you chose, with SniperV.02 added.

**Alert 1: Buy**
- Condition: `SniperV.02` → **Buy** signal (whatever the script calls it)
- Trigger: **Once Per Bar Close** ← important, this cuts down on repainting signals
- Expiration: open-ended
- Notifications tab → tick **Webhook URL** → paste your URL
- Message (replace the secret):
  ```json
  {"secret": "YOUR_WEBHOOK_SECRET", "action": "buy", "ticker": "{{ticker}}", "price": "{{close}}"}
  ```

**Alert 2: Sell**: the same, but choose the **Sell** condition and `"action": "sell"`.

### 5. Test, then switch to the demo account
1. With `MODE=dry_run`, wait for a signal (or test by hand, see below). You
   should see `Alert received` in the bot window, and a row in `logs/trades.csv`.
2. Stop the bot (Ctrl+C), set `MODE=mt5` in `.env`, and start it again. The first
   log lines show your account number and **DEMO** or **REAL**. Make sure it says **DEMO**.
3. Let it trade the demo account for weeks, then judge the results.

Test by hand without waiting for a signal (PowerShell):
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost/webhook -ContentType "application/json" `
  -Body '{"secret":"YOUR_WEBHOOK_SECRET","action":"buy","ticker":"XAUUSD","price":"2400"}'
```
Send `"action":"close"` to close the trade again.

## Files

| Path | What it is |
|---|---|
| `run.py` | Starts the bot |
| `bot/trader.py` | Signal → order logic, position sizing, risk checks |
| `bot/mt5_broker.py` | Talks to MetaTrader 5 / IUX |
| `bot/dry_run_broker.py` | Simulated broker for testing without MT5 |
| `bot/server.py` | The `/webhook` endpoint TradingView calls |
| `logs/bot.log` | Everything the bot did |
| `logs/trades.csv` | Every open/close, for reviewing results |

Run the tests: `pip install -r requirements-dev.txt` then `pytest`.

## Things to know

- **Prices differ a little.** TradingView's XAUUSD feed and IUX's feed don't
  match exactly. The bot always trades at IUX's live price. The alert's `price`
  is only used in dry-run mode.
- **Keep the PC awake.** Turn off sleep in Windows power settings. If the bot or
  ngrok is down when a signal fires, that signal is missed. Open trades are
  still protected by their SL/TP on IUX's server.
- **Weekends and market close.** Orders sent while gold is closed are rejected,
  and the bot logs it.
- **Keep `WEBHOOK_SECRET` private.** Anyone who has it and your URL can send trades to your bot.
