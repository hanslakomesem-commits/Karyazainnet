/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, Packer } from 'docx';
import { ParsedDocument } from '../types/document';

export interface SampleArticle {
  id: string;
  title: string;
  shortDesc: string;
  field: string;
  authors: string[];
  affiliations: string[];
  email: string;
  abstract: string;
  keywords: string[];
  sections: {
    heading: string;
    level: number;
    paragraphs: string[];
    table?: {
      caption: string;
      headers: string[];
      rows: string[][];
    };
    figure?: {
      caption: string;
    };
  }[];
  references: string[];
}

export const SAMPLE_ARTICLES: SampleArticle[] = [
  {
    id: 'sample-ai-iot',
    title: 'Implementasi Algoritma Random Forest dan Internet of Things untuk Klasifikasi Kualitas Air Tambak Udang Vaname',
    shortDesc: 'Artikel penelitian teknologi informasi & agroteknologi dengan tabel perbandingan akurasi dan 8 referensi ilmiah.',
    field: 'Teknologi Informasi / IoT',
    authors: ['Budi Santoso', 'Rina Wijayanti', 'Ahmad Fauzi'],
    affiliations: [
      'Jurusan Teknik Informatika, Fakultas Ilmu Komputer, Universitas Indonesia',
      'Pusat Riset Kecerdasan Buatan dan Robotika, BRIN Jakarta',
    ],
    email: 'budi.santoso@ui.ac.id, rina.wijayanti@brin.go.id, ahmad.fauzi@ui.ac.id',
    abstract:
      'Kualitas air merupakan faktor penentu utama keberhasilan budidaya udang vaname (Litopenaeus vannamei). Fluktuasi parameter fisikokimia air seperti pH, suhu, salinitas, dan dissolved oxygen (DO) dapat memicu mortalitas massal. Penelitian ini mengusulkan sistem pemantauan real-time berbasis Internet of Things (IoT) yang terintegrasi dengan algoritma machine learning Random Forest untuk mengklasifikasikan status kelayakan air tambak ke dalam tiga kategori: Layak, Waspada, dan Bahaya. Pengambilan data dilakukan selama 45 hari pada tambak intensif di Kabupaten Serang dengan total 12.500 sampel data sensor. Hasil pengujian menunjukkan model Random Forest dengan 100 decision trees mencapai akurasi 96,8%, presisi 95,4%, dan recall 96,1%, mengungguli Support Vector Machine (SVM) yang hanya meraih akurasi 91,2%. Implementasi sistem ini mampu memberikan notifikasi dini 30 menit sebelum terjadi penurunan drastis kadar oksigen terlarut.',
    keywords: ['Kualitas Air', 'Udang Vaname', 'Internet of Things (IoT)', 'Random Forest', 'Machine Learning', 'Sensor Nirkabel'],
    sections: [
      {
        heading: '1. PENDAHULUAN',
        level: 1,
        paragraphs: [
          'Sektor perikanan budidaya, khususnya budidaya udang vaname (Litopenaeus vannamei), memberikan kontribusi devisa yang signifikan bagi perekonomian nasional Indonesia [1]. Namun, tantangan utama petambak adalah sensitivitas udang terhadap perubahan kualitas lingkungan air perairan tambak yang dinamis [2]. Parameter krusial seperti derajat keasaman (pH), suhu air, salinitas, serta konsentrasi oksigen terlarut (Dissolved Oxygen / DO) sering kali mengalami degradasi mendadak akibat blooming alga atau penumpukan sisa pakan.',
          'Metode pemantauan konvensional yang mengandalkan pengukuran manual menggunakan test kit portabel dinilai kurang efektif karena memiliki jeda waktu sampling yang panjang dan rentan terhadap kesalahan manusia [3]. Oleh karena itu, adopsi teknologi sensor nirkabel berbasis Internet of Things (IoT) yang dipadukan dengan teknik kecerdasan buatan menjadi pendekatan solutif untuk mengotomatisasi pemantauan dan memprediksi risiko kegagalan panen secara akurat.',
        ],
      },
      {
        heading: '2. METODE PENELITIAN',
        level: 1,
        paragraphs: [
          'Arsitektur sistem yang dikembangkan terbagi menjadi tiga lapisan utama: Lapisan Persepsi Sensor, Lapisan Komunikasi Jaringan, dan Lapisan Analisis Data Cloud. Node sensor apung dilengkapi sensor pH industri (SKU: SEN0161), sensor suhu DS18B20 tahan air, sensor konduktivitas listrik (EC), dan probe DO galvanik terhubung ke mikrokontroler ESP32.',
          'Data parameter dikirimkan melalui protokol MQTT menuju server cloud setiap interval 5 menit. Sebelum diproses oleh algoritma klasifikasi, data mentah melalui tahap prapemrosesan mencakup penanganan nilai hilang (missing values) dengan interpolasi linear serta normalisasi Z-score.',
          'Algoritma Random Forest dipilih karena ketahanannya terhadap overfitting pada data tabular dimensi menengah dan kemampuannya menangani multikolinearitas antar variabel sensor [4]. Dataset dibagi menjadi 80% data latih (training set) dan 20% data uji (testing set) dengan validasi silang 10-fold cross validation.',
        ],
      },
      {
        heading: '3. HASIL DAN PEMBAHASAN',
        level: 1,
        paragraphs: [
          'Pengujian kinerja model dilakukan dengan membandingkan Random Forest terhadap dua model baseline: Support Vector Machine (SVM) dengan kernel RBF dan Multi-Layer Perceptron (MLP). Parameter evaluasi mencakup Accuracy, Precision, Recall, dan F1-Score.',
        ],
        table: {
          caption: 'Tabel 1. Perbandingan Kinerja Model Machine Learning pada Klasifikasi Kualitas Air',
          headers: ['Model Klasifikasi', 'Akurasi (%)', 'Presisi (%)', 'Recall (%)', 'F1-Score (%)'],
          rows: [
            ['Random Forest (100 Trees)', '96.8', '95.4', '96.1', '95.7'],
            ['Support Vector Machine (SVM)', '91.2', '90.1', '90.8', '90.4'],
            ['Multi-Layer Perceptron (MLP)', '89.5', '88.7', '89.0', '88.8'],
            ['Decision Tree (C4.5)', '85.3', '84.2', '84.9', '84.5'],
          ],
        },
      },
      {
        heading: '4. ANALISIS FITUR TERPENTING',
        level: 2,
        paragraphs: [
          'Berdasarkan perhitungan Feature Importance menggunakan metode Gini Impurity, parameter Dissolved Oxygen (DO) memiliki bobot pengaruh tertinggi sebesar 0.42, diikuti oleh pH air (0.28), suhu (0.18), dan salinitas (0.12). Temuan ini selaras dengan literatur biologis akuakultur yang menyatakan bahwa hipoksia (penurunan DO di bawah 3.0 mg/L) merupakan pemicu utama stres metabolik pada udang.',
          'Respon latensi pengiriman data sensor dari kolam ke dasbor monitoring rata-rata adalah 1,42 detik dengan packet loss rate sebesar 0,38% pada jarak jangkau 150 meter dari gateway LoRa/WiFi.',
        ],
        figure: {
          caption: 'Gambar 1. Arsitektur Komprehensif Sistem Pemantauan IoT Kualitas Air Tambak Udang',
        },
      },
      {
        heading: '5. KESIMPULAN',
        level: 1,
        paragraphs: [
          'Penelitian ini telah berhasil merancang dan menguji prototipe sistem pemantauan kualitas air tambak udang vaname berbasis IoT dengan integrasi algoritma Random Forest. Model yang dibangun mampu mengklasifikasikan kondisi air tambak secara andal dengan akurasi 96,8%. Sistem terbukti mampu mendeteksi potensi bahaya hipoksia 30 menit sebelum ambang batas kritis terlewati, memberikan waktu mitigasi yang cukup bagi petambak untuk mengaktifkan aerator atau kincir air secara otomatis.',
          'Penelitian selanjutnya disarankan untuk mengintegrasikan sensor kadar amonia (NH3) dan nitrit (NO2) serta memperluas implementasi pada skala tambak multi-plot secara komersial.',
        ],
      },
    ],
    references: [
      '[1] Kementerian Kelautan dan Perikanan Republik Indonesia, "Laporan Kinerja Tahunan Komoditas Akuakultur Nasional," KKP Press, Jakarta, 2024.',
      '[2] J. Boyd and C. S. Tucker, "Water Quality and Pond Soil Analyses for Aquaculture," Alabama Agricultural Experiment Station, Auburn University, 2021.',
      '[3] S. Rahman, M. I. Al-Hafiz, and D. Pratama, "Smart Aquaculture Water Quality Monitoring System using LoRaWAN and Deep Neural Networks," IEEE Internet of Things Journal, vol. 9, no. 14, pp. 11890-11902, 2022. DOI: 10.1109/JIOT.2022.3168890.',
      '[4] L. Breiman, "Random Forests," Machine Learning, vol. 45, no. 1, pp. 5-32, 2001. DOI: 10.1023/A:1010933404324.',
      '[5] H. K. Tan, R. Suryadi, and E. Prabowo, "Comparative Analysis of Supervised Learning Algorithms for Water Quality Assessment," Journal of Computer Science and Information, vol. 17, no. 2, pp. 45-56, 2023.',
      '[6] M. F. Arifin and T. Hidayat, "Penerapan Wireless Sensor Network pada Tambak Udang Tradisional," Jurnal Rekayasa Elektrika, vol. 18, no. 3, pp. 120-128, 2022.',
      '[7] W. Zhang, X. Li, and Y. Wang, "Real-time water quality monitoring based on IoT and fuzzy logic control," Computers and Electronics in Agriculture, vol. 190, p. 106456, 2021.',
      '[8] N. Indrawati and K. Gunawan, "Optimasi Aerasi Tambak Udang Berbasis Prediksi Oksigen Terlarut," Jurnal Otomasi Kontrol dan Instrumentasi, vol. 14, no. 1, pp. 33-42, 2024.',
    ],
  },
];

/**
 * Generates an actual genuine .docx binary Blob using the 'docx' library.
 * This ensures real document testing in Microsoft Word / LibreOffice.
 */
export async function createRealDocxFromSample(sample: SampleArticle): Promise<Blob> {
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: sample.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Authors
  children.push(
    new Paragraph({
      text: sample.authors.join(', '),
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Affiliations
  children.push(
    new Paragraph({
      text: sample.affiliations.join('; '),
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    })
  );

  // Email
  children.push(
    new Paragraph({
      text: sample.email,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  );

  // Abstract Label
  children.push(
    new Paragraph({
      text: 'ABSTRAK',
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 100 },
    })
  );

  // Abstract Body
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: sample.abstract,
          italics: true,
        }),
      ],
      alignment: AlignmentType.BOTH,
      spacing: { after: 120 },
    })
  );

  // Keywords
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Kata Kunci: ',
          bold: true,
          italics: true,
        }),
        new TextRun({
          text: sample.keywords.join('; '),
          italics: true,
        }),
      ],
      spacing: { after: 240 },
    })
  );

  // Sections
  for (const sec of sample.sections) {
    children.push(
      new Paragraph({
        text: sec.heading,
        heading: sec.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    for (const p of sec.paragraphs) {
      children.push(
        new Paragraph({
          text: p,
          alignment: AlignmentType.BOTH,
          spacing: { after: 120 },
        })
      );
    }

    if (sec.table) {
      children.push(
        new Paragraph({
          text: sec.table.caption,
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 80 },
        })
      );

      const tableRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: sec.table.headers.map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: h, bold: true })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              })
          ),
        }),
      ];

      for (const row of sec.table.rows) {
        tableRows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text: cell,
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                })
            ),
          })
        );
      }

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }

    if (sec.figure) {
      children.push(
        new Paragraph({
          text: `[ Ilustrasi Visual / Diagram Sistem: ${sec.figure.caption} ]`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 60 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: sec.figure.caption,
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
    }
  }

  // References Header
  children.push(
    new Paragraph({
      text: 'DAFTAR PUSTAKA',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 100 },
    })
  );

  // References Items
  for (const ref of sample.references) {
    children.push(
      new Paragraph({
        text: ref,
        alignment: AlignmentType.BOTH,
        spacing: { after: 80 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
