#!/usr/bin/env bash
# Alur lengkap: unduh sheet -> ETL -> build dashboard
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/fetch_sheet.sh sheet.xlsx
python3 scripts/etl.py
python3 scripts/build.py
echo "Selesai. Buka dashboard.html"
