/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { DocxAnalysis, DocxElement, TargetDocument, AnchorKeywordMatch } from '../types/skripsi';

export const STANDARD_SIGNED_PAGES = [
  {
    id: 'persetujuan',
    title: 'Halaman Persetujuan',
    captionTitle: 'Halaman Persetujuan',
    category: 'signed_page' as const,
    standardOrder: 1,
    keywords: [
      'HALAMAN PERSETUJUAN',
      'LEMBAR PERSETUJUAN',
      'PERSETUJUAN PEMBIMBING',
      'PERSETUJUAN SKRIPSI',
      'HALAMAN PERSETUJUAN SKRIPSI',
      'LEMBAR PERSETUJUAN SKRIPSI',
      'TANDA PERSETUJUAN',
      'TANDA PERSETUJUAN SKRIPSI',
      'PERSETUJUAN',
    ],
  },
  {
    id: 'pengesahan',
    title: 'Halaman Pengesahan',
    captionTitle: 'Halaman Pengesahan',
    category: 'signed_page' as const,
    standardOrder: 2,
    keywords: [
      'HALAMAN PENGESAHAN',
      'LEMBAR PENGESAHAN',
      'PENGESAHAN TIM PENGUJI',
      'PENGESAHAN DEWAN PENGUJI',
      'PENGESAHAN MAJELIS PENGUJI',
      'PENGESAHAN PANITIA UJIAN',
      'PENGESAHAN UJIAN SKRIPSI',
      'PENGESAHAN SKRIPSI',
      'HALAMAN PENGESAHAN SKRIPSI',
      'LEMBAR PENGESAHAN SKRIPSI',
      'TANDA PENGESAHAN',
      'TANDA PENGESAHAN SKRIPSI',
      'SURAT PENGESAHAN',
      'DEWAN PENGUJI',
      'TIM PENGUJI',
      'PANITIA PENGUJI',
      'MAJELIS PENGUJI',
      'TELAH DIPERTAHANKAN DI DEPAN',
      'PENGESAHAN KELULUSAN',
      'LEMBAR PERSETUJUAN DAN PENGESAHAN',
      'PENGESAHAN',
    ],
  },
  {
    id: 'keaslian',
    title: 'Surat Pernyataan Keaslian Tulisan',
    captionTitle: 'Surat Pernyataan Keaslian Tulisan',
    category: 'signed_page' as const,
    standardOrder: 3,
    keywords: [
      'PERNYATAAN KEASLIAN TULISAN',
      'SURAT PERNYATAAN KEASLIAN TULISAN',
      'PERNYATAAN KEASLIAN',
      'SURAT PERNYATAAN KEASLIAN',
      'LEMBAR PERNYATAAN KEASLIAN',
      'HALAMAN PERNYATAAN KEASLIAN',
      'PERNYATAAN KEASLIAN SKRIPSI',
      'SURAT PERNYATAAN KEASLIAN SKRIPSI',
      'PERNYATAAN KEASLIAN KARYA',
      'SURAT PERNYATAAN BUKAN PLAGIAT',
      'PERNYATAAN BUKAN PLAGIAT',
      'SURAT PERNYATAAN BEBAS PLAGIASI',
      'PERNYATAAN ORISINALITAS',
      'SURAT PERNYATAAN ORISINALITAS',
      'KEORISINILAN',
      'ORISINALITAS',
      'KEASLIAN TULISAN',
      'SURAT KEASLIAN',
    ],
  },
];

export const STANDARD_5_ATTACHMENTS = [
  {
    id: 'surat_tugas',
    title: 'Surat Tugas Pembimbing',
    captionTitle: 'Surat Tugas Pembimbing',
    category: 'attachment_5' as const,
    standardOrder: 4,
    keywords: [
      'SURAT TUGAS PEMBIMBING PENYUSUNAN SKRIPSI',
      'SURAT TUGAS PEMBIMBING PENYUSUNAN',
      'SURAT TUGAS PEMBIMBING',
      'SURAT TUGAS BIMBINGAN',
      'TUGAS PEMBIMBING',
      'SURAT TUGAS',
      'SK PEMBIMBING',
      'LAMPIRAN 4 SURAT TUGAS',
      'LAMPIRAN 4',
      'SURAT PENUGASAN PEMBIMBING',
      'PENUGASAN PEMBIMBING',
    ],
  },
  {
    id: 'kartu_bimbingan_depan',
    title: 'Kartu Bimbingan Halaman Depan',
    captionTitle: 'Kartu Bimbingan - Halaman Depan (Nama, NIM, Fakultas, Prodi)',
    category: 'attachment_5' as const,
    standardOrder: 5,
    keywords: ['KARTU BIMBINGAN', 'KARTU KONSULTASI BIMBINGAN', 'LEMBAR BIMBINGAN', 'LAMPIRAN 5'],
  },
  {
    id: 'kartu_bimbingan_belakang',
    title: 'Kartu Bimbingan Halaman Belakang',
    captionTitle: 'Kartu Bimbingan - Halaman Belakang (Catatan Konsultasi & Paraf)',
    category: 'attachment_5' as const,
    standardOrder: 6,
    keywords: ['KARTU BIMBINGAN HALAMAN BELAKANG', 'KARTU BIMBINGAN BELAKANG', 'KARTU BIMBINGAN HALAMAN 2'],
  },
  {
    id: 'izin_penelitian',
    title: 'Surat Permohonan Izin Penelitian',
    captionTitle: 'Surat Permohonan Izin Penelitian',
    category: 'attachment_5' as const,
    standardOrder: 7,
    keywords: [
      'SURAT PERMOHONAN IZIN PENELITIAN',
      'SURAT IZIN PENELITIAN',
      'PERMOHONAN IZIN PENELITIAN',
      'IZIN PENELITIAN',
      'LAMPIRAN 6',
    ],
  },
  {
    id: 'telah_meneliti',
    title: 'Surat Keterangan Telah Meneliti',
    captionTitle: 'Surat Keterangan Telah Meneliti',
    category: 'attachment_5' as const,
    standardOrder: 8,
    keywords: [
      'SURAT KETERANGAN TELAH MENELITI',
      'KETERANGAN TELAH MENELITI',
      'TELAH SELESAI MENELITI',
      'SURAT SELESAI PENELITIAN',
      'LAMPIRAN 7',
    ],
  },
  {
    id: 'bebas_plagiasi',
    title: 'Surat Keterangan Bebas Plagiasi',
    captionTitle: 'Surat Keterangan Bebas Plagiasi',
    category: 'attachment_5' as const,
    standardOrder: 9,
    keywords: [
      'SURAT KETERANGAN BEBAS PLAGIASI',
      'BEBAS PLAGIARISME',
      'BEBAS PLAGIASI',
      'HASIL CEK PLAGIASI',
      'SURAT BEBAS PLAGIASI',
      'LAMPIRAN 8',
    ],
  },
];

export const ALL_STANDARD_SPECS = [...STANDARD_SIGNED_PAGES, ...STANDARD_5_ATTACHMENTS];

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function extractTextFromXml(xml: string): string {
  const textMatches = xml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
  const text = textMatches
    .map((m) => {
      const inside = m.replace(/<[^>]+>/g, '');
      return decodeXmlEntities(inside);
    })
    .join('');
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchesKeywords(text: string, keywords: string[]): boolean {
  const upper = text.toUpperCase().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const unspaced = upper.replace(/[^A-Z0-9]/g, '');

  return keywords.some((kw) => {
    const kwUpper = kw.toUpperCase().replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (upper.includes(kwUpper)) return true;
    const kwUnspaced = kwUpper.replace(/[^A-Z0-9]/g, '');
    if (kwUnspaced.length >= 4 && unspaced.includes(kwUnspaced)) return true;
    return false;
  });
}

export function checkAnchorKeyword(text: string, customKeyword?: string): boolean {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const unspaced = clean.replace(/\s+/g, '');

  if (customKeyword) {
    const cleanCustom = customKeyword.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const unspacedCustom = cleanCustom.replace(/\s+/g, '');
    if (
      (cleanCustom.length > 2 && clean.includes(cleanCustom)) ||
      (unspacedCustom.length > 2 && unspaced.includes(unspacedCustom))
    ) {
      return true;
    }
  }

  if (
    clean.includes('karyazainnet') ||
    unspaced.includes('karyazainnet') ||
    clean.includes('karya zain net') ||
    clean.includes('karya zain') ||
    clean.includes('taruh disini mulai dari sini') ||
    clean.includes('taruh di sini mulai dari sini') ||
    clean.includes('lampiran taruh disini') ||
    clean.includes('lampiran taruh di sini') ||
    (clean.includes('lampiran') && clean.includes('mulai dari sini'))
  ) {
    return true;
  }

  return false;
}

export async function parseDocx(
  fileData: ArrayBuffer | Uint8Array,
  fileName = 'dokumen.docx',
  customAnchorKeyword?: string
): Promise<DocxAnalysis> {
  const zip = await JSZip.loadAsync(fileData);

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('File tidak valid: word/document.xml tidak ditemukan di dalam paket DOCX.');
  }

  const docXml = await docFile.async('text');

  let existingMediaCount = 0;
  zip.folder('word/media')?.forEach(() => {
    existingMediaCount++;
  });

  const bodyStartMatch = docXml.match(/<w:body\b[^>]*>/);
  const bodyEndTag = '</w:body>';
  const startIdx = bodyStartMatch ? docXml.indexOf(bodyStartMatch[0]) : -1;
  const endIdx = docXml.lastIndexOf(bodyEndTag);

  if (startIdx === -1 || endIdx === -1 || !bodyStartMatch) {
    throw new Error('Format DOCX tidak valid: tag <w:body> tidak ditemukan.');
  }

  const bodyContent = docXml.substring(startIdx + bodyStartMatch[0].length, endIdx);

  // Fully byte-preserving tokenizer for w:body children (guarantees joined === bodyContent)
  const rawElements: { tag: string; rawXml: string }[] = [];
  let pos = 0;
  const len = bodyContent.length;

  while (pos < len) {
    const nextOpen = bodyContent.indexOf('<', pos);
    if (nextOpen === -1) {
      const remainingText = bodyContent.substring(pos);
      if (remainingText.trim()) {
        rawElements.push({ tag: 'text', rawXml: remainingText });
      } else if (rawElements.length > 0) {
        rawElements[rawElements.length - 1].rawXml += remainingText;
      }
      break;
    }

    // Preserve any whitespace or text between tags into previous element or as standalone
    if (nextOpen > pos) {
      const leadingGap = bodyContent.substring(pos, nextOpen);
      if (rawElements.length > 0) {
        rawElements[rawElements.length - 1].rawXml += leadingGap;
      }
      pos = nextOpen;
    }

    // Find tag name
    const matchTag = bodyContent.substring(pos).match(/^<([a-zA-Z0-9_:-]+)/);
    if (!matchTag) {
      pos++;
      continue;
    }

    const fullTagName = matchTag[1];
    const tagCloseIdx = bodyContent.indexOf('>', pos);
    if (tagCloseIdx === -1) break;

    // Self-closing tag
    if (bodyContent.charAt(tagCloseIdx - 1) === '/') {
      rawElements.push({ tag: fullTagName, rawXml: bodyContent.substring(pos, tagCloseIdx + 1) });
      pos = tagCloseIdx + 1;
      continue;
    }

    // Find balanced close tag
    const closeTagStr = '</' + fullTagName + '>';
    const openTagRegex = new RegExp('<' + fullTagName + '[\\s>]', 'g');
    let depth = 1;
    let sPos = tagCloseIdx + 1;

    while (depth > 0 && sPos < len) {
      openTagRegex.lastIndex = sPos;
      const mOpen = openTagRegex.exec(bodyContent);
      const nOpen = mOpen ? mOpen.index : -1;
      const nClose = bodyContent.indexOf(closeTagStr, sPos);
      if (nClose === -1) {
        sPos = len;
        break;
      }

      if (nOpen !== -1 && nOpen < nClose) {
        const br = bodyContent.indexOf('>', nOpen);
        if (br !== -1 && bodyContent.charAt(br - 1) !== '/') {
          depth++;
        }
        sPos = br !== -1 ? br + 1 : nOpen + fullTagName.length + 2;
      } else {
        depth--;
        sPos = nClose + closeTagStr.length;
      }
    }

    rawElements.push({ tag: fullTagName, rawXml: bodyContent.substring(pos, sPos) });
    pos = sPos;
  }

  const elements: DocxElement[] = [];
  const headingsList: { index: number; text: string; page: number }[] = [];
  let anchorKeywordMatch: AnchorKeywordMatch | null = null;

  let elementIndex = 0;
  let currentPage = 1;
  let pageCharAccumulator = 0;

  let bab1ElementIndex = -1;
  let daftarRujukanElementIndex = -1;

  for (const rawElem of rawElements) {
    const rawXml = rawElem.rawXml;
    const tag = rawElem.tag;
    const text = extractTextFromXml(rawXml);

    const hasDrawing = rawXml.includes('<w:drawing>') || rawXml.includes('<w:pict>');
    const hasPageBreak =
      rawXml.includes('w:type="page"') ||
      rawXml.includes('<w:br w:type="page"/>') ||
      rawXml.includes('<w:lastRenderedPageBreak/>');
    const hasSectPr = rawXml.includes('<w:sectPr');

    if (hasPageBreak || hasSectPr) {
      currentPage++;
      pageCharAccumulator = 0;
    } else {
      pageCharAccumulator += text.length;
      if (pageCharAccumulator > 3200) {
        currentPage++;
        pageCharAccumulator = 0;
      }
    }

    const upperText = text.toUpperCase();
    const isTocLine =
      rawXml.includes('<w:tab') ||
      rawXml.includes('w:leader=') ||
      rawXml.includes('<w:tabs') ||
      /(?:\.{2,}|\.\s+\.|\t+\d+|\t+[ivxlcdm]+)/i.test(text);

    if (bab1ElementIndex === -1 && !isTocLine && (upperText.startsWith('BAB I ') || upperText === 'BAB I' || upperText.startsWith('BAB 1 '))) {
      bab1ElementIndex = elementIndex;
    }
    if (bab1ElementIndex !== -1 && daftarRujukanElementIndex === -1 && !isTocLine && (upperText.includes('DAFTAR RUJUKAN') || upperText.includes('DAFTAR PUSTAKA'))) {
      daftarRujukanElementIndex = elementIndex;
    }

    const isHeading =
      rawXml.includes('<w:pStyle w:val="Heading') ||
      upperText.startsWith('BAB ') ||
      upperText.startsWith('HALAMAN ') ||
      upperText.startsWith('LEMBAR ') ||
      upperText.startsWith('PERNYATAAN ') ||
      upperText.startsWith('DAFTAR ') ||
      upperText.startsWith('LAMPIRAN ') ||
      upperText === 'ABSTRAK' ||
      upperText === 'KATA PENGANTAR';

    if (isHeading && text.length > 2 && text.length < 150) {
      headingsList.push({
        index: elementIndex,
        text,
        page: currentPage,
      });
    }

    if (!anchorKeywordMatch && checkAnchorKeyword(text, customAnchorKeyword)) {
      anchorKeywordMatch = {
        index: elementIndex,
        page: currentPage,
        text,
        matchedKeyword: text,
      };
    }

    elements.push({
      index: elementIndex,
      tag,
      rawXml,
      text,
      hasDrawing,
      hasPageBreak,
      hasSectPr,
      isHeading,
      headingText: isHeading ? text : undefined,
      estimatedPage: currentPage,
    });

    elementIndex++;
  }

  // Detect Targets
  const detectedTargets: TargetDocument[] = [];

  for (const spec of ALL_STANDARD_SPECS) {
    let foundIndex = -1;
    let foundPage = 1;
    let hasExistingDrawing = false;
    let endIndex = -1;

    // Special handling for KEASLIAN TULISAN:
    if (spec.id === 'keaslian') {
      // Look for real heading (distinguish from TOC / Daftar Isi / Daftar Lampiran)
      type Candidate = { index: number; page: number; score: number };
      const candidates: Candidate[] = [];

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const u = el.text.toUpperCase().trim();
        if (!u) continue;
        if (!matchesKeywords(u, spec.keywords)) continue;

        // Strict TOC filtering
        const isTocLine =
          el.rawXml.includes('<w:tab') ||
          el.rawXml.includes('w:leader=') ||
          el.rawXml.includes('<w:tabs') ||
          /(?:\.{2,}|\.\s+\.|\t+\d+|\t+[ivxlcdm]+|\s+[ivxlcdm\d]{1,4}$)/i.test(el.text);

        let score = 0;
        if (isTocLine) {
          score -= 100;
        }

        // Check if paragraph has its own page break or follows a page break
        if (el.hasPageBreak) score += 40;
        if (i > 0 && (elements[i - 1].hasPageBreak || elements[i - 1].hasSectPr)) score += 30;
        if (el.isHeading) score += 20;

        // Check if surrounding lines look like a real document page (e.g. blank lines or statement body)
        let emptyFollowers = 0;
        let hasStatementBody = false;
        for (let k = i + 1; k < Math.min(i + 15, elements.length); k++) {
          const followerText = elements[k].text.trim().toLowerCase();
          if (!followerText) {
            emptyFollowers++;
          } else if (
            followerText.includes('saya yang bertanda tangan') ||
            followerText.includes('nama :') ||
            followerText.includes('nama:') ||
            followerText.includes('nim') ||
            followerText.includes('program studi') ||
            followerText.includes('menyatakan bahwa') ||
            followerText.includes('skripsi ini') ||
            followerText.includes('materai')
          ) {
            hasStatementBody = true;
          }
        }
        if (emptyFollowers >= 3) score += 30;
        if (hasStatementBody) score += 50;

        // Front matter check: after Pengesahan and before BAB I
        if (bab1ElementIndex !== -1 && i < bab1ElementIndex) {
          score += 15;
        }

        candidates.push({ index: i, page: el.estimatedPage, score });
      }

      // Sort candidates by score descending
      candidates.sort((a, b) => b.score - a.score);
      if (candidates.length > 0 && candidates[0].score > -50) {
        foundIndex = candidates[0].index;
        foundPage = candidates[0].page;
      }

      // 2. Fallback: If not found, check after Pengesahan or after Daftar Rujukan
      if (foundIndex === -1) {
        const pengesahanFound = detectedTargets.find((t) => t.id === 'pengesahan' && t.elementIndex !== undefined);
        if (pengesahanFound && pengesahanFound.elementIndex !== undefined) {
          const pEnd = pengesahanFound.endElementIndex || pengesahanFound.elementIndex;
          if (pEnd + 1 < elements.length && pEnd + 1 < (bab1ElementIndex !== -1 ? bab1ElementIndex : 250)) {
            foundIndex = pEnd + 1;
            foundPage = elements[foundIndex].estimatedPage;
          }
        }
      }
      if (foundIndex === -1 && daftarRujukanElementIndex !== -1) {
        foundIndex = Math.min(daftarRujukanElementIndex + 40, elements.length - 1);
        foundPage = elements[foundIndex].estimatedPage + 1;
      }
    } else if (spec.category === 'signed_page') {
      // Persetujuan & Pengesahan (in front matter before BAB I or up to first 300 elements)
      const searchLimit = bab1ElementIndex !== -1 ? Math.max(bab1ElementIndex, 100) : Math.min(elements.length, 300);
      for (let i = 0; i < searchLimit; i++) {
        const el = elements[i];
        // Never treat real page headings as TOC unless real leader dots exist
        const looksLikeTocEntry = /(?:\.{2,}|\.\s+\.|\t+\d+|\t+[ivxlcdm]+)/i.test(el.text);
        if (looksLikeTocEntry) continue;

        if (matchesKeywords(el.text, spec.keywords)) {
          if (el.hasPageBreak || el.hasSectPr || foundIndex === -1) {
            foundIndex = i;
            foundPage = el.estimatedPage;
            if (el.hasPageBreak || el.hasSectPr) break;
          }
        }
      }

      // Fallback: If Pengesahan was not detected by keyword, check the page immediately after Persetujuan!
      if (spec.id === 'pengesahan' && foundIndex === -1) {
        const persetujuanFound = detectedTargets.find((t) => t.id === 'persetujuan' && t.elementIndex !== undefined);
        if (persetujuanFound && persetujuanFound.elementIndex !== undefined) {
          const pStart = persetujuanFound.elementIndex;
          for (let k = pStart + 1; k < Math.min(pStart + 45, elements.length); k++) {
            const el = elements[k];
            if (matchesKeywords(el.text, ['PENGESAHAN', 'PENGUJI', 'DEWAN PENGUJI', 'TIM PENGUJI', 'PANITIA UJIAN', 'DISAHKAN', 'DEKAN'])) {
              foundIndex = k;
              foundPage = el.estimatedPage;
              break;
            }
            if (foundIndex === -1 && (el.hasPageBreak || el.hasSectPr) && k + 1 < elements.length) {
              foundIndex = k + 1;
              foundPage = elements[k + 1].estimatedPage;
            }
          }
        }
      }
    } else {
      // 5 Lampiran (Surat Tugas, Kartu Bimbingan, Izin, Telah Meneliti, Bebas Plagiasi)
      // Prioritize searching after DAFTAR RUJUKAN / BAB V, strictly skipping DAFTAR LAMPIRAN (TOC)
      const searchStart = daftarRujukanElementIndex !== -1 ? daftarRujukanElementIndex : (bab1ElementIndex !== -1 ? bab1ElementIndex : 0);

      for (let i = searchStart; i < elements.length; i++) {
        const el = elements[i];
        if (el.text.includes('.....') || el.text.includes('. . .')) continue;

        if (matchesKeywords(el.text, spec.keywords)) {
          foundIndex = i;
          foundPage = el.estimatedPage;
          break;
        }
      }
    }

    if (foundIndex !== -1) {
      if (spec.category === 'signed_page') {
        endIndex = foundIndex;
        const maxSignedSearch = Math.min(foundIndex + 40, elements.length);
        for (let j = foundIndex + 1; j < maxSignedSearch; j++) {
          const nextEl = elements[j];
          if (nextEl.hasDrawing) {
            hasExistingDrawing = true;
          }
          if (
            nextEl.isHeading ||
            nextEl.hasPageBreak ||
            nextEl.hasSectPr ||
            nextEl.text.toUpperCase().startsWith('HALAMAN ') ||
            nextEl.text.toUpperCase().startsWith('LAMPIRAN ') ||
            nextEl.text.toUpperCase().startsWith('BAB ') ||
            nextEl.text.toUpperCase() === 'ABSTRAK' ||
            nextEl.text.toUpperCase() === 'KATA PENGANTAR' ||
            nextEl.text.toUpperCase().startsWith('DAFTAR ')
          ) {
            endIndex = j - 1;
            break;
          }
          endIndex = j;
        }
      } else {
        endIndex = foundIndex;
        for (let j = foundIndex + 1; j < Math.min(foundIndex + 25, elements.length); j++) {
          const nextEl = elements[j];
          if (nextEl.hasDrawing) {
            hasExistingDrawing = true;
          }
          if (nextEl.isHeading || nextEl.text.toUpperCase().startsWith('LAMPIRAN ')) {
            endIndex = j - 1;
            break;
          }
          endIndex = j;
        }
      }
    }

    let status: TargetDocument['status'] = 'missing_scan';
    if (foundIndex === -1) {
      status = 'unassigned';
    } else if (hasExistingDrawing) {
      status = 'already_attached';
    }

    detectedTargets.push({
      id: spec.id,
      title: spec.title,
      captionTitle: spec.captionTitle,
      category: spec.category,
      standardOrder: spec.standardOrder,
      elementIndex: foundIndex !== -1 ? foundIndex : undefined,
      endElementIndex: endIndex !== -1 ? endIndex : undefined,
      estimatedPage: foundIndex !== -1 ? foundPage : undefined,
      hasExistingDrawing,
      status,
      notes: foundIndex !== -1
        ? (hasExistingDrawing
            ? 'Sudah memiliki scan/gambar di dokumen asli'
            : spec.category === 'signed_page'
            ? 'Ditemukan (halaman teks bertanda tangan, siap auto-replace)'
            : 'Heading lampiran ditemukan di Word')
        : 'Belum ditemukan di Word (posisi otomatis di anchor / manual)',
    });
  }

  return {
    fileName,
    fileSize: fileData.byteLength,
    totalElements: elements.length,
    totalPagesEstimate: currentPage,
    elements,
    detectedTargets,
    existingMediaCount,
    headingsList,
    anchorKeywordMatch,
  };
}

/**
 * Mendeteksi nomor urutan Lampiran tertinggi yang sudah ada di dokumen sebelum titik lampiran baru.
 * Contoh: jika di naskah sudah ada:
 * Lampiran 1: Pernyataan keaslian tulisan
 * Lampiran 2: Instrumen Penelitian
 * Lampiran 3: Hasil Penelitian
 * Maka fungsi ini mengembalikan angka 3, sehingga Surat Tugas Pembimbing otomatis menjadi Lampiran 4.
 */
export function findHighestExistingLampiranNumber(elements: DocxElement[], beforeIndex?: number): number {
  let highest = 0;
  const limit = beforeIndex !== undefined && beforeIndex >= 0 ? beforeIndex : elements.length;

  for (let i = 0; i < limit; i++) {
    const text = elements[i].text.trim();
    if (!text || text.includes('.....') || text.includes('. . .')) continue;

    // Abaikan jika ini adalah anchor itu sendiri
    if (checkAnchorKeyword(text)) continue;

    // Abaikan judul bab atau pengesahan
    const upper = text.toUpperCase();
    if (upper.startsWith('BAB ') || upper.startsWith('HALAMAN ')) continue;

    // Cari pola Lampiran N atau LAMPIRAN N (contoh: "Lampiran 1: Pernyataan", "Lampiran 3 Hasil Penelitian")
    const match = text.match(/\b(?:LAMPIRAN|Lampiran)\s*([0-9]+)\b/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highest && num < 100) {
        highest = num;
      }
      continue;
    }

    // Cari juga pola romawi: LAMPIRAN I, LAMPIRAN II, LAMPIRAN III, LAMPIRAN IV
    const matchRoman = text.match(/\b(?:LAMPIRAN|Lampiran)\s*([IVXLCDM]+)\b/i);
    if (matchRoman) {
      const romanStr = matchRoman[1].toUpperCase();
      const romanMap: Record<string, number> = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
        'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10
      };
      const num = romanMap[romanStr];
      if (num && num > highest) {
        highest = num;
      }
    }
  }

  return highest;
}
