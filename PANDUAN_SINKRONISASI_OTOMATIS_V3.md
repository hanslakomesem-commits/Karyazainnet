# ZAIN.NET Sinkronisasi Otomatis V3

* Web utama mengirim handshake origin + sessionId + token ke iframe aktif.
* Generator AI Studio/GitHub memanggil `window.ZAINNET_reportDocumentReady(namaFile)` hanya setelah hasil final valid.
* Callback aplikasi internal dipanggil setelah ekspor final valid.
* Pengulangan sinyal satu sesi tidak memotong kuota dua kali, karena receipt di Firestore memakai id sesi.
* Waktu 2/5 menit, menutup halaman, dan klik Selesai tidak dianggap bukti hasil.
* Koneksi gagal: antrean receipt disimpan lokal dan dicoba lagi pada kunjungan berikutnya.
* Link 7 tetap mengambil materi dari skripsi asli, target 15–17 halaman apabila tersedia, dan paket DOCX Artikel + Cover CD.

**Penting keamanan**: pesan postMessage/token hanya mengurangi kekeliruan UI; generator atau pelanggan yang memodifikasi JavaScript bisa memalsukan hasil. Aturan `firestore.rules` sumber lama masih terbuka (`allow read, write: if true`), sehingga kuota produksi tidak aman. Sebelum transaksi berbayar, pindahkan otorisasi kuota dan verifikasi pekerjaan ke server terpercaya (Firebase Functions/API), gunakan Firebase Auth serta Security Rules yang ketat. Jangan klaim ini mekanisme anti-curang.

Untuk aplikasi eksternal yang sumbernya belum terpasang bridge, web utama tidak dapat mengetahui kapan file selesai, sehingga kuota tidak otomatis tercatat.
