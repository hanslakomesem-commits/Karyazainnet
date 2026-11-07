/**
 * Utility for converting uploaded PDF documents to high-resolution JPG images
 * Used for merging PDF attachments (Surat Tugas, Surat Izin, Surat Keaslian, etc.) into Word documents
 */

export interface ConvertedPdfPageResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  pageNumber: number;
  totalPdfPages: number;
  originalPdfName: string;
}

export function isPdfFile(file: File): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

const PDFJS_CDNS = [
  {
    lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  },
  {
    lib: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
    worker: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  },
  {
    lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  }
];

async function loadPdfJsLibrary(): Promise<any> {
  const win = window as any;
  if (win.pdfjsLib) return win.pdfjsLib;

  let lastError: Error | null = null;
  for (const cdn of PDFJS_CDNS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          script.onerror = null;
          script.onload = null;
          reject(new Error(`Timeout loading ${cdn.lib}`));
        }, 3500);

        script.src = cdn.lib;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          clearTimeout(timeout);
          if (win.pdfjsLib) {
            win.pdfjsLib.GlobalWorkerOptions.workerSrc = cdn.worker;
            resolve();
          } else {
            reject(new Error('pdfjsLib is undefined'));
          }
        };
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load ${cdn.lib}`));
        };
        document.head.appendChild(script);
      });
      return win.pdfjsLib;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Semua sumber CDN PDF.js gagal dimuat');
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const b64 = res.split(',')[1] || '';
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function convertPdfToJpgPages(
  file: File,
  options?: {
    quality?: number;
    scale?: number;
    onProgress?: (status: string) => void;
  }
): Promise<ConvertedPdfPageResult[]> {
  const quality = options?.quality ?? 0.94;
  const scale = options?.scale ?? 2.4; // 2.4x scale produces ~200-300 DPI clarity for printed A4 documents
  const onProgress = options?.onProgress;
  const baseName = file.name.replace(/\.pdf$/i, '').trim();

  // 1. Try server-side conversion first (fast, reliable, bypasses CORS/CDN worker restrictions in Firefox 115)
  try {
    onProgress?.(`Mengonversi "${file.name}" secara otomatis ke JPG berkualitas tinggi...`);
    const fileBase64 = await fileToBase64(file);
    const resp = await fetch('/api/convert-pdf-to-jpg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64,
        scale,
        quality: Math.round(quality * 100),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        const results: ConvertedPdfPageResult[] = [];
        const total = data.pages.length;
        for (const p of data.pages) {
          const blob = dataUrlToBlob(p.dataUrl);
          const jpgFileName = total === 1 ? `${baseName}.jpg` : `${baseName}_hal_${p.pageNumber}.jpg`;
          const jpgFile = new File([blob], jpgFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          results.push({
            file: jpgFile,
            dataUrl: p.dataUrl,
            width: p.width,
            height: p.height,
            pageNumber: p.pageNumber,
            totalPdfPages: total,
            originalPdfName: file.name,
          });
        }
        return results;
      }
    }
  } catch (srvErr) {
    console.warn('Server-side PDF conversion error, trying client fallback:', srvErr);
  }

  // 2. Client fallback via PDF.js if available
  if (typeof window === 'undefined') return [];

  onProgress?.(`Menyiapkan pembaca PDF untuk "${file.name}"...`);
  const pdfjsLib = await loadPdfJsLibrary();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const results: ConvertedPdfPageResult[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(`Mengonversi halaman ${pageNum} dari ${totalPages} pada "${file.name}" ke JPG...`);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Gagal membuat context canvas untuk render PDF');
    }

    // Render with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality);
    });

    // Meaningful naming: single page preserves original base name, multi-page appends page index
    const jpgFileName = totalPages === 1 
      ? `${baseName}.jpg` 
      : `${baseName}_hal_${pageNum}.jpg`;

    const jpgFile = new File([blob], jpgFileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });

    results.push({
      file: jpgFile,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      pageNumber: pageNum,
      totalPdfPages: totalPages,
      originalPdfName: file.name
    });
  }

  return results;
}
