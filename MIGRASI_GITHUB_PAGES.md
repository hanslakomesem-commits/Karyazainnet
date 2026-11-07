# MIGRASI ZAIN.NET – GitHub Pages + server Node.js (versi sumber lengkap)

## Apa yang sudah diubah
- UI React/Vite di-build dan dideploy oleh `.github/workflows/pages.yml` ke GitHub Pages.
- Semua pemanggilan `fetch('/api/...')`, unggah/unduh `/uploads/...`, dan iframe proxy nota/toga diarahkan ke `VITE_API_BASE_URL` (server Node eksternal).
- Path routing lama didukung untuk GitHub Pages project site (`/nama-repo/`) serta username site (`/`).
- `dist/404.html` dibuat agar deep link SPA tetap dibuka (respons pertama tetap HTTP 404 pada GitHub Pages).
- CORS backend mengizinkan origin yang Anda daftar di `FRONTEND_ORIGINS`.
- Sejumlah endpoint admin sensitif meminta `ADMIN_API_TOKEN` saat dipanggil. Token disimpan hanya selama sesi browser (sessionStorage), bukan pada GitHub.
- File `.env`, data JSON operasional, dan direktori `uploads` tidak disertakan dalam paket publik. Backup aslinya tetap ada pada ZIP awal Anda.

## LANGKAH 1 – Buat repository GitHub
1. Buat repository, sebaiknya PRIVATE sampai konfigurasi, izin Supabase (RLS), endpoint admin, dan kepemilikan file diverifikasi.
2. Upload **isi folder proyek ini** ke root repository (bukan ZIP itu sendiri); branch `main`.
3. Repo disarankan `USERNAME.github.io` untuk root website, tetapi project repo biasa juga didukung.

## LANGKAH 2 – Hosting server Node.js di Render
1. Render.com > New > Web Service > Connect GitHub repository yang sama (atau Render Blueprint `render.yaml`).
2. Pilih **Docker** (gunakan `Dockerfile` proyek ini) agar **LibreOffice** tersedia untuk fitur pengukuran halaman Word. Bila menggunakan runtime Node biasa, tambahkan LibreOffice sendiri; tanpa LibreOffice fitur hitung halaman nyata gagal.
3. Tambahkan Environment Variables dari panel hosting (nilai asli Anda, **jangan** dimasukkan ke repository):
   - `NODE_ENV=production`
   - `GEMINI_API_KEY=` salin key asli dari Google AI Studio > Get API Key / Secrets.
   - `SUPABASE_URL=` alamat project Supabase Anda.
   - `SUPABASE_ANON_KEY=` key publishable/anon yang sudah dipakai app (bukan service_role).
   - `FRONTEND_ORIGINS=https://USERNAME.github.io,https://www.karyazainnet.net` (tanpa slash akhir; jika memakai project pages tetap origin https://USERNAME.github.io, tanpa nama repo).
   - `ADMIN_API_TOKEN=` buat token random panjang MINIMAL 16 karakter; jangan bagikan ke publik.
   - Opsional untuk penyimpanan persisten berkas: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN`.
4. Deploy dan coba `https://NAMA-SERVER.onrender.com/api/health` hingga menampilkan `status: ok`.

## LANGKAH 3 – Sambungkan GitHub Pages
1. Repository GitHub > Settings > Secrets and variables > Actions > tab **Variables**.
2. Buat variable `API_BASE_URL` = URL backend Render lengkap, misalnya `https://NAMA-SERVER.onrender.com` **tanpa trailing slash**.
3. Opsional: `SUPABASE_URL` dan `SUPABASE_ANON_KEY` (key PUBLIC, bukan service_role). Contoh Supabase default lama masih ada di source, tetapi lebih baik atur variabel tersebut agar eksplisit.
4. Jika menggunakan **custom domain**, buat variable `BASE_PATH` = `/`; jika project repo tanpa domain, biarkan kosong agar otomatis menjadi `/nama-repo/`.
5. Settings > Pages > Build and deployment > Source = **GitHub Actions**.
6. Actions > workflow `ZAIN.NET Deploy GitHub Pages` > Run workflow atau push ke `main`.
7. Uji menu: unggah dokumen, konversi, AI Gemini, jurnal, nota, sewa toga, login lintas browser, R2, dan download Word/PDF.

## PENTING: DATA LAMA / PRIVASI / KETERBATASAN
- Nilai `.env` yang disertakan dalam ZIP awal tidak membawa kredensial GEMINI aktual; yang ada adalah placeholder `MY_GEMINI_API_KEY`. Kunci aslinya harus Anda salin dari AI Studio ke `GEMINI_API_KEY` backend hosting; bukan GitHub Pages.
- GitHub Pages adalah hosting statis. **Tanpa backend, fitur AI/konversi/PDF/unggah server tidak berfungsi.** Memindahkan website tidak otomatis menyalin data dari penyimpanan disk AI Studio.
- Backend saat ini **masih memakai** `academic_documents.json`, `makalah_posts.json`, `agc_posts.json`, `uploads/`, dan `r2_config.json`. Paket migrasi publik sengaja tidak memuat isinya. Lakukan migrasi data ke Supabase/R2 atau hosting disk persisten SEBELUM mengalihkan traffic produksi.
- Paket Docker dengan LibreOffice bisa membutuhkan RAM lebih besar dari paket Render Free; gunakan layanan sesuai kebutuhan dan uji proses konversi nyata.
- Render Free memiliki penyimpanan filesystem ephemeral. File disk bisa hilang saat restart/redeploy; R2/DB hanya tersedia untuk data yang benar-benar telah disinkronkan. Jika memakai Render produksi, gunakan persistent disk berbayar atau refactor seluruh persistence ke Supabase/R2.
- Beberapa halaman SEO blog lama di-render di server; GitHub Pages tidak mendukung SSR dinamis dan respons deep URL bisa `404` untuk crawler. Bila SEO makalah/blog penting, gunakan backend/Cloudflare reverse proxy sebagai web utama atau desain ulang strategi SEO.
- `ADMIN_API_TOKEN` di browser hanya pembatas dasar untuk endpoint tertentu, **bukan** sistem keamanan pengguna yang lengkap. Audit RLS Supabase, fitur publik mutasi akademik, kebijakan unggah, dan rate-limiting Gemini sebelum membuka domain ke publik.
- Kunci AI Gemini tetap mengikuti quota dan tarif project Google Anda. Bukan "token gratis tanpa batas".
- Untuk meminimalkan kehilangan data, jangan matikan situs AI Studio sampai semuanya dites dan backup data sudah aman.
- Hindari menaruh ZIP asli yang mengandung `.env` dan data pengguna di repo publik. Gunakan paket migrasi ini saja.

## Perintah test lokal
Terminal 1 (backend): `npm ci && npm start` (NODE_ENV development; buat `.env` lokal saja)
Terminal 2 (frontend): `VITE_API_BASE_URL=http://localhost:3000 npm run build` (atau Vite dev mode bila ingin)
Jangan pernah memasukkan GEMINI_API_KEY ke nama variabel `VITE_`.
