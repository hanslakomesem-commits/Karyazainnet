/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { DocxAnalysis, ProcessingOptions, ScanFile, TargetDocument } from '../types/skripsi';
import { findHighestExistingLampiranNumber } from './docxParser';
import { getLampiranHeadings, replaceLampiranHeadingNumber } from './lampiranSequence'; // ZAINNET_MENU10_AUTO_SEQUENCE_V1
import { sanitizeXmlTags } from './xmlSanitizer';

export interface ModifierResult {
  docxBlob: Blob;
  logs: string[];
}

// Section helpers:
// In Word OpenXML (ISO/IEC 29500), a <w:sectPr> inside a <w:pPr> defines the layout (margins, orientation)
// of the SECTION ENDING at that paragraph (the section preceding this break).
// Therefore:
// - To isolate Cover 1 & Cover 2 so their original margins are NEVER touched:
//   The section break BEFORE Persetujuan MUST retain the exact original Cover margins.
// - To give Persetujuan & Pengesahan (or Keaslian, or Lampiran) a 2 cm margin:
//   The section break AT THE END of those pages MUST specify the 2 cm margins.
// - The pages following that break then automatically continue with the document's original margins.
//
// 2 cm = 1134 twips.
const TWO_CM_TWIPS = 1134;

function setSectionMargins(sectPrXml: string, margins?: {
  top: number;
  right: number;
  bottom: number;
  left: number;
}): string {
  let sectPr = sectPrXml.trim();

  // Only edit margins; never modify an existing section's page numbering.
  if (margins) {
    const { top, right, bottom, left } = margins;
    if (/<w:pgMar\b[^>]*\/>/.test(sectPr)) {
      sectPr = sectPr.replace(/<w:pgMar\b[^>]*\/>/, (tag) => {
        let updated = tag;
        const setAttr = (name: string, value: number) => {
          const attr = new RegExp(`w:${name}="[^"]*"`);
          if (attr.test(updated)) {
            updated = updated.replace(attr, `w:${name}="${value}"`);
          } else {
            updated = updated.replace('/>', ` w:${name}="${value}"/>`);
          }
        };
        setAttr('top', top);
        setAttr('right', right);
        setAttr('bottom', bottom);
        setAttr('left', left);
        return updated;
      });
    } else {
      sectPr = sectPr.replace(
        '</w:sectPr>',
        `<w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}"/></w:sectPr>`
      );
    }
  }

  return sectPr;
}

// A copied w:pgNumType w:start="1" restarts numbering in Word. Margin-isolating
// section breaks must continue numbering instead of restarting.
function removeSectionPageNumberStart(sectPrXml: string): string {
  let cleaned = sectPrXml.replace(/<w:pgNumType\b[^>]*\/>/g, (tag) => {
    const withoutStart = tag.replace(/\s+w:start="[^"]*"/g, '');
    return /^<w:pgNumType\s*\/>$/.test(withoutStart) ? '' : withoutStart;
  });
  cleaned = cleaned.replace(/<w:pgNumType\b[\s\S]*?<\/w:pgNumType>/g, (tag) => {
    return tag.replace(/\s+w:start="[^"]*"/g, '');
  });
  return cleaned;
}

// When splitting a section, its different-first-page footer belongs only
// to the original FIRST fragment, not every inserted page or the remainder.
function removeSectionFirstPageOnly(sectPrXml: string): string {
  return sectPrXml.replace(/<w:titlePg\b[^>]*\/>/g, '').replace(/<w:titlePg\b[^>]*><\/w:titlePg>/g, '');
}

function normalizeSectPrForNextPage(
  sectPrXml: string,
  margins?: { top: number; right: number; bottom: number; left: number },
  forceKeepRestart?: string
): string {
  let sectPr = setSectionMargins(sectPrXml, margins);
  sectPr = removeSectionFirstPageOnly(sectPr);

  if (forceKeepRestart !== undefined) {
    if (/<w:pgNumType\b[^>]*\/>/.test(sectPr)) {
      sectPr = sectPr.replace(/<w:pgNumType\b[^>]*\/>/, (tag) => {
        if (/w:start="[^"]*"/.test(tag)) {
          return tag.replace(/w:start="[^"]*"/, `w:start="${forceKeepRestart}"`);
        }
        return tag.replace('/>', ` w:start="${forceKeepRestart}"/>`);
      });
    } else {
      sectPr = sectPr.replace('</w:sectPr>', `<w:pgNumType w:start="${forceKeepRestart}"/></w:sectPr>`);
    }
  } else {
    sectPr = removeSectionPageNumberStart(sectPr);
  }

  // Make this a Next Page section break while retaining other properties.
  if (/<w:type\b[^>]*\/>/.test(sectPr)) {
    sectPr = sectPr.replace(/<w:type\b[^>]*\/>/, '<w:type w:val="nextPage"/>');
  } else {
    sectPr = sectPr.replace('</w:sectPr>', '<w:type w:val="nextPage"/></w:sectPr>');
  }

  return sectPr;
}

function generateSectionBreakXml(
  originalSectPrXml: string,
  margins?: { top: number; right: number; bottom: number; left: number },
  forceKeepRestart?: string
): string {
  const sectPr = normalizeSectPrForNextPage(originalSectPrXml, margins, forceKeepRestart);
  return `<w:p><w:pPr>${sectPr}</w:pPr></w:p>`;
}

// Todos penulisan lampiran di bagian 5 lampiran diletakkan di pinggir kiri (w:jc w:val="left", ind left="0")
function generateCaptionXml(title: string): string {
  return `<w:p><w:pPr><w:spacing w:before="120" w:after="80" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/><w:ind w:left="0" w:right="0" w:firstLine="0"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>`;
}

// In Front of Text (wp:anchor, wrapNone, behindDoc="0") untuk Persetujuan, Pengesahan & Keaslian Tulisan
function generateInFrontOfTextDrawingXml(
  rId: string,
  docPrId: number,
  cx: number,
  cy: number,
  pictureName = 'Scan Document'
): string {
  const safeName = escapeXml(pictureName);
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr><w:r><w:rPr><w:noProof/><w:lang w:eastAsia="en-US"/></w:rPr><w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH><wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${docPrId}" name="${safeName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"><a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

// In Line with Text (wp:inline) untuk 5 Lampiran
function generateInlineDrawingXml(
  rId: string,
  docPrId: number,
  cx: number,
  cy: number,
  pictureName = 'Scan Document'
): string {
  const safeName = escapeXml(pictureName);
  return `<w:p><w:pPr><w:spacing w:before="60" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:noProof/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:eastAsia="en-US"/></w:rPr><w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${safeName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"><a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

// Alias untuk kompatibilitas
const generateDrawingXml = generateInlineDrawingXml;

function generatePageBreakXml(): string {
  return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function generateSpacingXml(): string {
  return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export async function applyScansToDocx(
  originalData: ArrayBuffer,
  analysis: DocxAnalysis,
  targets: TargetDocument[],
  scans: ScanFile[],
  options: ProcessingOptions
): Promise<ModifierResult> {
  const logs: string[] = [];
  logs.push('File Word berhasil dibaca');

  const zip = await JSZip.loadAsync(originalData);

  const docFile = zip.file('word/document.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  const contentTypesFile = zip.file('[Content_Types].xml');

  if (!docFile || !relsFile || !contentTypesFile) {
    throw new Error('Struktur file DOCX tidak lengkap atau korup.');
  }

  let docXml = await docFile.async('text');
  let relsXml = await relsFile.async('text');
  let contentTypesXml = await contentTypesFile.async('text');

  // Ensure content types has jpg, jpeg, png
  if (!contentTypesXml.includes('Extension="jpeg"')) {
    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'
    );
  }
  if (!contentTypesXml.includes('Extension="jpg"')) {
    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      '<Default Extension="jpg" ContentType="image/jpeg"/></Types>'
    );
  }
  if (!contentTypesXml.includes('Extension="png"')) {
    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      '<Default Extension="png" ContentType="image/png"/></Types>'
    );
  }
  zip.file('[Content_Types].xml', contentTypesXml);

  const rIdMatches = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10));
  let nextRIdNum = Math.max(...rIdMatches, 0) + 1;
  let nextDocPrId = 8800000;

  const scanMap = new Map<string, ScanFile>();
  scans.forEach((s) => scanMap.set(s.id, s));

  const bodyStartTag = '<w:body>';
  const bodyEndTag = '</w:body>';
  const bodyStart = docXml.indexOf(bodyStartTag) + bodyStartTag.length;
  const bodyEnd = docXml.lastIndexOf(bodyEndTag);

  const prefix = docXml.substring(0, bodyStart);
  let suffix = docXml.substring(bodyEnd);

  const elements = [...analysis.elements];

  // Section properties asli naskah (biasanya 4-3-4-3 cm) dari dokumen asli
  let defaultAcademicSectPr = '';
  for (let i = elements.length - 1; i >= 0; i--) {
    const match = elements[i].rawXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
    if (match) {
      defaultAcademicSectPr = match[0];
      break;
    }
  }
  if (!defaultAcademicSectPr) {
    defaultAcademicSectPr =
      docXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0] ||
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:code="9"/><w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  }

  // In OOXML a section's properties are stored at its END, not at its
  // beginning. The next sectPr after an element is the one applicable to it.
  const sectionClosures = elements.flatMap((element) => {
    const match = element.rawXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
    return match ? [{ index: element.index, xml: match[0] }] : [];
  });
  if (sectionClosures.length === 0 || sectionClosures[sectionClosures.length - 1].index !== elements.length) {
    sectionClosures.push({ index: elements.length, xml: defaultAcademicSectPr });
  }

  const sectionForPosition = (index: number) =>
    sectionClosures.find((section) => section.index >= index) || sectionClosures[sectionClosures.length - 1];

  const makeSectionBreak = (
    atElementIndex: number,
    margins?: { top: number; right: number; bottom: number; left: number },
    forceKeepRestart?: string
  ): string => {
    const source = sectionForPosition(atElementIndex);
    return generateSectionBreakXml(source.xml, margins, forceKeepRestart);
  };

  // A rendered page boundary is more reliable than a heading/endElementIndex.
  const findPageEnd = (startIndex: number): number => {
    const maxSearch = Math.min(startIndex + 40, elements.length - 1);
    for (let i = startIndex + 1; i <= maxSearch; i++) {
      const u = elements[i].text.toUpperCase();
      const isNextMajorHeading =
        elements[i].isHeading ||
        u.startsWith('HALAMAN ') ||
        u.startsWith('LEMBAR ') ||
        u.startsWith('BAB ') ||
        u.startsWith('LAMPIRAN ') ||
        u === 'ABSTRAK' ||
        u === 'KATA PENGANTAR' ||
        u.startsWith('DAFTAR ');

      if (isNextMajorHeading) {
        return i - 1;
      }

      if (elements[i].hasPageBreak || elements[i].hasSectPr) {
        // Also consume any consecutive trailing empty paragraphs before next real content!
        let end = i;
        while (
          end + 1 <= maxSearch &&
          !elements[end + 1].text.trim() &&
          !elements[end + 1].hasPageBreak &&
          !elements[end + 1].hasSectPr
        ) {
          end++;
        }
        return end;
      }
    }
    return Math.min(startIndex + 15, elements.length - 1);
  };

  // Use properties of the section at this particular insertion point,
  // not the last section of the entire document. This retains the correct
  // Roman/Arabic format and existing header/footer references.
  const sectionBreakCover = (atIndex: number) => makeSectionBreak(atIndex);
  const sectionBreakOriginalAcademic = (atIndex: number) => makeSectionBreak(atIndex);
  const sectionBreak2Cm = (atIndex: number) =>
    makeSectionBreak(atIndex, {
      top: TWO_CM_TWIPS,
      right: TWO_CM_TWIPS,
      bottom: TWO_CM_TWIPS,
      left: TWO_CM_TWIPS,
    });

  // Helper untuk membersihkan page break ganda atau paragraf kosong
  const stripRedundantPageBreaks = (xml: string): string => {
    return xml
      .replace(/<w:br\b[^>]*w:type="page"[^>]*\/>/g, '')
      .replace(/<w:pageBreakBefore\b[^>]*\/>/g, '')
      .replace(/<w:lastRenderedPageBreak\b[^>]*\/>/g, '');
  };

  const isXmlParagraphEmpty = (xml: string): boolean => {
    if (
      xml.includes('<w:drawing') ||
      xml.includes('<w:pict') ||
      xml.includes('<w:txbxContent') ||
      xml.includes('</w:txbxContent>') ||
      xml.includes('<w:tbl') ||
      xml.includes('<w:object') ||
      xml.includes('<mc:AlternateContent')
    ) {
      return false;
    }
    const textMatches = xml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
    if (!textMatches) return true;
    const combined = textMatches.map((t) => t.replace(/<[^>]+>/g, '')).join('').trim();
    return combined.length === 0;
  };

  const registerImage = async (
    scan: ScanFile,
    namePrefix: string
  ): Promise<{ rId: string; imageFileName: string }> => {
    const ext = scan.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    const imageFileName = `zain_${namePrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

    const arrayBuffer = await scan.file.arrayBuffer();
    zip.file(`word/media/${imageFileName}`, arrayBuffer);

    const rId = `rId${nextRIdNum++}`;
    const newRel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageFileName}"/>`;
    relsXml = relsXml.replace('</Relationships>', `${newRel}</Relationships>`);

    return { rId, imageFileName };
  };

  // Dimension calculator untuk foto In Front of Text (Persetujuan, Pengesahan & Keaslian Tulisan)
  // Berada di depan teks, mengambang di tengah halaman penuh (A4) tanpa merusak margin asli dokumen
  const calculateDimensionsInFrontOfText = (scan: ScanFile): { cx: number; cy: number } => {
    const maxCx = 7180000; // ~19.9 cm
    const maxCy = 10150000; // ~28.2 cm
    const ratio = scan.aspectRatio || (scan.width && scan.height ? scan.width / scan.height : 0.707);

    let cx = maxCx;
    let cy = Math.round(maxCx / ratio);
    if (cy > maxCy) {
      cy = maxCy;
      cx = Math.round(maxCy * ratio);
    }
    return { cx, cy };
  };

  // Dimension calculator untuk foto In Line with Text (5 Lampiran)
  // Menyesuaikan lebar cetak dalam margin asli naskah skripsi (standar 4 cm kiri, 3 cm kanan -> lebar ~14.0 cm)
  const calculateDimensionsInline = (
    scan: ScanFile,
    mode: 'half_page' | 'full_page_with_caption'
  ): { cx: number; cy: number } => {
    const targetCx = 5040000; // ~14.0 cm
    const ratio = scan.aspectRatio || (scan.width && scan.height ? scan.width / scan.height : 0.707);

    if (mode === 'half_page') {
      const maxCy = 3500000; // ~9.7 cm
      let cy = Math.round(targetCx / ratio);
      let cx = targetCx;
      if (cy > maxCy) {
        cy = maxCy;
        cx = Math.round(maxCy * ratio);
      }
      return { cx, cy };
    } else {
      const maxCy = 7200000; // ~20.0 cm agar judul + foto muat dalam 1 halaman
      let cy = Math.round(targetCx / ratio);
      let cx = targetCx;
      if (cy > maxCy) {
        cy = maxCy;
        cx = Math.round(maxCy * ratio);
      }
      return { cx, cy };
    }
  };

  interface ElementReplacement {
    startIndex: number;
    endIndex: number;
    replacementXml: string;
  }

  const replacements: ElementReplacement[] = [];

  // =========================================================================
  // 1. PROSES HALAMAN PERSETUJUAN & PENGESAHAN
  // Mode: In Front of Text (mengambang di atas teks halaman penuh)
  // Margin dokumen asli skripsi dipertahankan 100% tanpa diubah.
  // =========================================================================
  const persetujuanTarget = targets.find((t) => t.id === 'persetujuan');
  const pengesahanTarget = targets.find((t) => t.id === 'pengesahan');

  const persetujuanIdx = persetujuanTarget?.customTargetElementIndex ?? persetujuanTarget?.elementIndex;
  let pengesahanIdx = pengesahanTarget?.customTargetElementIndex ?? pengesahanTarget?.elementIndex;

  const scanPersetujuan = persetujuanTarget?.assignedScanId ? scanMap.get(persetujuanTarget.assignedScanId) : null;
  const scanPengesahan = pengesahanTarget?.assignedScanId ? scanMap.get(pengesahanTarget.assignedScanId) : null;

  // Never infer Pengesahan from Persetujuan: the document can contain
  // acknowledgements, blank sheets or other signed pages in between.
  const signedPagesForReplace = targets.filter((t) => t.category === 'signed_page' && t.assignedScanId);
  const signedAnchors = new Set<number>();
  for (const signedTarget of signedPagesForReplace) {
    const location = signedTarget.customTargetElementIndex ?? signedTarget.elementIndex;
    if (location === undefined || location < 0 || location >= elements.length) {
      throw new Error(`Posisi ${signedTarget.title} belum terdeteksi dengan pasti. Gunakan "Pilih Posisi Manual" di Bagian A sebelum memproses.`);
    }
    if (signedAnchors.has(location)) {
      throw new Error('Dua lembar tanda tangan memilih titik Word yang sama. Periksa dan koreksi posisi manual.');
    }
    signedAnchors.add(location);
  }

  // Always replace each signed page independently. The former combined
  // replacement deleted everything between Persetujuan and Pengesahan, which
  // could erase the Keaslian page and other unrelated content.

  // Individual fallbacks jika hanya salah satu yang diunggah
  if (scanPersetujuan && persetujuanIdx !== undefined) {
    const { rId } = await registerImage(scanPersetujuan, 'persetujuan');
    logs.push(`✓ Halaman Persetujuan disematkan foto asli (In Front of Text)`);
    const dim = calculateDimensionsInFrontOfText(scanPersetujuan);

    let rep = '';
    if (persetujuanIdx > 0) {
      rep += generatePageBreakXml();
    }
    rep += generateInFrontOfTextDrawingXml(rId, nextDocPrId++, dim.cx, dim.cy, 'Halaman Persetujuan');

    const pEnd = findPageEnd(persetujuanIdx);
    const origSectPr = elements.slice(persetujuanIdx, pEnd + 1).map((e) => e.rawXml).find((xml) => xml.includes('<w:sectPr'));
    if (origSectPr) {
      const matchSect = origSectPr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
      if (matchSect) rep += `<w:p><w:pPr>${matchSect[0]}</w:pPr></w:p>`;
    }

    replacements.push({
      startIndex: persetujuanIdx,
      endIndex: pEnd,
      replacementXml: rep,
    });
  }

  if (scanPengesahan && pengesahanIdx !== undefined) {
    const { rId } = await registerImage(scanPengesahan, 'pengesahan');
    logs.push(`✓ Halaman Pengesahan disematkan foto asli (In Front of Text)`);
    const dim = calculateDimensionsInFrontOfText(scanPengesahan);

    let rep = '';
    if (pengesahanIdx > 0) {
      rep += generatePageBreakXml();
    }
    rep += generateInFrontOfTextDrawingXml(rId, nextDocPrId++, dim.cx, dim.cy, 'Halaman Pengesahan');

    const pEnd = findPageEnd(pengesahanIdx);
    const origSectPr = elements.slice(pengesahanIdx, pEnd + 1).map((e) => e.rawXml).find((xml) => xml.includes('<w:sectPr'));
    if (origSectPr) {
      const matchSect = origSectPr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
      if (matchSect) rep += `<w:p><w:pPr>${matchSect[0]}</w:pPr></w:p>`;
    }

    replacements.push({
      startIndex: pengesahanIdx,
      endIndex: pEnd,
      replacementXml: rep,
    });
  }

  // =========================================================================
  // 2. PROSES SURAT PERNYATAAN KEASLIAN TULISAN
  // Mode: In Front of Text (mengambang di atas teks halaman penuh)
  // Margin dokumen asli skripsi dipertahankan 100% tanpa diubah.
  // =========================================================================
  const keaslianTarget = targets.find((t) => t.id === 'keaslian');

  const keaslianAnchor = keaslianTarget?.customTargetElementIndex ?? keaslianTarget?.elementIndex;
  if (keaslianTarget?.assignedScanId) {
    if (keaslianAnchor === undefined) {
      throw new Error('Posisi Surat Pernyataan Keaslian tidak ditemukan. Silakan klik Pilih Posisi Manual untuk dokumen ini.');
    }
    const scan = scanMap.get(keaslianTarget.assignedScanId);
    if (scan) {
      const { rId } = await registerImage(scan, 'keaslian');
      logs.push(`✓ Surat Pernyataan Keaslian Tulisan disematkan foto asli (In Front of Text)`);
      logs.push(`✓ Mempertahankan 100% margin asli file skripsi`);
      const dim = calculateDimensionsInFrontOfText(scan);

      let keaslianStart = keaslianAnchor;
      while (
        keaslianStart > 0 &&
        !elements[keaslianStart - 1].text.trim() &&
        !elements[keaslianStart - 1].hasSectPr &&
        !elements[keaslianStart - 1].hasPageBreak
      ) {
        keaslianStart--;
      }

      let rep = '';
      // CRITICAL: Keaslian adalah halaman mandiri. Wajib diawali pemisah halaman
      // agar tidak menumpuk atau menyatu dengan halaman sebelumnya.
      if (keaslianStart > 0) {
        rep += generatePageBreakXml();
      }
      rep += generateInFrontOfTextDrawingXml(rId, nextDocPrId++, dim.cx, dim.cy, 'Surat Pernyataan Keaslian Tulisan');

      let keaslianEnd = keaslianTarget.customTargetElementIndex !== undefined
        ? findPageEnd(keaslianAnchor)
        : (keaslianTarget.endElementIndex ?? findPageEnd(keaslianAnchor));
      while (
        keaslianEnd + 1 < elements.length &&
        !elements[keaslianEnd + 1].text.trim() &&
        !elements[keaslianEnd + 1].hasSectPr &&
        !elements[keaslianEnd + 1].hasPageBreak
      ) {
        keaslianEnd++;
      }

      const origSectPr = elements.slice(keaslianStart, keaslianEnd + 1).map((e) => e.rawXml).find((xml) => xml.includes('<w:sectPr'));
      if (origSectPr) {
        const matchSect = origSectPr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
        if (matchSect) {
          let sectXml = matchSect[0];
          if (sectXml.includes('w:val="continuous"')) {
            sectXml = sectXml.replace('w:val="continuous"', 'w:val="nextPage"');
          }
          rep += `<w:p><w:pPr>${sectXml}</w:pPr></w:p>`;
        }
      } else if (keaslianEnd + 1 < elements.length && !elements[keaslianEnd + 1].hasPageBreak) {
        // Trailing page break: pastikan teks halaman berikutnya tidak tumpeng tindih ke lembar Keaslian
        rep += generatePageBreakXml();
      }

      if (keaslianStart >= 0) {
        replacements.push({
          startIndex: keaslianStart,
          endIndex: keaslianEnd,
          replacementXml: rep,
        });
      }
    }
  }

  // =========================================================================
  // 3. PROSES 5 LAMPIRAN UTAMA
  // Mode: In Line with Text (wp:inline) sesuai permintaan pengguna
  // Penulisan lampiran diletakkan di pinggir kiri (w:jc w:val="left")
  // Margin asli naskah skripsi dipertahankan 100% tanpa perubahan margin 2 cm
  // =========================================================================
  const targetSuratTugas = targets.find((t) => t.id === 'surat_tugas');
  const targetKbDepan = targets.find((t) => t.id === 'kartu_bimbingan_depan');
  const targetKbBelakang = targets.find((t) => t.id === 'kartu_bimbingan_belakang');
  const targetIzin = targets.find((t) => t.id === 'izin_penelitian');
  const targetTelahMeneliti = targets.find((t) => t.id === 'telah_meneliti');
  const targetBebasPlagiasi = targets.find((t) => t.id === 'bebas_plagiasi');

  const anchorMatch = analysis.anchorKeywordMatch;

  // Nomor pertama hanya mengikuti lampiran sebelum TITIK SISIP,
  // bukan nomor tertinggi di seluruh dokumen (yang mungkin berada sesudah sisipan).
  const existingBeforeAnchor = anchorMatch && options.useAnchorFor5Attachments
    ? getLampiranHeadings(elements).filter(h => h.index < anchorMatch.index)
    : [];
  const highestExisting = existingBeforeAnchor.length > 0
    ? existingBeforeAnchor[existingBeforeAnchor.length - 1].number
    : anchorMatch && options.useAnchorFor5Attachments
      ? 0
      : findHighestExistingLampiranNumber(elements);
  let currentLampiranNum = highestExisting > 0 ? highestExisting + 1 : 4;
  logs.push(
    `ℹ Urutan lampiran: ${
      highestExisting > 0
        ? `Naskah memiliki lampiran sebelumnya hingga Lampiran ${highestExisting} -> Surat Tugas melanjutkan ke Lampiran ${currentLampiranNum}`
        : `Mulai dari Lampiran ${currentLampiranNum}`
    }`
  );

  interface ActiveLampiranItem {
    id: string;
    scan: ScanFile;
    scanBelakang?: ScanFile | null;
    caption: string;
  }
  const activeItems: ActiveLampiranItem[] = [];

  if (targetSuratTugas?.assignedScanId) {
    const scan = scanMap.get(targetSuratTugas.assignedScanId);
    if (scan) {
      const num = currentLampiranNum++;
      activeItems.push({
        id: 'surat_tugas',
        scan,
        caption: `Lampiran ${num}: Surat Tugas Pembimbing Penyusunan Skripsi`,
      });
    }
  }

  if (targetKbDepan?.assignedScanId) {
    const scanDepan = scanMap.get(targetKbDepan.assignedScanId);
    const scanBelakang = targetKbBelakang?.assignedScanId ? scanMap.get(targetKbBelakang.assignedScanId) : null;
    if (scanDepan) {
      const num = currentLampiranNum++;
      activeItems.push({
        id: 'kartu_bimbingan',
        scan: scanDepan,
        scanBelakang,
        caption: `Lampiran ${num}: Kartu Bimbingan`,
      });
    }
  }

  if (targetIzin?.assignedScanId) {
    const scan = scanMap.get(targetIzin.assignedScanId);
    if (scan) {
      const num = currentLampiranNum++;
      activeItems.push({
        id: 'izin_penelitian',
        scan,
        caption: `Lampiran ${num}: Surat Permohonan Izin Penelitian`,
      });
    }
  }

  if (targetTelahMeneliti?.assignedScanId) {
    const scan = scanMap.get(targetTelahMeneliti.assignedScanId);
    if (scan) {
      const num = currentLampiranNum++;
      activeItems.push({
        id: 'telah_meneliti',
        scan,
        caption: `Lampiran ${num}: Surat Keterangan Telah Meneliti`,
      });
    }
  }

  if (targetBebasPlagiasi?.assignedScanId) {
    const scan = scanMap.get(targetBebasPlagiasi.assignedScanId);
    if (scan) {
      const num = currentLampiranNum++;
      activeItems.push({
        id: 'bebas_plagiasi',
        scan,
        caption: `Lampiran ${num}: Surat Keterangan Bebas Plagiasi`,
      });
    }
  }

  if (anchorMatch && options.useAnchorFor5Attachments && activeItems.length > 0) {
    // Ubah penomoran judul asli setelah titik sisip sehingga tidak ada Lampiran 4 ganda.
    // Hanya judul paragraf asli yang diubah; Daftar Isi, isi naskah, dan Word asli aman.
    const headingsAfter = getLampiranHeadings(elements).filter(h => h.index >= anchorMatch.index);
    let nextExistingNum = currentLampiranNum;
    for (const heading of headingsAfter) {
      const original = elements[heading.index];
      const fixedXml = replaceLampiranHeadingNumber(original.rawXml, nextExistingNum);
      if (fixedXml !== original.rawXml) {
        elements[heading.index] = {
          ...original,
          rawXml: fixedXml,
          text: original.text.replace(/^\s*Lampiran\s*(?:ke[\s.-]*)?(?:\d+|[IVXLCDM]+)(?=$|[\s.:)\-])/i,
            `Lampiran ${nextExistingNum}`),
        };
        logs.push(`✓ Renumber Lampiran ${heading.number} → ${nextExistingNum} pada naskah setelah sisipan`);
      }
      nextExistingNum++;
    }
    logs.push(`✓ ${activeItems.length} lampiran baru dilanjutkan setelah Lampiran ${highestExisting || 3}; judul lampiran asli setelahnya diperbarui.`);
    logs.push(`✓ Titik penempatan 5 Lampiran aktif pada kata kunci anchor (In Line with Text, Margin Asli Skripsi)`);

    let combined5Xml = '';

    for (let idx = 0; idx < activeItems.length; idx++) {
      const item = activeItems[idx];

      combined5Xml += generatePageBreakXml();

      if (item.id === 'kartu_bimbingan') {
        const { rId: rIdDepan } = await registerImage(item.scan, 'kb_depan');
        let rIdBelakang: string | null = null;
        if (item.scanBelakang) {
          const res = await registerImage(item.scanBelakang, 'kb_belakang');
          rIdBelakang = res.rId;
          logs.push('✓ Foto Kartu Bimbingan Depan & Belakang ditempatkan (In Line with Text)');
        } else {
          logs.push('✓ Foto Kartu Bimbingan Depan ditempatkan (In Line with Text)');
        }

        combined5Xml += generateCaptionXml(item.caption);

        if (options.kartuBimbinganLayout === 'single_page' && rIdBelakang && item.scanBelakang) {
          const dimDepan = calculateDimensionsInline(item.scan, 'half_page');
          const dimBelakang = calculateDimensionsInline(item.scanBelakang, 'half_page');
          combined5Xml += generateDrawingXml(rIdDepan, nextDocPrId++, dimDepan.cx, dimDepan.cy, 'Kartu Bimbingan Depan');
          combined5Xml += generateDrawingXml(rIdBelakang, nextDocPrId++, dimBelakang.cx, dimBelakang.cy, 'Kartu Bimbingan Belakang');
        } else {
          const dimDepan = calculateDimensionsInline(item.scan, 'full_page_with_caption');
          combined5Xml += generateDrawingXml(rIdDepan, nextDocPrId++, dimDepan.cx, dimDepan.cy, 'Kartu Bimbingan Depan');
          if (rIdBelakang && item.scanBelakang) {
            combined5Xml += generatePageBreakXml();
            combined5Xml += generateCaptionXml(`${item.caption} (Lanjutan)`);
            const dimBelakang = calculateDimensionsInline(item.scanBelakang, 'full_page_with_caption');
            combined5Xml += generateDrawingXml(rIdBelakang, nextDocPrId++, dimBelakang.cx, dimBelakang.cy, 'Kartu Bimbingan Belakang');
          }
        }
      } else {
        const { rId } = await registerImage(item.scan, item.id);
        const dim = calculateDimensionsInline(item.scan, 'full_page_with_caption');
        logs.push(`✓ Keterangan pinggir kiri & foto ${item.caption} ditempatkan (In Line with Text)`);
        combined5Xml += generateCaptionXml(item.caption);
        combined5Xml += generateDrawingXml(rId, nextDocPrId++, dim.cx, dim.cy, item.caption);
      }
    }

    // Pastikan halaman anchor (seperti Riwayat Hidup) tetap pada halaman baru setelah lampiran terakhir
    combined5Xml += generatePageBreakXml();

    if (combined5Xml.length > 0) {
      replacements.push({
        startIndex: anchorMatch.index,
        endIndex: anchorMatch.index,
        replacementXml: combined5Xml + elements[anchorMatch.index].rawXml,
      });
    }
  } else if (activeItems.length > 0) {
    // Individual fallback placements (In Line with Text, margin asli skripsi)
    for (let idx = 0; idx < activeItems.length; idx++) {
      const item = activeItems[idx];
      const target = targets.find((t) => t.id === (item.id === 'kartu_bimbingan' ? 'kartu_bimbingan_depan' : item.id));
      if (!target || target.elementIndex === undefined) continue;

      if (item.id === 'kartu_bimbingan') {
        const { rId: rIdDepan } = await registerImage(item.scan, 'kb_depan');
        let rIdBelakang: string | null = null;
        if (item.scanBelakang) {
          const res = await registerImage(item.scanBelakang, 'kb_belakang');
          rIdBelakang = res.rId;
        }

        let rep = generatePageBreakXml() + generateCaptionXml(item.caption);

        if (options.kartuBimbinganLayout === 'single_page' && rIdBelakang && item.scanBelakang) {
          const dimDepan = calculateDimensionsInline(item.scan, 'half_page');
          const dimBelakang = calculateDimensionsInline(item.scanBelakang, 'half_page');
          rep += generateDrawingXml(rIdDepan, nextDocPrId++, dimDepan.cx, dimDepan.cy, 'Kartu Bimbingan Depan');
          rep += generateDrawingXml(rIdBelakang, nextDocPrId++, dimBelakang.cx, dimBelakang.cy, 'Kartu Bimbingan Belakang');
        } else {
          const dimDepan = calculateDimensionsInline(item.scan, 'full_page_with_caption');
          rep += generateDrawingXml(rIdDepan, nextDocPrId++, dimDepan.cx, dimDepan.cy, 'Kartu Bimbingan Depan');
          if (rIdBelakang && item.scanBelakang) {
            rep += generatePageBreakXml();
            rep += generateCaptionXml(`${item.caption} (Lanjutan)`);
            const dimBelakang = calculateDimensionsInline(item.scanBelakang, 'full_page_with_caption');
            rep += generateDrawingXml(rIdBelakang, nextDocPrId++, dimBelakang.cx, dimBelakang.cy, 'Kartu Bimbingan Belakang');
          }
        }

        const tEnd = target.endElementIndex || findPageEnd(target.elementIndex);
        const origSectPr = elements.slice(target.elementIndex, tEnd + 1).map((e) => e.rawXml).find((xml) => xml.includes('<w:sectPr'));
        if (origSectPr) {
          const matchSect = origSectPr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
          if (matchSect) rep += `<w:p><w:pPr>${matchSect[0]}</w:pPr></w:p>`;
        }

        replacements.push({
          startIndex: target.elementIndex,
          endIndex: tEnd,
          replacementXml: rep,
        });
      } else {
        const { rId } = await registerImage(item.scan, item.id);
        const dim = calculateDimensionsInline(item.scan, 'full_page_with_caption');
        let rep = generatePageBreakXml();
        rep += generateCaptionXml(item.caption);
        rep += generateDrawingXml(rId, nextDocPrId++, dim.cx, dim.cy, item.caption);

        const tEnd = target.endElementIndex || findPageEnd(target.elementIndex);
        const origSectPr = elements.slice(target.elementIndex, tEnd + 1).map((e) => e.rawXml).find((xml) => xml.includes('<w:sectPr'));
        if (origSectPr) {
          const matchSect = origSectPr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
          if (matchSect) rep += `<w:p><w:pPr>${matchSect[0]}</w:pPr></w:p>`;
        }

        replacements.push({
          startIndex: target.elementIndex,
          endIndex: tEnd,
          replacementXml: rep,
        });
      }
    }
  }

  // Sort replacements ascending by startIndex first to sanitize ranges
  replacements.sort((a, b) => a.startIndex - b.startIndex);

  // Prevent overlapping ranges between adjacent replacements
  for (let i = 0; i < replacements.length - 1; i++) {
    const cur = replacements[i];
    const next = replacements[i + 1];
    if (cur.endIndex >= next.startIndex) {
      throw new Error('Rentang penggantian halaman saling bertumpuk. Periksa posisi Persetujuan, Pengesahan dan Keaslian di Pilih Posisi Manual; naskah asli tidak diubah.');
    }
  }

  // Sort replacements descending by startIndex for clean in-place array splicing
  replacements.sort((a, b) => b.startIndex - a.startIndex);

  // Apply replacements.
  const finalElementXmls: string[] = elements.map((e) => e.rawXml);

  for (const rep of replacements) {
    const deleteCount = Math.max(0, rep.endIndex - rep.startIndex + 1);

    // If the original elements being deleted contained any w:start restart,
    // preserve that restart on the closing sectPr of replacementXml so it is not lost.
    const deletedRangeXml = elements.slice(rep.startIndex, rep.endIndex + 1).map((e) => e.rawXml).join('');
    const deletedRestarts = [...deletedRangeXml.matchAll(/<w:pgNumType\b[^>]*?\bw:start="([^"]*)"/g)].map((m) => m[1]);

    let repXml = rep.replacementXml;
    if (deletedRestarts.length > 0) {
      const targetRestart = deletedRestarts[0];
      if (!repXml.includes(`w:start="${targetRestart}"`)) {
        repXml = repXml.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>(?![\s\S]*<w:sectPr)/, (sectPr) => {
          if (/<w:pgNumType\b[^>]*\/>/.test(sectPr)) {
            return sectPr.replace(/<w:pgNumType\b[^>]*\/>/, (tag) => {
              if (/w:start="[^"]*"/.test(tag)) {
                return tag.replace(/w:start="[^"]*"/, `w:start="${targetRestart}"`);
              }
              return tag.replace('/>', ` w:start="${targetRestart}"/>`);
            });
          }
          return sectPr.replace('</w:sectPr>', `<w:pgNumType w:start="${targetRestart}"/></w:sectPr>`);
        });
      }
    }

    finalElementXmls.splice(rep.startIndex, deleteCount, repXml);

    // Hapus halaman kosong dan page break ganda setelah replacement
    let nextIdx = rep.startIndex + 1;
    while (
      nextIdx < finalElementXmls.length &&
      isXmlParagraphEmpty(finalElementXmls[nextIdx]) &&
      !finalElementXmls[nextIdx].includes('<w:sectPr')
    ) {
      finalElementXmls.splice(nextIdx, 1);
    }
    if (nextIdx < finalElementXmls.length) {
      finalElementXmls[nextIdx] = stripRedundantPageBreaks(finalElementXmls[nextIdx]);
    }

    // Bersihkan juga page break ganda pada paragraf sebelum replacement jika ada
    if (rep.startIndex > 0) {
      finalElementXmls[rep.startIndex - 1] = stripRedundantPageBreaks(finalElementXmls[rep.startIndex - 1]);
    }
  }

  // Margin naskah asli dipertahankan 100% untuk semua section, termasuk lampiran dan section terakhir.

  let newDocumentXml = prefix + finalElementXmls.join('') + suffix;

  // Ensure root <w:document> declares all necessary drawing and OOXML namespaces
  const requiredNamespaces: Record<string, string> = {
    'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'xmlns:m': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'xmlns:v': 'urn:schemas-microsoft-com:vml',
    'xmlns:wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'xmlns:w10': 'urn:schemas-microsoft-com:office:word',
    'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'xmlns:a14': 'http://schemas.microsoft.com/office/drawing/2010/main',
    'xmlns:wp14': 'http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing',
    'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
  };

  newDocumentXml = newDocumentXml.replace(/<w:document\b([^>]*)>/, (match, attrs) => {
    let extra = '';
    for (const [key, uri] of Object.entries(requiredNamespaces)) {
      if (!attrs.includes(key)) {
        extra += ` ${key}="${uri}"`;
      }
    }
    return `<w:document${attrs}${extra}>`;
  });

  // Failsafe & auto-reconciliation: ensure page-number restarts are perfectly preserved
  const findNumberStarts = (xml: string): string[] =>
    [...xml.matchAll(/<w:pgNumType\b[^>]*?\bw:start="([^"]*)"/g)].map((m) => m[1]);
  const originalRestarts = findNumberStarts(docXml);
  let finalRestarts = findNumberStarts(newDocumentXml);

  if (originalRestarts.join('|') !== finalRestarts.join('|')) {
    logs.push(
      `ℹ Rekonsiliasi nomor halaman: menyesuaikan ${finalRestarts.length} restart dengan ${originalRestarts.length} restart asli Word`
    );

    // If final has fewer restarts than original, restore missing restart onto the appropriate section break
    if (finalRestarts.length < originalRestarts.length) {
      const allSectPrMatches = [...newDocumentXml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)];
      let origIdx = 0;
      let reconciledXml = '';
      let lastIndex = 0;

      for (let i = 0; i < allSectPrMatches.length; i++) {
        const m = allSectPrMatches[i];
        reconciledXml += newDocumentXml.substring(lastIndex, m.index);
        let sectXml = m[0];
        const hasStart = sectXml.match(/<w:pgNumType\b[^>]*\bw:start="([^"]*)"/);

        if (hasStart) {
          if (origIdx < originalRestarts.length && hasStart[1] === originalRestarts[origIdx]) {
            origIdx++;
          }
        } else if (
          origIdx < originalRestarts.length &&
          allSectPrMatches.length - i <= originalRestarts.length - origIdx
        ) {
          const expectedStart = originalRestarts[origIdx++];
          if (/<w:pgNumType\b[^>]*\/>/.test(sectXml)) {
            sectXml = sectXml.replace(/<w:pgNumType\b[^>]*\/>/, (tag) =>
              tag.replace('/>', ` w:start="${expectedStart}"/>`)
            );
          } else {
            sectXml = sectXml.replace('</w:sectPr>', `<w:pgNumType w:start="${expectedStart}"/></w:sectPr>`);
          }
        }

        reconciledXml += sectXml;
        lastIndex = m.index! + m[0].length;
      }
      reconciledXml += newDocumentXml.substring(lastIndex);
      newDocumentXml = reconciledXml;
      finalRestarts = findNumberStarts(newDocumentXml);
    }

    // If final has more restarts than original, strip extraneous restarts from inserted margin breaks
    if (finalRestarts.length > originalRestarts.length) {
      const allSectPrMatches = [...newDocumentXml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)];
      let kept = 0;
      let reconciledXml = '';
      let lastIndex = 0;

      for (const m of allSectPrMatches) {
        reconciledXml += newDocumentXml.substring(lastIndex, m.index);
        let sectXml = m[0];
        const hasStart = sectXml.match(/<w:pgNumType\b[^>]*\bw:start="([^"]*)"/);

        if (hasStart) {
          if (kept < originalRestarts.length && hasStart[1] === originalRestarts[kept]) {
            kept++;
          } else {
            sectXml = removeSectionPageNumberStart(sectXml);
          }
        }

        reconciledXml += sectXml;
        lastIndex = m.index! + m[0].length;
      }
      reconciledXml += newDocumentXml.substring(lastIndex);
      newDocumentXml = reconciledXml;
      finalRestarts = findNumberStarts(newDocumentXml);
    }
  }

  logs.push(`✓ Penomoran halaman dilindungi: ${originalRestarts.length} restart asli dipertahankan (${originalRestarts.join(', ')})`);

  // XML Structure Reconciliation & Strict Stack-based Tag Balancing
  newDocumentXml = sanitizeXmlTags(newDocumentXml);

  zip.file('word/document.xml', newDocumentXml);
  zip.file('word/_rels/document.xml.rels', relsXml);

  logs.push('✓ Mempertahankan 100% margin asli file skripsi (tanpa perubahan margin)');
  logs.push('✓ Halaman Persetujuan, Pengesahan & Keaslian: In Front of Text');
  logs.push('✓ 5 Lampiran: In Line with Text dengan penulisan judul di pinggir kiri');
  logs.push('✓ Struktur DOCX dan hubungan media berhasil disinkronkan');

  const finalBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  logs.push('✓ File Word final berhasil di-generate');

  return {
    docxBlob: finalBlob,
    logs,
  };
}
