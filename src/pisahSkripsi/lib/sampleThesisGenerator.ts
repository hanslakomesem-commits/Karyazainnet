import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Generate a complete multi-page sample thesis PDF for instant 1-click testing
 */
export async function createSampleThesisPdf(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pagesData = [
    {
      title: 'SKRIPSI\nIMPLEMENTASI HUKUM KELUARGA ISLAM DALAM HAK ASUH ANAK PASCA PERCERAIAN',
      subtitle: 'Disusun Oleh:\nM. RIFQI\nNIM: 22382071037\nProgram Studi: Hukum Keluarga Islam (HKI)\nEmail: m.rifqi@example.com\n\nFAKULTAS SYARIAH\nUNIVERSITAS ISLAM NEGERI\n2026',
    },
    {
      title: 'HALAMAN PERSETUJUAN PEMBIMBING',
      subtitle: 'Skripsi oleh M. RIFQI (NIM: 22382071037) dengan judul "IMPLEMENTASI HUKUM KELUARGA ISLAM DALAM HAK ASUH ANAK PASCA PERCERAIAN" telah disetujui untuk diujikan.\n\nPembimbing I: Dr. Ahmad Dahlan, M.H.I.\nPembimbing II: H. Muhammad Ridwan, M.Ag.',
    },
    {
      title: 'HALAMAN PENGESAHAN DEWAN PENGUJI',
      subtitle: 'Dipertahankan di depan Dewan Penguji Skripsi Fakultas Syariah dan dinyatakan LULUS.\n\nKetua Penguji: Prof. Dr. Usman Umar, M.A.\nAnggota Penguji: Dr. Siti Aminah, M.H.I.',
    },
    {
      title: 'ABSTRAK',
      subtitle: 'Penelitian ini bertujuan untuk mengkaji implementasi hukum keluarga Islam dalam penetapan hak asuh anak pasca perceraian di Pengadilan Agama. Penelitian ini menggunakan metode kualitatif empiris dengan pendekatan perundang-undangan dan sosiologi hukum.\n\nHasil penelitian menunjukkan bahwa pertimbangan utama hakim Pengadilan Agama tetap mengedepankan prinsip kepentingan terbaik bagi anak (the best interest of the child) yang sejalan dengan kaidah fiqh muamalah.\n\nKata Kunci: Hukum Keluarga Islam, Hak Asuh Anak, Hadhanah, Pengadilan Agama.',
    },
    {
      title: 'KATA PENGANTAR',
      subtitle: 'Puji syukur ke hadirat Allah SWT yang telah melimpahkan rahmat dan hidayah-Nya sehingga penulis dapat menyelesaikan skripsi ini. Penulis menyampaikan terima kasih kepada Rektor, Dekan Fakultas Syariah, Dosen Pembimbing, serta kedua orang tua tercinta atas masukan dan doa yang tiada henti.',
    },
    {
      title: 'DAFTAR ISI',
      subtitle: 'HALAMAN PERSETUJUAN .................................................. ii\nHALAMAN PENGESAHAN .................................................. iii\nABSTRAK .............................................................. iv\nKATA PENGANTAR ..................................................... v\nDAFTAR ISI ........................................................... vi\nBAB I PENDAHULUAN .................................................... 1\nBAB II KAJIAN TEORI ................................................... 3\nBAB III METODE PENELITIAN ............................................ 5\nBAB IV HASIL DAN PEMBAHASAN .......................................... 7\nBAB V PENUTUP ........................................................ 9\nDAFTAR PUSTAKA ....................................................... 10',
    },
    {
      title: 'BAB I PENDAHULUAN',
      subtitle: '1.1 Latar Belakang Masalah\nPerceraian dalam hukum keluarga Islam merupakan pilihan terakhir (ultimum remedium). Salah satu dampak yuridis utama dari perceraian adalah timbulnya sengketa pemeliharaan anak (hadhanah).\n\n1.2 Rumusan Masalah\n1. Bagaimana penerapan pasal-pasal Kompilasi Hukum Islam tentang hak asuh anak?\n2. Apa saja kendala dalam eksekusi putusan hadhanah di lapangan?\n\n1.3 Tujuan Penelitian\nUntuk menganalisis dasar pertimbangan hukum hakim serta efektivitas putusan hadhanah.',
    },
    {
      title: 'BAB II KAJIAN TEORI DAN TINJAUAN PUSTAKA',
      subtitle: '2.1 Tinjauan Umum Hadhanah dalam Fiqh\nSecara etimologi, hadhanah berasal dari kata al-hidhn yang berarti mengapit di samping. Dalam hukum Islam, hadhanah didefinisikan sebagai kegiatan mengasuh, mendidik, dan memelihara anak yang belum mumayyiz.\n\n2.2 Kompilasi Hukum Islam (KHI)\nPasal 105 KHI menyebutkan bahwa pemeliharaan anak yang belum mumayyiz atau belum berumur 12 tahun adalah hak ibunya.',
    },
    {
      title: 'BAB III METODE PENELITIAN',
      subtitle: '3.1 Jenis Penelitian\nPenelitian ini merupakan penelitian hukum yuridis-sosiologis (empiris) dengan mengambil lokasi di Pengadilan Agama.\n\n3.2 Sumber Data\nData primer diperoleh melalui wawancara mendalam dengan 5 Hakim Pengadilan Agama dan panitera. Data sekunder diperoleh dari naskah salinan putusan PA.\n\n3.3 Analisis Data\nData dianalisis secara kualitatif interaktif melalui tahapan reduksi data, penyajian data, dan penarikan kesimpulan.',
    },
    {
      title: 'BAB IV HASIL DAN PEMBAHASAN',
      subtitle: '4.1 Analisis Pertimbangan Hukum Hakim\nBerdasarkan analisis terhadap 10 salinan putusan kasus hadhanah tahun 2024-2025, hakim konsisten menetapkan hak asuh anak di bawah umur kepada ibu, kecuali terbukti sang ibu mengalami murtad atau gangguan kejiwaan.\n\n4.2 Implementasi Eksekusi Putusan\nHasil wawancara menunjukkan eksekusi putusan hadhanah menghadapi tantangan psikologis. Hakim mengedepankan pendekatan mediasi keluarga.',
    },
    {
      title: 'BAB V PENUTUP',
      subtitle: '5.1 Kesimpulan\nImplementasi Hukum Keluarga Islam mengenai hadhanah telah berjalan harmonis antara Kompilasi Hukum Islam dan perlindungan anak. Kepentingan tumbuh kembang anak menjadi kriteria absolut dalam penentuan wali asuh.\n\n5.2 Saran\nDisarankan agar Kompilasi Hukum Islam diperbarui dengan menambahkan klausul mengenai forum mediasi khusus anak pasca eksekusi.',
    },
    {
      title: 'DAFTAR PUSTAKA',
      subtitle: 'Abdurrahman. (2020). Kompilasi Hukum Islam di Indonesia. Jakarta: Akademika Pressindo.\nAl-Zuhaili, Wahbah. (2018). Al-Fiqh al-Islami wa Adillatuh. Damaskus: Dar al-Fikr.\nDirektorat Jenderal Badan Peradilan Agama. (2023). Laporan Tahunan Kasus Perkawinan. Jakarta: Mahkamah Agung RI.\nSyarifuddin, Amir. (2019). Hukum Perkawinan Islam di Indonesia. Jakarta: Kencana.',
    },
    {
      title: 'SURAT PERNYATAAN KEASLIAN TULISAN',
      subtitle: 'Yang bertanda tangan di bawah ini:\nNama: M. RIFQI\nNIM: 22382071037\n\nMenyatakan dengan sesungguhnya bahwa skripsi ini adalah hasil karya ilmiah asli saya sendiri dan bukan merupakan jiplakan atau plagiasi karya orang lain.',
    },
    {
      title: 'LAMPIRAN-LAMPIRAN',
      subtitle: 'Lampiran 1: Pedoman Wawancara dengan Hakim Pengadilan Agama\nLampiran 2: Transkrip Hasil Wawancara Informan\nLampiran 3: Surat Izin Penelitian dari Fakultas Syariah',
    },
    {
      title: 'RIWAYAT HIDUP',
      subtitle: 'M. RIFQI lahir di Madura pada 12 Mei 2002. Menyelesaikan pendidikan Sekolah Dasar pada tahun 2014, MTs tahun 2017, MA tahun 2020, dan melanjutkan jenjang Sarjana (S1) pada Program Studi Hukum Keluarga Islam Fakultas Syariah.',
    },
  ];

  for (let i = 0; i < pagesData.length; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const d = pagesData[i];

    // Header / Title
    page.drawText(d.title, {
      x: 50,
      y: 750,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
      maxWidth: 495,
    });

    // Body
    page.drawText(d.subtitle, {
      x: 50,
      y: 680,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 495,
      lineHeight: 16,
    });

    // Page number bottom center
    const pNum = `${i + 1}`;
    page.drawText(pNum, {
      x: 290,
      y: 40,
      size: 10,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
}
