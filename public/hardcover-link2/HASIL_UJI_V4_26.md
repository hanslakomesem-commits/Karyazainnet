# ZAIN.NET COVER V4.26 — Hasil Pemeriksaan

**Masalah:** jalur metadata punggung warna memakai pitch 8,9 pt untuk dua teks berukuran 9 pt, berisiko saling berhimpitan.

**Perbaikan:** pitch dihitung dari estimasi tinggi tinta Tinos Bold (1,108× ukuran font), ditambah jarak kosong minimum 1,5 mm. Batas aman kiri/kanan terhadap garis lipatan minimal 0,9 mm; bila perlu ukuran font diturunkan otomatis hingga 6 pt.

**Hasil tes kode:**
- 19/19 geometri punggung 10–28 mm memenuhi jarak metadata >=1,5 mm dan margin lipatan >=0,9 mm.
- Ukuran punggung >=13 mm tetap memilih font metadata 9 pt dalam perhitungan.
- 38/38 skenario Polos V1/V2 lulus dalam mock runtime PDF.
- Lima judul referensi Cover CD lolos dalam mock runtime PDF.

**Batasan:** pengujian ini berbasis perhitungan geometri menggunakan perkiraan batas glyph Tinos Bold; bentuk cetak final dan Adobe Reader/Chrome belum diuji otomatis dengan PDF nyata. Untuk pekerjaan cetak, periksa 10, 13, 23 mm lebih dahulu. Pada 28 mm cover warna pembatas potong kiri dari versi lama tetap diberlakukan.
