import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { PageTextInfo } from '../types';
import { backendUrl } from '../../utils/deploymentBridge';

// ZAIN.NET - Perbaikan PDF Worker GitHub Pages.
// Gunakan URL worker hasil build Vite secara langsung.
// Jangan gunakan URL worker bawaan PDF.js.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

/**
 * Extract the *actual* PDF page count and text.
 * Prefer the browser's bundled PDF.js worker: no Render cold-start, no upload,
 * real page progress, and a real PDFDocumentProxy for thumbnails.
 * Use the existing Render endpoint only when browser PDF.js cannot open the file.
 */
export async function extractPdfText(
  pdfBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<{ pages: PageTextInfo[]; pdfDoc: any }> {
  let browserError: unknown = null;

  // First, use the local Vite-bundled PDF.js worker.
  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer.slice(0)),
      disableFontFace: true,
      isEvalSupported: false,
    });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    if (!totalPages || totalPages < 1) {
      throw new Error('File PDF tidak berisi halaman yang dapat dibaca.');
    }

    const pages: PageTextInfo[] = [];
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdfDoc.getPage(pageNumber);
      let text = '';
      try {
        const textContent = await page.getTextContent();
        text = (textContent.items || [])
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
      } catch (textError) {
        console.warn('[ZAIN.NET Link 3] Teks halaman tidak terbaca:', pageNumber, textError);
      }

      pages.push({ pageNumber, text, isOcr: false });
      onProgress?.(pageNumber, totalPages);
    }
    return { pages, pdfDoc };
  } catch (error) {
    browserError = error;
    console.warn('[ZAIN.NET Link 3] PDF.js browser gagal; mencoba Render:', error);
    try { await loadingTask?.destroy(); } catch { /* ignore cleanup failure */ }
  }

  // Browser fallback: ask Render to extract text, but do not fabricate page counts.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 110000);
  try {
    const response = await fetch(backendUrl('/api/extract-pdf-text'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: arrayBufferToBase64(pdfBuffer) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Server pemrosesan PDF mengembalikan HTTP ${response.status}.`);
    }
    const data = await response.json();
    if (!Array.isArray(data.pages) || data.pages.length === 0) {
      throw new Error('Server tidak mengembalikan halaman PDF.');
    }
    const pages: PageTextInfo[] = data.pages.map((page: any, index: number) => ({
      pageNumber: Number(page.pageNumber) || index + 1,
      text: typeof page.text === 'string' ? page.text : '',
      isOcr: false,
    }));
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    onProgress?.(pages.length, pages.length);

    // The server returns text only, not a PDF.js document. Keep it null rather
    // than providing a fake renderer which would show blank thumbnails.
    return { pages, pdfDoc: null };
  } catch (serverError: any) {
    const serverMessage = serverError?.name === 'AbortError'
      ? 'Server cadangan melewati batas waktu 110 detik.'
      : (serverError?.message || 'Gagal menghubungi server cadangan.');
    throw new Error(
      `PDF belum dapat dibaca. Browser: ${String((browserError as any)?.message || browserError)}. ` +
      `Render: ${serverMessage}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Force High-Precision OCR re-scan on all pages of a PDF buffer using Tesseract.js.
 * High scale (2.0) renders crisp canvas images for maximum OCR accuracy on old scanned PDFs.
 */
export async function forceHighPrecisionOcr(
  pdfBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<PageTextInfo[]> {
  const bufferCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pages: PageTextInfo[] = [];

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('ind');

  try {
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2.0 scale for crisp OCR
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      let ocrText = '';
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        
        const dataUrl = canvas.toDataURL('image/png');
        const ret = await worker.recognize(dataUrl);
        if (ret.data.text) {
          ocrText = ret.data.text.trim();
        }
      }

      pages.push({
        pageNumber: i,
        text: ocrText,
        isOcr: true,
      });

      if (onProgress) {
        onProgress(i, totalPages);
      }
    }
  } finally {
    await worker.terminate();
  }

  return pages;
}

/**
 * Determine scan quality status of extracted pages
 */
export function getScanQualityStatus(pages: PageTextInfo[], isDocx = false, isImage = false): {
  status: 'digital_pdf' | 'scanned_pdf' | 'docx_word' | 'image_file';
  label: string;
  description: string;
  ocrPageCount: number;
} {
  if (isDocx) {
    return {
      status: 'docx_word',
      label: 'Naskah Word (.docx)',
      description: 'Struktur teks digital 100% presisi sempurna.',
      ocrPageCount: 0,
    };
  }

  if (isImage) {
    return {
      status: 'image_file',
      label: 'Dokumen Gambar (JPG/PNG)',
      description: 'Diolah via Full High-Precision OCR Tesseract.',
      ocrPageCount: pages.length,
    };
  }

  const ocrPages = pages.filter(p => p.isOcr || (p.text && p.text.length < 30));
  const ocrCount = ocrPages.length;

  if (ocrCount > 0 || pages.length === 0) {
    return {
      status: 'scanned_pdf',
      label: 'PDF Hasil Scan / Gambar OCR',
      description: `${ocrCount} dari ${pages.length} halaman terdeteksi hasil scan/fotokopi.`,
      ocrPageCount: ocrCount,
    };
  }

  return {
    status: 'digital_pdf',
    label: 'PDF Digital Native',
    description: 'Teks digital jernih. Presisi deteksi bab sangat tinggi.',
    ocrPageCount: 0,
  };
}

/**
 * Render a page to an image Data URL for thumbnails
 */
export async function renderPageToDataUrl(
  pdfDoc: any,
  pageNumber: number,
  scale = 0.5
): Promise<string> {
  if (pdfDoc?._cachedThumbs?.[pageNumber]) {
    return pdfDoc._cachedThumbs[pageNumber];
  }
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    return '';
  }
}
