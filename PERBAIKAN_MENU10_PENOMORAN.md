# ZAIN.NET — Perbaikan Penomoran Halaman Menu No. 10

## Masalah yang ditemukan

Pada fungsi `src/gabungFile/utils/docxModifier.ts`, aplikasi menyisipkan `w:sectPr` baru setiap kali mengganti Halaman Persetujuan dan/atau Halaman Pengesahan dengan scan. Implementasi lama mengambil pengaturan `w:sectPr` terakhir (`defaultAcademicSectPr`) untuk seluruh bagian. Karena section terakhir pada DOCX contoh berisi `w:pgNumType w:start="1"`, dua section buatan ikut merestart nomor dari 1. Selain itu, atribut `w:titlePg` (first page footer berbeda) tersalin sehingga nomor di halaman pertama section baru tidak selalu tampil.

## Perubahan

1. Memilih `w:sectPr` asli sesuai posisi halaman yang diproses, bukan hanya section terakhir dokumen.
2. Jika section asli harus dipecah, pengaturan restart penomoran (`w:start`) hanya dibawa ke fragmen pertama; restart pada fragmen sumber dipindah, **bukan digandakan**.
3. Pengaturan `w:titlePg` dipertahankan hanya pada fragmen pertama section asli, agar footer bernomor tidak hilang pada Persetujuan, Pengesahan, atau Abstrak sesudahnya.
4. Mengubah margin section terakhir tanpa memaksa `w:type="nextPage"` atau mengembalikan restart yang telah dipindah.
5. Menambahkan pengaman: proses dihentikan bila urutan nilai restart nomor halaman asli tidak sama dengan hasil. Penjagaan yang sama ada pada `docxValidator.ts`, dan aplikasi meneruskan dokumen asli ke validator.
6. Menu lain, Auto-Crop tanpa rotasi, dan fitur rotasi manual tetap dipertahankan.

## Pengujian yang dijalankan

- `public/sample/SEBELUM.docx` (131 halaman), dengan `persetujuan.jpeg` dan `pengesahan.jpeg`.
- XML DOCX sesudah penyisipan valid dan urutan restart nomor asli tetap sama.
- PDF hasil konversi LibreOffice tetap **131 halaman**.
- Nomor di tepi seluruh halaman PDF identik dengan PDF dari Word asli, termasuk Romawi iii, iv, v ... xii lalu BAB I mulai dari 1.
- Penyisipan hanya Persetujuan, hanya Pengesahan, kedua halaman, serta kombinasi dengan scan Keaslian/Lampiran berhasil pada DOCX contoh.

## Perbaikan Lanjutan: Mempertahankan 100% Margin Asli, In Front of Text & In Line with Text

### Permintaan & Solusi:
1. **Pertahankan Semua Margin Asli Skripsi (Tanpa Perubahan Margin)**:
   - Tidak ada lagi pemaksaan margin 2 cm (`1134 twips`) baik pada lembar tanda tangan maupun bagian lampiran atau section penutup dokumen.
   - Semua elemen `<w:pgMar>` pada setiap `<w:sectPr>` naskah skripsi dipertahankan 100% persis seperti aslinya.
   - Tidak ada pembuatan section break buatan yang mengubah margin naskah.

2. **In Front of Text (`wp:anchor`, behindDoc="0", wrapNone) untuk:**
   - Halaman Persetujuan
   - Halaman Pengesahan
   - Surat Pernyataan Keaslian Tulisan
   Foto scan mengambang rapi di tengah halaman penuh A4 (`relativeFrom="page"`), mengisi halaman tanpa merusak margin paragraf atau menggeser layout teks sesudahnya.

3. **In Line with Text (`wp:inline`) untuk 5 Lampiran Utama:**
   - Surat Tugas Pembimbing Penyusunan Skripsi
   - Kartu Bimbingan (Depan & Belakang)
   - Surat Permohonan Izin Penelitian
   - Surat Keterangan Telah Meneliti
   - Surat Keterangan Bebas Plagiasi
   Judul lampiran (`Lampiran X: ...`) diletakkan di pinggir kiri (`w:jc w:val="left"`), disusul foto scan berformat In Line with Text yang lebarnya pas dalam batas margin asli skripsi (~14 cm).

4. **Koreksi Pendeteksian Target (`docxParser.ts`)**:
   - Memastikan `DAFTAR RUJUKAN` hanya dideteksi setelah `BAB I` (bukan dari daftar isi di bagian depan) dengan memeriksa `bab1ElementIndex !== -1` serta atribut tab stop OOXML (`<w:tab>`, `w:leader="dot"`).
   - Target Keaslian Tulisan dan 5 Lampiran dipetakan akurat ke posisinya masing-masing di bagian naskah asli, bukan ke halaman daftar lampiran (daftar isi).

## File yang diubah dalam pembaruan ini
- `src/gabungFile/utils/docxParser.ts`
- `src/gabungFile/utils/docxModifier.ts`
- `src/gabungFile/utils/docxValidator.ts`
- `src/gabungFile/App.tsx`
- `src/gabungFile/components/MappingTable.tsx`
- `PERBAIKAN_MENU10_PENOMORAN.md`
