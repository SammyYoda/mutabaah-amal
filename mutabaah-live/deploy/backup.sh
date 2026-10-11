#!/usr/bin/env bash
# Daily SQLite backup for the live server (run from cron).
# Writes data/backups/mutabaah-YYYYMMDD-HHmm.db and keeps the newest 14.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-/home/test01/.nvm/versions/node/v24.14.0/bin/node}"

cd "$APP_DIR"
mkdir -p data/backups
echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] backup start"
DATABASE_URL="${DATABASE_URL:-file:./data/mutabaah.db}" "$NODE" node_modules/tsx/dist/cli.mjs server/src/cli/backup.ts
echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] backup done"
