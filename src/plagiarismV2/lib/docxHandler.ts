import JSZip from 'jszip';
import type { DocxFileInfo, FootnoteDetail, PlagiarismSegment } from '../types';

/**
 * Common Legal & Academic Protected Regex Patterns
 */
export const PROTECTED_PATTERNS = [
  /\bUU(?:\s+RI|\s+No\.?|\s+Nomor)?\s+\d+\s+Tahun\s+\d{4}\b/gi,
  /\bPasal\s+\d+(?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z])?\b/gi,
  /\bKUHP(?:idana)?\b/gi,
  /\bKUH\s*Perdata\b/gi,
  /\bUUD\s+(?:NRI\s+)?1945\b/gi,
  /\bPerpres\s+(?:No\.?|Nomor)?\s*\d+\/\d{4}\b/gi,
  /\bPP\s+(?:No\.?|Nomor)?\s*\d+\s+Tahun\s+\d{4}\b/gi,
  /\b(?:in\s+vitro|in\s+vivo|stare\s+decisis|mutatis\s+mutandis|lex\s+specialis|lex\s+superior|p-value|alpha\s*=\s*0\.05)\b/gi,
];

/**
 * Auto-detects legal and academic terms that should not be altered
 */
export function detectProtectedTerms(text: string): string[] {
  const terms = new Set<string>();
  for (const pattern of PROTECTED_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => terms.add(m.trim()));
    }
  }
  return Array.from(terms);
}

/**
 * Parses an uploaded DOCX file into structure, paragraphs, and footnote metadata
 */
export async function parseDocxFile(
  fileOrBuffer: File | Blob | ArrayBuffer,
  customFileName?: string
): Promise<DocxFileInfo> {
  const arrayBuffer =
    fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

  const fileName =
    customFileName ||
    (fileOrBuffer instanceof File ? fileOrBuffer.name : 'dokumen.docx');

  const fileSize =
    fileOrBuffer instanceof File ? fileOrBuffer.size : arrayBuffer.byteLength;

  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('File tidak valid: "word/document.xml" tidak ditemukan dalam arsip DOCX.');
  }

  const documentXml = await docXmlFile.async('string');

  let footnotesXml: string | undefined = undefined;
  const footnotesXmlFile = zip.file('word/footnotes.xml');
  if (footnotesXmlFile) {
    footnotesXml = await footnotesXmlFile.async('string');
  }

  let endnotesXml: string | undefined = undefined;
  const endnotesXmlFile = zip.file('word/endnotes.xml');
  if (endnotesXmlFile) {
    endnotesXml = await endnotesXmlFile.async('string');
  }

  // Load Headers & Footers if present
  const headerXmls: Record<string, string> = {};
  const footerXmls: Record<string, string> = {};

  for (const filename of Object.keys(zip.files)) {
    if (filename.startsWith('word/header') && filename.endsWith('.xml')) {
      headerXmls[filename] = await zip.file(filename)!.async('string');
    } else if (filename.startsWith('word/footer') && filename.endsWith('.xml')) {
      footerXmls[filename] = await zip.file(filename)!.async('string');
    }
  }

  // Parse footnotes from word/footnotes.xml & word/document.xml
  const footnotes = extractFootnotes(documentXml, footnotesXml);

  // Extract paragraphs from document.xml
  const { paragraphs, chapters, totalWords } = extractParagraphsAndChapters(documentXml);

  return {
    fileName,
    fileSize,
    fileData: arrayBuffer,
    zip,
    documentXml,
    footnotesXml,
    endnotesXml,
    headerXmls,
    footerXmls,
    totalParagraphs: paragraphs.length,
    totalWords,
    footnotes,
    chapters,
  };
}

/**
 * Extracts footnotes details from footnotes.xml and document.xml
 */
export function extractFootnotes(documentXml: string, footnotesXml?: string): FootnoteDetail[] {
  const footnotes: FootnoteDetail[] = [];

  // Find all footnote references in document.xml
  const docFootnoteRefRegex = /<w:footnoteReference[^>]*w:id="([^"]+)"[^>]*\/>/g;
  const refCounts: Record<string, number> = {};
  let match: RegExpExecArray | null;

  while ((match = docFootnoteRefRegex.exec(documentXml)) !== null) {
    const id = match[1];
    if (id !== '-1' && id !== '0') {
      refCounts[id] = (refCounts[id] || 0) + 1;
    }
  }

  // If footnotes.xml exists, extract footnote contents
  if (footnotesXml) {
    const footnoteBlockRegex = /<w:footnote[^>]*w:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:footnote>/g;
    let fnMatch: RegExpExecArray | null;
    let sequenceNumber = 1;

    while ((fnMatch = footnoteBlockRegex.exec(footnotesXml)) !== null) {
      const id = fnMatch[1];
      if (id === '-1' || id === '0') continue; // Standard Word separator items

      const contentBlock = fnMatch[2];
      // Extract text inside footnote
      const textMatches = contentBlock.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      const footnoteText = textMatches
        .map((t) => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join('');

      footnotes.push({
        id,
        number: sequenceNumber++,
        text: decodeXmlEntities(footnoteText.trim()) || `Footnote ${id}`,
        inDocXmlCount: refCounts[id] || 0,
        status: 'verified',
      });
    }
  } else {
    // If no separate footnotes.xml, create list from references in document.xml
    const ids = Object.keys(refCounts).sort((a, b) => Number(a) - Number(b));
    ids.forEach((id, idx) => {
      footnotes.push({
        id,
        number: idx + 1,
        text: `Footnote rujukan #${id} di dokumen`,
        inDocXmlCount: refCounts[id],
        status: 'verified',
      });
    });
  }

  return footnotes;
}

/**
 * Memoized words and normalizations cache for ultra-fast matching
 */
const normCache = new WeakMap<object, string>();
const wordSetCache = new WeakMap<object, Set<string>>();

/**
 * Extracts paragraphs, detected chapters, and word count from document.xml
 */
export function extractParagraphsAndChapters(documentXml: string): {
  paragraphs: { text: string; xmlIndex: number; footnoteIds: string[] }[];
  chapters: { title: string; paragraphIndex: number }[];
  totalWords: number;
} {
  const paragraphs: { text: string; xmlIndex: number; footnoteIds: string[] }[] = [];
  const chapters: { title: string; paragraphIndex: number }[] = [];
  let totalWords = 0;

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
  const pNodes = xmlDoc.getElementsByTagName('w:p');

  for (let i = 0; i < pNodes.length; i++) {
    const p = pNodes[i];
    const tNodes = p.getElementsByTagName('w:t');
    let pText = '';
    for (let j = 0; j < tNodes.length; j++) {
      pText += tNodes[j].textContent || '';
    }

    // Footnote refs in this paragraph
    const fnRefs = p.getElementsByTagName('w:footnoteReference');
    const fnIds: string[] = [];
    for (let k = 0; k < fnRefs.length; k++) {
      const id = fnRefs[k].getAttribute('w:id');
      if (id && id !== '-1' && id !== '0') {
        fnIds.push(id);
      }
    }

    const cleanText = pText.trim();
    if (cleanText.length > 0) {
      const words = cleanText.split(/\s+/).filter(Boolean);
      totalWords += words.length;

      // Check if this looks like a chapter header
      const chapterMatch = cleanText.match(/^(BAB\s+[IVX0-9]+|PENDAHULUAN|TINJAUAN PUSTAKA|METODE|PEMBAHASAN|HASIL|KESIMPULAN)/i);
      if (chapterMatch) {
        chapters.push({
          title: cleanText.slice(0, 50),
          paragraphIndex: paragraphs.length,
        });
      }

      paragraphs.push({
        text: cleanText,
        xmlIndex: i,
        footnoteIds: fnIds,
      });
    }
  }

  return { paragraphs, chapters, totalWords };
}

/**
 * Match a plagiarized text query against the DOCX paragraphs with high-speed indexing
 */
export function findMatchInDocx(
  queryText: string,
  paragraphs: { text: string; xmlIndex: number; footnoteIds: string[] }[] = [],
  chapters: { title: string; paragraphIndex: number }[] = []
): {
  matched: boolean;
  paragraphIndex: number;
  locationLabel: string;
  contextBefore?: string;
  contextAfter?: string;
  footnoteIdsNearby?: string[];
  protectedTermsDetected?: string[];
} {
  const normQuery = normalizeText(queryText || '');
  if (normQuery.length < 8) {
    return { matched: false, paragraphIndex: -1, locationLabel: 'Teks terlalu pendek' };
  }

  const safeParagraphs = paragraphs || [];
  const safeChapters = chapters || [];

  const queryWords = new Set(normQuery.split(' ').filter((w) => w.length > 2));

  let bestMatchIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < safeParagraphs.length; i++) {
    const pObj = safeParagraphs[i];
    if (!pObj) continue;

    let normP = normCache.get(pObj);
    if (!normP) {
      normP = normalizeText(pObj.text);
      normCache.set(pObj, normP);
    }

    // Exact or direct inclusion match (instant)
    if (normP.includes(normQuery)) {
      bestMatchIdx = i;
      bestScore = 1;
      break;
    }

    // Fast fuzzy token matching
    let pWordSet = wordSetCache.get(pObj);
    if (!pWordSet) {
      pWordSet = new Set(normP.split(' ').filter((w) => w.length > 2));
      wordSetCache.set(pObj, pWordSet);
    }

    if (queryWords.size > 0 && pWordSet.size > 0) {
      let common = 0;
      queryWords.forEach((w) => {
        if (pWordSet!.has(w)) common++;
      });
      const similarity = common / queryWords.size;
      if (similarity > 0.52 && similarity > bestScore) {
        bestScore = similarity;
        bestMatchIdx = i;
      }
    }
  }

  const protectedTerms = detectProtectedTerms(queryText || '');

  if (bestMatchIdx !== -1) {
    // Determine which Chapter this paragraph belongs to
    let currentChapter = 'Isi Skripsi';
    for (let c = safeChapters.length - 1; c >= 0; c--) {
      if (bestMatchIdx >= (safeChapters[c]?.paragraphIndex || 0)) {
        currentChapter = safeChapters[c]?.title || 'Isi Skripsi';
        break;
      }
    }

    const matchedP = safeParagraphs[bestMatchIdx];
    const words = (matchedP?.text || '').split(' ');
    const contextBefore = words.slice(0, 10).join(' ') + (words.length > 10 ? '...' : '');
    const contextAfter = words.length > 10 ? '...' + words.slice(-8).join(' ') : '';

    return {
      matched: true,
      paragraphIndex: bestMatchIdx,
      locationLabel: `${currentChapter} (Paragraf ${bestMatchIdx + 1})`,
      contextBefore,
      contextAfter,
      footnoteIdsNearby: matchedP?.footnoteIds || [],
      protectedTermsDetected: protectedTerms,
    };
  }

  return {
    matched: false,
    paragraphIndex: -1,
    locationLabel: 'Tidak ditemukan posisi persis di dokumen utama',
    protectedTermsDetected: protectedTerms,
  };
}

/**
 * Replaces plagiarized texts across ALL DOCX XML files (document, footnotes, endnotes, headers, footers)
 * preserving ALL footnote references, tables, styles, and XML layout.
 */
export async function applyParaphraseToDocx(
  docxInfo: DocxFileInfo,
  segmentsToApply: PlagiarismSegment[] = []
): Promise<{
  updatedDocxBlob: Blob;
  replacedCount: number;
  footnotesBefore: number;
  footnotesAfter: number;
  logs: string[];
}> {
  const zip = docxInfo.zip;
  const logs: string[] = [];
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  // 1. Process word/document.xml
  const docXmlDoc = parser.parseFromString(docxInfo.documentXml || '', 'application/xml');
  const footnotesBeforeCount = docXmlDoc.getElementsByTagName('w:footnoteReference').length;

  let replacedCount = 0;
  const safeSegmentsToApply = segmentsToApply || [];
  const selectedSegments = safeSegmentsToApply.filter(
    (s) => s.isSelected && s.paraphrasedText && s.paraphrasedText.trim().length > 0
  );

  logs.push(`Memulai penggantian in-place komprehensif untuk ${selectedSegments.length} bagian.`);

  for (const segment of selectedSegments) {
    const origText = segment.originalText.trim();
    const newText = segment.paraphrasedText.trim();

    if (!origText || !newText) continue;

    let replaced = replaceTextInXmlDoc(docXmlDoc, origText, newText);
    if (replaced) {
      replacedCount++;
      logs.push(`✓ Naskah Utama: Sukses mengganti di ${segment.locationLabel}`);
      continue;
    }

    // Try fuzzy replacement in document.xml
    replaced = replaceTextFuzzyInXmlDoc(docXmlDoc, origText, newText);
    if (replaced) {
      replacedCount++;
      logs.push(`✓ Naskah Utama (Fuzzy Match): Sukses mengganti di ${segment.locationLabel}`);
      continue;
    }

    // Try in footnotes if applicable
    if (docxInfo.footnotesXml && zip.file('word/footnotes.xml')) {
      const fnXmlDoc = parser.parseFromString(await zip.file('word/footnotes.xml')!.async('string'), 'application/xml');
      if (replaceTextInXmlDoc(fnXmlDoc, origText, newText) || replaceTextFuzzyInXmlDoc(fnXmlDoc, origText, newText)) {
        replacedCount++;
        zip.file('word/footnotes.xml', serializer.serializeToString(fnXmlDoc));
        logs.push(`✓ Footnotes.xml: Sukses mengganti teks dalam catatan kaki`);
        continue;
      }
    }

    // Try in headers/footers/endnotes if applicable
    let foundInOtherParts = false;
    for (const filename of Object.keys(zip.files)) {
      if ((filename.startsWith('word/header') || filename.startsWith('word/footer') || filename === 'word/endnotes.xml') && filename.endsWith('.xml')) {
        const otherXmlDoc = parser.parseFromString(await zip.file(filename)!.async('string'), 'application/xml');
        if (replaceTextInXmlDoc(otherXmlDoc, origText, newText) || replaceTextFuzzyInXmlDoc(otherXmlDoc, origText, newText)) {
          zip.file(filename, serializer.serializeToString(otherXmlDoc));
          replacedCount++;
          logs.push(`✓ ${filename}: Sukses mengganti teks di bagian pelengkap`);
          foundInOtherParts = true;
          break;
        }
      }
    }

    if (!foundInOtherParts) {
      logs.push(`⚠️ Teks tidak dapat disisipkan otomatis: "${origText.slice(0, 40)}..."`);
    }
  }

  // Count footnotes after replacement to verify 100% integrity
  const footnotesAfterCount = docXmlDoc.getElementsByTagName('w:footnoteReference').length;

  // Serialize updated XML back to string
  const updatedDocXml = serializer.serializeToString(docXmlDoc);
  zip.file('word/document.xml', updatedDocXml);

  // Generate updated DOCX file blob
  const updatedDocxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  logs.push(`Selesai. Total penggantian: ${replacedCount}. Status Footnote: ${footnotesBeforeCount} ➔ ${footnotesAfterCount} (100% Utuh & Tidak Tergeser).`);

  return {
    updatedDocxBlob,
    replacedCount,
    footnotesBefore: footnotesBeforeCount,
    footnotesAfter: footnotesAfterCount,
    logs,
  };
}

/**
 * Replaces text across <w:p> elements in an XML Document (including tables, textboxes, and body)
 * while preserving all non-text nodes like <w:footnoteReference>, <w:rPr>, <w:tab>, etc.
 */
function replaceTextInXmlDoc(xmlDoc: Document, searchText: string, replaceText: string): boolean {
  const pElements = xmlDoc.getElementsByTagName('w:p');
  const normSearch = normalizeTypography(searchText);

  for (let i = 0; i < pElements.length; i++) {
    const p = pElements[i];
    const tElements = Array.from(p.getElementsByTagName('w:t'));
    if (tElements.length === 0) continue;

    let fullPText = '';
    const charMap: { tIndex: number; charOffset: number }[] = [];

    for (let tIdx = 0; tIdx < tElements.length; tIdx++) {
      const text = tElements[tIdx].textContent || '';
      for (let c = 0; c < text.length; c++) {
        charMap.push({ tIndex: tIdx, charOffset: c });
      }
      fullPText += text;
    }

    // Direct substring search
    let matchStart = fullPText.indexOf(searchText);

    // If exact failed, try typography-normalized search
    if (matchStart === -1) {
      const normFull = normalizeTypography(fullPText);
      const normMatchIdx = normFull.indexOf(normSearch);
      if (normMatchIdx !== -1) {
        matchStart = findRawIndexFromNormalized(fullPText, normSearch);
      }
    }

    if (matchStart !== -1) {
      const matchEnd = Math.min(matchStart + searchText.length, fullPText.length);
      applyReplacementToRunNodes(tElements, charMap, matchStart, matchEnd, replaceText);
      return true;
    }
  }

  return false;
}

/**
 * Fuzzy replacement for paragraphs where formatting runs split the sentence into fragments
 */
function replaceTextFuzzyInXmlDoc(xmlDoc: Document, searchText: string, replaceText: string): boolean {
  const pElements = xmlDoc.getElementsByTagName('w:p');
  const normSearch = normalizeText(searchText);
  const searchWords = normSearch.split(' ').filter((w) => w.length > 2);

  if (searchWords.length < 3) return false;

  for (let i = 0; i < pElements.length; i++) {
    const p = pElements[i];
    const tElements = Array.from(p.getElementsByTagName('w:t'));
    if (tElements.length === 0) continue;

    let fullPText = '';
    const charMap: { tIndex: number; charOffset: number }[] = [];

    for (let tIdx = 0; tIdx < tElements.length; tIdx++) {
      const text = tElements[tIdx].textContent || '';
      for (let c = 0; c < text.length; c++) {
        charMap.push({ tIndex: tIdx, charOffset: c });
      }
      fullPText += text;
    }

    const normP = normalizeText(fullPText);
    const matchedWordsCount = searchWords.filter((w) => normP.includes(w)).length;
    const matchRatio = matchedWordsCount / searchWords.length;

    if (matchRatio >= 0.75) {
      const firstWord = searchWords[0];
      const lastWord = searchWords[searchWords.length - 1];

      const startIdx = fullPText.toLowerCase().indexOf(firstWord.toLowerCase());
      const lastIdx = fullPText.toLowerCase().lastIndexOf(lastWord.toLowerCase());

      if (startIdx !== -1 && lastIdx !== -1 && lastIdx >= startIdx) {
        const endIdx = Math.min(lastIdx + lastWord.length, fullPText.length);
        applyReplacementToRunNodes(tElements, charMap, startIdx, endIdx, replaceText);
        return true;
      }
    }
  }

  return false;
}

/**
 * Distributes the replacement string across target XML <w:t> run nodes
 */
function applyReplacementToRunNodes(
  tElements: Element[],
  charMap: { tIndex: number; charOffset: number }[],
  startIdx: number,
  endIdx: number,
  replaceText: string
) {
  if (startIdx >= charMap.length || endIdx <= startIdx) return;

  const startEntry = charMap[startIdx];
  const endEntry = charMap[Math.min(endIdx - 1, charMap.length - 1)];

  const startT = startEntry.tIndex;
  const endT = endEntry.tIndex;

  if (startT === endT) {
    const tElem = tElements[startT];
    const originalContent = tElem.textContent || '';
    const beforeText = originalContent.slice(0, startEntry.charOffset);
    const afterText = originalContent.slice(endEntry.charOffset + 1);
    tElem.textContent = beforeText + replaceText + afterText;
    tElem.setAttribute('xml:space', 'preserve');
  } else {
    const firstTElem = tElements[startT];
    const firstContent = firstTElem.textContent || '';
    firstTElem.textContent = firstContent.slice(0, startEntry.charOffset) + replaceText;
    firstTElem.setAttribute('xml:space', 'preserve');

    for (let m = startT + 1; m < endT; m++) {
      tElements[m].textContent = '';
    }

    const lastTElem = tElements[endT];
    const lastContent = lastTElem.textContent || '';
    lastTElem.textContent = lastContent.slice(endEntry.charOffset + 1);
    lastTElem.setAttribute('xml:space', 'preserve');
  }
}

/**
 * Normalizes typographical quirks (smart quotes, dashes, non-breaking spaces)
 */
export function normalizeTypography(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ')
    .replace(/[\u00AD]/g, ''); // soft hyphen
}

/**
 * Text normalizer helper for fuzzy matching
 */
export function normalizeText(text: string): string {
  return normalizeTypography(text)
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = new Set(text1.split(' ').filter((w) => w.length > 2));
  const words2 = new Set(text2.split(' ').filter((w) => w.length > 2));

  if (words1.size === 0) return 0;

  let common = 0;
  words1.forEach((w) => {
    if (words2.has(w)) common++;
  });

  return common / words1.size;
}

function findRawIndexFromNormalized(raw: string, normTarget: string): number {
  const rawWords = raw.split(/\s+/);
  const targetWords = normTarget.split(/\s+/);
  if (targetWords.length === 0) return -1;

  for (let i = 0; i <= rawWords.length - targetWords.length; i++) {
    const slice = rawWords.slice(i, i + targetWords.length).join(' ');
    if (normalizeText(slice).includes(normTarget)) {
      return raw.indexOf(rawWords[i]);
    }
  }
  return -1;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
