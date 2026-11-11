import type { DocxElement } from '../types/skripsi';

export interface LampiranHeading {
  index: number;
  number: number;
  text: string;
}
export interface LampiranInsertionChoice {
  afterNumber: number;
  afterHeadingIndex: number;
  insertionIndex: number;
  description: string;
}

function parseRoman(raw: string): number {
  const vals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  const chars = raw.toUpperCase();
  for (let i = 0; i < chars.length; i++) {
    const a = vals[chars[i]] || 0;
    const b = vals[chars[i + 1]] || 0;
    result += a < b ? -a : a;
  }
  return result;
}

function headingPattern(text: string): RegExpMatchArray | null {
  return text.match(/^\s*LAMPIRAN\s*(?:KE[\s.-]*)?(\d{1,3}|[IVXLCDM]{1,8})(?=$|[\s.:)\-])/i);
}

function looksLikeContentsEntry(el: DocxElement): boolean {
  return /<w:tab\b|w:leader=|<w:instrText\b|TOC\\o|\.\s*\.\s*\./i.test(el.rawXml) ||
    /(?:\.{3,}|\s{2,}\d{1,3})\s*$/.test(el.text);
}

/** Headings in body only. Ignore references and entries in DAFTAR ISI/LAMPIRAN. */
export function getLampiranHeadings(elements: DocxElement[]): LampiranHeading[] {
  const firstBodyChapter = elements.findIndex(el => /^BAB\s+(?:I|1)(?=\s|\.|$)/i.test(el.text.trim()));
  return elements.flatMap((el, index) => {
    if (firstBodyChapter >= 0 && index < firstBodyChapter) return [];
    if (el.tag !== 'w:p' || looksLikeContentsEntry(el)) return [];
    const text = el.text.trim();
    if (text.length > 170) return [];
    const matched = headingPattern(text);
    if (!matched) return [];
    const num = /^\d+$/.test(matched[1]) ? Number(matched[1]) : parseRoman(matched[1]);
    if (!Number.isInteger(num) || num < 1 || num > 99) return [];
    return [{index, number: num, text}];
  });
}

export function getLampiranInsertionChoices(elements: DocxElement[]): LampiranInsertionChoice[] {
  const headings = getLampiranHeadings(elements);
  return headings.map((heading, i) => {
    const next = headings[i + 1];
    let insertionIndex = next?.index;
    if (insertionIndex === undefined) {
      // Last appendix: insert before the author's biography / final sectPr if present.
      const nextBoundary = elements.findIndex((el, j) => j > heading.index &&
        (/^(?:DAFTAR\s+RIWAYAT\s+HIDUP|RIWAYAT\s+HIDUP|BIODATA(?:\s+PENULIS)?|CURRICULUM\s+VITAE)(?=\s|$)/i.test(el.text.trim()) || el.tag === 'w:sectPr'));
      insertionIndex = nextBoundary >= 0 ? nextBoundary : Math.min(elements.length - 1, heading.index + 1);
    }
    return {
      afterNumber: heading.number,
      afterHeadingIndex: heading.index,
      insertionIndex,
      description: next ? `sebelum Lampiran ${next.number}` : 'di akhir bagian lampiran',
    };
  });
}

/** Retains the original OOXML runs, style and caption text; replaces only heading numeral. */
export function replaceLampiranHeadingNumber(rawXml: string, toNumber: number): string {
  const matches = [...rawXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)];
  if (!matches.length) return rawXml;
  const text = matches.map(m => m[1]).join('');
  const heading = headingPattern(text);
  if (!heading) return rawXml;
  const token = heading[1];
  const numAt = (heading.index || 0) + heading[0].lastIndexOf(token);
  const numEnd = numAt + token.length;
  const out: string[] = [];
  let prevEnd = 0;
  let cursor = 0;
  let replaced = false;
  for (const m of matches) {
    const pos = m.index!;
    out.push(rawXml.slice(prevEnd, pos));
    const start = cursor;
    const end = cursor + m[1].length;
    let nextText = m[1];
    if (end > numAt && start < numEnd) {
      const left = m[1].slice(0, Math.max(0, numAt - start));
      const right = m[1].slice(Math.min(m[1].length, numEnd - start));
      nextText = left + (replaced ? '' : String(toNumber)) + right;
      replaced = true;
    }
    out.push(m[0].replace(m[1], nextText));
    prevEnd = pos + m[0].length;
    cursor = end;
  }
  out.push(rawXml.slice(prevEnd));
  return replaced ? out.join('') : rawXml;
}
