import JSZip from 'jszip';

export interface ThesisSection {
  id: string;
  type: 'cover' | 'front_matter' | 'bab_1' | 'bab_other' | 'back_matter';
  title: string;
  paragraphIndex: number;
  hasExistingSectPr: boolean;
  sectionOrdinal?: number;
  expectedNumbering: {
    format: 'none' | 'lowerRoman' | 'decimal';
    startAt?: number | string;
    firstPagePos: 'none' | 'bottom_center' | 'top_right';
    defaultPagePos: 'none' | 'bottom_center' | 'top_right';
  };
  currentStatus: { hasNumberingIssue: boolean; issues: string[] };
  isChapterStart?: boolean;
}

export interface DocumentAnalysis {
  fileName: string;
  fileSizeBytes: number;
  totalParagraphs: number;
  totalExistingSections: number;
  sections: ThesisSection[];
  detectedIssues: string[];
  isCompliant: boolean;
  toc: { exists: boolean; nativeField: boolean; needsWordUpdate: boolean; createdOnCorrection: boolean; notes: string[] };
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const HEADER_CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml';
const FOOTER_CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml';
const REL_HEADER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header';
const REL_FOOTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer';

const parser = () => new DOMParser();
const serializer = () => new XMLSerializer();

function localName(el: Element): string {
  return el.localName || el.nodeName.replace(/^.*:/, '');
}
function attr(el: Element | null, local: string): string {
  if (!el) return '';
  return el.getAttributeNS(W_NS, local) || el.getAttribute(`w:${local}`) || el.getAttribute(local) || '';
}
function child(parent: Element, name: string): Element | null {
  return Array.from(parent.children).find(x => localName(x) === name) || null;
}
function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter(x => localName(x) === name);
}
function parseXml(xml: string): Document {
  const d = parser().parseFromString(xml, 'application/xml');
  if (d.getElementsByTagName('parsererror').length) throw new Error('XML Word tidak valid.');
  return d;
}

export function getParagraphText(p: Element): string {
  let result = '';
  function walk(node: Node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      const name = el.localName || el.nodeName.replace(/^w:/, '');
      if (name === 't') {
        result += el.textContent || '';
      } else if (name === 'tab') {
        result += '\t';
      } else if (name === 'br' || name === 'cr') {
        result += ' ';
      } else {
        for (let i = 0; i < el.childNodes.length; i++) {
          walk(el.childNodes[i]);
        }
      }
    }
  }
  walk(p);
  return result.replace(/\u00a0/g, ' ').trim();
}
function styleId(p: Element): string {
  const pPr = child(p, 'pPr');
  return (pPr ? attr(child(pPr, 'pStyle'), 'val') : '').toLowerCase();
}
function normalize(s: string): string {
  return s.toUpperCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
}
function hasPageBreak(p: Element): boolean {
  return Array.from(p.getElementsByTagNameNS(W_NS, 'br')).some(x => /^page$/i.test(attr(x, 'type'))) ||
    p.getElementsByTagNameNS(W_NS, 'lastRenderedPageBreak').length > 0 ||
    !!child(child(p, 'pPr') || p, 'pageBreakBefore');
}
function hasBreakNear(paragraphs: Element[], index: number): boolean {
  if (index < 0 || index >= paragraphs.length) return false;
  if (hasPageBreak(paragraphs[index])) return true;
  if (index > 0 && hasPageBreak(paragraphs[index - 1])) return true;
  if (index > 0 && !!sectionOwner(paragraphs[index - 1])) return true;
  return false;
}
function isBabHeading(text: string, n: number): boolean {
  const roman = ['', 'I', 'II', 'III', 'IV', 'V'][n];
  const t = normalize(text);
  return new RegExp(
    `^(?:B\\s*A\\s*B|CHAPTER)\\s*[:.\\-]?\\s*(?:${roman}|0?${n})\\b`,
    'i'
  ).test(t);
}
function isBackHeading(text: string): boolean {
  return /^(DAFTAR PUSTAKA|BIBLIOGRAPHY|DAFTAR RUJUKAN|REFERENSI|LAMPIRAN|APPENDIX(?:ES)?|RIWAYAT HIDUP|BIODATA|CURRICULUM VITAE)\b/i.test(normalize(text));
}
export function isTocHeadingTitle(text: string): boolean {
  return /^(DAFTAR ISI|TABLE OF CONTENTS|DAFTAR TABEL|DAFTAR GAMBAR|DAFTAR LAMPIRAN|DAFTAR BAGAN|DAFTAR SINGKATAN|DAFTAR SIMBOL)\b/i.test(normalize(text));
}
function isTocStyle(style: string): boolean {
  return /^(toc|toc\d+|tocheading|daftar.?isi|table.?of.?contents|daftartabel|daftargambar)/i.test(style);
}
export function isTocEntryOrListParagraph(p: Element): boolean {
  // 1. Inside native TOC content control (sdt with TOC gallery/tag)
  let n: Node | null = p.parentNode;
  while (n && n.nodeType === 1) {
    const el = n as Element;
    if (localName(el) === 'sdt') {
      const sdtPr = child(el, 'sdtPr');
      if (sdtPr) {
        const docPartObj = child(sdtPr, 'docPartObj');
        if (docPartObj && /toc|table.?of.?contents/i.test(attr(child(docPartObj, 'docPartGallery'), 'val'))) {
          return true;
        }
        const tag = child(sdtPr, 'tag');
        if (tag && /toc/i.test(attr(tag, 'val'))) return true;
      }
    }
    n = n.parentNode;
  }

  // 2. Explicit TOC style (toc, toc 1, toc 2, etc.)
  if (isTocStyle(styleId(p))) return true;

  // 3. Tab with dot/hyphen/underscore leader
  const pPr = child(p, 'pPr');
  if (pPr) {
    for (const tabs of children(pPr, 'tabs')) {
      for (const tab of children(tabs, 'tab')) {
        if (/^(dot|hyphen|underscore)$/i.test(attr(tab, 'leader'))) return true;
      }
    }
  }

  const t = getParagraphText(p);
  // 4. Dot leaders (.... or …) AND ends with page number
  const hasLeaderDots = /\.{2,}|…|(?:\.\s*){3,}/.test(t);
  const endsWithPageNum = /(?:\d{1,4}|[ivxlcdm]+)\s*$/i.test(t);
  if (hasLeaderDots && endsWithPageNum) return true;

  // 5. Tab immediately preceding the page number at the end of the line
  if (/\t\s*(?:\d{1,4}|[ivxlcdm]+)\s*$/i.test(t)) return true;

  return false;
}
function isStrongTocEvidence(p: Element): boolean {
  return isTocEntryOrListParagraph(p);
}

function bodyParagraphs(body: Element): Element[] {
  const result: Element[] = [];
  function walk(node: Element) {
    for (const ch of Array.from(node.children)) {
      const name = localName(ch);
      if (name === 'p') {
        result.push(ch);
      } else if (name === 'sdt') {
        const content = child(ch, 'sdtContent');
        if (content) walk(content);
      }
    }
  }
  walk(body);
  return result;
}
function sectionOwner(p: Element): Element | null {
  return child(child(p, 'pPr') || p, 'sectPr');
}
interface SectionStart {
  ordinal: number;
  startParagraph: number;
  sectPr: Element | null;
  source: 'paragraph' | 'body';
}
function collectSectionStarts(body: Element, paragraphs: Element[]): SectionStart[] {
  const out: SectionStart[] = [];
  let start = 0, ordinal = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const s = sectionOwner(paragraphs[i]);
    if (s) {
      out.push({ ordinal, startParagraph: start, sectPr: s, source: 'paragraph' });
      ordinal++;
      start = i + 1;
    }
  }
  const bodySect = Array.from(body.children).find(x => localName(x) === 'sectPr') as Element | undefined;
  out.push({ ordinal, startParagraph: start, sectPr: bodySect || null, source: 'body' });
  return out;
}

function tocRanges(paragraphs: Element[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let inToc = false;
  let start = -1;
  let lastHit = -1;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const t = getParagraphText(p);

    if (isTocHeadingTitle(t)) {
      if (inToc && lastHit >= start) {
        ranges.push({ start, end: lastHit });
      }
      inToc = true;
      start = i;
      lastHit = i;
      continue;
    }

    if (!inToc) continue;

    // Check if this paragraph is a TOC entry
    if (isTocEntryOrListParagraph(p)) {
      lastHit = i;
      continue;
    }

    // If it is a real BAB heading and not a TOC row, TOC definitely ends here
    if ((isBabHeading(t, 1) || isBabHeading(t, 2)) && !isTocEntryOrListParagraph(p)) {
      if (lastHit >= start) ranges.push({ start, end: lastHit });
      inToc = false;
      start = -1;
      lastHit = -1;
      continue;
    }

    if (!t) continue; // blank spacer

    // Other front matter title ends TOC
    if (/^(KATA PENGANTAR|HALAMAN PENGESAHAN|LEMBAR PENGESAHAN|PERNYATAAN|ABSTRAK|ABSTRACT)\b/i.test(normalize(t))) {
      if (lastHit >= start) ranges.push({ start, end: lastHit });
      inToc = false;
      start = -1;
      lastHit = -1;
      continue;
    }

    // If more than 3 consecutive non-TOC paragraphs appear, TOC has ended
    if (i - lastHit > 3) {
      if (lastHit >= start) ranges.push({ start, end: lastHit });
      inToc = false;
      start = -1;
      lastHit = -1;
    }
  }

  if (inToc && lastHit >= start) {
    ranges.push({ start, end: lastHit });
  }

  return ranges;
}
function inRanges(i: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some(r => i >= r.start && i <= r.end);
}

function headingScore(paragraphs: Element[], i: number, n: number): number {
  const p = paragraphs[i];
  const t = getParagraphText(p);
  if (!isBabHeading(t, n)) return -Infinity;
  if (isTocEntryOrListParagraph(p)) return -Infinity;

  let score = 10;
  const style = styleId(p);
  if (/heading|judul|bab|chapter|title/i.test(style)) score += 10;
  if (hasBreakNear(paragraphs, i)) score += 8;
  if (t.length <= 80) score += 4;
  if (t === normalize(t) && /[A-Z]/.test(t)) score += 3;
  return score;
}

function findBabIndexes(paragraphs: Element[], toc: Array<{ start: number; end: number }>): Record<number, number> {
  const found: Record<number, number> = {};
  let previous = -1;
  for (let n = 1; n <= 5; n++) {
    const candidates: Array<{ i: number; score: number }> = [];
    for (let i = Math.max(0, previous + 1); i < paragraphs.length; i++) {
      if (inRanges(i, toc)) continue;
      const score = headingScore(paragraphs, i, n);
      if (Number.isFinite(score) && score > 0) candidates.push({ i, score });
    }
    // Fallback: if no candidates found outside toc ranges, look for any candidate that is not a toc entry
    if (!candidates.length) {
      for (let i = Math.max(0, previous + 1); i < paragraphs.length; i++) {
        if (!isTocEntryOrListParagraph(paragraphs[i])) {
          const score = headingScore(paragraphs, i, n);
          if (Number.isFinite(score) && score > 0) candidates.push({ i, score });
        }
      }
    }
    if (!candidates.length) continue;
    candidates.sort((a, b) => b.score - a.score || a.i - b.i);
    const chosen = candidates[0];
    found[n] = chosen.i;
    previous = chosen.i;
  }
  return found;
}

function findFrontStart(paragraphs: Element[], bab1: number, existing: SectionStart[]): number {
  const limit = bab1 >= 0 ? bab1 : paragraphs.length;
  // Existing section boundaries are the safest signal because they do not require
  // guessing from text. Use the earliest real boundary after cover.
  const existingFront = existing
    .filter(s => s.startParagraph > 0 && s.startParagraph < limit)
    .sort((a, b) => a.startParagraph - b.startParagraph)[0];
  if (existingFront) return existingFront.startParagraph;

  // Otherwise locate the first actual page break after content on the cover.
  // The first non-empty paragraph after that break becomes the start of cover-2/front matter.
  let breakSeen = false;
  for (let i = 0; i < limit; i++) {
    if (hasPageBreak(paragraphs[i])) { breakSeen = true; continue; }
    if (breakSeen && getParagraphText(paragraphs[i])) return i;
  }
  return Math.min(1, Math.max(0, limit - 1));
}

function desiredBoundaries(paragraphs: Element[], bab: Record<number, number>, existing: SectionStart[]): number[] {
  const starts = new Set<number>([0]);
  const front = findFrontStart(paragraphs, bab[1] ?? -1, existing);
  if (front > 0) starts.add(front);
  for (let n = 1; n <= 5; n++) if (bab[n] !== undefined) starts.add(bab[n]);

  let back = -1;
  for (let i = (bab[5] ?? 0) + 1; i < paragraphs.length; i++) {
    if (isBackHeading(getParagraphText(paragraphs[i]))) { back = i; break; }
  }
  if (back >= 0) starts.add(back);

  return [...starts].sort((a, b) => a - b);
}

const SECT_ORDER = [
  'headerReference','footerReference','type','pgSz','pgMar','paperSrc','pgBorders',
  'lnNumType','pgNumType','cols','formProt','vAlign','noEndnote','titlePg',
  'textDirection','bidi','rtlGutter','docGrid','printerSettings','endnotePr','footnotePr'
];
function normalizeSectPrOrder(sectPr: Element): void {
  const nodes = Array.from(sectPr.children);
  const rank = (el: Element) => {
    const i = SECT_ORDER.indexOf(localName(el));
    return i < 0 ? 999 : i;
  };
  nodes.sort((a, b) => rank(a) - rank(b));
  for (const n of nodes) sectPr.appendChild(n);
}
function setVal(el: Element, name: string, value: string): void {
  el.setAttributeNS(W_NS, `w:${name}`, value);
}
function setPageNumType(sectPr: Element, fmt: 'lowerRoman' | 'decimal' | null, start?: number): void {
  const old = child(sectPr, 'pgNumType');
  if (old) sectPr.removeChild(old);
  if (!fmt) { normalizeSectPrOrder(sectPr); return; }
  const el = sectPr.ownerDocument!.createElementNS(W_NS, 'w:pgNumType');
  setVal(el, 'fmt', fmt);
  if (start !== undefined) setVal(el, 'start', String(start));
  sectPr.appendChild(el);
  normalizeSectPrOrder(sectPr);
}
function ensureTitlePg(sectPr: Element, enabled: boolean): void {
  const old = child(sectPr, 'titlePg');
  if (enabled && !old) sectPr.appendChild(sectPr.ownerDocument!.createElementNS(W_NS, 'w:titlePg'));
  if (!enabled && old) sectPr.removeChild(old);
  normalizeSectPrOrder(sectPr);
}
function ensureSectType(sectPr: Element, val: 'continuous' | 'nextPage' = 'continuous'): void {
  let type = child(sectPr, 'type');
  if (!type) {
    type = sectPr.ownerDocument!.createElementNS(W_NS, 'w:type');
    sectPr.appendChild(type);
  }
  setVal(type, 'val', val);
  normalizeSectPrOrder(sectPr);
}
function copyGeometry(source: Element, target: Element): void {
  const tags = ['pgSz', 'pgMar', 'cols', 'docGrid', 'paperSrc', 'pgBorders', 'vAlign', 'textDirection', 'bidi', 'rtlGutter'];
  for (const tag of tags) {
    const srcEl = child(source, tag);
    const existing = child(target, tag);
    if (srcEl && !existing) {
      target.appendChild(srcEl.cloneNode(true));
    }
  }
}

function removeLeadingPageBreak(p: Element): void {
  const brs = Array.from(p.getElementsByTagNameNS(W_NS, 'br')).filter(b => /^page$/i.test(attr(b, 'type')));
  for (const b of brs) {
    const parent = b.parentNode;
    if (parent) parent.removeChild(b);
  }
}

function insertSectAt(
  body: Element,
  paragraphs: Element[],
  index: number,
  doc: Document,
  refSectPr: Element | null
): Element | null {
  if (index <= 0 || index >= paragraphs.length + 1) return null;
  const p = paragraphs[index - 1];
  const pPr = child(p, 'pPr') || (() => {
    const x = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(x, p.firstChild);
    return x;
  })();
  let sect = child(pPr, 'sectPr');
  if (!sect) {
    sect = doc.createElementNS(W_NS, 'w:sectPr');
    pPr.appendChild(sect);
  }

  // Copy geometry so margins (pgMar) and page size (pgSz) are 100% preserved
  if (refSectPr) {
    copyGeometry(refSectPr, sect);
  }

  // Chapters start on a new page to allow number format restart and clean page layout
  ensureSectType(sect, 'nextPage');

  // Also remove redundant page breaks at the beginning of the chapter paragraph
  if (paragraphs[index]) {
    removeLeadingPageBreak(paragraphs[index]);
  }

  return sect;
}

function relsMap(doc: Document): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of Array.from(doc.getElementsByTagName('Relationship'))) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (!id || !target) continue;
    let normalized = target.replace(/^\/+/, '');
    if (!normalized.startsWith('word/')) normalized = `word/${normalized}`;
    m.set(id, normalized);
  }
  return m;
}
function nextRid(doc: Document): string {
  let max = 0;
  for (const r of Array.from(doc.getElementsByTagName('Relationship'))) {
    const m = (r.getAttribute('Id') || '').match(/^rId(\d+)$/i);
    if (m) max = Math.max(max, +m[1]);
  }
  return `rId${max + 1}`;
}
function ensureContentType(ct: Document, path: string, type: string): void {
  if (Array.from(ct.getElementsByTagName('Override')).some(x => x.getAttribute('PartName') === `/${path}`)) return;
  const x = ct.createElementNS(TYPES_NS, 'Override');
  x.setAttribute('PartName', `/${path}`);
  x.setAttribute('ContentType', type);
  ct.documentElement.appendChild(x);
}
function addRel(rels: Document, type: string, target: string): string {
  const existing = Array.from(rels.getElementsByTagName('Relationship')).find(x => x.getAttribute('Target') === target);
  if (existing) return existing.getAttribute('Id') || '';
  const id = nextRid(rels);
  const r = rels.createElementNS(RELS_NS, 'Relationship');
  r.setAttribute('Id', id);
  r.setAttribute('Type', type);
  r.setAttribute('Target', target);
  rels.documentElement.appendChild(r);
  return id;
}
function setRef(sectPr: Element, kind: 'headerReference' | 'footerReference', type: 'default' | 'first', id: string): void {
  for (const x of children(sectPr, kind).filter(x => attr(x, 'type') === type)) sectPr.removeChild(x);
  const r = sectPr.ownerDocument!.createElementNS(W_NS, `w:${kind}`);
  setVal(r, 'type', type);
  r.setAttributeNS(R_NS, 'r:id', id);
  sectPr.appendChild(r);
  normalizeSectPrOrder(sectPr);
}
interface PartRef { id: string; target: string; kind: 'header' | 'footer'; }
function currentPartRef(sectPr: Element, kind: 'headerReference' | 'footerReference', type: 'default' | 'first', map: Map<string, string>): PartRef | null {
  const r = children(sectPr, kind).find(x => attr(x, 'type') === type);
  if (!r) return null;
  const id = r.getAttributeNS(R_NS, 'id') || r.getAttribute('r:id') || '';
  const target = map.get(id);
  return target ? { id, target, kind: kind === 'headerReference' ? 'header' : 'footer' } : null;
}

function makePageRun(doc: Document): Element {
  const r = doc.createElementNS(W_NS, 'w:r');
  const b = doc.createElementNS(W_NS, 'w:fldChar'); setVal(b, 'fldCharType', 'begin');
  const i = doc.createElementNS(W_NS, 'w:instrText'); i.setAttribute('xml:space', 'preserve'); i.textContent = ' PAGE ';
  const s = doc.createElementNS(W_NS, 'w:fldChar'); setVal(s, 'fldCharType', 'separate');
  const t = doc.createElementNS(W_NS, 'w:t'); t.textContent = '1';
  const e = doc.createElementNS(W_NS, 'w:fldChar'); setVal(e, 'fldCharType', 'end');
  [b, i, s, t, e].forEach(n => r.appendChild(n));
  return r;
}
function makeNumberParagraph(doc: Document, align: 'right' | 'center'): Element {
  const p = doc.createElementNS(W_NS, 'w:p');
  const pPr = doc.createElementNS(W_NS, 'w:pPr');
  const jc = doc.createElementNS(W_NS, 'w:jc');
  setVal(jc, 'val', align);
  pPr.appendChild(jc);
  p.appendChild(pPr);
  p.appendChild(makePageRun(doc));
  return p;
}

/**
 * Page-number parts are generated from a tiny clean header/footer, rather than
 * appending a new paragraph after arbitrary existing content. This prevents old
 * logos/text/page fields from leaking into the corrected number.
 *
 * This intentionally changes only header/footer numbering parts. Main document
 * text, tables, runs, styles and page breaks are not edited.
 */
function removePageFields(root: Document): Element[] {
  const touched: Element[] = [];
  const paragraphs = Array.from(root.getElementsByTagNameNS(W_NS, 'p'));
  for (const p of paragraphs) {
    const runs = Array.from(p.children).filter(x => localName(x) === 'r') as Element[];
    for (let i = 0; i < runs.length; i++) {
      const instr = Array.from(runs[i].getElementsByTagNameNS(W_NS, 'instrText'))
        .map(x => x.textContent || '').join(' ');
      if (!/\bPAGE(?:\s|\\|$)/i.test(instr) && !/\bPAGE\b/i.test(instr)) continue;

      let left = i;
      for (let j = i - 1; j >= 0; j--) {
        const fld = Array.from(runs[j].getElementsByTagNameNS(W_NS, 'fldChar'))
          .map(x => attr(x, 'fldCharType').toLowerCase());
        if (fld.includes('begin')) { left = j; break; }
        if (fld.includes('end')) break;
      }

      let right = i;
      for (let j = i; j < runs.length; j++) {
        const fld = Array.from(runs[j].getElementsByTagNameNS(W_NS, 'fldChar'))
          .map(x => attr(x, 'fldCharType').toLowerCase());
        if (j > i && fld.includes('end')) { right = j; break; }
        if (fld.includes('end')) { right = j; break; }
        right = j;
      }

      for (let j = left; j <= right; j++) {
        if (runs[j].parentNode === p) p.removeChild(runs[j]);
      }
      touched.push(p);
      i = -1;
      break;
    }
  }
  return touched;
}


function hasFieldInstruction(root: Document, pattern: RegExp): boolean {
  return Array.from(root.getElementsByTagNameNS(W_NS, 'instrText'))
    .some(x => pattern.test((x.textContent || '').trim()));
}

function ensureUpdateFields(zip: JSZip): Promise<void> {
  const f = zip.file('word/settings.xml');
  if (!f) return Promise.resolve();
  return f.async('text').then(xml => {
    const doc = parseXml(xml);
    const root = doc.documentElement;
    let update = Array.from(root.children).find(x => localName(x) === 'updateFields') as Element | undefined;
    if (!update) {
      update = doc.createElementNS(W_NS, 'w:updateFields');
      root.appendChild(update);
    }
    setVal(update, 'val', 'true');
    zip.file('word/settings.xml', serializer().serializeToString(doc));
  });
}

function ensureOutlineLevel(p: Element, level: 0 | 1 | 2): void {
  const doc = p.ownerDocument!;
  let pPr = child(p, 'pPr');
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }
  let outline = child(pPr, 'outlineLvl');
  if (!outline) {
    outline = doc.createElementNS(W_NS, 'w:outlineLvl');
    pPr.appendChild(outline);
  }
  setVal(outline, 'val', String(level));
}

function prepareAutomaticTocHeadings(body: Element, paragraphs: Element[]): void {
  // Equivalent to Word's References > Add Text > Level 1 for the major entries.
  // Existing Heading 1/2/3 styles are left untouched; we only add outline metadata
  // to clearly identifiable major headings so the native TOC field can index them.
  for (let n = 1; n <= 5; n++) {
    const p = paragraphs.find(x => isBabHeading(getParagraphText(x), n));
    if (p) ensureOutlineLevel(p, 0);
  }
  for (const p of paragraphs) {
    const t = getParagraphText(p);
    if (isBackHeading(t)) ensureOutlineLevel(p, 0);
    const style = styleId(p);
    if (/^heading[123]$/i.test(style)) continue;
  }
}

function makeTocFieldParagraph(doc: Document): Element {
  const p = doc.createElementNS(W_NS, 'w:p');
  const pPr = doc.createElementNS(W_NS, 'w:pPr');
  const jc = doc.createElementNS(W_NS, 'w:jc');
  setVal(jc, 'val', 'left');
  pPr.appendChild(jc);
  p.appendChild(pPr);

  const r = doc.createElementNS(W_NS, 'w:r');
  const begin = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(begin, 'fldCharType', 'begin');
  const instr = doc.createElementNS(W_NS, 'w:instrText');
  instr.setAttribute('xml:space', 'preserve');
  // \u makes Word include paragraphs explicitly marked with outlineLvl,
  // while \o keeps normal Heading 1-3 entries. This mirrors a native Word TOC.
  instr.textContent = ' TOC \\o "1-3" \\h \\z \\u ';
  const separate = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(separate, 'fldCharType', 'separate');
  const placeholder = doc.createElementNS(W_NS, 'w:t');
  placeholder.textContent = 'Klik kanan → Update Field untuk memperbarui Daftar Isi';
  const end = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(end, 'fldCharType', 'end');
  [begin, instr, separate, placeholder, end].forEach(n => r.appendChild(n));
  p.appendChild(r);
  return p;
}

function makeTextParagraph(doc: Document, text: string, style?: string): Element {
  const p = doc.createElementNS(W_NS, 'w:p');
  const pPr = doc.createElementNS(W_NS, 'w:pPr');
  if (style) {
    const ps = doc.createElementNS(W_NS, 'w:pStyle');
    setVal(ps, 'val', style);
    pPr.appendChild(ps);
  }
  p.appendChild(pPr);
  const r = doc.createElementNS(W_NS, 'w:r');
  const t = doc.createElementNS(W_NS, 'w:t');
  t.textContent = text;
  r.appendChild(t);
  p.appendChild(r);
  return p;
}

function ensureNativeToc(
  _zip: JSZip,
  docXml: Document,
  paragraphs: Element[],
  _bab1: number,
  _toc: Array<{ start: number; end: number }>
): { existed: boolean; created: boolean; normalizedManual: boolean } {
  const native = hasFieldInstruction(docXml, /^TOC\b/i);
  const body = docXml.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) return { existed: false, created: false, normalizedManual: false };

  // Prepare heading outlines so Word can index them, but NEVER delete or alter
  // the student's manual Daftar Isi or any other document text.
  prepareAutomaticTocHeadings(body, paragraphs);
  return { existed: native, created: false, normalizedManual: false };
}

function setParagraphAlignment(p: Element, align: 'right' | 'center'): void {
  const doc = p.ownerDocument!;
  let pPr = child(p, 'pPr');
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }
  let jc = child(pPr, 'jc');
  if (!jc) {
    jc = doc.createElementNS(W_NS, 'w:jc');
    pPr.appendChild(jc);
  }
  setVal(jc, 'val', align);
}

/**
 * Preserve the existing header/footer part whenever possible.
 * We remove/change only the PAGE field and its paragraph alignment.
 * Logos, text, borders, tabs, images, styles and other header/footer content
 * are deliberately retained.
 */
async function makeNumberPart(
  zip: JSZip,
  ct: Document,
  source: PartRef | null,
  kind: 'header' | 'footer',
  align: 'right' | 'center',
  number: boolean,
  counter: { value: number }
): Promise<string> {
  const sourceXml = source && zip.file(source.target)
    ? await zip.file(source.target)!.async('text')
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${kind === 'header' ? 'hdr' : 'ftr'} xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:p/></w:${kind === 'header' ? 'hdr' : 'ftr'}>`;

  const root = parseXml(sourceXml);
  const container = root.documentElement;
  const touched = removePageFields(root);

  if (number) {
    // If the old PAGE field was in a paragraph that otherwise contains only
    // paragraph properties, reuse that paragraph. Otherwise add a dedicated
    // number paragraph so existing header/footer content is not re-aligned.
    let targetP: Element | null = null;
    for (const p of touched) {
      const meaningful = Array.from(p.children).filter(x => localName(x) !== 'pPr');
      if (meaningful.length === 0) { targetP = p; break; }
    }
    if (!targetP) {
      targetP = makeNumberParagraph(root, align);
      container.appendChild(targetP);
    } else {
      setParagraphAlignment(targetP, align);
      targetP.appendChild(makePageRun(root));
    }
  }

  const fileName = `zain_${kind}_${align}_${number ? 'num' : 'empty'}_${counter.value++}.xml`;
  const path = `word/${fileName}`;
  zip.file(path, serializer().serializeToString(root));
  ensureContentType(ct, path, kind === 'header' ? HEADER_CT : FOOTER_CT);
  return fileName;
}

async function attachPart(
  zip: JSZip, rels: Document, ct: Document, sect: Element,
  kind: 'header' | 'footer', type: 'default' | 'first',
  align: 'right' | 'center', number: boolean, counter: { value: number }
): Promise<void> {
  const refKind = kind === 'header' ? 'headerReference' : 'footerReference';
  const map = relsMap(rels);
  const source = currentPartRef(sect, refKind, type, map) ||
    (type === 'first' ? currentPartRef(sect, refKind, 'default', map) : null);
  const target = await makeNumberPart(zip, ct, source, kind, align, number, counter);
  const relType = kind === 'header' ? REL_HEADER : REL_FOOTER;
  const id = addRel(rels, relType, target);
  setRef(sect, refKind, type, id);
}

function classify(start: number, bab: Record<number, number>, back: number): ThesisSection['type'] {
  if (start === 0) return 'cover';
  if (start === bab[1]) return 'bab_1';
  for (let n = 2; n <= 5; n++) if (start === bab[n]) return 'bab_other';
  if (back >= 0 && start >= back) return 'back_matter';
  if (bab[1] < 0 || start < bab[1]) return 'front_matter';
  return 'bab_other';
}

export async function analyzeDocx(file: File | Blob, fileName: string): Promise<{ zip: JSZip; docXml: Document; analysis: DocumentAnalysis }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const f = zip.file('word/document.xml');
  if (!f) throw new Error('File bukan DOCX yang sah.');
  const doc = parseXml(await f.async('text'));
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) throw new Error('Body Word tidak ditemukan.');

  const ps = bodyParagraphs(body);
  const existing = collectSectionStarts(body, ps);
  const toc = tocRanges(ps);
  const bab = findBabIndexes(ps, toc);
  const bab1 = bab[1] ?? -1;

  let back = -1;
  for (let i = (bab[5] ?? 0) + 1; i < ps.length; i++) {
    if (isBackHeading(getParagraphText(ps[i]))) { back = i; break; }
  }

  const boundaries = desiredBoundaries(ps, bab, existing);
  const issues: string[] = [];
  if (toc.length) issues.push('Daftar Isi/Daftar Tabel/Gambar terdeteksi dan dikecualikan dari deteksi BAB.');
  if (bab1 < 0) issues.push('BAB I tidak ditemukan dengan cukup aman.');
  for (let n = 2; n <= 5; n++) if (bab[n] === undefined) issues.push(`BAB ${['','I','II','III','IV','V'][n]} tidak ditemukan dengan cukup aman.`);
  if (!existing.length) issues.push('Section Word tidak ditemukan; batas penomoran akan dibuat hanya pada titik yang diperlukan.');

  const virtual: ThesisSection[] = boundaries.map((start, idx) => {
    const type = classify(start, bab, back);
    const isChapterStart = [1,2,3,4,5].some(n => bab[n] === start);
    let expectedNumbering: ThesisSection['expectedNumbering'];
    if (type === 'cover') {
      expectedNumbering = { format: 'none', firstPagePos: 'none', defaultPagePos: 'none' };
    } else if (type === 'front_matter') {
      const firstFront = start === boundaries.find(x => x > 0);
      expectedNumbering = { format: 'lowerRoman', startAt: firstFront ? 2 : undefined, firstPagePos: 'bottom_center', defaultPagePos: 'bottom_center' };
    } else if (type === 'bab_1') {
      expectedNumbering = { format: 'decimal', startAt: 1, firstPagePos: 'bottom_center', defaultPagePos: 'top_right' };
    } else if (type === 'bab_other') {
      expectedNumbering = { format: 'decimal', firstPagePos: isChapterStart ? 'bottom_center' : 'top_right', defaultPagePos: 'top_right' };
    } else {
      expectedNumbering = { format: 'decimal', firstPagePos: 'top_right', defaultPagePos: 'top_right' };
    }
    return {
      id: `sec-${idx}`,
      type,
      title: getParagraphText(ps[start] || ps[0]).slice(0, 100),
      paragraphIndex: start,
      hasExistingSectPr: existing.some(s => s.startParagraph === start),
      sectionOrdinal: idx,
      expectedNumbering,
      currentStatus: { hasNumberingIssue: true, issues: [] },
      isChapterStart
    };
  });

  const nativeToc = hasFieldInstruction(doc, /^TOC\b/i);
  const tocExists = nativeToc || toc.length > 0 || ps.some(p => isTocHeadingTitle(getParagraphText(p)));
  if (!tocExists) issues.push('Daftar Isi tidak ditemukan. Saat koreksi, aplikasi akan membuat TOC native Word dan menandai judul utama agar dapat diindeks.');
  else if (nativeToc) issues.push('Daftar Isi native Word terdeteksi. Aplikasi akan mempertahankannya dan meminta Microsoft Word melakukan Update Field.');
  else issues.push('Daftar Isi berbentuk teks/manual terdeteksi. Aplikasi tidak mengubah isi manualnya; TOC native Word akan disiapkan hanya bila diperlukan.');

  return {
    zip, docXml: doc,
    analysis: {
      fileName, fileSizeBytes: file.size, totalParagraphs: ps.length,
      totalExistingSections: existing.length, sections: virtual,
      detectedIssues: issues, isCompliant: false,
      toc: { exists: tocExists, nativeField: nativeToc, needsWordUpdate: true, createdOnCorrection: false, notes: [] }
    }
  };
}

export async function correctThesisDocx(zip: JSZip, docXml: Document, sections: ThesisSection[]): Promise<Blob> {
  const body = docXml.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) throw new Error('Body Word tidak ditemukan.');
  const relFile = zip.file('word/_rels/document.xml.rels');
  const ctFile = zip.file('[Content_Types].xml');
  if (!relFile || !ctFile) throw new Error('Struktur DOCX tidak lengkap.');

  const rels = parseXml(await relFile.async('text'));
  const ct = parseXml(await ctFile.async('text'));
  let ps = bodyParagraphs(body);
  const bab1 = sections.find(s => s.type === 'bab_1')?.paragraphIndex ?? -1;

  const refSectPr = Array.from(body.children).find(x => localName(x) === 'sectPr') as Element | undefined
    || body.getElementsByTagNameNS(W_NS, 'sectPr')[0]
    || null;

  prepareAutomaticTocHeadings(body, ps);
  await ensureUpdateFields(zip);
  ps = bodyParagraphs(body);

  // Add only the minimum section boundaries needed for the five BABs,
  // front matter and back matter. Existing section breaks and margins remain intact.
  for (const s of [...sections].sort((a,b) => b.paragraphIndex - a.paragraphIndex)) {
    if (s.paragraphIndex > 0) insertSectAt(body, ps, s.paragraphIndex, docXml, refSectPr);
  }
  ps = bodyParagraphs(body);

  const starts = collectSectionStarts(body, ps);
  const counter = { value: 1 };

  // Build a rule for every actual Word section start. This is the key fix:
  // numbering is applied to the real section structure, not merely the
  // originally detected virtual boundaries.
  const sortedRules = [...sections].sort((a,b) => a.paragraphIndex - b.paragraphIndex);

  function ruleForStart(start: number): ThesisSection {
    let rule = sortedRules.filter(s => s.paragraphIndex <= start).at(-1);
    if (!rule) rule = sortedRules[0];
    return rule;
  }

  for (const entry of starts) {
    if (!entry.sectPr) continue;
    const baseRule = ruleForStart(entry.startParagraph);
    const isChapterStart = baseRule.type === 'bab_1' || (!!baseRule.isChapterStart && entry.startParagraph === baseRule.paragraphIndex);
    const rule: ThesisSection = {
      ...baseRule,
      isChapterStart,
      expectedNumbering: { ...baseRule.expectedNumbering }
    };
    const sect = entry.sectPr;

    // Preserve all existing sectPr geometry/layout properties (margins, page size).
    // Word will NEVER reset margins because copyGeometry ensures pgMar is preserved.
    if (refSectPr) {
      copyGeometry(refSectPr, sect);
    }

    if (rule.type === 'cover') {
      setPageNumType(sect, null);
      ensureTitlePg(sect, false);
      await attachPart(zip, rels, ct, sect, 'header', 'default', 'right', false, counter);
      await attachPart(zip, rels, ct, sect, 'footer', 'default', 'center', false, counter);
    } else if (rule.type === 'front_matter') {
      const firstFront = rule.type === 'front_matter' && entry.startParagraph === rule.paragraphIndex;
      setPageNumType(sect, 'lowerRoman', firstFront ? 2 : undefined);
      ensureTitlePg(sect, false);
      await attachPart(zip, rels, ct, sect, 'header', 'default', 'right', false, counter);
      await attachPart(zip, rels, ct, sect, 'footer', 'default', 'center', true, counter);
    } else if (rule.type === 'bab_1' || rule.type === 'bab_other') {
      const isBab1 = rule.type === 'bab_1';
      setPageNumType(sect, 'decimal', isBab1 ? 1 : undefined);
      ensureTitlePg(sect, !!rule.isChapterStart);
      await attachPart(zip, rels, ct, sect, 'header', 'default', 'right', true, counter);
      await attachPart(zip, rels, ct, sect, 'footer', 'default', 'center', false, counter);

      if (rule.isChapterStart) {
        await attachPart(zip, rels, ct, sect, 'header', 'first', 'right', false, counter);
        await attachPart(zip, rels, ct, sect, 'footer', 'first', 'center', true, counter);
      }
    } else {
      setPageNumType(sect, 'decimal', undefined);
      ensureTitlePg(sect, false);
      await attachPart(zip, rels, ct, sect, 'header', 'default', 'right', true, counter);
      await attachPart(zip, rels, ct, sect, 'footer', 'default', 'center', false, counter);
    }
    normalizeSectPrOrder(sect);
  }

  zip.file('word/document.xml', serializer().serializeToString(docXml));
  zip.file('word/_rels/document.xml.rels', serializer().serializeToString(rels));
  zip.file('[Content_Types].xml', serializer().serializeToString(ct));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });
}

export async function createSampleFaultyThesisDocx(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="${TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"></Relationships>`);
  const paras = [
    'COVER',
    'HALAMAN JUDUL',
    'DAFTAR ISI',
    'BAB I PENDAHULUAN ........ 1',
    'BAB I PENDAHULUAN',
    'Isi BAB I',
    'BAB II TINJAUAN PUSTAKA',
    'Isi BAB II',
    'BAB III METODE PENELITIAN',
    'Isi BAB III',
    'BAB IV HASIL PENELITIAN',
    'Isi BAB IV',
    'BAB V PENUTUP',
    'Isi BAB V',
    'DAFTAR PUSTAKA',
    'RIWAYAT HIDUP'
  ];
  const body = paras.map((x, i) => `<w:p>${i === 1 || i === 2 || i === 4 || i === 6 || i === 8 || i === 10 || i === 12 || i === 14 ? '<w:r><w:br w:type="page"/></w:r>' : ''}<w:r><w:t>${x}</w:t></w:r></w:p>`).join('');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
