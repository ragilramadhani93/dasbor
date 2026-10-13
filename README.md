# Dashboard Monitoring KACC

Dashboard monitoring **lengkap, interaktif, dan mandiri (single file)** yang dibangun otomatis dari workbook Google Sheet:

> https://docs.google.com/spreadsheets/d/1BBio_q7gdfyXUUtoPGdTestAECyQIg459Q83vRMrs5Y

Buka file **`dashboard.html`** (klik dua kali) — tidak butuh internet, server, atau instalasi apa pun. Semua data & grafik sudah tertanam di dalamnya.

Tersedia juga versi spreadsheet: **`Monitoring_Dashboard.xlsx`** (8 sheet + 9 grafik native Excel).

---

## 1. Isi Dashboard (9 bagian)

| Bagian | Isi |
|---|---|
| **Ringkasan Eksekutif** | KPI omset harian & MTD, pencapaian vs target, shortfall, outlet aktif, omset snack, grafik realisasi vs target per area, kontribusi area, tabel pencapaian outlet |
| **Performa Outlet** | Top 15 outlet (omset MTD), 10 outlet perlu perhatian, tabel lengkap semua outlet (harian & MTD, %, shortfall) yang bisa diurutkan |
| **Tren Penjualan** | Omset & transaksi bulanan (Jul–Okt 2026), grafik omset harian per bulan, omset bulanan per area, matriks omset per outlet per bulan |
| **Produk & Kategori** | Bauran kategori, top 15 produk, metode pembayaran, pola jam sibuk, pola hari, produk terlaris bulan terpilih |
| **Snack / Roti & Pastry** | KPI qty & omset snack (harian & MTD), snack per menu, snack per area, detail per outlet |
| **Inventori & Stok** | KPI saldo stok, SKU negatif per outlet, detail stok negatif, seluruh saldo stok |
| **Bahan Baku & BOM** | Pemakaian bahan baku, bahan paling sering dipakai di resep, rincian pemakaian, daftar resep (BOM) |
| **Logistik & Log Operasional** | Jadwal pengiriman per outlet, status log GR / Retur-Waste / Opname |
| **Kualitas Data** | Daftar isu data, ketersediaan data, rekomendasi tindak lanjut |

Fitur: filter **Area**, pilih **Bulan**, **cari outlet**, tabel yang bisa diurutkan (klik header), dan tombol **Cetak/PDF**.

---

## 2. Cara Menyegarkan Data (Refresh)

Setiap kali Google Sheet diperbarui, jalankan:

```bash
bash scripts/run_all.sh
```

Atau langkah terpisah:

```bash
bash scripts/fetch_sheet.sh sheet.xlsx   # unduh sheet terbaru
python3 scripts/etl.py                   # hitung agregat -> data/dashboard_data.json
python3 scripts/build.py                 # bikin ulang dashboard.html
```

Kebutuhan: `python3` + `openpyxl` (`pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org openpyxl`).

---

## 3. Struktur Berkas

```
├── dashboard.html              # ← DASHBOARD (buka ini), single file mandiri
├── Monitoring_Dashboard.xlsx   # ← versi spreadsheet (8 sheet + grafik)
├── data/dashboard_data.json    # data agregat (sumber untuk dashboard)
├── dashboard_template.html     # template HTML/CSS
├── app.js                      # logika dashboard (Chart.js)
├── vendor/chart.umd.min.js     # pustaka grafik (di-inline ke dashboard.html)
├── scripts/
│   ├── fetch_sheet.sh          # unduh workbook Google Sheet
│   ├── etl.py                  # ekstraksi & agregasi seluruh sheet
│   ├── build.py                # gabung template + data + chart.js + app.js
│   ├── build_xlsx.py           # bikin Monitoring_Dashboard.xlsx
│   └── run_all.sh              # alur lengkap
└── README.md
```

---

## 4. Sumber Data (Sheet)

| Sheet | Dipakai untuk |
|---|---|
| `API_Data` | Ringkasan harian & MTD per outlet + data snack (sudah teragregasi) |
| `Summary` | Verifikasi ringkasan harian/MTD & snack |
| `Jul/Aug/Sep/Oct 2026` | Transaksi POS mentah → tren, produk, kategori, metode bayar, jam/hari |
| `Stock_Balance` | Saldo stok per outlet × menu |
| `BOM Master` | Resep / bill of materials (173 menu, 51 bahan) |
| `Ingredient Usage` | Pemakaian bahan baku per outlet & periode |
| `Delivery Schedule` | Jadwal pengiriman per outlet |
| `GR_Log`, `ReturWaste_Log`, `Opname_Log` | Log operasional (masih template kosong) |
| `Sales Report` | Ekspor sebagian (1–7 Jul 2026) — tidak dipakai sebagai acuan |

---

## 5. Catatan Kualitas Data (per 12 Okt 2026)

- **Omset harian** 12 Okt 2026: ±Rp 20,9 jt; **MTD** ±Rp 232,9 jt (≈42,8% dari target MTD).
- **Stok negatif**: 45 baris (outlet seperti Jatibaru, ASEAN, St. Pasar Senen) → indikasi GR belum tercatat.
- **Ingredient Usage** baru mencakup area **Jabodetabek** (periode Agustus 2026).
- **Jadwal pengiriman** belum diisi untuk 18 outlet.
- **Log GR / Retur-Waste / Opname** masih kosong (template siap diisi).
- Ada outlet uji (`Test Outlet`) yang belum terpetakan ke area.

---

## 6. Asumsi

- Angka dalam Rupiah (Rp); persentase = realisasi / target.
- Kategori produk diturunkan dari nama item (kata kunci).
- Nama menu dengan awalan kanal (`ASEAN -`, `(RB)`, `(TR)`, `TIKTOK -`) digabung ke produk dasarnya.
- Nama outlet dinormalisasi (mis. awalan `KACC - ` dihapus) dan dipetakan ke area via `Delivery Schedule` + `API_Data`.
- `Oct 2026` baru sampai tanggal 12 sehingga belum sebanding dengan bulan penuh.
