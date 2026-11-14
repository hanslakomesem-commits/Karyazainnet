# AUDIT REFERENSI WARNA TIGA BARIS — V4.7

**Sumber:** `10mm-28mm punggung 3 baris.pdf` (17 halaman). Ini audit referensi cetak, bukan klaim lulus uji printer.

## Kesimpulan

- Seluruh halaman: **475 × 320 mm**. Warna dasar merah, huruf kuning, logo UIN Madura terdapat di cover depan.
- Dari pengukuran dua garis batas punggung: halaman **1–15 ≈ 10–24 mm**, halaman **16 ≈ 27 mm**, halaman **17 ≈ 28 mm**. Tidak tersedia referensi **25 dan 26 mm** pada PDF ini.
- **Seluruh 17 halaman**: judul punggung terdiri dari **3 baris**, dan bounding box huruf masih berada **di dalam** dua batas garis punggung halaman tersebut.
- Font judul punggung contoh: **6 pt (10–11 mm), 7 pt (12 mm), 9 pt (13–24 dan 27–28 mm)**. Perbedaan font adalah bagian dari file asli, bukan pengubahan oleh aplikasi.
- **15 halaman memiliki sebagian garis/tanda potong di luar batas halaman**: 12–24 mm dan 27–28 mm. Pada 12 mm tanda kiri sampai **−0,06 mm**; pada 24 mm mencapai **−12,06 mm**. Pada 27–28 mm tanda kanan mencapai **480,86 mm**, padahal lebar halaman 475 mm.
- Dua halaman terakhir juga menggeser bagian depan sekitar **+5,90 mm** terhadap halaman 1–15. Ini tidak sesuai dengan persyaratan sebelumnya bahwa cover depan warna tetap pada posisi referensi `PILIHAN WARNA.pdf`.
- Contoh judul punggung memutus satu kata menjadi `PERSPEK` / `TIF` dan mencetak `BumianyarKecamatan` tanpa spasi. **Jangan jadikan ejaan ini sebagai pedoman OCR.** Aplikasi menata ulang judul dari teks sumber yang diperiksa pengguna.
- Beberapa judul contoh tidak 100% geometris di tengah, dengan selisih sampai **±1,55 mm** pada halaman 17. Kode generator menghitung ulang tengah dari batas guide, bukan menyalin pergeseran ini.

## Tabel setiap halaman

| Halaman | Lebar punggung terukur | Font contoh | Baris judul | Tanda potong di luar halaman? | Catatan |
|---:|---:|---:|---:|---|---|
| 1 | 10.01 mm (≈10) | 6 pt | 3 | Tidak | Tanda potong dalam bidang |
| 2 | 10.91 mm (≈11) | 6 pt | 3 | Tidak | Tanda potong dalam bidang |
| 3 | 12.01 mm (≈12) | 7 pt | 3 | YA | Ujung garis kiri terpotong |
| 4 | 13.11 mm (≈13) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 5 | 14.01 mm (≈14) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 6 | 15.01 mm (≈15) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 7 | 16.11 mm (≈16) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 8 | 17.01 mm (≈17) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 9 | 18.01 mm (≈18) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 10 | 19.01 mm (≈19) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 11 | 20.01 mm (≈20) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 12 | 21.01 mm (≈21) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 13 | 22.01 mm (≈22) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 14 | 23.01 mm (≈23) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 15 | 24.01 mm (≈24) | 9 pt | 3 | YA | Ujung garis kiri terpotong |
| 16 | 27.01 mm (≈27) | 9 pt | 3 | YA | Cover depan bergeser +5,9 mm |
| 17 | 28.01 mm (≈28) | 9 pt | 3 | YA | Cover depan bergeser +5,9 mm |

## Implikasi untuk aplikasi

1. **Mode Polos tidak diubah.** Mode warna tetap 475 × 320 mm dengan cover depan mengikuti `PILIHAN WARNA.pdf`, bukan cover polos atau halaman 27/28 yang bergeser.
2. **2–3 baris adaptif.** Untuk judul warna, utamakan 2 baris yang muat; jika tidak, gunakan 3 baris, lalu turunkan ukuran 9/8 → 7 → 6 pt bila diperlukan. Pecah antar-kata, bukan di tengah kata atau diakritik.
3. **Pusat geometris dari dua garis dalam.** Posisi teks dihitung dari batas hasil pengukuran per pesanan, tidak disalin dari posisi baris contoh yang kurang terpusat.
4. **Ukuran 25–26 mm** tetap bisa dihitung dari aturan lebar (bukan PDF referensi baru); wajib pemeriksaan fisik sebelum digunakan sebagai master produksi.
5. **28 mm warna** tetap diblokir sementara dalam generator standar, sebab pedoman trim kiri hasil pergeseran keluar batas kertas. Diperlukan persetujuan revisi bidang belakang, tata letak atau master baru agar 475 × 320 mm tetap dapat memenuhi semua garis potong. Jangan menghapus blokir hanya untuk membuat tombol bisa diunduh.
6. Untuk **12–27 mm**, segmen horizontal tanda potong kiri dapat mengalami pemendekan saat digambar ulang supaya tetap di kertas. Kode menambahkan peringatan cetak; bila semua panjang tanda harus sama persis, diperlukan revisi master cetak fisik.
7. Jangan menjadikan **hasil uji sintaks/analisis geometri** sebagai bukti kesesuaian output pdf-lib dan printer. Bandingkan file PDF hasil nyata dengan penggaris sebelum produksi.
