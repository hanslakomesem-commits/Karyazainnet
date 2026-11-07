import express from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';

/**
 * Measures a real rendered DOCX with LibreOffice. No character/word-count guess.
 * LibreOffice must be installed in the Node hosting environment.
 * Limits prevent unlimited public conversion concurrency and large uploads.
 */
export const journalPageCountRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1 } });
const execFileAsync = promisify(execFile);
let activeConversions = 0;

journalPageCountRouter.post('/', upload.single('article'), async (req: any, res: any) => {
  if (!req.file || !/\.docx$/i.test(req.file.originalname) ||
      req.file.buffer.length < 200 || req.file.buffer.toString('latin1', 0, 2) !== 'PK') {
    return res.status(400).json({ error: 'Unggah berkas Word .docx yang valid.' });
  }
  if (activeConversions >= 2) return res.status(429).json({ error: 'Pengukuran halaman sedang sibuk.' });
  activeConversions++;
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'zain-journal-pages-'));
  try {
    const docxPath = path.join(temp, 'artikel.docx');
    const pdfPath = path.join(temp, 'artikel.pdf');
    const profile = path.join(temp, 'lo-profile');
    await fs.writeFile(docxPath, req.file.buffer, { flag: 'wx' });
    await execFileAsync(process.env.LIBREOFFICE_BIN || 'libreoffice', [
      '-env:UserInstallation=' + `file://${profile}`,
      '--headless', '--convert-to', 'pdf:writer_pdf_Export', '--outdir', temp, docxPath,
    ], { timeout: 45000, maxBuffer: 512 * 1024 });
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath), { ignoreEncryption: true });
    const pageCount = pdf.getPageCount();
    if (!pageCount || pageCount > 300) throw new Error('Jumlah halaman di luar batas pengukuran.');
    return res.json({ pageCount, measured: true, engine: 'LibreOffice' });
  } catch (err: any) {
    console.error('Link7 page measure:', err?.message);
    // Failure is explicit: client must NOT pretend this is a measured page count.
    return res.status(503).json({ measured: false, error: 'Pengukuran halaman Word tidak tersedia pada server. Instal LibreOffice atau periksa layanan konversi.' });
  } finally {
    activeConversions--;
    await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
  }
});
