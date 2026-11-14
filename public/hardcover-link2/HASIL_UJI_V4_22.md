# HASIL PENGUJIAN V4.22

## Pengujian yang berhasil

- **200/200** sampel sintetik (judul berbeda, abstrak 2–5 paragraf): semua memilih hanya paragraf terakhir sesuai area punggung dan sampul belakang. Distribusi pada sampel ini: 170 kasus dua paragraf, 30 kasus tiga paragraf.
- Skenario dua paragraf terlalu panjang: pemilih fallback menjadi **satu paragraf terakhir**, tidak mengambil dari awal.
- Metadata bibliografi DOCX seperti `Adi Mulyono M Lutfi, 19382011071 ... Skripsi, Program Studi ..., Universitas ..., pembimbing ...` dikenali dan dilewati.
- Bila satu-satunya teks setelah `ABSTRAK` adalah identitas tersebut, aplikasi menolak dan meminta pemeriksaan manual.
- Enam ukuran punggung Dummybook 5–10 mm masih mengikuti geometri master sebelumnya.
- Logo pengganti UNIRA adalah PNG RGBA 321×330 piksel dengan transparansi (alpha=0 pada sudut). Pratinjau UNIRA 18 mm ditampilkan dalam berkas PDF terpisah.
- Pemeriksaan sintaks JavaScript melalui Node berhasil.
- Mode Polos, Warna, IPS, dan desain master PDF tetap tidak diubah.

## Batasan yang belum tervalidasi

- Tidak tersedia 200 skripsi *asli*; pengujian 200 menggunakan contoh teks sintetik. Tidak semua struktur DOCX/PDF dapat dikenali otomatis.
- Chromium lokal mengembalikan `ERR_BLOCKED_BY_ADMINISTRATOR` pada server lokal; ekspor PDF end-to-end di browser dan uji cetak belum bisa dipastikan.
- Arimo adalah font terbuka yang metriknya kompatibel Arial, **bukan Arial asli**. Agar Arial asli tertanam, pengguna perlu menyediakan font Arial Regular/Bold miliknya.
- Logo dan tahun UNIRA digeser turun 3 pt sesuai umpan balik; harus dipastikan kembali lewat uji cetak pada ketebalan yang dipakai.
