import express from 'express';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import fsPromises from 'node:fs/promises';
import multer from 'multer';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';
import { journalPageCountRouter } from './pageCount.ts';
import { findJournalMaster, journalTemplateInstruction } from '../../src/journalConverter/data/journalTemplatesCatalog.ts';
import { detectResearchMethodology, extractBab3FromThesis, type MethodologyDetectionResult } from '../../src/journalConverter/utils/textCleaner.ts';
import { isSuspiciousFilenameTitle, isValidThesisTitle, extractMetadataFromSkripsiText } from '../../src/journalConverter/components/SkripsiUploader.tsx';

// Helper function to robustly extract text from PDF buffers supporting pdfjs-dist and pdf-parse
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Strategy 1: Use pdfjs-dist legacy build (fastest, supports large documents 100-200+ pages)
  try {
    const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => null);
    if (pdfjsLib && typeof pdfjsLib.getDocument === 'function') {
      const uint8 = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({
        data: uint8,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
      });

      const pdfDocument = await Promise.race([
        loadingTask.promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timeout (30s)')), 30000)
        ),
      ]);

      const numPages = pdfDocument.numPages;
      const pageTexts: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        let page: any = null;
        try {
          const pagePromise = pdfDocument.getPage(i);
          page = await Promise.race([
            pagePromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout getPage ${i}`)), 3000)
            ),
          ]);

          const textContent: any = await Promise.race([
            page.getTextContent(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout getTextContent ${i}`)), 3000)
            ),
          ]);

          const pageStr = (textContent?.items || [])
            .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
            .filter(Boolean)
            .join(' ');
          if (pageStr.trim().length > 0) {
            pageTexts.push(pageStr);
          }
        } catch (pageErr) {
          console.warn(`[PDF Parser] Warning on page ${i} (skipped):`, pageErr);
        } finally {
          if (page && typeof page.cleanup === 'function') {
            try { page.cleanup(); } catch (_) {}
          }
        }
      }

      try {
        if (pdfDocument && typeof pdfDocument.cleanup === 'function') {
          pdfDocument.cleanup();
        }
        if (pdfDocument && typeof pdfDocument.destroy === 'function') {
          pdfDocument.destroy();
        }
      } catch (_) {}

      const combinedText = pageTexts.join('\n\n');
      if (combinedText && combinedText.trim().length >= 30) {
        return combinedText;
      }
    }
  } catch (pdfjsErr) {
    console.warn('[PDF Parser] pdfjs-dist strategy failed, falling back:', pdfjsErr);
  }

  // Strategy 2: pdf-parse module fallback
  try {
    const pdfModule: any = await import('pdf-parse').then((m: any) => m?.default || m).catch(() => null);

    if (pdfModule) {
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const res = await parser.getText();
        if (res?.text && res.text.trim().length > 30) return res.text;
      }
      if (typeof pdfModule === 'function') {
        const res = await pdfModule(buffer);
        if (res?.text && res.text.trim().length > 30) return res.text;
      }
    }
  } catch (pdfParseErr) {
    console.warn('[PDF Parser] pdf-parse strategy failed:', pdfParseErr);
  }

  // Strategy 3: Direct text stream extraction fallback from raw buffer
  try {
    const rawBufferStr = buffer.toString('latin1');
    const textMatches = rawBufferStr.match(/\(([^()]+)\)\s*Tj/g);
    if (textMatches && textMatches.length > 20) {
      return textMatches.map((m) => m.replace(/[()]/g, '').replace(/\s*Tj$/, '')).join(' ');
    }
  } catch (rawErr) {
    console.warn('[PDF Parser] Raw string extraction failed:', rawErr);
  }

  throw new Error('Tidak dapat mengekstrak teks dari PDF ini. Pastikan file PDF bukan hasil scan murni tanpa teks/OCR.');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for 130+ page skripsi documents
});

const router = express.Router();
router.use('/count-pages', journalPageCountRouter);
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize Gemini client server-side ONLY
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Candidate models in default order for high availability and current API support
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
];

// Helper to safely extract raw text from Gemini API response
function getTextFromResponse(response: any): string {
  if (!response) return '';
  if (typeof response.text === 'string') return response.text;
  if (typeof response.text === 'function') {
    try {
      const res = response.text();
      if (typeof res === 'string') return res;
    } catch {}
  }
  if (response.candidates?.[0]?.content?.parts) {
    return response.candidates[0].content.parts.map((p: any) => p.text || '').join('');
  }
  return '';
}

// Helper to safely parse JSON from AI response, removing markdown code fences if present
function safeJsonParse(rawText: string, fallback: any = {}): any {
  if (!rawText || typeof rawText !== 'string') return fallback;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    console.error('Failed to parse JSON from AI output:', cleaned.slice(0, 300));
    throw new Error('Respon AI tidak dapat diuraikan sebagai format JSON yang valid.');
  }
}

// Robust wrapper with automatic exponential backoff retry and multi-model fallback
async function generateContentWithFallback(params: {
  contents: string;
  config?: any;
  model?: string;
  maxRetriesPerModel?: number;
}): Promise<any> {
  const { contents, config, model: requestedModel, maxRetriesPerModel = 2 } = params;
  let lastError: any = null;

  // Prioritize requested model first if provided, followed by candidate models
  const targetModels: string[] = [];
  if (requestedModel && requestedModel.trim()) {
    targetModels.push(requestedModel.trim());
  }
  for (const m of CANDIDATE_MODELS) {
    if (!targetModels.includes(m)) {
      targetModels.push(m);
    }
  }

  for (const modelName of targetModels) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini API] Trying model "${modelName}" (attempt ${attempt}/${maxRetriesPerModel})...`);
        const callPromise = ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });

        // Model pilihan utama tetap memiliki batas 120 detik untuk artikel panjang.
        // Batas model CADANGAN lebih singkat agar fallback yang menggantung tidak menahan seluruh proses.
        const timeoutMs = modelName === targetModels[0] ? 120000 : 75000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Koneksi model Gemini melebihi batas waktu (timeout).')), timeoutMs)
        );

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        const textContent = getTextFromResponse(response);

        if (textContent && textContent.trim().length > 0) {
          console.log(`[Gemini API] Success using model "${modelName}".`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || JSON.stringify(err);
        console.warn(`[Gemini API] Warning on model "${modelName}" (attempt ${attempt}):`, errMessage);

        // Immediate stop for monthly spending cap / billing issues (no point in retrying)
        if (
          errMessage.includes('monthly spending cap') ||
          errMessage.includes('exceeded its monthly spending cap') ||
          errMessage.includes('ai.studio/spend')
        ) {
          throw new Error(
            'Proyek Google AI Studio / Gemini API Anda telah mencapai batas pengeluaran bulanan (Monthly Spending Cap Exceeded). Silakan buka https://ai.studio/spend untuk mengatur batas pengeluaran proyek Anda.'
          );
        }

        // If model not found or deprecated, immediately switch to next model without wasting retries
        if (
          errMessage.includes('404') ||
          errMessage.includes('NOT_FOUND') ||
          errMessage.includes('no longer available') ||
          errMessage.includes('is not found')
        ) {
          console.log(`[Gemini API] Model "${modelName}" not available, switching to next candidate model.`);
          break;
        }

        // If model is experiencing temporary high-demand (503 UNAVAILABLE), immediately try next candidate model
        if (
          errMessage.includes('503') ||
          errMessage.includes('high demand') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('overloaded')
        ) {
          if (attempt < maxRetriesPerModel) {
            const delayMs = 1200 * attempt;
            console.log(`[Gemini API] 503 pada "${modelName}", coba ulang model yang sama dalam ${delayMs}ms sebelum pindah model.`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          console.log(`[Gemini API] Model "${modelName}" tetap sibuk; gunakan model cadangan.`);
          break;
        }

        // Kuota harian nol tidak akan pulih dengan mengulang model yang sama.
        if ((errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED')) &&
            (/limit:\s*0\b|per day limit exceeded|retry in \d+h/i.test(errMessage))) {
          console.log(`[Gemini API] Kuota model "${modelName}" tidak tersedia; jangan buang waktu retry.`);
          break;
        }

        const isUnavailableOrRateLimited =
          errMessage.includes('429') ||
          errMessage.includes('RESOURCE_EXHAUSTED') ||
          errMessage.includes('fetch failed') ||
          errMessage.includes('ECONNRESET') ||
          errMessage.includes('ETIMEDOUT');

        if (attempt < maxRetriesPerModel && isUnavailableOrRateLimited) {
          const delayMs = attempt * 1500;
          console.log(`[Gemini API] Waiting ${delayMs}ms before retrying "${modelName}"...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else if (!isUnavailableOrRateLimited) {
          // Non-retriable error on this model, try next candidate
          break;
        }
      }
    }
  }

  // If all candidate models failed
  console.error('[Gemini API] All fallback models exhausted:', lastError);
  const finalErrMsg = lastError?.message || JSON.stringify(lastError);
  if (finalErrMsg.includes('spending cap') || finalErrMsg.includes('RESOURCE_EXHAUSTED')) {
    throw new Error(
      'Batas kuota / pengeluaran API tercapai (Spending Cap Exceeded). Silakan periksa pengaturan kuota di https://ai.studio/spend atau coba lagi nanti.'
    );
  }

  throw new Error(
    `Layanan AI sedang mengalami kendala sementara (${finalErrMsg.slice(0, 150)}...). Silakan klik tombol Generate kembali.`
  );
}

// ZAINNET_LINK7_AUTO_PDF_FROM_WORD_20261111
// Convert an uploaded original DOCX into a real PDF using LibreOffice.
// Files live in an isolated temp directory and are always deleted afterward.
const zipPdfExecFile = promisify(execFile);
const zipPdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
let activeZipPdfConversion = 0;
const zipPdfUsage = new Map<string, { count: number; expires: number }>();

router.post('/docx-to-pdf', (req, res) => {
  zipPdfUpload.single('file')(req, res, async (uploadErr: any) => {
    if (uploadErr) return res.status(413).json({ error: 'File Word terlalu besar (maksimal 25 MB) atau unggahan tidak valid.' });
    const file = req.file;
    if (!file || !/\.docx$/i.test(file.originalname) || file.buffer.length < 200 ||
        file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b ||
        file.buffer[2] !== 0x03 || file.buffer[3] !== 0x04) {
      return res.status(400).json({ error: 'Unggah file Word .docx asli, bukan file yang diubah ekstensinya.' });
    }
    const ip = String(req.ip || 'unknown');
    const now = Date.now();
    // Opportunistic expiry cleanup avoids an unbounded map on public endpoints.
    if (zipPdfUsage.size > 2000) {
      for (const [key, item] of zipPdfUsage) if (item.expires <= now) zipPdfUsage.delete(key);
    }
    const record = zipPdfUsage.get(ip);
    const usage = record && record.expires > now ? record : { count: 0, expires: now + 15 * 60_000 };
    if (usage.count >= 20) {
      return res.status(429).json({ error: 'Batas konversi tercapai. Coba lagi nanti.' });
    }
    if (activeZipPdfConversion >= 1) {
      return res.status(429).json({ error: 'Konverter PDF sedang digunakan. Ulangi beberapa saat lagi.' });
    }
    usage.count++;
    zipPdfUsage.set(ip, usage);
    activeZipPdfConversion++;
    let dir: string | null = null;
    try {
      dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'zainnet-word-to-pdf-'));
      const inputPath = path.join(dir, 'document.docx');
      let outputPath = path.join(dir, 'document.pdf');
      const profile = path.join(dir, 'lo-user-profile');
      await fsPromises.writeFile(inputPath, file.buffer, { flag: 'wx' });
      // ZAINNET_LINK7_AUTOHEAL_DOCX_PDF_20261111
      // Never touch the uploaded Word. Only convert the temporary repaired copy.
      let conversionInput = inputPath;
      let autoFixedCount = 0;
      try {
        const repairScript = path.join(process.cwd(), 'server', 'journal7', 'auto_repair.py');
        const repairOutput = path.join(dir, 'document-autofix.docx');
        const repairRun = await zipPdfExecFile('python3', [repairScript, inputPath, repairOutput], {
          timeout: 20_000, maxBuffer: 64 * 1024, killSignal: 'SIGKILL',
        });
        const repairResult = JSON.parse(repairRun.stdout.trim() || '{}');
        if (Number(repairResult.repaired) > 0) {
          await fsPromises.access(repairOutput);
          conversionInput = repairOutput;
          outputPath = path.join(dir, 'document-autofix.pdf');
          autoFixedCount = Number(repairResult.repaired);
          console.info(`[ZAIN.NET Link7 AutoHeal] corrected ${autoFixedCount} textboxes in temporary PDF source`);
        }
      } catch (repairError: any) {
        // The existing original-DOCX conversion remains available if repair fails.
        console.warn('[ZAIN.NET Link7 AutoHeal] repair skipped:', repairError?.message || repairError);
      }
      await zipPdfExecFile(process.env.LIBREOFFICE_BIN || 'libreoffice', [
        '-env:UserInstallation=file://' + profile,
        '--headless', '--nologo', '--nodefault', '--nofirststartwizard',
        '--convert-to', 'pdf:writer_pdf_Export', '--outdir', dir, conversionInput,
      ], { timeout: 115_000, maxBuffer: 512 * 1024, killSignal: 'SIGKILL' });
      const pdf = await fsPromises.readFile(outputPath);
      if (pdf.length < 500 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new Error('LibreOffice tidak menghasilkan PDF valid.');
      }
      res.setHeader('X-Zainnet-AutoFixed', String(autoFixedCount));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(pdf);
    } catch (err: any) {
      console.error('[ZAIN.NET Link7 DOCX→PDF]', err?.message || err);
      if (!res.headersSent) {
        return res.status(503).json({ error: 'Konversi Word ke PDF gagal di Render: ' + String(err?.message || 'periksa LibreOffice').slice(0, 180) });
      }
    } finally {
      activeZipPdfConversion = Math.max(0, activeZipPdfConversion - 1);
      if (dir) await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});


// ZAINNET_LINK7_DUA_MODE_TEMPLATE_V1
// Save browser-formatted master-journal DOCX through server LibreOffice.
// Only intermediate DOCX is accepted. The uploaded original thesis is not modified.
router.post('/normalize-template', (req, res) => {
  zipPdfUpload.single('file')(req, res, async (uploadErr: any) => {
    if (uploadErr) return res.status(413).json({ error: 'Dokumen template maksimal 25 MB.' });
    const templateId = String(req.body?.template_id || '');
    if (!findJournalMaster(templateId)) return res.status(400).json({ error: 'Master jurnal tidak dikenal.' });
    const file = req.file;
    if (!file || !/\.docx$/i.test(file.originalname) || file.buffer.length < 1024 ||
      file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b || file.buffer[2] !== 0x03 || file.buffer[3] !== 0x04) {
      return res.status(400).json({ error: 'DOCX sementara tidak valid.' });
    }
    const ip = String(req.ip || 'unknown');
    const now = Date.now();
    const recent = zipPdfUsage.get(ip);
    const usage = recent && recent.expires > now ? recent : { count: 0, expires: now + 15 * 60_000 };
    if (usage.count >= 20 || activeZipPdfConversion >= 1) {
      return res.status(429).json({ error: 'Konverter sibuk atau kuota sementara terpenuhi. Coba kembali.' });
    }
    usage.count++;
    zipPdfUsage.set(ip, usage);
    activeZipPdfConversion++;
    let dir: string | null = null;
    try {
      dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'zainnet-template-final-'));
      const src = path.join(dir, 'article_draft.docx');
      const out = path.join(dir, 'final');
      await fsPromises.mkdir(out);
      await fsPromises.writeFile(src, file.buffer, { flag: 'wx' });
      await zipPdfExecFile(process.env.LIBREOFFICE_BIN || 'libreoffice', [
        '-env:UserInstallation=file://' + path.join(dir, 'profile'),
        '--headless', '--nologo', '--nodefault', '--nofirststartwizard',
        '--convert-to', 'docx:Office Open XML Text', '--outdir', out, src,
      ], { timeout: 110_000, maxBuffer: 512 * 1024, killSignal: 'SIGKILL' });
      const result = await fsPromises.readFile(path.join(out, 'article_draft.docx'));
      if (result.length < 1024 || result[0] !== 0x50 || result[1] !== 0x4b) {
        throw new Error('LibreOffice tidak menghasilkan DOCX normal.');
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(result);
    } catch (error: any) {
      console.error('[Link7 Journal Master Normalize]', error?.message || error);
      if (!res.headersSent) return res.status(503).json({ error: 'Normalisasi jurnal gagal: ' + String(error?.message || error).slice(0, 160) });
    } finally {
      activeZipPdfConversion = Math.max(0, activeZipPdfConversion - 1);
      if (dir) await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

// Health check endpoint
router.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. File Upload Handler Endpoint (Extract text from PDF, DOCX, TXT)
router.post(['/upload-skripsi', '/api/upload-skripsi'], (req, res) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ error: `Gagal mengunggah file: ${err.message || 'Error upload file'}` });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
      }

      const { originalname, mimetype, buffer } = req.file;
      let extractedText = '';

      if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
        extractedText = await extractPdfText(buffer);
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword' ||
        originalname.toLowerCase().endsWith('.docx') ||
        originalname.toLowerCase().endsWith('.doc')
      ) {
        const mammothLib: any = (mammoth as any)?.default || mammoth;
        const docxResult = await mammothLib.extractRawText({ buffer });
        extractedText = docxResult.value || '';
      } else if (mimetype === 'text/plain' || originalname.toLowerCase().endsWith('.txt')) {
        extractedText = buffer.toString('utf-8');
      } else {
        return res.status(400).json({
          error: 'Format file tidak didukung. Harap unggah file PDF, DOCX, atau TXT.',
        });
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          error: 'Teks dari file skripsi tidak dapat diekstrak atau file kosong.',
        });
      }

      const detectedMetadata = extractMetadataFromSkripsiText(extractedText, originalname);

      res.json({
        fileName: originalname,
        fileSize: req.file.size,
        textLength: extractedText.length,
        extractedText: extractedText,
        detectedMetadata: detectedMetadata,
      });
    } catch (error: any) {
      console.error('Error parsing skripsi file:', error);
      res.status(500).json({
        error: 'Gagal membaca isi file skripsi: ' + (error.message || 'Error tidak diketahui'),
      });
    }
  });
});

// Methodology and chapter extraction utilities imported at top

// --- SMART THESIS SEGMENTATION & TOKEN SAVER ---
// Memisahkan bab skripsi, mengisolasi Bab III secara presisi, dan mendeteksi jenis metodologi asli skripsi
interface ThesisSegments {
  frontMatterAndBab123: string;
  bab1Pendahuluan: string;
  bab2TinjauanPustaka: string;
  bab3Metode: string;
  bab4HasilPembahasan: string;
  bab5DanPustaka: string;
  detectedMethodType: 'kualitatif' | 'kuantitatif' | 'pustaka' | 'rnd' | 'campuran';
  methodologyDetails: string;
}

function cleanThesisNoise(text: string): string {
  if (!text) return '';
  
  // 1. Potong lampiran mentah berlebih setelah Daftar Pustaka (kuesioner, output spss mentah ratusan halaman)
  const lampiranMatch = text.search(/\n\s*(LAMPIRAN|Lampiran\s+[A-Z0-9]|KUESIONER|KUISIONER|ANGKET PENELITIAN)/i);
  let cleaned = text;
  if (lampiranMatch !== -1 && lampiranMatch > text.length * 0.4) {
    // Pastikan lampiran berada di bagian belakang (setelah 40% teks)
    cleaned = text.substring(0, lampiranMatch + 2000); // Sisakan sedikit konteks jika ada daftar pustaka di dekatnya
  }

  return cleaned;
}

function segmentThesisText(rawText: string, userMethodPreference?: string): ThesisSegments {
  const cleaned = cleanThesisNoise(rawText);

  // Helper to find chapter start, skipping Table of Contents entries (dotted lines/page numbers)
  const findChapterIndex = (regex: RegExp, minPos = 0): number => {
    const matches = [...cleaned.matchAll(new RegExp(regex.source, 'gi'))];
    for (const match of matches) {
      if (match.index === undefined || match.index < minPos) continue;
      const lineStart = cleaned.lastIndexOf('\n', match.index);
      const lineEnd = cleaned.indexOf('\n', match.index + match[0].length);
      const line = cleaned.slice(lineStart === -1 ? 0 : lineStart, lineEnd === -1 ? cleaned.length : lineEnd);
      
      // Skip if line ends with dots/numbers typical of Daftar Isi
      if (/\.{3,}\s*\d+/.test(line) || /—{3,}\s*\d+/.test(line) || /\t\s*\d+\s*$/.test(line)) {
        continue;
      }
      // Skip if clearly in DAFTAR ISI block
      const prevContext = cleaned.slice(Math.max(0, match.index - 600), match.index);
      if (/DAFTAR\s+ISI/i.test(prevContext) && (/\.{2,}/.test(prevContext) || /HALAMAN/i.test(prevContext))) {
        continue;
      }
      return match.index;
    }
    return -1;
  };

  const bab1Index = findChapterIndex(/(?:\n|^)\s*(?:BAB\s+(?:I|1)\b[^\n]*|PENDAHULUAN\s*(?:\r?\n|$))/);
  const bab2Index = findChapterIndex(/(?:\n|^)\s*(?:BAB\s+(?:II|2)\b[^\n]*|(?:TINJAUAN\s+PUSTAKA|LANDASAN\s+TEORI|KAJIAN\s+PUSTAKA)\s*(?:\r?\n|$))/, bab1Index !== -1 ? bab1Index + 100 : 0);
  const bab3Index = findChapterIndex(/(?:\n|^)\s*(?:BAB\s+(?:III|3)\b[^\n]*|(?:METODE|METODOLOGI)\s+PENELITIAN\s*(?:\r?\n|$)|METODE\s+PENELITIAN\s+HUKUM|PROSEDUR\s+PENELITIAN)/, bab2Index !== -1 ? bab2Index + 100 : 0);
  const bab4Index = findChapterIndex(/(?:\n|^)\s*(?:BAB\s+(?:IV|4)\b[^\n]*|(?:HASIL\s+DAN\s+PEMBAHASAN|HASIL\s+PENELITIAN)\s*(?:\r?\n|$))/, bab3Index !== -1 ? bab3Index + 100 : 0);
  const bab5Index = findChapterIndex(/(?:\n|^)\s*(?:BAB\s+(?:V|5)\b[^\n]*|(?:KESIMPULAN\s+DAN\s+SARAN|KESIMPULAN|PENUTUP)\s*(?:\r?\n|$))/, bab4Index !== -1 ? bab4Index + 100 : 0);
  const daftarPustakaIndex = findChapterIndex(/(?:\n|^)\s*(?:DAFTAR\s+PUSTAKA|REFERENSI|BIBLIOGRAPHY|DAFTAR\s+RUJUKAN)\s*(?:\r?\n|$)/, bab4Index !== -1 ? bab4Index + 100 : 0);

  const totalLen = cleaned.length;
  let part1 = '';
  let bab1Text = '';
  let bab2Text = '';
  let bab3Text = '';
  let part2 = '';
  let part3 = '';

  // Extract explicit Bab 3 text
  if (bab3Index !== -1 && bab4Index !== -1 && bab4Index > bab3Index) {
    bab3Text = cleaned.substring(bab3Index, bab4Index).trim();
  } else if (bab3Index !== -1) {
    bab3Text = cleaned.substring(bab3Index, Math.min(totalLen, bab3Index + 30000)).trim();
  } else {
    bab3Text = extractBab3FromThesis(cleaned);
  }

  if (bab1Index !== -1 && bab2Index !== -1 && bab2Index > bab1Index) {
    bab1Text = cleaned.substring(bab1Index, bab2Index).trim();
  }
  if (bab2Index !== -1 && bab3Index !== -1 && bab3Index > bab2Index) {
    bab2Text = cleaned.substring(bab2Index, bab3Index).trim();
  }

  if (bab4Index !== -1) {
    // ALWAYS start from index 0 so Cover, Lembar Pengesahan, and Abstrak are 100% preserved
    const start1 = 0;
    part1 = cleaned.substring(start1, bab4Index).trim();

    if (bab5Index !== -1 && bab5Index > bab4Index) {
      part2 = cleaned.substring(bab4Index, bab5Index).trim();
      part3 = cleaned.substring(bab5Index).trim();
    } else if (daftarPustakaIndex !== -1 && daftarPustakaIndex > bab4Index) {
      part2 = cleaned.substring(bab4Index, daftarPustakaIndex).trim();
      part3 = cleaned.substring(daftarPustakaIndex).trim();
    } else {
      part2 = cleaned.substring(bab4Index).trim();
      part3 = cleaned.substring(Math.max(bab4Index, totalLen - 15000)).trim();
    }
  } else {
    part1 = cleaned.substring(0, Math.floor(totalLen * 0.55));
    part2 = cleaned.substring(Math.floor(totalLen * 0.35), Math.floor(totalLen * 0.85));
    part3 = cleaned.substring(Math.floor(totalLen * 0.70));
  }

  // Detect methodology from full text and extracted Bab III
  const detected = detectResearchMethodology(cleaned, bab3Text, userMethodPreference);

  return {
    frontMatterAndBab123: part1 || cleaned.slice(0, 30000),
    bab1Pendahuluan: bab1Text,
    bab2TinjauanPustaka: bab2Text,
    bab3Metode: bab3Text,
    bab4HasilPembahasan: part2 || cleaned.slice(Math.floor(totalLen * 0.3), Math.floor(totalLen * 0.8)),
    bab5DanPustaka: part3 || cleaned.slice(Math.floor(totalLen * 0.7)),
    detectedMethodType: detected.methodType,
    methodologyDetails: detected.explanation,
  };
}

// Helper: Generate student email in format: [namamahasiswa][4digitacak]@gmail.com
function generateStudentEmail(name?: string, currentEmail?: string): string {
  // If user already specified an email with 4 digits and @gmail.com, validate and retain
  if (currentEmail && currentEmail.trim() && currentEmail !== '-' && currentEmail.includes('@gmail.com')) {
    const userPart = currentEmail.split('@')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/\d{4}$/.test(userPart)) {
      return `${userPart}@gmail.com`;
    }
  }

  // Clean author name: remove academic titles (S.E., S.Kom., M.M., Dr., Prof., etc.), punctuation, and spaces
  const rawName = (name || '').trim();
  const cleanName = rawName
    .replace(/(S\.[A-Za-z.]+|M\.[A-Za-z.]+|Dr\.|Prof\.|Ph\.D|M\.Sc|S\.Pd|S\.H|S\.Sos|S\.Si|S\.T|S\.Ked|S\.Psi|M\.M|M\.Si)/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();

  const random4Digits = Math.floor(1000 + Math.random() * 9000);
  const baseUser = cleanName && cleanName.length >= 3 ? cleanName : 'mahasiswa';
  return `${baseUser}${random4Digits}@gmail.com`;
}

// Helper: Remove English explanatory phrases in parentheses or asterisks added after Indonesian words (e.g. *good corporate governance*, (*good corporate governance*), etc.)
function cleanEnglishParenthesesClarifications(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Common English explanatory phrases often placed in parentheses or asterisks to clarify Indonesian academic terms
  const commonExplanations = [
    'good corporate governance',
    'corporate governance',
    'corporate social responsibility',
    'return on assets',
    'return on equity',
    'earning per share',
    'earnings per share',
    'capital adequacy ratio',
    'net interest margin',
    'non performing loan',
    'non performing financing',
    'price to book value',
    'price earning ratio',
    'current ratio',
    'quick ratio',
    'debt to equity ratio',
    'debt to asset ratio',
    'total asset turnover',
    'firm value',
    'firm size',
    'financial performance',
    'financial distress',
    'tax avoidance',
    'tax aggressiveness',
    'capital structure',
    'audit quality',
    'audit tenure',
    'earnings management',
    'intellectual capital',
    'human capital',
    'structural capital',
    'customer capital',
    'relational capital',
    'job satisfaction',
    'organizational commitment',
    'work engagement',
    'employee performance',
    'turnover intention',
    'organizational citizenship behavior',
    'brand awareness',
    'brand image',
    'brand loyalty',
    'customer satisfaction',
    'purchase decision',
    'repurchase intention',
    'service quality',
    'word of mouth',
    'digital marketing',
    'social media marketing',
    'supply chain management',
    'total quality management',
    'competitive advantage',
    'resource-based view',
    'resource based view',
    'agency theory',
    'stewardship theory',
    'signaling theory',
    'stakeholder theory',
    'legitimacy theory',
    'technology acceptance model',
    'theory of planned behavior',
    'theory of reasoned action',
    'research gap',
    'research gaps',
    'novelty',
    'state of the art',
    'sampling technique',
    'sampling techniques',
    'sampling method',
    'purposive sampling',
    'simple random sampling',
    'stratified random sampling',
    'convenience sampling',
    'snowball sampling',
    'cluster sampling',
    'conceptual framework',
    'research framework',
    'theoretical framework',
    'research limitations',
    'research limitation',
    'limitations',
    'future research',
    'reliability test',
    'validity test',
    'grand theory',
    'middle-range theory',
    'middle range theory',
    'applied theory',
    'data analysis',
    'background',
    'discussion',
    'conclusion',
    'hypothesis',
    'hypotheses',
    'findings',
    'literature review',
    'variable',
    'variables',
    'indicators',
    'sample size',
    'population',
    'goodness of fit',
    'path analysis',
    'outer model',
    'inner model',
    'convergent validity',
    'discriminant validity',
    'composite reliability',
    'average variance extracted',
    'previous research',
    'prior studies',
    'empirical study',
    'case study',
    'adjusted r square',
    'r square',
    'f count',
    't count',
    'p-value',
    'significance value',
    'coefficient of determination',
    'practical implications',
    'managerial implications',
    'theoretical implications',
  ];

  for (const term of commonExplanations) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matches: (term), (*term*), *(term)*, *term*
    const regexParens = new RegExp(`\\s*\\(\\s*\\*?\\s*${escaped}\\s*\\*?\\s*\\)`, 'gi');
    cleaned = cleaned.replace(regexParens, '');

    const regexAsterisks = new RegExp(`\\s*\\*+\\s*${escaped}\\s*\\*+`, 'gi');
    cleaned = cleaned.replace(regexAsterisks, '');
  }

  // Remove any leftover pattern like (*english words*) or (english words) with asterisk
  cleaned = cleaned.replace(/\s*\(\s*\*+[a-zA-Z\s\-]{3,60}\*+\s*\)/g, '');

  return cleaned;
}

// Helper: Clean leading duplicate section headers so content starts directly with body sentences
function cleanSectionContent(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Heading patterns at the start of section content (e.g. C. HASIL PENELITIAN, D. PEMBAHASAN, etc.)
  const headingPatterns = [
    /^\s*(?:#+\s*)?(?:\*{1,3})?\s*(?:(?:BAGIAN|BAB|[A-E])[\.\:]\s*)?(?:HASIL(?:\s+DAN)?\s+PEMBAHASAN|HASIL\s+PENELITIAN|HASIL|PEMBAHASAN|METODE(?:\s+PENELITIAN)?|PENDAHULUAN|KESIMPULAN(?:\s+DAN\s+SARAN)?|RINGKASAN|ABSTRAK|ABSTRACT)\s*(?:\*{1,3})?\s*[:\.\-–—]?\s*(?:\r?\n+|$)/i,
    /^\s*(?:#+\s*)?(?:\*{1,3})?\s*[A-E]\.\s+[A-Za-z\s]{3,40}(?:\*{1,3})?\s*[:\.\-–—]?\s*(?:\r?\n+|$)/i,
    /^\s*(?:C\.?\s*(?:Hasil\s+Penelitian|Hasil\s+dan\s+Pembahasan|Hasil)|D\.?\s*(?:Hasil\s+Pembahasan|Pembahasan|Pembahasan\s+Hasil\s+Penelitian)|A\.?\s*Pendahuluan|B\.?\s*Metode\s*Penelitian|E\.?\s*(?:Kesimpulan\s*dan\s*Saran|Kesimpulan))\s*[:\.\-–—]?\s*(?:\r?\n+|$)/i,
  ];

  let matched = true;
  let iterations = 0;
  while (matched && iterations < 5) {
    matched = false;
    iterations++;
    for (const pattern of headingPatterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        matched = true;
      }
    }
  }

  // Remove any remaining prefix matching "C. Hasil penelitian:" or similar inline at the very beginning
  cleaned = cleaned.replace(/^(?:[A-E]\.\s*(?:Hasil\s+Penelitian|Pembahasan|Metode\s+Penelitian|Pendahuluan|Kesimpulan(?:\s+dan\s+Saran)?)\s*[:\.\-–—]\s*)/i, '').trim();

  return cleanEnglishParenthesesClarifications(cleaned);
}

// 2. Multi-Stage Scientific Journal Article Endpoints (To avoid JSON output truncation and ensure deep 18-page academic quality)

// Helper: Run Stage 1 (Metadata, Abstract, Pendahuluan, Metode) - TARGET TEPAT HALAMAN 1-6 (STANDAR 18 HALAMAN)
async function runStage1(
  ai: any,
  rawText: string,
  metadata: any,
  targetLengthPages: number = 18,
  selectedModel?: string,
  userMethodPreference?: string,
  journalTemplateId?: string
) {
  const segments = segmentThesisText(rawText, userMethodPreference);
  const formattedAuthorEmail = generateStudentEmail(metadata?.nama, metadata?.email);
  const targetMethod = segments.detectedMethodType;
  const isClientTitleValid = metadata?.judul && !isSuspiciousFilenameTitle(metadata.judul);

  let methodInstruction = '';
  if (targetMethod === 'kualitatif') {
    methodInstruction = `
*** ATURAN MUTLAK: METODOLOGI SKRIPSI ASLI TERDETEKSI / DITENTUKAN SEBAGAI: KUALITATIF ***
- BAGIAN B. METODE PENELITIAN PADA ARTIKEL JURNAL WAJIB 100% KUALITATIF SESUAI BAB III SKRIPSI!
- DILARANG KERAS memuat istilah kuantitatif seperti: kuesioner angka, rumus Slovin, skala Likert angka, uji asumsi klasik (normalitas, multikolinearitas, heteroskedastisitas), analisis regresi linier / berganda, uji t, uji F, SEM-PLS, atau Cronbach's Alpha!
- WAJIB MENJABARKAN SECARA LENGKAP DALAM 5-7 PARAGRAF OPERASIONAL (~800 - 1.000 KATA):
  1. Pendekatan dan jenis penelitian kualitatif (misal: studi kasus deskriptif, fenomenologi, etnografi, grounded theory, atau naratif) persis seperti di Bab III skripsi asli.
  2. Lokasi penelitian, kehadiran peneliti sebagai instrumen kunci, dan subjek/informan penelitian (kriteria key informants, informan utama, informan pendukung).
  3. Teknik pengumpulan data kualitatif: wawancara mendalam (in-depth interview), observasi partisipatif langsung di lapangan, studi dokumentasi, dan Focus Group Discussion (FGD).
  4. Pengujian keabsahan data kualitatif: triangulasi sumber, triangulasi teknik, triangulasi waktu, perpanjangan keikutsertaan pengamatan, ketekunan pengamatan, dan member check.
  5. Teknik analisis data kualitatif: model interaktif Miles & Huberman (reduksi data / kondensasi data, penyajian data / display data, dan penarikan kesimpulan / verifikasi) atau analisis tematik.
`;
  } else if (targetMethod === 'pustaka') {
    methodInstruction = `
*** ATURAN MUTLAK: METODOLOGI SKRIPSI ASLI TERDETEKSI / DITENTUKAN SEBAGAI: STUDI PUSTAKA / KAJIAN LITERATUR / YURIDIS NORMATIF ***
- BAGIAN B. METODE PENELITIAN PADA ARTIKEL JURNAL WAJIB 100% STUDI PUSTAKA / YURIDIS NORMATIF SESUAI BAB III SKRIPSI!
- DILARANG KERAS mengarang responden/narasumber manusia kuesioner, sampel rumus Slovin, atau uji statistik angka!
- WAJIB MENJABARKAN SECARA LENGKAP DALAM 5-7 PARAGRAF OPERASIONAL (~800 - 1.000 KATA):
  1. Jenis penelitian kepustakaan (library research) / yuridis normatif dan pendekatan penelitian (pendekatan perundang-undangan / statute approach, pendekatan konseptual / conceptual approach, pendekatan komparatif / perbandingan, atau pendekatan historis).
  2. Sumber bahan penelitian / data: bahan hukum primer (regulasi, undang-undang, putusan peradilan), bahan sekunder (buku teks, jurnal ilmiah terakreditasi, hasil riset terdahulu), dan bahan tersier (kamus, ensiklopedia).
  3. Teknik pengumpulan bahan: studi dokumentasi, studi kepustakaan, inventarisasi literatur, dan penelusuran naskah kepustakaan.
  4. Teknik pengolahan dan analisis bahan: analisis isi kualitatif (content analysis), penafsiran hukum (penafsiran gramatikal, sistematis, teleologis / sosiologis, historis), penalaran hukum deduktif logis, dan sintesis komparatif.
`;
  } else if (targetMethod === 'rnd') {
    methodInstruction = `
*** ATURAN MUTLAK: METODOLOGI SKRIPSI ASLI TERDETEKSI / DITENTUKAN SEBAGAI: PENELITIAN DAN PENGEMBANGAN (R&D) ***
- BAGIAN B. METODE PENELITIAN WAJIB MENJABARKAN PROSEDUR R&D MENGIKUTI BAB III SKRIPSI:
- WAJIB MENJABARKAN DALAM 5-7 PARAGRAF OPERASIONAL (~800 - 1.000 KATA):
  1. Model pengembangan yang digunakan (misal: ADDIE, 4D Thiagarajan, Borg & Gall, dsb.).
  2. Tahapan dan prosedur pengembangan produk/media secara berurutan.
  3. Subjek uji coba dan validator ahli (ahli materi, ahli media, praktisi, dan kelompok sasaran/siswa).
  4. Instrumen pengumpulan data (lembar validasi ahli, angket respon kepraktisan, tes efektivitas).
  5. Teknik analisis data: analisis persentase validitas, kriteria kepraktisan, dan uji efektivitas produk.
`;
  } else if (targetMethod === 'campuran') {
    methodInstruction = `
*** ATURAN MUTLAK: METODOLOGI SKRIPSI ASLI TERDETEKSI: METODE CAMPURAN (MIXED METHODS) ***
- BAGIAN B. METODE PENELITIAN WAJIB MENJABARKAN DESAIN CAMPURAN MENGIKUTI BAB III SKRIPSI:
- WAJIB MENJABARKAN DALAM 5-7 PARAGRAF OPERASIONAL (~800 - 1.000 KATA):
  1. Desain metode campuran (convergent parallel atau explanatory sequential design).
  2. Pendekatan kuantitatif: populasi, sampel, kuesioner, validitas & reliabilitas, analisis regresi/statistik.
  3. Pendekatan kualitatif: informan kunci, wawancara mendalam, observasi, triangulasi data.
  4. Prosedur integrasi data kuantitatif dan temuan kualitatif lapangan.
`;
  } else {
    // Kuantitatif
    methodInstruction = `
*** ATURAN MUTLAK: METODOLOGI SKRIPSI ASLI TERDETEKSI / DITENTUKAN SEBAGAI: KUANTITATIF ***
- BAGIAN B. METODE PENELITIAN WAJIB KUANTITATIF SESUAI BAB III SKRIPSI ASLI:
- WAJIB MENJABARKAN DALAM 5-7 PARAGRAF OPERASIONAL (~800 - 1.000 KATA):
  1. Pendekatan dan desain riset kuantitatif (asosiatif kausal, komparatif, eksperimen, survei eksplanatori).
  2. Populasi, kriteria inklusi/eksklusi, teknik penentuan sampel (purposive / random sampling), dan ukuran sampel (rumus Slovin / aturan Hair dsb.).
  3. Definisi operasional variabel dan kisi-kisi indikator pengukuran (skala Likert 1-5).
  4. Teknik pengumpulan data (kuesioner/angket terstruktur) dan instrumen penelitian.
  5. Pengujian instrumen (uji validitas konstruk/item dan uji reliabilitas Alpha Cronbach).
  6. Metode dan teknik analisis data statistik (statistik deskriptif, uji asumsi klasik, analisis regresi linier berganda / SEM PLS, uji t parsial, uji F simultan, dan koefisien determinasi R²).
`;
  }

  const promptText = `
${journalTemplateInstruction(journalTemplateId)}
Anda adalah seorang Profesor dan Editor Utama Jurnal Ilmiah Internasional & Terakreditasi SINTA 1 / Scopus Indonesia.
Tugas Anda: Ekstrak dan susun TAHAP 1 (Metadata, Abstrak Dwibahasa, Pendahuluan, dan Metode Penelitian) dari skripsi berikut menjadi bagian awal artikel ilmiah dengan target ketat **TEPAT MEMENUHI HALAMAN 1 SAMPAI 6 DARI TOTAL 18 HALAMAN ARTIKEL JURNAL**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- ATURAN MUTLAK JUDUL ARTIKEL: Judul artikel ilmiah WAJIB DISAMAKAN PERSIS SECARA HARFIAH (VERBATIM / LANGSUNG COPY-PASTE PERSIS 100%) dengan judul topik penelitian skripsi aslinya! DILARANG KERAS menggunakan nama file dokumen seperti "SKRIPSII LIPAAAAAAA", "REVISI", "DOKUMEN", atau "SKRIPSI"! Temukan dan salin judul topik penelitian ilmiah skripsi yang sebenarnya (contoh: "IMPLEMENTASI MODEL PEMBELAJARAN FLIPPED CLASSROOM DALAM MENINGKATKAN MOTIVASI BELAJAR SISWA DI SMP NEGERI 6 SAMPANG") langsung dari teks halaman cover depan atau bagian awal abstrak skripsi. Salin judul skripsi asli tersebut kata demi kata tanpa parafrase menjadi 'metadata.judul'.
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "A. PENDAHULUAN", "B. METODE PENELITIAN", "Pendahuluan:", dsb. di dalam teks! Judul bagian sudah otomatis dibuat oleh sistem. Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring (misalnya *good corporate governance*, *corporate social responsibility*, *return on assets*, *novelty*, *research gap*) maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks Bahasa Indonesia WAJIB menggunakan bahasa Indonesia akademik baku murni tanpa menyisipkan kata penjelas bahasa Inggris dalam tanda bintang (*...*) atau kurung ((...)).

ATURAN STRUKTURAL KETAT (STANDAR FORMAT WORD TIMES NEW ROMAN 12PT, SPASI 1.5, MARGIN 3CM):
1. **HALAMAN 1 (JUDUL, PENULIS & ABSTRAK - ~400 KATA)**:
   - Judul Bahasa Indonesia: WAJIB sama persis 100% kata demi kata dengan judul skripsi asli (tanpa parafrase, dilarang keras menggunakan nama file).
   - Judul Bahasa Inggris (judulEnglish): Terjemahan akademis bahasa Inggris dari judul skripsi tersebut.
   - Abstrak Bahasa Indonesia (200-250 kata): Latar Belakang Masalah, Tujuan Utama, Metode Penelitian (sesuai jenis metode: ${targetMethod}), Temuan Kunci, dan Kesimpulan Implikasi.
   - Kata Kunci Bahasa Indonesia (3-5 kata kunci).
   - Abstract Bahasa Inggris (200-250 kata).
   - Keywords Bahasa Inggris (3-5 keywords).
   - **ATURAN EMAIL PENULIS**: Email penulis mahasiswa HARUS berformat nama mahasiswa tanpa spasi diikuti 4 digit acak dan domain @gmail.com (contoh: imamhanafi9282@gmail.com).

2. **HALAMAN 2 - 4 (3 HALAMAN PENUH: A. PENDAHULUAN | WAJIB MINIMAL 1.300 - 1.500 KATA)**:
   - JANGAN membuat ringkasan singkat. Uraikan secara sangat komprehensif, kaya argumentasi ilmiah, dan terstruktur dalam 8-10 paragraf panjang:
     a. Latar belakang fenomena empiris, data faktual lapangan, dan urgensi konteks penelitian.
     b. Tinjauan literatur mendalam dan landasan teori utama dari Bab II skripsi asli.
     c. Kesenjangan penelitian teoritis dan kontekstual dari penelitian sebelumnya.
     d. Rumusan masalah penelitian, pertanyaan riset, dan tujuan/hipotesis penelitian yang diajukan.
     e. Kebaruan penelitian dan kontribusi teoritis serta praktis penelitian.
   - Tulis dalam 8-10 paragraf akademik berbobot untuk mengisi tepat 3 halaman penuh Word (LANGSUNG kalimat isi paragraf, jangan tulis judul "A. Pendahuluan").

3. **HALAMAN 5 - 6 (2 HALAMAN PENUH: B. METODE PENELITIAN | WAJIB MINIMAL 800 - 1.000 KATA)**:
${methodInstruction}

TEKS ASLI BAB III / METODOLOGI PENELITIAN DARI FILE SKRIPSI (WAJIB DIIKUTI PERSIS SEBAGAI ACUAN UTAMA METODOLOGI):
"""
${segments.bab3Metode ? segments.bab3Metode.slice(0, 30000) : segments.frontMatterAndBab123.slice(0, 20000)}
"""

Metadata Penulis:
- Judul Skripsi Asli: ${isClientTitleValid ? metadata?.judul : 'SALIN DAN EKSTRAK JUDUL SKRIPSI ASLI 100% PERSIS DARI COVER DEPAN ATAU ABSTRAK DI BAWAH (DILARANG KERAS MEMAKAI NAMA FILE DOKUMEN ATAU TEKS SINGKATAN SEPERTI SKRIPSII LIPAAAAAAA)'}
- Nama Penulis: ${metadata?.nama || 'Penulis Skripsi'}
- Program Studi: ${metadata?.prodi || 'Program Studi Mahasiswa'}
- Email: ${formattedAuthorEmail}
- Instansi: ${metadata?.instansi || 'Universitas'}

ISI BAGIAN AWAL SKRIPSI (JUDUL, BAB I, II, & III):
"""
${segments.frontMatterAndBab123}
"""

Kembalikan HANYA format JSON valid.
`;

  const response = await generateContentWithFallback({
    contents: promptText,
    model: selectedModel,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metadata: {
            type: Type.OBJECT,
            properties: {
              judul: { type: Type.STRING },
              judulEnglish: { type: Type.STRING },
              nama: { type: Type.STRING },
              prodi: { type: Type.STRING },
              email: { type: Type.STRING },
              instansi: { type: Type.STRING },
            },
            required: ['judul', 'nama', 'prodi', 'email'],
          },
          abstract: {
            type: Type.OBJECT,
            properties: {
              abstrakIndo: { type: Type.STRING },
              keywordsIndo: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              abstrakEnglish: { type: Type.STRING },
              keywordsEnglish: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['abstrakIndo', 'keywordsIndo', 'abstrakEnglish', 'keywordsEnglish'],
          },
          pendahuluan: { type: Type.STRING },
          metode: { type: Type.STRING },
        },
        required: ['metadata', 'abstract', 'pendahuluan', 'metode'],
      },
    },
  });

  const parsed = safeJsonParse(getTextFromResponse(response), {});
  if (parsed.metadata) {
    const candidateClient = (metadata?.judul && !isSuspiciousFilenameTitle(metadata.judul) && isValidThesisTitle(metadata.judul))
      ? metadata.judul.trim()
      : '';
    const candidateAI = (parsed.metadata?.judul && !isSuspiciousFilenameTitle(parsed.metadata.judul) && isValidThesisTitle(parsed.metadata.judul))
      ? parsed.metadata.judul.trim()
      : '';
    const candidateExtracted = extractMetadataFromSkripsiText(rawText).judul || '';

    parsed.metadata.judul = candidateClient || candidateAI || candidateExtracted || 'ARTIKEL ILMIAH HASIL PENELITIAN';
    parsed.metadata.email = generateStudentEmail(parsed.metadata.nama || metadata?.nama, parsed.metadata.email || metadata?.email);
  }
  if (parsed.pendahuluan) {
    parsed.pendahuluan = cleanSectionContent(parsed.pendahuluan);
  }
  if (parsed.metode) {
    parsed.metode = cleanSectionContent(parsed.metode);
  }
  if (parsed.abstract?.abstrakIndo) {
    parsed.abstract.abstrakIndo = cleanSectionContent(parsed.abstract.abstrakIndo);
  }

  // Include detected methodology info in the returned object
  parsed.detectedMethodType = targetMethod;
  parsed.methodologyDetails = segments.methodologyDetails;

  return parsed;
}

// Helper: Run Stage 2 (Hasil & Pembahasan) - TARGET TEPAT HALAMAN 7-16 (10 HALAMAN PENUH: PEMBAHASAN PALING BANYAK / 7 HALAMAN)
async function runStage2(
  ai: any,
  rawText: string,
  stage1Data: any,
  targetLengthPages: number = 18,
  selectedModel?: string,
  userMethodPreference?: string,
  journalTemplateId?: string
) {
  const segments = segmentThesisText(rawText, userMethodPreference);
  const targetMethod = userMethodPreference && userMethodPreference !== 'auto'
    ? userMethodPreference
    : (stage1Data?.detectedMethodType || segments.detectedMethodType);

  let promptHasil = '';
  let promptPembahasan = '';

  if (targetMethod === 'kualitatif') {
    promptHasil = `
Anda adalah seorang Profesor dan Reviewer Jurnal Ilmiah SINTA 1 / Scopus.
Tugas: Ekstrak dan susun bagian "C. HASIL PENELITIAN" untuk artikel ilmiah bertajuk "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}" dari Bab IV skripsi kualitatif berikut.
TARGET: **TEPAT 3 HALAMAN PENUH WORD (WAJIB MINIMAL 1.200 - 1.400 KATA)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "C. HASIL PENELITIAN", "C. Hasil Penelitian", "Hasil Penelitian:", dsb. di awal teks! Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring (misalnya *good corporate governance*, *novelty*, *research gap*) maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni.

ATURAN STRUKTURAL KHUSUS PENELITIAN KUALITATIF (STANDAR WORD TNR 12PT, SPASI 1.5):
Sajikan temuan kualitatif empiris dari Bab IV skripsi secara sangat rinci, komprehensif, dan sistematis dalam 7-9 paragraf panjang:
1. Gambaran umum konteks objek penelitian, latar sosial/organisasi, dan profil para informan kunci / narasumber penelitian.
2. Paparkan temuan kualitatif per tema atau per rumusan masalah penelitian secara runtut dan komprehensif.
3. Cantumkan kutipan-kutipan transkrip wawancara mendalam yang autentik dan bermakna dari informan kunci (sebutkan jabatan/narasumber informan secara akademik).
4. Sajikan hasil observasi lapangan partisipatif dan bukti dokumentasi yang mendukung kesaksian informan.
5. Sajikan hasil triangulasi data (triangulasi sumber dan teknik) yang mengonfirmasi keabsahan temuan lapangan.
6. Sintesis tema-tema pokok hasil reduksi dan penyajian data tanpa mengarang data yang tidak ada di skripsi.
- DILARANG KERAS memuat uji statistik kuantitatif seperti uji normalitas, regresi, uji t, uji F, atau R Square!

ISI BAB IV SKRIPSI:
"""
${segments.bab4HasilPembahasan}
"""

Tuliskan naskah Bagian C. HASIL PENELITIAN kualitatif secara lengkap, mendalam, tanpa kalimat basa-basi pembuka dan TANPA menuliskan kembali judul "C. Hasil Penelitian". Langsung teks isi hasil penelitian mengalir.
`;

    promptPembahasan = `
Anda adalah seorang Profesor Senior dan Editor Utama Jurnal Ilmiah Internasional.
Tugas: Susun bagian "D. PEMBAHASAN" untuk artikel ilmiah kualitatif bertajuk "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}" dari Bab IV skripsi berikut.
TARGET: **TEPAT 7 HALAMAN PENUH WORD (WAJIB MINIMAL 2.800 - 3.200 KATA — BAGIAN PALING BANYAK, PALING PANJANG, DAN PALING MENDALAM DI SELURUH ARTIKEL)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "D. PEMBAHASAN", "D. Pembahasan", "Pembahasan:", dsb. di awal teks! Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni yang mengalir alami.

ATURAN KHUSUS PEMBAHASAN KUALITATIF (ANALISIS SAINTIFIK KRITIS MENDALAM):
* DILARANG sekadar mengulang kutipan wawancara mentah yang sudah ada di bagian Hasil!
* Tulis dalam 15-22 paragraf analitis panjang dan mendalam yang terbagi dalam sub-analisis berikut:
  1. **Pembahasan Tema/Fokus Penelitian 1 per 1 secara Tuntas & Mendalam**: Kembangkan telaah mendalam untuk SETIAP rumusan masalah/tema penelitian berdasarkan temuan lapangan di Bab IV.
  2. **Rasionalisasi Makna & Fenomenologi Lapangan**: Jelaskan MENGAPA dan BAGAIMANA fenomena tersebut terjadi, motif di balik tindakan informan, dan dinamika sosial-organisasional yang memengaruhinya.
  3. **Dialog Teori & Landasan Teori Utama**: Hubungkan, bandingkan, dan integrasikan temuan kualitatif lapangan dengan teori utama dari Bab II skripsi (konfirmasi, pengayaan, atau modifikasi teori).
  4. **Komparasi Studi Terdahulu Ekstensif**: Bandingkan secara komparatif dengan minimal 8-12 penelitian jurnal terdahulu (baik yang sejalan maupun yang memiliki temuan berbeda) beserta telaah penyebab perbedaannya.
  5. **Kebaruan & Proposisi Konseptual**: Paparkan proposisi teoretis atau temuan baru yang memperkaya khazanah keilmuan kontemporer.
  6. **Implikasi Praktis, Manajerial, dan Kebijakan**: Uraikan rekomendasi aksi strategis yang aplikatif bagi praktisi, lembaga, atau pengambil kebijakan.

ISI BAB IV SKRIPSI:
"""
${segments.bab4HasilPembahasan}
"""

Tuliskan naskah Bagian D. PEMBAHASAN kualitatif secara sangat panjang, komprehensif, mendalam (2.800+ kata), tanpa kalimat basa-basi pengantar pembuka dan TANPA menuliskan kembali judul "D. Pembahasan". Langsung teks isi pembahasan akademis.
`;
  } else if (targetMethod === 'pustaka') {
    promptHasil = `
Anda adalah seorang Profesor dan Reviewer Jurnal Ilmiah SINTA 1 / Scopus.
Tugas: Ekstrak dan susun bagian "C. HASIL PENELITIAN" untuk artikel ilmiah bertajuk "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}" dari Bab IV skripsi studi kepustakaan / yuridis normatif berikut.
TARGET: **TEPAT 3 HALAMAN PENUH WORD (WAJIB MINIMAL 1.200 - 1.400 KATA)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "C. HASIL PENELITIAN", "C. Hasil Penelitian", dsb. di awal teks! Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni.

ATURAN STRUKTURAL STUDI PUSTAKA / YURIDIS NORMATIF (STANDAR WORD TNR 12PT, SPASI 1.5):
Sajikan hasil telaah bahan pustaka / regulasi dari Bab IV skripsi secara sangat rinci, komprehensif, dan sistematis dalam 7-9 paragraf panjang:
1. Pemetaan dan inventarisasi bahan penelitian (bahan hukum primer/regulasi, putusan, naskah kebijakan, dan literatur sekunder) yang dikaji.
2. Analisis substansi pasal-pasal, asas-asas, doktrin keilmuan, atau konsep hukum yang menjadi fokus masalah penelitian.
3. Temuan kontradiksi norma (antinomi), kekosongan hukum, atau kesenjangan implementasi regulasi dengan fakta normatif.
4. Analisis komparatif regulasi atau perbandingan pemikiran antar-tokoh/sumber kepustakaan.
5. Klasifikasi dan sintesis analitis bahan pustaka yang menjawab rumusan masalah.
- DILARANG KERAS mengarang kuesioner responden atau uji statistik angka!

ISI BAB IV SKRIPSI:
"""
${segments.bab4HasilPembahasan}
"""

Tuliskan naskah Bagian C. HASIL PENELITIAN secara lengkap, mendalam, tanpa kalimat basa-basi pembuka dan TANPA menuliskan kembali judul "C. Hasil Penelitian".
`;

    promptPembahasan = `
Anda adalah seorang Profesor Senior dan Editor Utama Jurnal Ilmiah Internasional.
Tugas: Susun bagian "D. PEMBAHASAN" untuk artikel ilmiah studi pustaka / yuridis normatif bertajuk "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}" dari Bab IV skripsi berikut.
TARGET: **TEPAT 7 HALAMAN PENUH WORD (WAJIB MINIMAL 2.800 - 3.200 KATA — BAGIAN PALING BANYAK, PALING PANJANG, DAN PALING MENDALAM DI SELURUH ARTIKEL)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "D. PEMBAHASAN" di awal teks! Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring maupun di dalam tanda kurung.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni.

ATURAN KHUSUS PEMBAHASAN STUDI PUSTAKA / YURIDIS NORMATIF:
* Tulis dalam 15-22 paragraf analitis panjang dan mendalam yang terbagi dalam sub-analisis berikut:
  1. **Pembahasan Isu/Fokus 1 per 1 secara Tuntas & Mendalam**: Kembangkan telaah kritis mendalam untuk SETIAP rumusan masalah penelitian berdasarkan hasil kajian pustaka di Bab IV.
  2. **Hermeneutika & Interpretasi Kritis**: Tafsirkan secara mendalam makna gramatikal, sistematis, teleologis, atau historis dari regulasi/teks literatur yang dikaji.
  3. **Dialog Teori & Asas-Asas Utama**: Konfirmasikan dan integrasikan temuan dengan teori utama dari Bab II (teori keadilan, kepastian hukum, kemanfaatan, sistem hukum, atau teori keilmuan terkait).
  4. **Komparasi Kajian Terdahulu Ekstensif**: Bandingkan secara komparatif dengan minimal 8-12 penelitian jurnal terdahulu.
  5. **Konstruksi Konsep / Gagasan Rekonstruktif**: Paparkan model pemikiran baru atau gagasan rekonstruksi hukum/kebijakan (ius constituendum) yang dihasilkan dari penelitian.
  6. **Implikasi Regulatif & Praktis**: Rekomendasi perbaikan peraturan, harmonisasi kebijakan, atau pedoman praktis bagi pembuat kebijakan.

ISI BAB IV SKRIPSI:
"""
${segments.bab4HasilPembahasan}
"""

Tuliskan naskah Bagian D. PEMBAHASAN secara sangat panjang, komprehensif, mendalam (2.800+ kata), tanpa kalimat basa-basi pengantar pembuka dan TANPA menuliskan kembali judul "D. Pembahasan".
`;
  } else {
    // Kuantitatif & Campuran
    promptHasil = `
Anda adalah seorang Profesor dan Reviewer Jurnal Ilmiah SINTA 1 / Scopus.
Tugas: Ekstrak dan susun bagian "C. HASIL PENELITIAN" untuk artikel ilmiah "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}" dari Bab IV skripsi berikut.
TARGET: **TEPAT 3 HALAMAN PENUH WORD (WAJIB MINIMAL 1.200 - 1.400 KATA)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "C. HASIL PENELITIAN", "C. Hasil Penelitian", "Hasil Penelitian:", dsb. di awal teks! Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama (misal langsung: "Berdasarkan pengumpulan data kuesioner...").
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring (misalnya *good corporate governance*, *corporate social responsibility*, *return on assets*, *novelty*, *research gap*) maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni tanpa menyisipkan padanan kata bahasa Inggris bertanda bintang (*...*) atau tanda kurung ((...)).

ATURAN STRUKTURAL KETAT (STANDAR WORD TIMES NEW ROMAN 12PT, SPASI 1.5):
Sajikan temuan empiris dari Bab IV skripsi secara sangat rinci, komprehensif, dan sistematis dalam 7-9 paragraf panjang:
1. Statistik deskriptif data dan karakteristik demografi responden/objek penelitian.
2. Hasil uji instrumen empiris (uji validitas r-hitung vs r-tabel dan uji reliabilitas Alpha Cronbach).
3. Hasil pengujian asumsi klasik secara tuntas (uji normalitas Kolmogorov-Smirnov, uji multikolinearitas VIF & Tolerance, uji heteroskedastisitas, dan uji linieritas/autokorelasi).
4. Hasil analisis statistik utama (analisis regresi linier berganda atau model pengukuran/struktural SEM PLS).
5. Nilai Koefisien Determinasi (R Square dan Adjusted R Square) beserta penjelasannya.
6. Hasil pengujian hipotesis secara parsial (Uji t) dan simultan (Uji F) dengan mencantumkan nilai t-hitung, t-tabel, F-hitung, F-tabel, beta koefisien, dan p-value/nilai signifikansi secara lengkap.
7. Interpretasi narasi data empiris yang terstruktur tanpa mengarang data yang tidak ada di skripsi.

ISI BAB IV SKRIPSI:
"""
${segments.bab4HasilPembahasan}
"""

Tuliskan naskah Bagian C. HASIL PENELITIAN secara lengkap, mendalam, tanpa kalimat basa-basi pengantar pembuka dan TANPA menuliskan kembali judul "C. Hasil Penelitian". Langsung sajikan teks isi hasil penelitian secara mengalir dan akademis.
`;

    promptPembahasan = `
Anda adalah seorang Profesor Senior dan Editor Utama Jurnal Ilmiah Internasional.
Tugas: Susun bagian "D. PEMBAHASAN" untuk artikel ilmiah bertajuk "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}" dari Bab IV skripsi berikut.
TARGET: **TEPAT 7 HALAMAN PENUH WORD (WAJIB MINIMAL 2.800 - 3.200 KATA — BAGIAN PALING BANYAK, PALING PANJANG, DAN PALING MENDALAM DI SELURUH ARTIKEL)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "D. PEMBAHASAN", "D. Pembahasan", "D. Hasil Pembahasan", "Pembahasan:", dsb. di awal teks! Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring (misalnya *good corporate governance*, *corporate social responsibility*, *return on assets*, *novelty*, *research gap*, *previous research*, *practical implications*) maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni yang mengalir alami tanpa menyisipkan padanan kata bahasa Inggris bertanda bintang (*...*) atau tanda kurung ((...)).

ATURAN KHUSUS PEMBAHASAN (BAGIAN INTI TERBESAR - LANGSUNG KE ANALISIS SAINTIFIK KRITIS TANPA PENGULANGAN TABEL):
* DILARANG mengulang tabel angka mentah atau teks deskriptif yang sudah dijabarkan di bagian Hasil Penelitian!
* DILARANG menggunakan kalimat pembuka klise atau pengantar bertele-tele.
* Tulis dalam 15-22 paragraf analitis panjang dan mendalam yang terbagi dalam sub-analisis berikut:
  1. **Pembahasan Hipotesis 1 per 1 secara Tuntas & Rinci**: Kembangkan sub-bagian pembahasan mendalam untuk SETIAP hipotesis/variabel penelitian (misal: Pengaruh X1 terhadap Y, Pengaruh X2 terhadap Y, Pengaruh X3 terhadap Y, serta Pengaruh Simultan).
  2. **Rasionalisasi Logis & Fenomenologis**: Jelaskan secara tajam MENGAPA dan BAGAIMANA mekanisme hubungan kausalitas atau asosiasi antar-variabel tersebut terjadi secara nyata di lapangan.
  3. **Dialog Teori & Landasan Teori Utama**: Konfirmasikan dan integrasikan temuan dengan landasan teori utama (misal: Resource-Based View, TAM, TPB, Agency Theory, Teori Perilaku Konsumen, Teori Manajemen Strategis, dsb.).
  4. **Komparasi Studi Terdahulu Ekstensif**: Bandingkan secara komparatif dengan minimal 8-12 penelitian jurnal terdahulu (baik yang sejalan/mendukung maupun yang bertentangan/kontradiktif) beserta telaah kritis penyebab kesamaan atau diskrepansinya.
  5. **Kebaruan & Temuan Baru**: Paparkan temuan unik dan kontribusi pemikiran baru yang memperkaya khazanah keilmuan kontemporer.
  6. **Implikasi Manajerial & Kebijakan Praktis**: Uraikan rekomendasi aksi strategis yang aplikatif dan berdampak nyata bagi dunia praktisi, manajer, atau pengambil kebijakan di bidang terkait.

ISI BAB IV SKRIPSI:
"""
${segments.bab4HasilPembahasan}
"""

Tuliskan naskah Bagian D. PEMBAHASAN secara sangat panjang, komprehensif, mendalam (2.800+ kata), tanpa kalimat basa-basi pengantar pembuka dan TANPA menuliskan kembali judul "D. Pembahasan". Langsung teks isi pembahasan akademis berbobot tinggi.
`;
  }

  // Execute both in parallel to maximize output token capacity and prevent truncation
  const [resHasil, resPembahasan] = await Promise.all([
    generateContentWithFallback({
      contents: promptHasil + '\n' + journalTemplateInstruction(journalTemplateId),
      model: selectedModel,
    }),
    generateContentWithFallback({
      contents: promptPembahasan + '\n' + journalTemplateInstruction(journalTemplateId),
      model: selectedModel,
    }),
  ]);

  const rawHasil = getTextFromResponse(resHasil).trim();
  const rawPembahasan = getTextFromResponse(resPembahasan).trim();

  return {
    hasil: cleanSectionContent(rawHasil),
    pembahasan: cleanSectionContent(rawPembahasan),
    detectedMethodType: targetMethod,
  };
}

// Helper: Run Stage 3 (Kesimpulan, Footnotes, Daftar Pustaka) - TARGET TEPAT HALAMAN 17-18
async function runStage3(
  ai: any,
  rawText: string,
  stage1Data: any,
  stage2Data?: any,
  footnoteStyle?: string,
  selectedModel?: string,
  userMethodPreference?: string,
  journalTemplateId?: string
) {
  const segments = segmentThesisText(rawText, userMethodPreference);
  const targetMethod = userMethodPreference && userMethodPreference !== 'auto'
    ? userMethodPreference
    : (stage1Data?.detectedMethodType || stage2Data?.detectedMethodType || segments.detectedMethodType);

  const promptText = `
${journalTemplateInstruction(journalTemplateId)}
Anda adalah seorang Profesor dan Editor Utama Jurnal Ilmiah Internasional & Terakreditasi SINTA 1 / Scopus Indonesia.
Tugas Anda: Ekstrak dan susun TAHAP 3 (Kesimpulan & Saran, Footnotes/Catatan Kaki Standar Ilmiah, dan Daftar Pustaka) dari skripsi berikut dengan target ketat **TEPAT 2 HALAMAN ARTIKEL (HALAMAN 17 DAN 18)**.

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "E. KESIMPULAN DAN SARAN", "Kesimpulan:", dsb. di dalam teks! Judul bagian sudah otomatis dibuat oleh sistem. Naskah WAJIB LANGSUNG dimulai dari kalimat isi paragraf pertama.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring (misalnya *good corporate governance*, *corporate social responsibility*, *return on assets*, *novelty*, *research limitations*, *future agenda*) maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni tanpa menyisipkan padanan kata bahasa Inggris bertanda bintang (*...*) atau tanda kurung ((...)).

Judul Artikel: "${stage1Data?.metadata?.judul || 'Artikel Ilmiah'}"
Metodologi Penelitian: ${targetMethod.toUpperCase()} (Wajib selaras)
Cuplikan Naskah Artikel yang Telah Disusun (Untuk Menyesuaikan Kata Acuan / Anchor Word Footnote):
- A. Pendahuluan: ${(stage1Data?.pendahuluan || '').slice(0, 1200)}
- B. Metode Penelitian: ${(stage1Data?.metode || '').slice(0, 1000)}
- C. Hasil Penelitian: ${(stage2Data?.hasil || '').slice(0, 1500)}
- D. Pembahasan: ${(stage2Data?.pembahasan || '').slice(0, 1500)}

ATURAN STRUKTURAL KETAT (STANDAR FORMAT WORD TIMES NEW ROMAN 12PT, SPASI 1.5, MARGIN 3CM):
1. **HALAMAN 17 (1 HALAMAN PENUH: E. KESIMPULAN DAN SARAN | WAJIB MINIMAL 450 - 600 KATA)**:
   - Kesimpulan yang padat, lugas, dan menjawab seluruh rumusan masalah / pertanyaan penelitian sesuai metode ${targetMethod.toUpperCase()} berdasarkan temuan empiris di Bab IV skripsi.
   - Keterbatasan penelitian yang jujur, ilmiah, dan metodologis.
   - Saran manajerial/praktis bagi pengambil kebijakan serta rekomendasi agenda penelitian lanjutan di masa mendatang secara terperinci.
   - Tulis dalam 4-5 paragraf akademik rapi untuk mengisi tepat 1 halaman penuh Word (LANGSUNG kalimat isi, jangan tulis judul "E. Kesimpulan dan Saran").

2. **HALAMAN 18 (1 HALAMAN PENUH: DAFTAR PUSTAKA | STANDAR APA 7TH EDITION)**:
   - Salin, rapikan, dan susun seluruh daftar referensi/pustaka standar APA 7th Edition (urut abjad A-Z) yang memang dirujuk dari Bab 1 sampai Bab 5 skripsi asli (minimal 28-38 referensi berbobot) sehingga pas memenuhi tepat 1 halaman Word.

3. **ATURAN WAJIB PEMBUATAN FOOTNOTES (CATATAN KAKI STANDAR UMUM BUKU & OBSERVASI/WAWANCARA)**:
   - Buat **8 sampai 10 catatan kaki (footnotes)** yang disebar secara proporsional di bagian \`pendahuluan\`, \`metode\`, \`hasil\`, dan \`pembahasan\`.
   - **DILARANG KERAS** membuat footnote yang hanya berisi penjelasan istilah atau definisi kata! Seluruh footnote WAJIB mengikuti standar catatan kaki ilmiah pada umumnya (Chicago/Turabian Style Indonesia) yang terbagi menjadi 2 jenis berikut:

   **A. FOOTNOTE REFERENSI BUKU / LITERATUR (Minimal 6-7 Footnote di Pendahuluan, Metode, dan Pembahasan)**:
   - WAJIB mencantumkan **Nama Lengkap Penulis (tanpa dibalik)**, ***Judul Buku*** (diapit tanda bintang \`*...*\` untuk cetak miring/italic), **(Kota Terbit: Nama Penerbit, Tahun Terbit), hlm. [nomor halaman]**.
   - Ambil nama penulis dan judul buku dari tinjauan pustaka / daftar pustaka skripsi asli.
   - Contoh Format Footnote Buku yang BENAR:
     * \`Philip Kotler dan Kevin Lane Keller, *Manajemen Pemasaran*, Edisi 16 (Jakarta: Erlangga, 2021), hlm. 45.\`
     * \`Sugiyono, *Metode Penelitian Kuantitatif, Kualitatif, dan R&D* (Bandung: Alfabeta, 2022), hlm. 85.\`
     * \`Basu Swastha dan Irawan, *Manajemen Pemasaran Modern* (Yogyakarta: Liberty, 2020), hlm. 62.\`
     * \`Fandy Tjiptono dan Anastasia Diana, *Pemasaran Digital dan Ekosistem Bisnis Modern* (Yogyakarta: Andi Offset, 2021), hlm. 114.\`
   - Isi field \`sourceType\` dengan \`"book"\`.

   **B. FOOTNOTE HASIL OBSERVASI & WAWANCARA LAPANGAN (Minimal 2-3 Footnote di Metode, Hasil, atau Pembahasan)**:
   - Untuk catatan kaki yang merujuk pada observasi lapangan atau wawancara penelitian, **WAJIB MENYERTAKAN NAMA LENGKAP NARASUMBER YANG DIWAWANCARAI**, **Jabatan/Peran Narasumber** (misal: Pemilik Usaha / Manajer / Kepala Bagian / Informan Kunci / Responden), **Lokasi Observasi/Wawancara**, dan **Tanggal/Waktu Pelaksanaan**.
   - Jika di dalam teks skripsi terdapat nama narasumber/informan yang diwawancarai, gunakan nama asli tersebut. Jika di dalam skripsi hanya disebutkan jabatan/informan tanpa nama lengkap, cantumkan nama informan/narasumber yang relevan beserta jabatannya sesuai konteks objek penelitian skripsi.
   - Contoh Format Footnote Observasi & Wawancara yang BENAR:
     * \`Hasil Observasi dan Wawancara Mendalam dengan Bapak H. Hendra Wijaya (Pemilik UMKM Kuliner Kedai Nusantara), di lokasi penelitian pada tanggal 14 Januari 2025.\`
     * \`Wawancara Pribadi dan Observasi Lapangan dengan Ibu Rina Kartika (Manajer Operasional Dapur Sunda Asli), pada tanggal 18 Januari 2025.\`
   - Isi field \`sourceType\` dengan \`"interview"\`.

   - Setiap item footnote wajib memuat:
     * \`id\`: string (misal: \`'fn_1'\`, \`'fn_2'\`, dst.)
     * \`number\`: urutan angka (1, 2, 3, ...)
     * \`text\`: teks footnote lengkap sesuai format Buku atau Observasi/Wawancara di atas
     * \`sectionId\`: salah satu dari \`'pendahuluan'\`, \`'metode'\`, \`'hasil'\`, atau \`'pembahasan'\`
     * \`anchorWord\`: kata atau frasa pendek (1-3 kata) yang benar-benar ada di dalam teks bagian tersebut sebagai tempat menempelkan angka superscript footnote
     * \`sourceType\`: \`'book'\` (untuk referensi buku) atau \`'interview'\` (untuk observasi & wawancara dengan nama narasumber)

CUPLIKAN BAB I-III SKRIPSI (UNTUK RUJUKAN BUKU & METODOLOGI):
"""
${segments.frontMatterAndBab123.slice(0, 10000)}
"""

CUPLIKAN BAB IV SKRIPSI (UNTUK DATA OBSERVASI, NAMA NARASUMBER WAWANCARA, DAN TEMUAN):
"""
${segments.bab4HasilPembahasan.slice(0, 10000)}
"""

ISI BAB V & DAFTAR PUSTAKA SKRIPSI (UNTUK JUDUL BUKU & REFERENSI LENGKAP):
"""
${segments.bab5DanPustaka}
"""

Kembalikan HANYA format JSON valid dengan field 'kesimpulan', 'daftarPustaka', dan 'footnotes'.
`;

  const response = await generateContentWithFallback({
    contents: promptText,
    model: selectedModel,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          kesimpulan: { type: Type.STRING },
          daftarPustaka: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          footnotes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                number: { type: Type.INTEGER },
                text: { type: Type.STRING },
                sectionId: { type: Type.STRING },
                anchorWord: { type: Type.STRING },
                sourceType: { type: Type.STRING },
              },
              required: ['id', 'number', 'text', 'sectionId'],
            },
          },
        },
        required: ['kesimpulan', 'daftarPustaka', 'footnotes'],
      },
    },
  });

  const parsed = safeJsonParse(getTextFromResponse(response), {});
  if (parsed.kesimpulan) {
    parsed.kesimpulan = cleanSectionContent(parsed.kesimpulan);
  }
  if (Array.isArray(parsed.footnotes)) {
    parsed.footnotes = parsed.footnotes.map((fn: any, idx: number) => ({
      id: fn.id || `fn_${idx + 1}`,
      number: idx + 1,
      text: (fn.text || '').trim(),
      sectionId: ['pendahuluan', 'metode', 'hasil', 'pembahasan', 'kesimpulan'].includes(fn.sectionId)
        ? fn.sectionId
        : idx < 3
        ? 'pendahuluan'
        : idx < 5
        ? 'metode'
        : idx < 7
        ? 'hasil'
        : 'pembahasan',
      anchorWord: fn.anchorWord ? String(fn.anchorWord).trim() : undefined,
      sourceType:
        fn.sourceType === 'interview' || /wawancara|observasi|narasumber|informan/i.test(fn.text || '')
          ? 'interview'
          : 'book',
    }));
  }
  return parsed;
}

// Stage 1 Endpoint
router.post(['/generate-journal/stage1', '/api/generate-journal/stage1'], async (req, res) => {
  try {
    const { rawText, metadata, targetLengthPages, selectedModel, methodologyType, templateId } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Teks skripsi tidak boleh kosong.' });
    }
    const data1 = await runStage1(ai, rawText, metadata, targetLengthPages, selectedModel, methodologyType, templateId);
    res.json(data1);
  } catch (error: any) {
    console.error('Error in Stage 1:', error);
    res.status(500).json({ error: 'Gagal memproses Tahap 1: ' + (error.message || 'Error server') });
  }
});

// Stage 2 Endpoint
router.post(['/generate-journal/stage2', '/api/generate-journal/stage2'], async (req, res) => {
  try {
    const { rawText, stage1Data, targetLengthPages, selectedModel, methodologyType, templateId } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Teks skripsi tidak boleh kosong.' });
    }
    const data2 = await runStage2(ai, rawText, stage1Data, targetLengthPages, selectedModel, methodologyType, templateId);
    res.json(data2);
  } catch (error: any) {
    console.error('Error in Stage 2:', error);
    res.status(500).json({ error: 'Gagal memproses Tahap 2: ' + (error.message || 'Error server') });
  }
});

// Stage 3 Endpoint
router.post(['/generate-journal/stage3', '/api/generate-journal/stage3'], async (req, res) => {
  try {
    const { rawText, stage1Data, stage2Data, footnoteStyle, selectedModel, methodologyType, templateId } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Teks skripsi tidak boleh kosong.' });
    }
    const data3 = await runStage3(ai, rawText, stage1Data, stage2Data, footnoteStyle, selectedModel, methodologyType, templateId);
    res.json(data3);
  } catch (error: any) {
    console.error('Error in Stage 3:', error);
    res.status(500).json({ error: 'Gagal memproses Tahap 3: ' + (error.message || 'Error server') });
  }
});

// Single combined endpoint running all 3 stages in sequence (Fallback & direct backend call)
router.post(['/generate-journal', '/api/generate-journal'], async (req, res) => {
  try {
    const { rawText, metadata, footnoteStyle, targetLengthPages, selectedModel, methodologyType, templateId } = req.body;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Teks skripsi tidak boleh kosong.' });
    }

    // Step 1: Metadata, Abstract, Pendahuluan, Metode
    const stage1 = await runStage1(ai, rawText, metadata, targetLengthPages, selectedModel, methodologyType, templateId);

    // Step 2: Hasil & Pembahasan
    const stage2 = await runStage2(ai, rawText, stage1, targetLengthPages, selectedModel, methodologyType, templateId);

    // Step 3: Kesimpulan, Footnotes, Daftar Pustaka
    const stage3 = await runStage3(ai, rawText, stage1, stage2, footnoteStyle, selectedModel, methodologyType, templateId);

    const mergedArticle = {
      id: 'art_' + Date.now(),
      createdAt: new Date().toISOString(),
      metadata: stage1.metadata || metadata,
      abstract: stage1.abstract,
      pendahuluan: stage1.pendahuluan,
      metode: stage1.metode,
      hasil: stage2.hasil,
      pembahasan: stage2.pembahasan,
      kesimpulan: stage3.kesimpulan,
      daftarPustaka: stage3.daftarPustaka || [],
      footnotes: stage3.footnotes || [],
      selectedModel: selectedModel || 'gemini-3.1-flash-lite',
      detectedMethodType: stage1.detectedMethodType,
      methodologyDetails: stage1.methodologyDetails,
    };

    res.json(mergedArticle);
  } catch (error: any) {
    console.error('Error generating journal:', error);
    res.status(500).json({
      error: 'Gagal menggenerasi artikel ilmiah: ' + (error.message || 'Server error'),
    });
  }
});

// 3. Regenerate / Polish Specific Section Endpoint
router.post(['/regenerate-section', '/api/regenerate-section'], async (req, res) => {
  try {
    const { sectionName, currentText, instructions, contextTitle, selectedModel } = req.body;

    const promptText = `
Anda adalah Editor Jurnal Akademik Utama SINTA 1 / Scopus.
Tugas: Perbaiki dan tingkatkan penulisan bagian "${sectionName}" untuk artikel ilmiah bertajuk "${contextTitle || 'Artikel Ilmiah'}".

ATURAN FORMATTING KONTEN & BAHASA (PENTING):
- DILARANG KERAS menuliskan kembali judul bagian atau prefix seperti "A. Pendahuluan", "B. Metode Penelitian", "C. Hasil Penelitian", "D. Pembahasan", "E. Kesimpulan" di awal teks! Judul bagian sudah disediakan secara otomatis oleh sistem. Naskah WAJIB LANGSUNG dimulai dari kalimat isi.
- DILARANG KERAS menyertakan kata penjelas bahasa Inggris bertanda bintang/miring (misalnya *good corporate governance*, *corporate social responsibility*, *return on assets*, *novelty*, *research gap*, *limitations*) maupun di dalam tanda kurung untuk memperjelas istilah bahasa Indonesia.
- Seluruh teks WAJIB menggunakan bahasa Indonesia akademik baku murni yang mengalir alami tanpa menyisipkan padanan kata bahasa Inggris bertanda bintang (*...*) atau tanda kurung ((...)).
- KESESUAIAN METODOLOGI ASLI: Pertahankan jenis metodologi yang terkandung pada teks (jika kualitatif tetap kualitatif murni tanpa rumus statistik; jika studi pustaka tetap telaah pustaka/yuridis normatif; jika kuantitatif tetap kuantitatif).

Teks Saat Ini:
"""
${currentText}
"""

Instruksi Perbaikan dari Pengguna:
"${instructions || 'Tingkatkan kerapian bahasa, akademisme, dan kepadatan kalimat agar lebih ilmiah tanpa kata penjelas bahasa Inggris dalam tanda kurung.'}"

Hasilkan teks bagian "${sectionName}" yang baru dan lengkap dalam bahasa Indonesia akademis yang rapi. DILARANG memberikan kalimat pengantar atau menuliskan judul bagian, LANGSUNG teks isi analisis/temuan.
`;

    const response = await generateContentWithFallback({
      contents: promptText,
      model: selectedModel,
    });

    const rawText = getTextFromResponse(response).trim() || currentText;
    res.json({ newText: cleanSectionContent(rawText) });
  } catch (error: any) {
    console.error('Error regenerating section:', error);
    res.status(500).json({ error: 'Gagal memperbarui bagian artikel.' });
  }
});

// 4. Regenerate Standard Footnotes Endpoint (Book Citations & Interview/Observation with Interviewee Names)
router.post(['/regenerate-footnotes', '/api/regenerate-footnotes'], async (req, res) => {
  try {
    const { article, selectedModel } = req.body;
    if (!article) {
      return res.status(400).json({ error: 'Data artikel tidak ditemukan.' });
    }

    const promptText = `
Anda adalah Editor Jurnal Akademik Utama SINTA 1 / Scopus.
Tugas: Susun ulang **8 sampai 10 Catatan Kaki (Footnotes) Standar Ilmiah** untuk artikel berjudul "${article.metadata?.judul || 'Artikel Ilmiah'}".

ATURAN WAJIB PEMBUATAN FOOTNOTES (CATATAN KAKI PADA UMUMNYA):
1. **Footnote Referensi Buku / Literatur (6-7 Footnote di bagian pendahuluan, metode, pembahasan)**:
   - WAJIB menggunakan format footnote buku pada umumnya (Chicago/Turabian Style Indonesia):
     \`Nama Lengkap Penulis (tanpa dibalik), *Judul Buku* (Kota Terbit: Nama Penerbit, Tahun Terbit), hlm. [nomor halaman].\`
   - Gunakan buku/literatur yang relevan dari Daftar Pustaka atau teks artikel di bawah.
   - Contoh: \`Sugiyono, *Metode Penelitian Kuantitatif, Kualitatif, dan R&D* (Bandung: Alfabeta, 2022), hlm. 85.\`
   - Isi \`sourceType\` dengan \`"book"\`.

2. **Footnote Hasil Observasi & Wawancara Lapangan (2-3 Footnote di bagian metode, hasil, atau pembahasan)**:
   - WAJIB menyertakan **Nama Lengkap Narasumber yang Diwawancarai**, **Jabatan/Peran Narasumber**, **Lokasi Observasi/Wawancara**, dan **Tanggal Pelaksanaan**.
   - Contoh: \`Hasil Observasi dan Wawancara Mendalam dengan Bapak H. Hendra Wijaya (Pemilik UMKM Kuliner Kedai Nusantara), di lokasi penelitian pada tanggal 14 Januari 2025.\`
   - Isi \`sourceType\` dengan \`"interview"\`.

3. **Kata Acuan (anchorWord)**:
   - Pilih kata atau frasa pendek (1-3 kata) yang benar-benar muncul di dalam bagian \`sectionId\` (\`'pendahuluan'\`, \`'metode'\`, \`'hasil'\`, atau \`'pembahasan'\`).

Cuplikan Isi Artikel:
- A. Pendahuluan: ${(article.pendahuluan || '').slice(0, 1500)}
- B. Metode Penelitian: ${(article.metode || '').slice(0, 1500)}
- C. Hasil Penelitian: ${(article.hasil || '').slice(0, 1500)}
- D. Pembahasan: ${(article.pembahasan || '').slice(0, 1500)}
- Daftar Pustaka: ${Array.isArray(article.daftarPustaka) ? article.daftarPustaka.join('\n') : article.daftarPustaka || ''}

Kembalikan HANYA format JSON valid dengan array \`footnotes\`.
`;

    const response = await generateContentWithFallback({
      contents: promptText,
      model: selectedModel || article.selectedModel,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            footnotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  number: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  sectionId: { type: Type.STRING },
                  anchorWord: { type: Type.STRING },
                  sourceType: { type: Type.STRING },
                },
                required: ['id', 'number', 'text', 'sectionId'],
              },
            },
          },
          required: ['footnotes'],
        },
      },
    });

    const parsed = safeJsonParse(getTextFromResponse(response), { footnotes: [] });
    const formattedFootnotes = (parsed.footnotes || []).map((fn: any, idx: number) => ({
      id: fn.id || `fn_${Date.now()}_${idx + 1}`,
      number: idx + 1,
      text: (fn.text || '').trim(),
      sectionId: ['pendahuluan', 'metode', 'hasil', 'pembahasan', 'kesimpulan'].includes(fn.sectionId)
        ? fn.sectionId
        : idx < 3
        ? 'pendahuluan'
        : idx < 5
        ? 'metode'
        : idx < 7
        ? 'hasil'
        : 'pembahasan',
      anchorWord: fn.anchorWord ? String(fn.anchorWord).trim() : undefined,
      sourceType:
        fn.sourceType === 'interview' || /wawancara|observasi|narasumber|informan/i.test(fn.text || '')
          ? 'interview'
          : 'book',
    }));

    res.json({ footnotes: formattedFootnotes });
  } catch (error: any) {
    console.error('Error regenerating footnotes:', error);
    res.status(500).json({ error: 'Gagal memperbarui catatan kaki (footnotes).' });
  }
});

// 5. Direct Source Code Archive Download Endpoint (.zip)
router.get(['/download-source-code', '/api/download-source-code'], (req, res) => {
  try {
    const zipPath = '/tmp/source-code-skripsi-to-journal.zip';
    if (!fs.existsSync(zipPath)) {
      // Generate clean zip file excluding node_modules and .git
      const pyScript = `import zipfile, os
zip_filename = '/tmp/source-code-skripsi-to-journal.zip'
exclude_dirs = {'node_modules', '.git', 'dist', '.cache', 'dist-server', 'uploads'}
exclude_files = {'.env', 'r2_config.json', 'academic_documents.json', 'makalah_posts.json', 'agc_posts.json', 'source-code-skripsi-to-journal.zip'}
with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file in exclude_files:
                continue
            filepath = os.path.join(root, file)
            arcname = os.path.relpath(filepath, '.')
            zipf.write(filepath, arcname)`;
      execFileSync('python3', ['-c', pyScript]);
    }
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="source-code-skripsi-to-journal.zip"');
      return res.sendFile(zipPath);
    } else {
      return res.status(500).json({ error: 'Gagal membuat file arsip zip.' });
    }
  } catch (err: any) {
    console.error('Error generating source zip:', err);
    res.status(500).json({ error: 'Gagal mengunduh source code: ' + err.message });
  }
});

export const journal7Router = router;
