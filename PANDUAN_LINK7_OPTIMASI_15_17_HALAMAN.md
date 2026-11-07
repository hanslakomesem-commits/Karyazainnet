# ZAIN.NET Menu No. 1 — Link 7: Penyempurnaan Artikel Ekstraktif 15–17 Halaman

## Perubahan

1. **Daftar isi dan lampiran:** Mesin membaca heading BAB yang benar dan mengabaikan entri BAB pada daftar isi. Daftar pustaka berhenti sebelum `Lampiran`, `Lampiran 1`, `Lampiran 2`, dan variasinya. Sumber asli tidak dihapus.
2. **BAB IV lebih utama:** Seleksi relevansi mendahulukan paragraf hasil penelitian, data lapangan, wawancara, dan pembahasan. Bila terlalu pendek, mesin menambah paragraf asli, khususnya bagian hasil/pembahasan.
3. **Jika terlalu panjang:** Mesin mengurangi paragraf dengan skor relevansi lebih rendah tanpa menulis ulang. Paragraf yang tersisa tetap dalam urutan aslinya.
4. **Halaman Word sungguhan:** DOCX artikel dibentuk, lalu dikirim ke endpoint `POST /api/journal7/count-pages` untuk dirender melalui LibreOffice; jumlah halaman dihitung dari PDF hasil render. Dapat mencoba maksimal enam komposisi artikel dengan target 16 halaman (toleransi 15–17).
5. **Footnote dan wawancara:** Penanda serta teks footnote hanya diambil dari dokumen asli. Penanda yang hilang teks aslinya menyebabkan pemrosesan ditolak. Referensi tidak dibuat oleh AI.
6. **Cover CD/kuota:** Generator tetap menyiapkan ZIP berisi Artikel Jurnal Word + Cover CD asli sebelum melaporkan transaksi selesai.

## File patch

- `src/journalConverter/utils/extractiveArticle.ts` — pemilahan & pemilihan paragraf
- `src/journalConverter/utils/pageFitter.ts` — penyesuaian halaman berbasis hasil render nyata
- `src/journalConverter/App.tsx` — integrasi hasil pengukuran + pesan kepada pengguna
- `src/journalConverter/components/SkripsiUploader.tsx` — target otomatis 16 halaman
- `server/journal7/pageCount.ts` — endpoint pengukuran halaman DOCX
- `server/journal7/router.ts` — mendaftarkan endpoint

## Prasyarat hosting

- Website utama **harus menggunakan Node.js/Express**, bukan GitHub Pages murni.
- Install LibreOffice Writer pada sistem hosting agar perhitungan halaman benar-benar berfungsi (`libreoffice --version`). Jika path berbeda, atur environment variable `LIBREOFFICE_BIN`.
- Jalankan `npm ci`, `npm run lint`, `npm run build` dan deploy ulang **frontend dan backend**.
- Endpoint `POST /api/journal7/count-pages` menerima satu file DOCX (field `article`, maksimal 12 MB); konversi serentak dibatasi dua.
- Jika konversi tidak tersedia, aplikasi tetap dapat menghasilkan Word dari paragraf asli tetapi **menampilkan 'halaman belum terukur'**, bukan mengklaim 16 halaman.

## Cara memasang

1. Cadangkan repository GitHub web utama ZAIN.NET yang aktif.
2. Ekstrak ZIP PATCH, kemudian unggah folder dan file sesuai struktur aslinya.
3. Commit changes, kemudian jalankan build/deploy pada hosting aktif, termasuk server Node.js.
4. Buka Menu No. 1 → Link 7; gunakan satu skripsi DOCX asli dengan footnote Word.
5. Periksa indikator halaman setelah proses selesai, lalu unduh ZIP artikel dan Cover CD.
6. Buka Word dan periksa kutipan, footnote, nama narasumber, tanggal wawancara, isi BAB, daftar pustaka, serta jumlah halaman saat dicetak.

## Pengujian dan batasannya

- Uji ulang **200 masukan** pada mesin ekstraktif: **193 berhasil**, **7 ditolak** karena heading BAB tidak dikenal. Ini terdiri atas **2 skripsi asli** dan **198 simulasi**, bukan 200 skripsi asli.
- Pada dua skripsi asli, daftar pustaka yang terpilih tidak lagi mengandung lampiran; terdeteksi masing-masing 36 dan 46 entri referensi.
- Dengan DOCX uji yang dibuat menggunakan python-docx lalu dihitung melalui LibreOffice (bukan eksportir DOCX produksi JS dengan footnote Word): satu skripsi mencapai 16 halaman pada skala seleksi 0,35; skripsi kedua 15–17 halaman pada skala 0,45–0,55. Ini mengonfirmasi bahwa kisaran tersebut mungkin pada sampel nyata, **bukan** jaminan selalu 15–17 halaman.
- Footnote sumber yang dipilih tetap memiliki teks sumber, tetapi verifikasi empiris keaslian wawancara di dunia nyata tetap memerlukan berkas transkrip/bukti penelitian.
- Belum dilakukan pengujian end-to-end pada hosting produksi dengan modul Node lengkap, Firestore, DOCX produksi ber-footnote asli, dan browser Android/PC. **Jangan langsung deploy ke produksi tanpa staging.**
