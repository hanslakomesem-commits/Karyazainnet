# ZAIN.NET — MENU 1 LINK 7 — MODE EKSTRAKTIF V3

## Tujuan
Menghilangkan isi artikel yang dikarang/diperluas AI. Artikel adalah pilihan paragraf dari file skripsi **yang berhasil diekstrak**. Tidak ada panggilan Gemini pada jalur pembuatan artikel atau tombol editor Link 7.

## Cara pemasangan
1. Cadangkan repo/hosting ZAIN.NET Anda dulu.
2. Download paket patch, lalu ekstrak.
3. Salin dan TIMPA seluruh file di bawah ke path yang sama di repository ZAIN.NET:
   - `src/journalConverter/App.tsx`
   - `src/journalConverter/components/SkripsiUploader.tsx`
   - `src/journalConverter/components/SectionEditorModal.tsx`
   - `src/journalConverter/components/JournalPreview.tsx`
   - `src/journalConverter/types/journal.ts`
   - `src/journalConverter/utils/extractDocxSource.ts` (baru)
   - `src/journalConverter/utils/extractiveArticle.ts` (baru)
   - `src/journalConverter/utils/docxExport.ts`
   - `server/journal7/router.ts`
4. Jangan menimpa `public/covercd-template.docx` dengan file kosong: versi yang dipakai tetap Cover CD asli UIN Madura dari lima contoh.
5. Jalankan `npm ci`, `npm run lint` (opsional jika dependency dan versi TS kompatibel), `npm run build`, kemudian deploy frontend + backend. Pastikan Node.js/Express sesuai hosting Anda; GitHub Pages sendiri tidak menjalankan server.
6. Refresh website dan buka Menu 1 Link 7.

## Cara menggunakan
- Unggah skripsi asli dalam format **DOCX** (disarankan agar footnote Word terbaca). PDF berbasis teks atau TXT juga dapat digunakan, tetapi footnote PDF belum dapat dipastikan terdeteksi; PDF scan tanpa OCR bisa gagal.
- Isi/konfirmasi judul **persis sesuai teks yang terbaca di skripsi**, serta Nama, NIM, Prodi, Bulan/Tahun untuk Cover CD.
- Klik **Susun Artikel dari Teks Skripsi Asli**.
- Sistem memilih paragraf dari BAB I, III, IV dan V serta abstrak/pustaka jika ada. BAB II tidak otomatis dikarang ulang sebagai pembahasan.
- Lihat laporan peringatan dan pratinjau. Jangan menganggap artikel lengkap bila bagian/footnote asli gagal terdeteksi.
- Download paket ZIP berisi `Artikel_Jurnal_*.docx` dan `Cover_CD_*.docx`.
- Jika pembuatan/validasi gagal, aplikasi tidak memanggil laporan selesai untuk kuota.

## Garansi teknis dan keterbatasan
- Teks isi yang dipilih diperiksa kecocokannya terhadap hasil ekstraksi file sumber sebelum berkas Word dikemas. Teks AI baru tidak diproduksi.
- Footnote DOCX berasal dari `word/footnotes.xml` dan nomor rujukan dari `word/document.xml`. Footnote tanpa pasangan yang ditemukan tidak dibuat-buat; sumber hilang membuat proses gagal jika ada penanda rujukan terdeteksi.
- Berkas asli mungkin salah secara ilmiah; mode ini **tidak membuktikan kebenaran faktual wawancara**, hanya bahwa catatan itu benar-benar ada di skripsi yang diunggah.
- Jumlah halaman 15/18/20/25 bukan janji halaman pasti. Naskah singkat tidak diisi dengan paragraf karangan.
- Format PDF hasil scan belum OCR; tabel, gambar, footnote PDF, daftar pustaka yang terbelah dapat memerlukan perbaikan manusia.
- Abstrak Inggris tidak diterjemahkan otomatis jika aslinya tidak ada; daftar referensi dan wawancara yang hilang tidak dilengkapi dari internet.
- Penyelarasan dengan template DOCX jurnal eksternal sementara dinonaktifkan karena bisa menghilangkan footnote. Ekspor Word standar dan cover CD tetap tersedia.
- Fitur editor hanya mengizinkan paragraf yang ditemukan di sumber, sehingga penambahan baru atau parafrasa tanpa sumber ditolak.
- Mekanisme kuota backend lama/Firestore tetap perlu pemeriksaan keamanan tambahan agar tidak dapat dilewati dengan memanggil endpoint langsung.
- Source telah lulus pemeriksaan sintaks TypeScript dan tes fungsi ekstraktif dengan contoh sintetis. **Belum diuji end-to-end dengan skripsi riil, Gemini, browser/mobile, build penuh, dan Firestore produksi.**

## Perubahan endpoint
Endpoint lawas `/api/journal7/generate-journal`, `/stage1`, `/stage2`, `/stage3`, dan `/api/journal7/regenerate-section` sekarang mengembalikan HTTP 410. Hal ini disengaja agar frontend cache lama tidak lagi memanggil layanan penulisan ulang AI.

## Pengujian setelah deploy
1. Satu DOCX skripsi asli dengan footnote Word: catatan kaki harus tertaut ke kalimat yang sama tanpa menambah informan/tanggal.
2. Satu naskah tanpa pembahasan: bagian pembahasan kosong/peringatan; tidak ada paragraf buatan.
3. Satu file PDF hasil scan: bila tidak terbaca, tidak boleh ditagih sebagai selesai.
4. Uji perubahan editor dengan menambahkan kalimat yang tidak ada di skripsi: harus ditolak.
5. Unduh ZIP dan buka kedua DOCX; bandingkan kalimat/nilai statistik/nama informan pada sumber asli.
6. Verifikasi pemotongan kuota hanya sekali per sesi yang berhasil.
