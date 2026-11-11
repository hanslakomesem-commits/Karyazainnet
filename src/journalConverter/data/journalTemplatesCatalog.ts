// Generated from the user-supplied Template-Artikel master ZIP (15 journals).
// The master DOCX and rules are copied, never fabricated from scratch.
export interface JournalMasterChoice {
  id: string;
  name: string;
  docx: string;
  bodyFont: string;
  bodySize?: number | string | null;
  line?: number | string | null;
  titleMax?: number | null;
  abstractWords?: number[] | null;
  abstractLanguage?: string;
  note: string;
  hasMaster: boolean;
}
export const JOURNAL_MASTER_CATALOG: JournalMasterChoice[] = [
  {
    "id": "karsa",
    "name": "KARSA",
    "docx": "templates/karsa/template.docx",
    "bodyFont": "Times New Roman",
    "bodySize": 12,
    "line": 1.0,
    "titleMax": 25,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "Logo/identitas KARSA dipertahankan dari DOCX asli; judul pendek dan nama penulis diterapkan pada header ganjil/genap.",
    "hasMaster": true
  },
  {
    "id": "sociale",
    "name": "SOCIALE",
    "docx": "templates/sociale/original.docx",
    "bodyFont": "Arial",
    "bodySize": 10,
    "line": 1,
    "titleMax": 20,
    "abstractWords": [
      150,
      200
    ],
    "abstractLanguage": "bilingual",
    "note": "SOCIALE: abstrak dua bahasa dalam sel tabel, artikel asli menyebut maksimal 12 halaman (riset), 16 halaman (review).",
    "hasMaster": true
  },
  {
    "id": "perdikan",
    "name": "PERDIKAN",
    "docx": "templates/perdikan/original.docx",
    "bodyFont": "Arial",
    "bodySize": 11,
    "line": 1,
    "titleMax": 20,
    "abstractWords": [
      250,
      300
    ],
    "abstractLanguage": "bilingual",
    "note": "PERDIKAN: abstrak bahasa Inggris dan Indonesia berada pada kolom kanan tabel dua bahasa.",
    "hasMaster": true
  },
  {
    "id": "panyonara",
    "name": "PANYONARA",
    "docx": "templates/panyonara/original.docx",
    "bodyFont": "Cambria",
    "bodySize": 11,
    "line": 1.29,
    "titleMax": 20,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "PANYONARA: spasi persis 17 pt untuk isi, abstrak miring dengan indent 2 cm, maksimal 4 kata kunci.",
    "hasMaster": true
  },
  {
    "id": "mabny",
    "name": "MABNY",
    "docx": "templates/mabny/original.docx",
    "bodyFont": "Garamond",
    "bodySize": 12,
    "line": 1,
    "titleMax": 15,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "MABNY: template mengharuskan abstrak terstruktur (Purpose, Methodology, Findings, Implications, Originality). Jika artikel tidak terstruktur, penulis harus melengkapinya sendiri.",
    "hasMaster": true
  },
  {
    "id": "meyarsa",
    "name": "MEYARSA",
    "docx": "templates/meyarsa/original.docx",
    "bodyFont": "Georgia",
    "bodySize": 11,
    "line": 1,
    "titleMax": 20,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "MEYARSA: abstrak dua bahasa, kata kunci dipisahkan titik koma.",
    "hasMaster": true
  },
  {
    "id": "kiddo",
    "name": "KIDDO",
    "docx": "templates/kiddo/original.docx",
    "bodyFont": "Verdana",
    "bodySize": 11,
    "line": 1,
    "titleMax": 20,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "KIDDO: judul, penulis dan abstrak masuk ke tabel asli dua kolom.",
    "hasMaster": true
  },
  {
    "id": "elnubuwwah",
    "name": "El Nubuwwah",
    "docx": "templates/elnubuwwah/original.docx",
    "bodyFont": "Book Antiqua",
    "bodySize": 11,
    "line": 1,
    "titleMax": 20,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "El Nubuwwah: judul/abstrak dua bahasa, jangan menyalin tanggal penerimaan contoh.",
    "hasMaster": true
  },
  {
    "id": "ghancaran",
    "name": "GHANCARAN",
    "docx": "templates/ghancaran/original.docx",
    "bodyFont": "Cambria",
    "bodySize": 12,
    "line": 1.5,
    "titleMax": 12,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "GHANCARAN: sampel memiliki judul contoh di awal badan dan beberapa section; judul utama dipasang pada area artikel, judul sampel dihapus.",
    "hasMaster": true
  },
  {
    "id": "alhuquq",
    "name": "Al-Huquq",
    "docx": "templates/alhuquq/original.docx",
    "bodyFont": "Book Antiqua",
    "bodySize": 11,
    "line": 1,
    "titleMax": 20,
    "abstractWords": [
      200,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "Al-Huquq: abstrak dalam satu kolom, penulisan footnote dari sumber dipertahankan.",
    "hasMaster": true
  },
  {
    "id": "shafin",
    "name": "SHAFIN",
    "docx": "templates/shafin/original.docx",
    "bodyFont": "Garamond",
    "bodySize": 12,
    "line": 1,
    "titleMax": 15,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "SHAFIN: logo/kepala jurnal dan tabel ARTICLE INFO–ABSTRACT asli tetap dipertahankan.",
    "hasMaster": true
  },
  {
    "id": "nuansa",
    "name": "NUANSA",
    "docx": "templates/nuansa/original.docx",
    "bodyFont": "Garamond",
    "bodySize": 12,
    "line": 1.2,
    "titleMax": 15,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "NUANSA: judul Courier New 17 pt berasal dari template dan halaman sampul/halaman abstrak ditahan dari DOCX asli.",
    "hasMaster": true
  },
  {
    "id": "enasa",
    "name": "E-NASA",
    "docx": "templates/enasa/original.docx",
    "bodyFont": "Garamond",
    "bodySize": 12,
    "line": 1.15,
    "titleMax": 20,
    "abstractWords": [
      150,
      200
    ],
    "abstractLanguage": "bilingual",
    "note": "E-NASA: abstrak dua bahasa pada tabel; Garamond 12, spasi 1,15; layout 1 kolom.",
    "hasMaster": true
  },
  {
    "id": "iqtishadia",
    "name": "IQTISHADIA",
    "docx": "templates/iqtishadia/original.docx",
    "bodyFont": "Cambria",
    "bodySize": 11,
    "line": 1,
    "titleMax": 15,
    "abstractWords": [
      150,
      250
    ],
    "abstractLanguage": "bilingual",
    "note": "IQTISHADIA: templat asli menuliskan Cambria 11 pada isi, Garamond 13 pada judul.",
    "hasMaster": true
  },
  {
    "id": "rabbani",
    "name": "RABBANI: Jurnal Pendidikan Agama Islam",
    "docx": "templates/rabbani/word2010_base.docx",
    "bodyFont": "Book Antiqua",
    "bodySize": 12,
    "line": 1.5,
    "titleMax": 25,
    "abstractWords": [
      150,
      200
    ],
    "abstractLanguage": "id-only",
    "note": "KHUSUS RABBANI: hanya ABSTRAK Indonesia. Menggunakan master Word 2010 yang sudah disimpan ulang melalui LibreOffice dan dibersihkan dari artikel contoh. Kotak biru mengalir sebagai tabel Word, logo dan header asli tetap tersedia.",
    "hasMaster": true
  }
];

export function findJournalMaster(id?: string | null) {
  return JOURNAL_MASTER_CATALOG.find(item => item.id === id);
}

/** Trusted journal instructions. Never concatenate user-submitted arbitrary prompts. */
export function journalTemplateInstruction(id?: string | null): string {
  const t = findJournalMaster(id);
  if (!t) return '';
  const n = Array.isArray(t.abstractWords) && t.abstractWords.length === 2
    ? `Panjang abstrak jurnal: ${t.abstractWords[0]}–${t.abstractWords[1]} kata.` : '';
  const language = t.abstractLanguage === 'id-only'
    ? 'Abstrak dan kata kunci Bahasa Indonesia saja (tanpa Inggris).'
    : 'Abstrak mengikuti bahasa pada pedoman jurnal.';
  const maxTitle = t.titleMax ? `Batas judul jurnal: ${t.titleMax} kata.` : '';
  return `JURNAL TARGET: ${t.name}. ${maxTitle} ${n} ${language} ` +
    'Pertahankan data penelitian, jenis metode, hasil, angka, kutipan dan referensi yang benar-benar ada di skripsi. ' +
    'Jangan membuat DOI, volume, nomor, tahun publikasi, narasumber atau rujukan yang tidak ada. ' +
    'Jika aturan jurnal bertentangan dengan target umum 18 halaman, utamakan aturan jurnal; ' +
    'format Word akhir diterapkan oleh master jurnal DOCX yang resmi.';
}
