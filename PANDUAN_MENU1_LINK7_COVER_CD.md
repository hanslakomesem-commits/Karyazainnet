# PANDUAN MENU 1 LINK 7 + COVER CD

Perubahan utama:
1. Link 7 sekarang menambahkan field NIM / NPM.
2. NIM dicoba terdeteksi otomatis dari file skripsi.
3. Tombol download pada Link 7 sekarang mengunduh 2 file sekaligus:
   - Artikel_Jurnal_*.docx
   - Cover_CD_*.docx
4. Cover CD dibuat otomatis berdasarkan metadata artikel: Nama, NIM, Judul, Prodi, Instansi.
5. Keberhasilan 3 tahap AI tetap menjadi penentu pencatatan kuota otomatis ZAIN.NET.

Catatan penting:
- Template cover CD saat ini dibuat secara programatis dari kode dan mengikuti format umum yang diminta:
  atas: Nama + NIM, tengah area logo kiri/kanan, bawah: Judul.
- Jika ingin 100% sama persis dengan file DOCX template eksternal, unggah file template DOCX tersebut langsung ke percakapan berikutnya agar bisa diikat lebih presisi.

File yang diubah:
- src/journalConverter/App.tsx
- src/journalConverter/components/Header.tsx
- src/journalConverter/components/SkripsiUploader.tsx
- src/journalConverter/types/journal.ts
- src/journalConverter/utils/coverCdExport.ts
