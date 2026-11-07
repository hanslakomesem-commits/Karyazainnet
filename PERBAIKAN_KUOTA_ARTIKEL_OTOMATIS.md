# ZAIN.NET — Perbaikan pemakaian kuota artikel otomatis

## Masalah pada versi semula

Menu **Generator Artikel Link 1–5** tampil sebagai iframe dari website di domain berbeda. Browser mencegah website utama mengintip isi iframe (same-origin policy). Karena itu, website utama TIDAK dapat memastikan artikel sudah jadi hanya dari tampilan layar, timer 5 menit, klik di halaman induk, atau event URL.createObjectURL. Kode lama berisiko kehilangan catatan pemakaian, sekaligus pemotongan kuota ganda / terlalu cepat.

## Perubahan pada source utama

1. Pembuatan/ekspor yang benar-benar berhasil dari generator akan mengirim event `ZAINNET_DOCUMENT_READY`.
2. Website utama memeriksa `event.source` dan `event.origin` cocok dengan iframe yang sedang aktif; teks acak seperti `done` atau `artikel` tidak memicu pemotongan.
3. Setiap sesi punya **sessionId**; satu sesi hanya tercatat satu kali dalam **Firestore transaction** dengan bukti `users/{uid}/usage_events/{eventId}`. Kuota/trial reseller dan bukti penggunaan dicatat secara atomik.
4. Jika koneksi terputus, catatan penggunaan yang telah dipastikan selesai ditaruh di penyimpanan pending untuk sinkronisasi saat kembali membuka website.
5. Browser ditutup atau timer 5 menit tercapai **tidak** lagi dianggap sebagai bukti artikel selesai. Pengguna tidak kehilangan kuota hanya karena lama menulis.
6. Menu internal dengan callback ekspor (`art-6`, dan modul lain yang sudah punya `onExportComplete`) mencatat langsung setelah hasil akhir berhasil diekspor.
7. Status `Selesai Transaksi` dan kuota berubah setelah penyimpanan pemakaian berhasil, bukan hanya karena event visual.

## PENTING: langkah untuk Link 1–5 yang memakai website terpisah

**Website utama saja tidak cukup**: agar file yang sudah jadi dapat terdeteksi sebelum pengguna menekan `Selesai`, setiap website generator harus mengirim sinyal sukses.

1. Buka source code generator artikel (misalnya AI Studio untuk Link 1, atau repo Link 5).
2. Pasang isi `ZAINNET_GENERATOR_BRIDGE.js` ke halaman generator, bisa dalam `<script src="...">` setelah menyalin file ke folder `public` generator, atau ditempel di kode JS/TS pada proyek generator.
3. **Di lokasi fungsi yang sudah menyatakan file final tersedia**, panggil:

   ```js
   window.ZAINNET_reportDocumentReady?.(`Artikel_${namaPenulis}.docx`);
   ```

   Contoh: tepat setelah `await generateDOCX()` berhasil dan Blob `.docx` lengkap siap diunduh, atau saat panel **Format Jurnal Siap Ekspor** tampil dengan hasil yang valid. **Jangan panggil pada saat tombol Generate baru ditekan**.
4. Setelah artikel pertama sukses dalam satu sesi, **kunci tombol Generate untuk artikel baru** (unduhan dan koreksi artikel yang sama tetap boleh). Untuk membuat artikel lain, pengguna harus kembali ke menu utama dan memakai kuota berikutnya. Pada Link 6, pembatasan ini sudah diterapkan.
5. Publish ulang **masing-masing generator** yang diubah, lalu publish ulang website utama.
6. Tes: Akun punya 1x kuota → buat artikel berhasil → halaman utama menunjukkan `Selesai Transaksi` dan `0x Buat` otomatis **tanpa** klik Selesai → segarkan halaman → tetap 0x.
7. Tes: Gagal generate atau hanya membuka generator → kuota belum terpakai; satu hasil tidak boleh dihitung 2x; admin tidak dikenakan kuota; reseller 3x trial dihitung secara benar.

## Batasan keamanan yang perlu diperbaiki lebih lanjut

Aturan `firestore.rules` yang dikirim saat ini menggunakan `allow read, write: if true` untuk banyak koleksi. Artinya data kuota dapat diubah dari luar aplikasi. Logika kuota otomatis yang baru **bukan** pengganti validasi server-side. Sistem pembayaran publik harus dipindahkan ke backend yang mengotentikasi pengguna dan memiliki aturan Firestore ketat. Jangan mengubah aturan langsung ke deny-all karena alur login, transaksi, dan admin dalam proyek saat ini juga akan terkena dampak.

## Status pengujian

Kode TS/TSX yang diubah lolos pemeriksaan parser TypeScript. Pengujian end-to-end dengan Firestore, website generator eksternal, dan build penuh belum dapat dijalankan dalam lingkungan ini; kode generator eksternal juga tidak termasuk pada ZIP yang diunggah.
