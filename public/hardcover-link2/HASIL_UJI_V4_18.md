# Hasil audit ZAIN.NET COVER V4.18 — Logo UNIRA

- **Penyebab terkonfirmasi:** `assets/unira_logo.png` V4.17 menyimpan gambar indeks asli tanpa `/SMask`, sehingga bagian transparan menjadi hitam. PDF contoh menyimpan image XObject Indexed dan grayscale `/SMask` (33×34 px) terpisah.
- **Perbaikan:** penggabungan gambar asli dengan `/SMask`; untuk kompatibilitas Adobe Reader Windows 7, hasilnya dipadukan ke latar putih (mode RGB) sesuai master UNIRA. Logo tetap berukuran 33×34 px dan ditempatkan pada koordinat semula.
- **Pemeriksaan:** piksel sudut berwarna putih, detail lambang tetap hitam/abu-abu, lampiran alpha RGBA disimpan untuk audit; master UNIRA, Polos, Merah/Maroon cocok SHA-256 dengan source V4.17, jalur render lain tidak disentuh.
- **Visualisasi:** `PRATINJAU_LOGO_UNIRA_V4_18.pdf` menampilkan gambar baru pada pusat punggung 18 mm tanpa teks data mahasiswa.
- **Batasan:** pengujian penyisipan gambar dalam PDF dilakukan dengan PyMuPDF untuk memeriksa tampilan. Ekspor end-to-end menggunakan PDF-lib dalam browser dan hasil cetak Adobe Reader Windows 7 pengguna belum diuji langsung.
