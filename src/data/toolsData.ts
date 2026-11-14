import { ToolCategory, ManualQrisConfig, RolesConfig, UserRole, CustomPricesConfig } from '../types';

export const defaultPaymentConfig: ManualQrisConfig = {
  merchantName: 'ZAIN.NET, TLANAKAN',
  nmid: 'ID1024339728304',
  terminalId: 'A01',
  printedBy: '93600914',
  qrisString: '00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET, TLANAKAN6008TLANAKAN61056937162070103A016304ACD0',
  qrisImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET,%20TLANAKAN6008TLANAKAN61056937162070103A016304ACD0',
  adminWhatsApp: '085231176597',
  enableUniqueCode: false,
  bankAccounts: [
    {
      bankName: 'Bank BCA',
      accountNumber: '1921060632',
      accountHolder: 'IMAM HANAFI'
    },
    {
      bankName: 'Bank BRI',
      accountNumber: '646701017777539',
      accountHolder: 'IMAM HANAFI'
    },
    {
      bankName: 'Sea Bank',
      accountNumber: '901162515189',
      accountHolder: 'IMAM HANAFI'
    },
    {
      bankName: 'DANA',
      accountNumber: '085231176597',
      accountHolder: 'IMAM HANAFI'
    },
    {
      bankName: 'OVO',
      accountNumber: '085231176597',
      accountHolder: 'IMAM HANAFI'
    }
  ],
  allAccessPriceRp: 35000,
  paymentInstructions: '1. Pilih salah satu rekening Bank (BCA, BRI, SeaBank) atau E-Wallet (DANA, OVO).\n2. Transfer nominal sesuai total tagihan.\n3. Kirim konfirmasi bukti pembayaran via WhatsApp Admin (085231176597) atau unggah di web ini.\n4. Admin akan memverifikasi di WhatsApp dan membuka kunci akses modul di sistem web secara langsung.',
  updatedAt: Date.now()
};

export const defaultCustomPrices: CustomPricesConfig = {
  itemPrices: {
    'art-1': 20000,
    'art-2': 20000,
    'art-3': 20000,
    'art-4': 20000,
    'art-5': 20000,
    'split-1': 10000,
    'split-2': 10000,
    'split-3': 10000,
    'num-1': 5000,
    'num-2': 5000,
    'num-3': 5000,
    'mak-1': 20000,
    'mak-2': 20000,
    'mak-3': 20000,
    'plag-1': 20000,
    'plag-2': 20000,
    'prop-1': 20000,
    'ref-1': 2000,
    'foto-1': 5000,
    'label-103': 5000,
    'gabung-1': 5000,
    'cover-1': 0,
  },
  categoryPrices: {
    1: 35000,
    2: 18000,
    3: 5000,
    4: 20000,
    5: 20000,
    6: 20000,
    7: 2000,
    8: 5000,
    9: 5000,
    10: 5000,
    11: 0,
    12: 0,
  },
  allAccessPriceRp: 50000,
  resellerDiscountPercentage: 50,
  updatedAt: Date.now()
};

/**
 * Merges base categories with dynamic custom prices
 */
export function applyCustomPricesToCategories(baseCategories: ToolCategory[], customPrices: CustomPricesConfig): ToolCategory[] {
  return baseCategories.map((category) => {
    const pkgPrice = customPrices.categoryPrices[category.id] !== undefined
      ? customPrices.categoryPrices[category.id]
      : category.packagePriceRp;

    const updatedTools = category.tools.map((tool) => {
      const toolPrice = customPrices.itemPrices[tool.id] !== undefined
        ? customPrices.itemPrices[tool.id]
        : tool.priceRp;
      return {
        ...tool,
        priceRp: toolPrice
      };
    });

    return {
      ...category,
      packagePriceRp: pkgPrice,
      tools: updatedTools
    };
  });
}

export const defaultRolesConfig: RolesConfig = {
  adminEmails: [
    'fastprint2026@gmail.com',
    'hanafisumenep@gmail.com',
    'karyazainnet@gmail.com',
    'admin@zain.net',
    'admin@karyazainnet.net',
    'karyazainnet'
  ],
  resellerEmails: [
    'teknologiindo123@gmail.com',
    'reseller@zain.net',
    'partner@zain.net'
  ],
  resellerDiscountPercentage: 50,
  adminPinCode: 'Doraemon12',
  updatedAt: Date.now()
};

/**
 * Resolves the user's role from their email address and roles configuration
 */
export function resolveUserRole(email: string | null | undefined, config: RolesConfig): UserRole {
  if (!email) return 'public';
  const normalized = email.trim().toLowerCase();
  
  const isAdmin = (config.adminEmails || []).some(e => {
    const clean = e.trim().toLowerCase();
    return clean === normalized || (clean.includes('@') && normalized === clean.split('@')[0]);
  });
  if (isAdmin || normalized === 'admin' || normalized === 'karyazainnet') return 'admin';

  const isReseller = (config.resellerEmails || []).some(e => e.trim().toLowerCase() === normalized);
  if (isReseller) return 'reseller';

  return 'public';
}

/**
 * Calculates effective price based on base price and user role
 */
export function calculateEffectivePrice(basePriceRp: number, role?: UserRole | string, discountPercentage = 50): number {
  if (role === 'admin') {
    return 0; // All free for Admin
  }
  if (role === 'reseller') {
    const factor = (100 - Math.min(100, Math.max(0, discountPercentage))) / 100;
    return Math.round(basePriceRp * factor);
  }
  return basePriceRp; // Normal regular price for Public
}

/**
 * Menentukan apakah modul menggunakan embed link iframe (aplikasi web eksternal).
 * Sesuai aturan: semua link iframe hanya dapat dipakai oleh Admin,
 * sedangkan untuk pengguna umum dan reseller semua link iframe terkunci.
 *
 * Modul internal native (tanpa iframe):
 * - art-6 (/artikel-gemini)
 * - art-7 (internal://journal-converter)
 * - num-2 (internal://skripsi-paginator)
 * - num-3 (internal://skripsi-paginator-fixed)
 * - foto-1 (internal://docx-photo-grid)
 * - label-103 (internal://label-103)
 * - gabung-1 (internal://gabung-file)
 */
export function isIframeTool(tool: { id?: string; url?: string } | null | undefined): boolean {
  if (!tool) return false;
  const id = tool.id || '';
  const url = tool.url || '';

  if (id === 'art-6' || url === '/artikel-gemini' || url === 'internal://artikel-gemini') return false;
  if (id === 'art-7' || url === 'internal://journal-converter' || url === '/journal-converter') return false;
  if (id === 'num-2' || id === 'num-3' || url === 'internal://skripsi-paginator' || url === 'internal://skripsi-paginator-fixed') return false;
  if (id === 'foto-1' || url === 'internal://docx-photo-grid') return false;
  if (id === 'label-103' || url === 'internal://label-103') return false;
  if (id === 'gabung-1' || url === 'internal://gabung-file') return false;
  if (id === 'split-3' || url === 'internal://pisah-skripsi' || url === '/pisah-skripsi') return false;
  // Modul internal Menu 5 Link 2: dapat diakses pengguna umum/reseller dengan login dan kuota sah.
  // Link 1 tetap iframe eksternal dan tetap khusus admin.
  if (id === 'plag-2' || url === 'internal://plagiarism-v2') return false;

  return true;
}

export const categoriesData: ToolCategory[] = [
  {
    id: 1,
    number: 1,
    title: "Pembuatan Artikel Skripsi & Artikel Ilmiah",
    subtitle: "7 link generator naskah, skripsi & jurnal publikasi (Dihitung per tiap link)",
    description: "Sistem otomasi cerdas penyusunan artikel skripsi & naskah karya ilmiah. Pembayaran dan kuota dihitung mandiri per tiap link yang dipilih (Rp 20.000 / link).",
    iconName: "FileText",
    packagePriceRp: 45000,
    tools: [
      {
        id: "art-1",
        categoryId: 1,
        number: 1,
        title: "Generator Artikel (Link 1)",
        domain: "artikel-1.zain.net",
        url: "https://remix-remix-buat-artikel-3-2107.ai.studio/",
        description: "Link 1: Modul generator struktur naskah artikel ilmiah otomatis standar akreditasi SINTA.",
        badge: "Link 1 • Cerdas",
        priceRp: 20000,
      },
      {
        id: "art-2",
        categoryId: 1,
        number: 2,
        title: "Generator Artikel (Link 2)",
        domain: "remix-artikel-2.zain.net",
        url: "https://remix-buat-artikel-2-785567200620.asia-southeast1.run.app/",
        description: "Link 2: Modul generator naskah artikel remix cerdas dengan pemrosesan cepat dan terstruktur.",
        badge: "Link 2 • Remix Pro",
        priceRp: 20000,
      },
      {
        id: "art-3",
        categoryId: 1,
        number: 3,
        title: "Generator Artikel (Link 3)",
        domain: "artikel-3.zain.net",
        url: "https://buat-artikel-1.ai.studio/",
        description: "Link 3: Penyusun artikel akademik, metodologi penelitian, dan tinjauan literatur komprehensif.",
        badge: "Link 3 • Akademik Pro",
        priceRp: 20000,
      },
      {
        id: "art-4",
        categoryId: 1,
        number: 4,
        title: "Generator Artikel (Link 4)",
        domain: "artikel-4.zain.net",
        url: "https://buat-artikel-2.ai.studio/",
        description: "Link 4: Modul generator struktur naskah artikel ilmiah otomatis standar akreditasi SINTA.",
        badge: "Link 4 • Cerdas",
        priceRp: 20000,
      },
      {
        id: "art-5",
        categoryId: 1,
        number: 5,
        title: "Generator Artikel (Link 5)",
        domain: "hanslakomesem-commits.github.io",
        url: "https://hanslakomesem-commits.github.io/artikel-V4.1/",
        description: "Link 5: ZAIN.NET Penyusunan Artikel Akademik — konversi skripsi DOCX ke artikel dengan abstrak dua bahasa, catatan kaki dan daftar pustaka tersinkronisasi.",
        badge: "Link 5 • Penyusunan Akademik",
        priceRp: 20000,
      },
      {
        id: "art-6",
        categoryId: 1,
        number: 6,
        title: "Generator Artikel (Link 6)",
        domain: "artikel-gemini.zain.net",
        url: "/artikel-gemini",
        description: "Link 6: ZAIN.NET Skripsi Jadi Artikel — konversi skripsi DOCX menjadi artikel ilmiah terstruktur, dengan perapian naskah dan abstrak dua bahasa.",
        badge: "Link 6 • Perapian Naskah",
        priceRp: 20000,
      },
      {
        id: "art-7",
        categoryId: 1,
        number: 7,
        title: "Generator Artikel (Link 7)",
        domain: "artikel-jurnal.zain.net",
        url: "internal://journal-converter",
        description: "Link 7: Generator Artikel Jurnal Ilmiah + Cover CD — susun artikel dari skripsi DOCX sesuai template jurnal, dengan catatan kaki dan cover CD siap cetak.",
        badge: "Link 7 • Artikel Jurnal & Cover CD",
        priceRp: 20000,
      }
    ]
  },
  {
    id: 2,
    number: 2,
    title: "Pemisah Berkas PDF & Bab Skripsi",
    subtitle: "3 link pemotong & ekstraktor bab skripsi (Dihitung per tiap link)",
    description: "Tersedia 3 link generator mandiri untuk memotong dan mengekstrak bab skripsi. Pembayaran dan kuota dihitung per masing-masing link (Rp 10.000 / 1x proses per link), bukan per nomor 2 secara gabungan.",
    iconName: "Scissors",
    packagePriceRp: 25000,
    tools: [
      {
        id: "split-1",
        categoryId: 2,
        number: 1,
        title: "Pemisah PDF Skripsi (Link 1)",
        domain: "pemisah-1.zain.net",
        url: "https://pemisah-pdf-skripsi-generator-artikel-ilmiah-1.ai.studio/",
        description: "Link 1: Pemisah halaman PDF bab skripsi & konverter naskah bab 1 hingga penutup.",
        badge: "Link 1 • Pemisah Bab",
        priceRp: 10000,
      },
      {
        id: "split-2",
        categoryId: 2,
        number: 2,
        title: "Pemisah PDF Skripsi (Link 2)",
        domain: "pemisah-2.zain.net",
        url: "https://pemisah-pdf-skripsi-generator-artikel-ilmiah-2.ai.studio/",
        description: "Link 2: Pemisah berkas PDF skripsi berkecepatan tinggi dengan optimasi berkas besar.",
        badge: "Link 2 • Ekstraktor Cepat",
        priceRp: 10000,
      },
      {
        id: "split-3",
        categoryId: 2,
        number: 3,
        title: "Pemisah File Skripsi (Link 3)",
        domain: "pisah-skripsi.zain.net",
        url: "internal://pisah-skripsi",
        description: "Link 3: ZAIN.NET Pemisah File Skripsi Otomatis (15 Bagian Resmi) — deteksi cerdas Cover, Pengesahan, Abstrak, Bab 1-5, Daftar Pustaka, OCR teks, pratinjau thumbnail & ekspor ZIP per bab.",
        badge: "Link 3 • 15 Bagian Resmi & Batch",
        priceRp: 10000,
      }
    ]
  },
  {
    id: 3,
    number: 3,
    title: "Edit Penomoran Halaman & Daftar Isi Otomatis",
    subtitle: "3 link sistem penomoran & daftar isi otomatis (Versi Indonesia & Versi Arabic)",
    description: "Format otomatis nomor halaman Times New Roman 12pt & Daftar Isi Otomatis tab 13.5 cm dalam 2 Versi: Versi Indonesia (Makalah, Proposal, Skripsi, Tesis) dan Versi Arabic (Makalah, Proposal, Skripsi, Tesis pakai huruf abjad Arab & angka Hindi) tanpa menyentuh font isi naskah.",
    iconName: "Hash",
    packagePriceRp: 5000,
    tools: [
      {
        id: "num-1",
        categoryId: 3,
        number: 1,
        title: "Sistem Penomoran Skripsi Baku (Link 1)",
        domain: "penomoran.zain.net",
        url: "https://sistem-penomoran-skripsi-baku-editor-pdf-akademik.ai.studio/",
        description: "Link 1: Editor PDF akademik & sistem penataan nomor halaman baku naskah skripsi.",
        badge: "Link 1 • Standar Baku",
        priceRp: 5000,
      },
      {
        id: "num-2",
        categoryId: 3,
        number: 2,
        title: "Auto Koreksi Penomoran Skripsi Word (Link 2)",
        domain: "penomoran-word.zain.net",
        url: "internal://skripsi-paginator",
        description: "Link 2: Aplikasi koreksi otomatis penomoran halaman Word (.docx) skripsi baku (Cover tanpa nomor, romawi ii di halaman awal, angka 1 dari BAB I, awal BAB tengah bawah, halaman isi kanan atas).",
        badge: "Link 2 • Auto Koreksi .DOCX",
        priceRp: 5000,
      },
      {
        id: "num-3",
        categoryId: 3,
        number: 3,
        title: "Auto Koreksi Penomoran + Daftar Isi (Versi Indo & Arabic) (Link 3)",
        domain: "penomoran-word-pro.zain.net",
        url: "internal://skripsi-paginator-fixed",
        description: "Link 3: Penomoran Halaman Times New Roman 12pt & Daftar Isi Otomatis tab 13.5 cm dalam 2 Versi (Versi Indonesia & Versi Arabic: Makalah, Proposal, Skripsi, Tesis) dengan jaminan 100% tidak menyentuh font isi skripsi.",
        badge: "Link 3 • 2 Versi (Indo & Arabic)",
        priceRp: 5000,
      }
    ]
  },
  {
    id: 4,
    number: 4,
    title: "Penyusunan Makalah",
    subtitle: "3 link modul penyusun makalah & laporan ilmiah mahasiswa (Dihitung per tiap link)",
    description: "Tersedia 3 link modul penyusun otomatis struktur makalah perkuliahan lengkap: cover, latar belakang, rumusan masalah, pembahasan, dan daftar pustaka. Pembayaran dan kuota dihitung per tiap link yang dipilih (Rp 20.000 / link).",
    iconName: "BookOpen",
    packagePriceRp: 45000,
    tools: [
      {
        id: "mak-1",
        categoryId: 4,
        number: 1,
        title: "Penyusun Makalah UIN Madura (Link 1)",
        domain: "makalah-1.zain.net",
        url: "https://remix-penyuffffsun-makalah-uin-madurajj-2359.ai.studio/",
        description: "Link 1: Modul penyusun makalah otomatis terintegrasi format karya ilmiah akademik UIN Madura.",
        badge: "Link 1 • UIN Madura",
        priceRp: 20000,
      },
      {
        id: "mak-2",
        categoryId: 4,
        number: 2,
        title: "Penyusun Makalah UIN Madura (Link 2)",
        domain: "makalah-2.zain.net",
        url: "https://penyusun-makalah-uin-madura.ai.studio/",
        description: "Link 2: Modul penyusun makalah otomatis terintegrasi format karya ilmiah akademik UIN Madura.",
        badge: "Link 2 • UIN Madura",
        priceRp: 20000,
      },
      {
        id: "mak-3",
        categoryId: 4,
        number: 3,
        title: "Penyusun Makalah Akademik (Link 3)",
        domain: "makalah-3.zain.net",
        url: "https://penyusun-makalah-akademik.ai.studio/",
        description: "Link 3: Template dan penyusun makalah otomatis sesuai pedoman penulisan karya ilmiah universitas umum.",
        badge: "Link 3 • Format Kampus",
        priceRp: 20000,
      }
    ]
  },
  {
    id: 5,
    number: 5,
    title: "Penurunan Plagiasi",
    subtitle: "Modul parafrase skripsi & revisi dokumen anti-plagiasi",
    description: "Sistem cerdas parafrase naskah karya ilmiah, perombakan kalimat terstruktur, dan penurunan skor similaritas Turnitin secara komprehensif pada dokumen DOCX.",
    iconName: "ShieldCheck",
    packagePriceRp: 20000,
    tools: [
      {
        id: "plag-1",
        categoryId: 5,
        number: 1,
        title: "Penurunan Plagiasi & Parafrase Skripsi",
        domain: "plagiasi.zain.net",
        url: "https://aplikasi-parafrase-skripsi-revisi-plagiasi-docx-921936667702.asia-southeast1.run.app/",
        description: "Aplikasi otomatis parafrase naskah skripsi & revisi dokumen DOCX untuk menurunkan indeks similaritas plagiasi.",
        badge: "Anti-Plagiasi",
        priceRp: 20000,
      },
      {
        id: "plag-2",
        categoryId: 5,
        number: 2,
        title: "Revisi Similarity & Parafrase DOCX (Link 2)",
        domain: "internal.zainnet.store",
        url: "internal://plagiarism-v2",
        description: "Analisis laporan similarity, revisi akademik EYD/KBBI, pemeriksaan sitasi dan catatan kaki, ekspor Word (.docx) siap ditinjau.",
        badge: "Link 2 • Revisi Akademik DOCX",
        priceRp: 20000,
      }
    ]
  },
  {
    id: 6,
    number: 6,
    title: "Penyusunan Proposal",
    subtitle: "Modul generator penyusun proposal skripsi & penelitian ilmiah",
    description: "Sistem cerdas otomasi penyusunan proposal skripsi dan penelitian akademik terstruktur: judul, latar belakang masalah, rumusan masalah, tujuan penelitian, tinjauan pustaka, landasan teori, hingga metodologi penelitian komprehensif.",
    iconName: "FileCheck",
    packagePriceRp: 20000,
    tools: [
      {
        id: "prop-1",
        categoryId: 6,
        number: 1,
        title: "Penyusun Proposal Skripsi & Penelitian",
        domain: "proposal.zain.net",
        url: "https://penyusun-proposal.ai.studio/",
        description: "Generator naskah draf proposal penelitian & skripsi otomatis sesuai kaidah penulisan karya ilmiah akademik universitas.",
        badge: "Proposal Skripsi",
        priceRp: 20000,
      }
    ]
  },
  {
    id: 7,
    number: 7,
    title: "Referensi Akademik",
    subtitle: "Modul pencarian referensi, jurnal ilmiah & sitasi otomatis",
    description: "Sistem cerdas penelusuran referensi ilmiah, literatur jurnal terakreditasi, sitasi naskah, dan penyusunan daftar pustaka akademik terstruktur.",
    iconName: "BookOpen",
    packagePriceRp: 2000,
    tools: [
      {
        id: "ref-1",
        categoryId: 7,
        number: 1,
        title: "Pencarian & Penyusun Referensi Akademik",
        domain: "referensi.zain.net",
        url: "https://remix-zain-net-referensi-akademik-5442.ai.studio/",
        description: "Modul penelusuran referensi akademik, metadata jurnal ilmiah, serta penyusunan sitasi dan daftar pustaka otomatis.",
        badge: "Referensi Akademik",
        priceRp: 2000,
      }
    ]
  },
  {
    id: 8,
    number: 8,
    title: "Edit Foto & Ukuran KTP",
    subtitle: "Generator kisi pas foto, Ukuran KTP, Auto Convert/Export PDF, Orientasi Kertas & Susun Hemat Kertas",
    description: "Modul edit ukuran pas foto standar (2x3, 3x4, 4x6), Ukuran KTP & STNK, rotasi manual/otomatis, auto convert PDF (KTP/STNK) ke JPG, pilihan orientasi kertas (Potret / Lanskap), revisi khusus 3x4 muat 6 foto/baris & 4x6 muat 5 foto/baris, serta pengaturan 1 foto multi-ukuran (3x4, 4x6, 2x3) disusun otomatis ke samping agar hemat kertas, siap diekspor ke Word (.docx) atau PDF siap cetak (.pdf).",
    iconName: "Image",
    packagePriceRp: 5000,
    tools: [
      {
        id: "foto-1",
        categoryId: 8,
        number: 1,
        title: "Edit Foto, Ukuran KTP & Generator Kisi Foto Word (.docx) & PDF",
        domain: "edit-foto.zain.net",
        url: "internal://docx-photo-grid",
        description: "Edit ukuran pas foto (2x3, 3x4, 4x6), Ukuran KTP (8.56x5.4 cm mendatar/tegak & Pas Foto KTP), rotasi manual 90°, auto-convert PDF ke JPG, pilihan orientasi Potret/Lanskap, revisi 3x4 muat 6 foto/baris & 4x6 muat 5 foto/baris, pengaturan 1 foto multi-ukuran hemat kertas ke samping, serta ekspor langsung ke Word (.docx) dan PDF siap cetak (.pdf).",
        badge: "Edit Foto • Word & PDF",
        priceRp: 5000,
      }
    ]
  },
  {
    id: 9,
    number: 9,
    title: "Pemformat Label Undangan 103",
    subtitle: "Asisten pemformat stiker label undangan ukuran 103 (Kertas 20 × 14 cm, Kolom 6,4 × 3,3 cm) Word & Cetak",
    description: "Asisten pemformat stiker label undangan ukuran 103 menggunakan ukuran kertas undangan 20 × 14 cm (bukan ukuran Letter) dengan ukuran kolom 6,4 cm x 3,3 cm (presisi 12 kolom per kertas, 3 kesamping dan 4 ke bawah), dilengkapi pemindai foto buku tamu tulisan pulpen (AI OCR), penyaring teks Word/WhatsApp, ekspor Word (.doc), Markdown (.md), dan pratinjau cetak fisik langsung.",
    iconName: "Tag",
    packagePriceRp: 5000,
    tools: [
      {
        id: "label-103",
        categoryId: 9,
        number: 1,
        title: "Asisten Pemformat Label Undangan 103 (Kertas 20 × 14 cm)",
        domain: "label103.zain.net",
        url: "internal://label-103",
        description: "Konversi daftar nama tamu & scan foto tulisan tangan buku tamu menjadi label undangan standar 103 dengan ukuran kertas undangan 20 × 14 cm (bukan Letter) dan kolom 6,4 cm × 3,3 cm (presisi 12 kolom: 3 kesamping × 4 kebawah), lengkap dengan salin tabel Word, unduh .DOC, .MD, dan cetak langsung.",
        badge: "Label 103 • Kertas 20×14 cm",
        priceRp: 5000,
      }
    ]
  },
  {
    id: 10,
    number: 10,
    title: "Gabung File",
    subtitle: "Otomatis tempel & gabungkan lampiran foto (JPG/PNG) dan berkas PDF ke file Word (.docx)",
    description: "Modul otomasi penempelan dan penggabungan berkas lampiran skripsi (Lembar Pengesahan, Persetujuan, Keaslian Tulisan, Surat Tugas, Bebas Plagiasi, Surat Izin Penelitian, Surat Telah Meneliti, Kartu Bimbingan, dsb.) baik berupa file foto (JPG/PNG) maupun berkas PDF (otomatis dikonversi ke JPG 300 DPI) secara presisi ke dalam struktur file Microsoft Word (.docx) dengan deteksi OCR pintar dan auto-rotasi gambar.",
    iconName: "Layers",
    packagePriceRp: 5000,
    tools: [
      {
        id: "gabung-1",
        categoryId: 10,
        number: 1,
        title: "Gabung File Skripsi & Lampiran Scan / PDF ke Word (.docx)",
        domain: "gabung-file.zain.net",
        url: "internal://gabung-file",
        description: "Otomatis gabungkan lembar scan pengesahan, persetujuan, surat tugas, surat penelitian, kartu bimbingan format JPG atau PDF (auto-convert ke JPG) ke berkas .docx skripsi.",
        badge: "Gabung File • JPG & PDF ke .DOCX",
        priceRp: 5000,
      }
    ]
  },
  {
    id: 11,
    number: 11,
    title: "Pembuatan Nota Jilid & Sewa Toga Wisuda",
    subtitle: "Sistem kasir nota jilid otomatis & reservasi sewa toga wisuda (Akses /notajilid & /sewatoga)",
    description: "Sistem kasir pintar nota jilid skripsi otomatis dan sistem informasi penyewaan toga wisuda ZAIN.NET lengkap dengan formulir pemesanan, kuitansi, dan integrasi online.",
    iconName: "Receipt",
    packagePriceRp: 0,
    tools: [
      {
        id: "nota-1",
        categoryId: 11,
        number: 1,
        title: "Pembuat Nota Jilid & Hardcover",
        domain: "zainnet-nota-v8.pages.dev",
        url: "/notajilid",
        description: "Aplikasi kasir & cetak nota jilid skripsi dan hardcover online dengan kalkulator harga otomatis.",
        badge: "Nota Jilid Otomatis",
        priceRp: 0,
      },
      {
        id: "toga-1",
        categoryId: 11,
        number: 2,
        title: "Penyewaan Toga Wisuda Online",
        domain: "03c702f0.sewatoga.pages.dev",
        url: "/sewatoga",
        description: "Sistem booking dan reservasi sewa toga wisuda ZAIN.NET, cek stok ukuran toga, biaya sewa & jaminan, serta unduh invoice langsung.",
        badge: "Sewa Toga Wisuda",
        priceRp: 0,
      }
    ]
  },
  {
    id: 12,
    number: 12,
    title: "Edit Hard Cover",
    subtitle: "Generator Hard Cover Skripsi Presisi 10–28 mm (GitHub Pages V4.10)",
    description: "Sistem otomasi pembuatan & pengeditan Hard Cover Skripsi presisi milimeter (10–28 mm): Upload otomatis foto OCR lokal, ekstraksi halaman 1 PDF & Word DOCX, pilihan Master Polos (480×330 mm) & Warna/Maroon (475×320 mm), serta ekspor Batch PDF/ZIP siap cetak.",
    iconName: "BookOpen",
    packagePriceRp: 0,
    tools: [
      {
        id: "cover-1",
        categoryId: 12,
        number: 1,
        title: "Edit Hard Cover Skripsi",
        domain: "hanslakomesem-commits.github.io",
        url: "https://hanslakomesem-commits.github.io/Edit-Hard-Cover/",
        description: "Generator hard cover skripsi presisi 10–28 mm dengan pembacaan otomatis foto, PDF halaman 1, Word DOCX cover, master polos & warna, serta ekspor PDF batch siap cetak.",
        badge: "Menu 12 • Hard Cover Studio",
        priceRp: 0,
      }
    ]
  }
];
