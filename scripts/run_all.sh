#!/usr/bin/env bash
# Alur lengkap: unduh sheet -> ETL -> build dashboard HTML + Excel
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/fetch_sheet.sh sheet.xlsx
python3 scripts/etl.py
python3 scripts/build.py
python3 scripts/build_xlsx.py
echo "Selesai. Buka dashboard.html atau Monitoring_Dashboard.xlsx"
