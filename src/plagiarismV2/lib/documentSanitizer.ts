import type { PlagiarismSegment } from '../types';
import { extractCitationsFromText, detectBibliographyBoundary, isBibliographyEntry } from './citationSafety';

export interface ChapterInfo {
  id: string;
  name: string;
  shortLabel: string;
}

export const CHAPTER_DEFINITIONS: ChapterInfo[] = [
  { id: 'bab_1', name: 'BAB I: PENDAHULUAN', shortLabel: 'Bab I' },
  { id: 'bab_2', name: 'BAB II: TINJAUAN PUSTAKA', shortLabel: 'Bab II' },
  { id: 'bab_3', name: 'BAB III: METODE PENELITIAN', shortLabel: 'Bab III' },
  { id: 'bab_4', name: 'BAB IV: HASIL & PEMBAHASAN', shortLabel: 'Bab IV' },
  { id: 'bab_5', name: 'BAB V: PENUTUP & KESIMPULAN', shortLabel: 'Bab V' },
  { id: 'other', name: 'BAGIAN LAIN / UMUM', shortLabel: 'Lainnya' },
];

/**
 * Detects if a text fragment represents a mathematical formula, LaTeX notation, or equation
 */
export function isMathematicalFormula(text: string): boolean {
  const trimmed = text.trim();
  // LaTeX tokens or statistical formulas
  const mathPatterns = [
    /\\[a-zA-Z]+/, // e.g. \alpha, \sum, \frac
    /\b(?:p-value|R-squared|R\^2|F-count|t-count|alpha\s*=\s*0\.05|chi-square)\b/i,
    /^[A-Za-z]\s*=\s*[A-Za-z0-9\+\-\*\/\(\)\^\s\.]+\b/, // e.g. Y = a + b1X1 + b2X2 + e
    /[\+\-\*\/=><]\s*\d+[\.,]\d+/,
    /\b(?:dx\/dt|\int|\sum|\prod|\sqrt)\b/,
    /\b(?:Sig\.\s*\(2-tailed\)|Cronbach['’]?s\s*Alpha)\b/i,
  ];

  return mathPatterns.some((pat) => pat.test(trimmed));
}

/**
 * Detects if a line represents a table row, matrix, or chart caption
 */
export function isTableOrCaption(text: string): boolean {
  const trimmed = text.trim();

  // Captions: Tabel 1.1, Gambar 2.3, Grafik 4.1, Bagan 3.2
  if (/^(?:Tabel|Table|Gambar|Figure|Grafik|Chart|Bagan|Diagram)\s+\d+(?:[\.\-]\d+)?\s*[:\.]/i.test(trimmed)) {
    return true;
  }

  // Matrix or table separators
  if ((trimmed.match(/\|/g) || []).length >= 2) return true;
  if ((trimmed.match(/\t/g) || []).length >= 2) return true;
  if (/^(?:No\.|Nama|Kategori|Variabel|Nilai|Frekuensi|Persentase|\%)\s+(?:No\.|Nama|Kategori|Variabel|Nilai)/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Detects if a line is a repeating header, footer, or page number artifact
 */
export function isHeaderFooterOrPageArtifact(line: string): boolean {
  const trimmed = line.trim();

  // Page numbers like "12", "- 14 -", "Halaman 12", "Page 15 of 90", "Halaman 12 dari 80"
  if (/^(?:-?\s*\d+\s*-?|halaman\s+\d+(?:\s+dari\s+\d+)?|page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\/\s*\d+)$/i.test(trimmed)) {
    return true;
  }

  // Turnitin report header lines
  if (/^(?:PRIMARY SOURCES|SIMILARITY INDEX|INTERNET SOURCES|PUBLICATIONS|STUDENT PAPERS|ORIGINALITY REPORT|Turnitin\s+Originality\s+Report)/i.test(trimmed)) {
    return true;
  }

  // Recurring thesis header banners e.g. "UNIVERSITAS ... SKRIPSI ... TAHUN 2024"
  if (/^(?:FAKULTAS\s+[A-Z\s]+|UNIVERSITAS\s+[A-Z\s]+|SKRIPSI\s+MAHASISWA|PROGRAM\s+STUDI\s+[A-Z\s]+)$/i.test(trimmed) && trimmed.length < 50) {
    return true;
  }

  // Pure citation match percentage indicators like "1%", "< 1%", "5%"
  if (/^<?\s*\d+\s*\%$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Classifies which Chapter (Bab I - Bab V) a segment or paragraph belongs to
 */
export function classifyChapter(
  text: string,
  locationLabel?: string,
  index = 0,
  total = 1
): { chapterId: string; chapterName: string } {
  const combined = `${locationLabel || ''} ${text}`.toLowerCase();

  if (combined.includes('bab 1') || combined.includes('bab i') || combined.includes('pendahuluan') || combined.includes('latar belakang')) {
    return { chapterId: 'bab_1', chapterName: 'BAB I: PENDAHULUAN' };
  }

  if (combined.includes('bab 2') || combined.includes('bab ii') || combined.includes('tinjauan pustaka') || combined.includes('landasan teori') || combined.includes('kerangka pemikiran')) {
    return { chapterId: 'bab_2', chapterName: 'BAB II: TINJAUAN PUSTAKA' };
  }

  if (combined.includes('bab 3') || combined.includes('bab iii') || combined.includes('metode') || combined.includes('metodologi') || combined.includes('desain penelitian')) {
    return { chapterId: 'bab_3', chapterName: 'BAB III: METODE PENELITIAN' };
  }

  if (combined.includes('bab 4') || combined.includes('bab iv') || combined.includes('hasil') || combined.includes('pembahasan') || combined.includes('analisis data') || combined.includes('temuan')) {
    return { chapterId: 'bab_4', chapterName: 'BAB IV: HASIL & PEMBAHASAN' };
  }

  if (combined.includes('bab 5') || combined.includes('bab v') || combined.includes('kesimpulan') || combined.includes('penutup') || combined.includes('saran')) {
    return { chapterId: 'bab_5', chapterName: 'BAB V: PENUTUP & KESIMPULAN' };
  }

  // Fallback estimation based on relative position in document
  if (total > 0) {
    const ratio = index / total;
    if (ratio < 0.2) return { chapterId: 'bab_1', chapterName: 'BAB I: PENDAHULUAN' };
    if (ratio < 0.45) return { chapterId: 'bab_2', chapterName: 'BAB II: TINJAUAN PUSTAKA' };
    if (ratio < 0.6) return { chapterId: 'bab_3', chapterName: 'BAB III: METODE PENELITIAN' };
    if (ratio < 0.85) return { chapterId: 'bab_4', chapterName: 'BAB IV: HASIL & PEMBAHASAN' };
    return { chapterId: 'bab_5', chapterName: 'BAB V: PENUTUP & KESIMPULAN' };
  }

  return { chapterId: 'other', chapterName: 'BAGIAN LAIN / UMUM' };
}

/**
 * Sanitizes and enriches extracted segments:
 * - Detects citations (APA, IEEE, Harvard)
 * - Identifies tables, mathematical formulas, and captions
 * - Assigns Chapter IDs (Bab I s.d. Bab V)
 * - Excludes bibliography if requested
 */
export function sanitizeAndEnrichSegments(
  rawSegments: PlagiarismSegment[],
  options: { excludeBibliography?: boolean } = { excludeBibliography: true }
): PlagiarismSegment[] {
  const enriched: PlagiarismSegment[] = [];

  rawSegments.forEach((seg, idx) => {
    const originalText = seg.originalText || '';

    // Check if line is header/footer artifact
    if (isHeaderFooterOrPageArtifact(originalText)) {
      return; // filter out page numbers & turnitin headers
    }

    // Check if bibliography
    const isBib = isBibliographyEntry(originalText) || originalText.toLowerCase().startsWith('daftar pustaka');
    if (isBib && options.excludeBibliography) {
      return; // automatically exclude bibliography
    }

    // Detect citations
    const citations = extractCitationsFromText(originalText);

    // Detect mathematical formulas & tables
    const isFormula = isMathematicalFormula(originalText);
    const isTable = isTableOrCaption(originalText);

    let specialContentType: PlagiarismSegment['specialContentType'] = undefined;
    if (isFormula) specialContentType = 'formula';
    else if (isTable) specialContentType = 'table';
    else if (isBib) specialContentType = 'bibliography';

    // Classify chapter
    const { chapterId, chapterName } = classifyChapter(
      originalText,
      seg.locationLabel,
      idx,
      rawSegments.length
    );

    enriched.push({
      ...seg,
      chapterId: seg.chapterId || chapterId,
      chapterName: seg.chapterName || chapterName,
      citationsDetected: citations,
      isSpecialContent: isFormula || isTable || isBib,
      specialContentType,
      // Initialize version history if not already set
      history: seg.history || [
        {
          id: `hist-orig-${seg.id}`,
          timestamp: Date.now(),
          text: seg.originalText,
          technique: 'Naskah Asli (Original)',
          author: 'original',
        },
      ],
    });
  });

  return enriched;
}
