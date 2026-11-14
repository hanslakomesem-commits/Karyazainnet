# Hasil Uji ZAIN.NET COVER V4.27

## Perubahan
Hanya format **tahun/bulan-tahun pada punggung Polos V1**:

| Ketebalan | Font tahun | Penempatan horizontal |
|---|---:|---|
| 10 mm | 10,5 pt | tengah area punggung |
| 11 mm | 11 pt | tengah area punggung |
| 12–28 mm | 12 pt | koordinat asli masing-masing master |

Koordinat vertikal tahun dan judul tetap sesuai master. Panjang bulan/tahun yang tidak muat tidak dikecilkan diam-diam: ekspor memberi peringatan kesalahan.

## Pemeriksaan yang dijalankan
- 19/19 pemeriksaan font tahun dan margin punggung V1 lulus.
- 19/19 pemeriksaan geometri metadata punggung warna (regresi V4.26) lulus.
- 38/38 pemeriksaan tata letak Polos V1/V2 (simulasi) lulus.
- 5 judul Cover CD referensi (simulasi) lulus.
- Pemeriksaan sintaks semua JavaScript dan integritas ZIP dilaksanakan saat pengemasan.

**Batasan:** Ini pengujian modul dan geometri, bukan uji ekspor PDF end-to-end di Chrome/Firefox atau cetak pada printer fisik. Font dan posisi akhir wajib diperiksa dengan pratinjau cetak 100%.
