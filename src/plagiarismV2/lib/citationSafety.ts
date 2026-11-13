import type { CitationDetail } from '../types';

/**
 * Regular expressions for detecting academic citations in various citation styles
 */
export const CITATION_PATTERNS = [
  // 1. APA / Harvard Parenthetical with pages e.g. (Sugiyono, 2021: 45), (Smith & Jones, 2020: 12-15), (Mertokusumo, 2019, hlm. 55)
  {
    format: 'APA' as const,
    regex: /\(([A-Z][a-zA-Z\s\.,&]+(?:et\s+al\.?)?),\s*(\d{4})(?:[:,\s]+(?:hlm\.?|hal\.?|p\.?|pp\.?)?\s*(\d+(?:[-–]\d+)?))?\)/g,
  },
  // 2. APA Narrative Citations e.g. Menurut Sugiyono (2021), Berdasarkan Smith et al. (2020: 45)
  {
    format: 'APA' as const,
    regex: /\b([A-Z][a-zA-Z\s]+(?:et\s+al\.?)?)\s*\(\s*(\d{4})(?:[:,\s]+(?:hlm\.?|hal\.?|p\.?|pp\.?)?\s*(\d+(?:[-–]\d+)?))?\s*\)/g,
  },
  // 3. IEEE / Vancouver Numeric Citations e.g. [1], [1, 2], [1-4], [12, 15, 23]
  {
    format: 'IEEE' as const,
    regex: /\[\s*(\d+(?:\s*[-–,]\s*\d+)*)\s*\]/g,
  },
  // 4. Institutional Authors e.g. (World Health Organization [WHO], 2021), (Kementerian Keuangan RI, 2022)
  {
    format: 'APA' as const,
    regex: /\(([A-Z][a-zA-Z\s\.,\-\/]+(?:RI|Indonesia|WHO|BPS|KPK|MK|MA)?(?:\s*\[[A-Z]+\])?),\s*(\d{4})\)/g,
  },
  // 5. Indonesian Statutory & Legal Citations e.g. UU No. 19 Tahun 2016, Pasal 27 ayat (3) UU ITE
  {
    format: 'Peraturan' as const,
    regex: /\b(?:UU(?:\s+RI|\s+No\.?|\s+Nomor)?\s+\d+\s+Tahun\s+\d{4}|Pasal\s+\d+(?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z])?(?:\s+UU\s+[A-Za-z0-9\s]+)?|KUHP(?:idana)?|KUH\s*Perdata|UUD\s+(?:NRI\s+)?1945|Perpres\s+(?:No\.?|Nomor)?\s*\d+\/\d{4}|PP\s+(?:No\.?|Nomor)?\s*\d+\s+Tahun\s+\d{4})\b/gi,
  },
  // 6. Latin / Legal Maxims e.g. in vitro, stare decisis, lex specialis derogat legi generali
  {
    format: 'Legal' as const,
    regex: /\b(?:in\s+vitro|in\s+vivo|stare\s+decisis|mutatis\s+mutandis|lex\s+specialis\s+derogat\s+legi\s+generali|lex\s+superior|ultra\s+vires|p-value|alpha\s*=\s*0\.05)\b/gi,
  },
];

/**
 * Extracts all unique citation instances and details from a given text
 */
export function extractCitationsFromText(text: string): CitationDetail[] {
  if (!text) return [];

  const foundCitations = new Map<string, CitationDetail>();

  for (const { format, regex } of CITATION_PATTERNS) {
    const matcher = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(text)) !== null) {
      const raw = match[0].trim();
      if (!raw || foundCitations.has(raw)) continue;

      let author: string | undefined = undefined;
      let year: string | undefined = undefined;
      let pages: string | undefined = undefined;

      if (format === 'APA' && match.length >= 3) {
        author = match[1]?.trim();
        year = match[2]?.trim();
        pages = match[3]?.trim();
      } else if (format === 'IEEE' && match.length >= 2) {
        author = `Ref #${match[1]?.trim()}`;
      }

      foundCitations.set(raw, {
        raw,
        format,
        author,
        year,
        pages,
        sourceContext: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + raw.length + 20)),
      });
    }
  }

  return Array.from(foundCitations.values());
}

/**
 * Masks citations in text with safe replacement tokens before sending to AI
 * so that the AI model cannot alter or damage author names, years, or reference numbers.
 */
export function maskCitationsForAI(text: string): {
  maskedText: string;
  tokenMap: Record<string, string>;
  citations: CitationDetail[];
} {
  const citations = extractCitationsFromText(text);
  const tokenMap: Record<string, string> = {};
  let maskedText = text;

  // Sort citations by length descending to prevent sub-string collision
  const sorted = [...citations].sort((a, b) => b.raw.length - a.raw.length);

  sorted.forEach((cit, idx) => {
    const token = `__SAFE_CITATION_${idx}__`;
    tokenMap[token] = cit.raw;
    // Replace all exact occurrences with token
    maskedText = maskedText.split(cit.raw).join(token);
  });

  return { maskedText, tokenMap, citations };
}

/**
 * Restores masked citations back to original exact text
 */
export function unmaskCitationsFromAI(text: string, tokenMap: Record<string, string>): string {
  let restored = text;
  for (const [token, original] of Object.entries(tokenMap)) {
    // Replace token even if AI slightly wrapped it with quotes or spaces
    restored = restored.replace(new RegExp(escapeRegExp(token), 'g'), original);
  }
  return restored;
}

/**
 * Detects Bibliography / Reference section boundaries in documents
 */
export function detectBibliographyBoundary(text: string): {
  hasBibliography: boolean;
  mainBodyText: string;
  bibliographyText: string;
  boundaryIndex: number;
} {
  const bibHeaderRegex = /(?:\n\s*|\A)(?:BAB\s+[IVXLCDM]+\s*[\.\:\-]?\s*)?(?:DAFTAR\s+PUSTAKA|DAFTAR\s+REFERENSI|DAFTAR\s+RUJUKAN|REFERENCES|BIBLIOGRAPHY|KEPUSTAKAAN)\s*(?:\n|\r|\:)/i;
  const match = bibHeaderRegex.exec(text);

  if (match && match.index >= 0) {
    return {
      hasBibliography: true,
      mainBodyText: text.slice(0, match.index).trim(),
      bibliographyText: text.slice(match.index).trim(),
      boundaryIndex: match.index,
    };
  }

  return {
    hasBibliography: false,
    mainBodyText: text,
    bibliographyText: '',
    boundaryIndex: -1,
  };
}

/**
 * Determines if a single line or paragraph is part of a bibliography entry
 */
export function isBibliographyEntry(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 15) return false;

  // Patterns common in bibliography entries: Author (Year). Title. Publisher / URL
  const bibEntryPattern = /^[A-Z][a-zA-Z\s\.,\-]+\s*\(\s*\d{4}\s*\)\.?\s*[A-Z"“]/;
  const doiOrUrlPattern = /(?:https?:\/\/|doi\.org|doi:|Vol\.\s*\d+|No\.\s*\d+|hlm\.\s*\d+-\d+)/i;

  return bibEntryPattern.test(trimmed) || (doiOrUrlPattern.test(trimmed) && /\(\d{4}\)/.test(trimmed));
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
