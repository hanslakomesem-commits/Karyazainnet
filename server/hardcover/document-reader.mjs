/**
 * ZAIN.NET Hard Cover Document Reader
 * Fast local reader for page 1 of PDF and Word DOCX files.
 * Extracts cover metadata deterministically in milliseconds without stalling.
 */
import { readCover } from './ocr.mjs';
import { categorize } from './cover-classifier.mjs';

const fail = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};

export const pdfFileSignature = (b) => b && b.length > 5 && b.subarray(0, 5).toString('ascii') === '%PDF-';
export const docxFileSignature = (b) => b && b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;

export function compact(str) {
  return String(str ?? '').replace(/\s+/gu, ' ').trim();
}

function xmlDecode(s) {
  return String(s || '').replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#\d+);/giu, (m) => {
    const known = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
    return known[m] ?? (m.startsWith('&#x') ? String.fromCodePoint(parseInt(m.slice(3, -1), 16)) : String.fromCodePoint(parseInt(m.slice(2, -1), 10)));
  });
}

async function openPdf(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
  return task.promise;
}

async function pageOneData(buffer) {
  if (!pdfFileSignature(buffer)) fail('File bukan PDF asli atau tidak dapat dibuka.', 415);
  let pdf;
  try {
    pdf = await openPdf(buffer);
    const page = await pdf.getPage(1);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const groups = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const [a, b, c, d, x, y] = item.transform;
      if (Math.abs(a) < Math.abs(b) * 0.6 && Math.abs(d) < Math.abs(c) * 0.6) continue; // rotated spine text
      const key = Math.round(y / 3) * 3;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ x, str: item.str });
    }
    const grouped = [...groups].sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map((x) => x.str).join(' '));
    const text = grouped.join('\n');
    return { pdf, page, text, lines: grouped, pageCount: pdf.numPages };
  } catch (e) {
    if (e.status) throw e;
    fail('PDF tidak bisa dibaca: ' + String(e.message || e).slice(0, 180));
  }
}

async function scannedFirstPageImage(page) {
  let canvasModule;
  try {
    canvasModule = await import('@napi-rs/canvas');
  } catch {
    fail('PDF scan butuh paket @napi-rs/canvas untuk merender halaman pertama. Periksa npm install.', 503);
  }
  const viewport = page.getViewport({ scale: Math.min(2.0, 1800 / page.getViewport({ scale: 1 }).width) });
  const canvas = canvasModule.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer('image/png');
}

export async function extractPdfFirstPage(buffer, source = 'pdf') {
  const result = await pageOneData(buffer);
  try {
    const extracted = compact(result.text);
    if (extracted.length < 45) {
      const png = await scannedFirstPageImage(result.page);
      const data = await readCover(png, 'image/png');
      return {
        ...data,
        source,
        method: 'gemini_fallback_page_1',
        pages_read: 1,
        warnings: [...(data.warnings || []), 'PDF halaman pertama tidak memiliki lapisan teks; pembacaan menggunakan OCR gambar halaman 1.']
      };
    }
    return {
      ...categorize(result.lines),
      source,
      method: 'text_local_page_1',
      pages_read: 1
    };
  } finally {
    if (result && result.pdf) {
      try {
        if (typeof result.pdf.cleanup === 'function') await result.pdf.cleanup();
        if (typeof result.pdf.destroy === 'function') await result.pdf.destroy();
      } catch (_) {}
    }
  }
}

/**
 * Fast, pure-memory DOCX first page cover extractor.
 * Automatically handles page breaks, section breaks (<w:sectPr>), and section delimiters.
 */
export async function extractDocxFirstPage(buffer) {
  if (!docxFileSignature(buffer)) {
    fail('Format Word harus .docx, bukan .doc lama atau file bukan DOCX.', 415);
  }

  const { default: JSZip } = await import('jszip');
  let xml = '';
  try {
    const zip = await JSZip.loadAsync(buffer);
    xml = await zip.file('word/document.xml')?.async('string') || '';
  } catch {
    fail('Berkas Word DOCX rusak atau tidak valid.', 415);
  }

  if (!xml) {
    fail('Isi Word (word/document.xml) tidak dapat ditemukan.', 422);
  }

  // Iterate paragraphs and collect cover lines until cover boundary
  const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gu;
  const paras = [];
  let match;

  while ((match = pRegex.exec(xml)) !== null) {
    const pXml = match[1];

    // Check for hard section break or page break within this paragraph
    const hasBreak = /<w:(?:lastRenderedPageBreak\b|br\s+[^>]*w:type=["']page["']|sectPr\b|pageBreakBefore\b)/iu.test(pXml);

    // Extract text runs <w:t>
    const tMatches = pXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gu);
    let text = '';
    for (const tm of tMatches) {
      text += tm[1];
    }
    text = xmlDecode(text).trim();

    if (text) {
      // If we encounter standard subsequent section titles, stop taking cover lines
      if (/^(?:LEMBAR\s+(?:PERSETUJUAN|PENGESAHAN|PENGUJI)|PERNYATAAN\s+(?:KEASLIAN|BEBAS\s+PLAGIASI)|HALAMAN\s+PERSETUJUAN|ABSTRAK|ABSTRACT|KATA\s+PENGANTAR|DAFTAR\s+(?:ISI|TABEL|GAMBAR|LAMPIRAN)|BAB\s+(?:I|1)\b|PENDAHULUAN\b)/iu.test(text)) {
        break;
      }
      paras.push(text);
    }

    // Stop if a break occurred after at least 3 cover paragraphs
    if (hasBreak && paras.length >= 3) {
      break;
    }

    // A skripsi cover page never exceeds 35 paragraphs
    if (paras.length >= 35) {
      break;
    }
  }

  if (!paras.length) {
    fail('Halaman pertama DOCX tidak memiliki teks cover yang dapat diekstrak. Gunakan foto cover atau isi manual.', 422);
  }

  const result = categorize(paras, [
    'Teks halaman cover Word (.docx) diekstrak secara lokal dan cepat tanpa mengurangi data naskah.'
  ]);

  return {
    ...result,
    source: 'docx',
    method: 'docx_native_fast_extract',
    pages_read: 1
  };
}
