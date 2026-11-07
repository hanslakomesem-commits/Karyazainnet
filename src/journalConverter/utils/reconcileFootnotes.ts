import type { FootnoteItem, JournalArticle } from '../types/journal';

/**
 * Consolidate 3 separate AI generations without treating [^1] in the Results
 * section as the same [^1] from the Introduction. Rewrite in-text anchors to
 * unique global IDs. Unlinked footnotes are reported by the audit, not invented.
 */
export function reconcileFootnotes(article: JournalArticle, parts: FootnoteItem[][]): JournalArticle {
  const sections = ['pendahuluan', 'metode', 'hasil', 'pembahasan'] as const;
  const all = parts.flat().filter(f => f && typeof f.text === 'string' && f.text.trim());
  const uniq: FootnoteItem[] = [];
  const seen = new Set<string>();
  for (const fn of all) {
    const sectionId = sections.includes(fn.sectionId as any) ? String(fn.sectionId) : 'pendahuluan';
    const key = `${sectionId}|${fn.text.toLocaleLowerCase('id-ID').replace(/\s+/g,' ').trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push({ ...fn, sectionId });
    }
  }
  const normalized: FootnoteItem[] = [];
  const next = { ...article };
  for (const section of sections) {
    const fromThisSection = uniq.filter(fn => fn.sectionId === section);
    const oldToNew = new Map<number, number>();
    for (const fn of fromThisSection) {
      const oldNum = Number(fn.number);
      const nextNum = normalized.length + 1;
      if (Number.isFinite(oldNum) && !oldToNew.has(oldNum)) oldToNew.set(oldNum, nextNum);
      normalized.push({ ...fn, id: `fn_${nextNum}`, number: nextNum });
    }
    next[section] = String(article[section] || '').replace(/\[\^(\d+)\]/g, (whole, num) => {
      const translated = oldToNew.get(Number(num));
      return translated ? `[^${translated}]` : whole;
    });
  }
  next.footnotes = normalized;
  return next;
}
