# ZAIN.NET — Menu No. 1 Link 7 (IAIN Madura Journal Converter)

## Isi perubahan
- `src/data/toolsData.ts`: Link 7 (`art-7`) muncul di Menu 1, harga default Rp20.000. Link 1–6 tetap.
- `src/components/ToolViewerModal.tsx`: generator Link 7 tertanam langsung, kuota tersinkron otomatis ketika pembuatan artikel 3 tahap selesai dengan sukses.
- `src/journalConverter/`: kode asli frontend React yang sudah dipisahkan (tampilan uploader, editor, preview, export).
- `server/journal7/router.ts` + `server.ts`: API asli converter di bawah prefiks `/api/journal7`.
- `src/index.css`: utility font Times New Roman khusus pratinjau jurnal.

## Cara memasang
1. **Cadangkan** repository dan data/firestore sebelum perubahan.
2. Gunakan ZIP lengkap jika basis web Anda sama dengan paket terakhir Menu 2 Link 3. Alternatif: gunakan PATCH dengan folder asli dipertahankan, lalu commit di GitHub.
3. Konfigurasikan `GEMINI_API_KEY` di lingkungan **server hosting**; jangan pernah memasukkan key ini di source publik atau frontend.
4. Jalankan `npm install`, `npm run build`, lalu `npm start` pada hosting Node.js.
5. Buka Menu No. 1 -> Link 7, unggah skripsi PDF/DOCX, jalankan 3 tahap AI dan cek hasil Word.
6. Uji kuota: 1 sesi sukses -> berkurang 1; refresh tidak mengembalikan kuota; proses gagal -> kuota tidak berkurang.

## Catatan operasional
- Backend Node/Express dibutuhkan. GitHub Pages **saja** tidak dapat menjalankan endpoint `/api/journal7`.
- Jika UI memunculkan error API, cek deployment backend dan konfigurasi Gemini. Nama-nama model di source asli belum diverifikasi tersedia; pilih model yang benar-benar tersedia untuk API key Anda.
- Kode konverter aslinya memakai library sistem `unzip` / `zip` atau fallback `python3` saat menerapkan template DOCX. Pastikan server menyediakan salah satunya.
- Sinkronisasi kuota mengikuti mekanisme web utama; untuk pemakaian berbayar, aturan keamanan Firestore dan verifikasi transaksi di backend tetap harus diperketat.
- Pembuatan artikel diperlakukan selesai ketika AI sukses menuntaskan tiga tahap dan hasil tersedia di tab Preview, sehingga tombol manual Selesai tidak diperlukan. Ekspor Word tetap bisa dilakukan setelah itu.
