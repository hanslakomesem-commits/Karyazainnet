import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Footer,
  PageNumber,
  FootnoteReferenceRun,
  LineRuleType,
} from 'docx';
import { saveAs } from 'file-saver';
import { JournalArticle, FootnoteItem } from '../types/journal';
import { cleanSectionContent } from './textCleaner';

/**
 * Sanitizes strings by removing XML-incompatible ASCII control characters,
 * which often cause "Word found unreadable content / cannot open file" errors.
 */
function sanitizeXmlText(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Creates and downloads a Microsoft Word (.docx) document formatted with universal
 * compatibility across all versions of Word (Word 2007-2024, Word 365, Word for Mac,
 * WPS Office, LibreOffice, and Word Online).
 * Standard: Times New Roman 12pt, 1.5 Line Spacing, 3cm Margins, Native Page Footnotes.
 */
export async function buildJournalDocx(article: JournalArticle): Promise<Blob> {
  const {
    metadata,
    abstract,
    pendahuluan,
    metode,
    hasil,
    pembahasan,
    kesimpulan,
    daftarPustaka,
    footnotes,
  } = article;

  // Helper to convert footnote text with *Judul Buku* into TextRun[] with proper italics
  const buildFootnoteTextRuns = (text: string): TextRun[] => {
    const runs: TextRun[] = [];
    // Split by *italic* segments
    const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
    for (const part of parts) {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        runs.push(
          new TextRun({
            text: part.slice(1, -1),
            font: 'Times New Roman',
            size: 20, // 10pt standard academic footnote size
            italics: true,
          })
        );
      } else {
        runs.push(
          new TextRun({
            text: part,
            font: 'Times New Roman',
            size: 20, // 10pt standard academic footnote size
          })
        );
      }
    }
    if (runs.length === 0) {
      runs.push(
        new TextRun({
          text,
          font: 'Times New Roman',
          size: 20,
        })
      );
    }
    return runs;
  };

  // 1. Normalize and clean footnotes
  const validFootnotes: { number: number; text: string; sectionId?: string; anchorWord?: string }[] = [];
  const docxFootnotesMap: Record<number, { children: Paragraph[] }> = {};

  if (Array.isArray(footnotes) && footnotes.length > 0) {
    footnotes.forEach((fn, idx) => {
      const fnNum = idx + 1; // Strict 1-based sequential numbering
      const cleanText = sanitizeXmlText(fn.text);
      if (cleanText.trim().length > 0) {
        validFootnotes.push({
          number: fnNum,
          text: cleanText,
          sectionId: fn.sectionId || 'pendahuluan',
          anchorWord: fn.anchorWord ? sanitizeXmlText(fn.anchorWord) : undefined,
        });

        // Footnote paragraph in Word footnotes.xml (with italicized book titles)
        docxFootnotesMap[fnNum] = {
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: buildFootnoteTextRuns(cleanText),
              spacing: { line: 240, after: 60, lineRule: LineRuleType.AUTO },
            }),
          ],
        };
      }
    });
  }

  // Set to track which footnotes have been attached in the document body
  // (CRITICAL: In OpenXML, each footnote must be referenced exactly once to prevent corruption)
  const attachedFootnoteNumbers = new Set<number>();

  // 2. Helper to split content text into paragraphs and safely attach footnotes
  const createFormattedParagraphs = (
    textBlock: string,
    sectionKey?: string,
    isFirstSection = false
  ): Paragraph[] => {
    if (!textBlock) return [];

    const rawLines = sanitizeXmlText(textBlock)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((line) => {
        if (!line) return false;
        const isMainSectionDuplicate = /^(?:#+\s*)?(?:(?:BAGIAN|BAB|[A-E])[\.\:]\s*)?(?:HASIL(?:\s+DAN)?\s+PEMBAHASAN|HASIL\s+PENELITIAN|HASIL|PEMBAHASAN|METODE(?:\s+PENELITIAN)?|PENDAHULUAN|KESIMPULAN(?:\s+DAN\s+SARAN)?)\s*[:\.\-–—]?$/i.test(line);
        return !isMainSectionDuplicate;
      });

    // Pre-calculate which paragraph index in this section should receive each footnote
    const sectionFootnotes = validFootnotes.filter(
      (fn) => !attachedFootnoteNumbers.has(fn.number) && fn.sectionId === sectionKey
    );

    // Identify non-heading body paragraph indices
    const bodyLineIndices: number[] = [];
    rawLines.forEach((line, idx) => {
      const isSubHeading =
        line.startsWith('#') ||
        (/^(\d+\.\d+|\b[1-9]\.)\s+/i.test(line) && line.length < 90 && !line.includes(';'));
      if (!isSubHeading) {
        bodyLineIndices.push(idx);
      }
    });

    // Map paragraph index -> footnotes to attach on that paragraph
    const lineFootnoteAssignments = new Map<number, typeof validFootnotes>();
    const unassignedFootnotes: typeof validFootnotes = [];

    sectionFootnotes.forEach((fn) => {
      let matchedLineIdx = -1;
      if (fn.anchorWord) {
        const lowerAnchor = fn.anchorWord.toLowerCase();
        matchedLineIdx = bodyLineIndices.find((bIdx) =>
          rawLines[bIdx].toLowerCase().includes(lowerAnchor)
        ) ?? -1;
      }
      if (matchedLineIdx !== -1) {
        const list = lineFootnoteAssignments.get(matchedLineIdx) || [];
        list.push(fn);
        lineFootnoteAssignments.set(matchedLineIdx, list);
      } else {
        unassignedFootnotes.push(fn);
      }
    });

    // Distribute any unassigned footnotes evenly across body paragraphs of this section
    if (unassignedFootnotes.length > 0 && bodyLineIndices.length > 0) {
      unassignedFootnotes.forEach((fn, idx) => {
        const targetBodyIdx = bodyLineIndices[idx % bodyLineIndices.length];
        const list = lineFootnoteAssignments.get(targetBodyIdx) || [];
        list.push(fn);
        lineFootnoteAssignments.set(targetBodyIdx, list);
      });
    }

    const paragraphs: Paragraph[] = [];

    rawLines.forEach((line, pIndex) => {
      // Check if line is a subsection header (e.g. "3.1 Analisis Data" or "### Subjudul")
      const isSubHeading =
        line.startsWith('#') ||
        (/^(\d+\.\d+|\b[1-9]\.)\s+/i.test(line) && line.length < 90 && !line.includes(';'));

      if (isSubHeading) {
        const cleanSubHeading = line.replace(/^#+\s*/, '');
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanSubHeading,
                font: 'Times New Roman',
                size: 24, // 12pt
                bold: true,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 120, line: 360, lineRule: LineRuleType.AUTO },
          })
        );
        return;
      }

      // Build text runs and attach assigned footnotes for this paragraph
      const children: (TextRun | FootnoteReferenceRun)[] = [];
      const assignedForLine = (lineFootnoteAssignments.get(pIndex) || []).filter(
        (fn) => !attachedFootnoteNumbers.has(fn.number)
      );

      if (assignedForLine.length > 0) {
        let remainingLine = line;
        const endOfParagraphFootnotes: number[] = [];

        assignedForLine.forEach((fn) => {
          if (
            fn.anchorWord &&
            remainingLine.toLowerCase().includes(fn.anchorWord.toLowerCase())
          ) {
            const anchorIndex = remainingLine.toLowerCase().indexOf(fn.anchorWord.toLowerCase());
            const before = remainingLine.substring(0, anchorIndex + fn.anchorWord.length);
            remainingLine = remainingLine.substring(anchorIndex + fn.anchorWord.length);

            children.push(
              new TextRun({
                text: before,
                font: 'Times New Roman',
                size: 24,
              })
            );
            children.push(new FootnoteReferenceRun(fn.number));
            attachedFootnoteNumbers.add(fn.number);
          } else {
            endOfParagraphFootnotes.push(fn.number);
          }
        });

        if (remainingLine.length > 0) {
          children.push(
            new TextRun({
              text: remainingLine,
              font: 'Times New Roman',
              size: 24,
            })
          );
        }

        endOfParagraphFootnotes.forEach((fnNum) => {
          if (!attachedFootnoteNumbers.has(fnNum)) {
            children.push(new FootnoteReferenceRun(fnNum));
            attachedFootnoteNumbers.add(fnNum);
          }
        });
      } else {
        // Standard text line
        children.push(
          new TextRun({
            text: line,
            font: 'Times New Roman',
            size: 24,
          })
        );
      }

      paragraphs.push(
        new Paragraph({
          children,
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 }, // 1.27 cm (0.5 inch) first line indent
          spacing: { after: 140, line: 360, lineRule: LineRuleType.AUTO }, // 1.5 Line Spacing
        })
      );
    });

    return paragraphs;
  };

  // Build document body elements
  const docChildren: Paragraph[] = [];

  // 1. JUDUL ARTIKEL
  const judulClean = sanitizeXmlText(metadata?.judul || 'ARTIKEL ILMIAH').toUpperCase();
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: judulClean,
          font: 'Times New Roman',
          size: 28, // 14pt
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 240, line: 360, lineRule: LineRuleType.AUTO },
    })
  );

  // 2. METADATA PENULIS (Nama, Prodi, Instansi, Email)
  const namaClean = sanitizeXmlText(metadata?.nama || 'Penulis');
  const prodiClean = sanitizeXmlText(metadata?.prodi || '');
  const instansiClean = sanitizeXmlText(metadata?.instansi || '');
  const emailClean = sanitizeXmlText(metadata?.email || '');

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: namaClean,
          font: 'Times New Roman',
          size: 24, // 12pt
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 240, lineRule: LineRuleType.AUTO },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${prodiClean}${instansiClean ? ', ' + instansiClean : ''}`,
          font: 'Times New Roman',
          size: 22, // 11pt
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: emailClean ? 60 : 360, line: 240, lineRule: LineRuleType.AUTO },
    })
  );

  if (emailClean && emailClean !== '-') {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Email: ${emailClean}`,
            font: 'Times New Roman',
            size: 22,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360, line: 240, lineRule: LineRuleType.AUTO },
      })
    );
  }

  // 3. ABSTRAK (BAHASA INDONESIA)
  const abstrakIndoClean = sanitizeXmlText(abstract?.abstrakIndo || '');
  const keywordsIndoClean = Array.isArray(abstract?.keywordsIndo)
    ? abstract.keywordsIndo.map(sanitizeXmlText).join(', ')
    : sanitizeXmlText(abstract?.keywordsIndo || '');

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ABSTRAK',
          font: 'Times New Roman',
          size: 24,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 120, line: 360, lineRule: LineRuleType.AUTO },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: abstrakIndoClean,
          font: 'Times New Roman',
          size: 22, // 11pt for abstract
        }),
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120, line: 288, lineRule: LineRuleType.AUTO }, // 1.15 line spacing for abstract
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Kata Kunci: ',
          font: 'Times New Roman',
          size: 22,
          bold: true,
          italics: true,
        }),
        new TextRun({
          text: keywordsIndoClean,
          font: 'Times New Roman',
          size: 22,
          italics: true,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 240, line: 288, lineRule: LineRuleType.AUTO },
    })
  );

  // 4. ABSTRACT (ENGLISH)
  const abstrakEnglishClean = sanitizeXmlText(abstract?.abstrakEnglish || '');
  const keywordsEnglishClean = Array.isArray(abstract?.keywordsEnglish)
    ? abstract.keywordsEnglish.map(sanitizeXmlText).join(', ')
    : sanitizeXmlText(abstract?.keywordsEnglish || '');

  if (abstrakEnglishClean) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ABSTRACT',
            font: 'Times New Roman',
            size: 24,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 120, line: 360, lineRule: LineRuleType.AUTO },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: abstrakEnglishClean,
            font: 'Times New Roman',
            size: 22,
            italics: true,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120, line: 288, lineRule: LineRuleType.AUTO },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Keywords: ',
            font: 'Times New Roman',
            size: 22,
            bold: true,
            italics: true,
          }),
          new TextRun({
            text: keywordsEnglishClean,
            font: 'Times New Roman',
            size: 22,
            italics: true,
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 360, line: 288, lineRule: LineRuleType.AUTO },
      })
    );
  }

  // Section Builder Function
  const addSection = (headingText: string, contentText: string, sectionKey: string, isFirst = false) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: headingText.toUpperCase(),
            font: 'Times New Roman',
            size: 24, // 12pt
            bold: true,
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 280, after: 140, line: 360, lineRule: LineRuleType.AUTO },
      })
    );

    const cleanedText = cleanSectionContent(contentText);
    const paras = createFormattedParagraphs(cleanedText, sectionKey, isFirst);
    docChildren.push(...paras);
  };

  // 5. SECTIONS (Format Huruf A, B, C...)
  addSection('A. PENDAHULUAN', pendahuluan, 'pendahuluan', true);
  addSection('B. METODE PENELITIAN', metode, 'metode');
  addSection('C. HASIL PENELITIAN', hasil, 'hasil');
  addSection('D. PEMBAHASAN', pembahasan, 'pembahasan');
  addSection('E. KESIMPULAN DAN SARAN', kesimpulan, 'kesimpulan');

  // Any leftover unattached footnotes are safely attached to avoid XML schema orphans
  validFootnotes.forEach((fn) => {
    if (!attachedFootnoteNumbers.has(fn.number)) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Catatan Kaki #${fn.number}] `,
              font: 'Times New Roman',
              size: 24,
            }),
            new FootnoteReferenceRun(fn.number),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 140, line: 360, lineRule: LineRuleType.AUTO },
        })
      );
      attachedFootnoteNumbers.add(fn.number);
    }
  });

  // 6. DAFTAR PUSTAKA
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'DAFTAR PUSTAKA',
          font: 'Times New Roman',
          size: 24,
          bold: true,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 360, after: 180, line: 360, lineRule: LineRuleType.AUTO },
    })
  );

  if (Array.isArray(daftarPustaka) && daftarPustaka.length > 0) {
    daftarPustaka.forEach((refItem) => {
      const cleanRef = sanitizeXmlText(refItem);
      if (cleanRef.trim().length > 0) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanRef,
                font: 'Times New Roman',
                size: 24,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 720, hanging: 720 }, // Standard APA hanging indent
            spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO },
          })
        );
      }
    });
  } else if (typeof daftarPustaka === 'string') {
    const refs = createFormattedParagraphs(daftarPustaka, 'daftarPustaka');
    docChildren.push(...refs);
  }

  // 7. Create Document with A4 & Universal Word Compatibility Settings
  const doc = new Document({
    creator: 'ZAIN.NET - Sistem Artikel Jurnal Ilmiah',
    title: sanitizeXmlText(metadata?.judul || 'Artikel Ilmiah'),
    description: 'Artikel Jurnal Ilmiah Terakreditasi Format Standard DOCX',
    footnotes: Object.keys(docxFootnotesMap).length > 0 ? docxFootnotesMap : undefined,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 Width in twips (210mm)
              height: 16838, // A4 Height in twips (297mm)
            },
            margin: {
              top: 1701, // 3cm in dxa (1 cm = 567 dxa)
              bottom: 1701, // 3cm
              left: 1701, // 3cm
              right: 1701, // 3cm
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Times New Roman',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  // 8. Generate safe universal Blob
  const blob = await Packer.toBlob(doc);
  return new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Downloads the Journal Article as a DOCX file directly using saveAs.
 */
export async function exportJournalToDocx(article: JournalArticle): Promise<void> {
  const compliantDocxBlob = await buildJournalDocx(article);
  const rawTitle = article.metadata?.judul ? sanitizeXmlText(article.metadata.judul) : 'Artikel_Ilmiah';
  const cleanFileName = rawTitle
    .slice(0, 45)
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_');

  saveAs(compliantDocxBlob, `Artikel_Jurnal_${cleanFileName || 'Ilmiah'}.docx`);
}
