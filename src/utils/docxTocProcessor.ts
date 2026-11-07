const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export type TocProcessMode = 'auto_generate' | 'manual_sync' | 'auto_detect';
export type DocumentNumberingProfile =
  | 'skripsi'
  | 'tesis'
  | 'makalah'
  | 'proposal'
  | 'arab-skripsi'
  | 'arab-tesis'
  | 'arab-makalah'
  | 'arab-proposal'
  | 'arab';

export interface TocWorkflowResult {
  status: 'success';
  has_toc_detected: boolean;
  toc_kind: 'openxml_sdt' | 'manual_toc' | 'keyword_only' | 'none';
  action_taken: 'CHECK_AND_REVISE' | 'GENERATE_NEW_TOC';
  toc_keyword_found?: boolean;
  toc_keyword_text?: string;
  tagged_headings_count?: {
    level1: number;
    level2: number;
    level3: number;
  };
  revision_logs: string[];
  updated_xml_data: string;
  generated_toc_xml: string | null;
  toc_preview_items?: Array<{
    title: string;
    level: 1 | 2 | 3;
    page: string;
  }>;
}

interface BodyHeadingItem {
  paragraph: Element;
  subtitleParagraph?: Element;
  emptyBetweenParagraphs?: Element[];
  paragraphIndex: number;
  level: 1 | 2 | 3;
  chapterNum: number;
  originalPrefix?: string;
  numberPrefix: string; // e.g. "BAB I", "1.1", "1.1.1", "A."
  titleText: string;
  fullText: string;
  estimatedPage: string;
  bookmarkName: string;
}

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

function setVal(el: Element, name: string, value: string): void {
  el.setAttributeNS(W_NS, `w:${name}`, value);
}

export function stripArabicDiacritics(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
}

export function hasArabicScript(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

export function fromHindiNumerals(s: string): string {
  return s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function normalizeArabicKey(s: string): string {
  return stripArabicDiacritics(s)
    .replace(/[\u0622\u0623\u0625\u0671]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(s: string): string {
  return stripArabicDiacritics(s)
    .toUpperCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCoverHeadingOrContent(text: string): boolean {
  const t = normalize(text);
  const arabKey = normalizeArabicKey(text).replace(/^[^\u0600-\u06FFA-Z0-9]+/, '');
  if (/^(?:صفحه\s+الغلاف|الغلاف|صفحه\s+العنوان|شعار|الشعار)\b/.test(arabKey)) {
    return true;
  }
  return /^(?:HALAMAN\s+SAMPUL|HALAMAN\s+JUDUL|SAMPUL\s+LUAR|SAMPUL\s+DALAM|COVER|JUDUL\s+SKRIPSI|SKRIPSI|PROPOSAL\s+SKRIPSI|PROPOSAL\s+PENELITIAN|TESIS|DISERTASI|MAKALAH)\b/i.test(t);
}

export function isProposalDocument(paragraphs: Element[], profile: DocumentNumberingProfile): boolean {
  if (profile === 'proposal' || profile === 'arab-proposal') return true;

  // Cek apakah ada BAB I / CHAPTER
  for (let i = 0; i < Math.min(paragraphs.length, 250); i++) {
    const raw = getParaText(paragraphs[i]);
    const norm = normalize(raw);
    const arabKey = normalizeArabicKey(raw);
    if (/^(?:B\s*A\s*B|CHAPTER)\s+[0-9IVX]+/i.test(norm) || /^(?:الباب|الفصل)\s+/i.test(arabKey)) {
      return false;
    }
  }

  // Cek apakah ada indikator Proposal (A. Judul Penelitian, Konteks Penelitian, Fokus Penelitian, dsb.)
  for (let i = 0; i < Math.min(paragraphs.length, 250); i++) {
    const raw = getParaText(paragraphs[i]);
    const norm = normalize(raw);
    const arabKey = normalizeArabicKey(raw);
    if (
      /^(?:A\s*[:.\-–—\t]\s*)?(?:JUDUL\s+PENELITIAN|JUDUL\s+PROPOSAL|JUDUL\s+SKRIPSI)\b/i.test(norm) ||
      /^(?:A\s*[:.\-–—\t]\s*)?JUDUL\b/i.test(norm) ||
      /^(?:B\s*[:.\-–—\t]\s*)?(?:KONTEKS\s+PENELITIAN|LATAR\s+BELAKANG)\b/i.test(norm) ||
      /^(?:C\s*[:.\-–—\t]\s*)?(?:FOKUS\s+PENELITIAN|RUMUSAN\s+MASALAH)\b/i.test(norm) ||
      /^(?:أ\s*[:.\-–—\t]\s*)?(?:عنوان\s+البحث|خلفية\s+البحث)\b/.test(arabKey)
    ) {
      return true;
    }
  }

  return false;
}

export function getParaText(p: Element): string {
  let result = '';
  function walk(node: Node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      const name = localName(el);
      if (name === 't') result += el.textContent || '';
      else if (name === 'tab') result += '\t';
      else if (name === 'br' || name === 'cr') result += ' ';
      else if (name === 'instrText' || name === 'delText') {
        // Ignore field instructions and deleted text when reading visible heading text
      } else {
        for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]);
      }
    }
  }
  walk(p);
  return result.replace(/\u00a0/g, ' ').trim();
}

function hasBoldFormatting(p: Element): boolean {
  const pPr = child(p, 'pPr');
  if (pPr) {
    const rPr = child(pPr, 'rPr');
    if (rPr && child(rPr, 'b')) {
      const bVal = attr(child(rPr, 'b'), 'val');
      if (!bVal || !/^(0|false|off)$/i.test(bVal)) return true;
    }
    const pStyle = attr(child(pPr, 'pStyle'), 'val');
    if (/^(heading|judul|bab|subbab|title|subtitle)/i.test(pStyle)) return true;
  }
  const runs = Array.from(p.children).filter(x => localName(x) === 'r');
  const textRuns = runs.filter(r => {
    const tNodes = Array.from(r.getElementsByTagNameNS(W_NS, 't'));
    return tNodes.some(t => (t.textContent || '').trim().length > 0);
  });
  if (textRuns.length === 0) return false;
  return textRuns.every(r => {
    const rPr = child(r, 'rPr');
    if (!rPr) return false;
    const b = child(rPr, 'b');
    if (!b) return false;
    const bVal = attr(b, 'val');
    return !bVal || !/^(0|false|off)$/i.test(bVal);
  });
}

function getExistingHeadingLevel(p: Element): 1 | 2 | 3 | null {
  const pPr = child(p, 'pPr');
  if (!pPr) return null;
  const styleVal = attr(child(pPr, 'pStyle'), 'val');
  if (/^(?:heading\s*1|judul\s*1|bab)$/i.test(styleVal)) return 1;
  if (/^(?:heading\s*2|judul\s*2|subbab)$/i.test(styleVal)) return 2;
  if (/^(?:heading\s*3|judul\s*3|subsubbab)$/i.test(styleVal)) return 3;

  const outline = child(pPr, 'outlineLvl');
  if (outline) {
    const v = Number(attr(outline, 'val'));
    if (v === 0) return 1;
    if (v === 1) return 2;
    if (v === 2) return 3;
  }
  return null;
}

function getNumPrInfo(p: Element): { hasNumPr: boolean; ilvl: number; numId: string } {
  const pPr = child(p, 'pPr');
  if (!pPr) return { hasNumPr: false, ilvl: 0, numId: '' };
  const numPr = child(pPr, 'numPr');
  if (!numPr) return { hasNumPr: false, ilvl: 0, numId: '' };
  const ilvlEl = child(numPr, 'ilvl');
  const numIdEl = child(numPr, 'numId');
  const numId = attr(numIdEl, 'val');
  if (!numId || numId === '0') return { hasNumPr: false, ilvl: 0, numId: '' };
  const ilvl = Number(attr(ilvlEl, 'val') || '0');
  return { hasNumPr: true, ilvl: isNaN(ilvl) ? 0 : ilvl, numId };
}

function replaceParagraphVisibleText(p: Element, oldSubstr: string, newSubstr: string): boolean {
  const tNodes = Array.from(p.getElementsByTagNameNS(W_NS, 't'));
  for (const t of tNodes) {
    const val = t.textContent || '';
    if (val.includes(oldSubstr)) {
      t.textContent = val.replace(oldSubstr, newSubstr);
      return true;
    }
  }
  if (tNodes.length > 0) {
    const combined = tNodes.map(x => x.textContent || '').join('');
    if (combined.includes(oldSubstr)) {
      tNodes[0].textContent = combined.replace(oldSubstr, newSubstr);
      for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = '';
      return true;
    }
  }
  return false;
}

function toRomanLower(num: number): string {
  const map: Array<[number, string]> = [
    [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
  ];
  let n = Math.max(1, num);
  let out = '';
  for (const [val, sym] of map) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return out;
}

const ARABIC_ALPHA_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
];

export function toArabicAlpha(num: number): string {
  const idx = Math.max(1, num) - 1;
  if (idx < ARABIC_ALPHA_LETTERS.length) {
    return ARABIC_ALPHA_LETTERS[idx];
  }
  const letter = ARABIC_ALPHA_LETTERS[idx % ARABIC_ALPHA_LETTERS.length];
  const repeat = Math.floor(idx / ARABIC_ALPHA_LETTERS.length) + 1;
  return letter.repeat(repeat);
}

const HINDI_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toHindiNumerals(num: number | string): string {
  return String(num).replace(/\d/g, d => HINDI_DIGITS[Number(d)] || d);
}

export function formatFrontMatterPage(pageNum: number, profile: DocumentNumberingProfile = 'skripsi'): string {
  if (profile === 'arab' || profile.startsWith('arab')) {
    return toArabicAlpha(pageNum);
  }
  return toRomanLower(pageNum);
}

export function formatBodyMatterPage(pageNum: number, profile: DocumentNumberingProfile = 'skripsi'): string {
  if (profile === 'arab' || profile.startsWith('arab')) {
    return toHindiNumerals(pageNum);
  }
  return String(pageNum);
}

function detectOpenXmlToc(docXml: Document): { hasOpenXmlToc: boolean; sdtElement: Element | null } {
  const sdts = Array.from(docXml.getElementsByTagNameNS(W_NS, 'sdt'));
  for (const sdt of sdts) {
    const sdtPr = child(sdt, 'sdtPr');
    if (sdtPr) {
      const docPartObj = child(sdtPr, 'docPartObj');
      if (docPartObj) {
        const gallery = child(docPartObj, 'docPartGallery');
        if (gallery && /toc|table\s*of\s*contents/i.test(attr(gallery, 'val'))) {
          return { hasOpenXmlToc: true, sdtElement: sdt };
        }
      }
    }
    const instrs = Array.from(sdt.getElementsByTagNameNS(W_NS, 'instrText'));
    if (instrs.some(i => /\bTOC\b/i.test(i.textContent || ''))) {
      return { hasOpenXmlToc: true, sdtElement: sdt };
    }
  }

  const allInstr = Array.from(docXml.getElementsByTagNameNS(W_NS, 'instrText'));
  const tocInstr = allInstr.find(i => /\bTOC\b/i.test(i.textContent || ''));
  if (tocInstr) {
    return { hasOpenXmlToc: true, sdtElement: null };
  }
  return { hasOpenXmlToc: false, sdtElement: null };
}

export function isArabicTocHeadingKeyword(raw: string): boolean {
  const clean = normalizeArabicKey(raw).replace(/^[^\u0600-\u06FFA-Z0-9]+|[^\u0600-\u06FFA-Z0-9]+$/g, '');
  return /^(?:صفحه\s+)?(?:فهرس\s+المحتويات|فهرس\s+الموضوعات|قائمه\s+المحتويات|قائمه\s+الموضوعات|الفهرس|فهرس\s+البحث|فهرس\s+الدراسه|فهرس\s+الرساله|فهرس\s+الخطه|محتويات\s+البحث|محتويات\s+الدراسه|محتويات\s+الرساله|المحتويات|ثبت\s+المحتويات|ثبت\s+الموضوعات)$/.test(
    clean
  );
}

function isManualTocLine(p: Element): boolean {
  const t = getParaText(p);
  if (!t) return false;
  const norm = normalize(t);
  const arabKey = normalizeArabicKey(t);
  // Never treat a standalone chapter heading without trailing page number as a manual TOC line
  if (/^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s*[:.\-]?\s*(?:[IVX]+|\d+)\s*$/i.test(norm)) {
    return false;
  }
  if (/^(?:الباب|الفصل|المبحث)\s+(?:الاول|الثاني|الثالث|الرابع|الخامس|السادس|[١-٦]|[1-6])\s*$/.test(arabKey)) {
    return false;
  }
  const hasTrailingPageToken = /(?:^|[\s.\t…])(?:\d{1,4}|[ivxlcdm]{1,6}|[٠-٩]{1,4}|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]{1,2})\s*$/i.test(t);
  const pPr = child(p, 'pPr');
  if (pPr && hasTrailingPageToken && /\t/.test(t)) {
    const tabs = child(pPr, 'tabs');
    if (tabs && Array.from(tabs.children).some(tab => /^(dot|hyphen|underscore)$/i.test(attr(tab, 'leader')))) {
      return true;
    }
  }
  if ((/\.{2,}|…|(?:\.\s*){3,}/.test(t) || /\t/.test(t)) && hasTrailingPageToken) {
    return true;
  }
  if (/^(?:B\s*A\s*B|CHAPTER|\d+\.\d+(?:\.\d+)?|[A-Z]\.\s+|HALAMAN|LEMBAR|KATA\s+PENGANTAR|PRAKATA|ABSTRAK|ABSTRACT|DAFTAR\s+ISI|DAFTAR\s+TABEL|DAFTAR\s+GAMBAR|DAFTAR\s+LAMPIRAN|DAFTAR\s+PUSTAKA|LAMPIRAN)\b.*\s+(?:\d{1,4}|[ivxlcdm]{1,6})\s*$/i.test(norm)) {
    return true;
  }
  if (/^(?:الباب|الفصل|المبحث|المطلب|الفرع|[٠-٩]+\.[٠-٩]+|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي][.\-)\s]+|صفحه|ملخص|مقدمه|فهرس|قائمه|المراجع|المصادر|الخاتمه)\b.*\s+(?:[٠-٩]{1,4}|\d{1,4}|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]{1,2})\s*$/.test(arabKey)) {
    return true;
  }
  return false;
}

/**
 * Finds the paragraph containing the "DAFTAR ISI" or Arabic "فهرس المحتويات" keyword before BAB I.
 * Supports pages where the user only writes "DAFTAR ISI" (or "HALAMAN DAFTAR ISI" / "TABLE OF CONTENTS" / "فهرس المحتويات" / "الفهرس")
 * so the application can insert the generated automatic TOC directly below this keyword.
 */
export function findTocKeywordParagraphIndex(paragraphs: Element[], bab1Index: number): number {
  const limit = bab1Index > 0 ? bab1Index : paragraphs.length;
  for (let i = 0; i < limit; i++) {
    const raw = getParaText(paragraphs[i]);
    if (!raw) continue;
    const t = normalize(raw).replace(/^[^A-Z0-9\u0600-\u06FF]+|[^A-Z0-9\u0600-\u06FF]+$/g, '');
    // Exclude manual TOC lines that end with a page number and dot leaders (e.g. "DAFTAR ISI ....... iv")
    if (isManualTocLine(paragraphs[i])) continue;
    if (
      /^(?:HALAMAN\s+)?(?:DAFTAR\s+ISI|TABLE\s+OF\s+CONTENTS|ISI\s+MAKALAH|ISI\s+PROPOSAL)(?:\s+HALAMAN)?$/.test(t) ||
      isArabicTocHeadingKeyword(raw)
    ) {
      return i;
    }
  }
  return -1;
}

function findManualTocRange(paragraphs: Element[], bab1Index: number): { titleIdx: number; startIdx: number; endIdx: number } | null {
  const limit = bab1Index > 0 ? bab1Index : paragraphs.length;
  const titleIdx = findTocKeywordParagraphIndex(paragraphs, bab1Index);
  if (titleIdx < 0) return null;

  const startIdx = titleIdx + 1;
  let endIdx = titleIdx;
  for (let i = titleIdx + 1; i < limit; i++) {
    const p = paragraphs[i];
    const raw = getParaText(p);
    const t = normalize(raw);
    const arabKey = normalizeArabicKey(raw);
    if (!t) continue;
    // Allow column header "HALAMAN" / "JUDUL HALAMAN" / "الصفحة" / "الموضوع" right under DAFTAR ISI
    if (
      (/^(?:JUDUL\s+)?HALAMAN$/i.test(t) || /^(?:الموضوع\s+)?(?:الصفحه|رقم\s+الصفحه|الموضوع)$/.test(arabKey)) &&
      i <= titleIdx + 3
    ) {
      continue;
    }
    if (
      (/^(DAFTAR TABEL|DAFTAR GAMBAR|DAFTAR LAMPIRAN|DAFTAR BAGAN|DAFTAR SINGKATAN|DAFTAR SIMBOL|KATA PENGANTAR|PRAKATA|ABSTRAK|ABSTRACT|HALAMAN PENGESAHAN|LEMBAR PENGESAHAN|HALAMAN PERSETUJUAN|LEMBAR PERSETUJUAN|SURAT PERNYATAAN|PERNYATAAN KEASLIAN)\b/i.test(t) ||
        /^(قائمه الجداول|فهرس الجداول|قائمه الاشكال|فهرس الاشكال|قائمه الملاحق|فهرس الملاحق|ملخص البحث|الملخص|مستخلص البحث|كلمه الشكر|تقدير وشكر|صفحه الموافقه|موافقه المشرف|صفحه الاعتماد|اقرار الطالب)\b/.test(arabKey)) &&
      !isManualTocLine(p)
    ) {
      break;
    }
    if (
      isManualTocLine(p) ||
      /^(BAB\s+[IVX0-9]+|\d+\.\d+|[A-Z]\.\s+)/i.test(t) ||
      /^(?:الباب|الفصل|المبحث|[٠-٩]+\.[٠-٩]+|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]\.\s+)/.test(arabKey)
    ) {
      endIdx = i;
    } else if (endIdx > titleIdx && i - endIdx > 4) {
      break;
    } else if (endIdx === titleIdx && i - titleIdx > 3) {
      break;
    }
  }

  if (endIdx <= titleIdx) return null;
  return { titleIdx, startIdx, endIdx };
}

/**
 * Applies full Word "Add Text" (Level 1 / Level 2 / Level 3) & Heading 1-3 metadata to a paragraph,
 * while preserving the paragraph's existing visual alignment, numbering (<w:numPr>), and black bold text
 * so it is 100% recognized by Microsoft Word's Automatic Table of Contents & Navigation Pane.
 * For Arabic profile or Arabic headings, enforces Traditional Arabic font at size 18pt (36 half-points).
 */
function applyHeadingTag(
  p: Element,
  level: 1 | 2 | 3,
  options: { preserveCenter?: boolean; bookmarkId?: number; bookmarkName?: string; isArabic?: boolean } = {}
): void {
  const doc = p.ownerDocument!;
  let pPr = child(p, 'pPr');
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }

  // Set <w:outlineLvl w:val="0|1|2"/> (Word's References -> Add Text -> Level 1/2/3)
  // This informs Word's native TOC engine without touching the heading's font, size, or style!
  let outlineLvl = child(pPr, 'outlineLvl');
  if (!outlineLvl) {
    outlineLvl = doc.createElementNS(W_NS, 'w:outlineLvl');
    pPr.appendChild(outlineLvl);
  }
  setVal(outlineLvl, 'val', String(level - 1));

  // Attach _Toc bookmark so Word's PAGEREF and hyperlinks work natively
  if (options.bookmarkName && options.bookmarkId !== undefined) {
    // Remove any old _Toc bookmark with the same name
    for (const bm of Array.from(p.getElementsByTagNameNS(W_NS, 'bookmarkStart'))) {
      if (attr(bm, 'name') === options.bookmarkName && bm.parentNode) {
        bm.parentNode.removeChild(bm);
      }
    }
    const bmStart = doc.createElementNS(W_NS, 'w:bookmarkStart');
    setVal(bmStart, 'id', String(options.bookmarkId));
    setVal(bmStart, 'name', options.bookmarkName);

    const bmEnd = doc.createElementNS(W_NS, 'w:bookmarkEnd');
    setVal(bmEnd, 'id', String(options.bookmarkId));

    const afterPPr = pPr.nextSibling;
    p.insertBefore(bmStart, afterPPr);
    p.appendChild(bmEnd);
  }
}

/**
 * Merges a two-line chapter heading (e.g. Paragraph 1: "BAB I", Paragraph 2: "PENDAHULUAN")
 * into a single paragraph separated by <w:br/> (Shift+Enter soft line break).
 * Visually in Word it remains two centered lines ("BAB I" on line 1, "PENDAHULUAN" on line 2),
 * while Word's "Add Text (Level 1)" and Automatic TOC read the complete heading "BAB I PENDAHULUAN"!
 */
function mergeSubtitleIntoBabParagraph(
  babP: Element,
  subP: Element,
  emptyBetween: Element[] = []
): void {
  if (!babP.ownerDocument || !subP.parentNode) return;
  const doc = babP.ownerDocument;

  // Remove any section break from subP and babP so the chapter doesn't prematurely break into a new section
  const subPPr = child(subP, 'pPr');
  if (subPPr) {
    const subSect = child(subPPr, 'sectPr');
    if (subSect) subPPr.removeChild(subSect);
    const pbb = child(subPPr, 'pageBreakBefore');
    if (pbb) subPPr.removeChild(pbb);
  }
  const babPPr = child(babP, 'pPr');
  if (babPPr) {
    const babSect = child(babPPr, 'sectPr');
    if (babSect) babPPr.removeChild(babSect);
    const pbb = child(babPPr, 'pageBreakBefore');
    if (pbb) babPPr.removeChild(pbb);
  }
  // Remove hard page breaks inside subP
  for (const br of Array.from(subP.getElementsByTagNameNS(W_NS, 'br'))) {
    if (/^page$/i.test(attr(br, 'type')) && br.parentNode) {
      br.parentNode.removeChild(br);
    }
  }

  // Insert a soft line break run <w:r><w:br/></w:r> so "BAB I" and "PENDAHULUAN" stay on 2 visual lines
  const brRun = doc.createElementNS(W_NS, 'w:r');
  brRun.appendChild(doc.createElementNS(W_NS, 'w:br'));
  babP.appendChild(brRun);

  // Move all non-pPr children (runs, hyperlinks, etc.) from subP into babP
  for (const ch of Array.from(subP.childNodes)) {
    if (ch.nodeType === 1 && localName(ch as Element) === 'pPr') continue;
    babP.appendChild(ch);
  }

  // Remove any empty spacer paragraphs that were between babP and subP, and remove subP
  for (const emp of emptyBetween) {
    if (emp.parentNode) emp.parentNode.removeChild(emp);
  }
  if (subP.parentNode) {
    subP.parentNode.removeChild(subP);
  }
}

function stripLeadingLeaderAndPage(rawLine: string): { cleanEntry: string; trailingPage: string } {
  const m = rawLine.match(/^(.*?)(?:[\s.\t…]+)((?:\d{1,4}|[ivxlcdm]{1,6}|[٠-٩]{1,4}|[أبجدھوزحطيكلمنسعفصقرشتثخذضظغـ]{1,3}))\s*$/i);
  if (!m) return { cleanEntry: rawLine.replace(/[.\t…]+$/g, '').trim(), trailingPage: '' };
  return {
    cleanEntry: m[1].replace(/[.\t…]+$/g, '').trim(),
    trailingPage: m[2].trim()
  };
}

function updateTrailingPageInParagraph(p: Element, oldPage: string, newPage: string): boolean {
  if (!oldPage || oldPage === newPage) return false;
  const tNodes = Array.from(p.getElementsByTagNameNS(W_NS, 't'));
  for (let i = tNodes.length - 1; i >= 0; i--) {
    const txt = tNodes[i].textContent || '';
    const re = new RegExp(`(${oldPage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*$`);
    if (re.test(txt)) {
      tNodes[i].textContent = txt.replace(re, newPage);
      return true;
    }
  }
  return false;
}

function createManualTocParagraph(
  doc: Document,
  label: string,
  pageStr: string,
  level: 1 | 2 | 3,
  isArabic: boolean
): Element {
  const p = doc.createElementNS(W_NS, 'w:p');
  const pPr = doc.createElementNS(W_NS, 'w:pPr');
  const pStyle = doc.createElementNS(W_NS, 'w:pStyle');
  setVal(pStyle, 'val', `TOC${level}`);
  pPr.appendChild(pStyle);

  const tabs = doc.createElementNS(W_NS, 'w:tabs');
  const tab = doc.createElementNS(W_NS, 'w:tab');
  setVal(tab, 'val', 'right');
  setVal(tab, 'leader', 'dot');
  setVal(tab, 'pos', '7654'); // 13.5 cm
  tabs.appendChild(tab);
  pPr.appendChild(tabs);

  if (level > 1) {
    const ind = doc.createElementNS(W_NS, 'w:ind');
    setVal(ind, 'left', String((level - 1) * 240));
    pPr.appendChild(ind);
  }
  p.appendChild(pPr);

  const fontName = isArabic ? 'Traditional Arabic' : 'Times New Roman';
  const fontSizeVal = isArabic ? '36' : '24';
  const isBold = level === 1;

  const makeRunPr = (bold: boolean) => {
    const rPr = doc.createElementNS(W_NS, 'w:rPr');
    const rFonts = doc.createElementNS(W_NS, 'w:rFonts');
    setVal(rFonts, 'ascii', fontName);
    setVal(rFonts, 'hAnsi', fontName);
    setVal(rFonts, 'cs', fontName);
    rPr.appendChild(rFonts);
    if (bold) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:b'));
      if (isArabic) rPr.appendChild(doc.createElementNS(W_NS, 'w:bCs'));
    }
    const sz = doc.createElementNS(W_NS, 'w:sz');
    setVal(sz, 'val', fontSizeVal);
    rPr.appendChild(sz);
    if (isArabic) rPr.appendChild(doc.createElementNS(W_NS, 'w:rtl'));
    return rPr;
  };

  const rTitle = doc.createElementNS(W_NS, 'w:r');
  rTitle.appendChild(makeRunPr(isBold));
  const tTitle = doc.createElementNS(W_NS, 'w:t');
  tTitle.textContent = label;
  rTitle.appendChild(tTitle);
  p.appendChild(rTitle);

  const rTab = doc.createElementNS(W_NS, 'w:r');
  rTab.appendChild(makeRunPr(false));
  rTab.appendChild(doc.createElementNS(W_NS, 'w:tab'));
  p.appendChild(rTab);

  const rPage = doc.createElementNS(W_NS, 'w:r');
  rPage.appendChild(makeRunPr(isBold));
  const tPage = doc.createElementNS(W_NS, 'w:t');
  tPage.textContent = pageStr;
  rPage.appendChild(tPage);
  p.appendChild(rPage);

  return p;
}

function applyOrUpdatePageInManualTocParagraph(
  p: Element,
  fullHeadingLabel: string,
  oldPage: string,
  newPage: string,
  isArabic: boolean
): boolean {
  if (!newPage) return false;
  const doc = p.ownerDocument!;
  let pPr = child(p, 'pPr');
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }

  // Format tab stop leader dots tepat sampai 13.5 cm (7654 dxa)
  let tabs = child(pPr, 'tabs');
  if (!tabs) {
    tabs = doc.createElementNS(W_NS, 'w:tabs');
    pPr.appendChild(tabs);
  }
  for (const t of Array.from(tabs.children)) {
    if (attr(t, 'val') === 'right') {
      tabs.removeChild(t);
    }
  }
  const tab = doc.createElementNS(W_NS, 'w:tab');
  setVal(tab, 'val', 'right');
  setVal(tab, 'leader', 'dot');
  setVal(tab, 'pos', '7654'); // 13.5 cm
  tabs.appendChild(tab);

  const fontName = isArabic ? 'Traditional Arabic' : 'Times New Roman';
  const fontSizeVal = isArabic ? '36' : '24';

  const makeRunPr = (isBold = false) => {
    const rPr = doc.createElementNS(W_NS, 'w:rPr');
    const rFonts = doc.createElementNS(W_NS, 'w:rFonts');
    setVal(rFonts, 'ascii', fontName);
    setVal(rFonts, 'hAnsi', fontName);
    setVal(rFonts, 'cs', fontName);
    rPr.appendChild(rFonts);
    if (isBold) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:b'));
      if (isArabic) rPr.appendChild(doc.createElementNS(W_NS, 'w:bCs'));
    }
    const sz = doc.createElementNS(W_NS, 'w:sz');
    setVal(sz, 'val', fontSizeVal);
    rPr.appendChild(sz);
    if (isArabic) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:rtl'));
    }
    return rPr;
  };

  const rawText = getParaText(p);
  const currentTitlePart = rawText
    .replace(/(?:[\s.\t…]+)((?:\d{1,4}|[ivxlcdm]{1,6}|[٠-٩]{1,4}|[أبجدھوزحطيكلمنسعفصقرشتثخذضظغـ]{1,3}))\s*$/i, '')
    .replace(/[.\t…]+$/g, '')
    .trim();

  // If the manual entry is missing its description (e.g. only "A.", "B.", "1.1", or lacks the words from fullHeadingLabel)
  const isBarePrefix =
    !currentTitlePart ||
    currentTitlePart.replace(/^[A-Z0-9٠-٩.\-):–—\s]+/, '').trim().length === 0 ||
    (fullHeadingLabel.length > currentTitlePart.length + 3 && !currentTitlePart.toLowerCase().includes(fullHeadingLabel.slice(0, 8).toLowerCase()));

  if (isBarePrefix && fullHeadingLabel) {
    // Reconstruct paragraph cleanly with full title + dot leader tab + new page
    const childrenToRemove = Array.from(p.childNodes).filter(
      ch => !(ch.nodeType === 1 && localName(ch as Element) === 'pPr')
    );
    for (const ch of childrenToRemove) {
      p.removeChild(ch);
    }

    const isBold = /^(?:B\s*A\s*B|CHAPTER|الباب|الفصل)/i.test(fullHeadingLabel);

    const rTitle = doc.createElementNS(W_NS, 'w:r');
    rTitle.appendChild(makeRunPr(isBold));
    const tTitle = doc.createElementNS(W_NS, 'w:t');
    tTitle.textContent = fullHeadingLabel;
    rTitle.appendChild(tTitle);
    p.appendChild(rTitle);

    const rTab = doc.createElementNS(W_NS, 'w:r');
    rTab.appendChild(makeRunPr(false));
    rTab.appendChild(doc.createElementNS(W_NS, 'w:tab'));
    p.appendChild(rTab);

    const rPage = doc.createElementNS(W_NS, 'w:r');
    rPage.appendChild(makeRunPr(isBold));
    const tPage = doc.createElementNS(W_NS, 'w:t');
    tPage.textContent = newPage;
    rPage.appendChild(tPage);
    p.appendChild(rPage);

    return true;
  }

  if (oldPage) {
    // Auto-koreksi nomor halaman lama jika berbeda
    if (oldPage !== newPage) {
      return updateTrailingPageInParagraph(p, oldPage, newPage);
    }
    return false;
  }

  // Bila daftar isi manual belum memiliki nomor sama sekali:
  // 1. Bersihkan titik-titik literal manual jika pengguna mengetik titik-titik manual
  const tNodes = Array.from(p.getElementsByTagNameNS(W_NS, 't'));
  for (let i = tNodes.length - 1; i >= 0; i--) {
    const orig = tNodes[i].textContent || '';
    const trimmed = orig.replace(/[.\s…\t]+$/g, '');
    if (trimmed !== orig) {
      tNodes[i].textContent = trimmed;
    }
    if (trimmed.length > 0) break;
  }

  // 2. Tambahkan tab jika belum ada
  const hasTab = Array.from(p.getElementsByTagNameNS(W_NS, 'tab')).length > 0;
  if (!hasTab) {
    const rTab = doc.createElementNS(W_NS, 'w:r');
    rTab.appendChild(makeRunPr(false));
    rTab.appendChild(doc.createElementNS(W_NS, 'w:tab'));
    p.appendChild(rTab);
  }

  // 3. Tambahkan nomor halaman
  const rPage = doc.createElementNS(W_NS, 'w:r');
  const isBold = /^(?:B\s*A\s*B|CHAPTER|الباب|الفصل)/i.test(fullHeadingLabel);
  rPage.appendChild(makeRunPr(isBold));
  const tPage = doc.createElementNS(W_NS, 'w:t');
  tPage.textContent = newPage;
  rPage.appendChild(tPage);
  p.appendChild(rPage);
  return true;
}

function buildOpenXmlTocSdt(
  doc: Document,
  entries: BodyHeadingItem[],
  frontEntries: Array<{ title: string; page: string; bookmarkName: string }>,
  options: { includeTitleHeading: boolean; isArabic?: boolean; numberingProfile?: DocumentNumberingProfile }
): Element {
  const useArabicStyle = !!options.isArabic || options.numberingProfile === 'arab';
  const fontName = useArabicStyle ? 'Traditional Arabic' : 'Times New Roman';
  const fontSizeVal = useArabicStyle ? '36' : '24'; // 18pt (36 half-points) for Arabic, 12pt (24) for Latin

  const sdt = doc.createElementNS(W_NS, 'w:sdt');
  const sdtPr = doc.createElementNS(W_NS, 'w:sdtPr');
  const docPartObj = doc.createElementNS(W_NS, 'w:docPartObj');
  const gallery = doc.createElementNS(W_NS, 'w:docPartGallery');
  setVal(gallery, 'val', 'Table of Contents');
  const unique = doc.createElementNS(W_NS, 'w:docPartUnique');
  docPartObj.appendChild(gallery);
  docPartObj.appendChild(unique);
  sdtPr.appendChild(docPartObj);
  sdt.appendChild(sdtPr);

  const sdtContent = doc.createElementNS(W_NS, 'w:sdtContent');

  if (options.includeTitleHeading) {
    // Heading paragraph: DAFTAR ISI or فهرس المحتويات (only when the document did not already have a TOC keyword paragraph)
    const titleP = doc.createElementNS(W_NS, 'w:p');
    const titlePPr = doc.createElementNS(W_NS, 'w:pPr');
    if (useArabicStyle) {
      titlePPr.appendChild(doc.createElementNS(W_NS, 'w:bidi'));
    }
    const titleJc = doc.createElementNS(W_NS, 'w:jc');
    setVal(titleJc, 'val', 'center');
    const titleSpacing = doc.createElementNS(W_NS, 'w:spacing');
    setVal(titleSpacing, 'after', '240');
    titlePPr.appendChild(titleSpacing);
    titlePPr.appendChild(titleJc);
    titleP.appendChild(titlePPr);
    const titleR = doc.createElementNS(W_NS, 'w:r');
    const titleRPr = doc.createElementNS(W_NS, 'w:rPr');
    const titleFonts = doc.createElementNS(W_NS, 'w:rFonts');
    setVal(titleFonts, 'ascii', fontName);
    setVal(titleFonts, 'hAnsi', fontName);
    setVal(titleFonts, 'cs', fontName);
    setVal(titleFonts, 'eastAsia', fontName);
    titleRPr.appendChild(titleFonts);
    titleRPr.appendChild(doc.createElementNS(W_NS, 'w:b'));
    if (useArabicStyle) {
      titleRPr.appendChild(doc.createElementNS(W_NS, 'w:bCs'));
    }
    const titleSz = doc.createElementNS(W_NS, 'w:sz');
    setVal(titleSz, 'val', fontSizeVal);
    const titleSzCs = doc.createElementNS(W_NS, 'w:szCs');
    setVal(titleSzCs, 'val', fontSizeVal);
    titleRPr.appendChild(titleSz);
    titleRPr.appendChild(titleSzCs);
    if (useArabicStyle) {
      titleRPr.appendChild(doc.createElementNS(W_NS, 'w:rtl'));
      const lang = doc.createElementNS(W_NS, 'w:lang');
      setVal(lang, 'val', 'ar-SA');
      setVal(lang, 'bidi', 'ar-SA');
      titleRPr.appendChild(lang);
    }
    titleR.appendChild(titleRPr);
    const titleT = doc.createElementNS(W_NS, 'w:t');
    titleT.textContent = useArabicStyle ? 'فهرس المحتويات' : 'DAFTAR ISI';
    titleR.appendChild(titleT);
    titleP.appendChild(titleR);
    sdtContent.appendChild(titleP);
  }

  const addTocRow = (
    label: string,
    pageStr: string,
    level: 1 | 2 | 3,
    bookmarkName: string,
    includeBeginField = false
  ) => {
    const isRowArabic = useArabicStyle || hasArabicScript(label);
    const rowFont = isRowArabic ? 'Traditional Arabic' : fontName;
    const rowSz = isRowArabic ? '36' : fontSizeVal;

    const p = doc.createElementNS(W_NS, 'w:p');
    const pPr = doc.createElementNS(W_NS, 'w:pPr');
    const pStyle = doc.createElementNS(W_NS, 'w:pStyle');
    setVal(pStyle, 'val', `TOC${level}`);
    pPr.appendChild(pStyle);

    const tabs = doc.createElementNS(W_NS, 'w:tabs');
    const tab = doc.createElementNS(W_NS, 'w:tab');
    setVal(tab, 'val', 'right');
    setVal(tab, 'leader', 'dot');
    setVal(tab, 'pos', '7654'); // Tepat 13.5 cm (13.5 * 566.929 = 7654 dxa)
    tabs.appendChild(tab);
    pPr.appendChild(tabs);

    if (isRowArabic) {
      pPr.appendChild(doc.createElementNS(W_NS, 'w:bidi'));
    }

    const spacing = doc.createElementNS(W_NS, 'w:spacing');
    setVal(spacing, 'before', level === 1 ? '120' : '40');
    setVal(spacing, 'after', '60');
    setVal(spacing, 'line', '276');
    setVal(spacing, 'lineRule', 'auto');
    pPr.appendChild(spacing);

    // Indentation based on level (Level 1: 0, Level 2: 240 dxa, Level 3: 480 dxa)
    if (level > 1) {
      const ind = doc.createElementNS(W_NS, 'w:ind');
      setVal(ind, 'left', String((level - 1) * 240));
      pPr.appendChild(ind);
    }

    p.appendChild(pPr);

    if (includeBeginField) {
      const rBegin = doc.createElementNS(W_NS, 'w:r');
      const fldBegin = doc.createElementNS(W_NS, 'w:fldChar');
      setVal(fldBegin, 'fldCharType', 'begin');
      rBegin.appendChild(fldBegin);
      p.appendChild(rBegin);

      const rInstr = doc.createElementNS(W_NS, 'w:r');
      const instr = doc.createElementNS(W_NS, 'w:instrText');
      instr.setAttribute('xml:space', 'preserve');
      instr.textContent = ' TOC \\o "1-3" \\h \\z \\u ';
      rInstr.appendChild(instr);
      p.appendChild(rInstr);

      const rSep = doc.createElementNS(W_NS, 'w:r');
      const fldSep = doc.createElementNS(W_NS, 'w:fldChar');
      setVal(fldSep, 'fldCharType', 'separate');
      rSep.appendChild(fldSep);
      p.appendChild(rSep);
    }

    const makeRunProps = (bold: boolean) => {
      const rPr = doc.createElementNS(W_NS, 'w:rPr');
      const rFonts = doc.createElementNS(W_NS, 'w:rFonts');
      setVal(rFonts, 'ascii', rowFont);
      setVal(rFonts, 'hAnsi', rowFont);
      setVal(rFonts, 'cs', rowFont);
      setVal(rFonts, 'eastAsia', rowFont);
      rPr.appendChild(rFonts);
      if (bold) {
        rPr.appendChild(doc.createElementNS(W_NS, 'w:b'));
        if (isRowArabic) rPr.appendChild(doc.createElementNS(W_NS, 'w:bCs'));
      }
      const sz = doc.createElementNS(W_NS, 'w:sz');
      setVal(sz, 'val', rowSz);
      const szCs = doc.createElementNS(W_NS, 'w:szCs');
      setVal(szCs, 'val', rowSz);
      rPr.appendChild(sz);
      rPr.appendChild(szCs);
      if (isRowArabic) {
        rPr.appendChild(doc.createElementNS(W_NS, 'w:rtl'));
        const lang = doc.createElementNS(W_NS, 'w:lang');
        setVal(lang, 'val', 'ar-SA');
        setVal(lang, 'bidi', 'ar-SA');
        rPr.appendChild(lang);
      }
      return rPr;
    };

    const isBoldRow = level === 1;

    // Internal hyperlink to bookmark so Ctrl+Click and Word Update Page Numbers work natively
    const hyperlink = doc.createElementNS(W_NS, 'w:hyperlink');
    setVal(hyperlink, 'anchor', bookmarkName);
    setVal(hyperlink, 'history', '1');

    const rText = doc.createElementNS(W_NS, 'w:r');
    rText.appendChild(makeRunProps(isBoldRow));
    const tLabel = doc.createElementNS(W_NS, 'w:t');
    tLabel.textContent = label.replace(/\s+/g, ' ').trim();
    rText.appendChild(tLabel);
    hyperlink.appendChild(rText);

    const rTab = doc.createElementNS(W_NS, 'w:r');
    rTab.appendChild(makeRunProps(false));
    rTab.appendChild(doc.createElementNS(W_NS, 'w:tab'));
    hyperlink.appendChild(rTab);

    // PAGEREF field inside hyperlink for native Word page number synchronization
    const rPgBegin = doc.createElementNS(W_NS, 'w:r');
    rPgBegin.appendChild(makeRunProps(isBoldRow));
    const fldPgBegin = doc.createElementNS(W_NS, 'w:fldChar');
    setVal(fldPgBegin, 'fldCharType', 'begin');
    rPgBegin.appendChild(fldPgBegin);
    hyperlink.appendChild(rPgBegin);

    const rPgInstr = doc.createElementNS(W_NS, 'w:r');
    rPgInstr.appendChild(makeRunProps(isBoldRow));
    const pgInstr = doc.createElementNS(W_NS, 'w:instrText');
    pgInstr.setAttribute('xml:space', 'preserve');
    pgInstr.textContent = ` PAGEREF ${bookmarkName} \\h `;
    rPgInstr.appendChild(pgInstr);
    hyperlink.appendChild(rPgInstr);

    const rPgSep = doc.createElementNS(W_NS, 'w:r');
    rPgSep.appendChild(makeRunProps(isBoldRow));
    const fldPgSep = doc.createElementNS(W_NS, 'w:fldChar');
    setVal(fldPgSep, 'fldCharType', 'separate');
    rPgSep.appendChild(fldPgSep);
    hyperlink.appendChild(rPgSep);

    const rPage = doc.createElementNS(W_NS, 'w:r');
    rPage.appendChild(makeRunProps(isBoldRow));
    const tPage = doc.createElementNS(W_NS, 'w:t');
    tPage.textContent = pageStr;
    rPage.appendChild(tPage);
    hyperlink.appendChild(rPage);

    const rPgEnd = doc.createElementNS(W_NS, 'w:r');
    rPgEnd.appendChild(makeRunProps(isBoldRow));
    const fldPgEnd = doc.createElementNS(W_NS, 'w:fldChar');
    setVal(fldPgEnd, 'fldCharType', 'end');
    rPgEnd.appendChild(fldPgEnd);
    hyperlink.appendChild(rPgEnd);

    p.appendChild(hyperlink);
    sdtContent.appendChild(p);
  };

  let firstRow = true;
  for (const f of frontEntries) {
    addTocRow(f.title, f.page, 1, f.bookmarkName, firstRow);
    firstRow = false;
  }
  for (const item of entries) {
    addTocRow(item.fullText, item.estimatedPage, item.level, item.bookmarkName, firstRow);
    firstRow = false;
  }

  // Fallback if document had no headings at all
  if (firstRow) {
    addTocRow(
      useArabicStyle ? 'الباب الأول : المقدمة' : 'BAB I PENDAHULUAN',
      options.numberingProfile === 'arab' ? '١' : '1',
      1,
      '_TocBab1',
      true
    );
  }

  // End field character for outer TOC field
  const endP = doc.createElementNS(W_NS, 'w:p');
  const rEnd = doc.createElementNS(W_NS, 'w:r');
  const fldEnd = doc.createElementNS(W_NS, 'w:fldChar');
  setVal(fldEnd, 'fldCharType', 'end');
  rEnd.appendChild(fldEnd);
  endP.appendChild(rEnd);
  sdtContent.appendChild(endP);

  sdt.appendChild(sdtContent);
  return sdt;
}

const EXCLUDED_DECIMAL_UNITS = /^(?:persen|orang|responden|siswa|mahasiswa|sampel|gram|kg|cm|mm|meter|km|liter|ml|tahun|bulan|minggu|hari|jam|menit|detik|kali|buah|butir|lembar|halaman|poin|skor|nilai|rupiah|juta|miliar|triliun|%|في\s+المئه|بالمئه|طالب|طالبه|تلميذ|مستجيب|عينه|سنه|سنوات|شهر|يوم|ساعه|دقيقه|صفحه|درجه)\b/i;

const ARABIC_CHAPTER_DEFAULT_NAMES = [
  '',
  'الباب الأول',
  'الباب الثاني',
  'الباب الثالث',
  'الباب الرابع',
  'الباب الخامس',
  'الباب السادس'
];

/**
 * Runs the TOC detection, hierarchy numbering check/repair, and TOC sync/generation workflow.
 * - Supports all 5 models: Skripsi, Tesis, Makalah, Proposal, and Penomoran Bahasa Arab.
 * - Supports placing the generated Automatic TOC directly below the "DAFTAR ISI" or "فهرس المحتويات" keyword paragraph.
 * - Supports full "Add Text" (Level 1, Level 2, Level 3) tagging across Front Matter, BAB I-VI / الباب الأول-السادس
 *   (including 2-line BAB titles & Proposal sections), Sub-Bab (1.1, ١.١, A., أ., أولاً, المبحث), Sub-Sub-Bab (1.1.1, ١.١.١, 1., ١., المطلب),
 *   and Back Matter (Daftar Pustaka / المراجع, Lampiran / الملاحق, Riwayat Hidup / السيرة الذاتية).
 */
export function processDocumentTocWorkflow(
  docXml: Document,
  paragraphs: Element[],
  babIndexes: Record<number, number>,
  frontStartIdx: number,
  backStartIdx: number,
  applyHeadingTagsWhenNoToc: boolean = true,
  tocMode: TocProcessMode = 'auto_generate',
  numberingProfile: DocumentNumberingProfile = 'skripsi'
): TocWorkflowResult {
  const revisionLogs: string[] = [];
  let bab1Idx = babIndexes[1] ?? -1;

  const { hasOpenXmlToc, sdtElement } = detectOpenXmlToc(docXml);
  const tocKeywordIdx = findTocKeywordParagraphIndex(paragraphs, bab1Idx);
  const manualRange = findManualTocRange(paragraphs, bab1Idx);

  // Detect whether this document uses Arabic script in its TOC or chapter headings
  // (works even when the user selects 'proposal', 'skripsi', 'tesis', or 'makalah' for an Arabic document!)
  const isArabicDoc =
    numberingProfile === 'arab' ||
    (tocKeywordIdx >= 0 && hasArabicScript(getParaText(paragraphs[tocKeywordIdx]))) ||
    Object.values(babIndexes).some(idx => idx >= 0 && paragraphs[idx] && hasArabicScript(getParaText(paragraphs[idx])));

  const hasTocDetected = hasOpenXmlToc || !!manualRange;
  const tocKind: TocWorkflowResult['toc_kind'] = hasOpenXmlToc
    ? 'openxml_sdt'
    : manualRange
    ? 'manual_toc'
    : tocKeywordIdx >= 0
    ? 'keyword_only'
    : 'none';

  const shouldGenerateAutomaticToc =
    tocMode === 'auto_generate' ||
    !hasTocDetected ||
    tocKind === 'keyword_only';

  const shouldTagAllHeadings = shouldGenerateAutomaticToc || applyHeadingTagsWhenNoToc;

  // Estimate page numbers for front matter and body based on Word rendered page breaks, hard breaks & section density
  const paragraphPageMap = new Map<number, string>();
  let romanCounter = 2; // starts at ii (or ب in Arabic mode) after cover
  let arabicCounter = 1;

  const majorSectionStarts = new Set<number>(
    [...Object.values(babIndexes), backStartIdx].filter(idx => idx > 0)
  );

  let linesOnCurrentPage = 0;
  const MAX_LINES_PER_PAGE = 25; // standard A4 thesis line density (~25 lines per page)

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (i === 0) {
      paragraphPageMap.set(i, '');
      continue;
    }

    // 1. Check rendered page breaks inserted by Microsoft Word during document editing / save
    const renderedBreaks = p.getElementsByTagNameNS(W_NS, 'lastRenderedPageBreak').length;

    // 2. Check explicit hard breaks (page break, pageBreakBefore, or section break on previous paragraph)
    const hasHardBreak =
      Array.from(p.getElementsByTagNameNS(W_NS, 'br')).some(b => /^page$/i.test(attr(b, 'type'))) ||
      !!child(child(p, 'pPr') || p, 'pageBreakBefore') ||
      (i > 0 && !!child(child(paragraphs[i - 1], 'pPr') || paragraphs[i - 1], 'sectPr'));

    const isMajorSection = majorSectionStarts.has(i);

    // 3. Approximate line count of this paragraph based on text length and paragraph spacing
    const text = getParaText(p);
    const paraLines = text.length > 0 ? Math.max(1, Math.ceil(text.length / 80)) : 1;
    let extraLines = 0;
    const pPr = child(p, 'pPr');
    if (pPr) {
      const sp = child(pPr, 'spacing');
      if (sp) {
        const b = Number(attr(sp, 'before')) || 0;
        const a = Number(attr(sp, 'after')) || 0;
        if (b >= 200 || a >= 200) extraLines = 1;
      }
    }
    const totalLinesForPara = paraLines + extraLines;

    let pageAdvanced = 0;
    if (isMajorSection && i !== bab1Idx) {
      pageAdvanced = 1;
      linesOnCurrentPage = totalLinesForPara;
    } else if (renderedBreaks > 0) {
      pageAdvanced = renderedBreaks;
      linesOnCurrentPage = totalLinesForPara;
    } else if (hasHardBreak && i !== bab1Idx) {
      pageAdvanced = 1;
      linesOnCurrentPage = totalLinesForPara;
    } else {
      linesOnCurrentPage += totalLinesForPara;
      if (linesOnCurrentPage > MAX_LINES_PER_PAGE && text.length > 0) {
        const extraPages = Math.floor(linesOnCurrentPage / MAX_LINES_PER_PAGE);
        pageAdvanced = extraPages;
        linesOnCurrentPage = linesOnCurrentPage % MAX_LINES_PER_PAGE;
      }
    }

    if (bab1Idx >= 0 && i >= bab1Idx) {
      if (i === bab1Idx) {
        arabicCounter = 1;
        linesOnCurrentPage = totalLinesForPara;
      } else {
        arabicCounter += pageAdvanced;
      }
      paragraphPageMap.set(i, formatBodyMatterPage(arabicCounter, numberingProfile));
    } else if (frontStartIdx > 0 && i >= frontStartIdx) {
      if (i === frontStartIdx) {
        romanCounter = 2;
        linesOnCurrentPage = totalLinesForPara;
      } else {
        romanCounter += pageAdvanced;
      }
      paragraphPageMap.set(i, formatFrontMatterPage(romanCounter, numberingProfile));
    } else {
      paragraphPageMap.set(i, '');
    }
  }

  let bookmarkCounter = 500;
  let taggedL1 = 0;
  let taggedL2 = 0;
  let taggedL3 = 0;

  // Collect Front Matter headings before BAB I
  const frontEntries: Array<{ title: string; page: string; index: number; bookmarkName: string; paragraph: Element }> = [];
  if (frontStartIdx > 0 && bab1Idx > frontStartIdx) {
    for (let i = frontStartIdx; i < bab1Idx; i++) {
      if (manualRange && i > manualRange.titleIdx && i <= manualRange.endIdx) continue;
      let insideSdt = false;
      let parentNode: Node | null = paragraphs[i].parentNode;
      while (parentNode && parentNode.nodeType === 1) {
        if (localName(parentNode as Element) === 'sdt') {
          insideSdt = true;
          break;
        }
        parentNode = parentNode.parentNode;
      }
      if (insideSdt) continue;

      const rawFront = getParaText(paragraphs[i]).trim();
      if (!rawFront) continue;
      const t = normalize(rawFront).replace(/^[^A-Z0-9\u0600-\u06FF]+|[^A-Z0-9\u0600-\u06FF]+$/g, '');
      const arabKey = normalizeArabicKey(rawFront).replace(/^[^\u0600-\u06FFA-Z0-9]+|[^\u0600-\u06FFA-Z0-9]+$/g, '');
      const isIndoFront = !isCoverHeadingOrContent(rawFront) && /^(LEMBAR\s+PERSETUJUAN|HALAMAN\s+PERSETUJUAN|PERSETUJUAN\s+PEMBIMBING|PERSETUJUAN|NOTA\s+DINAS|LEMBAR\s+PENGESAHAN|HALAMAN\s+PENGESAHAN|PENGESAHAN|LEMBAR\s+PERNYATAAN|HALAMAN\s+PERNYATAAN|SURAT\s+PERNYATAAN|PERNYATAAN\s+KEASLIAN|PERNYATAAN\s+ORISINALITAS|PERNYATAAN|MOTTO|HALAMAN\s+MOTTO|HALAMAN\s+PERSEMBAHAN|PERSEMBAHAN|ABSTRAK|ABSTRACT|RINGKASAN|INTISARI|KATA\s+PENGANTAR|PRAKATA|UCAPAN\s+TERIMA\s+KASIH|PEDOMAN\s+TRANSLITERASI|DAFTAR\s+ISI|TABLE\s+OF\s+CONTENTS|ISI\s+MAKALAH|ISI\s+PROPOSAL|DAFTAR\s+TABEL|DAFTAR\s+GAMBAR|DAFTAR\s+LAMPIRAN|DAFTAR\s+BAGAN|DAFTAR\s+SINGKATAN|DAFTAR\s+SIMBOL)\b/i.test(t);
      const isArabFront =
        !isCoverHeadingOrContent(rawFront) &&
        (isArabicTocHeadingKeyword(rawFront) ||
        /^(صفحه\s+الموافقه|موافقه\s+المشرف|مذكره\s+المشرف|صفحه\s+الاعتماد|اعتماد\s+لجنه\s+المناقشه|اقرار\s+الطالب|اقرار\s+الاصاله|الاهداء|ملخص\s+البحث|الملخص|مستخلص\s+البحث|المستخلص|كلمه\s+الشكر|تقدير\s+وشكر|شكر\s+وتقدير|تمهيد|مقدمه(?:\s+الكاتب)?|فهرس\s+المحتويات|فهرس\s+الموضوعات|قائمه\s+المحتويات|قائمه\s+الموضوعات|الفهرس|المحتويات|قائمه\s+الجداول|فهرس\s+الجداول|قائمه\s+الاشكال|فهرس\s+الاشكال|قائمه\s+الملاحق|فهرس\s+الملاحق|قائمه\s+الرموز|قائمه\s+الاختصارات)\b/.test(
          arabKey
        ));
      if (
        (isIndoFront || isArabFront) &&
        rawFront.length <= 80 &&
        !isManualTocLine(paragraphs[i])
      ) {
        const bmId = ++bookmarkCounter;
        const bmName = `_TocFront_${bmId}`;
        frontEntries.push({
          title: isArabFront || hasArabicScript(rawFront) ? rawFront : rawFront.toUpperCase(),
          page: paragraphPageMap.get(i) || formatFrontMatterPage(2, numberingProfile),
          index: i,
          bookmarkName: bmName,
          paragraph: paragraphs[i]
        });
        if (shouldTagAllHeadings) {
          applyHeadingTag(paragraphs[i], 1, {
            preserveCenter: true,
            bookmarkId: bmId,
            bookmarkName: bmName,
            isArabic: isArabicDoc || isArabFront
          });
          taggedL1++;
        }
      }
    }
  }

  // Scan body from BAB I onwards to detect Level 1, Level 2, Level 3 headings and check numbering hierarchy
  const isProposalMode = isProposalDocument(paragraphs, numberingProfile);
  if (isProposalMode && bab1Idx < 0) {
    for (let idx = 0; idx < paragraphs.length; idx++) {
      let insideSdt = false;
      let parentNode: Node | null = paragraphs[idx].parentNode;
      while (parentNode && parentNode.nodeType === 1) {
        if (localName(parentNode as Element) === 'sdt') {
          insideSdt = true;
          break;
        }
        parentNode = parentNode.parentNode;
      }
      if (insideSdt) continue;

      const t = normalize(getParaText(paragraphs[idx]));
      const arabKey = normalizeArabicKey(getParaText(paragraphs[idx]));
      if (
        /^(?:B\s*A\s*B|CHAPTER)\s*[:.\-–—\t]?\s*(?:I|0?1)\b/i.test(t) ||
        /^(?:[A-Z0-9IVX]+\s*[:.\-–—\t]\s*)*(?:JUDUL\s+PENELITIAN|JUDUL\s+PROPOSAL|JUDUL\s+SKRIPSI|PROPOSAL)\b/i.test(t) ||
        /^(?:[A-Z0-9IVX]+\s*[:.\-–—\t]\s*)+JUDUL\b/i.test(t) ||
        /^(?:[A-Z0-9IVX]+\s*[:.\-–—\t]\s*)*(?:KONTEKS\s+PENELITIAN|LATAR\s+BELAKANG|PENDAHULUAN|FOKUS\s+PENELITIAN|RUMUSAN\s+MASALAH)\b/i.test(t) ||
        /^(?:[أابتثجحخدذرزسشصضطظعغفقكلمنهوي١1]\s*[:.\-–—\t]\s*)*(?:عنوان\s+البحث|خلفية\s+البحث|مقدمة|مشكلة\s+البحث)\b/.test(arabKey)
      ) {
        bab1Idx = idx;
        break;
      }
    }
  }

  const bodyHeadings: BodyHeadingItem[] = [];
  let currentBab = isProposalMode ? 1 : 0;
  let expectedL2 = 0;
  let expectedL3 = 0;
  let currentChapterUsesLetterL2 = false;

  const startScan = bab1Idx >= 0 ? bab1Idx : 0;
  for (let i = startScan; i < paragraphs.length; i++) {
    if (manualRange && i >= manualRange.titleIdx && i <= manualRange.endIdx) continue;
    const p = paragraphs[i];
    const rawText = getParaText(p);
    if (!rawText || rawText.length > 200) continue;
    const norm = normalize(rawText);
    const arabKey = normalizeArabicKey(rawText);

    // PROPOSAL HEADING DETECTOR (Khusus Naskah Proposal Penelitian):
    if (isProposalMode) {
      const rawTrimmed = rawText.trim();

      // Abaikan jika hanya berupa nomor halaman sisa (seperti "iv", "iii", "12")
      if (/^(?:[ivxlcdm]+|\d+)\s*$/i.test(rawTrimmed)) continue;

      const isExplicitLetterL1 =
        /^(?:[A-Z]\s*[:.\-–—\t]\s*)+/.test(rawTrimmed) ||
        /^(?:[أابتثجحخدذرزسشصضطظعغفقكلمنهوي]|هـ)\s*[:.\-–—\t]/.test(rawTrimmed);
      const isNamedProposalL1 = /^(?:BAB\s+[0-9IVX]+|JUDUL\s+PENELITIAN|JUDUL\s+PROPOSAL|JUDUL\s+SKRIPSI|PROPOSAL|KONTEKS\s+PENELITIAN|LATAR\s+BELAKANG(?:\s+MASALAH)?|PENDAHULUAN|FOKUS\s+PENELITIAN|RUMUSAN\s+MASALAH|TUJUAN\s+PENELITIAN|KEGUNAAN\s+PENELITIAN|MANFAAT\s+PENELITIAN|DEFINISI\s+ISTILAH|BATASAN\s+ISTILAH|KAJIAN\s+TERDAHULU|PENELITIAN\s+TERDAHULU|KAJIAN\s+TEORI|LANDASAN\s+TEORI|METODE\s+PENELITIAN|SISTEMATIKA\s+PENULISAN|SISTEMATIKA\s+PEMBAHASAN|DAFTAR\s+PUSTAKA|DAFTAR\s+RUJUKAN)\b/i.test(
        norm.replace(/^(?:[A-Z0-9\u0600-\u06FF]\s*[:.\-–—\t]\s*)+/, '')
      );
      const isNamedArabProposalL1 = /^(?:الباب\s+[١-٦1-6]|عنوان\s+البحث|خلفية\s+البحث|مقدمة|مشكلات\s+البحث|أهداف\s+البحث|فوائد\s+البحث|أهمية\s+البحث|تعريف\s+المصطلحات|الدراسات\s+السابقة|الإطار\s+النظري|منهجية\s+البحث|هيكل\s+البحث|المصادر\s+والمراجع)\b/.test(
        arabKey.replace(/^(?:[A-Z0-9\u0600-\u06FF]\s*[:.\-–—\t]\s*)+/, '')
      );

      // Level 3 Check FIRST: "a. Konsep Program...", "b. Perencanaan...", "1. ..."
      const mPropL3 = rawText.match(/^(?:([a-z])\s*[.):\-–—\t]|([0-9٠-٩]+)\s*[.):\-–—\t])\s*(.+)$/);
      if (
        mPropL3 &&
        mPropL3[3].length <= 130 &&
        !/[.؟!]\s*$/.test(mPropL3[3].trim()) &&
        (expectedL2 > 0 || bodyHeadings.length > 0)
      ) {
        expectedL3++;
        const pfx = (mPropL3[1] || mPropL3[2]) + '.';
        const restTitle = mPropL3[3].replace(/\s+/g, ' ').trim();
        const bmId = ++bookmarkCounter;
        const bmName = `_TocProp3_${i}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 3,
          chapterNum: 1,
          originalPrefix: pfx,
          numberPrefix: pfx,
          titleText: restTitle,
          fullText: `${pfx} ${restTitle}`,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(1, numberingProfile),
          bookmarkName: bmName
        });
        if (shouldTagAllHeadings) {
          applyHeadingTag(p, 3, {
            preserveCenter: false,
            bookmarkId: bmId,
            bookmarkName: bmName,
            isArabic: isArabicDoc
          });
          taggedL3++;
        }
        continue;
      }

      // Level 1 Check: "A. Judul Penelitian", "B. Konteks...", "Metode Penelitian", dsb.
      if (
        (isExplicitLetterL1 || isNamedProposalL1 || isNamedArabProposalL1) &&
        rawText.length <= 120 &&
        !/[.؟!]\s*$/.test(rawTrimmed)
      ) {
        currentBab = 1;
        expectedL2 = 0;
        expectedL3 = 0;
        const bmId = ++bookmarkCounter;
        const bmName = `_TocProp1_${i}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 1,
          chapterNum: 1,
          numberPrefix: isExplicitLetterL1 ? rawTrimmed.split(/[:.\-–—\t]/)[0] + '.' : '',
          titleText: rawTrimmed,
          fullText: rawTrimmed,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(1, numberingProfile),
          bookmarkName: bmName
        });
        if (shouldTagAllHeadings) {
          applyHeadingTag(p, 1, {
            preserveCenter: false,
            bookmarkId: bmId,
            bookmarkName: bmName,
            isArabic: isArabicDoc
          });
          taggedL1++;
        }
        continue;
      }

      // Level 2 Check: Sub-judul proposal (Kajian ..., Pendekatan ..., Kehadiran ..., dsb.)
      const isKnownSubTopic = /^(?:Kajian\s+|Pendekatan\s+dan\s+Jenis|Kehadiran\s+Peneliti|Lokasi\s+Penelitian|Sumber\s+Data|Pengumpulan\s+Data|Analisis\s+Data|Pengecekan\s+Keabsahan|Tahap-Tahap\s+Penelitian|Tahapan\s+Penelitian)/i.test(
        norm
      );
      const isShortHeadingCandidate =
        (hasBoldFormatting(p) || getExistingHeadingLevel(p) !== null || isKnownSubTopic) &&
        rawText.length <= 100 &&
        !/[.؟!]\s*$/.test(rawTrimmed) &&
        !isManualTocLine(p);

      if (isShortHeadingCandidate && bodyHeadings.length > 0) {
        expectedL2++;
        expectedL3 = 0;
        const bmId = ++bookmarkCounter;
        const bmName = `_TocProp2_${i}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 2,
          chapterNum: 1,
          numberPrefix: '',
          titleText: rawTrimmed,
          fullText: rawTrimmed,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(1, numberingProfile),
          bookmarkName: bmName
        });
        if (shouldTagAllHeadings) {
          applyHeadingTag(p, 2, {
            preserveCenter: false,
            bookmarkId: bmId,
            bookmarkName: bmName,
            isArabic: isArabicDoc
          });
          taggedL2++;
        }
        continue;
      }

      continue; // Lewati teks paragraf isi biasa
    }

    // 1. Check Level 1: BAB I..VI or الباب الأول..السادس
    const matchedBab = [1, 2, 3, 4, 5, 6].find(n => babIndexes[n] === i);
    if (matchedBab !== undefined) {
      currentBab = matchedBab;
      expectedL2 = 0;
      expectedL3 = 0;
      currentChapterUsesLetterL2 = false;
      const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][matchedBab];
      const arabOrdKey = ['', 'الاول|١|1', 'الثاني|٢|2', 'الثالث|٣|3', 'الرابع|٤|4', 'الخامس|٥|5', 'السادس|٦|6'][matchedBab];
      const isHeadingArabic = hasArabicScript(rawText);

      // Check if BAB title is split across two lines (e.g. Paragraph i: "BAB I" or "الباب الأول", Paragraph i+1: "PENDAHULUAN" or "المقدمة")
      let fullChapterTitle = rawText.replace(/\s+/g, ' ').trim();
      let subtitleParagraph: Element | undefined;
      const emptyBetweenParagraphs: Element[] = [];

      const isBareIndoBab = new RegExp(
        `^(?:B\\s*A\\s*B|CHAPTER|BAGIAN)\\s*[:.\\-]?\\s*(?:${roman}|0?${matchedBab}|SATU|PERTAMA|DUA|KEDUA|TIGA|KETIGA|EMPAT|KEEMPAT|LIMA|KELIMA|ENAM|KEENAM)\\s*$`,
        'i'
      ).test(norm.replace(/^[^A-Z0-9]+/, ''));

      const isBareArabBab =
        isHeadingArabic &&
        new RegExp(
          `^(?:الباب|الفصل|المبحث)\\s+(?:${arabOrdKey})\\s*[:.\\-–—]?\\s*$`,
          'i'
        ).test(arabKey.replace(/^[^\u0600-\u06FFA-Z0-9]+/, ''));

      const isBareBabLine = isBareIndoBab || isBareArabBab;

      if (isBareBabLine) {
        // Look ahead up to 2 paragraphs (skipping empty paragraphs) for the chapter subtitle
        let lookIdx = i + 1;
        while (lookIdx < paragraphs.length && lookIdx <= i + 3 && emptyBetweenParagraphs.length <= 2) {
          const candP = paragraphs[lookIdx];
          const candText = getParaText(candP).trim();
          if (!candText) {
            emptyBetweenParagraphs.push(candP);
            lookIdx++;
            continue;
          }
          const candNorm = normalize(candText);
          const candArab = normalizeArabicKey(candText);
          const isAnotherBoundary =
            Object.values(babIndexes).includes(lookIdx) ||
            lookIdx === backStartIdx ||
            /^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s*[:.\-]?\s*(?:[IVX]+|\d+)/i.test(candNorm) ||
            /^(?:الباب|الفصل)\s+(?:الاول|الثاني|الثالث|الرابع|الخامس|السادس|[١-٦]|[1-6])\b/.test(candArab) ||
            /^(?:DAFTAR\s+PUSTAKA|KEPUSTAKAAN|BIBLIOGRAFI|BIBLIOGRAPHY|LAMPIRAN|RIWAYAT\s+HIDUP|BIODATA)\b/i.test(candNorm) ||
            /^(?:المراجع|المصادر\s+والمراجع|قائمه\s+المراجع|قائمه\s+المصادر|الملاحق|السيره\s+الذاتيه)\b/.test(candArab);
          const looksLikeSubBab =
            /^(?:\d+\.\d+|[٠-٩]+\.[٠-٩]+|[A-Z]\.\s+|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي][.\-)\s]+|(?:اولا|ثانيا|ثالثا|رابعا|خامسا|سادسا)[:.\-\s]|(?:المبحث|المطلب|الفرع)\s+(?:الاول|الثاني|الثالث))/i.test(
              candArab
            );
          const looksLikeBodyProse =
            /\b(MEMBAHAS|BERISI|MENGURAIKAN|MENJELASKAN|MEMAPARKAN|MENYAJIKAN|MEMUAT|TERDIRI\s+DARI|MERUPAKAN\s+BAB|PADA\s+BAB\s+INI)\b/i.test(candNorm) ||
            /[.؟!]\s*$/.test(candText);
          if (
            candText.length <= 95 &&
            !isAnotherBoundary &&
            !looksLikeSubBab &&
            !looksLikeBodyProse &&
            !isManualTocLine(candP)
          ) {
            if (isHeadingArabic || hasArabicScript(candText)) {
              const cleanBare = rawText.replace(/[:.\-–—\s]+$/, '').trim();
              fullChapterTitle = `${cleanBare} : ${candText.replace(/\s+/g, ' ')}`;
            } else {
              fullChapterTitle = `BAB ${roman} ${candText.replace(/\s+/g, ' ')}`;
            }
            subtitleParagraph = candP;
            i = lookIdx; // advance scan index past the subtitle paragraph
          }
          break;
        }
      }

      const bmId = ++bookmarkCounter;
      const bmName = `_TocBab_${currentBab}_${bmId}`;

      let numberPrefix = `BAB ${roman}`;
      let cleanTitlePart = fullChapterTitle;
      let displayFullText = fullChapterTitle.toUpperCase();

      if (isHeadingArabic || hasArabicScript(fullChapterTitle)) {
        const arabMatch = fullChapterTitle.match(
          /^[^\u0600-\u06FF]*((?:الباب|الفصل|المبحث)\s+\S+)\s*[:.\-–—]?\s*(.*)$/
        );
        if (arabMatch) {
          numberPrefix = stripArabicDiacritics(arabMatch[1]).trim();
          cleanTitlePart = arabMatch[2].trim();
          displayFullText = cleanTitlePart ? `${arabMatch[1].trim()} : ${cleanTitlePart}` : arabMatch[1].trim();
        } else {
          // Semantic Arabic chapter or Proposal heading (e.g. "المقدمة", "أ. خلفية البحث")
          numberPrefix = ARABIC_CHAPTER_DEFAULT_NAMES[matchedBab] || `الباب ${matchedBab}`;
          cleanTitlePart = fullChapterTitle;
          displayFullText = fullChapterTitle;
        }
      } else {
        const indoMatch = fullChapterTitle.match(
          /^(?:B\s*A\s*B|CHAPTER|BAGIAN)\s*[:.\-]?\s*(?:[IVX]+|\d+|SATU|PERTAMA|DUA|KEDUA|TIGA|KETIGA|EMPAT|KEEMPAT|LIMA|KELIMA|ENAM|KEENAM)[\s:.\-]*(.*)$/i
        );
        if (indoMatch) {
          numberPrefix = `BAB ${roman}`;
          cleanTitlePart = indoMatch[1].trim();
          displayFullText = cleanTitlePart ? `BAB ${roman} ${cleanTitlePart.toUpperCase()}` : `BAB ${roman}`;
        } else {
          // Semantic Indonesian heading (e.g. "PENDAHULUAN")
          numberPrefix = `BAB ${roman}`;
          cleanTitlePart = fullChapterTitle;
          displayFullText = fullChapterTitle.toUpperCase();
        }
      }

      bodyHeadings.push({
        paragraph: p,
        subtitleParagraph,
        emptyBetweenParagraphs: subtitleParagraph ? emptyBetweenParagraphs : undefined,
        paragraphIndex: i,
        level: 1,
        chapterNum: currentBab,
        numberPrefix,
        titleText: cleanTitlePart,
        fullText: displayFullText,
        estimatedPage: paragraphPageMap.get(babIndexes[matchedBab]) || formatBodyMatterPage(1, numberingProfile),
        bookmarkName: bmName
      });
      continue;
    }

    // 2. Check Level 1 Back Matter: DAFTAR PUSTAKA, LAMPIRAN, RIWAYAT HIDUP, BIODATA, المراجع, الملاحق, السيرة الذاتية
    const isIndoBack = /^(?:DAFTAR\s+PUSTAKA|KEPUSTAKAAN|BIBLIOGRAFI|BIBLIOGRAPHY|DAFTAR\s+RUJUKAN|DAFTAR\s+BACAAN|DAFTAR\s+LITERATUR|REFERENSI|LAMPIRAN(?:[\s\-:]+[A-Z0-9IVX]+)?|APPENDIX(?:ES)?|RIWAYAT\s+HIDUP(?:\s+PENULIS)?|BIODATA(?:\s+PENULIS)?|CURRICULUM\s+VITAE)\s*$/i.test(
      norm.replace(/^[^A-Z0-9]+/, '')
    );
    const isArabBack = /^(?:المراجع|المصادر\s+والمراجع|قائمه\s+المراجع|قائمه\s+المصادر(?:\s+والمراجع)?|فهرس\s+المصادر(?:\s+والمراجع)?|فهرس\s+المراجع|الملاحق|ملحق(?:\s+[\u0600-\u06FFA-Z0-9]+)?|قائمه\s+الملاحق|السيره\s+الذاتيه|ترجمه\s+الباحث|نبذه\s+عن\s+الباحث)\s*$/.test(
      arabKey.replace(/^[^\u0600-\u06FFA-Z0-9]+/, '')
    );
    if (i === backStartIdx || isIndoBack || isArabBack) {
      if (rawText.length <= 85 && !isManualTocLine(p)) {
        const bmId = ++bookmarkCounter;
        const bmName = `_TocBack_${bmId}`;
        const isBackArab = isArabBack || hasArabicScript(rawText);
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 1,
          chapterNum: 0,
          numberPrefix: isBackArab ? arabKey : norm,
          titleText: rawText.trim(),
          fullText: isBackArab ? rawText.trim() : rawText.trim().toUpperCase(),
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(arabicCounter, numberingProfile),
          bookmarkName: bmName
        });
      }
      continue;
    }

    if (currentBab <= 0 || (backStartIdx > 0 && i >= backStartIdx)) continue;
    if (isManualTocLine(p)) continue;

    // 3. Check Level 3 Decimal (Latin "1.1.1" or Hindi "١.١.١" / "١-١-١"):
    const m3 = rawText.match(/^([0-9٠-٩]+)\s*[.\-]\s*([0-9٠-٩]+)\s*[.\-]\s*([0-9٠-٩]+)\.?(?:[\s.)\-:\t]*)(.+)$/);
    if (
      m3 &&
      m3[4].length <= 150 &&
      !/^[0-9٠-٩]+\s*\./.test(m3[4]) &&
      /^[A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF"'(«]/.test(m3[4].trim())
    ) {
      const restTitle = m3[4].replace(/\s+/g, ' ').trim();
      if (!EXCLUDED_DECIMAL_UNITS.test(normalizeArabicKey(restTitle))) {
        expectedL3++;
        const actualPrefix = `${m3[1]}.${m3[2]}.${m3[3]}`;
        const actualFull = rawText.replace(/\s+/g, ' ').trim();
        const bmId = ++bookmarkCounter;
        const bmName = `_TocSub3_${currentBab}_${expectedL2}_${expectedL3}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 3,
          chapterNum: currentBab,
          originalPrefix: actualPrefix,
          numberPrefix: actualPrefix,
          titleText: restTitle,
          fullText: actualFull,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(arabicCounter, numberingProfile),
          bookmarkName: bmName
        });
        continue;
      }
    }

    // 4a. Check Bare Alphabetic Sub-Bab Prefix where title is in the following paragraph (e.g. p1: "A.", p2: "Konteks Penelitian")
    const mBareAlpha = rawText.match(/^([A-Z])\s*([.):\-–—])?\s*$/);
    if (mBareAlpha && i + 1 < paragraphs.length) {
      let lookNext = i + 1;
      while (lookNext < paragraphs.length && !getParaText(paragraphs[lookNext]).trim()) {
        lookNext++;
      }
      if (lookNext < paragraphs.length) {
        const nextP = paragraphs[lookNext];
        const nextText = getParaText(nextP).trim();
        if (
          nextText.length >= 3 &&
          nextText.length <= 115 &&
          !/^[A-Z0-9IVX]+[.:\-]/.test(nextText) &&
          !/^(?:B\s*A\s*B|CHAPTER|DAFTAR|LAMPIRAN)/i.test(nextText) &&
          !/[.?!]$/.test(nextText)
        ) {
          const token = mBareAlpha[1];
          const restTitle = nextText.replace(/\s+/g, ' ').replace(/[.:\s]+$/, '').trim();
          currentChapterUsesLetterL2 = true;
          expectedL2++;
          expectedL3 = 0;
          const prefix = `${token}.`;
          const actualFull = `${prefix} ${restTitle}`;
          const bmId = ++bookmarkCounter;
          const bmName = `_TocAlpha2_${currentBab}_${expectedL2}_${bmId}`;
          bodyHeadings.push({
            paragraph: p,
            subtitleParagraph: nextP,
            paragraphIndex: i,
            level: 2,
            chapterNum: currentBab,
            originalPrefix: prefix,
            numberPrefix: prefix,
            titleText: restTitle,
            fullText: actualFull,
            estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(1, numberingProfile),
            bookmarkName: bmName
          });
          i = lookNext; // advance scan index past subtitle paragraph
          continue;
        }
      }
    }

    // 4b. Check Level 2 Alphabetic / Arabic Lettered / Arabic Ordinal FIRST before decimal:
    // e.g. "A. Konteks Penelitian", "A.	Konteks Penelitian", "A. Pendekatan Konseptual", "أ. خلفية البحث", "أولاً: ..."
    const mAlpha2 = rawText.match(
      /^(?:([A-Z])\s*([.):\-–—\t])|([أابتثجحخدذرزسشصضطظعغفقكلمنهوي]|هـ)\s*([.\-):–—\t])|((?:أولا|أولاً|اولاً|اولا|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً|خامسا|خامساً|سادسا|سادساً|سابعا|سابعاً|ثامنا|ثامناً|تاسعا|تاسعاً|عاشرا|عاشراً))\s*[:.\-–—\t])\s*(.+)$/
    );
    if (mAlpha2 && (mAlpha2[6] || mAlpha2[7] || mAlpha2[4] || mAlpha2[2] || mAlpha2[0])) {
      const token = (mAlpha2[1] || mAlpha2[3] || mAlpha2[5] || '').trim();
      const sepChar = mAlpha2[2] || mAlpha2[4] || (mAlpha2[5] ? ':' : '.');
      let restTitle = (mAlpha2[6] || mAlpha2[7] || mAlpha2[4] || '').replace(/\s+/g, ' ').replace(/[.:\s]+$/, '').trim();
      const isHeadingCandidate =
        hasBoldFormatting(p) ||
        getExistingHeadingLevel(p) !== null ||
        restTitle.length <= 115;

      if (token && restTitle && isHeadingCandidate) {
        currentChapterUsesLetterL2 = true;
        expectedL2++;
        expectedL3 = 0;
        const prefix = `${token}${sepChar === ')' ? ')' : '.'}`;
        const actualFull = `${prefix} ${restTitle}`;
        const bmId = ++bookmarkCounter;
        const bmName = `_TocAlpha2_${currentBab}_${expectedL2}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 2,
          chapterNum: currentBab,
          originalPrefix: prefix,
          numberPrefix: prefix,
          titleText: restTitle,
          fullText: actualFull,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(1, numberingProfile),
          bookmarkName: bmName
        });
        continue;
      }
    }

    // 5. Check Level 2 Decimal (Latin "1.1", "2.1" or Hindi "١.١" / "١-١"):
    // e.g. "1.1 Latar Belakang Masalah", "2.1 Pendekatan Konseptual"
    const m2 = rawText.match(/^([0-9٠-٩]+)\s*[.\-]\s*([0-9٠-٩]+)\.?(?:[\s.)\-:\t]*)(.+)$/);
    if (
      m2 &&
      m2[3].length <= 150 &&
      !/^[0-9٠-٩]/.test(m2[3].trim()) &&
      /^[A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF"'(«]/.test(m2[3].trim())
    ) {
      const restTitle = m2[3].replace(/\s+/g, ' ').trim();
      const startsWithUpperOrArab = /^[A-ZÀ-ÖØ-Þ\u0600-\u06FF"'(«]/.test(restTitle);
      const isShortOrBold =
        hasBoldFormatting(p) ||
        getExistingHeadingLevel(p) !== null ||
        (!/[.؟]\s*$/.test(restTitle) && restTitle.length <= 115);
      if (!EXCLUDED_DECIMAL_UNITS.test(normalizeArabicKey(restTitle)) && (startsWithUpperOrArab || isShortOrBold)) {
        expectedL2++;
        expectedL3 = 0;
        const actualPrefix = `${m2[1]}.${m2[2]}`;
        const actualFull = rawText.replace(/\s+/g, ' ').trim();
        const bmId = ++bookmarkCounter;
        const bmName = `_TocSub2_${currentBab}_${expectedL2}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 2,
          chapterNum: currentBab,
          originalPrefix: actualPrefix,
          numberPrefix: actualPrefix,
          titleText: restTitle,
          fullText: actualFull,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(arabicCounter, numberingProfile),
          bookmarkName: bmName
        });
        continue;
      }
    }

    // 6a. Check Arabic Structural Level 2 ("المبحث الأول: ...", "المبحث الثاني: ...") when inside a الباب or الفصل
    const mMabhath = rawText.match(/^[^\u0600-\u06FF]*((?:المبحث|المطلب)\s+(?:الأول|الاول|الثاني|الثانى|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|[١-٩]|[1-9]))\s*[:.\-–—]?\s*(.*)$/);
    if (mMabhath && rawText.length <= 140) {
      const isMatlab = /^المطلب/.test(mMabhath[1].trim());
      const resolvedLevel: 2 | 3 = isMatlab && expectedL2 > 0 ? 3 : 2;
      const prefix = mMabhath[1].trim();
      const restTitle = mMabhath[2].replace(/\s+/g, ' ').trim();
      const fullLabel = restTitle ? `${prefix} : ${restTitle}` : prefix;
      if (resolvedLevel === 2) {
        currentChapterUsesLetterL2 = true;
        expectedL2++;
        expectedL3 = 0;
      } else {
        expectedL3++;
      }
      const bmId = ++bookmarkCounter;
      const bmName = `_TocArabStruct${resolvedLevel}_${currentBab}_${expectedL2}_${expectedL3}_${bmId}`;
      bodyHeadings.push({
        paragraph: p,
        paragraphIndex: i,
        level: resolvedLevel,
        chapterNum: currentBab,
        originalPrefix: prefix,
        numberPrefix: prefix,
        titleText: restTitle || prefix,
        fullText: fullLabel,
        estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(arabicCounter, numberingProfile),
        bookmarkName: bmName
      });
      continue;
    }

    // 6b. Check Level 3 Numbered under Alphabetic Level 2 (e.g. "1. Tujuan Umum", "١. أهداف عامة", "٢- أهداف خاصة")
    if (currentChapterUsesLetterL2 && expectedL2 > 0) {
      const mNum3 = rawText.match(/^([0-9٠-٩]+)\s*[.\-)](?:[\s\t]*)(.+)$/);
      if (mNum3 && mNum3[2].length <= 115) {
        const numStr = mNum3[1];
        const restTitle = mNum3[2].replace(/\s+/g, ' ').trim();
        const isSubSubCandidate =
          (hasBoldFormatting(p) || getExistingHeadingLevel(p) === 3 || (hasArabicScript(restTitle) && restTitle.length <= 75)) &&
          !/[.;:,،؟]\s*$/.test(restTitle) &&
          /^[A-ZÀ-ÖØ-Þ\u0600-\u06FF"'(«]/.test(restTitle);

        if (isSubSubCandidate) {
          expectedL3++;
          const prefix = `${numStr}.`;
          const bmId = ++bookmarkCounter;
          const bmName = `_TocNum3_${currentBab}_${expectedL2}_${expectedL3}_${bmId}`;
          bodyHeadings.push({
            paragraph: p,
            paragraphIndex: i,
            level: 3,
            chapterNum: currentBab,
            originalPrefix: prefix,
            numberPrefix: prefix,
            titleText: restTitle,
            fullText: `${prefix} ${restTitle}`,
            estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(arabicCounter, numberingProfile),
            bookmarkName: bmName
          });
          continue;
        }
      }
    }

    // 7. Check Word Auto-Numbered Paragraphs (<w:numPr>) or Paragraphs with Existing Heading 2/3 Styles
    const existingLvl = getExistingHeadingLevel(p);
    const numInfo = getNumPrInfo(p);
    const cleanTitle = rawText.replace(/\s+/g, ' ').trim();

    if (
      existingLvl === 2 ||
      existingLvl === 3 ||
      (numInfo.hasNumPr &&
        hasBoldFormatting(p) &&
        cleanTitle.length >= 3 &&
        cleanTitle.length <= 120 &&
        !/[.;:,،؟]\s*$/.test(cleanTitle) &&
        /^[A-ZÀ-ÖØ-Þ\u0600-\u06FF"'(«]/.test(cleanTitle))
    ) {
      const resolvedLevel: 2 | 3 =
        existingLvl === 3 || (numInfo.hasNumPr && numInfo.ilvl >= 2) || (numInfo.hasNumPr && numInfo.ilvl === 1 && expectedL2 > 0 && currentChapterUsesLetterL2)
          ? 3
          : 2;

      if (resolvedLevel === 2) {
        expectedL2++;
        expectedL3 = 0;
        let pfx = '';
        let fullLabel = cleanTitle;
        if (/^[A-Z]\.?\s+/i.test(cleanTitle) || /^[0-9٠-٩]+[.\-][0-9٠-٩]+/i.test(cleanTitle)) {
          fullLabel = cleanTitle;
        } else {
          // In standard thesis, synthesize letter prefix "A.", "B.", etc. if heading title is bare
          pfx = `${String.fromCharCode(64 + Math.min(26, expectedL2))}.`;
          fullLabel = `${pfx} ${cleanTitle}`;
        }
        const bmId = ++bookmarkCounter;
        const bmName = `_TocAuto2_${currentBab}_${expectedL2}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 2,
          chapterNum: currentBab,
          originalPrefix: pfx,
          numberPrefix: pfx,
          titleText: cleanTitle,
          fullText: fullLabel,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(1, numberingProfile),
          bookmarkName: bmName
        });
      } else {
        const parentL2 = Math.max(1, expectedL2);
        expectedL3++;
        const fullLabel = cleanTitle;
        const bmId = ++bookmarkCounter;
        const bmName = `_TocAuto3_${currentBab}_${parentL2}_${expectedL3}_${bmId}`;
        bodyHeadings.push({
          paragraph: p,
          paragraphIndex: i,
          level: 3,
          chapterNum: currentBab,
          originalPrefix: '',
          numberPrefix: '',
          titleText: cleanTitle,
          fullText: fullLabel,
          estimatedPage: paragraphPageMap.get(i) || formatBodyMatterPage(arabicCounter, numberingProfile),
          bookmarkName: bmName
        });
      }
    }
  }

  // Apply Heading 1/2/3 + outlineLvl 0/1/2 ("Add Text") and merge 2-line BAB titles when tagging headings
  if (shouldTagAllHeadings) {
    for (const item of bodyHeadings) {
      if (item.level === 1 && item.subtitleParagraph) {
        mergeSubtitleIntoBabParagraph(
          item.paragraph,
          item.subtitleParagraph,
          item.emptyBetweenParagraphs || []
        );
      }
      const bmId = ++bookmarkCounter;
      applyHeadingTag(item.paragraph, item.level, {
        preserveCenter: item.level === 1,
        bookmarkId: bmId,
        bookmarkName: item.bookmarkName,
        isArabic: isArabicDoc || hasArabicScript(item.fullText)
      });
      if (item.level === 1) taggedL1++;
      else if (item.level === 2) taggedL2++;
      else if (item.level === 3) taggedL3++;
    }
    revisionLogs.push(
      `Add Text Otomatis diterapkan secara lengkap pada ${taggedL1} Judul Utama/BAB (Level 1), ${taggedL2} Sub-Bab (Level 2), dan ${taggedL3} Sub-Sub-Bab (Level 3).`
    );
  }

  const xmlSerializer = new XMLSerializer();

  // MODUL A: ONLY SYNC MANUAL TOC (when user explicitly selects manual_sync or auto_detect with manual TOC)
  if (!shouldGenerateAutomaticToc && hasTocDetected) {
    let tocParas: Element[] = [];
    if (manualRange) {
      tocParas = paragraphs.slice(manualRange.startIdx, manualRange.endIdx + 1);
    } else if (sdtElement) {
      tocParas = Array.from(sdtElement.getElementsByTagNameNS(W_NS, 'p'));
    }

    let currentBabInManual = 0;
    let autoNumberedCount = 0;
    let autoCorrectedCount = 0;

    for (const tp of tocParas) {
      const rawLine = getParaText(tp).trim();
      if (!rawLine) continue;
      const { cleanEntry, trailingPage } = stripLeadingLeaderAndPage(rawLine);
      if (!cleanEntry) continue;
      const normEntry = normalize(cleanEntry);
      const arabEntry = normalizeArabicKey(cleanEntry);

      // Skip column headers
      if (
        /^(?:JUDUL\s+)?HALAMAN$/i.test(normEntry) ||
        /^(?:الموضوع\s+)?(?:الصفحه|رقم\s+الصفحه|الموضوع)$/.test(arabEntry)
      ) {
        continue;
      }

      // 1. Check Front Matter match (e.g. HALAMAN JUDUL, ABSTRAK, KATA PENGANTAR, dll.)
      const fmMatch = frontEntries.find(
        f =>
          normalize(f.title) === normEntry ||
          normEntry.startsWith(normalize(f.title)) ||
          normalize(f.title).startsWith(normEntry) ||
          (hasArabicScript(f.title) && normalizeArabicKey(f.title) === arabEntry)
      );
      if (fmMatch) {
        const targetPage = fmMatch.page;
        if (applyOrUpdatePageInManualTocParagraph(tp, fmMatch.title, trailingPage, targetPage, isArabicDoc)) {
          if (trailingPage) {
            autoCorrectedCount++;
            revisionLogs.push(
              `Auto-koreksi nomor halaman Daftar Isi: '${fmMatch.title}' (${trailingPage} -> ${targetPage})`
            );
          } else {
            autoNumberedCount++;
            revisionLogs.push(
              `Menomori halaman Daftar Isi manual: '${fmMatch.title}' -> ${targetPage} (titik-titik s.d 13.5 cm)`
            );
          }
        }
        continue;
      }

      // 2. Check Chapter Level 1 match (e.g. BAB I PENDAHULUAN, BAB II KAJIAN TEORI, dll.)
      const babMatch = cleanEntry.match(/^(?:B\s*A\s*B|CHAPTER)\s*([IVX]+|\d+)\b\s*(.*)$/i);
      const arabBabMatch = arabEntry.match(/^(?:الباب|الفصل|المبحث)\s+(الاول|الثاني|الثالث|الرابع|الخامس|السادس|[١-٦]|[1-6])\b\s*[:.\-–—]?\s*(.*)$/);
      if (babMatch || arabBabMatch) {
        let chapNum = 0;
        if (babMatch) {
          const romanToken = babMatch[1].toUpperCase();
          chapNum = ['I', 'II', 'III', 'IV', 'V', 'VI'].indexOf(romanToken) + 1 || Number(romanToken);
        } else if (arabBabMatch) {
          const ordToken = arabBabMatch[1];
          chapNum =
            ['الاول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'].indexOf(ordToken) + 1 ||
            Number(fromHindiNumerals(ordToken));
        }
        if (chapNum > 0) currentBabInManual = chapNum;
        const bodyBab = bodyHeadings.find(h => h.level === 1 && h.chapterNum === chapNum);
        const targetPage = bodyBab ? bodyBab.estimatedPage : formatBodyMatterPage(1, numberingProfile);
        const babFullTitle = bodyBab ? bodyBab.fullText : cleanEntry;
        if (applyOrUpdatePageInManualTocParagraph(tp, babFullTitle, trailingPage, targetPage, isArabicDoc)) {
          if (trailingPage) {
            autoCorrectedCount++;
            revisionLogs.push(
              `Auto-koreksi nomor halaman Bab ${chapNum}: '${babFullTitle}' (${trailingPage} -> ${targetPage})`
            );
          } else {
            autoNumberedCount++;
            revisionLogs.push(
              `Menomori Bab ${chapNum} pada Daftar Isi: '${babFullTitle}' -> ${targetPage} (titik-titik s.d 13.5 cm)`
            );
          }
        }
        continue;
      }

      // 3. Check Sub-Bab (Level 2 / 3) match
      // Prioritaskan pencarian di dalam bab manual yang aktif (currentBabInManual)
      let matchedSub: BodyHeadingItem | undefined;
      const subInBab = bodyHeadings.filter(
        h => h.level >= 2 && (currentBabInManual > 0 ? h.chapterNum === currentBabInManual : true)
      );

      // Cek berdasarkan kemiripan judul atau teks lengkap
      matchedSub = subInBab.find(
        h =>
          normalize(h.fullText) === normEntry ||
          normEntry.includes(normalize(h.titleText)) ||
          normalize(h.titleText).includes(normEntry) ||
          (h.titleText.length > 5 && normEntry.includes(normalize(h.titleText.slice(0, 15))))
      );

      // Jika belum cocok, cari berdasarkan awalan (misal: "A.", "B.", "1.1", "2.1")
      if (!matchedSub) {
        const pfxMatch = cleanEntry.match(/^([0-9٠-٩]+(?:[.\-][0-9٠-٩]+)*|[A-Z]\.?|[0-9٠-٩]+\.?|[أابتثجحخدذرزسشصضطظعغفقكلمنهوي][.\-):–—]?)\s*/i);
        if (pfxMatch) {
          const rawPfx = pfxMatch[1].replace(/[.\-):–—]+$/, '');
          matchedSub = subInBab.find(
            h =>
              h.numberPrefix.replace(/[.\-):–—]+$/, '') === rawPfx ||
              (h.originalPrefix && h.originalPrefix.replace(/[.\-):–—]+$/, '') === rawPfx)
          );
        }
      }

      // Jika masih belum cocok dan berada di luar bab aktif, cari secara global
      if (!matchedSub) {
        matchedSub = bodyHeadings.find(
          h =>
            h.level >= 2 &&
            (normalize(h.fullText) === normEntry ||
              normEntry.includes(normalize(h.titleText)) ||
              normalize(h.titleText).includes(normEntry))
        );
      }

      if (matchedSub) {
        const targetPage = matchedSub.estimatedPage;
        const subFullTitle = matchedSub.fullText;
        if (applyOrUpdatePageInManualTocParagraph(tp, subFullTitle, trailingPage, targetPage, isArabicDoc)) {
          if (trailingPage) {
            autoCorrectedCount++;
            revisionLogs.push(
              `Auto-koreksi nomor sub-bab: '${subFullTitle}' (${trailingPage} -> ${targetPage})`
            );
          } else {
            autoNumberedCount++;
            revisionLogs.push(
              `Menomori sub-bab pada Daftar Isi: '${subFullTitle}' -> ${targetPage} (titik-titik s.d 13.5 cm)`
            );
          }
        }
        continue;
      }

      // 4. Check Back Matter match (e.g. DAFTAR PUSTAKA, LAMPIRAN, RIWAYAT HIDUP, BIODATA, المراجع)
      const backItem = bodyHeadings.find(
        h =>
          h.level === 1 &&
          h.chapterNum === 0 &&
          (normalize(h.titleText) === normEntry ||
            normEntry.startsWith(normalize(h.titleText)) ||
            normalize(h.titleText).startsWith(normEntry) ||
            (hasArabicScript(h.titleText) && normalizeArabicKey(h.titleText) === arabEntry))
      );
      if (backItem) {
        const targetPage = backItem.estimatedPage;
        const backFullTitle = backItem.fullText;
        if (applyOrUpdatePageInManualTocParagraph(tp, backFullTitle, trailingPage, targetPage, isArabicDoc)) {
          if (trailingPage) {
            autoCorrectedCount++;
            revisionLogs.push(
              `Auto-koreksi nomor halaman '${backFullTitle}': '${trailingPage}' -> '${targetPage}'`
            );
          } else {
            autoNumberedCount++;
            revisionLogs.push(
              `Menomori '${backFullTitle}' pada Daftar Isi: halaman '${targetPage}' (titik-titik s.d 13.5 cm)`
            );
          }
        }
        continue;
      }
    }

    if (autoNumberedCount > 0 || autoCorrectedCount > 0) {
      revisionLogs.unshift(
        `Daftar Isi manual dipertahankan: ${autoNumberedCount} judul diberi penomoran baru dan ${autoCorrectedCount} judul berhasil diauto-koreksi halamannya dengan tab titik-titik rapi hingga batas 13.5 cm.`
      );
    } else {
      revisionLogs.unshift(
        'Daftar Isi manual terdeteksi & dipertahankan: seluruh penomoran halaman dan format titik-titik telah sinkron dengan isi dokumen.'
      );
    }

    const manualTocPreviewItems = [
      ...frontEntries.map(f => ({ title: f.title, level: 1 as const, page: f.page })),
      ...bodyHeadings.map(b => ({ title: b.fullText, level: b.level, page: b.estimatedPage }))
    ];

    return {
      status: 'success',
      has_toc_detected: true,
      toc_kind: tocKind,
      action_taken: 'CHECK_AND_REVISE',
      toc_keyword_found: tocKeywordIdx >= 0,
      toc_keyword_text: tocKeywordIdx >= 0 ? getParaText(paragraphs[tocKeywordIdx]) : undefined,
      tagged_headings_count: { level1: taggedL1, level2: taggedL2, level3: taggedL3 },
      revision_logs: revisionLogs,
      updated_xml_data: xmlSerializer.serializeToString(docXml),
      generated_toc_xml: null,
      toc_preview_items: manualTocPreviewItems
    };
  }

  // MODUL B / AUTO-GENERATE: PLACE COMPLETE AUTOMATIC TOC (<w:sdt>) DIRECTLY BELOW "DAFTAR ISI" / "فهرس المحتويات" KEYWORD
  const body = docXml.getElementsByTagNameNS(W_NS, 'body')[0];
  const hasKeywordParagraph = tocKeywordIdx >= 0 && !!paragraphs[tocKeywordIdx];
  const keywordPara = hasKeywordParagraph ? paragraphs[tocKeywordIdx] : null;

  if (keywordPara && (isArabicDoc || hasArabicScript(getParaText(keywordPara)))) {
    applyHeadingTag(keywordPara, 1, {
      preserveCenter: true,
      isArabic: true
    });
  }

  // Build <w:sdt> TOC (omit internal "DAFTAR ISI" / "فهرس المحتويات" heading if the document already has the keyword paragraph)
  const tocSdt = buildOpenXmlTocSdt(docXml, bodyHeadings, frontEntries, {
    includeTitleHeading: !hasKeywordParagraph,
    isArabic: isArabicDoc,
    numberingProfile
  });
  const generatedTocXml = xmlSerializer.serializeToString(tocSdt);

  if (body) {
    // Remove any existing <w:sdt> TOC so we don't duplicate it
    if (sdtElement && sdtElement.parentNode) {
      sdtElement.parentNode.removeChild(sdtElement);
    }

    // If there were old manual TOC lines under the "DAFTAR ISI" keyword, remove them while preserving any <w:sectPr>
    let preservedSectPr: Element | null = null;
    if (manualRange && manualRange.endIdx >= manualRange.startIdx) {
      for (let idx = manualRange.startIdx; idx <= manualRange.endIdx; idx++) {
        const oldP = paragraphs[idx];
        if (!oldP || !oldP.parentNode) continue;
        const oldPPr = child(oldP, 'pPr');
        const oldSect = oldPPr ? child(oldPPr, 'sectPr') : null;
        if (oldSect && oldPPr) {
          oldPPr.removeChild(oldSect);
          preservedSectPr = oldSect;
        }
        oldP.parentNode.removeChild(oldP);
      }
    }

    if (keywordPara && keywordPara.parentNode) {
      // Check if keywordPara itself had a trailing <w:br w:type="page"/> or <w:sectPr> that would push the TOC to the next page!
      let hadTrailingPageBreakOnKeyword = false;
      const kwPPr = child(keywordPara, 'pPr');
      const kwSect = kwPPr ? child(kwPPr, 'sectPr') : null;
      if (kwSect && kwPPr) {
        kwPPr.removeChild(kwSect);
        preservedSectPr = kwSect;
      }

      // Remove any <w:br w:type="page"/> inside keywordPara that comes AFTER its visible text "DAFTAR ISI"
      let seenTextInKw = false;
      for (const r of Array.from(keywordPara.children).filter(x => localName(x) === 'r')) {
        for (const c of Array.from(r.children)) {
          const cname = localName(c);
          if (cname === 't' && (c.textContent || '').trim().length > 0) {
            seenTextInKw = true;
          } else if (seenTextInKw && cname === 'br' && /^page$/i.test(attr(c, 'type'))) {
            r.removeChild(c);
            hadTrailingPageBreakOnKeyword = true;
          }
        }
      }

      // Insert the generated <w:sdt> TOC directly below the "DAFTAR ISI" keyword paragraph!
      keywordPara.parentNode.insertBefore(tocSdt, keywordPara.nextSibling);

      // Insert a clean boundary paragraph right after tocSdt (outside <w:sdt>) so any section break or page break
      // sits cleanly after the TOC without ever pushing the TOC off the "DAFTAR ISI" page
      const afterTocP = docXml.createElementNS(W_NS, 'w:p');
      const afterTocPPr = docXml.createElementNS(W_NS, 'w:pPr');
      afterTocP.appendChild(afterTocPPr);
      if (preservedSectPr) {
        afterTocPPr.appendChild(preservedSectPr);
      } else if (hadTrailingPageBreakOnKeyword) {
        const brR = docXml.createElementNS(W_NS, 'w:r');
        const brEl = docXml.createElementNS(W_NS, 'w:br');
        setVal(brEl, 'type', 'page');
        brR.appendChild(brEl);
        afterTocP.appendChild(brR);
      }
      keywordPara.parentNode.insertBefore(afterTocP, tocSdt.nextSibling);

      revisionLogs.push(
        `Kata kunci '${getParaText(keywordPara)}' ditemukan: isi Daftar Isi Otomatis (<w:sdt>) berhasil dibuat lengkap langsung di bawah kata kunci '${getParaText(keywordPara)}'.`
      );
    } else {
      // Fallback if the document had no "DAFTAR ISI" keyword paragraph at all: insert before BAB I
      const targetP = bab1Idx >= 0 ? paragraphs[bab1Idx] : null;
      if (targetP && targetP.parentNode === body) {
        if (bab1Idx > 0) {
          const prevP = paragraphs[bab1Idx - 1];
          const prevPPr = prevP ? child(prevP, 'pPr') : null;
          const prevSect = prevPPr ? child(prevPPr, 'sectPr') : null;
          if (prevSect && prevPPr) {
            prevPPr.removeChild(prevSect);
            preservedSectPr = prevSect;
          }
        }
        body.insertBefore(tocSdt, targetP);
        const afterTocP = docXml.createElementNS(W_NS, 'w:p');
        const afterTocPPr = docXml.createElementNS(W_NS, 'w:pPr');
        afterTocP.appendChild(afterTocPPr);
        if (preservedSectPr) {
          afterTocPPr.appendChild(preservedSectPr);
        }
        body.insertBefore(afterTocP, targetP);
        revisionLogs.push(
          'Halaman kata kunci DAFTAR ISI belum ada di dokumen: sistem membuat judul DAFTAR ISI beserta isi Daftar Isi Otomatis (<w:sdt>) lengkap sebelum BAB I.'
        );
      } else {
        const bodySect = Array.from(body.children).find(x => localName(x) === 'sectPr');
        body.insertBefore(tocSdt, bodySect || null);
        revisionLogs.push('Blok XML <w:sdt> Table of Contents (TOC) standar OpenXML berhasil dibuat.');
      }
    }
  }

  const autoTocPreviewItems = [
    ...frontEntries.map(f => ({ title: f.title, level: 1 as const, page: f.page })),
    ...bodyHeadings.map(b => ({ title: b.fullText, level: b.level, page: b.estimatedPage }))
  ];

  return {
    status: 'success',
    has_toc_detected: hasTocDetected,
    toc_kind: tocKind,
    action_taken: 'GENERATE_NEW_TOC',
    toc_keyword_found: hasKeywordParagraph,
    toc_keyword_text: keywordPara ? getParaText(keywordPara) : undefined,
    tagged_headings_count: { level1: taggedL1, level2: taggedL2, level3: taggedL3 },
    revision_logs: revisionLogs,
    updated_xml_data: xmlSerializer.serializeToString(docXml),
    generated_toc_xml: generatedTocXml,
    toc_preview_items: autoTocPreviewItems
  };
}
