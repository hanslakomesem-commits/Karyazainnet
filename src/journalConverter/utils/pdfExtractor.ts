import * as pdfjsLib from 'pdfjs-dist';

// Configure worker safely for browser environment
if (typeof window !== 'undefined') {
  try {
    // Use same-origin local worker to bypass iframe CSP/CORS blocks
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch (e) {
    console.warn('Could not set workerSrc:', e);
  }
}

export interface PdfExtractionProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
  stage?: string;
}

/**
 * Extract text from PDF ArrayBuffer in browser with strict per-page timeout and memory cleanup.
 * If the PDF is too large (>40 pages on mobile, or hangs on a complex page), it cleanly fails fast
 * to allow instant server-side processing without locking the browser.
 */
export async function extractTextFromPdfArrayBuffer(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<string> {
  // Mobile browser check: Mobile devices have low RAM; limit client-side extraction
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  } as any);

  let pdfDocument: any = null;

  try {
    // Step 1: Catalog/Header loading with 6s timeout
    pdfDocument = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          try { (loadingTask as any).destroy(); } catch (_) {}
          reject(new Error('Koneksi worker PDF lambat, alihkan ke pemrosesan server'));
        }, 6000);
      }),
    ]);

    const numPages = pdfDocument.numPages;

    // If PDF is very large on a mobile device (>45 pages), immediately switch to server to avoid OOM
    if (isMobile && numPages > 45) {
      try { (loadingTask as any).destroy(); } catch (_) {}
      throw new Error(`Dokumen memiliki ${numPages} halaman. Mengalihkan ke server agar pemrosesan lebih cepat dan stabil di perangkat ponsel.`);
    }

    const pageTexts: string[] = [];
    const startTime = Date.now();
    const MAX_TOTAL_DURATION_MS = isMobile ? 12000 : 20000; // max total time for client extraction
    let consecutiveErrors = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      // Check total elapsed time
      if (Date.now() - startTime > MAX_TOTAL_DURATION_MS && pageTexts.length >= 20) {
        console.warn(`[PDF Extractor] Total client time exceeded ${MAX_TOTAL_DURATION_MS}ms, proceeding with extracted ${pageTexts.length} pages or delegating to server`);
        // If we already extracted at least 20 pages, we can either use it or throw to server
        if (pageNum < numPages * 0.7) {
          throw new Error('Pemrosesan browser melampaui batas waktu, beralih ke server...');
        }
        break;
      }

      let page: any = null;
      try {
        // Step 2: Per-page getPage timeout (max 1500ms)
        const pagePromise = pdfDocument.getPage(pageNum);
        page = await Promise.race([
          pagePromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout memuat halaman ${pageNum}`)), 1500)
          ),
        ]);

        // Step 3: Per-page getTextContent timeout (max 1500ms)
        const textPromise = page.getTextContent();
        const textContent: any = await Promise.race([
          textPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout mengekstrak teks halaman ${pageNum}`)), 1500)
          ),
        ]);

        const strings: string[] = [];
        let lastY: number | null = null;

        for (const item of textContent.items || []) {
          if ('str' in item && typeof item.str === 'string') {
            if ('transform' in item && Array.isArray(item.transform)) {
              const currentY = item.transform[5];
              if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                strings.push('\n');
              }
              lastY = currentY;
            }
            strings.push(item.str + ' ');
          }
        }

        const pageText = strings.join('').trim();
        if (pageText.length > 0) {
          pageTexts.push(pageText);
        }

        consecutiveErrors = 0;

        if (onProgress) {
          onProgress({
            currentPage: pageNum,
            totalPages: numPages,
            percent: Math.round((pageNum / numPages) * 100),
          });
        }
      } catch (pageErr) {
        console.warn(`[PDF Extractor] Warning on page ${pageNum} (skipping to avoid hang):`, pageErr);
        consecutiveErrors++;

        // If 4 pages in a row fail/freeze, abort and switch to server
        if (consecutiveErrors >= 4) {
          throw new Error('Terjadi kendala pada beberapa halaman PDF di browser, mengalihkan ke pemroses server...');
        }
      } finally {
        // CRITICAL: Clean up page memory immediately to avoid browser crashing / freezing
        if (page && typeof page.cleanup === 'function') {
          try {
            page.cleanup();
          } catch (_) {}
        }
      }
    }

    const fullText = pageTexts.join('\n\n');
    if (!fullText || fullText.trim().length < 30) {
      throw new Error('Teks tidak ditemukan dalam PDF. Pastikan PDF bukan hasil scan murni berupa gambar tanpa OCR.');
    }

    return fullText;
  } finally {
    try {
      if (pdfDocument && typeof pdfDocument.cleanup === 'function') {
        pdfDocument.cleanup();
      }
      if (pdfDocument && typeof pdfDocument.destroy === 'function') {
        pdfDocument.destroy();
      }
      (loadingTask as any)?.destroy?.();
    } catch (_) {}
  }
}

