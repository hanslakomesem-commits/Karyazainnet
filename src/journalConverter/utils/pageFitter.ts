import type { JournalArticle, SkripsiInput } from '../types/journal';
import { buildExtractiveArticle, assertArticleFromSource } from './extractiveArticle';
import { buildJournalDocx } from './docxExport';

export interface FittedArticle {
  article: JournalArticle;
  warnings: string[];
  pageCount: number | null;
  verified: boolean;
  attempts: number;
}

/** Count only the actual DOCX layout; no word-count approximation is called "verified". */
async function measureWordPages(blob: Blob): Promise<number> {
  const body = new FormData();
  body.append('article', blob, 'artikel.docx');
  const res = await fetch('/api/journal7/count-pages', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.measured !== true || !Number.isInteger(data.pageCount)) {
    throw new Error(data.error || 'Server belum dapat menghitung halaman dari hasil Word.');
  }
  return data.pageCount;
}

/**
 * Source-only page fitting. The variable changes selection budgets, not source prose.
 * If 15–17 is unattainable, return the nearest measured original-text result.
 */
export async function fitExtractiveArticleToPages(
  input: SkripsiInput,
  updateStatus?: (message: string, percent: number) => void,
): Promise<FittedArticle> {
  const target = 16;
  const tried = new Set<number>();
  const successful: Array<{ article: JournalArticle; pages: number; scale: number; warnings: string[] }> = [];
  let scale = 1;
  let low: number | null = null;
  let high: number | null = null;
  let measurementFailed = false;
  let measurementReason = '';
  for (let i = 0; i < 6; i++) {
    const rounded = Math.round(scale * 1000);
    if (tried.has(rounded)) break;
    tried.add(rounded);
    const { article, warnings } = buildExtractiveArticle(input, { selectionScale: scale });
    assertArticleFromSource(article, input.rawText, input.sourceFootnotes || {});
    updateStatus?.(`Mengukur halaman Word asli (percobaan ${i + 1}/6)...`, Math.round(35 + i * 9));
    try {
      const pages = await measureWordPages(await buildJournalDocx(article));
      successful.push({ article, pages, scale, warnings });
      if (pages >= 15 && pages <= 17) break;
      if (pages < 15) low = Math.max(low ?? 0, scale);
      if (pages > 17) high = Math.min(high ?? 4, scale);
      if (low !== null && high !== null) {
        scale = (low + high) / 2;
      } else {
        scale = Math.max(0.25, Math.min(3, scale * Math.pow(target / Math.max(1, pages), 1.15)));
      }
      if (scale >= 3 && pages < 15 || scale <= 0.25 && pages > 17) break;
    } catch (err: any) {
      measurementFailed = true;
      measurementReason = err?.message || 'Server pengukuran belum tersedia.';
      break;
    }
  }
  if (!successful.length) {
    // Safe fallback; no false claims about actual pages.
    const { article, warnings } = buildExtractiveArticle(input);
    return { article, pageCount: null, verified: false, attempts: tried.size,
      warnings: [...warnings, `Jumlah halaman belum dapat diverifikasi: ${measurementReason}. Periksa Word sebelum dicetak.`] };
  }
  successful.sort((a, b) =>
    Math.abs(a.pages - target) - Math.abs(b.pages - target) ||
    // prefer an article within target over one outside; smaller otherwise
    a.pages - b.pages
  );
  const chosen = successful[0];
  const warnings = [...chosen.warnings];
  if (!(chosen.pages >= 15 && chosen.pages <= 17)) {
    warnings.push(`Artikel berisi ${chosen.pages} halaman hasil render Word; target 15–17 tidak tercapai hanya dari materi asli. Tidak menambah kalimat buatan.`);
  }
  if (measurementFailed) warnings.push(`Pengukuran terhenti: ${measurementReason}. Hasil terakhir yang terukur tetap digunakan.`);
  return { article: chosen.article, warnings, pageCount: chosen.pages, verified: true, attempts: tried.size };
}
