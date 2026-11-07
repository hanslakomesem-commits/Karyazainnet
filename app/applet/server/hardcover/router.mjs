import express from 'express';
import multer from 'multer';
import JSZip from 'jszip';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs/promises';
import { generatePDF, thicknesses, calibration, PDFPreflightError, coverTypes, printSizes } from './pdf-engine.mjs';
import { readCover } from './ocr.mjs';
import { extractPdfFirstPage, extractDocxFirstPage, pdfFileSignature, docxFileSignature } from './document-reader.mjs';
import { validateOrderItems, pdfOrderFileName, makeBatchReportCSV, MAX_BATCH_ORDERS } from './batch-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }
});

function safeName(name) {
  return String(name || 'MAHASISWA')
    .toLocaleUpperCase('id-ID')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'MAHASISWA';
}

function sendError(error, res) {
  const status = error.status || (error instanceof PDFPreflightError ? 422 : 500);
  const message = status === 500 ? 'Kesalahan internal saat memproses PDF. Periksa logs aplikasi.' : String(error.message || 'Terjadi masalah.');
  if (status >= 500) console.error('[SERVER ERROR HARDCOVER]', error);
  return res.status(status).json({ detail: { errors: [message] } });
}

function getStatusPayload() {
  return {
    app: 'ZAIN.NET AI COVER SKRIPSI',
    version: '4.2 Batch 3-input Presisi Garis',
    thicknesses,
    unavailable_thicknesses: [],
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    page_mm: printSizes,
    cover_types: coverTypes,
    gemini_configured: !!process.env.GEMINI_API_KEY,
    original_font_match: !!(process.env.ZAIN_BOLD_FONT && process.env.ZAIN_ITALIC_FONT),
    bold_font: process.env.ZAIN_BOLD_FONT ? 'Font berlisensi pengguna' : 'Tinos Bold (npm)',
    italic_font: process.env.ZAIN_ITALIC_FONT ? 'Font berlisensi pengguna' : 'Tinos Bold Italic (npm)',
    spine_title_pt: Object.fromEntries(thicknesses.map(mm => [mm, mm === 10 ? 8 : 9])),
    min_spine_title_pt: 6,
    max_spine_title_lines: 3,
    upload_modes: ['foto_ocr', 'pdf_hal_1', 'word_hal_1'],
    max_batch_orders: MAX_BATCH_ORDERS
  };
}

router.get('/api/status', (_req, res) => res.json(getStatusPayload()));
router.get('/api/cover/status', (_req, res) => res.json(getStatusPayload()));

router.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw Object.assign(new Error('Pilih foto cover dulu.'), { status: 400 });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      throw Object.assign(new Error('Gunakan foto JPG, PNG, atau WebP.'), { status: 415 });
    }
    res.json(await readCover(req.file.buffer, req.file.mimetype));
  } catch (e) {
    sendError(e, res);
  }
});

/** DOCX and PDF sources are read locally. Only the first page is extracted.
 * Fallback Gemini OCR is used ONLY if a first PDF page is image-only.
 */
router.post('/api/extract-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw Object.assign(new Error('Pilih PDF atau DOCX dulu.'), { status: 400 });
    const name = String(req.file.originalname || '').toLowerCase();
    const looksPdf = name.endsWith('.pdf') && pdfFileSignature(req.file.buffer);
    const looksDocx = name.endsWith('.docx') && docxFileSignature(req.file.buffer);
    if (!looksPdf && !looksDocx) {
      throw Object.assign(new Error('Unggah PDF asli (.pdf) atau Word modern (.docx). File .doc lama perlu dikonversi dahulu.'), { status: 415 });
    }
    const output = looksPdf ? await extractPdfFirstPage(req.file.buffer) : await extractDocxFirstPage(req.file.buffer);
    res.json(output);
  } catch (e) {
    sendError(e, res);
  }
});

router.post('/api/pdf', async (req, res) => {
  try {
    const { data, thickness, style = 'polos', custom_color } = req.body || {};
    const result = await generatePDF(data, thickness, style, custom_color);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="COVER_${safeName(data.nama)}_${String(style).toUpperCase()}_${Number(thickness)}MM.pdf"`);
    res.setHeader('X-Zain-Preflight', 'passed');
    res.setHeader('X-Zain-Warnings', encodeURIComponent(JSON.stringify(result.warnings)));
    res.send(result.bytes);
  } catch (e) {
    sendError(e, res);
  }
});

router.post('/api/pdf-batch', async (req, res) => {
  try {
    const data = req.body?.data;
    if (!data) throw Object.assign(new Error('Data cover belum tersedia.'), { status: 400 });
    const z = new JSZip();
    for (const mm of thicknesses) {
      const result = await generatePDF(data, mm);
      z.file(`COVER_${safeName(data.nama)}_${mm}MM.pdf`, result.bytes);
    }
    const out = await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="COVER_${safeName(data.nama)}_10-28MM.zip"`);
    res.send(out);
  } catch (e) {
    sendError(e, res);
  }
});

/** Batch: exactly one PDF per photo/order, using that order's own thickness. */
router.post('/api/orders/zip', async (req, res) => {
  try {
    const items = validateOrderItems(req.body?.items, thicknesses);
    const archive = new JSZip();
    const report = [];
    for (const order of items) {
      const entry = { nomor: order.nomor, nama: String(order.data.nama || ''), nim: String(order.data.nim || ''), thickness: order.thickness, style: order.style };
      try {
        const pdf = await generatePDF(order.data, order.thickness, order.style, order.custom_color);
        entry.status = 'BERHASIL';
        entry.filename = pdfOrderFileName(order);
        entry.warnings = pdf.warnings || [];
        archive.file(entry.filename, pdf.bytes);
      } catch (error) {
        entry.status = 'GAGAL';
        entry.errors = [String(error.message || 'PDF gagal dibuat').slice(0, 350)];
      }
      report.push(entry);
    }
    const success = report.filter(x => x.status === 'BERHASIL').length;
    if (!success) {
      return res.status(422).json({
        detail: {
          errors: ['Seluruh pesanan gagal membuat PDF. Periksa dan perbaiki data atau ukuran punggung setiap pesanan.'],
          report
        }
      });
    }
    archive.file('LAPORAN_PESANAN.csv', makeBatchReportCSV(report));
    archive.file('LAPORAN_PESANAN.json', JSON.stringify({ version: '4.2', generated_at: new Date().toISOString(), orders: report }, null, 2));
    const archiveBytes = await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 5 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="ZAINNET_PDF_${items.length}_PESANAN.zip"`);
    res.setHeader('X-Zain-Ok-Indexes', report.filter(x => x.status === 'BERHASIL').map(x => x.nomor).join(','));
    res.setHeader('X-Zain-Failed-Indexes', report.filter(x => x.status === 'GAGAL').map(x => x.nomor).join(','));
    res.setHeader('X-Zain-Processed', String(report.length));
    res.send(archiveBytes);
  } catch (error) {
    sendError(error, res);
  }
});

/** Unified export: combined PDF of all orders, separate ZIP, or both in ZIP.
 * A combined PDF may have MIXED PHYSICAL PAGE SIZES. Each page keeps its
 * own MediaBox (plain 480×330 mm, color 475×320 mm).
 */
router.post('/api/orders/export', async (req, res) => {
  try {
    const items = validateOrderItems(req.body?.items, thicknesses);
    const output = String(req.body?.output || 'separate');
    if (!['separate', 'combined', 'both'].includes(output)) {
      throw Object.assign(new Error('Output harus separate, combined, atau both.'), { status: 400 });
    }
    const resultRows = [];
    const files = [];
    for (const order of items) {
      const entry = { nomor: order.nomor, nama: String(order.data.nama || ''), nim: String(order.data.nim || ''), thickness: order.thickness, style: order.style };
      try {
        const pdf = await generatePDF(order.data, order.thickness, order.style, order.custom_color);
        entry.status = 'BERHASIL';
        entry.filename = pdfOrderFileName(order);
        entry.warnings = pdf.warnings || [];
        files.push({ order, bytes: pdf.bytes, name: entry.filename });
      } catch (error) {
        entry.status = 'GAGAL';
        entry.errors = [String(error.message || 'Gagal membuat PDF').slice(0, 350)];
      }
      resultRows.push(entry);
    }
    if (files.length !== items.length) {
      return res.status(422).json({
        detail: {
          errors: [`${items.length - files.length} pesanan tidak lolos pengecekan cetak. Perbaiki sebelum digabung/diunduh.`],
          report: resultRows
        }
      });
    }
    let mergedBytes = null;
    if (output !== 'separate') {
      const merged = await PDFDocument.create();
      for (const f of files) {
        const tmp = await PDFDocument.load(f.bytes);
        const [p] = await merged.copyPages(tmp, [0]);
        merged.addPage(p);
      }
      if (merged.getPageCount() !== items.length) {
        throw Object.assign(new Error('Jumlah halaman gabungan tidak sama dengan jumlah pesanan.'), { status: 422 });
      }
      mergedBytes = Buffer.from(await merged.save({ useObjectStreams: true }));
    }
    if (output === 'combined') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ZAINNET_GABUNG_${files.length}_COVER.pdf"`);
      res.setHeader('X-Zain-Count', String(files.length));
      return res.send(mergedBytes);
    }
    const zip = new JSZip();
    for (const f of files) zip.file(f.name, f.bytes);
    if (mergedBytes) zip.file(`ZAINNET_GABUNG_${files.length}_COVER.pdf`, mergedBytes);
    zip.file('LAPORAN_PESANAN.csv', makeBatchReportCSV(resultRows));
    zip.file('LAPORAN_PESANAN.json', JSON.stringify({ version: '4.2', output, orders: resultRows }, null, 2));
    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 5 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="ZAINNET_${files.length}_COVER_${output.toUpperCase()}.zip"`);
    res.setHeader('X-Zain-Count', String(files.length));
    res.send(out);
  } catch (err) {
    sendError(err, res);
  }
});

router.get('/api/master/:mm', async (req, res) => {
  try {
    const mm = Number(req.params.mm);
    if (!thicknesses.includes(mm)) throw Object.assign(new Error('Template ini tidak tersedia.'), { status: 404 });
    const masterPath = path.join(__dirname, 'assets', 'masters.pdf');
    const input = await fs.readFile(masterPath);
    const src = await PDFDocument.load(input);
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [calibration[mm].page]);
    out.addPage(page);
    res.type('application/pdf').send(Buffer.from(await out.save()));
  } catch (e) {
    sendError(e, res);
  }
});

export { router as hardCoverRouter };
