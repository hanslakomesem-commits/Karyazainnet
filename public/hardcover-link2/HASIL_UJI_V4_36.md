# HASIL UJI V4.36 — Bahasa Inggris untuk seluruh Polos

- Sampel judul/nama dan footer dari foto **EKA MAULIDYA PUTRI** diuji lewat transkripsi teks yang terlihat pada foto; bukan OCR Tesseract langsung atas foto.
- Keluaran ekstraksi teks: THESIS; Written by → EKA MAULIDYA PUTRI; NIM 20381032059; English Teaching Learning Program; Tarbiyah Faculty; Madura Islamic State University; tahun 2026.
- Pengujian `test_v436_english_cover.mjs`: 4 pilihan Polos × 19 ketebalan = **76 ekspor mock** dengan teks identitas bahasa Inggris. Tidak ditemukan awalan `PROGRAM STUDI` / `FAKULTAS` / `Oleh:` untuk data Inggris.
- `test_v436_document_readers.mjs`: struktur XML DOCX dan PDF text-layer (keduanya mocked) menghasilkan identitas lengkap berbahasa Inggris.
- Regresi tes V4.23–V4.35 tetap dijalankan. Tanda tengah/garis Polos 215 mm V4.35 tidak diubah.
- Pemeriksaan sintaks JavaScript dan integritas ZIP dilakukan.

**Batas pengujian:** Mock tidak menjamin akurasi OCR foto buram, kestabilan unduh model Tesseract bilingual pada HP, atau keberhasilan cetak fisik. Periksa hasil OCR dan PDF 100% sebelum produksi.
