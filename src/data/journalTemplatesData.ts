import { JournalTemplate, RawDraftArticle } from '../types/journalTemplate';

export const INITIAL_JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'tmpl-karsa-scopus',
    name: 'Karsa: Journal of Social and Islamic Culture',
    shortName: 'KARSA (Scopus & Sinta 1)',
    publisher: 'Pascasarjana IAIN Madura',
    category: 'Hukum & Humaniora',
    indexTier: 'Scopus Q1/Q2',
    issn: '2442-3289 (p); 2442-8285 (e)',
    description: 'Template resmi jurnal internasional terindeks Scopus & Sinta 1 bidang kajian sosial & budaya Islam. Layout 1 kolom Times New Roman, aturan wajib 3 penulis (Mahasiswa + 2 Dosen Pembimbing), sitasi Chicago Footnote, dan histori naskah.',
    fileType: 'DOCX',
    fileName: 'Template_KARSA_Journal_Social_Islamic_Culture_2026.docx',
    fileSize: '418 KB',
    uploadedAt: '22 September 2026',
    isPredefined: true,
    guidelines: {
      fontFamily: 'Times New Roman',
      fontSizeTitle: 14,
      fontSizeHeading: 12,
      fontSizeBody: 11,
      lineSpacing: '1.15',
      margins: { top: '2.5 cm', bottom: '2.5 cm', left: '2.5 cm', right: '2.5 cm' },
      columnCount: 1,
      citationStyle: 'Chicago 17th',
      abstractMaxWords: 250,
      keywordsMinMax: '3 - 5 kata kunci (dipisah titik koma)',
      minAuthors: 3,
      authorRuleDescription: 'Wajib 3 Penulis: 1 Mahasiswa (Penulis Utama) dan 2 Dosen Pembimbing beserta afiliasi & email masing-masing',
      requiresHistoryDates: true,
      sectionsRequired: [
        'Judul Naskah (Title)',
        '3 Penulis (1 Mahasiswa + 2 Dosen Pembimbing)',
        'Afiliasi & Email Masing-Masing Penulis',
        'Histori Naskah (Received, Accepted, Published)',
        'Abstract (English) & Keywords',
        'Introduction',
        'Methods',
        'Results',
        'Discussion',
        'Conclusion',
        'Acknowledgment (if any)',
        'Reference (Chicago Footnotes & Daftar Pustaka)'
      ],
      paperSize: 'A4',
      headerFooterText: 'Karsa: Journal of Social and Islamic Culture | ISSN: 2442-3289 (p); 2442-8285 (e)',
      specialRules: [
        'Wajib mencantumkan 3 penulis: Nama Mahasiswa dan 2 Nama Dosen Pembimbing beserta institusi/afiliasi dan email masing-masing.',
        'Naskah dibuat dalam format 1 kolom penuh (single column) menggunakan font Times New Roman.',
        'Gaya sitasi menggunakan Catatan Kaki (Footnotes / Chicago 17th Style) dan daftar pustaka alfabetis di akhir naskah.',
        'Tanggal histori penerimaan naskah (Received, Accepted, Published) dan DOI dicantumkan pada bagian awal.',
        'Seluruh isi teks naskah hasil upload dimasukkan secara utuh ke template tanpa diringkas atau dikurangi sedikitpun.'
      ]
    }
  },
  {
    id: 'tmpl-sinta2-jtecs',
    name: 'Jurnal Teknologi Informasi dan Rekayasa Komputer (JTECS)',
    shortName: 'JTECS Sinta 2',
    publisher: 'Fakultas Ilmu Komputer & Asosiasi Pendidikan Tinggi Informatika',
    category: 'Teknologi & Komputer',
    indexTier: 'Sinta 2',
    issn: '2685-3310 (Online)',
    description: 'Template resmi naskah publikasi bidang Rekayasa Perangkat Lunak, Kecerdasan Buatan, dan Jaringan Komputer dengan standar format 2 kolom IEEE.',
    fileType: 'DOCX',
    fileName: 'Template_JTECS_SINTA2_2026.docx',
    fileSize: '348 KB',
    uploadedAt: '12 September 2026',
    isPredefined: true,
    guidelines: {
      fontFamily: 'Times New Roman',
      fontSizeTitle: 16,
      fontSizeHeading: 11,
      fontSizeBody: 10,
      lineSpacing: '1.0',
      margins: { top: '2.5 cm', bottom: '2.5 cm', left: '2.5 cm', right: '2.0 cm' },
      columnCount: 2,
      citationStyle: 'IEEE (Numbered)',
      abstractMaxWords: 200,
      keywordsMinMax: '3 - 5 kata kunci',
      sectionsRequired: [
        'Judul & Identitas Penulis',
        'Abstrak & Keywords (Bilingual)',
        '1. PENDAHULUAN',
        '2. METODOLOGI PENELITIAN',
        '3. HASIL DAN PEMBAHASAN',
        '4. KESIMPULAN & SARAN',
        'UCAPAN TERIMA KASIH (Opsional)',
        'DAFTAR PUSTAKA'
      ],
      paperSize: 'A4',
      headerFooterText: 'Jurnal Teknologi Informasi & Rekayasa Komputer (JTECS) Vol. 14 No. 2, 2026',
      specialRules: [
        'Judul maksimal 14 kata, huruf kapital di awal kata (Title Case).',
        'Format sitasi wajib menggunakan kurung siku bernomor urut kemunculan [1], [2].',
        'Panjang artikel berkisar antara 6 sampai 10 halaman dua kolom.',
        'Tabel dan Gambar wajib memiliki nomor dan rujukan di dalam teks naskah.'
      ]
    }
  },
  {
    id: 'tmpl-sinta3-jpi',
    name: 'Jurnal Pendidikan Indonesia dan Pengembangan Karakter (JPIPK)',
    shortName: 'JPIPK Sinta 3',
    publisher: 'Lembaga Publikasi Ilmiah Pendidikan Nasional',
    category: 'Pendidikan & Sosial',
    indexTier: 'Sinta 3',
    issn: '2541-118X (Online)',
    description: 'Panduan tata tulis artikel ilmiah rumpun Pendidikan Guru, Kurikulum Merdeka, dan Model Pembelajaran Abad 21 dengan format 1 kolom standar APA.',
    fileType: 'DOCX',
    fileName: 'Template_JPIPK_Sinta3_Revisi2026.docx',
    fileSize: '280 KB',
    uploadedAt: '05 September 2026',
    isPredefined: true,
    guidelines: {
      fontFamily: 'Arial',
      fontSizeTitle: 14,
      fontSizeHeading: 12,
      fontSizeBody: 11,
      lineSpacing: '1.15',
      margins: { top: '3.0 cm', bottom: '3.0 cm', left: '3.0 cm', right: '3.0 cm' },
      columnCount: 1,
      citationStyle: 'APA 7th',
      abstractMaxWords: 250,
      keywordsMinMax: '3 - 5 kata',
      sectionsRequired: [
        'Judul Makalah',
        'Nama Penulis, Afiliasi, & Korespondensi',
        'Abstrak (Bahasa Indonesia & English)',
        'PENDAHULUAN',
        'METODE PENELITIAN',
        'HASIL DAN PEMBAHASAN',
        'SIMPULAN',
        'DAFTAR PUSTAKA'
      ],
      paperSize: 'A4',
      headerFooterText: 'Jurnal Pendidikan Indonesia & Pengembangan Karakter (JPIPK) | e-ISSN: 2541-118X',
      specialRules: [
        'Gunakan format 1 kolom untuk kenyamanan membaca di perangkat digital.',
        'Sitasi teks menggunakan format nama akhir penulis dan tahun, contoh: (Santoso, 2024).',
        'Rujukan primer (jurnal bereputasi 5 tahun terakhir) minimal 80% dari total referensi.'
      ]
    }
  },
  {
    id: 'tmpl-scopus-jaes',
    name: 'Journal of Applied Engineering and Intelligent Systems (JAEIS)',
    shortName: 'JAEIS Scopus Q2',
    publisher: 'International Scientific Press & Global Engineering Society',
    category: 'Sains & Teknik',
    indexTier: 'Scopus Q1/Q2',
    issn: '2810-9942',
    description: 'Template internasional untuk naskah riset sains teknik, sensor pintar, dan robotika cerdas dengan tata letak modern 2 kolom Elsevier style.',
    fileType: 'DOCX',
    fileName: 'JAEIS_International_Template_Q2.docx',
    fileSize: '412 KB',
    uploadedAt: '18 Agustus 2026',
    isPredefined: true,
    guidelines: {
      fontFamily: 'Calibri',
      fontSizeTitle: 16,
      fontSizeHeading: 12,
      fontSizeBody: 10,
      lineSpacing: '1.15',
      margins: { top: '2.0 cm', bottom: '2.0 cm', left: '2.0 cm', right: '2.0 cm' },
      columnCount: 2,
      citationStyle: 'Harvard',
      abstractMaxWords: 200,
      keywordsMinMax: '4 - 6 keywords',
      sectionsRequired: [
        'Title of Research Paper',
        'Author Names & Affiliations',
        'Abstract & Highlights',
        '1. Introduction',
        '2. Materials and Experimental Methods',
        '3. Results and In-depth Discussion',
        '4. Conclusion and Future Works',
        'CRediT Authorship Contribution Statement',
        'References'
      ],
      paperSize: 'A4',
      headerFooterText: 'Journal of Applied Engineering & Intelligent Systems (JAEIS) - Vol. 8 Issue 3',
      specialRules: [
        'Naskah wajib berbahasa Inggris baku (Academic English).',
        'Abstrak dilengkapi 3 butir Research Highlights.',
        'Format persamaan matematika wajib diketik rapi dengan Math Equation editor.'
      ]
    }
  },
  {
    id: 'tmpl-sinta4-jramb',
    name: 'Jurnal Riset Akuntansi, Keuangan dan Manajemen Bisnis (JRAMB)',
    shortName: 'JRAMB Sinta 4',
    publisher: 'Fakultas Ekonomi dan Bisnis Universitas Muhammadiyah',
    category: 'Ekonomi & Manajemen',
    indexTier: 'Sinta 4',
    issn: '2477-8508',
    description: 'Template naskah penelitian bidang Keuangan Perusahaan, Pemasaran Digital, Akuntansi Sektor Publik, dan Manajemen Sumber Daya Manusia.',
    fileType: 'DOCX',
    fileName: 'Template_Naskah_JRAMB_FEB_2026.docx',
    fileSize: '310 KB',
    uploadedAt: '02 September 2026',
    isPredefined: true,
    guidelines: {
      fontFamily: 'Georgia',
      fontSizeTitle: 14,
      fontSizeHeading: 12,
      fontSizeBody: 11,
      lineSpacing: '1.5',
      margins: { top: '3.0 cm', bottom: '2.5 cm', left: '3.0 cm', right: '2.5 cm' },
      columnCount: 1,
      citationStyle: 'APA 7th',
      abstractMaxWords: 200,
      keywordsMinMax: '3 - 5 kata',
      sectionsRequired: [
        'Judul Artikel',
        'Identitas Penulis & Email Korespondensi',
        'Abstrak & Kata Kunci',
        'I. PENDAHULUAN',
        'II. TINJAUAN PUSTAKA & PENGEMBANGAN HIPOTESIS',
        'III. METODE PENELITIAN',
        'IV. HASIL DAN PEMBAHASAN',
        'V. KESIMPULAN, IMPLIKASI & KETERBATASAN',
        'DAFTAR PUSTAKA'
      ],
      paperSize: 'A4',
      headerFooterText: 'Jurnal Riset Akuntansi dan Manajemen Bisnis (JRAMB) Vol. 11 No. 1',
      specialRules: [
        'Spasi teks isi naskah 1.5 baris dengan indentasi paragraf 1 cm.',
        'Wajib mencantumkan nilai pengujian statistik (R-Square, F-Statistic, t-count, p-value).',
        'Maksimal 15 halaman termasuk tabel analisis regresi.'
      ]
    }
  },
  {
    id: 'tmpl-sinta2-jmkf',
    name: 'Jurnal Medika dan Farmasi Klinis Nusantara (JMFKN)',
    shortName: 'JMFKN Sinta 2 Medis',
    publisher: 'Ikatan Profesi Kesehatan & Riset Farmasi Klinis Indonesia',
    category: 'Kesehatan & Kedokteran',
    indexTier: 'Sinta 2',
    issn: '2721-6543',
    description: 'Pedoman publikasi uji klinis, farmakologi, keperawatan, dan epidemiologi kesehatan masyarakat dengan sistem sitasi Vancouver numerik kedokteran.',
    fileType: 'DOCX',
    fileName: 'Template_JMFKN_Vancouver_2026.docx',
    fileSize: '380 KB',
    uploadedAt: '10 September 2026',
    isPredefined: true,
    guidelines: {
      fontFamily: 'Times New Roman',
      fontSizeTitle: 14,
      fontSizeHeading: 11,
      fontSizeBody: 10,
      lineSpacing: '1.15',
      margins: { top: '2.5 cm', bottom: '2.5 cm', left: '3.0 cm', right: '2.0 cm' },
      columnCount: 2,
      citationStyle: 'Vancouver',
      abstractMaxWords: 250,
      keywordsMinMax: '3 - 6 Medical Subject Headings (MeSH)',
      sectionsRequired: [
        'Judul Artikel Kedokteran',
        'Penulis & Lembaga Rumah Sakit / Fakultas',
        'Abstrak Terstruktur (Latar Belakang, Metode, Hasil, Kesimpulan)',
        'PENDAHULUAN',
        'METODE PENELITIAN & PERSETUJUAN ETIK',
        'HASIL PENELITIAN',
        'PEMBAHASAN',
        'KESIMPULAN',
        'DEKLARASI KONFLIK KEPENTINGAN',
        'DAFTAR PUSTAKA'
      ],
      paperSize: 'A4',
      headerFooterText: 'Jurnal Medika & Farmasi Klinis Nusantara - Terakreditasi Kemenristek/BRIN Sinta 2',
      specialRules: [
        'Abstrak terstruktur wajib memuat 4 sub-bagian (Latar Belakang, Metode, Hasil, Kesimpulan).',
        'Wajib mencantumkan nomor Ethical Clearance (Persetujuan Komisi Etik Penelitian Kesehatan).',
        'Sitasi menggunakan gaya Vancouver superskrip atau angka di dalam kurung.'
      ]
    }
  }
];

export const SAMPLE_RAW_ARTICLE: RawDraftArticle = {
  title: 'Rancang Bangun Sistem Monitoring Kualitas Air Tambak Garam Berbasis IoT Menggunakan Algoritma Random Forest',
  authors: 'Ahmad Hanafi, Budi Santoso, Siti Nurjanah',
  affiliation: 'Program Studi Teknik Informatika, Fakultas Teknik, Universitas Wiraraja Sumenep',
  email: 'hanafi.academic@example.ac.id',
  abstract: 'Produktivitas tambak garam tradisional sangat dipengaruhi oleh stabilitas salinitas, derajat keasaman (pH), dan suhu air laut selama proses pengkristalan. Pengukuran manual oleh petambak seringkali terlambat mengantisipasi hujan mendadak dan fluktuasi air, yang menyebabkan penurunan kualitas panen garam hingga 40%. Penelitian ini mengembangkan sistem pemantauan kualitas air tambak garam berbasis Internet of Things (IoT) yang terintegrasi dengan algoritma machine learning Random Forest. Node sensor ditempatkan di petak meja kristalisasi untuk mengumpulkan data salinitas dan pH secara real-time melalui protokol komunikasi ESP32 dan LoRa. Hasil pengujian menunjukkan bahwa model Random Forest mampu memprediksi waktu optimal pengeringan garam dengan akurasi sebesar 94.8% dan nilai Mean Absolute Error (MAE) sebesar 0.32. Sistem ini mempercepat respon petambak terhadap perubahan cuaca serta meningkatkan efisiensi proses kristalisasi garam hingga 28%.',
  keywords: 'Internet of Things; Tambak Garam; Sensor Salinitas; Random Forest; Kualitas Garam',
  introduction: 'Sektor pergaraman nasional memegang peranan krusial bagi ketahanan industri pangan dan kimia di Indonesia. Namun demikian, sebagian besar petani garam di wilayah pesisir Jawa Timur masih menggunakan metode tradisional yang sangat bergantung pada intuisi visual tanpa dukungan data empiris. Perubahan cuaca ekstrem dan anomali musim kemarau basah seringkali merusak kadar kejenuhan air tua (Baume) pada kolam penampungan.\n\nBeberapa riset terdahulu menunjukkan pemanfaatan mikrokontroler untuk akuisisi data hidrologi, namun sebagian besar belum dilengkapi dengan model analitik prediktif berbasis machine learning yang andal. Penelitian Pratama dkk. (2023) menggunakan sensor pH konvensional tetapi memiliki kelemahan pada ketahanan korosi air garam berkonsentrasi tinggi. Oleh karena itu, diperlukan perancangan instrumen sensor tahan korosi yang terintegrasi dengan algoritma Random Forest untuk memberikan rekomendasi panen yang akurat kepada petambak.',
  methods: 'Penelitian ini menerapkan metodologi eksperimental bertahap yang mencakup: (1) Perancangan perangkat keras (Hardware Engineering) yang terdiri dari mikrokontroler ESP32, probe sensor salinitas konduktivitas tinggi dengan pelindung silikon anti-korosi, sensor pH industri, dan modul komunikasi LoRa SX1278; (2) Pembangunan arsitektur IoT cloud database menggunakan Google Firestore untuk merekam data telemetri setiap 15 detik; (3) Pelatihan dataset dengan 12.000 sampel parameter air garam menggunakan algoritma Random Forest Classifier dengan perbandingan data latih dan data uji sebesar 80:20; serta (4) Pengujian langsung di area tambak garam Desa Pinggirpapas Kabupaten Sumenep selama 30 hari siklus produksi.',
  resultsAndDiscussion: 'Berdasarkan pengujian lapangan selama 30 hari siklus pengeringan, sensor IoT berhasil mengirimkan data telemetri dengan tingkat keberhasilan pengiriman paket (Packet Delivery Ratio) sebesar 99.2% pada jarak jangkauan 2.4 km tanpa penguat sinyal.\n\nEvaluasi performa algoritma Random Forest dengan 100 pohon keputusan (n_estimators=100) menghasilkan nilai akurasi klasifikasi kematangan kristal garam sebesar 94.8%, Precision 93.6%, Recall 95.1%, dan F1-Score 94.3%. Nilai ini melampaui performa algoritma pembanding Support Vector Machine (SVM) yang hanya mencatat akurasi 88.5% pada dataset yang sama. Petambak yang memanfaatkan notifikasi peringatan dini dari aplikasi berhasil mengamankan naskah meja kristal sebelum terjadinya hujan lokal.',
  conclusion: 'Sistem monitoring kualitas air tambak garam berbasis IoT dan algoritma Random Forest yang dirancang terbukti efektif dalam memantau parameter kritis air garam secara real-time. Dengan akurasi prediksi 94.8% dan ketahanan sensor terhadap salinitas tinggi, sistem ini layak diterapkan secara massal untuk mendukung modernisasi sentra garam rakyat di daerah pesisir kepulauan. Penelitian lanjutan disarankan untuk mengintegrasikan citra satelit multispektral guna memetakan sebaran kadar garam secara makro.',
  acknowledgments: 'Penulis menyampaikan apresiasi dan terima kasih setinggi-tingginya kepada Direktorat Riset dan Pengabdian kepada Masyarakat (DRTPM) Kemendikbudristek serta Kelompok Petani Garam Madura atas fasilitas uji coba lapangan yang telah diberikan.',
  references: `[1] B. Santoso and A. Hanafi, "Penerapan Sensor Konduktivitas Tahan Korosi pada Pemantauan Salinitas Air Laut," Jurnal Rekayasa Elektrika, vol. 18, no. 2, pp. 112-119, 2024.
[2] R. Pratama, D. Kurniawan, and M. I. Arifin, "IoT-Based Marine Hydrochemical Monitoring Station for Coastal Aquaculture," IEEE Internet of Things Journal, vol. 10, no. 8, pp. 6840-6851, 2023.
[3] A. Susanto, "Analisis Algoritma Random Forest dan Gradient Boosting pada Prediksi Iklim Mikro Pesisir," Jurnal Ilmu Komputer dan Informatika (JIK), vol. 15, no. 1, pp. 45-54, 2024.
[4] Badan Pusat Statistik, "Statistik Perikanan dan Pertambakan Garam Indonesia 2025," BPS Republik Indonesia, Jakarta, 2025.
[5] K. H. Lee and M. Patel, "Corrosion-Resistant LoRa Sensor Nodes for Industrial Hypersaline Environments," Sensors and Actuators B: Chemical, vol. 342, p. 130088, 2023.`,
  authorsList: [
    {
      name: 'Ahmad Hanafi',
      affiliation: 'Program Studi Teknik Informatika, Fakultas Teknik, Universitas Wiraraja Sumenep',
      email: 'hanafi.academic@example.ac.id',
      role: 'student'
    },
    {
      name: 'Dr. Ir. Budi Santoso, M.Kom.',
      affiliation: 'Departemen Teknik Komputer, Fakultas Teknologi Elektro dan Informatika Cerdas, Institut Teknologi Sepuluh Nopember',
      email: 'budi.santoso@its.ac.id',
      role: 'advisor1'
    },
    {
      name: 'Prof. Dr. Hj. Siti Nurjanah, M.T.',
      affiliation: 'Fakultas Teknik, Universitas Airlangga, Surabaya',
      email: 'siti.nurjanah@ft.unair.ac.id',
      role: 'advisor2'
    }
  ],
  receivedDate: '29 April 2023',
  acceptedDate: '20 Nov 2023',
  publishedDate: '24 Dec 2023',
  doi: '10.19105/karsa.v31i2.8920',
  volumeIssue: 'Vol. 31 No. 2, December 2023',
  fullRawContent: `1. PENDAHULUAN

Sektor pergaraman nasional memegang peranan krusial bagi ketahanan industri pangan dan kimia di Indonesia. Namun demikian, sebagian besar petani garam di wilayah pesisir Jawa Timur masih menggunakan metode tradisional yang sangat bergantung pada intuisi visual tanpa dukungan data empiris. Perubahan cuaca ekstrem dan anomali musim kemarau basah seringkali merusak kadar kejenuhan air tua (Baume) pada kolam penampungan.

Beberapa riset terdahulu menunjukkan pemanfaatan mikrokontroler untuk akuisisi data hidrologi, namun sebagian besar belum dilengkapi dengan model analitik prediktif berbasis machine learning yang andal. Penelitian Pratama dkk. (2023) menggunakan sensor pH konvensional tetapi memiliki kelemahan pada ketahanan korosi air garam berkonsentrasi tinggi. Oleh karena itu, diperlukan perancangan instrumen sensor tahan korosi yang terintegrasi dengan algoritma Random Forest untuk memberikan rekomendasi panen yang akurat kepada petambak.

2. METODE PENELITIAN

Penelitian ini menerapkan metodologi eksperimental bertahap yang mencakup: (1) Perancangan perangkat keras (Hardware Engineering) yang terdiri dari mikrokontroler ESP32, probe sensor salinitas konduktivitas tinggi dengan pelindung silikon anti-korosi, sensor pH industri, dan modul komunikasi LoRa SX1278; (2) Pembangunan arsitektur IoT cloud database menggunakan Google Firestore untuk merekam data telemetri setiap 15 detik; (3) Pelatihan dataset dengan 12.000 sampel parameter air garam menggunakan algoritma Random Forest Classifier dengan perbandingan data latih dan data uji sebesar 80:20; serta (4) Pengujian langsung di area tambak garam Desa Pinggirpapas Kabupaten Sumenep selama 30 hari siklus produksi.

3. HASIL DAN PEMBAHASAN

Berdasarkan pengujian lapangan selama 30 hari siklus pengeringan, sensor IoT berhasil mengirimkan data telemetri dengan tingkat keberhasilan pengiriman paket (Packet Delivery Ratio) sebesar 99.2% pada jarak jangkauan 2.4 km tanpa penguat sinyal.

Evaluasi performa algoritma Random Forest dengan 100 pohon keputusan (n_estimators=100) menghasilkan nilai akurasi klasifikasi kematangan kristal garam sebesar 94.8%, Precision 93.6%, Recall 95.1%, dan F1-Score 94.3%. Nilai ini melampaui performa algoritma pembanding Support Vector Machine (SVM) yang hanya mencatat akurasi 88.5% pada dataset yang sama. Petambak yang memanfaatkan notifikasi peringatan dini dari aplikasi berhasil mengamankan naskah meja kristal sebelum terjadinya hujan lokal.

4. KESIMPULAN

Sistem monitoring kualitas air tambak garam berbasis IoT dan algoritma Random Forest yang dirancang terbukti efektif dalam memantau parameter kritis air garam secara real-time. Dengan akurasi prediksi 94.8% dan ketahanan sensor terhadap salinitas tinggi, sistem ini layak diterapkan secara massal untuk mendukung modernisasi sentra garam rakyat di daerah pesisir kepulauan. Penelitian lanjutan disarankan untuk mengintegrasikan citra satelit multispektral guna memetakan sebaran kadar garam secara makro.

UCAPAN TERIMA KASIH

Penulis menyampaikan apresiasi dan terima kasih setinggi-tingginya kepada Direktorat Riset dan Pengabdian kepada Masyarakat (DRTPM) Kemendikbudristek serta Kelompok Petani Garam Madura atas fasilitas uji coba lapangan yang telah diberikan.

DAFTAR PUSTAKA

[1] B. Santoso and A. Hanafi, "Penerapan Sensor Konduktivitas Tahan Korosi pada Pemantauan Salinitas Air Laut," Jurnal Rekayasa Elektrika, vol. 18, no. 2, pp. 112-119, 2024.
[2] R. Pratama, D. Kurniawan, and M. I. Arifin, "IoT-Based Marine Hydrochemical Monitoring Station for Coastal Aquaculture," IEEE Internet of Things Journal, vol. 10, no. 8, pp. 6840-6851, 2023.
[3] A. Susanto, "Analisis Algoritma Random Forest dan Gradient Boosting pada Prediksi Iklim Mikro Pesisir," Jurnal Ilmu Komputer dan Informatika (JIK), vol. 15, no. 1, pp. 45-54, 2024.
[4] Badan Pusat Statistik, "Statistik Perikanan dan Pertambakan Garam Indonesia 2025," BPS Republik Indonesia, Jakarta, 2025.
[5] K. H. Lee and M. Patel, "Corrosion-Resistant LoRa Sensor Nodes for Industrial Hypersaline Environments," Sensors and Actuators B: Chemical, vol. 342, p. 130088, 2023.`
};

export const SAMPLE_KARSA_ARTICLE: RawDraftArticle = {
  title: 'Historical and Religious Site as Tourism Attraction: The Case of the Great Mosque of Demak',
  authors: 'Hazim, Effy Maryam, Tri Ulfah',
  affiliation: 'Graduate School of Business, Economics and Social Sciences, Hamburg University',
  email: 'hazim@studium.de',
  abstract: 'Historical and religious sites are developing into tourist attractions. Tourist perception is interpreted as one way to determine visitor satisfaction, can advance the improvement of tourist attractions, and is a driver for revisit intentions. This study aims to explore the views of tourists regarding the meaning of the religious and historical as a tourist attraction, the pattern of visitor density in the tourist area of the Great Mosque of Demak, and to identify the perception of tourists about facilities, and revisit the intention of the Demak Great Mosque. The results showed that visitor revisit intention reached 89.42% influenced by the historical aura and cultural preservation of the heritage site.',
  keywords: 'religious tourism; historical tourism; Islamic tourism; Demak',
  introduction: 'Tourism is used as an essential role in economic, social, cultural, and religious life. In addition, tourism is expected to create new jobs for the community. Sandiaga Uno, Minister of Tourism and Creative Economy Indonesia, plans to open tourism destinations, including religious tourism. Tourism has developed into an industry capable of significantly contributing to the country\'s economic growth.\n\nThe existence of tourist objects is essential in tourism activities because tourists will visit tourist destinations if they have potential as tourist attractions. This tourist attraction has a variety of attractions that can be interesting for tourists. One of the attractions of a tourist attraction is its historical value, and often, there is a historical object that includes spiritual sites and related services visited for secular and religious reasons.\n\nDemak Regency is one of the provinces in Central Java, Indonesia, which is attractive for tourism and has a history of heritage dating back to the early development of Islam on the island of Java. One of these historical heritages is the Great Mosque of Demak, and until now, it has become the main icon of Demak, Central Java. The Great Mosque of Demak is the centre of religious and cultural activities for the supporting community.',
  methods: 'The research was conducted in Demak Great Mosque, Demak Regency, Central Java Province, Indonesia. This study combines quantitative and qualitative analysis in its research. A qualitative approach uses photovoice to answer the first research objective. The Photovoice method investigates the appeal of the Great Mosque of Demak as a tourist destination. Photovoice is a qualitative method that enables people to communicate rich stories about their lives through photographs by combining photographs and narratives that explain the participants\' perceptions and perspectives.\n\nPhotovoice includes three steps: (i) recruit participants, (ii) photo assignment, and (iii) record photo narration through semi-structured interviews. This study included 12 participants from students and communities interested in and knowledgeable of the Great Mosque of Demak. Quantitative research uses descriptive statistics to answer the second, third, and fourth research studies, collecting data from 104 visitor respondents.',
  resultsAndDiscussion: 'The Great Mosque of Demak has a profound meaning for visitors. This mosque is a worship site for Muslims that contains historical significance for the past development of Islam in Java. The Great Demak mosque complex is close to the Demak Sultanate Heritage Museum and the pilgrimage to the graves of Raden Patah and the Demak royal family. So, the historical and religious values in the Great Mosque of Demak are very thick and inseparable.\n\nTourism combines rest with knowledge of life, history, culture, traditions, and customs of one\'s own and those of other people. Historical and cultural tourism occupies one of the leading places among the main types of tourism. Demak Great Mosque is a tourism site with potential that deserves to be developed and managed optimally. Tourism in Indonesia varies, one of which is religious tourism. Walisongo Heritage is one of Indonesia\'s religious tourism sites. It is a symbol of the spread of Islam in Indonesia, especially on the island of Java. The survey results show that tourist satisfaction index scored 89.42% with strong motivation for spiritual revitalization.',
  conclusion: 'The Great Mosque of Demak has several unique tourist attractions, such as historical, religious, and educational, with the highest visitor density during the day, both during the high and low seasons, between 12.00 and 15.00. The quality of religious and non-religious facilities at the Great Mosque of Demak, as well as indicators of customer satisfaction, are driving factors for the interest and competitiveness of tourist sites. The results of acquiring a very high average quality of religious facilities and high quality of non-religious facilities at the Demak Great Mosque encourage tourists to visit and revisit.',
  acknowledgments: 'The author would like to thank Pascasarjana IAIN Madura and students of statistics courses who have assisted in collecting field data for this study.',
  references: `1. Abbate, Costanza Scaffidi, and Santo Di Nuovo. "Motivation and Personality Traits for Choosing Religious Tourism. A Research on the Case of Medjugorje." Current Issues in Tourism 16, no. 5 (2013): 501–6. https://doi.org/10.1080/13683500.2012.749844.
2. Afidah, Nur. "Perkembangan Islam Pada Masa Kerajaan Demak." Jurnal Studi Islam Dan Kemuhammadiyahan (JASIKA) 1, no. 1 (2021): 64–76.
3. Alifuddin, Muhammad, Alhamuddin, Andri Rosadi, and Ulil Amri. "Understanding Islamic Dialectics in The Relationship with Local Culture in Buton Architecture Design." KARSA: Journal of Social and Islamic Culture 29, no. 1 (2021): 230–54. https://doi.org/10.19105/karsa.v29i1.3742.
4. Andrianto, Tomy. "The Halal-Ness Hospitality on Halal Tourism, Case Study of Halal Restaurant in Bandung, Indonesia." Journal of Indonesian Tourism, Hospitality and Recreation 2, no. 2 (2019): 210–22.
5. Buzinde, Christine N. et al. "Emic Understandings of Kumbh Mela Pilgrimage Experiences." Annals of Tourism Research 49 (2014): 1–18.`,
  authorsList: [
    {
      name: 'Hazim',
      affiliation: 'Graduate School of Business, Economics and Social Sciences, Hamburg University, Hamburg, Germany',
      email: 'hazim@studium.de',
      role: 'student'
    },
    {
      name: 'Effy Maryam',
      affiliation: 'Fakultas Psikologi, Universitas Muhammadiyah Sidoarjo, Sidoarjo, Indonesia',
      email: 'effy.wardati@umsida.ac.id',
      role: 'advisor1'
    },
    {
      name: 'Tri Ulfah',
      affiliation: 'Fakultas Psikologi, Universitas Muhammadiyah Sidoarjo, Sidoarjo, Indonesia',
      email: 'tmegaaa@gmail.com',
      role: 'advisor2'
    }
  ],
  receivedDate: '29 April 2023',
  acceptedDate: '20 Nov 2023',
  publishedDate: '24 Dec 2023',
  doi: '10.19105/karsa.v31i2.8920',
  volumeIssue: 'Vol. 31 No. 2, December 2023',
  fullRawContent: `Introduction

Tourism is used as an essential role in economic, social, cultural, and religious life. In addition, tourism is expected to create new jobs for the community. Sandiaga Uno, Minister of Tourism and Creative Economy Indonesia, plans to open tourism destinations, including religious tourism. Tourism has developed into an industry capable of significantly contributing to the country's economic growth.

The existence of tourist objects is essential in tourism activities because tourists will visit tourist destinations if they have potential as tourist attractions. This tourist attraction has a variety of attractions that can be interesting for tourists. One of the attractions of a tourist attraction is its historical value, and often, there is a historical object that includes spiritual sites and related services visited for secular and religious reasons.

Demak Regency is one of the provinces in Central Java, Indonesia, which is attractive for tourism and has a history of heritage dating back to the early development of Islam on the island of Java. One of these historical heritages is the Great Mosque of Demak, and until now, it has become the main icon of Demak, Central Java. The Great Mosque of Demak is the centre of religious and cultural activities for the supporting community.

Methods

The research was conducted in Demak Great Mosque, Demak Regency, Central Java Province, Indonesia. This study combines quantitative and qualitative analysis in its research. A qualitative approach uses photovoice to answer the first research objective. The Photovoice method investigates the appeal of the Great Mosque of Demak as a tourist destination. Photovoice is a qualitative method that enables people to communicate rich stories about their lives through photographs by combining photographs and narratives that explain the participants' perceptions and perspectives.

Photovoice includes three steps: (i) recruit participants, (ii) photo assignment, and (iii) record photo narration through semi-structured interviews. This study included 12 participants from students and communities interested in and knowledgeable of the Great Mosque of Demak. Quantitative research uses descriptive statistics to answer the second, third, and fourth research studies, collecting data from 104 visitor respondents.

Results and Discussion

The Great Mosque of Demak has a profound meaning for visitors. This mosque is a worship site for Muslims that contains historical significance for the past development of Islam in Java. The Great Demak mosque complex is close to the Demak Sultanate Heritage Museum and the pilgrimage to the graves of Raden Patah and the Demak royal family. So, the historical and religious values in the Great Mosque of Demak are very thick and inseparable.

Tourism combines rest with knowledge of life, history, culture, traditions, and customs of one's own and those of other people. Historical and cultural tourism occupies one of the leading places among the main types of tourism. Demak Great Mosque is a tourism site with potential that deserves to be developed and managed optimally. Tourism in Indonesia varies, one of which is religious tourism. Walisongo Heritage is one of Indonesia's religious tourism sites. It is a symbol of the spread of Islam in Indonesia, especially on the island of Java. The survey results show that tourist satisfaction index scored 89.42% with strong motivation for spiritual revitalization.

Conclusion

The Great Mosque of Demak has several unique tourist attractions, such as historical, religious, and educational, with the highest visitor density during the day, both during the high and low seasons, between 12.00 and 15.00. The quality of religious and non-religious facilities at the Great Mosque of Demak, as well as indicators of customer satisfaction, are driving factors for the interest and competitiveness of tourist sites. The results of acquiring a very high average quality of religious facilities and high quality of non-religious facilities at the Demak Great Mosque encourage tourists to visit and revisit.

Acknowledgment

The author would like to thank Pascasarjana IAIN Madura and students of statistics courses who have assisted in collecting field data for this study.

Reference

1. Abbate, Costanza Scaffidi, and Santo Di Nuovo. "Motivation and Personality Traits for Choosing Religious Tourism. A Research on the Case of Medjugorje." Current Issues in Tourism 16, no. 5 (2013): 501–6. https://doi.org/10.1080/13683500.2012.749844.
2. Afidah, Nur. "Perkembangan Islam Pada Masa Kerajaan Demak." Jurnal Studi Islam Dan Kemuhammadiyahan (JASIKA) 1, no. 1 (2021): 64–76.
3. Alifuddin, Muhammad, Alhamuddin, Andri Rosadi, and Ulil Amri. "Understanding Islamic Dialectics in The Relationship with Local Culture in Buton Architecture Design." KARSA: Journal of Social and Islamic Culture 29, no. 1 (2021): 230–54. https://doi.org/10.19105/karsa.v29i1.3742.
4. Andrianto, Tomy. "The Halal-Ness Hospitality on Halal Tourism, Case Study of Halal Restaurant in Bandung, Indonesia." Journal of Indonesian Tourism, Hospitality and Recreation 2, no. 2 (2019): 210–22.
5. Buzinde, Christine N. et al. "Emic Understandings of Kumbh Mela Pilgrimage Experiences." Annals of Tourism Research 49 (2014): 1–18.`
};
