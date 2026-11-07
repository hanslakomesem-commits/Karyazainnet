# ZAIN.NET dengan tampilan Charitize

Paket ini berisi **kode sumber lengkap** aplikasi ZAIN.NET dan server Express yang semula ada di ZIP Anda. Menu 1–11, daftar alat, harga, pembayaran, akun, nota jilid, sewa toga, blog, serta pengolahan dokumen tetap berasal dari kode ZAIN.NET. Tampilan beranda disesuaikan dengan Charitize: hijau `#1A685B`, kuning `#FFAC00`, latar krem, hero dua kolom dan kartu layanan.

## Menjalankan

Gunakan Node.js yang mendukung Vite 8 (disarankan Node.js 22 atau 24).

```bash
npm ci
npm run build
npm start
```

Server memakai port 3000. Salin dan isi pengaturan yang diperlukan dari `.env.example` sesuai konfigurasi server sebelumnya. Pertahankan `firebase-applet-config.json` dan aturan Firebase Anda sesuai lingkungan yang digunakan. Unggah **seluruh folder proyek**, bukan hanya `dist`, bila ingin endpoint `/api/*`, pembayaran, blog, upload, dan fungsi server lain berjalan. `dist` hanya hasil build antarmuka.

## Perbaikan pemuatan

- Editor dokumen, blog, halaman khusus, dan sebagian panel admin dipisah menjadi berkas yang diunduh ketika dibuka.
- Artikel blog dan AGC tidak lagi diambil saat pengunjung membuka beranda; data diambil saat tampilan terkait dibuka.
- Langganan transaksi dan statistik langsung hanya aktif untuk admin.
- Pemeriksaan perangkat yang berat hanya dilakukan untuk akun reseller yang memakai fitur uji coba.
- Tiga pengaturan Firestore awal diambil paralel; data dan aturan pembaruan tetap sama.
- Gambar hero dikonversi ke WebP, dari sekitar 809 KB menjadi 106 KB.
- Berkas ZIP `source_code_revised.zip` dihapus karena identik dengan `source_code.zip`; berkas unduhan yang dipakai alat Gabung File tetap tersedia.
- Ketergantungan `esbuild` diperbarui agar cocok dengan Vite 8 dan pemasangan npm tidak gagal.

Ukuran JavaScript entri produksi berkurang dari sekitar 1,36 MB ke sekitar 969 KB sebelum kompresi. Waktu muat nyata tetap dipengaruhi hosting, Firebase, koneksi pengguna, dan ukuran data masing-masing akun.

## Lisensi template

Tampilan diadaptasi dari template Charitize oleh HTML Codex (CC BY 4.0). Kredit dan tautan “Designed by HTML Codex” harus tetap ditampilkan di footer, sesuai berkas `public/charitize/LICENSE.txt`.
