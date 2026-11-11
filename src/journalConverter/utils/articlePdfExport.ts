/** ZAINNET_LINK7_ZIP5_20261111 — Article PDF, not a renamed DOCX. */
import { jsPDF } from 'jspdf';
import type { JournalArticle } from '../types/journal';

const clean = (value: unknown): string => String(value ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\*\*/g, '')
  .replace(/\r/g, '')
  .replace(/[\t ]+/g, ' ')
  .trim();

/** Creates a real, searchable PDF from the completed article text.
 *  Layout follows 3 cm margins / Times 12 / 1.5 line spacing approximately.
 *  Its pagination/footnote position can differ from the DOCX export.
 */
export function buildArticlePdf(article: JournalArticle): Blob {
  const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait', compress: true });
  const margin = 30;
  const maxWidth = 210 - margin * 2;
  const pageBottom = 297 - margin;
  const lineHeight = 6.35;
  let y = margin;

  const pageIfNecessary = (needed = lineHeight) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = margin;
    }
  };
  const setStyle = (bold = false, size = 12) => {
    doc.setFont('times', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(25, 25, 25);
  };
  const writeText = (raw: unknown, bold = false, centered = false) => {
    const text = clean(raw);
    if (!text) return;
    setStyle(bold);
    const paragraphs = text.split(/\n\s*\n|\n/).map(t => t.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string[];
      for (const line of wrapped) {
        pageIfNecessary();
        if (centered) doc.text(line, 105, y, { align: 'center' });
        else doc.text(line, margin, y);
        y += lineHeight;
      }
      y += 2;
    }
    y += 2;
  };
  const heading = (text: string) => {
    pageIfNecessary(18);
    writeText(text.toUpperCase(), true);
  };

  writeText(article.metadata?.judul || 'ARTIKEL ILMIAH', true, true);
  writeText(article.metadata?.nama || 'Penulis', true, true);
  writeText([article.metadata?.instansi, article.metadata?.prodi, article.metadata?.email]
    .filter(Boolean).join(' • '), false, true);
  heading('ABSTRAK');
  writeText(article.abstract?.abstrakIndo);
  writeText(`Kata kunci: ${(article.abstract?.keywordsIndo || []).join(', ')}`);
  if (article.abstract?.abstrakEnglish) {
    heading('ABSTRACT');
    writeText(article.abstract.abstrakEnglish);
    writeText(`Keywords: ${(article.abstract?.keywordsEnglish || []).join(', ')}`);
  }
  const sections: Array<[string, unknown]> = [
    ['PENDAHULUAN', article.pendahuluan],
    ['METODE PENELITIAN', article.metode],
    ['HASIL PENELITIAN', article.hasil],
    ['PEMBAHASAN', article.pembahasan],
    ['KESIMPULAN', article.kesimpulan],
  ];
  for (const [title, body] of sections) {
    heading(title);
    writeText(body);
  }
  if ((article.footnotes || []).length) {
    heading('CATATAN KAKI');
    for (const note of article.footnotes) writeText(`${note.number}. ${note.text}`);
  }
  heading('DAFTAR PUSTAKA');
  for (const ref of article.daftarPustaka || []) writeText(ref);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setStyle(false, 9);
    doc.text(String(i), 105, 285, { align: 'center' });
  }
  const blob = doc.output('blob');
  if (!blob || blob.size < 500) throw new Error('PDF artikel gagal dibuat.');
  return blob;
}
