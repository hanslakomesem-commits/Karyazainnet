# ZAIN.NET Menu 1 Link 7 — Revisi Generator Artikel + Cover CD Template Asli

## Isi pembaruan
- Fix `ReferenceError: ai is not defined` pada API 3 tahap (dan endpoint gabungan).
- Model Gemini disesuaikan ke ID model aktif; pilihan awal Gemini 3.6 Flash.
- Validasi hasil tahap 1, 2 dan 3; jika data tidak lengkap tampil error, bukan kesimpulan cadangan fiktif.
- Judul tidak lagi otomatis memakai nama berkas. User wajib memeriksa judul dari skripsi.
- NIM dan Bulan-Tahun disediakan pada form; metadata yang dikonfirmasi pengguna tidak ditimpa metadata AI.
- Fitur Cover CD memakai halaman pertama DOCX asli (5 contoh), menjaga dua logo UIN Madura, ukuran 7768×7768 twips, dan posisi objek Word asli.
- Word artikel dan Word Cover CD dikemas menjadi satu ZIP sehingga 1 klik download mendapat keduanya.
- Kuota dilaporkan selesai setelah 3 tahap AI dan kedua file Word sukses dikemas menjadi ZIP; bukan sekadar klik Generate.
- Pemeriksaan awal klaim angka, kecocokan daftar rujukan, footnote, dan abstrak; peringatan bukan jaminan verifikasi penuh.
- Footnote dari 3 tahap dicocokkan berdasarkan subbagian dan dinomori global; footnote tanpa anchor tidak dipindah asal ke paragraf terakhir.

## Memasang patch pada website utama
1. **Backup repository aktif** (Code → Download ZIP atau salin branch) sebelum mengubah file.
2. Ekstrak ZIP PATCH.
3. Upload dan ganti file di GitHub, pertahankan path/folder dari ZIP, termasuk `server/journal7/router.ts`, `src/journalConverter`, dan `public/covercd-template.docx`.
4. Commit changes.
5. Deploy ulang hosting yang menjalankan React/Vite **dan Express Node.js**; GitHub Pages statis saja tidak dapat menjalankan endpoint `/api/journal7`.
6. Pastikan environment `GEMINI_API_KEY` terpasang di server (jangan menaruh API key di frontend).
7. Setelah deploy, buka Menu 1 → Link 7, unggah DOCX atau PDF teks, periksa Judul, Nama, NIM, Prodi, dan Bulan-Tahun, lalu generate.
8. Setelah proses selesai, tombol `Download Artikel + Cover CD (.zip)` menghasilkan 1 ZIP berisi dua file DOCX.

## Uji regresi yang wajib
- Uji 1: 3 tahap AI gagal → transaksi tidak otomatis selesai dan tidak mengurangi kuota.
- Uji 2: 3 tahap AI + pembuatan kedua DOCX berhasil → 1 penggunaan kuota tercatat, saat web dibuka ulang tetap sama.
- Uji 3: buka ZIP → artikel DOCX bisa dibuka; Cover CD DOCX 1 halaman, 2 logo UIN Madura, nama, NIM, prodi, bulan/tahun dan judul berada di posisi sesuai template.
- Uji 4: Download ulang berkas yang sama tanpa transaksi baru → tidak memotong kuota lagi.
- Uji 5: edit artikel setelah selesai → unduhan ZIP dibangun ulang dengan isi terbaru tanpa memakai kuota baru.
- Uji 6: upload PDF scan tanpa teks → kesalahan pembacaan harus jelas, tidak menyatakan berhasil.

## Hal yang masih memerlukan pengujian/pekerjaan lanjutan
- Akurasi 100% fakta/rujukan ilmiah tidak dapat dijamin hanya oleh AI. Semua peringatan perlu ditinjau dengan skripsi asli.
- Jumlah halaman tepat 18/20/25 harus diuji di Word setelah diproses, tidak bisa dijanjikan hanya dari panjang prompt.
- Masih dibutuhkan backend yang memvalidasi login, perizinan, dan kuota untuk memblokir pemanggilan endpoint AI secara langsung. Gunakan Firestore Rules aman dan sesi autentikasi server; jangan memakai Firestore Rules terbuka untuk produksi berbayar.
- Hasil belum disimpan permanen di server; simpan ZIP sebelum menutup tab. Versi ini tidak menambah penyimpanan dokumen di browser karena privasi.
- Pengujian penuh dengan API Gemini/Firebase/hosting produksi belum dijalankan dari lingkungan kerja ini.
