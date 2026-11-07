import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PageTextInfo } from '../types';

// Set up worker for pdfjs using local bundled worker or unpkg fallback
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

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
 * Extract text from every page of a PDF ArrayBuffer or Uint8Array.
 * Uses high-speed server extraction first (robust across all browsers/OS) with local PDF.js fallback.
 */
export async function extractPdfText(
  pdfBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<{ pages: PageTextInfo[]; pdfDoc: any }> {
  const bufferCopy = pdfBuffer.slice(0);

  // 1. Ultra-fast and bulletproof server extraction (bypasses browser worker/iframe limitations)
  try {
    onProgress?.(1, 10);
    const fileBase64 = arrayBufferToBase64(bufferCopy);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch('/api/extract-pdf-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        const pages: PageTextInfo[] = data.pages.map((p: any) => ({
          pageNumber: p.pageNumber,
          text: p.text || '',
          isOcr: false,
        }));

        if (onProgress) {
          onProgress(pages.length, pages.length);
        }

        const dummyPdfDoc: any = {
          numPages: data.totalPages || pages.length,
          _cachedThumbs: {},
          getPage: async (num: number) => ({
            pageNumber: num,
            getViewport: () => ({ width: 595, height: 842 }),
            render: () => ({ promise: Promise.resolve() }),
          }),
        };

        return { pages, pdfDoc: dummyPdfDoc };
      }
    }
  } catch (srvErr) {
    console.warn('Server-side PDF text extraction failed, using client fallback:', srvErr);
  }

  // 2. Client fallback via PDF.js if available
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bufferCopy),
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const pages: PageTextInfo[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      pages.push({
        pageNumber: i,
        text,
        isOcr: false,
      });

      if (onProgress) {
        onProgress(i, totalPages);
      }
    }

    return { pages, pdfDoc };
  } catch (clientErr) {
    console.error('All PDF extraction strategies failed:', clientErr);
    throw clientErr;
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
