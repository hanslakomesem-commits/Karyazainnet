# ZAIN.NET — MENU 2 LINK 3 (PISAH SKRIPSI)

Source asli yang digunakan: zain-net-pisah-skripsi-source.zip dari pengguna (37 entri).

## Perubahan yang disiapkan
- Menu nomor 2 kini memiliki Link 3 (id split-3, URL internal://pisah-skripsi).
- Link 1 dan Link 2 tidak diubah.
- Aplikasi baru terintegrasi sebagai komponen React di src/pisahSkripsi/.
- Tampilan admin dan QRIS terpisah dari source baru tidak dipakai. Login dan kuota mengikuti website utama.
- Pada keberhasilan pemisahan PDF / pengunduhan PDF / pembuatan ZIP, aplikasi memanggil onExportComplete untuk memicu catatan kuota otomatis melalui mekanisme utama.
- Sesi yang selesai tidak bisa langsung mengunggah file baru, namun hasil dalam sesi itu tetap dapat diunduh kembali.
- Untuk sinkronisasi otomatis ke Firestore, deploy website utama dari kode terbaru dan pastikan aturan database/token pengguna masih cocok. Bukan sekadar unggah zip ke halaman HTML.

## Cara pasang via PATCH (jika source aktif masih sama dengan ZAINNET V2)
1. BACKUP seluruh repository web utama.
2. Ekstrak ZAINNET_MENU2_LINK3_PATCH.zip.
3. Ganti `src/data/toolsData.ts` dan `src/components/ToolViewerModal.tsx` dari patch.
4. Upload folder `src/pisahSkripsi` beserta semua subfolder dan isinya, JANGAN ubah letak.
5. Commit changes ke repo web utama; lakukan build / redeploy sesuai hosting yang dipakai.
6. Tes Menu 2 > Link 3, unggah PDF, pilih rentang bab, proses dan unduh hasil.
7. Periksa log transaksi/kuota utama sebelum dan setelah proses, termasuk sesudah website ditutup/dibuka ulang.

## Cara pasang via ZIP lengkap
1. Backup repository dulu. Jangan menimpa perubahan yang dibuat sejak arsip ZAINNET V2 sebelumnya.
2. Ekstrak ZAINNET_MENU2_LINK3_WEB_UTAMA_LENGKAP.zip ke proyek web utama.
3. Lakukan build / deploy memakai hosting yang mendukung proyek React/Vite dan server yang dipakai web induk.

## Batasan yang perlu diketahui
- Pengujian: sintaks 20 file TypeScript terkait lolos parse dan referensi file lokal diperiksa. FULL VITE BUILD, pemasangan dependensi, deployment dan pengujian end-to-end belum dilakukan dalam lingkungan ini.
- Pemisahan berbasis file PDF adalah fungsi inti yang dirancang. Dokumen DOCX dapat diekstrak sebagai teks oleh source asal, tetapi file mentah DOCX tidak dapat diumpankan langsung ke pdf-lib sebagai PDF untuk memotong halaman; agar bisa benar-benar dipisah menjadi PDF, DOCX harus dikonversi dahulu. Untuk sekarang unggah PDF untuk hasil halaman yang presisi. Jangan janjikan DOCX langsung dapat diekspor menjadi potongan PDF.
- AI Gemini refinement dari aplikasi asal membutuhkan endpoint /api/analyze-thesis dan kredensial API aman. Dalam modul internal ini endpoint AI dimatikan secara default dan deteksi struktur lokal tetap dipakai. Opsional konfigurasi VITE_SPLIT3_AI_ENDPOINT jika backend aman disediakan secara terpisah.
- Format/margin/output PDF baru perlu diuji dengan berkas skripsi nyata sebelum dipakai produksi. Paket belum otomatis membuat perubahan di domain yang sedang aktif.
- Jangan mengembalikan login admin hardcoded atau pembayaran QRIS kedua dari aplikasi asal: ini tidak aman dan akan menyebabkan konflik dengan pembayaran ZAIN.NET utama.
- Mengurangi kuota hanya dari browser bukan jaminan keamanan pembayaran penuh; pengendalian izin dan pemakaian memerlukan validasi server / Firestore Rules yang ketat.
- Harga Link 3 diset Rp 10.000 mengikuti harga Link 1 dan Link 2. Harga paket Menu 2 tetap mengikuti pengaturan lama; periksa kembali apakah harga paket sesuai kebutuhan sebelum dipublikasikan.

## File yang berubah
- src/data/toolsData.ts
- src/components/ToolViewerModal.tsx
- src/pisahSkripsi/ (modul baru)
