import { UserDocumentItem } from '../types';

export const initialSampleDocuments: UserDocumentItem[] = [
  {
    id: 'doc-sample-1',
    userId: 'user',
    toolId: 'art-1',
    toolTitle: 'Generator Artikel Ilmiah (Model 1)',
    categoryTitle: 'Buat Artikel Ilmiah',
    title: 'Analisis Dampak Transformasi Digital Terhadap Efisiensi Operasional UMKM di Jawa Timur',
    content: `ABSTRAK
Penelitian ini bertujuan untuk menguji secara empiris pengaruh adopsi teknologi digital terhadap peningkatan efisiensi operasional dan pertumbuhan pendapatan pada Usaha Mikro, Kecil, dan Menengah (UMKM) di wilayah Jawa Timur. Metode penelitian menggunakan pendekatan kuantitatif dengan teknik survei terstruktur pada 150 responden pelaku usaha. Pengujian hipotesis dilakukan menggunakan analisis regresi berganda berbantuan perangkat lunak statistik. Hasil analisis menunjukkan bahwa integrasi kanal pembayaran digital (QRIS) dan platform marketplace berkontribusi signifikan sebesar 42.8% terhadap efisiensi biaya operasional (p < 0.01). Temuan ini menegaskan pentingnya program pendampingan literasi finansial digital terstruktur oleh institusi terkait.

Kata Kunci: Transformasi Digital, Efisiensi Operasional, UMKM, Pembayaran Digital, Regresi Berganda.

1. PENDAHULUAN
Perkembangan lanskap ekonomi kontemporer menuntut transformasi fundamental dalam model bisnis konvensional. Di Indonesia, sektor Usaha Mikro, Kecil, dan Menengah (UMKM) merupakan tulang punggung perekonomian nasional yang menyumbang lebih dari 60% terhadap Produk Domestik Bruto (PDB). Kendati demikian, berbagai tantangan operasional seperti tingginya biaya transaksi dan keterbatasan penetrasi pasar kerap menjadi hambatan esensial dalam ekspansi usaha.

2. METODOLOGI PENELITIAN
Penelitian ini didesain menggunakan metode kuantitatif eksplanatori. Populasi sasaran mencakup seluruh UMKM binaan di wilayah Surabaya, Sidoarjo, dan Malang. Pengambilan sampel menerapkan teknik purposive sampling dengan kriteria minimum operasional selama 2 tahun dan telah memanfaatkan setidaknya satu instrumen digital commerce.`,
    notes: 'Draft siap submit untuk Jurnal Nasional Terakreditasi SINTA 3',
    wordCount: 198,
    fileType: 'docx',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 1
  },
  {
    id: 'doc-sample-2',
    userId: 'user',
    toolId: 'mak-1',
    toolTitle: 'Penyusun Makalah Cepat & Rapi',
    categoryTitle: 'Buat Makalah',
    title: 'Makalah Komprehensif: Etika Kecerdasan Buatan dalam Integritas Akademik Perguruan Tinggi',
    content: `BAB I PENDAHULUAN
1.1 Latar Belakang Masalah
Disrupsi Large Language Models (LLM) dalam dunia pendidikan tinggi menghadirkan paradoks etis antara efisiensi riset dan orisinalitas karya ilmiah. Integritas akademik merupakan fondasi utama reputasi institusi perguruan tinggi. Oleh karena itu, standardisasi pedoman pemanfaatan AI yang bertanggung jawab menjadi urgensi mendesak.

1.2 Rumusan Masalah
1. Bagaimana implikasi penggunaan generative AI terhadap kepatuhan etika penulisan karya ilmiah mahasiswa?
2. Bagaimana formulasi regulasi institusional yang adaptif tanpa menghambat inovasi riset mahasiswa?

BAB II PEMBAHASAN
2.1 Konseptualisasi Integritas Akademik di Era Generatif
Integritas akademik mencakup lima nilai fundamental: kejujuran, kepercayaan, keadilan, rasa hormat, dan tanggung jawab. AI generatif seyogianya diposisikan sebagai akselerator eksplorasi referensi dan alat brainstorming, bukan sebagai pengganti daya nalar kritis (critical thinking) manusia.`,
    notes: 'Makalah tugas mata kuliah Metodologi Penelitian & Etika Ilmiah',
    wordCount: 145,
    fileType: 'docx',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 3
  },
  {
    id: 'doc-sample-3',
    userId: 'user',
    toolId: 'plag-1',
    toolTitle: 'Penurunan Skor Plagiasi (Parafrase Kalimat)',
    categoryTitle: 'Anti Plagiasi',
    title: 'Hasil Rekonstruksi & Parafrase Anti-Plagiasi Bab II Tinjauan Pustaka',
    content: `[TEKS ASLI TURNITIN 38%]
Menurut Kotler dan Keller (2016), kepuasan pelanggan adalah perasaan senang atau kecewa seseorang yang muncul setelah membandingkan antara persepsi terhadap kinerja atau hasil suatu produk dengan harapan-harapannya. Jika kinerja berada di bawah harapan, pelanggan tidak puas.

[HASIL REKONSTRUKSI PARAFRASE ZAIN.NET - INDEKS KESAMAAN < 8%]
Evaluasi kepuasan konsumen dapat didefinisikan sebagai respon afektif yang timbul dari proses komparasi antara ekspektasi awal dengan realitas performa produk atau layanan yang diterima (Kotler & Keller, 2016). Kesenjangan negatif antara ekspektasi dan output aktual secara langsung memicu ketidakpuasan, sedangkan pencapaian performa yang melampaui ekspektasi akan membentuk loyalitas konsumen jangka panjang.`,
    notes: 'Skor Turnitin berhasil turun dari 38% ke 7%',
    wordCount: 112,
    fileType: 'docx',
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 5
  },
  {
    id: 'doc-sample-4',
    userId: 'user',
    toolId: 'prop-1',
    toolTitle: 'Penyusun Proposal Skripsi & Penelitian',
    categoryTitle: 'Penyusunan Proposal',
    title: 'Proposal Penelitian: Analisis Pengaruh Transformasi Layanan Digital Terhadap Kinerja Akademik',
    content: `PROPOSAL PENELITIAN
1. JUDUL PENELITIAN
Analisis Pengaruh Transformasi Layanan Digital Terhadap Kinerja Akademik Mahasiswa Perguruan Tinggi

BAB I PENDAHULUAN
1.1 Latar Belakang Masalah
Akselerasi adopsi platform komputasi awan dan kecerdasan buatan telah mentransformasi metode pengerjaan karya ilmiah dan pengelolaan literatur akademik di lingkungan universitas...
1.2 Rumusan Masalah
1. Bagaimana korelasi pemanfaatan modul akademik otomatis dengan kecepatan penyusunan karya ilmiah mahasiswa?
2. Bagaimana efektivitas penerapan sistem validasi naskah digital terhadap peningkatan kepatuhan metodologi penelitian?
1.3 Tujuan Penelitian
Mengidentifikasi faktor determinan dan menguji model regresi efektivitas transformasi layanan digital akademik.

BAB II TINJAUAN PUSTAKA & METODOLOGI
Pendekatan kuantitatif korelasional dengan instrumen survei terstruktur pada populasi mahasiswa tingkat akhir.`,
    notes: 'Draf proposal penelitian siap untuk sidang seminar proposal (Sempro)',
    wordCount: 135,
    fileType: 'docx',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now()
  }
];
