# HASIL UJI ZAIN.NET COVER V4.24

Tanggal: 20 Oktober 2026

## Permintaan yang diimplementasikan
- Polos V1: nama/NIM diletakkan di atas logo UIN Madura.
- Polos V2: logo diletakkan di atas nama/NIM, dengan posisi teks dari `polos logo atas.pdf`.
- Ketebalan kedua mode: 10–28 mm, mengikuti sistem punggung Serli sebelumnya.
- Seluruh jenis cover lain tetap tersedia: Merah, Maroon, Custom, UNIRA, Dummybook, Soft Cover IPS, dan Cover CD.

## Pemeriksaan dan hasil
1. **19 ukuran × 2 varian = 38 jalur generator lolos**: lokasi logo, nama, NIM, ukuran halaman 480×330mm dan keberadaan master.
2. **5 judul Word Cover CD lulus regresi** menggunakan runtime PDF tiruan.
3. Sintaks `app.js`, `pdf-engine.js`, dan `plain-variant-layout.js` tidak menampilkan kesalahan pada `node --check`.
4. Semua tautan sumber lokal yang terhubung dalam HTML ditemukan dalam folder akhir.
5. Struktur ZIP diaudit dan diuji CRC.

## Batas penting
- `polos logo atas.pdf` berukuran 475×320 mm dan tidak menyertakan gambar logo. Karena output Polos asli 480×330mm, koordinat sumber V2 dipetakan ke master lama, lalu logo UIN dari aset Cover CD ditempatkan secara eksplisit.
- Jalur generator PDF diuji menggunakan **tiruan pdf-lib** agar koordinat bisa diverifikasi secara struktural. Belum ada bukti eksekusi akhir melalui Chrome atau printer asli.
- PDF contoh/pratinjau posisi dibuat secara terpisah untuk inspeksi tampilan dan **bukan** hasil ekspor engine browser.
- Sebelum produksi, uji cetak pada 10 mm dan 23 mm, perhatikan apakah logo/teks di tengah cover depan dan tanda punggung berada pada garis yang tepat.
