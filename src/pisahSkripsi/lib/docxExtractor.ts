import mammoth from 'mammoth';
import { PageTextInfo } from '../types';

/**
 * Extract text from a Microsoft Word (.docx) file ArrayBuffer and chunk into logical pages.
 */
export async function extractDocxText(
  docxBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<{ pages: PageTextInfo[] }> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
    const rawText = result.value || '';

    // Split text into paragraphs
    const paragraphs = rawText.split(/\n\s*\n/);
    const pages: PageTextInfo[] = [];
    let currentPageText = '';
    let pageNum = 1;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (!p) continue;

      // Check for major heading boundaries to start a logical new page
      const isMajorHeading = /^(BAB\s+(?:I|II|III|IV|V|1|2|3|4|5)|ABSTRAK|ABSTRACT|DAFTAR\s+(?:ISI|PUSTAKA|TABEL|GAMBAR)|HALAMAN|JUDUL|PERSETUJUAN|PENGESAHAN)/i.test(p);

      if (
        currentPageText.length > 0 &&
        (currentPageText.length + p.length > 1800 || (isMajorHeading && currentPageText.length > 400))
      ) {
        pages.push({
          pageNumber: pageNum++,
          text: currentPageText.trim(),
          isOcr: false,
        });
        currentPageText = p;
      } else {
        currentPageText += (currentPageText ? '\n\n' : '') + p;
      }
    }

    if (currentPageText.trim()) {
      pages.push({
        pageNumber: pageNum,
        text: currentPageText.trim(),
        isOcr: false,
      });
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        text: rawText.trim() || 'Dokumen Word tidak berisi teks.',
        isOcr: false,
      });
    }

    if (onProgress) {
      onProgress(pages.length, pages.length);
    }

    return { pages };
  } catch (err) {
    console.error('Error extracting text from DOCX:', err);
    throw new Error('Gagal membaca file Word (.docx). Pastikan file berformat Word yang valid.');
  }
}
