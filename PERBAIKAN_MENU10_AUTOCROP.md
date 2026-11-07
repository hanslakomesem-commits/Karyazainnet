# ZAIN.NET — Perbaikan Auto-Crop Menu No. 10 (19 Oktober 2026)

## Masalah yang ditemukan

Sebelumnya fitur **Auto-Crop Semua Meja** dan pemrosesan foto saat upload menjalankan dua fungsi sekaligus: mendeteksi tepi kertas **serta** memperkirakan lalu memutar sudut kertas (deskew). Estimasi sudut kadang keliru. Canvas kemudian memutar isi foto pada ukuran crop yang sudah dipersempit sehingga bagian tulisan / dokumen dapat terpotong.

## Perbaikan

- **Auto-Crop hanya memotong tepi luar kertas**, tanpa memutar gambar atau mengubah kemiringannya.
- Deteksi sudut tidak lagi menjadi alasan untuk mengubah foto; hasil `deskewAngle` selalu `0`.
- Rotasi pada mesin crop sengaja dinonaktifkan, termasuk apabila fungsi lama dipanggil dengan nilai `angle`.
- Editor crop manual hanya menampilkan pemotongan atas, bawah, kiri, kanan dan pilihan kontras. Pelurusan otomatis telah dihapus dari editor.
- Tombol manual **Putar 90°** pada daftar foto tetap tersedia.
- Saat memulihkan foto asli, ukuran dan rasio gambar disesuaikan lagi dengan gambar aslinya.
- Penyimpanan ke DOCX, penetapan target dokumen, OCR, pemrosesan PDF, serta menu lainnya tidak dimodifikasi oleh patch ini.

## Berkas yang diperbarui

- `src/gabungFile/utils/documentCropper.ts`
- `src/gabungFile/components/DocumentCropModal.tsx`
- `src/gabungFile/components/ScanUploader.tsx`
- `src/gabungFile/App.tsx`

## Cara menerapkan

1. Cadangkan source website lama.
2. Unggah berkas baru ke repositori/deployment aplikasi yang sama.
3. Jalankan ulang proses build dan deploy (proyek ini memakai React, Vite, dan juga server Node; mengunggah ZIP saja ke GitHub Pages tidak otomatis membangun aplikasi).
4. Setelah versi baru tampil, **unggah ulang foto asli** atau klik **Auto-Crop Semua Meja** agar foto lama diproses ulang dari `originalFile`, bukan dari hasil putaran sebelumnya.
5. Pada foto lampiran, gunakan tombol **Sesuaikan** untuk mengoreksi batas crop jika batas kertas dan meja memiliki warna yang sangat mirip.

Catatan: crop persegi panjang tidak dapat menghilangkan semua latar di sudut foto kertas yang sangat miring tanpa mengubah sudut dokumen atau melakukan masking. Karena permintaan Anda adalah menjaga posisi asli, patch ini mengutamakan **tidak memutar isi dan tidak memangkas konten karena rotasi**. Contoh foto asli belum tersedia untuk pengujian ketepatan deteksi tepi.

## Pengujian

- Pemeriksaan sintaks 4 file TypeScript/TSX: lolos.
- Uji simulasi gambar kertas di atas meja: batas luar terdeteksi dan crop terjadi tanpa rotasi.
- Pemanggilan dengan `angle: 19`: tetap menghasilkan `angle: 0`.
- Uji simulasi gambar tanpa latar meja: tidak melakukan crop otomatis.
- Uji build lengkap membutuhkan pemasangan dependensi pada lingkungan deployment; belum dijalankan di sini.
