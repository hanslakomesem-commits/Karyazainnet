# HASIL UJI ZAIN.NET COVER V4.16

Tanggal: 18 Oktober 2026

## Perbaikan terukur
- Mode Polos V4.15 menambahkan `+6.0 pt` pada titik tengah judul. V4.16 menghapus tambahan ini.
- Titik tengah Polos kini diambil secara langsung dari `spine_title_center_y` di `assets/layout.json` untuk masing-masing ketebalan 10–28 mm.
- Pengaman vertikal judul Polos: atas 76 pt, bawah 513 pt, margin 1 pt. Jika tidak muat, font/baris disesuaikan; bila tetap tidak muat PDF ditolak agar tidak terjadi teks menabrak area tidak aman.
- Urutan font 9pt di punggung lebar dan pemilihan 2 atau 3 baris dipertahankan.
- Semua aset master PDF dan implementasi cover Warna identik dengan V4.15.

## Hasil tes yang BENAR-BENAR dijalankan
- Pemeriksaan koordinat judul pada PDF referensi asli `contoh pdf(1).pdf` dan `contoh 14mm-28 mm.pdf`: semua 19 anchor ketebalan cocok terhadap nilai referensi dengan toleransi <0,08 pt. 18 halaman referensi dan 41 baris judul vertikal yang dibaca.
- Tes 57 skenario layout Polos, 19 ukuran, geometri dua garis lipat, batas aman, 9 pt pada judul Mara di 23 mm: LULUS.
- Tes regresi warna 95 skenario untuk font dan batas aman: LULUS.
- Tes regresi pemilihan font Polos dan Warna 10–28 mm: LULUS.
- Tes struktur ZIP, font Unicode (mock), pembacaan Word nyata (fixture), PDF (mock), OCR (mock), upload/download (mock) dan audit PDF referensi warna: LULUS.
- master PDF Polos/Warna, layout.json, guide-geometry.js, color-spine-profile.js: SHA256 SAMA dengan V4.15; seluruh implementasi mode Warna juga sama.

## BELUM teruji
- Ekspor PDF benar-benar memakai Chrome dengan pustaka PDF.js/pdf-lib dan Tesseract dimuat dari CDN: belum end-to-end (akses internet ke CDN tidak tersedia pada lingkungan uji).
- Hasil print fisik skala 100% belum diverifikasi; wajib proof print.
- Mode Warna 28 mm masih terkena pembatas tanda potong (tidak diperbaiki pada V4.16).
- PDF Polos akhir tetap 480×330 mm melalui pengecilan horizontal master 483×330 mm sebesar ~0,62%; ini perilaku lama dan dapat berpengaruh pada akurasi cetak.

## Cara menguji setelah deploy
1. Upload isi ZIP ke ROOT GitHub Pages, commit, refresh paksa hingga versi V4.16 tampil.
2. Buat cover Polos 10, 16, 23, dan 28 mm memakai judul pendek dan panjang. Pastikan pusat judul sesuai PDF referensi, serta garis lipat tidak tersentuh.
3. Buat ulang cover Warna 23 mm (Mara Qonita). Hasilnya semestinya sama dengan V4.15.
4. Lakukan proof print skala 100%, jangan centang Fit-to-page/Scale-to-fit.
