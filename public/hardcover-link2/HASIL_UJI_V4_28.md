# Hasil uji ZAIN.NET COVER V4.28 — Fakultas Opsional

## Perubahan
- Kolom Fakultas di formulir tidak wajib.
- Aplikasi tidak memasukkan fakultas dalam syarat kelengkapan batch dan PDF.
- Validator menerima fakultas kosong, tetap menguji isi yang diisi.
- Pembaca berkas tidak lagi memberi peringatan 'fakultas hilang' bila fakultas memang tidak ada.
- Jika tidak ada fakultas, baris fakultas tidak dicetak. Baris Program Studi menggunakan slot baris fakultas agar blok identitas bawah tetap rapat, sementara nama kampus/tahun tetap pada posisi acuannya.
- Templat yang terpengaruh: Polos V1, Polos V2, Warna, UNIRA, Dummybook, Soft Cover IPS. Cover CD tidak mencetak fakultas.

## Uji yang dijalankan
- 76 kombinasi generator Polos: 19 ketebalan × 2 versi × kondisi fakultas ada/tidak ada, dengan runtime PDF simulasi: **lulus**.
- Regresi Polos V1/V2 lama 38 sampel: **lulus**.
- Regresi punggung warna V4.26 19 ketebalan: **lulus**.
- Regresi tahun Polos V1 V4.27 19 ketebalan: **lulus**.
- Regresi Cover CD: **lulus**.
- Pemeriksaan sintaks JavaScript: **lulus**.
- Pemeriksaan struktur ZIP: **lulus**.

## Batasan
Pengujian PDF menggunakan runtime simulasi, bukan pembuatan PDF browser riil dan bukan cetak fisik. Template non-Polos diverifikasi melalui analisis kode bahwa instruksi fakultas bersyarat; belum dilakukan ekspor end-to-end satu per satu untuk semua mode. Ekstraksi OCR tetap mungkin memerlukan koreksi manual. Nama kampus yang tidak dapat dibaca harus diedit sebelum cetak.
