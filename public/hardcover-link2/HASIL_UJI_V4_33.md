# ZAIN.NET COVER V4.33 — CENTER 215 MM

- Perubahan **hanya** pada penempatan seluruh elemen teks depan dua pilihan 215 mm: Polos V1.1 dan Polos V2.1 (internal ID kompatibel `polosv22`).
- Pusat aktual hasil cetak = `(garis lipatan kanan punggung + garis potong luar kanan) / 2`, sehingga persis 107,5 mm dari masing-masing batas bidang 215 mm.
- Koordinat font pada sumber 483mm dikoreksi memakai skala cetak 480/483.
- Kolom judul, jenis dokumen, label Oleh, nama, NIM, prodi, fakultas, universitas, kota, tahun semua memakai `placement.frontCX` atau `placement.typeCX` yang ditetapkan ke pusat baru.
- Polos V1, V2 217 mm tidak diubah; punggung, logo (Polos tanpa logo), jenis warna, UNIRA, Dummybook, IPS, Cover CD tetap.
- Nama yang ditampilkan V2.1; identitas internal `polosv22` tetap untuk kompatibilitas pesanan lama.

## Uji yang dijalankan

- 19 ukuran 10–28mm, posisi pusat kiri dan kanan bidang depan masing-masing 107,5mm; lulus.
- Tes V4.32 geometri dua pilihan 215mm; lulus.
- Tes Polos V1/V2 38 ukuran, tahun Polos 19 ukuran, fakultas opsional 152 simulasi, metadata warna 19 ukuran, Cover CD 5 judul; lulus.
- Validasi sintaks JS dan struktur ZIP; lulus.

**Batasan:** tes geometri dan mock generator; belum diuji dengan printer fisik atau browser produksi. Lakukan pratinjau PDF 100% dan cetak uji sebelum produksi.
