# ZAIN.NET — Revisi Tata Letak 12 Menu dan Loading Awal

## Yang berubah

1. Menu No. 1–12 disusun sebagai grid 6 kolom x 2 baris pada desktop (di atas 1100 px). Tablet sampai 1100 px menampilkan 3 kolom, HP di bawah 641 px menampilkan 2 kolom. Jika salah satu menu dibuka, detail pilihan link menggunakan lebar penuh agar tidak sempit. Semua `CategorySection`, `ToolCard`, harga, hak akses, dan handler navigasi aslinya tetap digunakan.
2. Penghalang full-screen `Menghubungkan ke ZAIN.NET...` saat proses Firebase Auth dihapus. Halaman login atau halaman tamu dapat tampil lebih dahulu; callback autentikasi Firebase tetap berjalan dan memperbarui sesi serta hak akses setelah tersedia.
3. Komponen modal yang jarang dipakai (pembayaran, top up, profil, statistik, harga, pengaturan, arsip, hadiah, trial dan PIN) memakai pemuatan dinamis dan **hanya dibuat ketika dipanggil**. Pemeriksaan hak akses serta alur pembayaran tidak dihapus.
4. HTML awal yang sebelumnya bertuliskan "Menyiapkan modul akademik Anda..." diganti teks pengenal ZAIN.NET tanpa spinner.
5. Stylesheet Google Fonts diambil tidak secara render-blocking; font fallback tetap tersedia saat jaringan lambat.
6. Teks jumlah menu pada hero diperbaiki dari 11 menjadi 12.

## File yang diubah

- `src/App.tsx`
- `src/components/CategorySection.tsx`
- `src/components/HeroSection.tsx`
- `public/charitize-theme.css`
- `index.html`

## Yang dipertahankan

Semua menu 1–12, data tools/link, kontrol harga, hak admin/reseller, alur login, Firebase, pembayaran, serta revisi menu No. 10 Auto-Crop dan penomoran halaman dari paket terakhir. Tidak mengubah algoritma menu No. 3 Link 3 (masih menunggu pengujian proposal secara menyeluruh).

## Pengujian

- Struktur TSX dua file yang diubah: **lulus parsing sintaks**.
- 12 kategori terdeteksi berurutan dari data sumber.
- Tes responsivitas CSS pada Chromium memakai markup pengganti yang meniru struktur komponen: **lulus** pada lebar 1280 px (6 kolom, 2 baris), 900 px (3 kolom) dan 390 px (2 kolom); tidak ada scroll horizontal pada markup pengujian.
- Build produksi lengkap **belum dapat dijalankan** karena `npm ci` gagal memperoleh dependensi di lingkungan pengujian (jaringan/registry tidak tersedia). Ini bukan bukti website akan pasti cepat di semua jaringan atau perangkat. Lakukan pengujian di hosting sebelum mengganti website produksi.

## Cara memasang

1. Backup repositori / hosting saat ini dan uji dahulu di cabang atau staging.
2. Jika seluruh versi asli Anda sama dengan paket penomoran halaman sebelumnya, bisa ganti hanya **5 file yang diubah** di atas. Ini paling aman.
3. Alternatif: unggah isi folder proyek dalam ZIP ini ke repositori yang sesuai (tidak termasuk folder induk `Zainnet-aplikasi-main/` bila repo Anda langsung berisi `index.html`, `src/`, dll.).
4. Instal dependensi lalu jalankan `npm run build`. Upload hasil `dist/` jika menggunakan hosting statis, atau ikuti konfigurasi hosting React/server Anda. Website ini memiliki `server.ts` dan endpoint server yang tidak berjalan di GitHub Pages murni.
5. Setelah deployment, hard-refresh browser dan uji login, admin, pembayaran, menu No. 3 dan No. 10. Jangan ganti website publik sebelum hasil uji sesuai.

**Perhatian:** File ZIP di `public/source_code*.zip` adalah aset bawaan proyek; bukan berkas pembaruan terbaru yang harus diunggah kembali.
