# HASIL UJI ZAIN.NET COVER V4.23 — Cover CD

Tanggal: 19 Oktober 2026

## Pengukuran referensi

Input: `COVER CD IAIN MADURA fix.docx`, 5 halaman, ukuran 137.0189 × 137.0189 mm.

Posisi dalam points diukur dari atas halaman:
- Nama 61.0; NIM 71.3
- Program studi 92.0; bulan/tahun 102.4
- Logo kiri x47.35, y150.25, lebar 85.65, tinggi 93.75
- Logo kanan x227.2, y150.6, lebar 85.45, tinggi 92.95
- Judul dimulai y254.2, lebar teks sekitar 210pt, batas bawah 321pt

## Pengujian berhasil

- 5 judul referensi Word lulus tata letak mock.
- 200 judul sintetis dengan panjang bervariasi diuji; setiap layout yang berhasil diperiksa agar tidak melewati area, judul kelewat panjang ditolak dengan kesalahan eksplisit.
- Fungsi generator Cover CD dijalankan dengan runtime PDF tiruan, menghasilkan informasi ukuran 137 × 137mm dan tepat dua logo untuk kelima contoh; input 3 kolom minimal juga berhasil.
- `app.js`, `pdf-engine.js`, `cover-cd-layout.js` lolos pemeriksaan sintaks Node.
- PDF pratinjau layout independen (ReportLab) ditinjau untuk lima nama contoh; periksa lagi pada printer sungguhan.

## Yang belum terverifikasi

- Browser end-to-end dan pembuatan PDF oleh pdf-lib/fontkit yang sebenarnya belum teruji. Server Chromium lokal diblokir oleh kebijakan lingkungan.
- Belum ada pembacaan otomatis multipage per mahasiswa dari 5 halaman DOCX dalam satu kali upload. Sistem mendukung satu pesanan per berkas, dan dapat dibuat manual.
- Cetak fisik pada kertas/stiker CD perlu proof skala 100%.
