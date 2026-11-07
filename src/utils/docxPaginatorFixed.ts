import JSZip from 'jszip';
import {
  DocumentNumberingProfile,
  findTocKeywordParagraphIndex,
  hasArabicScript,
  isArabicTocHeadingKeyword,
  isCoverHeadingOrContent,
  isProposalDocument,
  normalizeArabicKey,
  processDocumentTocWorkflow,
  stripArabicDiacritics,
  TocProcessMode,
  TocWorkflowResult,
  toArabicAlpha,
  toHindiNumerals
} from './docxTocProcessor';
export type { DocumentNumberingProfile, TocProcessMode, TocWorkflowResult } from './docxTocProcessor';

export interface ThesisSection {
  id: string;
  type: 'cover' | 'front_matter' | 'bab_1' | 'bab_other' | 'back_matter';
  title: string;
  paragraphIndex: number;
  hasExistingSectPr: boolean;
  sectionOrdinal?: number;
  chapterNumber?: number;
  expectedNumbering: {
    format: 'none' | 'lowerRoman' | 'decimal' | 'arabicAlpha' | 'hindi';
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
  numberingProfile: DocumentNumberingProfile;
  isProposal?: boolean;
  sections: ThesisSection[];
  detectedIssues: string[];
  isCompliant: boolean;
  toc: {
    exists: boolean;
    nativeField: boolean;
    tocKind: 'openxml_sdt' | 'manual_toc' | 'keyword_only' | 'none';
    tocKeywordFound?: boolean;
    needsWordUpdate: boolean;
    createdOnCorrection: boolean;
    notes: string[];
  };
  tocWorkflowPreview?: TocWorkflowResult;
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
  const errs = d.getElementsByTagName('parsererror');
  if (errs.length) {
    const detail = (errs[0].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(`XML Word tidak valid: ${detail || 'Kesalahan struktur XML.'}`);
  }
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
      } else if (name === 'instrText' || name === 'delText') {
        // Ignore field instructions and deleted text
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
  return stripArabicDiacritics(s).toUpperCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
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
  return false;
}
function getParagraphBabBookmark(p: Element): number | null {
  for (const bm of Array.from(p.getElementsByTagNameNS(W_NS, 'bookmarkStart'))) {
    const name = attr(bm, 'name');
    const m = name.match(/^_TocBab_([1-6])(?:_|$)/i);
    if (m) return Number(m[1]);
  }
  return null;
}
function hasBodyHeadingBookmark(p: Element): boolean {
  for (const bm of Array.from(p.getElementsByTagNameNS(W_NS, 'bookmarkStart'))) {
    const name = attr(bm, 'name');
    if (/^_Toc(?:Bab|Sub|Alpha|Num|Auto|ArabStruct|Back|Front)_/i.test(name)) return true;
  }
  return false;
}

function getArabicBabKind(text: string): 'bab' | 'fasl' | 'mabhath' | null {
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (/^الباب\s+/.test(arabKey)) return 'bab';
  if (/^الفصل\s+/.test(arabKey)) return 'fasl';
  if (/^المبحث\s+/.test(arabKey)) return 'mabhath';
  return null;
}

export function isBabHeading(text: string, n: number): boolean {
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][n];
  const indo = ['', 'SATU|PERTAMA', 'DUA|KEDUA', 'TIGA|KETIGA', 'EMPAT|KEEMPAT', 'LIMA|KELIMA', 'ENAM|KEENAM'][n];
  const arabOrdKey = ['', 'الاول|الاولي|١|1|I', 'الثاني|الثانيه|٢|2|II', 'الثالث|الثالثه|٣|3|III', 'الرابع|الرابعه|٤|4|IV', 'الخامس|الخامسه|٥|5|V', 'السادس|السادسه|٦|6|VI'][n];
  if (!roman) return false;
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (arabOrdKey && new RegExp(`^(?:الباب|الفصل|المبحث)\\s+(?:${arabOrdKey})(?:\\b|[\\s:.\\-–—]|$)`, 'i').test(arabKey)) {
    return arabKey.length <= 160;
  }
  const t = normalize(text).replace(/^[^A-Z0-9]+/, '');
  if (!new RegExp(`^(?:B\\s*A\\s*B|CHAPTER|BAGIAN)\\s*[:.\\-]?\\s*(?:${roman}|0?${n}${indo ? `|${indo}` : ''})(?:\\b|[\\s:.-]|$)`, 'i').test(t)) {
    return false;
  }
  if (t.length > 160) return false;
  if (/\b(MEMBAHAS|BERISI|MENGURAIKAN|MENJELASKAN|MEMAPARKAN|MENYAJIKAN|MEMUAT|TERDIRI\s+DARI|MERUPAKAN\s+BAB|PADA\s+BAB\s+INI)\b/i.test(t)) {
    return false;
  }
  return true;
}

export function isSemanticBabTitle(p: Element, text: string, n: number): boolean {
  const t = normalize(text).replace(/^[^A-Z0-9\u0600-\u06FF]+/, '');
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (!t || t.length > 120) return false;
  if (/\b(MEMBAHAS|BERISI|MENGURAIKAN|MENJELASKAN|MEMAPARKAN|MENYAJIKAN|MEMUAT|TERDIRI\s+DARI)\b/i.test(t)) {
    return false;
  }
  const style = styleId(p);
  const pPr = child(p, 'pPr');
  const hasNumPr = !!(pPr && child(pPr, 'numPr'));
  const hasOutline0 = !!(pPr && child(pPr, 'outlineLvl') && attr(child(pPr, 'outlineLvl'), 'val') === '0');
  const isHeadingStyle = /^(heading\s*1|judul|bab|chapter|title)/i.test(style);
  const isCentered = pPr ? /^center$/i.test(attr(child(pPr, 'jc'), 'val')) : false;
  const isAllCaps = t === stripArabicDiacritics(text).trim().replace(/\s+/g, ' ') && (/[A-Z]{4,}/.test(t) || /[\u0600-\u06FF]{3,}/.test(t));

  if (!hasNumPr && !hasOutline0 && !isHeadingStyle && !isCentered && !isAllCaps && getParagraphBabBookmark(p) !== n) {
    return false;
  }

  const indoPatterns: Record<number, RegExp> = {
    1: /^(?:(?:I|0?1|A)[\s.):\-]+)?(?:PENDAHULUAN|LATAR\s+BELAKANG(?:\s+MASALAH|\s+PENELITIAN)?)\s*$/i,
    2: /^(?:(?:II|0?2|B)[\s.):\-]+)?(?:TINJAUAN\s+PUSTAKA|KAJIAN\s+PUSTAKA|LANDASAN\s+TEORI|KAJIAN\s+TEORI|KERANGKA\s+TEORI|TELAAH\s+PUSTAKA|STUDI\s+PUSTAKA|PEMBAHASAN)(?:\s+DAN\s+[A-Z\s]+)?$/i,
    3: /^(?:(?:III|0?3|C)[\s.):\-]+)?(?:METODE\s+PENELITIAN|METODOLOGI\s+PENELITIAN|METODE\s+DAN\s+PROSEDUR(?:\s+PENELITIAN)?|OBJEK\s+DAN\s+METODE\s+PENELITIAN|GAMBARAN\s+UMUM(?:\s+OBJEK\s+PENELITIAN)?|PENUTUP|KESIMPULAN(?:\s+DAN\s+SARAN)?)$/i,
    4: /^(?:(?:IV|0?4|D)[\s.):\-]+)?(?:HASIL\s+(?:PENELITIAN\s+)?(?:DAN\s+)?PEMBAHASAN|PEMBAHASAN|PAPARAN\s+DATA(?:\s+DAN\s+TEMUAN\s+PENELITIAN)?|TEMUAN\s+(?:PENELITIAN\s+)?(?:DAN\s+)?PEMBAHASAN|ANALISIS\s+(?:DATA\s+)?DAN\s+PEMBAHASAN|HASIL\s+PENELITIAN)$/i,
    5: /^(?:(?:V|0?5|E)[\s.):\-]+)?(?:PENUTUP|PEMBAHASAN|DISKUSI|KESIMPULAN(?:\s*,?\s*IMPLIKASI\s*,?\s*DAN\s+SARAN|\s+DAN\s+SARAN|\s+DAN\s+REKOMENDASI)?|SIMPULAN(?:\s*,?\s*IMPLIKASI\s*,?\s*DAN\s+SARAN|\s+DAN\s+SARAN|\s+DAN\s+REKOMENDASI)?)$/i,
    6: /^(?:(?:B\s*A\s*B\s*)?(?:VI|0?6|F)[\s.):\-]+)(?:PENUTUP|KESIMPULAN(?:\s*,?\s*IMPLIKASI\s*,?\s*DAN\s+SARAN|\s+DAN\s+SARAN|\s+DAN\s+REKOMENDASI)?|SIMPULAN(?:\s*,?\s*IMPLIKASI\s*,?\s*DAN\s+SARAN|\s+DAN\s+SARAN|\s+DAN\s+REKOMENDASI)?)$/i
  };

  const arabPatterns: Record<number, RegExp> = {
    1: /^(?:(?:I|0?1|١|ا|اولا)[\s.):\-–—]+)?(?:المقدمه|مقدمه(?:\s+البحث|\s+الدراسه)?|خلفيه\s+البحث(?:\s+ومشكلته)?|خلفيه\s+الدراسه|خطه\s+البحث|الاطار\s+العام(?:\s+للبحث|\s+للدراسه)?)\s*$/,
    2: /^(?:(?:II|0?2|٢|ب|ثانيا)[\s.):\-–—]+)?(?:الاطار\s+النظري(?:\s+والدراسات\s+السابقه)?|الدراسات\s+السابقه|المراجعه\s+الادبيه|الجانب\s+النظري|تاصيل\s+المفاهيم|المفاهيم\s+الاساسيه|المناقشه|البحث\s+والمناقشه|العرض\s+والمناقشه)\s*$/,
    3: /^(?:(?:III|0?3|٣|ج|ت|ثالثا)[\s.):\-–—]+)?(?:منهج\s+البحث|منهجيه\s+البحث|منهج\s+الدراسه|اجراءات\s+البحث|طريقه\s+البحث|خطوات\s+البحث|الجانب\s+الميداني|وصف\s+ميدان\s+البحث|الخاتمه|خاتمه\s+البحث|الخلاصه(?:\s+والتوصيات|\s+والاقتراحات)?)\s*$/,
    4: /^(?:(?:IV|0?4|٤|د|ث|رابعا)[\s.):\-–—]+)?(?:نتائج\s+البحث(?:\s+ومناقشتها)?|نتائج\s+الدراسه(?:\s+ومناقشتها)?|عرض\s+البيانات(?:\s+وتحليلها|\s+ومناقشتها)?|تحليل\s+البيانات(?:\s+وتحليلها)?|النتائج\s+والمناقشه|عرض\s+النتائج(?:\s+ومناقشتها)?|الجانب\s+التطبيقي)\s*$/,
    5: /^(?:(?:V|0?5|٥|هـ|ه|ج|خامسا)[\s.):\-–—]+)?(?:الخاتمه|خاتمه\s+البحث|خاتمه\s+الدراسه|النتائج\s+والتوصيات|النتائج\s+والاقتراحات|الخلاصه(?:\s+والاقتراحات|\s+والتوصيات)?)\s*$/,
    6: /^(?:(?:الباب\s+)?(?:السادس|VI|0?6|٦|سادسا)[\s.):\-–—]+)(?:الخاتمه|خاتمه\s+البحث|خاتمه\s+الدراسه|النتائج\s+والتوصيات|النتائج\s+والاقتراحات|الخلاصه(?:\s+والاقتراحات|\s+والتوصيات)?)\s*$/
  };

  if (arabPatterns[n] && arabPatterns[n].test(arabKey)) return true;
  return indoPatterns[n] ? indoPatterns[n].test(t) : false;
}

function isBackHeading(text: string): boolean {
  const t = normalize(text).replace(/^[^A-Z\u0600-\u06FF]+/, '');
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (!t || t.length > 90) return false;
  if (/\b(MEMBAHAS|BERISI|MENYAJIKAN|MENUNJUKKAN|MERUPAKAN|DIGUNAKAN|TERDAPAT|ADALAH|SEBAGAI\s+BERIKUT)\b/i.test(t)) {
    return false;
  }
  if (/^(?:المراجع|المصادر\s+والمراجع|قائمه\s+المراجع|قائمه\s+المصادر(?:\s+والمراجع)?|فهرس\s+المصادر(?:\s+والمراجع)?|فهرس\s+المراجع|الملاحق|ملحق(?:\s+[\u0600-\u06FFA-Z0-9]+)?|قائمه\s+الملاحق|السيره\s+الذاتيه|ترجمه\s+الباحث|نبذه\s+عن\s+الباحث)\s*$/.test(arabKey)) {
    return true;
  }
  return /^(?:DAFTAR\s+PUSTAKA|KEPUSTAKAAN|BIBLIOGRAFI|BIBLIOGRAPHY|DAFTAR\s+RUJUKAN|DAFTAR\s+BACAAN|DAFTAR\s+LITERATUR|REFERENSI|LAMPIRAN(?:[\s\-:]+[A-Z0-9IVX]+)?|APPENDIX(?:ES)?|RIWAYAT\s+HIDUP(?:\s+PENULIS)?|BIODATA(?:\s+PENULIS)?|CURRICULUM\s+VITAE)\s*$/i.test(t);
}
export function isTocHeadingTitle(text: string): boolean {
  const t = normalize(text);
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (
    isArabicTocHeadingKeyword(text) ||
    /^(?:فهرس\s+المحتويات|فهرس\s+الموضوعات|قائمه\s+المحتويات|قائمه\s+الموضوعات|الفهرس|فهرس\s+البحث|فهرس\s+الدراسه|فهرس\s+الرساله|محتويات\s+البحث|المحتويات|قائمه\s+الجداول|فهرس\s+الجداول|قائمه\s+الاشكال|فهرس\s+الاشكال|قائمه\s+الملاحق|فهرس\s+الملاحق|قائمه\s+الرموز|قائمه\s+الاختصارات)\b/.test(arabKey)
  ) {
    return true;
  }
  return /^(DAFTAR ISI|TABLE OF CONTENTS|ISI MAKALAH|ISI PROPOSAL|DAFTAR TABEL|DAFTAR GAMBAR|DAFTAR LAMPIRAN|DAFTAR BAGAN|DAFTAR SINGKATAN|DAFTAR SIMBOL)\b/i.test(t);
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

  // If this paragraph is marked with a body heading bookmark (_TocBab_*, etc.), it is a real body heading, never a TOC line
  if (hasBodyHeadingBookmark(p)) return false;

  // 1b. Contains a native TOC or PAGEREF field instruction
  const instrTexts = Array.from(p.getElementsByTagNameNS(W_NS, 'instrText')).map(x => x.textContent || '').join(' ');
  if (/\b(?:TOC|PAGEREF)\b/i.test(instrTexts)) return true;

  // 2. Explicit TOC style (toc, toc 1, toc 2, etc.)
  if (isTocStyle(styleId(p))) return true;

  const t = getParagraphText(p);
  const normT = normalize(t);
  const arabKey = normalizeArabicKey(t);

  // Never treat a standalone chapter heading like "BAB V" or "الباب الخامس" without a page number as a TOC line
  if (/^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s*[:.\-]?\s*(?:[IVX]+|\d+)\s*$/i.test(normT)) {
    return false;
  }
  if (/^(?:الباب|الفصل|المبحث)\s+(?:الاول|الثاني|الثالث|الرابع|الخامس|السادس|[١-٦]|[1-6])\s*$/.test(arabKey)) {
    return false;
  }

  // Require a separator before the trailing page token so words ending in I/V/X/L/C/D/M (e.g. IMPLIKASI, EVALUASI) are not matched
  const endsWithPageNum = /(?:[\s.\t…])(?:\d{1,4}|[ivxlcdm]{1,6}|[٠-٩]{1,4}|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]{1,2})\s*$/i.test(t);

  // 3. Tab with dot/hyphen/underscore leader AND actual tab + trailing page number
  const pPr = child(p, 'pPr');
  if (pPr && endsWithPageNum && /\t/.test(t)) {
    for (const tabs of children(pPr, 'tabs')) {
      for (const tab of children(tabs, 'tab')) {
        if (/^(dot|hyphen|underscore)$/i.test(attr(tab, 'leader'))) return true;
      }
    }
  }

  // 4. Dot leaders (.... or …) AND ends with page number
  const hasLeaderDots = /\.{2,}|…|(?:\.\s*){3,}/.test(t);
  if (hasLeaderDots && endsWithPageNum) return true;

  // 5. Tab immediately preceding the page number at the end of the line
  if (/\t\s*(?:\d{1,4}|[ivxlcdm]{1,6}|[٠-٩]{1,4}|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]{1,2})\s*$/i.test(t)) return true;

  // 6. Manual TOC line with chapter + title + trailing page number separated by spaces (e.g. "BAB I PENDAHULUAN 1" or "الباب الأول المقدمة ١")
  if (/^(?:B\s*A\s*B|CHAPTER)\s*[:.\-]?\s*(?:[IVX]+|\d+)\s+[A-Z][A-Z\s,&\-]{2,}\s+\d{1,4}\s*$/i.test(normT)) {
    return true;
  }
  if (/^(?:الباب|الفصل|المبحث)\s+(?:الاول|الثاني|الثالث|الرابع|الخامس|السادس|[١-٦]|[1-6])\s+[\u0600-\u06FF\s:.\-–—]{2,}\s+(?:[٠-٩]{1,4}|\d{1,4})\s*$/.test(arabKey)) {
    return true;
  }

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

    if (isTocHeadingTitle(t) && !isTocEntryOrListParagraph(p)) {
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

    // Allow column header "HALAMAN" or Arabic "الصفحة" / "الموضوع" right under DAFTAR ISI / فهرس المحتويات
    const arabT = normalizeArabicKey(t);
    if (
      (/^(?:JUDUL\s+)?HALAMAN$/i.test(normalize(t)) || /^(?:الموضوع\s+)?(?:الصفحه|رقم\s+الصفحه|الموضوع)$/.test(arabT)) &&
      i <= start + 3
    ) {
      lastHit = i;
      continue;
    }

    // If it is a real BAB heading and not a TOC row, TOC definitely ends here
    if (
      (getParagraphBabBookmark(p) !== null || isBabHeading(t, 1) || isBabHeading(t, 2)) &&
      !isTocEntryOrListParagraph(p)
    ) {
      if (lastHit >= start) ranges.push({ start, end: lastHit });
      inToc = false;
      start = -1;
      lastHit = -1;
      continue;
    }

    if (!t) continue; // blank spacer

    // Other front matter title ends TOC (unless it ends with a Roman or Arabic page number)
    if (
      (/^(KATA PENGANTAR|HALAMAN PENGESAHAN|LEMBAR PENGESAHAN|PERNYATAAN|ABSTRAK|ABSTRACT)\b/i.test(normalize(t)) ||
        /^(صفحه الموافقه|موافقه المشرف|صفحه الاعتماد|اقرار الطالب|ملخص البحث|الملخص|مستخلص البحث|كلمه الشكر|تقدير وشكر)\b/.test(arabT)) &&
      !/\s+(?:[ivxlcdm]{1,6}|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]{1,2})\s*$/i.test(t)
    ) {
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

function headingEvidence(
  paragraphs: Element[],
  i: number,
  n: number,
  allowSemantic = false,
  preferredArabKind: 'bab' | 'fasl' | 'mabhath' | null = null
): number {
  const p = paragraphs[i];
  const t = getParagraphText(p);
  if (isTocEntryOrListParagraph(p)) return -Infinity;

  const bmBab = getParagraphBabBookmark(p);
  if (bmBab !== null && bmBab !== n) return -Infinity;

  const arabKind = getArabicBabKind(t);
  if (preferredArabKind === 'bab' && (arabKind === 'fasl' || arabKind === 'mabhath') && bmBab !== n) {
    return -Infinity;
  }
  if (preferredArabKind === 'fasl' && arabKind === 'mabhath' && bmBab !== n) {
    return -Infinity;
  }

  const isExplicitBab = isBabHeading(t, n) || bmBab === n;
  const isSemantic = !isExplicitBab && allowSemantic && isSemanticBabTitle(p, t, n);
  if (!isExplicitBab && !isSemantic) return -Infinity;

  const style = styleId(p);
  let evidence = isExplicitBab ? 12 : 6;
  if (arabKind === 'bab') evidence += 6;
  else if (arabKind === 'fasl') evidence += 3;
  if (bmBab === n) evidence += 30;
  if (/^(heading\s*[1-3]|judul|bab|chapter|title)/i.test(style)) evidence += 8;
  if (hasBreakNear(paragraphs, i)) evidence += 6;
  if (i > 0 && !!sectionOwner(paragraphs[i - 1])) evidence += 6;
  if (t.length <= 100) evidence += 4;
  if (t === normalize(t) && (/[A-Z]/.test(t) || /[\u0600-\u06FF]/.test(t))) evidence += 2;

  const pPr = child(p, 'pPr');
  const jc = pPr ? attr(child(pPr, 'jc'), 'val') : '';
  if (/^center$/i.test(jc)) evidence += 3;

  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][n];
  if (roman && new RegExp(`^(?:B\\s*A\\s*B|CHAPTER)\\s*[:.\\-]?\\s*(?:${roman}|0?${n})\\s*$`, 'i').test(normalize(t))) {
    evidence += 3;
  }
  return evidence;
}

function findBabIndexes(
  paragraphs: Element[],
  toc: Array<{ start: number; end: number }>,
  maxBab: number = 6,
  numberingProfile: DocumentNumberingProfile = 'skripsi'
): Record<number, number> {
  const found: Record<number, number> = {};
  let previous = -1;
  let preferredArabKind: 'bab' | 'fasl' | 'mabhath' | null = null;

  // Khusus Proposal Penelitian: proposal tidak memiliki bab-bab (BAB I..V)
  // melainkan satu kesatuan isi yang dimulai dari judul/awal proposal.
  const isProposalMode =
    numberingProfile === 'proposal' ||
    numberingProfile === 'arab-proposal';

  if (isProposalMode) {
    const proposalJudulIdx = findProposalJudulIndex(paragraphs);
    if (proposalJudulIdx >= 0) {
      found[1] = proposalJudulIdx;
    }
    return found;
  }

  // Standar Skripsi: 5 Bab (BAB I..V). Hanya Tesis yang mendeteksi BAB VI.
  const effectiveMaxBab =
    numberingProfile === 'skripsi'
      ? 5
      : numberingProfile === 'tesis' || numberingProfile === 'arab-tesis'
      ? 6
      : Math.min(maxBab, 6);

  for (let n = 1; n <= effectiveMaxBab; n++) {
    // 0. Direct bookmark match if previously tagged by paginator/TOC processor
    let bmIdx = -1;
    for (let i = Math.max(0, previous + 1); i < paragraphs.length; i++) {
      if (getParagraphBabBookmark(paragraphs[i]) === n) {
        bmIdx = i;
        break;
      }
    }
    if (bmIdx >= 0) {
      found[n] = bmIdx;
      previous = bmIdx;
      if (n === 1) preferredArabKind = getArabicBabKind(getParagraphText(paragraphs[bmIdx]));
      continue;
    }

    const candidates: Array<{ i: number; evidence: number }> = [];
    // 1. Primary pass: explicit BAB / CHAPTER / الباب headings outside TOC ranges
    for (let i = Math.max(0, previous + 1); i < paragraphs.length; i++) {
      if (inRanges(i, toc)) continue;
      // Jangan pernah jadikan paragraf sub-judul (misal "PENUTUP" tepat di bawah "BAB V") sebagai bab baru!
      if (previous >= 0 && i <= previous + 3 && !isBabHeading(getParagraphText(paragraphs[i]), n)) {
        continue;
      }
      const evidence = headingEvidence(paragraphs, i, n, false, preferredArabKind);
      if (Number.isFinite(evidence)) candidates.push({ i, evidence });
    }

    // 2. Fallback pass: explicit BAB / CHAPTER / الباب headings anywhere not marked as TOC entry
    if (!candidates.length) {
      for (let i = Math.max(0, previous + 1); i < paragraphs.length; i++) {
        if (isTocEntryOrListParagraph(paragraphs[i])) continue;
        if (previous >= 0 && i <= previous + 3 && !isBabHeading(getParagraphText(paragraphs[i]), n)) {
          continue;
        }
        const evidence = headingEvidence(paragraphs, i, n, false, preferredArabKind);
        if (Number.isFinite(evidence)) candidates.push({ i, evidence });
      }
    }

    // 3. Semantic pass: Word auto-numbered Heading 1 / centered chapter titles (e.g. PENDAHULUAN, المقدمة)
    // Lewati semantic pass jika bab sebelumnya sudah merupakan bab penutup (PENUTUP / KESIMPULAN / الخاتمة)
    let alreadyClosedAtPrevBab = false;
    if (n >= 4 && found[n - 1] !== undefined) {
      const prevTitle = getParagraphText(paragraphs[found[n - 1]]);
      let prevSubTitle = '';
      for (let k = found[n - 1] + 1; k < Math.min(paragraphs.length, found[n - 1] + 4); k++) {
        const txt = getParagraphText(paragraphs[k]).trim();
        if (txt) { prevSubTitle = txt; break; }
      }
      const prevNorm = normalize(prevTitle);
      const prevSubNorm = normalize(prevSubTitle);
      const prevArab = normalizeArabicKey(prevTitle);
      const prevSubArab = normalizeArabicKey(prevSubTitle);
      if (
        /\b(?:PENUTUP|KESIMPULAN|SIMPULAN)\b/i.test(prevNorm) ||
        /\b(?:PENUTUP|KESIMPULAN|SIMPULAN)\b/i.test(prevSubNorm) ||
        /(?:الخاتمه|الخلاصه|النتائج\s+والتوصيات)/.test(prevArab) ||
        /(?:الخاتمه|الخلاصه|النتائج\s+والتوصيات)/.test(prevSubArab)
      ) {
        alreadyClosedAtPrevBab = true;
      }
    }

    if (!candidates.length && !alreadyClosedAtPrevBab) {
      for (let i = Math.max(0, previous + 1); i < paragraphs.length; i++) {
        if (inRanges(i, toc) || isTocEntryOrListParagraph(paragraphs[i])) continue;
        if (previous >= 0 && i <= previous + 3) continue;
        const evidence = headingEvidence(paragraphs, i, n, true, preferredArabKind);
        if (Number.isFinite(evidence)) candidates.push({ i, evidence });
      }
    }

    if (!candidates.length) continue;

    candidates.sort((a, b) => b.evidence - a.evidence || a.i - b.i);
    const best = candidates[0];
    found[n] = best.i;
    previous = best.i;
    if (n === 1) {
      preferredArabKind = getArabicBabKind(getParagraphText(paragraphs[best.i]));
    }
  }

  // Jika naskah adalah Proposal (tidak ada BAB I), deteksi A. Judul Penelitian sebagai titik awal halaman 1
  if (found[1] === undefined) {
    const proposalJudulIdx = findProposalJudulIndex(paragraphs);
    if (proposalJudulIdx >= 0) {
      found[1] = proposalJudulIdx;
    }
  }

  return found;
}

function isInsideAnySdt(p: Element): boolean {
  let n: Node | null = p.parentNode;
  while (n && n.nodeType === 1) {
    if (localName(n as Element) === 'sdt') return true;
    n = n.parentNode;
  }
  return false;
}

export function findProposalJudulIndex(paragraphs: Element[]): number {
  // 1. Pass Utama: Deteksi judul/bab awal proposal eksplisit di luar SDT/TOC
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (isInsideAnySdt(p) || isTocEntryOrListParagraph(p)) continue;

    const t = getParagraphText(p).trim();
    if (!t || t.includes('.....') || t.includes('. . .')) continue;
    const norm = normalize(t);
    const arabKey = normalizeArabicKey(t);

    // a. Deteksi BAB I / BAB 1 / BAB I PENDAHULUAN (beberapa kampus memakai BAB I di proposal)
    if (
      /^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s*[:.\-–—\t]?\s*(?:I|0?1|SATU|PERTAMA)\b/i.test(norm) ||
      /^(?:الباب|الفصل)\s+(?:الاول|١|1)\b/.test(arabKey)
    ) {
      return i;
    }

    // b. Deteksi A. Judul Penelitian / Judul Proposal / Judul Skripsi / Judul / PROPOSAL PENELITIAN
    if (
      /^(?:[A-Z0-9IVX]+\s*[:.\-–—\t]\s*)*(?:JUDUL\s+PENELITIAN|JUDUL\s+PROPOSAL|JUDUL\s+SKRIPSI)\b/i.test(norm) ||
      /^(?:[A-Z0-9IVX]+\s*[:.\-–—\t]\s*)+JUDUL\b/i.test(norm) ||
      /^(?:JUDUL\s+PENELITIAN|JUDUL\s+PROPOSAL|JUDUL\s+SKRIPSI)\b/i.test(norm) ||
      /^(?:PROPOSAL\s+(?:PENELITIAN|SKRIPSI|TESIS))\b/i.test(norm) ||
      /^(?:[أابتثجحخدذرزسشصضطظعغفقكلمنهوي١1]\s*[:.\-–—\t]\s*)*(?:عنوان\s+البحث|عنوان\s+الرساله|العنوان|خطه\s+البحث)\b/.test(arabKey)
    ) {
      return i;
    }

    // c. Deteksi A. Konteks Penelitian / Latar Belakang / Pendahuluan / Fokus / Rumusan
    if (
      /^(?:[A-Z0-9IVX]+\s*[:.\-–—\t]\s*)+(?:KONTEKS\s+PENELITIAN|LATAR\s+BELAKANG(?:\s+MASALAH)?|PENDAHULUAN|FOKUS\s+PENELITIAN|RUMUSAN\s+MASALAH|IDENTIFIKASI\s+MASALAH)\b/i.test(norm) ||
      /^(?:[أابتثجحخدذرزسشصضطظعغفقكلمنهوي١1]\s*[:.\-–—\t]\s*)*(?:خلفية\s+البحث|مقدمة\s+البحث|مشكلة\s+البحث|تحديد\s+المشكله)\b/.test(arabKey)
    ) {
      return i;
    }
  }

  // 2. Pass Kedua: cari Konteks Penelitian, Latar Belakang, Pendahuluan tanpa prefix A/1
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (isInsideAnySdt(p) || isTocEntryOrListParagraph(p)) continue;

    const t = getParagraphText(p).trim();
    if (!t || t.includes('.....') || t.includes('. . .')) continue;
    const norm = normalize(t);
    const arabKey = normalizeArabicKey(t);
    if (
      /^(?:KONTEKS\s+PENELITIAN|LATAR\s+BELAKANG(?:\s+MASALAH)?|PENDAHULUAN|FOKUS\s+PENELITIAN|RUMUSAN\s+MASALAH)\b/i.test(norm) ||
      /^(?:خلفية\s+البحث|مقدمة\s+البحث|مشكلة\s+البحث)\b/.test(arabKey)
    ) {
      return i;
    }
  }

  // 3. Pass Ketiga (Fallback Aman): jika tidak ada heading spesifik di atas, cari paragraf teks pertama
  // setelah Cover atau setelah Front Matter (misal lembar pengesahan / daftar isi proposal)
  let seenPageBreak = false;
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (isInsideAnySdt(p) || isTocEntryOrListParagraph(p)) continue;

    if (hasPageBreak(p) || (i > 0 && !!child(child(paragraphs[i - 1], 'pPr') || paragraphs[i - 1], 'sectPr'))) {
      seenPageBreak = true;
      const t = getParagraphText(p).trim();
      if (t && !isFrontMatterHeading(t) && t.length > 5) {
        return i;
      }
      continue;
    }
    if (seenPageBreak) {
      const t = getParagraphText(p).trim();
      if (t && !isFrontMatterHeading(t) && t.length > 5) {
        return i;
      }
    }
  }

  // 4. Fallback Terakhir: kembalikan paragraf teks pertama setelah paragraf 0
  for (let i = 1; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (isInsideAnySdt(p) || isTocEntryOrListParagraph(p)) continue;
    const t = getParagraphText(p).trim();
    if (t && !isFrontMatterHeading(t)) return i;
  }

  return paragraphs.length > 1 ? 1 : 0;
}

function isFrontMatterHeading(text: string): boolean {
  if (isCoverHeadingOrContent(text)) return false;
  const t = normalize(text);
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (
    isArabicTocHeadingKeyword(text) ||
    /^(صفحه\s+الموافقه|موافقه\s+المشرف|مذكره\s+المشرف|صفحه\s+الاعتماد|اعتماد\s+لجنه\s+المناقشه|اقرار\s+الطالب|اقرار\s+الاصاله|الاهداء|ملخص\s+البحث|الملخص|مستخلص\s+البحث|المستخلص|كلمه\s+الشكر|تقدير\s+وشكر|شكر\s+وتقدير|تمهيد|مقدمه(?:\s+الكاتب)?|فهرس\s+المحتويات|فهرس\s+الموضوعات|قائمه\s+المحتويات|قائمه\s+الموضوعات|الفهرس|المحتويات|قائمه\s+الجداول|فهرس\s+الجداول|قائمه\s+الاشكال|فهرس\s+الاشكال|قائمه\s+الملاحق|فهرس\s+الملاحق|قائمه\s+الرموز|قائمه\s+الاختصارات)\b/.test(arabKey)
  ) {
    return true;
  }
  return /^(LEMBAR\s+PERSETUJUAN|HALAMAN\s+PERSETUJUAN|PERSETUJUAN\s+PEMBIMBING|PERSETUJUAN|NOTA\s+DINAS|LEMBAR\s+PENGESAHAN|HALAMAN\s+PENGESAHAN|PENGESAHAN|LEMBAR\s+PERNYATAAN|HALAMAN\s+PERNYATAAN|SURAT\s+PERNYATAAN|PERNYATAAN\s+KEASLIAN|PERNYATAAN\s+ORISINALITAS|PERNYATAAN|MOTTO|HALAMAN\s+MOTTO|PERSEMBAHAN|HALAMAN\s+PERSEMBAHAN|ABSTRAK|ABSTRACT|INTISARI|RINGKASAN|KATA\s+PENGANTAR|PRAKATA|UCAPAN\s+TERIMA\s+KASIH|PEDOMAN\s+TRANSLITERASI|DAFTAR\s+ISI|TABLE\s+OF\s+CONTENTS|ISI\s+MAKALAH|ISI\s+PROPOSAL|DAFTAR\s+TABEL|DAFTAR\s+GAMBAR|DAFTAR\s+LAMPIRAN)\b/i.test(t);
}

function findFrontStart(paragraphs: Element[], bab1: number, existing?: SectionStart[]): number {
  const limit = bab1 >= 0 ? bab1 : paragraphs.length;
  if (limit <= 1) return -1;

  // 1. Prioritas Utama: Cari judul halaman awal (Front Matter) resmi pertama
  // seperti LEMBAR PENGESAHAN, LEMBAR PERSETUJUAN, PERNYATAAN KEASLIAN, MOTTO, ABSTRAK, KATA PENGANTAR, DAFTAR ISI.
  // Seluruh teks cover (HALAMAN SAMPUL, HALAMAN JUDUL, judul, logo, biodata, tahun) diabaikan agar tidak memotong cover!
  for (let i = 1; i < limit; i++) {
    const text = getParagraphText(paragraphs[i]).trim();
    if (!text || text.length > 90) continue;
    if (isCoverHeadingOrContent(text)) continue;
    if (isFrontMatterHeading(text)) {
      return i;
    }
  }

  // 2. Prioritas Kedua: Jika dokumen Word sudah memiliki section break asli antara Cover dan Front Matter
  // (misal pemisah section yang dibuat penulis sebelum BAB I pada indeks > 1)
  if (existing && existing.length > 0) {
    const existingFront = existing
      .filter(s => s.startParagraph > 1 && s.startParagraph < limit)
      .sort((a, b) => a.startParagraph - b.startParagraph)[0];
    if (existingFront) {
      return existingFront.startParagraph;
    }
  }

  // 3. Prioritas Ketiga: Cari batas hard page break eksplisit (<w:br w:type="page"/> atau pageBreakBefore)
  // yang memisahkan cover dengan halaman berikutnya.
  for (let i = 0; i < limit; i++) {
    const p = paragraphs[i];
    const pPr = child(p, 'pPr');
    const hasPbb = !!(pPr && child(pPr, 'pageBreakBefore'));
    if (hasPbb && i > 0) {
      const nextText = getParagraphText(paragraphs[i]).trim();
      if (!isCoverHeadingOrContent(nextText)) {
        return i;
      }
    }
    const hasHardBr = Array.from(p.getElementsByTagNameNS(W_NS, 'br')).some(x => /^page$/i.test(attr(x, 'type')));
    if (hasHardBr) {
      // Page break berada di paragraf i (akhir cover). Halaman berikutnya dimulai pada paragraf non-kosong pertama setelah i:
      let isFollowedByCover = false;
      for (let j = i + 1; j < limit; j++) {
        const nextText = getParagraphText(paragraphs[j]).trim();
        if (nextText.length > 0) {
          if (isCoverHeadingOrContent(nextText)) {
            isFollowedByCover = true;
          } else {
            return j;
          }
          break;
        }
      }
      if (!isFollowedByCover) {
        return Math.min(i + 1, limit - 1);
      }
    }
  }

  // Fallback aman: cari teks non-kosong pertama setelah rangkaian paragraf awal
  let firstTextIdx = -1;
  for (let i = 0; i < limit; i++) {
    if (getParagraphText(paragraphs[i]).trim().length > 0) {
      firstTextIdx = i;
      break;
    }
  }
  if (firstTextIdx >= 0) {
    for (let i = firstTextIdx + 1; i < limit; i++) {
      if (getParagraphText(paragraphs[i]).trim().length > 0) {
        return i;
      }
    }
  }

  return 1;
}

function desiredBoundaries(
  paragraphs: Element[],
  bab: Record<number, number>,
  existing?: SectionStart[],
  maxBab: number = 6,
  isProposal: boolean = false
): number[] {
  const starts = new Set<number>([0]);
  const front = findFrontStart(paragraphs, bab[1] ?? -1, existing);
  if (front > 0) starts.add(front);
  if (bab[1] !== undefined) starts.add(bab[1]);

  if (isProposal) {
    // Untuk Proposal: seluruh isi proposal dari Judul sampai Daftar Pustaka
    // berada dalam satu kesatuan section yang sama bernomor 1.. di bawah tengah.
    return [...starts].sort((a, b) => a - b);
  }

  for (let n = 2; n <= maxBab; n++) if (bab[n] !== undefined) starts.add(bab[n]);

  const lastBabIdx = Math.max(0, ...Object.values(bab));
  let back = -1;
  for (let i = lastBabIdx + 1; i < paragraphs.length; i++) {
    if (!isTocEntryOrListParagraph(paragraphs[i]) && isBackHeading(getParagraphText(paragraphs[i]))) {
      back = i;
      break;
    }
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
function getPageNumType(sectPr: Element | null): { fmt: string; start?: number } | null {
  if (!sectPr) return null;
  const pg = child(sectPr, 'pgNumType');
  if (!pg) return null;
  const fmt = attr(pg, 'fmt');
  const rawStart = attr(pg, 'start');
  const start = rawStart ? Number(rawStart) : undefined;
  return { fmt, ...(Number.isFinite(start) ? { start } : {}) };
}

function setPageNumType(
  sectPr: Element,
  fmt: 'lowerRoman' | 'decimal' | 'arabicAlpha' | 'arabicAbjad' | null,
  start?: number
): void {
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
function ensureSectType(sectPr: Element, val: string = 'continuous'): void {
  let type = child(sectPr, 'type');
  if (!type) {
    type = sectPr.ownerDocument!.createElementNS(W_NS, 'w:type');
    sectPr.appendChild(type);
  }
  setVal(type, 'val', val);
  normalizeSectPrOrder(sectPr);
}
function restoreSectType(sectPr: Element, origTypeVal: string | null): void {
  const existing = child(sectPr, 'type');
  if (origTypeVal === null) {
    if (existing) sectPr.removeChild(existing);
    normalizeSectPrOrder(sectPr);
  } else {
    ensureSectType(sectPr, origTypeVal);
  }
}
function hasGeometry(sectPr: Element | null): boolean {
  if (!sectPr) return false;
  return !!(child(sectPr, 'pgSz') || child(sectPr, 'pgMar'));
}
function copyGeometry(source: Element, target: Element): void {
  // Notice: 'vAlign' is deliberately omitted so vertical centering (e.g. vAlign="center")
  // is NEVER copied across sections, preventing pages from being pushed halfway down the page.
  const tags = ['pgSz', 'pgMar', 'cols', 'docGrid', 'paperSrc', 'pgBorders', 'textDirection', 'bidi', 'rtlGutter'];
  for (const tag of tags) {
    const srcEl = child(source, tag);
    const existing = child(target, tag);
    if (srcEl && !existing) {
      target.appendChild(srcEl.cloneNode(true));
    }
  }
  for (const refKind of ['headerReference', 'footerReference'] as const) {
    for (const srcRef of children(source, refKind)) {
      const refType = attr(srcRef, 'type');
      const hasSameType = children(target, refKind).some(x => attr(x, 'type') === refType);
      if (!hasSameType) {
        target.appendChild(srcRef.cloneNode(true));
      }
    }
  }
  normalizeSectPrOrder(target);
}

/**
 * In OOXML (ECMA-376 §17.6.17), a paragraph at `pIndex` belongs to the section
 * whose `w:sectPr` is stored at the END of that section (the first `w:sectPr`
 * at `i >= pIndex`, or the trailing `w:body > w:sectPr`).
 */
function governingSectPrForParagraph(
  body: Element,
  paragraphs: Element[],
  pIndex: number,
  excludeSect?: Element | null
): Element | null {
  for (let i = Math.max(0, pIndex); i < paragraphs.length; i++) {
    const owner = sectionOwner(paragraphs[i]);
    if (owner && owner !== excludeSect && hasGeometry(owner)) return owner;
  }
  const bodySect = Array.from(body.children).find(x => localName(x) === 'sectPr') as Element | null;
  if (bodySect && bodySect !== excludeSect && hasGeometry(bodySect)) return bodySect;
  for (let i = Math.min(pIndex - 1, paragraphs.length - 1); i >= 0; i--) {
    const owner = sectionOwner(paragraphs[i]);
    if (owner && owner !== excludeSect && hasGeometry(owner)) return owner;
  }
  return bodySect && bodySect !== excludeSect ? bodySect : null;
}

function insertSectAt(
  body: Element,
  paragraphs: Element[],
  index: number,
  doc: Document
): Element | null {
  if (index <= 0 || index >= paragraphs.length + 1) return null;
  const p = paragraphs[index - 1];
  const pPr = child(p, 'pPr') || (() => {
    const x = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(x, p.firstChild);
    return x;
  })();

  // Find the governing section geometry BEFORE creating/attaching a new sectPr
  // so we never accidentally read from the newly created empty sectPr itself.
  const existingSect = child(pPr, 'sectPr');
  const sourceSectPr = governingSectPrForParagraph(body, paragraphs, index - 1, existingSect);
  const bodySect = Array.from(body.children).find(x => localName(x) === 'sectPr') as Element | null;

  let sect = existingSect;
  if (!sect) {
    sect = doc.createElementNS(W_NS, 'w:sectPr');
    pPr.appendChild(sect);
  }

  // Inherit existing student geometry (margins, page size, columns, grid)
  // without ever overwriting existing geometry or imposing global margins.
  if (sourceSectPr && sourceSectPr !== sect) copyGeometry(sourceSectPr, sect);
  if (bodySect && bodySect !== sect) copyGeometry(bodySect, sect);

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

type PageNumberRunFormat = 'standard' | 'arabicAlpha' | 'hindi';

function buildPageNumberRPr(doc: Document, runFormat: PageNumberRunFormat = 'standard'): Element {
  const rPr = doc.createElementNS(W_NS, 'w:rPr');
  const rFonts = doc.createElementNS(W_NS, 'w:rFonts');
  if (runFormat === 'arabicAlpha' || runFormat === 'hindi') {
    setVal(rFonts, 'ascii', 'Traditional Arabic');
    setVal(rFonts, 'hAnsi', 'Traditional Arabic');
    setVal(rFonts, 'cs', 'Traditional Arabic');
    setVal(rFonts, 'eastAsia', 'Traditional Arabic');
    rPr.appendChild(rFonts);
    // User requested font 12pt (24 half-points)
    const sz = doc.createElementNS(W_NS, 'w:sz');
    setVal(sz, 'val', '24');
    const szCs = doc.createElementNS(W_NS, 'w:szCs');
    setVal(szCs, 'val', '24');
    rPr.appendChild(sz);
    rPr.appendChild(szCs);
    rPr.appendChild(doc.createElementNS(W_NS, 'w:rtl'));
    rPr.appendChild(doc.createElementNS(W_NS, 'w:cs'));
    const lang = doc.createElementNS(W_NS, 'w:lang');
    setVal(lang, 'val', 'ar-SA');
    setVal(lang, 'bidi', 'ar-SA');
    rPr.appendChild(lang);
  } else {
    // Standar Indonesia: font Times New Roman ukuran 12 (24 half-points)
    setVal(rFonts, 'ascii', 'Times New Roman');
    setVal(rFonts, 'hAnsi', 'Times New Roman');
    setVal(rFonts, 'cs', 'Times New Roman');
    setVal(rFonts, 'eastAsia', 'Times New Roman');
    rPr.appendChild(rFonts);
    const sz = doc.createElementNS(W_NS, 'w:sz');
    setVal(sz, 'val', '24'); // 12pt = 24 half-points
    const szCs = doc.createElementNS(W_NS, 'w:szCs');
    setVal(szCs, 'val', '24');
    rPr.appendChild(sz);
    rPr.appendChild(szCs);
  }
  const position = doc.createElementNS(W_NS, 'w:position');
  setVal(position, 'val', '6');
  rPr.appendChild(position);
  return rPr;
}

function makePageRun(doc: Document, runFormat: PageNumberRunFormat = 'standard'): Element {
  const r = doc.createElementNS(W_NS, 'w:r');
  r.appendChild(buildPageNumberRPr(doc, runFormat));

  const b = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(b, 'fldCharType', 'begin');
  const i = doc.createElementNS(W_NS, 'w:instrText');
  i.setAttribute('xml:space', 'preserve');
  i.textContent = ' PAGE ';
  const s = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(s, 'fldCharType', 'separate');
  const t = doc.createElementNS(W_NS, 'w:t');
  t.textContent = runFormat === 'arabicAlpha' ? 'ب' : runFormat === 'hindi' ? '١' : '1';
  const e = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(e, 'fldCharType', 'end');
  [b, i, s, t, e].forEach(n => r.appendChild(n));
  return r;
}
function makeNumberParagraph(
  doc: Document,
  align: 'right' | 'center',
  runFormat: PageNumberRunFormat = 'standard'
): Element {
  const p = doc.createElementNS(W_NS, 'w:p');
  const pPr = doc.createElementNS(W_NS, 'w:pPr');
  if (runFormat === 'arabicAlpha' || runFormat === 'hindi') {
    pPr.appendChild(doc.createElementNS(W_NS, 'w:bidi'));
  }
  const jc = doc.createElementNS(W_NS, 'w:jc');
  setVal(jc, 'val', align);
  pPr.appendChild(jc);
  pPr.appendChild(buildPageNumberRPr(doc, runFormat));
  p.appendChild(pPr);
  p.appendChild(makePageRun(doc, runFormat));
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

function ensureArabicNumeralSettings(zip: JSZip): Promise<void> {
  const f = zip.file('word/settings.xml');
  if (!f) return Promise.resolve();
  return f.async('text').then(xml => {
    const doc = parseXml(xml);
    const root = doc.documentElement;
    let themeLang = Array.from(root.children).find(x => localName(x) === 'themeFontLang') as Element | undefined;
    if (!themeLang) {
      themeLang = doc.createElementNS(W_NS, 'w:themeFontLang');
      root.appendChild(themeLang);
    }
    if (!attr(themeLang, 'val')) setVal(themeLang, 'val', 'en-US');
    setVal(themeLang, 'bidi', 'ar-SA');
    zip.file('word/settings.xml', serializer().serializeToString(doc));
  });
}

const STYLES_CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml';
const REL_STYLES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles';

async function ensureHeadingAndTocStyles(
  zip: JSZip,
  ct: Document,
  rels: Document,
  useArabicFont: boolean = false
): Promise<void> {
  const existingStylesFile = zip.file('word/styles.xml');
  let stylesDoc: Document;

  if (existingStylesFile) {
    stylesDoc = parseXml(await existingStylesFile.async('text'));
  } else {
    stylesDoc = parseXml(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"></w:styles>`
    );
    ensureContentType(ct, 'word/styles.xml', STYLES_CT);
    const hasStylesRel = Array.from(rels.getElementsByTagNameNS(RELS_NS, 'Relationship')).some(
      r => (r.getAttribute('Type') || '') === REL_STYLES
    );
    if (!hasStylesRel) {
      addRel(rels, REL_STYLES, 'styles.xml');
    }
  }

  const fontName = useArabicFont ? 'Traditional Arabic' : 'Times New Roman';
  const fontSizeVal = useArabicFont ? '36' : '24'; // 18pt (36 half-points) for Arabic, 12pt (24) for Latin

  const root = stylesDoc.documentElement;
  const existingStyles = Array.from(root.children).filter(x => localName(x) === 'style');

  const ensureHeadingStyle = (level: 1 | 2 | 3) => {
    const id = `Heading${level}`;
    const nameStr = `heading ${level}`;
    let st = existingStyles.find(
      s =>
        attr(s, 'styleId').toLowerCase() === id.toLowerCase() ||
        attr(child(s, 'name'), 'val').toLowerCase() === nameStr
    );
    if (!st) {
      st = stylesDoc.createElementNS(W_NS, 'w:style');
      setVal(st, 'type', 'paragraph');
      setVal(st, 'styleId', id);
      const nameEl = stylesDoc.createElementNS(W_NS, 'w:name');
      setVal(nameEl, 'val', nameStr);
      st.appendChild(nameEl);
      const basedOn = stylesDoc.createElementNS(W_NS, 'w:basedOn');
      setVal(basedOn, 'val', 'Normal');
      st.appendChild(basedOn);
      const nextEl = stylesDoc.createElementNS(W_NS, 'w:next');
      setVal(nextEl, 'val', 'Normal');
      st.appendChild(nextEl);
      st.appendChild(stylesDoc.createElementNS(W_NS, 'w:qFormat'));

      const pPr = stylesDoc.createElementNS(W_NS, 'w:pPr');
      pPr.appendChild(stylesDoc.createElementNS(W_NS, 'w:keepNext'));
      pPr.appendChild(stylesDoc.createElementNS(W_NS, 'w:keepLines'));
      if (useArabicFont) {
        pPr.appendChild(stylesDoc.createElementNS(W_NS, 'w:bidi'));
      }
      const outline = stylesDoc.createElementNS(W_NS, 'w:outlineLvl');
      setVal(outline, 'val', String(level - 1));
      pPr.appendChild(outline);
      st.appendChild(pPr);

      const rPr = stylesDoc.createElementNS(W_NS, 'w:rPr');
      const rFonts = stylesDoc.createElementNS(W_NS, 'w:rFonts');
      setVal(rFonts, 'ascii', fontName);
      setVal(rFonts, 'hAnsi', fontName);
      setVal(rFonts, 'cs', fontName);
      setVal(rFonts, 'eastAsia', fontName);
      rPr.appendChild(rFonts);
      rPr.appendChild(stylesDoc.createElementNS(W_NS, 'w:b'));
      if (useArabicFont) {
        rPr.appendChild(stylesDoc.createElementNS(W_NS, 'w:bCs'));
      }
      const color = stylesDoc.createElementNS(W_NS, 'w:color');
      setVal(color, 'val', '000000');
      rPr.appendChild(color);
      const sz = stylesDoc.createElementNS(W_NS, 'w:sz');
      setVal(sz, 'val', fontSizeVal);
      const szCs = stylesDoc.createElementNS(W_NS, 'w:szCs');
      setVal(szCs, 'val', fontSizeVal);
      rPr.appendChild(sz);
      rPr.appendChild(szCs);
      st.appendChild(rPr);

      root.appendChild(st);
    } else {
      let pPr = child(st, 'pPr');
      if (!pPr) {
        pPr = stylesDoc.createElementNS(W_NS, 'w:pPr');
        st.appendChild(pPr);
      }
      let outline = child(pPr, 'outlineLvl');
      if (!outline) {
        outline = stylesDoc.createElementNS(W_NS, 'w:outlineLvl');
        pPr.appendChild(outline);
      }
      setVal(outline, 'val', String(level - 1));
    }
  };

  const ensureTocStyle = (level: 1 | 2 | 3) => {
    const id = `TOC${level}`;
    const nameStr = `toc ${level}`;
    const st = existingStyles.find(
      s =>
        attr(s, 'styleId').toLowerCase() === id.toLowerCase() ||
        attr(child(s, 'name'), 'val').toLowerCase() === nameStr
    );
    if (!st) {
      const tocSt = stylesDoc.createElementNS(W_NS, 'w:style');
      setVal(tocSt, 'type', 'paragraph');
      setVal(tocSt, 'styleId', id);
      const nameEl = stylesDoc.createElementNS(W_NS, 'w:name');
      setVal(nameEl, 'val', nameStr);
      tocSt.appendChild(nameEl);
      const basedOn = stylesDoc.createElementNS(W_NS, 'w:basedOn');
      setVal(basedOn, 'val', 'Normal');
      tocSt.appendChild(basedOn);
      if (useArabicFont) {
        const pPr = stylesDoc.createElementNS(W_NS, 'w:pPr');
        pPr.appendChild(stylesDoc.createElementNS(W_NS, 'w:bidi'));
        tocSt.appendChild(pPr);
      }
      const rPr = stylesDoc.createElementNS(W_NS, 'w:rPr');
      const rFonts = stylesDoc.createElementNS(W_NS, 'w:rFonts');
      setVal(rFonts, 'ascii', fontName);
      setVal(rFonts, 'hAnsi', fontName);
      setVal(rFonts, 'cs', fontName);
      setVal(rFonts, 'eastAsia', fontName);
      rPr.appendChild(rFonts);
      const sz = stylesDoc.createElementNS(W_NS, 'w:sz');
      setVal(sz, 'val', fontSizeVal);
      const szCs = stylesDoc.createElementNS(W_NS, 'w:szCs');
      setVal(szCs, 'val', fontSizeVal);
      rPr.appendChild(sz);
      rPr.appendChild(szCs);
      tocSt.appendChild(rPr);
      root.appendChild(tocSt);
    }
  };

  ensureHeadingStyle(1);
  ensureHeadingStyle(2);
  ensureHeadingStyle(3);
  ensureTocStyle(1);
  ensureTocStyle(2);
  ensureTocStyle(3);

  zip.file('word/styles.xml', serializer().serializeToString(stylesDoc));
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
  bab1: number,
  toc: Array<{ start: number; end: number }>
): { existed: boolean; created: boolean; normalizedManual: boolean } {
  const native = hasFieldInstruction(docXml, /^TOC\b/i);
  const body = docXml.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) return { existed: false, created: false, normalizedManual: false };

  prepareAutomaticTocHeadings(body, paragraphs);
  if (native) return { existed: true, created: false, normalizedManual: false };

  const range = toc.find(r => /^DAFTAR ISI\b/i.test(normalize(getParagraphText(paragraphs[r.start] || paragraphs[0]))));
  const titleIndex = range?.start ?? paragraphs.findIndex(p => /^DAFTAR ISI\b/i.test(normalize(getParagraphText(p))));

  // Convert a manual Daftar Isi: keep the student's title, remove only the
  // manually typed entries inside the detected TOC range, then insert a real
  // Word TOC field. Other lists (Daftar Tabel/Gambar) are untouched.
  if (titleIndex >= 0 && range && range.end > titleIndex) {
    const firstEntry = paragraphs[titleIndex + 1];
    const field = makeTocFieldParagraph(docXml);

    // Reuse the first manual-entry paragraph as the TOC field and blank the
    // remaining manual rows. This keeps paragraph indexes stable for BAB
    // detection and avoids moving the student's chapter boundaries.
    if (firstEntry && firstEntry.parentNode) {
      const existingFirstPPr = child(firstEntry, 'pPr');
      const existingFirstSect = existingFirstPPr ? child(existingFirstPPr, 'sectPr') : null;
      while (firstEntry.firstChild) firstEntry.removeChild(firstEntry.firstChild);
      while (field.firstChild) firstEntry.appendChild(field.firstChild);
      if (existingFirstSect) {
        let newPPr = child(firstEntry, 'pPr');
        if (!newPPr) {
          newPPr = docXml.createElementNS(W_NS, 'w:pPr');
          firstEntry.insertBefore(newPPr, firstEntry.firstChild);
        }
        newPPr.appendChild(existingFirstSect);
      }
      for (let i = titleIndex + 2; i <= range.end; i++) {
        const p = paragraphs[i];
        const existingPPr = child(p, 'pPr');
        while (p.firstChild) p.removeChild(p.firstChild);
        if (existingPPr) p.appendChild(existingPPr);
        else {
          // Keep the paragraph valid; an empty paragraph is intentional here.
          const pPr = docXml.createElementNS(W_NS, 'w:pPr');
          p.insertBefore(pPr, p.firstChild);
        }
      }
      return { existed: false, created: true, normalizedManual: true };
    }
  }

  if (titleIndex >= 0) {
    const titleEl = paragraphs[titleIndex];
    const field = makeTocFieldParagraph(docXml);
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.insertBefore(field, titleEl.nextSibling);
      return { existed: false, created: true, normalizedManual: true };
    }
  }

  // If no Daftar Isi exists, create one immediately before BAB I.
  const title = makeTextParagraph(docXml, 'DAFTAR ISI');
  const field = makeTocFieldParagraph(docXml);
  const target = bab1 >= 0 ? paragraphs[bab1] : null;
  if (target?.parentNode) {
    // If the paragraph immediately preceding BAB I had a section break closing
    // front_matter, move that section break onto the newly inserted TOC field
    // so the new Daftar Isi stays inside front_matter.
    if (bab1 > 1) {
      const prevP = paragraphs[bab1 - 1];
      const prevPPr = prevP ? child(prevP, 'pPr') : null;
      const prevSect = prevPPr ? child(prevPPr, 'sectPr') : null;
      if (prevSect && prevPPr) {
        prevPPr.removeChild(prevSect);
        let fieldPPr = child(field, 'pPr');
        if (!fieldPPr) {
          fieldPPr = docXml.createElementNS(W_NS, 'w:pPr');
          field.insertBefore(fieldPPr, field.firstChild);
        }
        fieldPPr.appendChild(prevSect);
      }
    }
    target.parentNode.insertBefore(title, target);
    target.parentNode.insertBefore(field, target);
  } else {
    const bodySect = Array.from(body.children).find(x => localName(x) === 'sectPr');
    body.insertBefore(title, bodySect || null);
    body.insertBefore(field, bodySect || null);
  }
  return { existed: false, created: true, normalizedManual: false };
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
  counter: { value: number },
  runFormat: PageNumberRunFormat = 'standard'
): Promise<string> {
  const sourceXml = source && zip.file(source.target)
    ? await zip.file(source.target)!.async('text')
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${kind === 'header' ? 'hdr' : 'ftr'} xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:p/></w:${kind === 'header' ? 'hdr' : 'ftr'}>`;

  const root = parseXml(sourceXml);
  const container = root.documentElement;
  const touched = removePageFields(root);

  if (number) {
    // If the old PAGE field was in a paragraph that otherwise contains only
    // paragraph properties, or if the header/footer has an empty placeholder
    // paragraph (<w:p/>), reuse that paragraph instead of appending a second line.
    let targetP: Element | null = null;
    for (const p of touched) {
      const meaningful = Array.from(p.children).filter(x => localName(x) !== 'pPr');
      if (meaningful.length === 0) { targetP = p; break; }
    }
    if (!targetP) {
      const existingParas = Array.from(container.children).filter(x => localName(x) === 'p') as Element[];
      for (const p of existingParas) {
        const meaningful = Array.from(p.children).filter(x => localName(x) !== 'pPr');
        if (meaningful.length === 0) { targetP = p; break; }
      }
    }
    if (!targetP) {
      targetP = makeNumberParagraph(root, align, runFormat);
      container.appendChild(targetP);
    } else {
      setParagraphAlignment(targetP, align);
      let pPr = child(targetP, 'pPr');
      if (!pPr) {
        pPr = root.createElementNS(W_NS, 'w:pPr');
        targetP.insertBefore(pPr, targetP.firstChild);
      }
      if (runFormat === 'arabicAlpha' || runFormat === 'hindi') {
        if (!child(pPr, 'bidi')) {
          pPr.appendChild(root.createElementNS(W_NS, 'w:bidi'));
        }
      }
      const oldPRPr = child(pPr, 'rPr');
      if (oldPRPr) pPr.removeChild(oldPRPr);
      pPr.appendChild(buildPageNumberRPr(root, runFormat));
      targetP.appendChild(makePageRun(root, runFormat));
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
  align: 'right' | 'center', number: boolean, counter: { value: number },
  runFormat: PageNumberRunFormat = 'standard'
): Promise<void> {
  const refKind = kind === 'header' ? 'headerReference' : 'footerReference';
  const map = relsMap(rels);
  const source = currentPartRef(sect, refKind, type, map) ||
    (type === 'first' ? currentPartRef(sect, refKind, 'default', map) : null);
  const target = await makeNumberPart(zip, ct, source, kind, align, number, counter, runFormat);
  const relType = kind === 'header' ? REL_HEADER : REL_FOOTER;
  const id = addRel(rels, relType, target);
  setRef(sect, refKind, type, id);
}

function classify(
  start: number,
  bab: Record<number, number>,
  back: number,
  maxBab: number = 6,
  isProposal: boolean = false
): ThesisSection['type'] {
  if (start === 0) return 'cover';
  if (isProposal) {
    if (bab[1] !== undefined && start >= bab[1]) return 'bab_1';
    return 'front_matter';
  }
  if (start === bab[1]) return 'bab_1';
  for (let n = 2; n <= maxBab; n++) if (start === bab[n]) return 'bab_other';
  if (back >= 0 && start >= back) return 'back_matter';
  if (bab[1] < 0 || start < bab[1]) return 'front_matter';
  return 'bab_other';
}

export function buildExpectedNumberingForSection(
  type: ThesisSection['type'],
  isFirstFront: boolean,
  isChapterStart: boolean,
  profile: DocumentNumberingProfile = 'skripsi'
): ThesisSection['expectedNumbering'] {
  if (type === 'cover') {
    return { format: 'none', firstPagePos: 'none', defaultPagePos: 'none' };
  }

  const isArabic = profile === 'arab' || profile.startsWith('arab');
  const isAllBottom =
    profile === 'makalah' ||
    profile === 'proposal' ||
    profile === 'arab-makalah' ||
    profile === 'arab-proposal';

  if (isArabic) {
    if (type === 'front_matter') {
      return {
        format: 'arabicAlpha',
        startAt: isFirstFront ? 2 : undefined,
        firstPagePos: 'bottom_center',
        defaultPagePos: 'bottom_center'
      };
    }
    if (isAllBottom) {
      return {
        format: 'hindi',
        startAt: type === 'bab_1' ? 1 : undefined,
        firstPagePos: 'bottom_center',
        defaultPagePos: 'bottom_center'
      };
    }
    // arab-skripsi & arab-tesis
    if (type === 'bab_1') {
      return {
        format: 'hindi',
        startAt: 1,
        firstPagePos: 'bottom_center',
        defaultPagePos: 'top_right'
      };
    }
    if (type === 'bab_other') {
      return {
        format: 'hindi',
        firstPagePos: isChapterStart ? 'bottom_center' : 'top_right',
        defaultPagePos: 'top_right'
      };
    }
    return {
      format: 'hindi',
      firstPagePos: 'top_right',
      defaultPagePos: 'top_right'
    };
  }

  // Indonesian Profiles (Times New Roman 12pt)
  if (isAllBottom) {
    if (type === 'front_matter') {
      return {
        format: 'lowerRoman',
        startAt: isFirstFront ? 2 : undefined,
        firstPagePos: 'bottom_center',
        defaultPagePos: 'bottom_center'
      };
    }
    return {
      format: 'decimal',
      startAt: type === 'bab_1' ? 1 : undefined,
      firstPagePos: 'bottom_center',
      defaultPagePos: 'bottom_center'
    };
  }

  // Standard: 'skripsi' & 'tesis'
  if (type === 'front_matter') {
    return {
      format: 'lowerRoman',
      startAt: isFirstFront ? 2 : undefined,
      firstPagePos: 'bottom_center',
      defaultPagePos: 'bottom_center'
    };
  }
  if (type === 'bab_1') {
    return {
      format: 'decimal',
      startAt: 1,
      firstPagePos: 'bottom_center',
      defaultPagePos: 'top_right'
    };
  }
  if (type === 'bab_other') {
    return {
      format: 'decimal',
      firstPagePos: isChapterStart ? 'bottom_center' : 'top_right',
      defaultPagePos: 'top_right'
    };
  }
  return {
    format: 'decimal',
    firstPagePos: 'top_right',
    defaultPagePos: 'top_right'
  };
}

export function applyNumberingProfileToSections(
  sections: ThesisSection[],
  profile: DocumentNumberingProfile
): ThesisSection[] {
  const firstFrontSection = sections.find(s => s.type === 'front_matter');
  return sections.map(sec => {
    const isFirstFront = sec.type === 'front_matter' && sec.id === firstFrontSection?.id;
    const expectedNumbering = buildExpectedNumberingForSection(
      sec.type,
      isFirstFront,
      !!sec.isChapterStart,
      profile
    );
    return {
      ...sec,
      expectedNumbering
    };
  });
}


function numberingStatus(
  sectPr: Element | null,
  expected: ThesisSection['expectedNumbering'],
  hasExpectedBoundary: boolean
): { hasNumberingIssue: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!sectPr) {
    issues.push('Awal bagian belum memiliki section khusus untuk mengatur penomoran.');
    return { hasNumberingIssue: true, issues };
  }
  const actual = getPageNumType(sectPr);
  if (expected.format === 'none') {
    if (actual) issues.push(`Nomor lama masih aktif (${actual.fmt}${actual.start ? `, mulai ${actual.start}` : ''}). Seharusnya tanpa nomor.`);
  } else {
    const expectedXmlFmt = expected.format === 'hindi' ? 'decimal' : expected.format;
    if (!actual) {
      issues.push(`Nomor lama tidak memiliki format ${expected.format}.`);
    } else if (actual.fmt !== expectedXmlFmt) {
      issues.push(`Format nomor lama "${actual.fmt}" berbeda; seharusnya "${expectedXmlFmt}".`);
    }
    if (expected.startAt !== undefined && Number(expected.startAt) !== actual?.start) {
      issues.push(`Nomor awal lama "${actual?.start ?? 'lanjut'}" berbeda; seharusnya mulai ${expected.startAt}.`);
    }
    if (expected.startAt === undefined && actual?.start !== undefined) {
      issues.push(`Section ini memiliki reset nomor lama ke ${actual.start}; seharusnya meneruskan nomor.`);
    }
  }
  if (!hasExpectedBoundary) issues.push('Batas section yang diperlukan belum ada.');
  return { hasNumberingIssue: issues.length > 0, issues };
}

export async function analyzeDocx(
  file: File | Blob,
  fileName: string,
  numberingProfile: DocumentNumberingProfile = 'skripsi'
): Promise<{ zip: JSZip; docXml: Document; analysis: DocumentAnalysis }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const f = zip.file('word/document.xml');
  if (!f) throw new Error('File bukan DOCX yang sah.');
  const doc = parseXml(await f.async('text'));
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) throw new Error('Body Word tidak ditemukan.');

  const ps = bodyParagraphs(body);
  const existing = collectSectionStarts(body, ps);
  const toc = tocRanges(ps);
  const isProposal =
    numberingProfile === 'proposal' ||
    numberingProfile === 'arab-proposal' ||
    isProposalDocument(ps, numberingProfile);

  // Standar Skripsi: 5 Bab (BAB I..V). Hanya Tesis yang mendeteksi BAB VI. Untuk Proposal: maxBab = 1
  const maxBab = isProposal
    ? 1
    : numberingProfile === 'tesis' || numberingProfile === 'arab-tesis'
    ? 6
    : 5;
  const rawBab = findBabIndexes(ps, toc, maxBab, numberingProfile);
  const bab: Record<number, number> = {};
  for (let n = 1; n <= maxBab; n++) {
    if (rawBab[n] !== undefined) bab[n] = rawBab[n];
  }
  const bab1 = bab[1] ?? -1;

  const lastBabIdx = Math.max(0, ...Object.values(bab));
  let back = -1;
  if (!isProposal) {
    for (let i = lastBabIdx + 1; i < ps.length; i++) {
      if (!isTocEntryOrListParagraph(ps[i]) && isBackHeading(getParagraphText(ps[i]))) {
        back = i;
        break;
      }
    }
  }

  const boundaries = desiredBoundaries(ps, bab, existing, maxBab, isProposal);
  const issues: string[] = [];
  if (toc.length) issues.push('Daftar Isi/Daftar Tabel/Gambar terdeteksi dan dikecualikan dari deteksi BAB.');

  if (isProposal) {
    if (bab1 < 0) {
      issues.push('Judul Penelitian (A. Judul Penelitian / Konteks Penelitian) belum ditemukan dengan cukup aman pada proposal ini.');
    }
  } else {
    if (bab1 < 0) issues.push('BAB I tidak ditemukan dengan cukup aman.');
    const expectedMinChapters =
      numberingProfile === 'tesis' ? 6 : numberingProfile === 'makalah' ? 3 : 5;
    for (let n = 2; n <= expectedMinChapters; n++) {
      if (bab[n] === undefined) {
        issues.push(`BAB ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][n]} tidak ditemukan dengan cukup aman.`);
      }
    }
  }
  if (!existing.length) issues.push('Section Word tidak ditemukan; batas section hanya akan dibuat pada titik yang diperlukan dan memakai geometri section sebelumnya.');
  if (findFrontStart(ps, bab1, existing) < 0) issues.push('Batas Cover 1 ke halaman awal belum dapat ditentukan dengan aman; koreksi dibatalkan agar tidak mengubah halaman cover secara keliru.');

  const virtual: ThesisSection[] = boundaries.map((start, idx) => {
    const type = classify(start, bab, back, maxBab, isProposal);
    const chapterNumber = isProposal ? (start === bab[1] ? 1 : undefined) : [1, 2, 3, 4, 5, 6].find(n => bab[n] === start);
    const isChapterStart = chapterNumber !== undefined;
    const isFirstFront = type === 'front_matter' && start === boundaries.find(x => x > 0);
    const expectedNumbering = buildExpectedNumberingForSection(
      type,
      isFirstFront,
      isChapterStart,
      numberingProfile
    );
    const existingSection = existing.find(s => s.startParagraph === start);
    let rawTitle = getParagraphText(ps[start] || ps[0]).slice(0, 100);
    if (chapterNumber && !isBabHeading(rawTitle, chapterNumber)) {
      if (isProposal) {
        // Jangan beri prefix BAB untuk judul naskah Proposal Penelitian!
      } else if (hasArabicScript(rawTitle) || numberingProfile === 'arab') {
        const arabNames = ['', 'الباب الأول', 'الباب الثاني', 'الباب الثالث', 'الباب الرابع', 'الباب الخامس', 'الباب السادس'];
        rawTitle = `${arabNames[chapterNumber]} : ${rawTitle}`.slice(0, 100);
      } else {
        rawTitle = `BAB ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][chapterNumber]} ${rawTitle}`.slice(0, 100);
      }
    }
    return {
      id: `sec-${idx}`,
      type,
      title: rawTitle,
      paragraphIndex: start,
      hasExistingSectPr: !!existingSection,
      sectionOrdinal: idx,
      chapterNumber,
      expectedNumbering,
      currentStatus: isProposal
        ? { hasNumberingIssue: false, issues: [] }
        : numberingStatus(existingSection?.sectPr || null, expectedNumbering, !!existingSection),
      isChapterStart
    };
  });

  const nativeToc = hasFieldInstruction(doc, /^TOC\b/i);
  const tocKeywordIdx = findTocKeywordParagraphIndex(ps, bab1);
  const hasManualLines = toc.some(r => r.end > r.start);
  const tocExists = nativeToc || hasManualLines || tocKeywordIdx >= 0;
  const tocKind: 'openxml_sdt' | 'manual_toc' | 'keyword_only' | 'none' = nativeToc
    ? 'openxml_sdt'
    : hasManualLines
    ? 'manual_toc'
    : tocKeywordIdx >= 0
    ? 'keyword_only'
    : 'none';

  if (tocKind === 'keyword_only') {
    issues.push(
      'Kata kunci DAFTAR ISI ditemukan (halaman Daftar Isi siap diisi). Sistem akan membuat isi Daftar Isi Otomatis lengkap (BAB & Sub-Bab dengan Add Text Level 1-3) langsung di bawah kata kunci DAFTAR ISI.'
    );
  } else if (!tocExists) {
    issues.push(
      'Daftar Isi belum ditemukan. Jika fitur Edit Daftar Isi diaktifkan, sistem akan menerapkan Add Text Level 1-3 (BAB & Sub-Bab) dan membuat Daftar Isi Otomatis.'
    );
  } else if (nativeToc) {
    issues.push(
      'Daftar Isi otomatis (OpenXML TOC) terdeteksi. Anda dapat memilih untuk membuat ulang Daftar Isi Otomatis di bawah kata kunci DAFTAR ISI atau mencocokkan penomoran.'
    );
  } else {
    issues.push(
      'Daftar Isi manual terdeteksi. Anda dapat memilih Membuat Daftar Isi Otomatis di bawah kata kunci DAFTAR ISI (lengkap dengan Add Text BAB & Sub-Bab) atau Mempertahankan Daftar Isi Manual (hanya mencocokkan nomor halaman).'
    );
  }

  // Generate non-destructive TOC workflow preview on a cloned XML document
  let tocWorkflowPreview: TocWorkflowResult | undefined;
  try {
    const clonedDoc = parseXml(serializer().serializeToString(doc));
    const clonedBody = clonedDoc.getElementsByTagNameNS(W_NS, 'body')[0];
    if (clonedBody) {
      const clonedPs = bodyParagraphs(clonedBody);
      const frontIdx = findFrontStart(clonedPs, bab1, existing);
      tocWorkflowPreview = processDocumentTocWorkflow(
        clonedDoc,
        clonedPs,
        bab,
        frontIdx,
        back,
        true,
        'auto_generate',
        numberingProfile
      );
    }
  } catch (_e) {
    // Preview optional
  }

  const allSectionsCompliant = virtual
    .filter(s => ['front_matter', 'bab_1', 'bab_other', 'back_matter'].includes(s.type))
    .every(s => !s.currentStatus.hasNumberingIssue);

  return {
    zip, docXml: doc,
    analysis: {
      fileName, fileSizeBytes: file.size, totalParagraphs: ps.length,
      totalExistingSections: existing.length,
      numberingProfile,
      isProposal,
      sections: virtual,
      detectedIssues: issues, isCompliant: bab1 >= 0 && allSectionsCompliant,
      toc: {
        exists: tocExists,
        nativeField: nativeToc,
        tocKind,
        tocKeywordFound: tocKeywordIdx >= 0,
        needsWordUpdate: true,
        createdOnCorrection: false,
        notes: tocWorkflowPreview?.revision_logs || []
      },
      tocWorkflowPreview
    }
  };
}

/**
 * Menghapus paragraf kosong (Enter berlebih) di bagian awal cover dokumen sebelum teks pertama/gambar,
 * agar judul skripsi tidak terdorong turun ke bawah sampai separuh halaman dan cover tidak melompat jadi 3 halaman.
 */
function normalizeLeadingCoverSpacers(body: Element): void {
  const ps = Array.from(body.children).filter(x => localName(x) === 'p') as Element[];
  let firstContentIdx = -1;
  for (let i = 0; i < ps.length; i++) {
    const hasText = getParagraphText(ps[i]).trim().length > 0;
    const hasDrawing = ps[i].getElementsByTagNameNS(W_NS, 'drawing').length > 0 || ps[i].getElementsByTagNameNS(W_NS, 'pict').length > 0;
    if (hasText || hasDrawing) {
      firstContentIdx = i;
      break;
    }
  }
  // Jika ada paragraf Enter kosong sebelum konten cover pertama, bersihkan paragraf kosong tersebut
  if (firstContentIdx > 0) {
    for (let i = 0; i < firstContentIdx; i++) {
      const p = ps[i];
      const pPr = child(p, 'pPr');
      const sect = pPr ? child(pPr, 'sectPr') : null;
      if (!sect && p.parentNode) {
        p.parentNode.removeChild(p);
      }
    }
  }
}

/**
 * Cleans redundant hard page breaks and empty spacer paragraphs right at a section boundary
 * so that `<w:type w:val="nextPage"/>` on the section break starts the new chapter
 * or Daftar Pustaka cleanly on a new page without creating an extra blank page
 * or pushing the previous section's end onto the new page.
 */
function cleanRedundantBreaksAtBoundary(paragraphs: Element[], startIdx: number): void {
  if (startIdx <= 0 || startIdx >= paragraphs.length) return;

  // 1. On the boundary heading paragraph itself (e.g. BAB I..V or DAFTAR PUSTAKA),
  // remove w:pageBreakBefore and any leading <w:br w:type="page"/> before visible text.
  const startP = paragraphs[startIdx];
  const startPPr = child(startP, 'pPr');
  if (startPPr) {
    const pbb = child(startPPr, 'pageBreakBefore');
    if (pbb) startPPr.removeChild(pbb);
  }
  let seenVisibleText = false;
  for (const r of Array.from(startP.children).filter(x => localName(x) === 'r')) {
    for (const c of Array.from(r.children)) {
      const cname = localName(c);
      if (cname === 't' && (c.textContent || '').trim().length > 0) {
        seenVisibleText = true;
      } else if (!seenVisibleText && cname === 'br' && /^page$/i.test(attr(c, 'type'))) {
        r.removeChild(c);
      }
    }
  }

  // 2. Walk backwards through any empty spacer paragraphs immediately preceding startIdx
  // and remove page breaks / empty paragraphs so they don't push the previous section onto a new page,
  // create extra blank pages, or push the new chapter halfway down the page.
  let k = startIdx - 1;
  const emptyToRemove: Element[] = [];
  while (k >= 0) {
    const prevP = paragraphs[k];
    const hasText = getParagraphText(prevP).length > 0;
    const hasDrawing = prevP.getElementsByTagNameNS(W_NS, 'drawing').length > 0 || prevP.getElementsByTagNameNS(W_NS, 'pict').length > 0;
    if (!hasText && !hasDrawing) {
      const pPr = child(prevP, 'pPr');
      const hasSect = pPr && child(pPr, 'sectPr');
      if (!hasSect) {
        emptyToRemove.push(prevP);
      } else {
        const pbb = child(pPr, 'pageBreakBefore');
        if (pbb) pPr.removeChild(pbb);
      }
      for (const br of Array.from(prevP.getElementsByTagNameNS(W_NS, 'br'))) {
        if (/^page$/i.test(attr(br, 'type')) && br.parentNode) {
          br.parentNode.removeChild(br);
        }
      }
      k--;
    } else {
      // On the last non-empty paragraph of the previous chapter (e.g. end of cover or BAB IV),
      // remove any trailing <w:br w:type="page"/> that comes after all visible text.
      const allRuns = Array.from(prevP.children).filter(x => localName(x) === 'r');
      for (let rIdx = allRuns.length - 1; rIdx >= 0; rIdx--) {
        const run = allRuns[rIdx];
        let stopScanning = false;
        const runChildren = Array.from(run.children);
        for (let cIdx = runChildren.length - 1; cIdx >= 0; cIdx--) {
          const c = runChildren[cIdx];
          const cname = localName(c);
          if (cname === 't' && (c.textContent || '').trim().length > 0) {
            stopScanning = true;
            break;
          }
          if (cname === 'br' && /^page$/i.test(attr(c, 'type'))) {
            run.removeChild(c);
          }
        }
        if (stopScanning) break;
      }
      break;
    }
  }

  for (const emp of emptyToRemove) {
    if (emp.parentNode) emp.parentNode.removeChild(emp);
  }
}

/**
 * Memastikan judul bab (misal BAB V) dan sub-judulnya (misal PENUTUP) 100% selalu berada
 * di halaman yang sama dengan menggabungkannya ke dalam 1 paragraf Word fisik yang sama
 * dipisahkan soft line break (<w:r><w:br/></w:r>, Shift+Enter).
 * Menghapus segala sectPr, pageBreakBefore, dan hard page break dari babP dan subP
 * agar tidak mungkin dipisahkan oleh Word ke halaman berbeda.
 */
function ensureBabAndSubtitleStayOnSamePage(
  paragraphs: Element[],
  rules: ThesisSection[]
): void {
  for (const rule of rules) {
    if (!rule.isChapterStart || rule.paragraphIndex < 0 || rule.paragraphIndex >= paragraphs.length) continue;
    const babIdx = rule.paragraphIndex;
    const babP = paragraphs[babIdx];
    if (!babP || !babP.parentNode) continue;
    const babText = getParagraphText(babP).trim();

    const normBab = normalize(babText);
    const arabKeyBab = normalizeArabicKey(babText);

    // Cek apakah babP merupakan judul bab singkat (misal "BAB V", "BAB I", "الباب الأول")
    const isBare =
      /^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s*[:.\-–—\t]?\s*(?:[IVX]+|\d+|SATU|PERTAMA|DUA|KEDUA|TIGA|KETIGA|EMPAT|KEEMPAT|LIMA|KELIMA|ENAM|KEENAM)[.:\-\s]*$/i.test(normBab) ||
      /^(?:الباب|الفصل|المبحث)\s+(?:الاول|الثاني|الثالث|الرابع|الخامس|السادس|[١-٦]|[1-6])\s*[:.\-–—]?\s*$/.test(arabKeyBab) ||
      (hasArabicScript(babText) && normBab.length <= 40);

    if (isBare) {
      const emptyBetween: Element[] = [];
      let foundSubP: Element | null = null;

      // Cari paragraf sub-judul hingga 4 paragraf ke depan
      for (let k = babIdx + 1; k < Math.min(paragraphs.length, babIdx + 5); k++) {
        const candP = paragraphs[k];
        if (!candP || !candP.parentNode) continue;
        const candText = getParagraphText(candP).trim();
        if (!candText) {
          emptyBetween.push(candP);
          continue;
        }

        const candNorm = normalize(candText);
        const candArab = normalizeArabicKey(candText);
        const isAnotherChap =
          /^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s+[0-9IVX]+/i.test(candNorm) ||
          /^(?:الباب|الفصل)\s+/i.test(candArab) ||
          /^(?:DAFTAR\s+PUSTAKA|KEPUSTAKAAN|LAMPIRAN)\b/i.test(candNorm);

        if (candText.length <= 120 && !isAnotherChap && !isTocEntryOrListParagraph(candP)) {
          foundSubP = candP;
        }
        break;
      }

      if (foundSubP) {
        const doc = babP.ownerDocument!;

        // 1. Bersihkan sectPr, pageBreakBefore, dan hard break dari babP
        const babPPr = child(babP, 'pPr');
        if (babPPr) {
          const babSect = child(babPPr, 'sectPr');
          if (babSect) babPPr.removeChild(babSect);
          const pbb = child(babPPr, 'pageBreakBefore');
          if (pbb) babPPr.removeChild(pbb);
        }
        for (const br of Array.from(babP.getElementsByTagNameNS(W_NS, 'br'))) {
          if (/^page$/i.test(attr(br, 'type')) && br.parentNode) {
            br.parentNode.removeChild(br);
          }
        }

        // 2. Bersihkan sectPr, pageBreakBefore, dan hard break dari foundSubP
        const subPPr = child(foundSubP, 'pPr');
        if (subPPr) {
          const subSect = child(subPPr, 'sectPr');
          if (subSect) subPPr.removeChild(subSect);
          const pbb = child(subPPr, 'pageBreakBefore');
          if (pbb) subPPr.removeChild(pbb);
        }
        for (const br of Array.from(foundSubP.getElementsByTagNameNS(W_NS, 'br'))) {
          if (/^page$/i.test(attr(br, 'type')) && br.parentNode) {
            br.parentNode.removeChild(br);
          }
        }

        // 3. Sisipkan soft line break run <w:r><w:br/></w:r> ke babP agar judul & sub-judul tetap 2 baris visual
        const brRun = doc.createElementNS(W_NS, 'w:r');
        brRun.appendChild(doc.createElementNS(W_NS, 'w:br'));
        babP.appendChild(brRun);

        // 4. Pindahkan seluruh run & teks dari foundSubP ke dalam babP (fisik menyatu)
        for (const ch of Array.from(foundSubP.childNodes)) {
          if (ch.nodeType === 1 && localName(ch as Element) === 'pPr') continue;
          babP.appendChild(ch);
        }

        // 5. Hapus paragraf kosong perantara dan foundSubP dari DOM
        for (const emp of emptyBetween) {
          if (emp.parentNode) emp.parentNode.removeChild(emp);
        }
        if (foundSubP.parentNode) {
          foundSubP.parentNode.removeChild(foundSubP);
        }

        // 6. Pasang keepWithNext dan jc center pada babP
        let finalBabPPr = child(babP, 'pPr');
        if (!finalBabPPr) {
          finalBabPPr = doc.createElementNS(W_NS, 'w:pPr');
          babP.insertBefore(finalBabPPr, babP.firstChild);
        }
        if (!child(finalBabPPr, 'keepWithNext')) {
          finalBabPPr.appendChild(doc.createElementNS(W_NS, 'w:keepWithNext'));
        }
        let jc = child(finalBabPPr, 'jc');
        if (!jc) {
          jc = doc.createElementNS(W_NS, 'w:jc');
          finalBabPPr.appendChild(jc);
        }
        setVal(jc, 'val', 'center');
      }
    }
  }
}

export async function correctThesisDocx(
  zip: JSZip,
  docXml: Document,
  sections: ThesisSection[],
  options: { editToc?: boolean; tocMode?: TocProcessMode; numberingProfile?: DocumentNumberingProfile } = {}
): Promise<{ blob: Blob; tocResult: TocWorkflowResult | null }> {
  const body = docXml.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) throw new Error('Body Word tidak ditemukan.');
  const relFile = zip.file('word/_rels/document.xml.rels');
  const ctFile = zip.file('[Content_Types].xml');
  if (!relFile || !ctFile) throw new Error('Struktur DOCX tidak lengkap.');

  const rels = parseXml(await relFile.async('text'));
  const ct = parseXml(await ctFile.async('text'));
  let ps = bodyParagraphs(body);
  const profile: DocumentNumberingProfile = options.numberingProfile || 'skripsi';

  // Bind each section rule to its actual DOM paragraph element before any DOM modifications
  // so paragraph index shifts never misalign chapter boundaries.
  let bmSeed = 900;
  const boundRules = sections.map(s => {
    const el = ps[s.paragraphIndex] || null;
    const chapNum = s.chapterNumber || (s.type === 'bab_1' ? 1 : undefined);
    if (el && chapNum && chapNum >= 1 && chapNum <= 6 && getParagraphBabBookmark(el) !== chapNum) {
      const bmId = String(++bmSeed);
      const bmStart = docXml.createElementNS(W_NS, 'w:bookmarkStart');
      setVal(bmStart, 'id', bmId);
      setVal(bmStart, 'name', `_TocBab_${chapNum}_${bmId}`);
      const bmEnd = docXml.createElementNS(W_NS, 'w:bookmarkEnd');
      setVal(bmEnd, 'id', bmId);
      const pPr = child(el, 'pPr');
      el.insertBefore(bmStart, pPr ? pPr.nextSibling : el.firstChild);
      el.appendChild(bmEnd);
    }
    return {
      rule: { ...s, expectedNumbering: { ...s.expectedNumbering } },
      element: el
    };
  });

  normalizeLeadingCoverSpacers(body);
  ps = bodyParagraphs(body);

  // Optional TOC Workflow
  let tocResult: TocWorkflowResult | null = null;
  if (options.editToc) {
    const babMap: Record<number, number> = {};
    for (const s of sections) {
      if (s.chapterNumber && s.chapterNumber >= 1 && s.chapterNumber <= 6) {
        babMap[s.chapterNumber] = s.paragraphIndex;
      } else if (s.type === 'bab_1') {
        babMap[1] = s.paragraphIndex;
      }
    }
    const frontSec = sections.find(s => s.type === 'front_matter');
    const backSec = sections.find(s => s.type === 'back_matter');
    tocResult = processDocumentTocWorkflow(
      docXml,
      ps,
      babMap,
      frontSec ? frontSec.paragraphIndex : 1,
      backSec ? backSec.paragraphIndex : -1,
      true,
      options.tocMode || 'auto_generate',
      profile
    );
    const hasArabicHeadings =
      profile === 'arab' ||
      sections.some(s => hasArabicScript(s.title)) ||
      !!(tocResult.toc_keyword_text && hasArabicScript(tocResult.toc_keyword_text));
    await ensureHeadingAndTocStyles(zip, ct, rels, hasArabicHeadings);
    if (tocResult.action_taken === 'GENERATE_NEW_TOC' || tocResult.toc_kind === 'openxml_sdt') {
      await ensureUpdateFields(zip);
    }
    ps = bodyParagraphs(body);
  }

  if (profile === 'arab' || profile.startsWith('arab')) {
    await ensureArabicNumeralSettings(zip);
  }

  const rulesForCorrection: ThesisSection[] = boundRules.map(({ rule, element }) => {
    if (rule.paragraphIndex === 0) return rule;
    let newIdx = element ? ps.indexOf(element) : -1;
    if (newIdx < 0 && rule.chapterNumber) {
      newIdx = ps.findIndex(p => getParagraphBabBookmark(p) === rule.chapterNumber);
    }
    return {
      ...rule,
      paragraphIndex: newIdx >= 0 ? newIdx : rule.paragraphIndex
    };
  });

  // Record all existing section starts and their original w:type BEFORE adding
  // any new section boundaries.
  const originalStarts = collectSectionStarts(body, ps);
  const originalStartTypeMap = new Map<number, string | null>();
  for (const orig of originalStarts) {
    const typeEl = orig.sectPr ? child(orig.sectPr, 'type') : null;
    const typeVal = typeEl ? (attr(typeEl, 'val') || null) : null;
    originalStartTypeMap.set(orig.startParagraph, typeVal);
  }

  // Ensure body has a trailing sectPr
  let bodySect = Array.from(body.children).find(x => localName(x) === 'sectPr') as Element | undefined;
  if (!bodySect) {
    bodySect = docXml.createElementNS(W_NS, 'w:sectPr');
    const anyExistingSect = governingSectPrForParagraph(body, ps, ps.length - 1);
    if (anyExistingSect) copyGeometry(anyExistingSect, bodySect);
    body.appendChild(bodySect);
  }
  // Strip vertical centering from bodySect so document pages never float halfway down the page
  const bodyVAlign = child(bodySect, 'vAlign');
  if (bodyVAlign) {
    const vVal = attr(bodyVAlign, 'val');
    if (vVal && /^(center|bottom)$/i.test(vVal)) {
      bodySect.removeChild(bodyVAlign);
    }
  }

  // Jamin judul bab (misal BAB V) dan sub-judulnya (misal PENUTUP) 100% selalu berada di 1 halaman yang sama
  // tanpa ada page break tersembunyi atau pemisahan yang keliru.
  ensureBabAndSubtitleStayOnSamePage(ps, rulesForCorrection);
  ps = bodyParagraphs(body);
  for (const r of rulesForCorrection) {
    if (r.chapterNumber && r.chapterNumber >= 1 && r.chapterNumber <= 6) {
      const idx = ps.findIndex(p => getParagraphBabBookmark(p) === r.chapterNumber);
      if (idx >= 0) r.paragraphIndex = idx;
    }
  }

  // Clean redundant breaks and empty spacer paragraphs at major section boundaries and insert section breaks
  // so every BAB (termasuk BAB V & PENUTUP dalam 1 halaman) and DAFTAR PUSTAKA starts cleanly on a new page.
  for (const s of [...rulesForCorrection].sort((a, b) => b.paragraphIndex - a.paragraphIndex)) {
    if (s.paragraphIndex > 0) {
      const bound = boundRules.find(b => b.rule.id === s.id);
      let targetElement = bound?.element && ps.includes(bound.element) ? bound.element : null;
      if (!targetElement && s.chapterNumber) {
        targetElement = ps.find(p => getParagraphBabBookmark(p) === s.chapterNumber) || null;
      }
      if (!targetElement) {
        targetElement = ps[s.paragraphIndex] || null;
      }

      if (targetElement) {
        const targetIdx = ps.indexOf(targetElement);
        if (targetIdx > 0) {
          cleanRedundantBreaksAtBoundary(ps, targetIdx);
          ps = bodyParagraphs(body);
          const currIdx = ps.indexOf(targetElement);
          if (currIdx > 0) {
            insertSectAt(body, ps, currIdx, docXml);
            ps = bodyParagraphs(body);
          }
        }
      }
    }
  }
  ps = bodyParagraphs(body);

  // CRITICAL: Re-synchronize paragraphIndex on ALL rulesForCorrection to match their exact DOM positions in ps!
  for (const r of rulesForCorrection) {
    if (r.paragraphIndex === 0) continue;
    let actualIdx = -1;
    if (r.chapterNumber && r.chapterNumber >= 1 && r.chapterNumber <= 6) {
      actualIdx = ps.findIndex(p => getParagraphBabBookmark(p) === r.chapterNumber);
    }
    if (actualIdx < 0) {
      const bound = boundRules.find(b => b.rule.id === r.id);
      if (bound?.element) {
        actualIdx = ps.indexOf(bound.element);
      }
    }
    if (actualIdx >= 0) {
      r.paragraphIndex = actualIdx;
    }
  }

  // Also ensure any subsequent back-matter headings after DAFTAR PUSTAKA (e.g. LAMPIRAN, RIWAYAT HIDUP)
  // start on a new page if they don't already have a break.
  const backRule = rulesForCorrection.find(s => s.type === 'back_matter');
  if (backRule && backRule.paragraphIndex > 0) {
    for (let i = backRule.paragraphIndex + 1; i < ps.length; i++) {
      if (!isTocEntryOrListParagraph(ps[i]) && isBackHeading(getParagraphText(ps[i]))) {
        if (!hasBreakNear(ps, i) && !(i > 0 && !!sectionOwner(ps[i - 1]))) {
          let pPr = child(ps[i], 'pPr');
          if (!pPr) {
            pPr = docXml.createElementNS(W_NS, 'w:pPr');
            ps[i].insertBefore(pPr, ps[i].firstChild);
          }
          if (!child(pPr, 'pageBreakBefore')) {
            pPr.appendChild(docXml.createElementNS(W_NS, 'w:pageBreakBefore'));
          }
        }
      }
    }
  }

  const starts = collectSectionStarts(body, ps);
  const counter = { value: 1 };

  const sortedRules = [...rulesForCorrection].sort((a, b) => a.paragraphIndex - b.paragraphIndex);

  function ruleForStart(start: number): ThesisSection {
    let rule = sortedRules.filter(s => s.paragraphIndex <= start).at(-1);
    if (!rule) rule = sortedRules[0];
    return rule;
  }

  for (const entry of starts) {
    if (!entry.sectPr) continue;
    const baseRule = ruleForStart(entry.startParagraph);
    const isExactRuleStart = entry.startParagraph === baseRule.paragraphIndex;
    const isChapterStart = isExactRuleStart && (baseRule.type === 'bab_1' || !!baseRule.isChapterStart);
    const rule: ThesisSection = {
      ...baseRule,
      isChapterStart,
      expectedNumbering: { ...baseRule.expectedNumbering }
    };
    const sect = entry.sectPr;

    // Strip vertical centering from all sections so pages never float halfway down the page
    const vAlign = child(sect, 'vAlign');
    if (vAlign) {
      const vVal = attr(vAlign, 'val');
      if (vVal && /^(center|bottom)$/i.test(vVal)) {
        sect.removeChild(vAlign);
      }
    }

    // Ensure every section preserves the student's page geometry
    if (bodySect && sect !== bodySect) {
      copyGeometry(bodySect, sect);
    }

    // Major section boundaries (Cover 2 / Front Matter, BAB I..V, and DAFTAR PUSTAKA / Back Matter)
    // MUST use 'nextPage' so BAB V never merges with the end of BAB IV and DAFTAR PUSTAKA never
    // merges with the end of BAB V. Mid-chapter existing section breaks preserve their original type.
    if (isExactRuleStart && entry.startParagraph > 0) {
      ensureSectType(sect, 'nextPage');
    } else if (originalStartTypeMap.has(entry.startParagraph)) {
      restoreSectType(sect, originalStartTypeMap.get(entry.startParagraph) ?? null);
    } else if (entry.startParagraph > 0) {
      ensureSectType(sect, 'continuous');
    }

    if (rule.type === 'cover' || rule.expectedNumbering.format === 'none') {
      setPageNumType(sect, null);
      ensureTitlePg(sect, false);
      await attachPart(zip, rels, ct, sect, 'header', 'default', 'right', false, counter);
      await attachPart(zip, rels, ct, sect, 'footer', 'default', 'center', false, counter);
    } else {
      const fmt = rule.expectedNumbering.format;
      const openXmlFmt: 'lowerRoman' | 'decimal' | 'arabicAlpha' =
        fmt === 'lowerRoman'
          ? 'lowerRoman'
          : fmt === 'arabicAlpha'
          ? 'arabicAlpha'
          : 'decimal';
      const runFormat: PageNumberRunFormat =
        fmt === 'arabicAlpha'
          ? 'arabicAlpha'
          : fmt === 'hindi'
          ? 'hindi'
          : 'standard';

      const startVal =
        isExactRuleStart && rule.expectedNumbering.startAt !== undefined
          ? Number(rule.expectedNumbering.startAt)
          : undefined;

      setPageNumType(sect, openXmlFmt, startVal);

      const firstPos = rule.expectedNumbering.firstPagePos;
      const defaultPos = rule.expectedNumbering.defaultPagePos;
      const hasDistinctFirstPage = !!rule.isChapterStart && firstPos !== defaultPos;

      ensureTitlePg(sect, hasDistinctFirstPage);

      await attachPart(
        zip,
        rels,
        ct,
        sect,
        'header',
        'default',
        'right',
        defaultPos === 'top_right',
        counter,
        runFormat
      );
      await attachPart(
        zip,
        rels,
        ct,
        sect,
        'footer',
        'default',
        'center',
        defaultPos === 'bottom_center',
        counter,
        runFormat
      );

      if (hasDistinctFirstPage) {
        await attachPart(
          zip,
          rels,
          ct,
          sect,
          'header',
          'first',
          'right',
          firstPos === 'top_right',
          counter,
          runFormat
        );
        await attachPart(
          zip,
          rels,
          ct,
          sect,
          'footer',
          'first',
          'center',
          firstPos === 'bottom_center',
          counter,
          runFormat
        );
      }
    }
    normalizeSectPrOrder(sect);
  }

  zip.file('word/document.xml', serializer().serializeToString(docXml));
  zip.file('word/_rels/document.xml.rels', serializer().serializeToString(rels));
  zip.file('[Content_Types].xml', serializer().serializeToString(ct));
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });
  return { blob, tocResult };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function createSampleFaultyThesisDocx(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="${TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"></Relationships>`);
  const paras = [
    { text: 'COVER SAMPUL SKRIPSI', br: false },
    { text: 'HALAMAN JUDUL', br: true },
    { text: 'KATA PENGANTAR', br: true },
    { text: 'DAFTAR ISI', br: true },
    { text: 'HALAMAN JUDUL ................................................................ i', br: false },
    { text: 'KATA PENGANTAR ............................................................. ii', br: false },
    { text: 'DAFTAR ISI ....................................................................... iii', br: false },
    { text: 'BAB I PENDAHULUAN ........................................................ 2', br: false },
    { text: '1.1 Latar Belakang Masalah ............................................... 2', br: false },
    { text: '1.2 Rumusan Masalah ........................................................ 2', br: false },
    { text: 'BAB II TINJAUAN PUSTAKA .............................................. 2', br: false },
    { text: '2.1 Landasan Teori ............................................................ 2', br: false },
    { text: '2.3 Penelitian Terdahulu ................................................... 2', br: false },
    { text: 'BAB V PENUTUP ................................................................ 1', br: false },
    { text: 'DAFTAR PUSTAKA ............................................................. 1', br: false },
    { text: 'BAB I PENDAHULUAN', br: true },
    { text: '1.1 Latar Belakang Masalah', br: false },
    { text: 'Uraian latar belakang masalah penelitian skripsi secara lengkap.', br: false },
    { text: '1.2 Rumusan Masalah', br: false },
    { text: 'Uraian rumusan masalah penelitian.', br: false },
    { text: 'BAB II TINJAUAN PUSTAKA', br: true },
    { text: '2.1 Landasan Teori', br: false },
    { text: 'Pembahasan teori utama.', br: false },
    { text: '2.3 Penelitian Terdahulu', br: false },
    { text: 'Contoh sub-bab lompat dari 2.1 ke 2.3 untuk menguji koreksi otomatis.', br: false },
    { text: 'BAB III METODE PENELITIAN', br: true },
    { text: '3.1 Jenis dan Pendekatan Penelitian', br: false },
    { text: 'Uraian metode penelitian.', br: false },
    { text: 'BAB IV HASIL PENELITIAN DAN PEMBAHASAN', br: true },
    { text: '4.1 Hasil Penelitian', br: false },
    { text: 'Bagian akhir isi BAB IV yang sebelumnya sering menyatu dengan BAB V jika tanpa Section Break Next Page.', br: false },
    { text: 'BAB V PENUTUP', br: false },
    { text: '5.1 Kesimpulan', br: false },
    { text: 'Bagian akhir isi BAB V yang sebelumnya sering menyatu dengan Daftar Pustaka.', br: false },
    { text: 'DAFTAR PUSTAKA', br: false },
    { text: 'Sugiyono. (2022). Metode Penelitian Kuantitatif, Kualitatif, dan R&D. Bandung: Alfabeta.', br: false },
    { text: 'RIWAYAT HIDUP', br: true }
  ];
  const body = paras.map(p => `<w:p>${p.br ? '<w:r><w:br w:type="page"/></w:r>' : ''}<w:r><w:t>${escapeXml(p.text)}</w:t></w:r></w:p>`).join('');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function createSampleNoTocThesisDocx(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="${TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"></Relationships>`);
  const paras = [
    { text: 'COVER SAMPUL SKRIPSI', br: false },
    { text: 'HALAMAN JUDUL', br: true },
    { text: 'LEMBAR PENGESAHAN', br: true },
    { text: 'ABSTRAK', br: true },
    { text: 'KATA PENGANTAR', br: true },
    // Halaman Daftar Isi yang dibiarkan hanya dengan kata kunci "DAFTAR ISI"
    { text: 'DAFTAR ISI', br: true },
    { text: 'DAFTAR TABEL', br: true },
    // BAB I dengan judul terpisah 2 baris (BAB I di baris 1, PENDAHULUAN di baris 2)
    { text: 'BAB I', br: true },
    { text: 'PENDAHULUAN', br: false },
    { text: 'A. Konteks Penelitian', br: false },
    { text: 'Uraian konteks penelitian skripsi secara lengkap.', br: false },
    { text: 'B. Fokus Penelitian', br: false },
    { text: 'Uraian fokus penelitian atau rumusan masalah.', br: false },
    { text: 'C. Tujuan Penelitian', br: false },
    { text: 'Tujuan dilakukannya penelitian skripsi.', br: false },
    { text: 'D. Manfaat Penelitian', br: false },
    { text: 'BAB II KAJIAN TEORI', br: true },
    { text: 'A. Pendekatan Konseptual', br: false },
    { text: 'Pembahasan pendekatan konseptual dan teori utama.', br: false },
    { text: 'B. Penelitian Terdahulu', br: false },
    { text: 'Ulasan penelitian terdahulu yang relevan.', br: false },
    { text: 'C. Kerangka Berpikir', br: false },
    { text: 'BAB III METODE PENELITIAN', br: true },
    { text: '3.1 Desain dan Jenis Penelitian', br: false },
    { text: '3.2 Populasi dan Sampel', br: false },
    { text: '3.3 Teknik Pengumpulan Data', br: false },
    { text: 'BAB IV HASIL DAN PEMBAHASAN', br: true },
    { text: '4.1 Hasil Penelitian', br: false },
    { text: '4.2 Pembahasan Temuan', br: false },
    { text: 'Paragraf penutup BAB IV.', br: false },
    { text: 'BAB V PENUTUP', br: false },
    { text: '5.1 Kesimpulan', br: false },
    { text: '5.2 Saran', br: false },
    { text: 'DAFTAR PUSTAKA', br: false },
    { text: 'Arikunto, S. (2021). Prosedur Penelitian. Jakarta: Rineka Cipta.', br: false },
    { text: 'LAMPIRAN', br: true }
  ];
  const body = paras.map(p => `<w:p>${p.br ? '<w:r><w:br w:type="page"/></w:r>' : ''}<w:r><w:t>${escapeXml(p.text)}</w:t></w:r></w:p>`).join('');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function createSampleArabicThesisDocx(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="${TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"></Relationships>`);
  const paras = [
    { text: 'غلاف البحث العلمي (بدون رقم الصفحة)', br: false },
    { text: 'صفحة العنوان', br: true },
    { text: 'موافقة المشرف', br: true },
    { text: 'ملخص البحث', br: true },
    { text: 'كلمة الشكر والتقدير', br: true },
    { text: 'فهرس المحتويات', br: true },
    { text: 'الباب الأول : المقدمة', br: true },
    { text: 'أ. خلفية البحث', br: false },
    { text: 'تعتبر اللغة العربية من أهم اللغات العالمية في الدراسات الإسلامية والأكاديمية.', br: false },
    { text: 'ب. أسئلة البحث', br: false },
    { text: 'ج. أهداف البحث', br: false },
    { text: 'د. أهمية البحث', br: false },
    { text: 'الباب الثاني : الإطار النظري والدراسات السابقة', br: true },
    { text: 'المبحث الأول : مفهوم تعليم اللغة العربية', br: false },
    { text: 'المبحث الثاني : الدراسات السابقة', br: false },
    { text: 'الباب الثالث : منهج البحث', br: true },
    { text: 'أ. نوع البحث ومدخله', br: false },
    { text: 'ب. مصادر البيانات وأدوات جمعها', br: false },
    { text: 'الباب الرابع : عرض البيانات وتحليلها', br: true },
    { text: 'أ. عرض نتائج البحث', br: false },
    { text: 'ب. مناقشة النتائج', br: false },
    { text: 'الباب الخامس : الخاتمة', br: false },
    { text: 'أ. النتائج', br: false },
    { text: 'ب. التوصيات والاقتراحات', br: false },
    { text: 'قائمة المراجع', br: false },
    { text: 'ابن خلدون. (٢٠١٨). المقدمة. بيروت: دار الفكر.', br: false },
    { text: 'السيرة الذاتية', br: true }
  ];
  const body = paras
    .map(
      p =>
        `<w:p><w:pPr><w:bidi/></w:pPr>${p.br ? '<w:r><w:br w:type="page"/></w:r>' : ''}<w:r><w:rPr><w:rFonts w:ascii="Traditional Arabic" w:hAnsi="Traditional Arabic" w:cs="Traditional Arabic"/><w:sz w:val="36"/><w:szCs w:val="36"/><w:rtl/></w:rPr><w:t>${escapeXml(p.text)}</w:t></w:r></w:p>`
    )
    .join('');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268"/><w:bidi/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function createSampleProposalDocx(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="${TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="${RELS_NS}"></Relationships>`);
  const paras = [
    { text: 'PROPOSAL PENELITIAN SKRIPSI', br: false, bold: true },
    { text: 'MANAJEMEN STRATEGI PENGUATAN PROGRAM TAHFIDZ QUR’AN', br: false, bold: true },
    { text: 'HALAMAN JUDUL PROPOSAL', br: true, bold: true },
    { text: 'LEMBAR PERSETUJUAN PROPOSAL', br: true, bold: true },
    { text: 'DAFTAR ISI', br: true, bold: true },
    // Mulai dari A. Judul Penelitian = Halaman 1
    { text: 'A. Judul Penelitian', br: true, bold: true },
    { text: 'Manajemen Strategi Penguatan Program Tahfidz Qur’an pada Lembaga Pendidikan Islam.', br: false },
    { text: 'B. Konteks Penelitian', br: false, bold: true },
    { text: 'Uraian konteks penelitian dan fenomena penting di lapangan mengenai tahfidz Qur’an.', br: false },
    { text: 'C. Fokus Penelitian', br: false, bold: true },
    { text: '1. Bagaimana konsep penguatan program tahfidz?\n2. Bagaimana implementasi perencanaan?', br: false },
    { text: 'D. Tujuan Penelitian', br: false, bold: true },
    { text: 'Mengetahui dan menganalisis strategi pelaksanaan program tahfidz.', br: false },
    { text: 'E. Kegunaan Penelitian', br: false, bold: true },
    { text: 'Memberikan sumbangsih teoritis dan praktis bagi pengembangan kurikulum tahfidz.', br: false },
    { text: 'F. Definisi Istilah', br: false, bold: true },
    { text: 'Penjelasan batasan istilah operasional dalam proposal penelitian.', br: false },
    { text: 'G. Kajian Terdahulu', br: false, bold: true },
    { text: 'Telaah penelitian-penelitian terdahulu yang relevan.', br: false },
    { text: 'H. Kajian Teori', br: false, bold: true },
    { text: 'Kajian Manajemen Program Tahfidz Qur’an', br: false, bold: true },
    { text: 'a. Konsep Program Tahfidz Qur’an', br: false },
    { text: 'Konsep dasar dan landasan yuridis serta filosofis program tahfidz.', br: false },
    { text: 'b. Perencanaan dan evaluasi Manajemen Program tahfidz', br: false },
    { text: 'Siklus POAC dalam manajemen tahfidz.', br: false },
    { text: 'Kajian Strategi penguatan perencanaan(Planning)', br: false, bold: true },
    { text: 'a. konsep penguatan perencanaan', br: false },
    { text: 'b. implementasi kebijakan perencanaan program tahfidz', br: false },
    { text: 'kajian Strategi penguatan evaluasi(evaluating)', br: false, bold: true },
    { text: 'a. Manajemen strategi penguatan evaluasi', br: false },
    { text: 'b. teknik evaluasi tahfidz qur’an', br: false },
    { text: 'c. tindak lanjut evaluasi', br: false },
    { text: 'Metode Penelitian', br: false, bold: true },
    { text: 'Pendekatan dan Jenis Penelitian', br: false, bold: true },
    { text: 'Penelitian ini menggunakan pendekatan kualitatif dengan jenis studi kasus.', br: false },
    { text: 'Kehadiran Peneliti', br: false, bold: true },
    { text: 'Lokasi Penelitian', br: false, bold: true },
    { text: 'Sumber Data', br: false, bold: true },
    { text: 'pengumpulan data', br: false, bold: true },
    { text: 'analisis data', br: false, bold: true },
    { text: 'Pengecekan Keabsahan Data', br: false, bold: true },
    { text: 'Tahap-Tahap Penelitian', br: false, bold: true },
    { text: 'I. Sistematika Penulisan', br: false, bold: true },
    { text: 'Uraian sistematika penulisan proposal dari judul hingga daftar pustaka.', br: false },
    { text: 'J. Daftar pustaka', br: false, bold: true },
    { text: 'Moleong, Lexy J. (2021). Metodologi Penelitian Kualitatif. Bandung: Remaja Rosdakarya.', br: false }
  ];
  const body = paras
    .map(
      p =>
        `<w:p>${p.br ? '<w:r><w:br w:type="page"/></w:r>' : ''}<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${p.bold ? '<w:b/>' : ''}<w:sz w:val="24"/></w:rPr><w:t>${escapeXml(p.text)}</w:t></w:r></w:p>`
    )
    .join('');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
