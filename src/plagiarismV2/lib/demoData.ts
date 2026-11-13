import JSZip from 'jszip';

export const SAMPLE_PLAGIARISM_TEXT = `HASIL UJI SIMILARITAS TURNITIN - SKRIPSI MAHASISWA
Judul: Analisis Yuridis dan Sosiologis Perlindungan Hukum Data Pribadi Konsumen dalam Transaksi Elektronik Era Digital di Indonesia
Tingkat Kesamaan (Overall Similarity): 38%

--- DAFTAR KALIMAT TERINDIKASI PLAGIASI TINGGI ---

1. [Indikasi Plagiasi Bab I - 84% Kesamaan dengan Jurnal Hukum 2021]
"Perkembangan teknologi informasi dan komunikasi yang sangat pesat pada era globalisasi saat ini telah membawa perubahan yang sangat mendasar dalam berbagai aspek kehidupan manusia, khususnya dalam sistem transaksi perdagangan dan bisnis secara elektronik."

2. [Indikasi Plagiasi Bab I - 78% Kesamaan dengan UU ITE Komparatif]
"Perlindungan data pribadi merupakan salah satu hak asasi manusia yang sangat mendasar dan harus dijamin keberadaannya oleh negara sebagaimana diatur dalam ketentuan peraturan perundang-undangan yang berlaku di Indonesia."

3. [Indikasi Plagiasi Bab I - 92% Kesamaan dengan Skripsi Terdahulu]
"Berdasarkan latar belakang masalah yang telah diuraikan di atas, maka rumusan masalah yang akan dibahas dalam penelitian skripsi ini adalah bagaimana bentuk pertanggungjawaban hukum penyedia platform digital terhadap kebocoran data konsumen."

4. [Indikasi Plagiasi Bab II - 88% Kesamaan dengan Buku Teori Hukum]
"Menurut teori kepastian hukum yang dikemukakan oleh Gustav Radbruch, hukum harus mengandung tiga nilai dasar utama yaitu keadilan, kemanfaatan, dan kepastian hukum yang harus berjalan secara seimbang dan proporsional."

5. [Indikasi Plagiasi Bab IV - 81% Kesamaan dengan Publikasi Kemenkominfo]
"Hasil penelitian menunjukkan bahwa sebagian besar konsumen di Indonesia belum memiliki kesadaran hukum yang memadai mengenai hak-hak mereka atas kerahasiaan dan privasi data pribadi saat menyetujui syarat dan ketentuan pada aplikasi digital."

6. [Indikasi Plagiasi Bab IV - 89% Kesamaan dengan Analisis Kasus 2022]
"Penegakan hukum terhadap tindak pidana penyalahgunaan data pribadi konsumen masih menghadapi berbagai macam kendala teknis dan yuridis, antara lain terbatasnya kapasitas penyidik siber dan lemahnya sanksi administratif yang dijatuhkan."`;

/**
 * Creates a real, fully valid DOCX file buffer containing:
 * - Bab I Pendahuluan & Bab IV Pembahasan
 * - Exactly 30 Footnotes with genuine academic citations
 * - Real formatting and XML structure
 */
export async function createDemoSkripsiDocx(): Promise<Blob> {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`
  );

  // Generate 30 footnotes XML entries
  const footnoteCitations = [
    'Barda Nawawi Arief, Kapita Selekta Hukum Pidana, (Bandung: Citra Aditya Bakti, 2018), hlm. 45.',
    'Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Pasal 4 ayat (1).',
    'Satjipto Rahardjo, Ilmu Hukum, (Bandung: PT Citra Aditya Bakti, 2014), hlm. 72.',
    'Jimly Asshiddiqie, Konstitusi dan Konstitusionalisme Indonesia, (Jakarta: Sinar Grafika, 2010), hlm. 112.',
    'Mochtar Kusumaatmadja, Konsep-Konsep Hukum dalam Pembangunan, (Bandung: Alumni, 2006), hlm. 29.',
    'Edmon Makarim, Pengantar Hukum Telematika: Suatu Kompilasi Kajian, (Jakarta: Rajawali Pers, 2005), hlm. 88.',
    'Peter Mahmud Marzuki, Penelitian Hukum, Edisi Revisi, (Jakarta: Kencana Prenada Media Group, 2017), hlm. 35.',
    'Soerjono Soekanto, Pengantar Penelitian Hukum, (Jakarta: UI Press, 2015), hlm. 51.',
    'Sudikno Mertokusumo, Mengenal Hukum Suatu Pengantar, (Yogyakarta: Liberty, 2008), hlm. 93.',
    'Gustav Radbruch, Rechtsphilosophie, (Stuttgart: K.F. Koehler Verlag, 1973), hlm. 108.',
    'Lon L. Fuller, The Morality of Law, (New Haven: Yale University Press, 1969), hlm. 64.',
    'Philipus M. Hadjon, Perlindungan Hukum Bagi Rakyat di Indonesia, (Surabaya: PT Bina Ilmu, 1987), hlm. 24.',
    'Ahmad M. Ramli, Cyber Law dan HAKI dalam Sistem Hukum Indonesia, (Bandung: Refika Aditama, 2010), hlm. 150.',
    'Sinta Dewi Rosadi, Cyberlaw: Aspek Perdata Konsumen dalam E-Commerce, (Bandung: Alumni, 2015), hlm. 97.',
    'Danrivanto Budhijanto, Teori Hukum Konvergensi: Teknologi Informasi dan Komunikasi, (Bandung: Refika Aditama, 2014), hlm. 82.',
    'Kementerian Komunikasi dan Informatika RI, Laporan Tahunan Keamanan Siber Nasional 2022, hlm. 19.',
    'Shinta Dewi, Perlindungan Privasi dan Data Pribadi dalam Perspektif Perbandingan Hukum, (Bandung: Widya Padjadjaran, 2009), hlm. 40.',
    'General Data Protection Regulation (GDPR) Regulation (EU) 2016/679, Article 5.',
    'Salim H.S. dan Erlies Septiana Nurbani, Penerapan Teori Hukum Pada Penelitian Tesis dan Disertasi, (Jakarta: Rajawali Pers, 2013), hlm. 104.',
    'Bagir Manan, Teori dan Politik Konstitusi, (Yogyakarta: FH UII Press, 2004), hlm. 67.',
    'Mahfud MD, Membangun Politik Hukum, Menegakkan Konstitusi, (Jakarta: LP3ES, 2006), hlm. 13.',
    'Wirjono Prodjodikoro, Asas-Asas Hukum Perdata, (Bandung: Sumur Bandung, 2000), hlm. 115.',
    'Subekti, Pokok-Pokok Hukum Perdata, (Jakarta: Intermasa, 2003), hlm. 47.',
    'Mariam Darus Badrulzaman, Kompilasi Hukum Perikatan, (Bandung: Citra Aditya Bakti, 2001), hlm. 80.',
    'J. Satrio, Hukum Perikatan, Perikatan yang Lahir dari Perjanjian, (Bandung: Citra Aditya Bakti, 1995), hlm. 120.',
    'Ridwan H.R., Hukum Administrasi Negara, Edisi Revisi, (Jakarta: Rajawali Pers, 2014), hlm. 144.',
    'Maria S.W. Sumardjono, Pedoman Pembuatan Usulan Penelitian: Sebuah Panduan Dasar, (Jakarta: Gramedia, 2001), hlm. 18.',
    'C.S.T. Kansil, Pengantar Ilmu Hukum dan Tata Hukum Indonesia, (Jakarta: Balai Pustaka, 2002), hlm. 76.',
    'R. Soeroso, Pengantar Ilmu Hukum, (Jakarta: Sinar Grafika, 2011), hlm. 89.',
    'Romli Atmasasmita, Teori Hukum Integratif: Rekonstruksi Terhadap Teori Hukum Pembangunan, (Yogyakarta: Genta Publishing, 2012), hlm. 55.',
  ];

  let footnotesXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnote w:type="separator" w:id="-1">
    <w:p><w:r><w:separator/></w:r></w:p>
  </w:footnote>
  <w:footnote w:type="continuationSeparator" w:id="0">
    <w:p><w:r><w:continuationSeparator/></w:r></w:p>
  </w:footnote>`;

  for (let i = 1; i <= 30; i++) {
    const citation = footnoteCitations[i - 1];
    footnotesXmlContent += `
  <w:footnote w:id="${i}">
    <w:p>
      <w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr>
      <w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>
      <w:r><w:t xml:space="preserve"> ${citation}</w:t></w:r>
    </w:p>
  </w:footnote>`;
  }
  footnotesXmlContent += `\n</w:footnotes>`;

  zip.file('word/footnotes.xml', footnotesXmlContent);

  // word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="FootnoteReference">
    <w:name w:val="footnote reference"/>
    <w:rPr><w:vertAlign w:val="superscript"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="FootnoteText">
    <w:name w:val="footnote text"/>
    <w:rPr><w:sz w:val="20"/></w:rPr>
  </w:style>
</w:styles>`
  );

  // word/settings.xml
  zip.file(
    'word/settings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnotePr><w:numFmt w:val="decimal"/><w:numStart w:val="1"/></w:footnotePr>
</w:settings>`
  );

  // Helper to build a paragraph XML with footnote reference
  function makeP(text: string, fnId?: number, isHeading: boolean = false): string {
    const style = isHeading ? '<w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr>' : '<w:pPr><w:spacing w:line="360" w:lineRule="auto"/><w:ind w:firstLine="720"/></w:pPr>';
    let fnXml = '';
    if (fnId) {
      fnXml = `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${fnId}"/></w:r>`;
    }
    return `<w:p>${style}<w:r><w:t xml:space="preserve">${text}</w:t></w:r>${fnXml}</w:p>`;
  }

  // word/document.xml with Bab I to Bab IV and 30 Footnotes
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${makeP('BAB I PENDAHULUAN', undefined, true)}
    ${makeP('A. Latar Belakang Masalah', undefined, true)}
    ${makeP('Perkembangan teknologi informasi dan komunikasi yang sangat pesat pada era globalisasi saat ini telah membawa perubahan yang sangat mendasar dalam berbagai aspek kehidupan manusia, khususnya dalam sistem transaksi perdagangan dan bisnis secara elektronik.', 1)}
    ${makeP('Perlindungan data pribadi merupakan salah satu hak asasi manusia yang sangat mendasar dan harus dijamin keberadaannya oleh negara sebagaimana diatur dalam ketentuan peraturan perundang-undangan yang berlaku di Indonesia.', 2)}
    ${makeP('Dalam realitas empiris di lapangan, fenomena kebocoran data konsumen pada aplikasi marketplace digital sering kali merugikan masyarakat luas baik secara materil maupun immateril.', 3)}
    ${makeP('Konstitusi Republik Indonesia menjamin hak setiap warga negara atas perlindungan diri pribadi, keluarga, kehormatan, martabat, dan harta benda yang di bawah kekuasaannya.', 4)}
    ${makeP('Hukum dituntut untuk selalu adaptif dan responsif dalam mengimbangi percepatan transformasi digital yang kian dinamis di tengah masyarakat modern.', 5)}
    ${makeP('Oleh karena itu, regulasi yang komprehensif mengenai tata kelola data digital mutlak diperlukan demi menjaga stabilitas iklim perekonomian nasional.', 6)}

    ${makeP('B. Rumusan Masalah', undefined, true)}
    ${makeP('Berdasarkan latar belakang masalah yang telah diuraikan di atas, maka rumusan masalah yang akan dibahas dalam penelitian skripsi ini adalah bagaimana bentuk pertanggungjawaban hukum penyedia platform digital terhadap kebocoran data konsumen.', 7)}
    ${makeP('Bagaimanakah efektivitas penegakan sanksi administratif dan ganti rugi perdata bagi konsumen korban penyalahgunaan data pribadi?', 8)}

    ${makeP('C. Tujuan dan Manfaat Penelitian', undefined, true)}
    ${makeP('Penelitian ini bertujuan untuk mengkaji secara mendalam asas keadilan serta kepastian hukum dalam mekanisme penyelesaian sengketa data digital.', 9)}

    ${makeP('BAB II TINJAUAN PUSTAKA', undefined, true)}
    ${makeP('A. Landasan Teori Hukum', undefined, true)}
    ${makeP('Menurut teori kepastian hukum yang dikemukakan oleh Gustav Radbruch, hukum harus mengandung tiga nilai dasar utama yaitu keadilan, kemanfaatan, dan kepastian hukum yang harus berjalan secara seimbang dan proporsional.', 10)}
    ${makeP('Prinsip moralitas internal hukum sebagaimana dirumuskan oleh para pakar filsafat hukum menuntut adanya kejelasan aturan yang dapat diprediksi oleh subjek hukum.', 11)}
    ${makeP('Perlindungan hukum preventif dan represif memiliki peranan krusial dalam menciptakan rasa aman bagi para pelaku usaha dan konsumen di ranah digital.', 12)}
    ${makeP('Konvergensi hukum telematika menjadi instrumen esensial dalam menjawab tantangan yurisdiksi lintas batas negara.', 13)}
    ${makeP('Standar internasional mensyaratkan adanya prinsip akuntabilitas dan transparansi dari setiap pihak pengendali data.', 14)}
    ${makeP('Harmonisasi regulasi domestik dengan standar global menjadi kebutuhan mendesak bagi otoritas pengawas pelindungan data.', 15)}

    ${makeP('BAB III METODE PENELITIAN', undefined, true)}
    ${makeP('A. Jenis dan Pendekatan Penelitian', undefined, true)}
    ${makeP('Penelitian skripsi ini menggunakan metode penelitian hukum normatif empiris dengan menelaah bahan pustaka serta data faktual dari kementerian terkait.', 16)}
    ${makeP('Pendekatan undang-undang dan pendekatan konseptual digunakan secara simultan untuk membedah norma hukum yang kabur.', 17)}
    ${makeP('Data primer diperoleh melalui wawancara mendalam dengan pihak regulator dan asosiasi e-commerce di Indonesia.', 18)}
    ${makeP('Analisis data dilakukan secara kualitatif dengan menarik kesimpulan deduktif-induktif yang sistematis dan teruji validitasnya.', 19)}
    ${makeP('Bahan hukum sekunder berupa jurnal terakreditasi, risalah simposium, dan doktrin para sarjana terkemuka.', 20)}

    ${makeP('BAB IV HASIL DAN PEMBAHASAN', undefined, true)}
    ${makeP('A. Analisis Yuridis Implementasi Pelindungan Data Konsumen', undefined, true)}
    ${makeP('Hasil penelitian menunjukkan bahwa sebagian besar konsumen di Indonesia belum memiliki kesadaran hukum yang memadai mengenai hak-hak mereka atas kerahasiaan dan privasi data pribadi saat menyetujui syarat dan ketentuan pada aplikasi digital.', 21)}
    ${makeP('Klausula baku yang tercantum dalam perjanjian elektronik sering kali menempatkan posisi konsumen pada kedudukan tawar yang tidak seimbang.', 22)}
    ${makeP('Penyelenggara sistem elektronik wajib menerapkan enkripsi berlapis dan audit sistem berkala untuk mencegah peretasan ilegal.', 23)}
    ${makeP('Kompensasi dan ganti rugi perdata dapat diajukan melalui gugatan perbuatan melawan hukum berdasarkan ketentuan hukum yang berlaku.', 24)}
    ${makeP('Beban pembuktian terbalik dalam perkara kebocoran data sangat mendesak untuk diakomodasi dalam praktek peradilan.', 25)}

    ${makeP('B. Kendala dan Strategi Penegakan Hukum', undefined, true)}
    ${makeP('Penegakan hukum terhadap tindak pidana penyalahgunaan data pribadi konsumen masih menghadapi berbagai macam kendala teknis dan yuridis, antara lain terbatasnya kapasitas penyidik siber dan lemahnya sanksi administratif yang dijatuhkan.', 26)}
    ${makeP('Lembaga pengawas independen pelindungan data pribadi harus segera dibentuk dengan kewenangan eksekutorial yang tegas.', 27)}
    ${makeP('Kolaborasi antar-lembaga penegak hukum dan penyedia jasa teknologi menjadi kunci keberhasilan pencegahan kejahatan siber.', 28)}
    ${makeP('Pemberian sanksi denda administratif yang proporsional dapat memberikan efek jera bagi korporasi yang lalai.', 29)}
    ${makeP('Pendidikan literasi digital bagi masyarakat luas harus digalakkan secara masif oleh pemerintah dan institusi pendidikan tinggi.', 30)}

    ${makeP('BAB V KESIMPULAN DAN SARAN', undefined, true)}
    ${makeP('Berdasarkan keseluruhan uraian pada bab-bab sebelumnya, dapat disimpulkan bahwa perlindungan hukum data pribadi memerlukan sinergi antara regulasi yang kuat, kepatuhan korporasi, dan literasi hukum masyarakat.')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', docXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
