# ZAIN.NET — Revisi selesai otomatis & penyimpanan Supabase

## Hasil revisi
- Artikel Link 7 selesai saat ketiga tahap berhasil membentuk hasil lengkap. Ekspor Word/ZIP juga mengirim konfirmasi yang sama; kuota tidak dipotong lagi untuk sesi yang sama.
- Artikel Link 6 selesai saat file hasil berhasil dibuat, sebelum penjadwalan unduh.
- Link langsung `/artikel6`, `/artikel-gemini`, `/artikel7`, `/journal-converter`, `/artikel-jurnal`, `/pisah-skripsi`, dan `/gabung-file` memakai sesi akun/kuota yang sama dengan menu.
- Modul internal lainnya menggunakan callback hasil/ekspor masing-masing. Menekan tombol, membuat preview Blob, menunggu lima menit, menutup tab, atau gagal proses tidak dianggap selesai.
- Iframe tetap khusus admin; akun publik/reseller menggunakan modul internal.
- Kuota, saldo, transaksi, profil, favorit, dokumen arsip, dan riwayat sesi memakai tabel `academic_*` di Supabase. Tabel nota/toga tidak diubah.
- Status selesai disimpan lokal dahulu dan masuk antrean saat jaringan gagal. Saat online/masuk kembali, antrean dikirim ulang dengan ID sesi tetap agar pemotongan tidak ganda.
- Login email/password serta Google (jika diaktifkan) memakai Supabase Auth. PIN lokal tidak lagi menjadi otorisasi database.

## Status pemasangan
Ini paket source yang sudah direvisi dan diuji secara lokal, **belum dipasang di web aktif atau database Anda**. ZIP nota yang dijadikan pembanding menggunakan Supabase. Paket ini belum berisi konfigurasi proyek Supabase milik Anda.

## Pasang pada proyek Supabase yang sama dengan nota
1. Backup database nota dan ekspor data web lama terlebih dahulu.
2. Buka Supabase proyek nota > SQL Editor. Jalankan secara berurutan:
   - `supabase/001_academic_storage.sql`
   - `supabase/002_seed_settings.sql`
   - `supabase/003_transactions.sql`
   - `supabase/004_catalog.sql`
   - `supabase/005_free_trial.sql`
   SQL ini menambah tabel baru; tidak menghapus atau mengubah tabel nota/toga. Script 003 untuk pemasangan pertama, bukan dijalankan berulang tanpa memeriksa policy yang sudah ada.
3. Di Authentication, aktifkan Email. Atur Site URL dan Redirect URLs sesuai domain web Anda. Jika konfirmasi email aktif, pengguna harus membuka email konfirmasi sebelum masuk.
4. Buat akun admin pada Authentication > Users. Beri app_metadata `academic_role: "admin"` melalui dashboard/Admin API yang berwenang. Jangan taruh role di user_metadata. Contoh SQL khusus akun yang sudah Anda pastikan:
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"academic_role":"admin"}'::jsonb
   where id = 'GANTI_DENGAN_UUID_ADMIN_YANG_BENAR';
   ```
   Keluar lalu masuk lagi setelah mengubah role.
5. Deploy Edge Function `academic-admin-accounts` dari `supabase/functions/academic-admin-accounts/index.ts` untuk fitur admin membuat akun reseller, mengganti password, mengubah role, dan menonaktifkan akun. Function memeriksa token dan role admin di server. Key service-role hanya tersedia di environment Edge Function, jangan di web.
6. Isi environment build/hosting:
   ```env
   VITE_SUPABASE_URL=https://PROYEK_ANDA.supabase.co
   VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_ATAU_PUBLISHABLE_KEY
   SUPABASE_URL=https://PROYEK_ANDA.supabase.co
   SUPABASE_ANON_KEY=PUBLIC_ANON_ATAU_PUBLISHABLE_KEY
   ```
   Gunakan URL dan public key proyek yang sama dengan nota. **Jangan masukkan service_role/secret key ke VITE_ atau source publik.**
7. Pertahankan konfigurasi AI/R2 lama yang masih dipakai modul generator. Jalankan `npm ci`, `npm run lint`, `npm test`, `npm run build`. Jalankan server dengan `npm start` pada hosting Node.js modern.
8. Uji akun publik dan reseller pada dua perangkat. Buat artikel sampai hasil tampil tanpa menekan tombol selesai; cek sesi, arsip, dan kuota. Uji unduh ulang, proses gagal, koneksi putus lalu online, pembayaran/approval, dan akses iframe.

## Data lama dan akun lama
Akun buatan web lama memiliki ID/password lokal berbeda dari Supabase Auth. Akun tersebut tidak otomatis menjadi akun Supabase dan tidak aman dipindah sebagai hash password browser.

- Buat/undang akun Supabase dengan email yang sama; pengguna menetapkan password baru.
- Catat pemetaan UID lama ke UUID Supabase. Jangan menebak pasangan akun.
- Siapkan export JSON berbentuk `[{"path":"users/UID_LAMA/data/quotas","data":{"art-7":2}}]` dan `uid-map.json` berbentuk `{"UID_LAMA":"UUID_SUPABASE"}`.
- `node scripts/migrate-documents.mjs export.json uid-map.json` melakukan dry-run tanpa mengirim data.
- Setelah backup dan pemeriksaan pemetaan, jalankan dengan environment `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` pada komputer/server privat dan tambahkan `--apply`.
- Import tidak menimpa path yang sudah ada. Hash/password/PIN tidak diimpor. Akun reseller harus diberi app_metadata `academic_role: "reseller"` lewat admin/Edge Function.
- Kuota, saldo dan status lama tidak direkonstruksi dari cache browser secara otomatis, agar saldo/kuota tidak bertambah karena cache lama. Admin dapat menyesuaikan dari bukti transaksi atau impor yang sudah diverifikasi.

## Batas dan catatan penting
- Yang berpindah adalah data aplikasi/akun dan metadata arsip. File Word/PDF yang dihasilkan tetap diunduh ke perangkat sesuai perilaku modul lama; catatan arsip bukan salinan biner hasil. Penyimpanan file upload makalah yang sudah memakai disk/R2 tetap mengikuti modul lama. Migrasi biner massal ke Supabase Storage tidak dilakukan dalam revisi ini.
- Halaman admin web membatasi iframe, tetapi URL eksternal iframe yang dibuka langsung tetap memerlukan proteksi pada situs asal. Menyembunyikan link bukan otorisasi situs eksternal.
- Satu sesi kerja modul dihitung satu pemakaian. Unduh ulang/format lain di sesi yang sama tidak dihitung lagi. Membuka sesi baru membutuhkan kuota yang tersedia.
- Percobaan gratis dibatasi satu akun/perangkat; identitas perangkat dari browser bukan perlindungan anti-penipuan yang absolut.
- Data akun diisolasi dengan RLS; operasi saldo, pemotongan kuota, reward dan persetujuan transaksi memakai fungsi SQL. Langganan data menggunakan polling 5 detik, tidak membutuhkan aktivasi Realtime.
- Statistik trafik lama masih memiliki cache lokal; penulisan trafik anonim ke database tidak diaktifkan pada skema baru. Blog server masih mempertahankan disk/R2/caching lama. Jangan menganggap seluruh fitur legacy otomatis menjadi layanan Supabase Storage.
- Hosting GitHub Pages saja tidak cukup: API generator artikel masih membutuhkan server Node.js dan konfigurasi AI yang valid.
- Deploy Edge Function, Google OAuth, email konfirmasi, pembayaran nyata, domain produksi dan migrasi data nyata harus diuji pada akun/proyek Anda. Paket ini tidak mengklaim sudah menjalankan proses tersebut.

## Pengujian yang disertakan
`npm test`: 10 pemeriksaan lokal mencakup antrean offline, retry, duplikasi penyelesaian, status yang tidak boleh mundur, kuota habis, kepemilikan sesi, perlindungan saldo/role, idempotensi pembayaran saldo, approval admin, RLS, dan klaim percobaan.
SQL dijalankan pada PostgreSQL lokal berbasis PGlite dengan simulasi JWT; ini bukan pengujian pada Supabase produksi Anda.
