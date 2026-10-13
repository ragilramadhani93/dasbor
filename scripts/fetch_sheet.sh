#!/usr/bin/env bash
# Unduh workbook Google Sheet terbaru menjadi sheet.xlsx
set -euo pipefail
SHEET_ID="1BBio_q7gdfyXUUtoPGdTestAECyQIg459Q83vRMrs5Y"
OUT="${1:-sheet.xlsx}"
echo "Mengunduh $SHEET_ID -> $OUT"
curl -sSL "https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx" -o "$OUT"
ls -la "$OUT"
