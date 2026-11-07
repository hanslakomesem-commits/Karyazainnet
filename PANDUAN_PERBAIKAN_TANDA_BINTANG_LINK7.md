# ZAIN.NET – PERBAIKAN TANDA BINTANG DALAM ARTIKEL LINK 7

Sumber kode: revisi terakhir Menu 1 Link 7 + Cover CD asli + kuota otomatis.

Masalah yang terbukti sebelum patch:
- Isi bagian pendahuluan, metode, hasil, pembahasan, kesimpulan masuk ke Word sebagai teks biasa, sehingga `*research gap*` tampil dengan tanda bintang.
- Footnote dari AI juga dimasukkan ke `docx` tanpa memformat tanda bintang.
- Preview di website menampilkan penanda bintang mentah.
- Ekspor lewat template jurnal Word juga menyimpan tanda bintang sebagai teks.

Solusi:
- Satu parser sederhana bersama (`inlineFormatting.ts`) membaca *italic*, **bold**, ***bold italic***, _italic_, __bold__, serta <em>/<i>/<strong>/<b>.
- Semua jalur Word dan preview Link 7 menggunakan parser yang sama.
- Footnote Word diubah menjadi run Word dengan properti cetak miring/tebal tanpa penanda Markdown literal.
- Penanda sitasi [^1], [^2] tidak dibersihkan oleh parser.
- Tanda * pada ekspresi `4*5*2` tetap dipertahankan.

Catatan batas:
- Patch khusus memperbaiki markup format; *tidak* memastikan referensi ilmiah benar atau memperbaiki penghilangan footnote oleh proses upload template Word. Fitur upload template jurnal masih perlu audit terpisah untuk relasi footnote Word aslinya.
- Source yang dikemas belum diuji end-to-end pada server produksi; pemeriksaan sintaks 5 file dan 6 uji parser berhasil.

Cara pasang:
1. Cadangkan repository GitHub website ZAIN.NET aktif.
2. Download PATCH_ZAINNET_LINK7_FORMAT_ITALIC_BOLD.zip.
3. Upload atau replace file berikut di repository, sesuai path-nya:
   - src/journalConverter/utils/inlineFormatting.ts (BARU)
   - src/journalConverter/utils/docxExport.ts
   - src/journalConverter/utils/templateEngine.ts
   - src/journalConverter/components/JournalPreview.tsx
   - src/journalConverter/components/FootnoteManager.tsx
4. Commit lalu deploy website pada server yang biasa menjalankan Node/Express untuk Link 7.
5. Uji satu skripsi dan unduh artikel Word; pastikan istilah miring tanpa bintang, demikian pula catatan kaki.
