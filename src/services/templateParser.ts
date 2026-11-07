import JSZip from 'jszip';
import { JournalTemplateConfig, PageNumberConfig } from '../types/template';

export async function parseMasterTemplateDocx(file: File | Blob): Promise<Partial<JournalTemplateConfig>> {
  const fileName = file instanceof File ? file.name : 'template.docx';
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Berkas template tidak memiliki word/document.xml');
  }

  const docXmlText = await docFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlText, 'application/xml');

  let columns: 1 | 2 = 1;
  let columnSpacingMm = 8;
  let marginTopMm = 25;
  let marginBottomMm = 25;
  let marginLeftMm = 20;
  let marginRightMm = 20;

  const sectPr = xmlDoc.getElementsByTagName('w:sectPr')[0];
  if (sectPr) {
    const cols = sectPr.getElementsByTagName('w:cols')[0];
    if (cols) {
      const num = parseInt(cols.getAttribute('w:num') || '1', 10);
      if (num === 2) columns = 2;
    }
    const pgMar = sectPr.getElementsByTagName('w:pgMar')[0];
    if (pgMar) {
      const top = parseInt(pgMar.getAttribute('w:top') || '1417', 10);
      const bottom = parseInt(pgMar.getAttribute('w:bottom') || '1417', 10);
      const left = parseInt(pgMar.getAttribute('w:left') || '1417', 10);
      const right = parseInt(pgMar.getAttribute('w:right') || '1417', 10);
      marginTopMm = Math.round(top / 56.69);
      marginBottomMm = Math.round(bottom / 56.69);
      marginLeftMm = Math.round(left / 56.69);
      marginRightMm = Math.round(right / 56.69);
    }
  }

  // Deteksi font dominan di seluruh dokumen template
  const fontFrequency: Record<string, number> = {};
  const allRFonts = Array.from(xmlDoc.getElementsByTagName('w:rFonts'));
  for (const rf of allRFonts) {
    const font = rf.getAttribute('w:ascii') || rf.getAttribute('w:hAnsi');
    if (font && !['Symbol', 'Wingdings', 'Calibri'].includes(font)) {
      fontFrequency[font] = (fontFrequency[font] || 0) + 1;
    }
  }
  let primaryFont = 'Times New Roman';
  let highestFreq = 0;
  for (const [fName, freq] of Object.entries(fontFrequency)) {
    if (freq > highestFreq) {
      highestFreq = freq;
      primaryFont = fName;
    }
  }

  // 1. Ekstrak Media Logo jika ada
  let headerLogoUrl: string | undefined = undefined;
  const mediaPaths = Object.keys(zip.files).filter((p) => p.startsWith('word/media/'));
  if (mediaPaths.length > 0) {
    // Ambil gambar pertama (biasanya logo kop jurnal)
    const logoEntry = zip.file(mediaPaths[0]);
    if (logoEntry) {
      try {
        const imgBuffer = await logoEntry.async('uint8array');
        const ext = mediaPaths[0].split('.').pop()?.toLowerCase() || 'png';
        let mime = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'gif') mime = 'image/gif';
        const blob = new Blob([imgBuffer as unknown as BlobPart], { type: mime });
        headerLogoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Gagal membaca gambar logo template:', err);
      }
    }
  }

  // 2. Ekstrak Teks Kop / Banner Template (Nama Jurnal, ISSN, Vol, DOI)
  let headerTitle = '';
  const headerLines: string[] = [];
  let issn = '';
  let doi = '';
  let volumeNo = '';

  const bodyEl = xmlDoc.getElementsByTagName('w:body')[0];
  const searchSources: Element[] = [];
  if (bodyEl) searchSources.push(bodyEl);

  // Periksa juga file header dan footer jika ada
  for (const hPath of [
    'word/header1.xml',
    'word/header2.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/footer3.xml',
  ]) {
    const hFile = zip.file(hPath);
    if (hFile) {
      try {
        const hText = await hFile.async('text');
        const hDoc = parser.parseFromString(hText, 'application/xml');
        searchSources.push(hDoc.documentElement);
      } catch {}
    }
  }

  for (const src of searchSources) {
    const paragraphs = Array.from(src.getElementsByTagName('w:p'));
    for (const p of paragraphs.slice(0, 25)) {
      const text = (p.textContent || '').trim();
      if (!text) continue;

      const tLower = text.toLowerCase();
      if (
        tLower.includes('journal') ||
        tLower.includes('jurnal') ||
        tLower.includes('karsa') ||
        tLower.includes('kiddo') ||
        tLower.includes('issn') ||
        tLower.includes('doi') ||
        tLower.includes('vol.') ||
        tLower.includes('volume')
      ) {
        if (!headerTitle && (tLower.includes('journal') || tLower.includes('jurnal') || tLower.includes('karsa') || tLower.includes('kiddo'))) {
          // Bersihkan jika ada DOI atau volume di baris yang sama
          headerTitle = text.split(';')[0].split('|')[0].trim();
        } else if (!headerLines.includes(text)) {
          headerLines.push(text);
        }

        if (tLower.includes('issn') && !issn) issn = text;
        if (tLower.includes('doi') && !doi) doi = text;
        if ((tLower.includes('vol') || tLower.includes('volume')) && !volumeNo) volumeNo = text;
      }
    }
  }

  // Jika nama judul jurnal belum ditemukan tapi ada di file name
  if (!headerTitle) {
    headerTitle = fileName.replace(/\.[^/.]+$/, '').replace(/template[-_]/i, '');
  }

  // 3. Deteksi Penomoran Halaman dari Berkas Master Template (Kiri, Tengah, Kanan, Atas/Bawah)
  const pageNumberConfig = await detectTemplatePageNumbering(zip, xmlDoc);

  return {
    name: headerTitle || fileName.replace(/\.[^/.]+$/, ''),
    publisher: 'Penerbit Jurnal',
    fieldOfStudy: 'Umum',
    templateArrayBuffer: arrayBuffer,
    headerLogoUrl,
    headerTitle,
    headerLines: headerLines.length > 0 ? headerLines : [
      'ISSN: 2442-3289 (p); 2442-8285 (e)',
      'Vol. XX No.X, December 20XX, pp. XX–XX',
      'DOI: 10.19105/karsa.vX1iX.XXXX'
    ],
    issn,
    doi,
    volumeNo,
    hasHeaderBanner: true,
    pageNumberConfig,
    pageLayout: {
      paperSize: 'A4',
      orientation: 'portrait',
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      columnSpacingMm,
    },
    titleStyle: { fontFamily: primaryFont, fontSizePt: 14, lineSpacing: 1.15, spaceBeforePt: 0, spaceAfterPt: 12, alignment: 'center', bold: true },
    authorStyle: { fontFamily: primaryFont, fontSizePt: 11, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'center', bold: true },
    affiliationStyle: { fontFamily: primaryFont, fontSizePt: 10, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'center', italic: true },
    emailStyle: { fontFamily: primaryFont, fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 12, alignment: 'center' },
    abstractTitleStyle: { fontFamily: primaryFont, fontSizePt: 10, lineSpacing: 1.0, spaceBeforePt: 6, spaceAfterPt: 4, alignment: 'left', bold: true },
    abstractBodyStyle: { fontFamily: primaryFont, fontSizePt: 9.5, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 6, alignment: 'justify', italic: true },
    keywordsStyle: { fontFamily: primaryFont, fontSizePt: 9.5, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 12, alignment: 'justify', italic: true },
    heading1Style: { fontFamily: primaryFont, fontSizePt: 11, lineSpacing: 1.15, spaceBeforePt: 12, spaceAfterPt: 4, alignment: 'left', bold: true },
    heading2Style: { fontFamily: primaryFont, fontSizePt: 10.5, lineSpacing: 1.15, spaceBeforePt: 8, spaceAfterPt: 2, alignment: 'left', bold: true },
    heading3Style: { fontFamily: primaryFont, fontSizePt: 10, lineSpacing: 1.0, spaceBeforePt: 6, spaceAfterPt: 2, alignment: 'left', italic: true },
    bodyStyle: { fontFamily: primaryFont, fontSizePt: 11, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'justify', indentFirstLineMm: 5 },
    tableCaptionStyle: { fontFamily: primaryFont, fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 6, spaceAfterPt: 2, alignment: 'center', bold: true },
    figureCaptionStyle: { fontFamily: primaryFont, fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 4, spaceAfterPt: 6, alignment: 'center' },
    referenceStyle: { fontFamily: primaryFont, fontSizePt: 9.5, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 3, alignment: 'justify' },
  };
}

async function detectTemplatePageNumbering(zip: JSZip, xmlDoc: Document): Promise<PageNumberConfig> {
  const parser = new DOMParser();
  let hasTitlePg = false;
  let hasOddEven = false;

  // 1. Cek w:sectPr di document.xml
  const sectPrs = Array.from(xmlDoc.getElementsByTagName('w:sectPr'));
  for (const s of sectPrs) {
    if (s.getElementsByTagName('w:titlePg').length > 0) {
      hasTitlePg = true;
    }
  }

  // 2. Cek word/settings.xml
  const settingsFile = zip.file('word/settings.xml');
  if (settingsFile) {
    try {
      const settingsXml = await settingsFile.async('text');
      if (settingsXml.includes('evenAndOddHeaders')) {
        hasOddEven = true;
      }
    } catch {}
  }

  // Helper untuk deteksi posisi nomor di dalam berkas XML (footer atau header)
  const inspectXmlForPageNumber = async (filePath: string) => {
    const f = zip.file(filePath);
    if (!f) return null;
    try {
      const text = await f.async('text');
      const doc = parser.parseFromString(text, 'application/xml');
      const paragraphs = Array.from(doc.getElementsByTagName('w:p'));

      for (const p of paragraphs) {
        const rawText = (p.textContent || '').trim();
        const hasFld = p.getElementsByTagName('w:fldSimple').length > 0 || p.getElementsByTagName('w:instrText').length > 0;
        const isNumeric = /^\d+$/.test(rawText);
        const hasPageText = /page\b/i.test(rawText) || /halaman\b/i.test(rawText);

        if (hasFld || isNumeric || hasPageText) {
          // Cari alignment
          let align: 'left' | 'center' | 'right' = 'center';
          const jc = p.getElementsByTagName('w:jc')[0];
          if (jc) {
            const val = jc.getAttribute('w:val') || 'center';
            if (val === 'left') align = 'left';
            else if (val === 'right') align = 'right';
            else if (val === 'center') align = 'center';
          } else {
            // Cek tab stops
            const tabs = Array.from(p.getElementsByTagName('w:tab'));
            if (tabs.length >= 2) align = 'right';
            else if (tabs.length === 1) align = 'center';
          }
          return { align, rawText };
        }
      }
    } catch {}
    return null;
  };

  // Cek footer files
  const footerFiles = Object.keys(zip.files).filter((p) => /^word\/footer\d+\.xml$/.test(p));
  let detectedFooterAlign: 'left' | 'center' | 'right' | null = null;
  let firstPageFooterAlign: 'left' | 'center' | 'right' | undefined = undefined;

  for (const fPath of footerFiles) {
    const res = await inspectXmlForPageNumber(fPath);
    if (res) {
      if (!detectedFooterAlign) detectedFooterAlign = res.align;
      if (fPath.includes('footer1.xml')) {
        firstPageFooterAlign = res.align;
      }
    }
  }

  if (detectedFooterAlign) {
    let displayText = '';
    const mapIndo: Record<'left' | 'center' | 'right', string> = { left: 'Kiri Bawah', center: 'Tengah Bawah', right: 'Kanan Bawah' };
    if (firstPageFooterAlign && firstPageFooterAlign !== detectedFooterAlign) {
      displayText = `${mapIndo[firstPageFooterAlign]} (Hal 1) & ${mapIndo[detectedFooterAlign]} (Hal 2+)`;
    } else {
      displayText = mapIndo[detectedFooterAlign];
    }

    return {
      location: 'footer',
      alignment: detectedFooterAlign,
      firstPageAlignment: firstPageFooterAlign,
      showOnFirstPage: !!firstPageFooterAlign,
      hasOddEven,
      displayText,
    };
  }

  // Cek header files jika footer tidak ada nomor
  const headerFiles = Object.keys(zip.files).filter((p) => /^word\/header\d+\.xml$/.test(p));
  for (const hPath of headerFiles) {
    const res = await inspectXmlForPageNumber(hPath);
    if (res) {
      const mapIndo: Record<'left' | 'center' | 'right', string> = { left: 'Kiri Atas (Header)', center: 'Tengah Atas (Header)', right: 'Kanan Atas (Header)' };
      return {
        location: 'header',
        alignment: res.align,
        showOnFirstPage: !hasTitlePg,
        hasOddEven,
        displayText: mapIndo[res.align],
      };
    }
  }

  // Default jika tidak terdeteksi eksplisit
  return {
    location: 'footer',
    alignment: 'right',
    firstPageAlignment: 'right',
    showOnFirstPage: true,
    hasOddEven: false,
    displayText: 'Kanan Bawah (Sesuai Template)',
  };
}

export function createSuggestedMapping(_doc: any, _tpl: any): any {
  return {};
}