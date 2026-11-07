/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DocumentParagraph,
  DocumentTable,
  DocumentImage,
  DocumentStructure,
  DocumentSection,
} from '../types/document';

/**
 * Analyzes paragraphs, tables, and images in a document to classify their academic roles
 * without modifying, truncating, or omitting any single paragraph or character.
 */
export function analyzeDocumentStructure(
  paragraphs: DocumentParagraph[],
  tables: DocumentTable[],
  images: DocumentImage[]
): DocumentStructure {
  let title = '';
  const authors: string[] = [];
  const affiliations: string[] = [];
  const emails: string[] = [];
  let abstractId: string | undefined;
  let abstractText: string | undefined;
  const keywords: string[] = [];
  const sections: DocumentSection[] = [];
  const references: string[] = [];

  let currentSection: DocumentSection | null = null;
  let hasPassedAbstract = false;
  let inReferenceSection = false;

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const headingPattern = /^(\d+(\.\d+)*|[IVXLCDM]+\.)\s+/i;
  const standardHeadingKeywords = [
    'PENDAHULUAN',
    'INTRODUCTION',
    'METODE',
    'METHOD',
    'METODOLOGI',
    'HASIL',
    'RESULTS',
    'PEMBAHASAN',
    'DISCUSSION',
    'HASIL DAN PEMBAHASAN',
    'KESIMPULAN',
    'CONCLUSION',
    'SIMPULAN',
    'SARAN',
    'DAFTAR PUSTAKA',
    'REFERENCES',
    'UCAPAN TERIMA KASIH',
    'ACKNOWLEDGMENT',
    'KAJIAN TEORI',
    'LANDASAN TEORI',
    'LAMPIRAN',
    'APPENDIX',
  ];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const trimmed = p.text.trim();
    if (!trimmed) {
      p.detectedRole = 'body_paragraph';
      if (currentSection) currentSection.paragraphs.push(p);
      continue;
    }

    const upper = trimmed.toUpperCase();

    // 1. Identify Title (First substantive heading or first paragraph)
    if (!title && i < 5 && (p.headingLevel === 1 || p.alignment === 'center' || trimmed.length < 250)) {
      title = trimmed;
      p.detectedRole = 'title';
      continue;
    }

    // 2. Identify Abstract Header (Supports Indonesian & English abstract headings)
    if (
      upper === 'ABSTRAK' ||
      upper === 'ABSTRACT' ||
      upper.startsWith('ABSTRAK:') ||
      upper.startsWith('ABSTRACT:') ||
      upper.startsWith('ABSTRAK -') ||
      upper.startsWith('ABSTRACT -')
    ) {
      p.detectedRole = 'abstract_label';
      if (!abstractId) abstractId = p.id;
      hasPassedAbstract = true;

      // In case abstract body is on the same line
      if (trimmed.length > 30) {
        abstractText = trimmed.replace(/^(ABSTRAK|ABSTRACT)\s*[:.-]?\s*/i, '');
        p.detectedRole = 'abstract_body';
      }
      continue;
    }

    // Abstract Body (Following abstract label or before keywords)
    if (
      hasPassedAbstract &&
      !keywords.length &&
      !upper.startsWith('KATA KUNCI') &&
      !upper.startsWith('KEYWORDS') &&
      !headingPattern.test(trimmed) &&
      !standardHeadingKeywords.some((kw) => upper === kw || upper.startsWith(kw + ' ')) &&
      sections.length === 0 &&
      trimmed.length > 60
    ) {
      p.detectedRole = 'abstract_body';
      if (!abstractText) abstractText = trimmed;
      else abstractText += '\n\n' + trimmed;
      continue;
    }

    // 3. Keywords / Kata Kunci
    if (upper.startsWith('KATA KUNCI') || upper.startsWith('KEYWORDS') || upper.startsWith('KEY WORDS')) {
      p.detectedRole = 'keywords';
      const kwContent = trimmed.replace(/^(KATA KUNCI|KEYWORDS|KEY WORDS)\s*[:.-]?\s*/i, '');
      const parts = kwContent.split(/[;,]/).map((k) => k.trim()).filter(Boolean);
      keywords.push(...parts);
      hasPassedAbstract = true;
      continue;
    }

    // 4. Pre-abstract elements (Authors, Affiliations, Emails)
    if (!hasPassedAbstract && title) {
      // Check for email
      const matchedEmails = trimmed.match(emailRegex);
      if (matchedEmails && matchedEmails.length > 0) {
        emails.push(...matchedEmails);
        p.detectedRole = 'email';
        continue;
      }

      // Check affiliation vs author name
      const isAffiliation =
        /(universitas|jurusan|fakultas|institut|sekolah tinggi|laboratorium|politeknik|departemen|department|faculty|university|center|brin|indonesia|prodi|program studi|jl\.|jalan|kotak pos|po box)/i.test(
          trimmed
        );

      if (isAffiliation) {
        affiliations.push(trimmed);
        p.detectedRole = 'affiliation';
      } else {
        const names = trimmed.split(/[,&]/).map((n) => n.trim()).filter(Boolean);
        authors.push(...names);
        p.detectedRole = 'author';
      }
      continue;
    }

    // 5. References Section
    if (
      upper === 'DAFTAR PUSTAKA' ||
      upper === 'REFERENCES' ||
      upper.startsWith('DAFTAR PUSTAKA') ||
      upper.startsWith('REFERENCES') ||
      upper === 'BIBLIOGRAPHY'
    ) {
      inReferenceSection = true;
      p.detectedRole = 'reference_header';

      currentSection = {
        id: `sec-${sections.length + 1}`,
        heading: trimmed,
        level: 1,
        paragraphs: [p],
        tables: [],
        images: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (inReferenceSection) {
      // Check if another section starts after references (e.g. Lampiran / Appendices)
      const isPostReferenceHeading = standardHeadingKeywords.some(
        (kw) => (upper === kw || upper.startsWith(kw + ' ')) && kw !== 'DAFTAR PUSTAKA' && kw !== 'REFERENCES'
      );

      if (isPostReferenceHeading) {
        inReferenceSection = false;
      } else {
        p.detectedRole = 'reference_item';
        references.push(trimmed);
        if (currentSection) currentSection.paragraphs.push(p);
        continue;
      }
    }

    // 6. Section Headings (Numbered or Standard Keywords)
    const isNumberedHeading = headingPattern.test(trimmed);
    const isKeywordHeading = standardHeadingKeywords.some(
      (kw) => upper === kw || upper.startsWith(kw + ' ') || upper.startsWith(kw + ':')
    );
    const isHeadingByStyle = (p.headingLevel && p.headingLevel > 0) || (p.styleName && /heading/i.test(p.styleName));
    const isShortCaps = upper === trimmed && trimmed.length < 80 && !trimmed.endsWith('.');

    if ((isNumberedHeading || isKeywordHeading || isHeadingByStyle || isShortCaps) && trimmed.length < 100) {
      let level = 1;
      if (trimmed.match(/^\d+\.\d+\.\d+/)) level = 3;
      else if (trimmed.match(/^\d+\.\d+/)) level = 2;
      else if (trimmed.match(/^\d+\./) || isKeywordHeading || p.headingLevel === 1) level = 1;
      else if (p.headingLevel === 2) level = 2;
      else if (p.headingLevel === 3) level = 3;

      p.detectedRole = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3';

      currentSection = {
        id: `sec-${sections.length + 1}`,
        heading: trimmed,
        level,
        paragraphs: [p],
        tables: [],
        images: [],
      };
      sections.push(currentSection);
      continue;
    }

    // 7. Captions
    if (/^(Tabel|Table)\s+\d+/i.test(trimmed)) {
      p.detectedRole = 'table_caption';
      if (currentSection) currentSection.paragraphs.push(p);
      continue;
    }

    if (/^(Gambar|Figure|Fig\.)\s+\d+/i.test(trimmed)) {
      p.detectedRole = 'figure_caption';
      if (currentSection) currentSection.paragraphs.push(p);
      continue;
    }

    // 8. Normal Body Paragraph
    p.detectedRole = 'body_paragraph';
    if (!currentSection) {
      currentSection = {
        id: `sec-${sections.length + 1}`,
        heading: 'BAGIAN AWAL',
        level: 1,
        paragraphs: [],
        tables: [],
        images: [],
      };
      sections.push(currentSection);
    }
    currentSection.paragraphs.push(p);
  }

  // Associate tables and images
  if (sections.length > 0) {
    sections[0].tables.push(...tables);
    sections[0].images.push(...images);
  }

  return {
    title,
    authors,
    affiliations,
    emails,
    abstractId,
    abstractText,
    keywords,
    sections,
    references,
  };
}
