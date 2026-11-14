# Hasil uji ZAIN.NET Cover V4.12

- Pemilihan dua baris dibanding tiga baris: lulus pada model font uji.
- Font dua baris normal, 8/7 pt, 6 pt: lulus pada model font uji.
- Pemilihan tiga baris jika dua baris tidak cukup sampai 6 pt: lulus.
- Evaluasi posisi teks terhadap 19 ukuran warna 10–28 mm: lulus secara logika.
- Uji pemilihan plain: 228 kombinasi sintetis valid dalam batas aman.
- Regresi struktur 19 master polos dan dua master warna: lulus.
- Regresi PDF warna referensi punggung (3 baris sebagai fallback): lulus.
- OCR, DOCX, PDF digital, batch, dan tautan download: modul regresi lulus atau diuji dengan mock sesuai jenisnya.
- Pengujian ekspor PDF nyata di Chrome/GitHub Pages serta cetak fisik: **belum terverifikasi** karena pdf-lib/browser produksi tidak dijalankan pada lingkungan tes.
- Punggung warna 28 mm masih diblokir jika tanda potong di luar bidang cetak.
