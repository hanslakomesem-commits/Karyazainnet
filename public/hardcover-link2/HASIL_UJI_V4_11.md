# Hasil uji ZAIN.NET Cover V4.11

## Masalah yang diperbaiki

Pada V4.10 `colorSpine()` mengirim posisi dari tepi atas sebesar `CENTER_FROM_TOP - panjangTeks/2` ke `renderLine()`, padahal `renderLine()` sudah mengurangi `panjangTeks/2` lagi. Rumus lama membuat awal teks berada di `CENTER_FROM_TOP - panjangTeks`, sehingga judul panjang bisa menabrak penanda potong atas.

Rumus yang benar:

- `centerTopPt = 295.0` (104,07 mm dari tepi atas), berdasarkan pengukuran 19 referensi asli.
- `startTopPt = centerTopPt - panjangTeksPt/2`.
- `endTopPt = centerTopPt + panjangTeksPt/2`.
- Fungsi gambar menerima **centerTopPt**, bukan **startTopPt**, karena fungsi gambar sendiri sudah melakukan pengurangan separuh panjang teks.
- Batasi `startTopPt ≥ 30 mm` dan `endTopPt ≤ 181 mm` agar judul tidak masuk area penanda maupun area metadata.

## Pemeriksaan yang berhasil

1. Pembacaan vektor dari semua 19 referensi: pusat tiga baris 294,931–295,054 pt.
2. Tes baru `test_v411_title_anchor.mjs`: judul panjang, pembatas atas/bawah, pergeseran dari bug lama, dan rentang ukuran 10–28 mm.
3. Tes baru `test_v411_reference_alignment.py`: 19/19 referensi termasuk 25–26 mm.
4. Regresi pembacaan Word, PDF text-layer (mock), OCR worker (mock), karakter Unicode, peraturan batch, tata letak warna, dan validasi ukuran PDF: lolos sesuai keluaran tes.
5. `node --check` untuk `app.js` dan `pdf-engine.js`: lolos.
6. SHA-256 `warna_clean.pdf` dan `masters.pdf` sama persis dengan V4.10; tidak ada perubahan pada cover depan.

## Keterbatasan

Ekspor PDF aktual memakai `pdf-lib` di browser dan font dari CDN, yang tidak dapat dijalankan end-to-end pada lingkungan pengujian tanpa akses unduh dependensi. Hasil cetak fisik belum diperiksa. PDF warna 28 mm tetap dapat ditolak jika garis potong paling kiri keluar halaman. Jalankan uji melalui situs GitHub Pages sebelum pemakaian produksi.
