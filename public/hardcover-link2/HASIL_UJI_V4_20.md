# HASIL UJI — ZAIN.NET COVER V4.20 (SOFT COVER IPS)

## Referensi dan desain

- Sumber: `Soft Cover IPS.pdf` dari pengguna, **6 halaman**, setiap halaman **330 × 210 mm**, orientasi landscape.
- Master produksi `assets/soft_ips_clean.pdf` hanya memakai **halaman pertama**, setelah semua teks mahasiswa contoh dihapus.
- Logo UIN Madura asli dan vektor tanda potong tidak diubah. Pemeriksaan potongan area lambang: **piksel identik** antara contoh dan master bersih.
- Garis batas punggung yang dapat diukur dari halaman contoh sekitar **5 mm** (posisi lipatan kiri x=469,40 pt dan kanan x=483,40 pt). Enam halaman referensi **tidak** diasumsikan sebagai enam ketebalan berbeda.

## Implementasi

- Menu baru `Soft Cover IPS`, satu halaman PDF 330 × 210 mm.
- Ketebalan 5, 6, 7, 8, 9, 10 mm. Ukuran 6–10 mm adalah penyesuaian geometris dari referensi ~5 mm, **bukan master cetak terverifikasi**.
- Lipatan kanan dan cover depan tetap, empat tanda lipatan kiri digeser sama besar. Judul punggung pertama dicoba 2 kolom, lalu 3 kolom hanya jika 2 kolom tidak muat pada ukuran font aman.
- Cover depan memakai bidang teks dari contoh (judul, SKRIPSI, nama/NIM, PRODI/FAKULTAS/UNIVERSITAS, tahun) dan mempertahankan logo warna aslinya.
- Semua pilihan lama (Polos, Merah, Maroon, Custom, UNIRA, Dummybook) tetap tersedia.

## Pengujian yang benar-benar dijalankan

- 61 assertions Node untuk jalur Soft Cover IPS: pilihan mode, keenam ukuran, lebar punggung aktual, pusat lipatan, pergeseran serempak tanda kiri, ukuran font dan batas teks.
- Pemeriksaan PDF aset: halaman master 330×210 mm, seluruh teks contoh tidak tersisa, logo berwarna dan elemen vektor tetap ada.
- Tes lama untuk warna, Polos, UNIRA, Dummybook, OCR reader, Unicode font mocks, dan tombol upload/download dijalankan kembali dengan hasil lulus.
- Berkas source JavaScript telah diperiksa sintaksnya.

## Belum bisa diverifikasi

- Ekspor PDF *end-to-end* memakai PDF-lib/Tinos melalui Chrome dan kualitas cetak fisik belum diverifikasi karena koneksi pustaka CDN tidak tersedia di lingkungan pengujian.
- Ketebalan 6–10 mm wajib diuji cetak pada printer asli. Judul sangat panjang bisa ditolak oleh preflight agar tidak melampaui garis lipatan; hasil ditampilkan sebagai error, bukan dipotong.
