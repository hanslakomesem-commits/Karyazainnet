# AUDIT PUNGGUNG WARNA TIGA BARIS V4.8

**Sumber:** `10mm-28mm punggung 3 baris.pdf` (17 halaman) dan `25-26 mm(1).pdf` (2 halaman).
**Standar cover depan:** PDF warna yang sudah disetujui sebelumnya; kedua sumber ini HANYA dipakai untuk pedoman punggung.

- Jumlah referensi digabung: **19 halaman untuk 10–28 mm**, urut lengkap.
- Ukuran seluruh halaman: **475 × 320 mm**.
- Ukuran 25 dan 26 mm sekarang punya referensi nyata, bukan hasil perkiraan.
- Judul punggung tiga baris berada di dalam garis pembatas pada **19/19** halaman (berdasarkan bounding box teks).
- Terdapat elemen/tanda potong yang melampaui batas pada **17/19** halaman referensi; jangan dipakai langsung sebagai master produksi.
- Sejumlah halaman baru, khususnya 26, 27 dan 28 mm, menggeser posisi cover depan sekitar **+5,9 mm**. Ini **tidak** akan diterapkan pada desain cover depan aplikasi.
- Tata letak judul warna tiga baris secara vertikal ditengah menggunakan tengah hasil pengukuran sekitar **104 mm dari atas**. Pusat horizontal dihitung ulang dari dua garis batas punggung.
- Potongan kata `PERSPEK/TIF` dan `BumianyarKecamatan` pada file referensi tidak diikuti: teks berasal dari data yang telah diverifikasi.
- Mode polos tetap mengikuti template asli Serli dan hanya berbagi logika maksimal tiga baris.
- Ukuran warna **28 mm** masih ditolak oleh generator sebelumnya karena penanda kiri keluar bidang cetak. Tidak menghapus pengaman.

## Rincian 19 ukuran

| Ukuran | Sumber halaman | Lebar punggung terukur | Font contoh | Pergeseran depan pada sumber | Tanda potong keluar? |
|---:|---|---:|---:|---:|---|
| 10 mm | 10mm-28mm punggung 3 baris.pdf hal. 1 | 10.01 mm | 6 pt | -0.00 mm | Tidak |
| 11 mm | 10mm-28mm punggung 3 baris.pdf hal. 2 | 10.91 mm | 6 pt | -0.00 mm | Tidak |
| 12 mm | 10mm-28mm punggung 3 baris.pdf hal. 3 | 12.01 mm | 7 pt | -0.00 mm | Ya |
| 13 mm | 10mm-28mm punggung 3 baris.pdf hal. 4 | 13.11 mm | 9 pt | -0.00 mm | Ya |
| 14 mm | 10mm-28mm punggung 3 baris.pdf hal. 5 | 14.01 mm | 9 pt | -0.00 mm | Ya |
| 15 mm | 10mm-28mm punggung 3 baris.pdf hal. 6 | 15.01 mm | 9 pt | -0.00 mm | Ya |
| 16 mm | 10mm-28mm punggung 3 baris.pdf hal. 7 | 16.11 mm | 9 pt | -0.00 mm | Ya |
| 17 mm | 10mm-28mm punggung 3 baris.pdf hal. 8 | 17.01 mm | 9 pt | -0.00 mm | Ya |
| 18 mm | 10mm-28mm punggung 3 baris.pdf hal. 9 | 18.01 mm | 9 pt | -0.00 mm | Ya |
| 19 mm | 10mm-28mm punggung 3 baris.pdf hal. 10 | 19.01 mm | 9 pt | -0.00 mm | Ya |
| 20 mm | 10mm-28mm punggung 3 baris.pdf hal. 11 | 20.01 mm | 9 pt | -0.00 mm | Ya |
| 21 mm | 10mm-28mm punggung 3 baris.pdf hal. 12 | 21.01 mm | 9 pt | -0.00 mm | Ya |
| 22 mm | 10mm-28mm punggung 3 baris.pdf hal. 13 | 22.01 mm | 9 pt | -0.00 mm | Ya |
| 23 mm | 10mm-28mm punggung 3 baris.pdf hal. 14 | 23.01 mm | 9 pt | -0.00 mm | Ya |
| 24 mm | 10mm-28mm punggung 3 baris.pdf hal. 15 | 24.01 mm | 9 pt | -0.00 mm | Ya |
| 25 mm | 25-26 mm(1).pdf hal. 1 | 24.91 mm | 9 pt | -0.00 mm | Ya |
| 26 mm | 25-26 mm(1).pdf hal. 2 | 26.01 mm | 9 pt | +5.90 mm | Ya |
| 27 mm | 10mm-28mm punggung 3 baris.pdf hal. 16 | 27.01 mm | 9 pt | +5.90 mm | Ya |
| 28 mm | 10mm-28mm punggung 3 baris.pdf hal. 17 | 28.01 mm | 9 pt | +5.90 mm | Ya |

## Cara verifikasi praktis

1. Periksa PDF warna dari aplikasi menggunakan data uji dan punggung 10, 12, 25, 26, 27 mm.
2. Pastikan cover depan merah/maroon tidak bergerak saat ukuran punggung berubah.
3. Ukur jarak garis kedua–ketiga pada area punggung dengan alat ukur PDF atau cetak 100%.
4. Periksa teks atas (3 baris), SKRIPSI/TESIS, nama, dan tahun di antara dua garis kuning.
5. Jangan menyatakan template telah lolos cetak fisik tanpa proof di percetakan.

**Batas audit:** Pengukuran menggunakan PyMuPDF pada PDF referensi. Ekspor PDF lewat pdf-lib di browser belum diuji end-to-end dalam pekerjaan ini.
