#!/usr/bin/env bash
# ricehub bot runner - local cron setup
# run: ./setup-cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$SCRIPT_DIR"
CRON_JOB_RUNNER="0 */6 * * * cd $BOT_DIR && /usr/bin/node bot-runner.js >> $BOT_DIR/bot-runner.log 2>&1"
CRON_JOB_SIM="*/5 * * * * cd $BOT_DIR && /usr/bin/node world-simulator.js >> $BOT_DIR/world-sim.log 2>&1"

MODE="${1:-runner}"

echo "Setting up ricehub bot cron job..."
echo "Bot directory: $BOT_DIR"
echo "Mode: $MODE"
echo ""

# Check if files exist
if [[ "$MODE" == "runner" && ! -f "$BOT_DIR/bot-runner.js" ]]; then
    echo "❌ bot-runner.js not found at $BOT_DIR"
    exit 1
fi

if [[ "$MODE" == "simulate" && ! -f "$BOT_DIR/world-simulator.js" ]]; then
    echo "❌ world-simulator.js not found at $BOT_DIR"
    exit 1
fi

# Check if FIREBASE_SERVICE_ACCOUNT is set in environment
if [[ -z "${FIREBASE_SERVICE_ACCOUNT:-}" && ! -f "$BOT_DIR/.env" ]]; then
    echo "⚠️  FIREBASE_SERVICE_ACCOUNT not set in environment"
    echo "   Create $BOT_DIR/.env with:"
    echo "   FIREBASE_SERVICE_ACCOUNT='{...json...}'"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [[ "$MODE" == "runner" ]]; then
    # Add to crontab (avoid duplicates)
    (crontab -l 2>/dev/null | grep -v "bot-runner.js"; echo "$CRON_JOB_RUNNER") | crontab -
    echo "✅ Cron job installed (runner mode, every 6 hours)"
    echo "Logs: $BOT_DIR/bot-runner.log"
else
    # Add to crontab (avoid duplicates)
    (crontab -l 2>/dev/null | grep -v "world-simulator.js"; echo "$CRON_JOB_SIM") | crontab -
    echo "✅ Cron job installed (simulate mode, every 5 minutes)"
    echo "Logs: $BOT_DIR/world-sim.log"
fi

echo ""
echo "Current crontab:"
crontab -l
echo ""
echo "To run manually:"
echo "  cd $BOT_DIR && node ${MODE}.js"
echo ""
echo "To view logs:"
echo "  tail -f $BOT_DIR/${MODE}.log"