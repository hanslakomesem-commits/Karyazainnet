# ZAIN.NET Cover V4.19 — Catatan pengujian

**Pekerjaan:** menu Dummybook, punggung 5–10 mm, 2 halaman A4, sisi belakang dari paragraf akhir abstrak.

## Pemeriksaan yang berhasil

- 6 ketebalan 5, 6, 7, 8, 9, 10 mm diuji dengan fungsi geometri (batas punggung dan tebal aktual).
- Algoritme pemilihan paragraf: 2 paragraf bila pas, 1 jika 2 terlalu panjang, 3 jika 2 terlalu singkat. Tidak ada pemotongan isi.
- Pendeteksi ABSTRAK DOCX diuji dengan XML sintetis berisi 3 paragraf dan batas `Kata kunci`.
- Pembaca ABSTRAK PDF diuji dengan PDF.js tiruan; posisi paragraph-gap diidentifikasi dan pengelolaan PDF ditutup.
- Master `dummybook_clean_2pages.pdf`: tepat 2 halaman A4 595,28 × 841,89 pt, seluruh teks mahasiswa/abstrak contoh dihilangkan, gambar tetap ada.
- Modul regresi Polos, Warna, dan UNIRA dari V4.18 berjalan dan tidak mengubah asset template sebelumnya.
- Kode download batch telah diperbarui untuk menyalin semua halaman, bukan hanya halaman pertama.

## Yang **belum** dapat dipastikan

- Chromium pada lingkungan ini mengembalikan `ERR_BLOCKED_BY_ADMINISTRATOR` ketika mengakses situs localhost. Karena itu, **ekspor PDF nyata di browser belum terbukti berhasil end-to-end** dan hasil printer belum teruji.
- Ketebalan Dummybook 5–10 mm berasal dari interpolasi geometri satu referensi A4; gunakan cetak uji skala 100%.
- Penentuan paragraf dari PDF dapat keliru ketika dokumen tidak memuat struktur paragraf atau berupa scan; formulir edit manual sengaja disediakan.
- Font 4,5–6 pt pada punggung yang sangat tipis mungkin terlihat kecil secara fisik, meskipun batas geometrinya lolos tes.
