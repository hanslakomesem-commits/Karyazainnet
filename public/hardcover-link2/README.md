# ZAIN.NET COVER V4.31 — Italic dan transliterasi judul

Berdasarkan V4.30, semua template tetap ada. Source judul Word dengan penanda italic disalin sesuai run/style DOCX; PDF teks mencoba memakai font name/family yang secara eksplisit menunjukkan Italic/Oblique. Untuk foto atau scan, OCR lokal tidak memiliki deteksi italic andal: karakter tidak dibuang tetapi status italic harus diperiksa lewat editor manual. Font PDF Tinos Bold Italic Unicode menghindari hilangnya diakritik yang didukung. Jangan membuat klaim deteksi italic foto 100%.

# ZAIN.NET COVER V4.28 — Fakultas Opsional

Kampus yang tidak memiliki fakultas (contoh Sekolah Tinggi Agama Islam) boleh membiarkan kolom Fakultas kosong.
Jika diisi, tata letak tetap seperti sebelumnya. Jika kosong, baris Fakultas tidak dicetak; prodi mengisi baris fakultas agar identitas bawah tidak berjarak kosong.
Mencakup Polos V1/V2, Merah, Maroon, Custom, UNIRA, Dummybook, dan Soft Cover IPS. Cover CD tetap tidak menggunakan kolom fakultas.

Catatan: pendeteksian otomatis data dari foto/PDF/Word tetap perlu diverifikasi manual.

# ZAIN.NET COVER V4.28 — Tahun Punggung Polos V1

- Polos V1: 12–28 mm memakai tahun punggung **12 pt**.
- Polos V1: 10 mm memakai **10,5 pt**, 11 mm memakai **11 pt**; posisi tahun disejajarkan ke tengah area punggung.
- Polos V2 dan seluruh cover lainnya **tidak diubah**.
- Tulisan bulan/tahun yang terlalu panjang tidak diperkecil diam-diam. Aplikasi meminta pemeriksaan jika tidak muat.
- Hasil layout/geometri telah diuji; browser dan cetak fisik tetap perlu diuji oleh pengguna.

# ZAIN.NET COVER V4.26 — Dua Versi Polos TANPA LOGO

**Koreksi:** Sebutan nama/logo pada V4.24 hanyalah istilah untuk dua pola layout. Pada V4.26 **tidak ada logo dicetak pada Polos V1 maupun Polos V2**. Perbedaan kedua pilihan adalah koordinat teks pada cover depan:
- `polos` (V1): koordinat tata letak lama berdasarkan Serli.
- `poloslogoatas` (V2): koordinat tata letak terbaru berdasarkan `polos logo atas.pdf`.

**Dipertahankan:** geometri punggung 10–28 mm, font adaptif, ukuran PDF Polos 480×330 mm, jenis cover Merah/Maroon/Custom/UNIRA/Dummybook/Soft Cover IPS/Cover CD. Logo untuk cover-cover tersebut **tidak dihapus**.

**Pengujian:** `node tests/test_plain_v425.mjs` menguji 38 ekspor Polos dengan runtime PDF simulasi dan memeriksa tidak ada instruksi menggambar logo. Ini bukan uji printer fisik.

---

# ZAIN.NET COVER V4.26 — Dua pilihan Polos (Nama–Logo / Logo–Nama)

Source statis siap upload ke GitHub Pages, berasal dari V4.23 (semua menu lama dipertahankan).

## Polos V1 — Tata Letak Lama (tanpa logo)
- Nilai pilihan: `polos`; tetap kompatibel dengan pesanan sebelumnya.
- Posisi judul, identitas, dan kampus berdasarkan kalibrasi Serli versi lama.
- Tidak menambahkan gambar apa pun ke cover.

## Polos V2 — Tata Letak Baru (tanpa logo)
- Nilai pilihan: `poloslogoatas`; nama internal lama dipertahankan untuk kompatibilitas.
- Teks judul, nama, NIM, prodi, fakultas, universitas, dan tahun mengikuti koordinat acuan terbaru `polos logo atas.pdf` (tanpa menambahkan logo).
- Tidak menambahkan gambar apa pun ke cover.

## Aturan umum kedua Polos
- Tetap memilih punggung **10–28 mm** dengan kalibrasi Serli dan prioritas 9 pt di punggung lebar.
- Output PDF Polos fisik tetap **480 × 330 mm**. Master sumber Serli 483 × 330 mm disesuaikan lebar saat output (kode lama).
- Hasil PDF satuan/ZIP/gabungan tetap tersedia. Kedua gaya bisa digunakan dalam satu batch.
- Menu Merah, Maroon, Custom, UNIRA, Dummybook, Soft Cover IPS, dan Cover CD tidak dimodifikasi.

## Berkas yang relevan
- `plain-variant-layout.js` — konfigurasi dan pemeriksaan area teks identitas per varian.
- `pdf-engine.js` — generator kedua varian Polos tanpa gambar logo.
- `app.js`, `index.html` — dua pilihan Polos di menu per pesanan dan menu utama.
- `assets/REFERENSI_POLOS_V2_LOGO_ATAS.pdf` — file PDF terbaru pengguna, disertakan sebagai referensi (belum ada gambar logo di dalamnya).
- `assets/cover_cd_uin_logo.png` — logo untuk Cover CD saja, **tidak** dipakai Polos.

## Pengujian yang dilakukan
- `node tests/test_plain_v424.mjs`: 19 ketebalan × 2 pilihan = 38 tes jalur generator serta tidak adanya logo melalui runtime PDF tiruan.
- `node tests/test_cover_cd.mjs`: regresi Cover CD.
- `node --check app.js`, `node --check pdf-engine.js`: pemeriksaan sintaks JS.
- Pemeriksaan semua `src`/`href` lokal dan integritas ZIP.
- **Belum** memverifikasi PDF hasil melalui Chrome end-to-end atau cetak fisik dengan skala 100%. Pengukuran dan mock runtime tidak menggantikan cetak proof.

## Update GitHub Pages
1. Ekstrak ZIP; unggah isinya ke **root** branch `main` repository Edit-Hard-Cover, bukan file ZIP utuh.
2. Pastikan `assets/`, `vendor/`, `index.html`, `app.js`, `pdf-engine.js`, `plain-variant-layout.js` ada.
3. Commit; tunggu deploy GitHub Pages hijau; refresh `Ctrl+F5`.
4. Coba Polos V1 dan V2 pada 10 mm dan 23 mm, bandingkan posisi teks dan punggung; keduanya tanpa logo.

 
## COVER CD — berdasarkan referensi Word pengguna

- Ukuran cetak tepat mengikuti page size pada `COVER CD IAIN MADURA fix.docx`: **137,0189 × 137,0189 mm**, halaman **persegi**, 1 halaman PDF per orang.
- NAMA dan `NIM: ...` di bagian atas.
- PRODI dan BULAN/TAHUN di bagian atas tengah **opsional**, meniru lima contoh Word.
- Dua gambar LOGO UIN MADURA berwarna yang diekstrak dari DOCX tersebut pada kiri dan kanan.
- JUDUL bagian bawah, rata tengah; teks panjang dibungkus menjadi beberapa baris, font Tinos Bold (serif kompatibel Times New Roman). Jika terlalu panjang, font turun 9 → 7 pt; bila tetap tidak muat ekspor ditolak, tidak dipotong.
- **Cover CD tidak memakai punggung / ketebalan.** Tidak memerlukan data fakultas, universitas, dan jenis dokumen. Hanya nama, NIM, judul yang wajib.
- Hasil tetap PDF satuan, PDF gabungan, dan ZIP batch. Nama output `01_NAMA_COVERCD.pdf` (tanpa `MM`).

## Referensi

- `assets/cover_cd_uin_logo.png` — logo berwarna asli dari dokumen Word.
- `assets/REFERENSI_COVER_CD_5_CONTOH.docx` — dokumen Word yang diberikan, berisi 5 contoh.
- `cover-cd-layout.js` — angka tata letak dalam satuan point, dihitung dari render Word.
- `pdf-engine.js` — generator PDF browser.
- `app.js`, `index.html`, `style.css` — menu Cover CD dan validasi khusus tanpa ketebalan.

## Cara update GitHub

Ekstrak ZIP → pilih seluruh file/folder **di dalamnya** → unggah ke root repo `Edit-Hard-Cover` branch `main` → `Commit changes` → tunggu Pages hijau → refresh `Ctrl+F5`. **Jangan mengunggah ZIP saja** atau memindahkan isi `assets/` ke root. Paket ini kurang dari 100 berkas.

## Pengujian & batasan

- 5 judul dari lima halaman DOCX diuji terhadap batas dan area layout di mock generator.
- 200 judul sintetis dengan variasi panjang diuji; jika terlalu panjang akan ditolak dengan keterangan yang jelas.
- PDF visual 5 halaman yang disediakan sebagai pratinjau dibuat terpisah dengan ReportLab berdasarkan koordinat Word, **bukan keluaran end-to-end generator situs**.
- `tests/test_cover_cd.mjs` menguji fungsi generator dengan PDF runtime tiruan. `TEST_COVER_CD_V423.mjs` memeriksa pembungkus judul.
- **Browser/Chrome nyata belum teruji end-to-end karena kebijakan lingkungan menghalangi akses localhost.** Cetak proof skala 100% sebelum digunakan untuk pesanan.
- Berkas DOCX contoh berisi **lima cover**; aplikasi menganggap satu berkas unggahan sebagai satu pesanan. Ekspor otomatis kelima cover dari satu DOCX multipage belum dibuat. Koreksi hasil ekstraksi identitas secara manual bila perlu.
- CD menghasilkan **PDF** seperti keluaran cover lainnya; dokumen Word disertakan sebagai **referensi**, bukan output DOCX yang otomatis diisi.

Semua template terdahulu disertakan dalam ZIP tanpa perubahan sumber master mereka.

## Update V4.26 — Jarak punggung Merah/Maroon/Custom

Posisi `SKRIPSI` (jenis dokumen) dan nama pada punggung warna kini mengikuti lebar punggung aktual. Tidak lagi memakai jarak tetap 8,9 pt. Jarak kosong di antara dua jalur minimal 1,5 mm, dengan margin 0,9 mm dari garis lipatan. Font 9 pt tetap dipakai jika ada ruang. Tata letak judul, tahun, muka, dan jenis cover lain tidak diubah. Lihat `HASIL_UJI_V4_26.md`.


## V4.34 — Tanda potong pendek Polos V1.1/V2.1

Hapus garis panjang vertikal luar pada kedua versi 215mm. Hanya tanda potong pendek (18 pt) di bagian atas dan bawah yang dicetak; koordinat garis potong tetap 215mm dari lipatan, isi dan punggung tidak berubah. Polos V1/V2 dan tipe lainnya tidak berubah.

## V4.35 — Hilangkan tanda tengah atas/bawah, khusus Polos V1.1 dan V2.1

- Menghapus empat garis/tanda potong tambahan pada tengah sampul belakang dan depan (masing-masing atas dan bawah).
- Tidak menghapus tanda garis lipatan punggung; tetap aman untuk panduan penjilidan.
- Menyelaraskan tanda horizontal luar kiri/kanan ke batas potong baru 215 mm, menggantikan garis horizontal lama.
- Mempertahankan kanvas 480 × 330 mm, pusat teks 107,5 mm, punggung 10–28 mm, dan versi Polos V1/V2 (217 mm).
- Perubahan hanya terjadi pada kedua varian Polos 215 mm, bukan seluruh template.

Tetap lakukan pratinjau PDF skala 100% sebelum cetak massal.


## V4.36 — COVER BAHASA INGGRIS (SELURUH POLOS)

- **Polos V1, V2, V1.1 dan V2.1** menerima THESIS / Written by: / ENGLISH TEACHING LEARNING PROGRAM / TARBIYAH FACULTY / MADURA ISLAMIC STATE UNIVERSITY, tanpa awalan bahasa Indonesia pada label penulis, program studi, dan fakultas.
- Pengenalan data `classifier.js`, OCR zona `ocr-zones.js`, dan pembaca PDF/Word `document-reader.js` mendukung program studi/fakultas/kampus dengan tata bahasa Inggris.
- Model Tesseract foto/scan menjadi **ind+eng** (bilingual) dalam mode Cepat maupun Teliti; pada penggunaan pertama memerlukan akses internet untuk mengunduh data bahasa dan mungkin memerlukan memori ekstra. Tidak memakai token API.
- Form menyediakan **Bahasa penulisan cover (Polos)**: otomatis, Bahasa Indonesia, atau English. Jika pengenalan otomatis salah, pengguna dapat memilih secara manual.
- Teks Inggris dipertahankan sesuai dokumen, bukan diterjemahkan ke Bahasa Indonesia. Kolom fakultas dan kota tetap opsional; italic & transliterasi tetap tersedia.
- Mode **Polos V1 dan V2 lama tetap 217 mm per sisi**; V1.1/V2.1 tetap 215 mm dengan perbaikan garis V4.35. Varian Polos sengaja tidak menyertakan logo, termasuk jika sumber foto berlogo.
- Uji di `tests/test_v436_english_cover.mjs` mengukur **76 kombinasi ekspor simulasi** (4 varian × 19 ketebalan). Uji pembacaan PDF/Word mensimulasikan text layer dan paragraf. **Belum** diuji sebagai PDF nyata di browser atau dengan OCR foto nyata menggunakan Tesseract pada HP.

Sampel sumber pada uji bahasa Inggris: judul `THE EFFECT OF PROBLEM-BASED LEARNINGS ON RECOUNT TEXT LEARNING OUTCOMES OF GRADE X STUDENTS AT SMAN 3 SAMPANG`, `THESIS`, penulis `EKA MAULIDYA PUTRI`, NIM `20381032059`, prodi `ENGLISH TEACHING LEARNING PROGRAM`, fakultas `TARBIYAH FACULTY`, universitas `MADURA ISLAMIC STATE UNIVERSITY`, tahun `2026`.

## V4.37 — Format Garis Bawah Nama Mahasiswa

- Form `Nama mahasiswa` dilengkapi pilihan opsional **Garis bawah nama**.
- Semua mode produksi (Polos V1, V2, V1.1, V2.1, Warna, UNIRA,
  Dummybook, Soft Cover IPS, Cover CD) menghormati pilihan ini.
- Pada DOCX format garis bawah dari properti run/style dicoba dipulihkan.
- Pada foto dan PDF scan, OCR dipadukan dengan pencarian garis horizontal
  di dekat kotak nama; hasil tidak otomatis dijamin benar.
- PDF teks menggunakan pemeriksaan visual jika geometri font tersedia.
- Garis dicetak tepat sepanjang lebar nama yang sebenarnya dengan warna tinta
  yang sama. Tidak menambahkan garis pada nama punggung.
- Perubahan tidak menyentuh geometri 215/217 mm, versi lama, atau setting logo.
- Sesudah upload GitHub, refresh browser, periksa versi `V4.37`, unggah satu
  sampel nama bergaris bawah, konfirmasi kotak centang, dan cetak proof 100%.
