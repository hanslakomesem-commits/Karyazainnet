import { PDFDocument } from 'pdf-lib';
import { SectionRange, SplitPdfResult } from '../types';

/**
 * Split a master PDF ArrayBuffer into multiple standalone PDF files
 * based on section ranges without modifying original page quality.
 */
export async function splitPdfSections(
  pdfBuffer: ArrayBuffer,
  sections: SectionRange[],
  onProgress?: (index: number, total: number) => void
): Promise<SplitPdfResult[]> {
  // Use a sliced copy to ensure pdf-lib does not detach or mutate master ArrayBuffer
  const bufferCopy = pdfBuffer.slice(0);
  const masterDoc = await PDFDocument.load(bufferCopy, { ignoreEncryption: true });
  const totalPages = masterDoc.getPageCount();
  const activeSections = sections.filter(s => s.detected && s.startPage > 0 && s.endPage >= s.startPage);
  const results: SplitPdfResult[] = [];

  for (let i = 0; i < activeSections.length; i++) {
    const sec = activeSections[i];
    const startIdx = Math.max(0, sec.startPage - 1); // 0-indexed
    const endIdx = Math.min(totalPages - 1, sec.endPage - 1);

    const pageIndices: number[] = [];
    for (let p = startIdx; p <= endIdx; p++) {
      pageIndices.push(p);
    }

    if (pageIndices.length === 0) continue;

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(masterDoc, pageIndices);
    copiedPages.forEach(page => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    results.push({
      key: sec.key,
      label: sec.label,
      filename: sec.filename,
      startPage: sec.startPage,
      endPage: sec.endPage,
      blob,
      url,
      byteSize: pdfBytes.byteLength,
    });

    if (onProgress) {
      onProgress(i + 1, activeSections.length);
    }
  }

  return results;
}
