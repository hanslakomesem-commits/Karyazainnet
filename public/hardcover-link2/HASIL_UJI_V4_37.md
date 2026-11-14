# ZAIN.NET COVER V4.37 — Pengujian garis bawah nama

## Tujuan
Nama mahasiswa bergaris bawah pada dokumen asal, seperti “DINIA NAILUL FARAH”
pada foto, dapat ditampilkan bergaris bawah pada cover depan untuk semua mode.

## Hasil pengujian
- Simulasi OCR dengan data koordinat: garis horizontal dan miring sedikit
  terdeteksi; kaki huruf yang terpisah tidak salah dikenali sebagai garis.
- DOCX: format `<w:u w:val="single"/>` pada nama dan style Word terbaca,
  `<w:u w:val="none"/>` serta nama normal tidak diubah.
- PDF generator mock: Polos V1/V2/V1.1/V2.1, Merah, Maroon, Custom, UNIRA,
  Soft Cover IPS dan Cover CD diuji dengan flag aktif/nonaktif;
  masing-masing menambahkan satu garis pada nama depan saja.
- Dummybook: sumber kode diverifikasi menggunakan fungsi `single()` yang sama,
  tanpa perubahan nama di punggung.
- Regresi: tes V4.23–V4.36 yang tersedia telah dijalankan.
- Sintaks modul JavaScript dan arsip ZIP diperiksa.

## Batasan penting
- Ini bukan uji OCR langsung dengan Tesseract di browser dan bukan 200 foto asli.
- PDF generator mock memeriksa posisi/operasi, bukan rasterisasi PDF fisik.
- Pengenalan garis pada foto atau scan bisa gagal karena noise/kemiringan;
  pemeriksaan dan kotak centang manual diperlukan sebelum ekspor.
- Hasil mencetak garis nama **pada cover depan**, bukan nama punggung.
