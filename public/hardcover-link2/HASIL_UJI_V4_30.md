# ZAIN.NET COVER V4.30 — Pemeriksaan OCR nama kampus dan kota

## Perubahan
- OCR membaca nama kampus yang terpecah di dua baris bila sambungannya jelas (misalnya SEKOLAH TINGGI AGAMA ISLAM (STAI) + AL MUJTAMA).
- Kolom Kota/Lokasi Kampus menjadi opsional. Jika kosong, PDF tidak mencetak kota pada mode Polos/Warna/Dummybook/Soft IPS. UNIRA mempertahankan PAMEKASAN sebagai bagian template kecuali diubah oleh pengguna.
- OCR foto: baca ulang zona bawah dan zona tulisan logo sebagai pembanding jika nama kampus belum lengkap atau kota tidak ditemukan. Teks logo tidak otomatis menimpa nilai yang sudah ada.
- Fakultas tetap opsional.

## Pengujian yang dijalankan
- `node tests/test_v430_campus.mjs`: 200 variasi teks sintetis gabungan/sambungan nama kampus; pemulihan lewat zona; kota opsional: PASS.
- `node tests/test_v428_optional_faculty.mjs`: 152 kombinasi Polos V1/V2, 19 ketebalan, dengan/tanpa fakultas, dengan/tanpa kota; mock generator: PASS.
- `node tests/test_plain_v425.mjs`: PASS.
- `node tests/test_v426_color_metadata.mjs` (disesuaikan logika font V4.29): PASS.
- `node tests/test_v427_plain_year.mjs`: PASS.
- `node tests/test_cover_cd.mjs`: PASS.
- Pemeriksaan sintaks semua modul JavaScript: PASS.

## Batas uji
- Bukan uji OCR Tesseract pada 200 foto asli.
- Bukan uji ekspor PDF end-to-end melalui Chrome/Android atau uji cetak fisik.
- Logo mungkin tak memiliki teks yang terbaca oleh OCR; pemeriksaan manual tetap wajib.
- Pemulihan otomatis nama kampus hanya saat sambungan baris cukup jelas; teks yang tidak dapat diverifikasi tetap perlu diperbaiki pengguna.
