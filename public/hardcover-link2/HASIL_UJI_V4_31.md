# Hasil pengujian ZAIN.NET COVER V4.31

## Yang diperbarui
- Judul Word DOCX: simpan potongan kata berformat italic dari `w:i`, `w:rStyle`, dan gaya paragraf bila ada. Pencocokan tidak mengganti ejaan/diakritik sumber.
- Judul PDF teks: periksa info `fontName` / `fontFamily` jika secara eksplisit mengandung Italic/Oblique. Gabungkan potongan teks dan spasi menurut text layer.
- Judul foto/scan: ejaan OCR dipertahankan, tetapi **italic tidak dapat dipastikan secara otomatis** dengan Tesseract lokal; editor manual dan pesan peringatan tetap ada.
- Karakter transliterasi Unicode (ā, ī, ḥ, ṣ, ḍ, ṭ, ẓ, ‘, ’) dipertahankan saat terdeteksi; PDF memakai Tinos Bold Italic Unicode bawaan.
- Seluruh menu lain masih menggunakan generator dan master terdahulu.

## Tes
- 7 tes khusus judul/format: lulus. Mencakup italic campuran, spasi antar-potongan, diakritik, Word `w:i`, penonaktifan italic, serta PDF font family.
- Tes regresi: Cover CD, Polos V1/V2, jarak metadata punggung warna, tahun punggung, fakultas opsional, dan OCR kampus; semuanya lulus dalam pengujian kode.
- Sintaks `node --check`: lulus untuk semua modul utama.
- Integritas ZIP diperiksa sebelum penyerahan.

## Batasan yang belum teratasi
- Foto/scan belum dapat mengidentifikasi italic secara andal tanpa model pengenalan gaya huruf tambahan. Jangan menebak kata miring hanya dari tanda transliterasi.
- PDF dengan nama font anonim yang tidak memuat petunjuk Italic/Oblique mungkin belum dapat dikenali otomatis.
- PDF/Word yang hanya memuat gambar cover tetap perlu verifikasi manual.
- Ekspor akhir langsung melalui Chrome dan hasil cetak fisik belum diuji end-to-end; wajib periksa PDF sebelum produksi.
