# HASIL UJI V4.13 — Ukuran font punggung

## Aturan baru
- 10–12 mm: utamakan 2 baris; font turun 9/8 hingga 6 pt jika diperlukan, lalu 3 baris.
- 13–22 mm: 2×9, 2×8, 3×9, kemudian ukuran yang lebih kecil jika perlu.
- 23–28 mm: 2×9, 3×9, baru ukuran 8,7,6 pt. Ini mencegah 2 baris dengan 6 pt ketika 3 baris 9 pt justru masih muat.
- Semua varian memakai batas punggung dan zona atas/bawah yang sudah dikalibrasi. Bila tidak muat minimal 6 pt, PDF ditolak.

## Pengujian modul (tanpa ekspor browser)
- `node tests/test_v413_font_priority.mjs`: **lulus**. Pemeriksaan valid 304 kombinasi warna dan 456 kombinasi polos. Ada kombinasi panjang ekstrem yang sengaja ditolak karena tak muat.
- Judul Mara Qonita pada simulasi metrik font: warna 23,24,25,26,27 mm memilih 9 pt.
- `node tests/test_color_three_line.mjs`: lulus untuk seluruh 19 referensi.
- `node tests/test_v411_title_anchor.mjs`: lulus pemeriksaan zona vertikal.
- `node tests/test_reader.mjs`: lulus alur DOCX asli, PDF.js simulasi, OCR worker simulasi.
- `node tests/test_font_unicode.mjs`: lulus pemeriksaan pemuatan font (mock unduhan).
- `node tests/test_v49_upload_download.mjs`: lulus tes statis upload/download.
- `python tests/test_structure.py` dan `python tests/test_color_reference_pdf.py`: lulus.

**Batasan:** tes ukuran font memakai metrik pendekatan, bukan hasil render PDF browser langsung; tidak ada uji printer fisik. Pengujian ukuran 28 mm warna dibatasi aturan tanda potong. Font otomatis Tinos mungkin tidak persis sama dengan Times New Roman. Diperlukan proof pada printer sebelum produksi.
