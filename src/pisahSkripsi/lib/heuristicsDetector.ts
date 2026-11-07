import { PageTextInfo, SectionKey, SectionRange, ThesisMetadata } from '../types';
import { getProdiCode } from './prodiMapping';

export function detectMetadataFromText(pages: PageTextInfo[], rawFilename?: string): ThesisMetadata {
  // Usually cover is in pages 1 and 2
  const coverPagesText = pages.slice(0, 3).map(p => p.text).join('\n');

  let nama = '';
  let nim = '';
  let prodi = '';
  let judul = '';
  let email = '';

  // NIM pattern: "NIM / N.I.M / NIM:" followed by numbers
  const nimMatch = coverPagesText.match(/(?:NIM|N\.I\.M\.?|NIM\s*\/|NPM)\s*[:\.]?\s*([0-9A-Z\/\.\-]{7,20})/i);
  if (nimMatch) {
    nim = nimMatch[1].replace(/[^0-9]/g, '') || nimMatch[1].trim();
  } else {
    // Search standalone 8-15 digit sequence
    const digitsMatch = coverPagesText.match(/\b\d{8,15}\b/);
    if (digitsMatch) nim = digitsMatch[0];
  }

  // Name pattern: "Oleh:" / "Disusun Oleh:" / "Oleh :" / "NAMA :" followed by uppercase name
  const nameMatch = coverPagesText.match(/(?:Oleh|Disusun Oleh|Nama|Mahasiswa)\s*[:\.]?\s*([A-Z\s'\.]{3,40})(?=\n|NIM|NPM|PRODI|PROGRAM|JUDUL)/i);
  if (nameMatch) {
    nama = nameMatch[1].trim().toUpperCase();
  } else {
    // Look for lines in ALL CAPS with 2-4 words that aren't SKRIPSI or UNIVERSITAS
    const lines = coverPagesText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[A-Z\s'\.]{5,35}$/.test(trimmed) &&
          !/SKRIPSI|THESIS|DIAJUKAN|UNIVERSITAS|INSTITUT|SEKOLAH|FAKULTAS|PROGRAM|NIM|NPM|AGUSTUS|JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER/i.test(trimmed)) {
        if (trimmed.split(/\s+/).length >= 2) {
          nama = trimmed;
          break;
        }
      }
    }
  }

  // Prodi pattern
  const prodiMatch = coverPagesText.match(/(?:Program\s+Studi|Jurusan|Prodi)\s*[:\.]?\s*([A-Za-z\s'\-]+)(?=\n|Fakultas|Universitas|Institut|Sekolah)/i);
  if (prodiMatch) {
    prodi = prodiMatch[1].trim();
  } else {
    // Look for keywords from the 22 official Study Programs
    const keywords = [
      "Pendidikan Agama Islam",
      "Pendidikan Bahasa Arab",
      "Tadris Bahasa Inggris",
      "Manajemen Pendidikan Islam",
      "Pendidikan Islam Anak Usia Dini",
      "Pendidikan Guru Madrasah Ibtidaiyah",
      "Tadris Bahasa Indonesia",
      "Tadris Ilmu Pengetahuan Sosial",
      "Bimbingan dan Konseling Pendidikan Islam",
      "Tadris Matematika",
      "Tadris Ilmu Pengetahuan Alam",
      "Tadris IPA",
      "Pendidikan Profesi Guru",
      "Ilmu Al-Qur'an dan Tafsir",
      "Ilmu Al Quran dan Tafsir",
      "Ilmu Al-Quran dan Tafsir",
      "Komunikasi dan Penyiaran Islam",
      "Ilmu Hadis",
      "Ilmu Hadits",
      "Hukum Keluarga Islam",
      "Hukum Ekonomi Syariah",
      "Hukum Tata Negara",
      "Ekonomi Syariah",
      "Perbankan Syariah",
      "Akuntansi Syariah",
      "Manajemen Bisnis Syariah",
    ];
    for (const kw of keywords) {
      if (new RegExp(kw, 'i').test(coverPagesText)) {
        prodi = kw;
        break;
      }
    }
  }

  // Title pattern: lines between "SKRIPSI" / "THESIS" and "Oleh" or "Diajukan"
  const titleMatch = coverPagesText.match(/(?:SKRIPSI|THESIS|TUGAS AKHIR|ARTIKEL ILMIAH)\s*\n+([\s\S]{10,350}?)(?=Diajukan|Oleh|Disusun|Untuk|Program|Fakultas|Pembimbing)/i);
  if (titleMatch) {
    judul = titleMatch[1].replace(/\s+/g, ' ').trim();
  } else {
    // Fallback 1: Search cover lines for candidate title block
    const coverLines = (pages[0]?.text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const candidate = coverLines.find(l => l.length >= 20 && !/UNIVERSITAS|FAKULTAS|KEMENTERIAN|PROGRAM\s+STUDI|DISUSUN\s+OLEH|SKRIPSI|HALAMAN|PERSETUJUAN|PENGESAHAN|DEWAN|PENGUJI|ABSTRAK/i.test(l));
    if (candidate) {
      judul = candidate;
    } else if (rawFilename) {
      // Fallback 2: Extract title from rawFilename if provided
      const cleanName = rawFilename
        .replace(/\.(pdf|docx|doc)$/i, '')
        .replace(/^(SKRIPSI|THESIS|DRAFT|JURNAL|FILE)[_ -]*/i, '')
        .replace(/[_-]/g, ' ')
        .trim();
      if (cleanName.length >= 8) {
        judul = cleanName.toUpperCase();
      }
    }
  }

  // Email pattern
  const emailMatch = pages.slice(0, 5).map(p => p.text).join(' ').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // Defaults if empty
  if (!nama) nama = 'MAHASISWA';
  if (!nim) nim = '00000000';
  if (!prodi) prodi = 'Hukum Keluarga Islam';
  if (!judul) judul = 'JUDUL ARTIKEL SKRIPSI';

  const prodiCode = getProdiCode(prodi);

  return { nama, nim, prodi, prodiCode, judul, email };
}

/**
 * Heuristically detect section start/end pages based on Indonesian Thesis Headings
 */
export function detectSectionsFromText(
  pages: PageTextInfo[],
  meta: ThesisMetadata
): SectionRange[] {
  const total = pages.length;

  // Key headings regex rules
  const patterns: { key: SectionKey; label: string; regex: RegExp; filenameSuffix: string }[] = [
    { key: 'COVER', label: 'Cover Depan', regex: /^(?:COVER|SKRIPSI)/i, filenameSuffix: 'COVER' },
    { key: 'HALAMAN_PERSETUJUAN', label: 'Halaman Persetujuan', regex: /HALAMAN\s+PERSETUJUAN|PERSETUJUAN\s+PEMBIMBING/i, filenameSuffix: 'HALAMAN_PERSETUJUAN' },
    { key: 'HALAMAN_PENGESAHAN', label: 'Halaman Pengesahan', regex: /HALAMAN\s+PENGESAHAN|PENGESAHAN\s+PENGUJI|DEWAN\s+PENGUJI/i, filenameSuffix: 'HALAMAN_PENGESAHAN' },
    { key: 'ABSTRAK', label: 'Abstrak', regex: /\b(?:ABSTRAK|ABSTRACT)\b/i, filenameSuffix: 'ABSTRAK' },
    { key: 'KATA_PENGANTAR', label: 'Kata Pengantar / Prakata', regex: /KATA\s+PENGANTAR|PRAKATA/i, filenameSuffix: 'KATA_PENGANTAR' },
    { key: 'DAFTAR_ISI', label: 'Daftar Isi & Daftar Lain', regex: /DAFTAR\s+ISI/i, filenameSuffix: 'DAFTAR_ISI' },
    { key: 'BAB_I', label: 'BAB I (Pendahuluan)', regex: /BAB\s+I[\.\s\:\-]*PENDAHULUAN|\bBAB\s+I\b|\bBAB\s+1\b/i, filenameSuffix: 'BAB_I' },
    { key: 'BAB_II', label: 'BAB II (Kajian Teori)', regex: /BAB\s+II[\.\s\:\-]*|\bBAB\s+II\b|\bBAB\s+2\b/i, filenameSuffix: 'BAB_II' },
    { key: 'BAB_III', label: 'BAB III (Metode Penelitian)', regex: /BAB\s+III[\.\s\:\-]*|\bBAB\s+III\b|\bBAB\s+3\b/i, filenameSuffix: 'BAB_III' },
    { key: 'BAB_IV', label: 'BAB IV (Hasil & Pembahasan)', regex: /BAB\s+IV[\.\s\:\-]*|\bBAB\s+IV\b|\bBAB\s+4\b/i, filenameSuffix: 'BAB_IV' },
    { key: 'BAB_V', label: 'BAB V (Penutup)', regex: /BAB\s+V[\.\s\:\-]*PENUTUP|BAB\s+V[\.\s\:\-]*KESIMPULAN|\bBAB\s+V\b|\bBAB\s+5\b/i, filenameSuffix: 'BAB_V' },
    { key: 'DAFTAR_PUSTAKA', label: 'Daftar Pustaka / Rujukan', regex: /DAFTAR\s+PUSTAKA|DAFTAR\s+RUJUKAN|BIBLIOGRAFI/i, filenameSuffix: 'DAFTAR_PUSTAKA' },
    { key: 'KEASLIAN_TULISAN', label: 'Keaslian Tulisan', regex: /PERNYATAAN\s+KEASLIAN|SURAT\s+PERNYATAAN\s+KEASLIAN|KEASLIAN\s+TULISAN/i, filenameSuffix: 'KEASLIAN_TULISAN' },
    { key: 'LAMPIRAN', label: 'Lampiran', regex: /LAMPIRAN|LAMPIRAN-LAMPIRAN/i, filenameSuffix: 'LAMPIRAN' },
    { key: 'RIWAYAT_HIDUP', label: 'Riwayat Hidup / CV', regex: /RIWAYAT\s+HIDUP|CURRICULUM\s+VITAE|BIODATA\s+PENULIS/i, filenameSuffix: 'RIWAYAT_HIDUP' },
  ];

  // Step 1: Detect pages that are part of DAFTAR ISI (Table of Contents)
  const tocPageNumbers = new Set<number>();
  let inTOC = false;

  for (let pIndex = 0; pIndex < pages.length; pIndex++) {
    const pageNum = pIndex + 1;
    const text = pages[pIndex].text;

    const hasTocHeading = /DAFTAR\s+ISI/i.test(text.substring(0, 400));
    const hasDottedLeaders = (text.match(/\.{3,}|\.\s*\.\s*\.|\.{2,}\s*\d+/g) || []).length >= 2;
    const hasMultipleChaptersInPage = (text.match(/BAB\s+(?:I|II|III|IV|V|1|2|3|4|5)\b/gi) || []).length >= 2;

    if (hasTocHeading || (inTOC && (hasDottedLeaders || hasMultipleChaptersInPage))) {
      inTOC = true;
      tocPageNumbers.add(pageNum);
    } else if (inTOC) {
      // Check if TOC ends on this page
      if (hasDottedLeaders) {
        tocPageNumbers.add(pageNum);
      } else {
        inTOC = false;
      }
    }
  }

  // Helper to check if a page has a genuine chapter title (not inside TOC)
  const isGenuineChapterStart = (text: string, regex: RegExp): boolean => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    // Examine top 10 lines
    for (let i = 0; i < Math.min(12, lines.length); i++) {
      const line = lines[i];
      if (regex.test(line)) {
        // Exclude lines with TOC dots or trailing page numbers
        if (/\.{2,}|\.\s*\.\s*\.|\s+\d{1,3}\s*$/.test(line)) {
          continue; // It's a table of contents entry line
        }
        return true;
      }
    }
    return false;
  };

  // Find start page index for each section
  const sectionStarts: { key: SectionKey; startPage: number }[] = [];

  // 1. Cover always starts at page 1
  sectionStarts.push({ key: 'COVER', startPage: 1 });

  for (let pIndex = 0; pIndex < pages.length; pIndex++) {
    const pageNum = pIndex + 1;
    const text = pages[pIndex].text;

    for (const pat of patterns) {
      if (pat.key === 'COVER') continue; // handled above

      // NEVER match chapters or references inside DAFTAR ISI pages!
      if (tocPageNumbers.has(pageNum) && pat.key !== 'DAFTAR_ISI') {
        continue;
      }

      let isMatch = false;
      if (pat.key.startsWith('BAB_')) {
        isMatch = isGenuineChapterStart(text, pat.regex);
      } else if (pat.key === 'DAFTAR_PUSTAKA') {
        isMatch = isGenuineChapterStart(text, pat.regex) || (/DAFTAR\s+PUSTAKA/i.test(text.substring(0, 300)) && !tocPageNumbers.has(pageNum));
      } else {
        isMatch = pat.regex.test(text);
      }

      if (isMatch) {
        const existing = sectionStarts.find(s => s.key === pat.key);
        if (!existing) {
          sectionStarts.push({ key: pat.key, startPage: pageNum });
        }
      }
    }
  }

  // Sort sectionStarts by startPage
  sectionStarts.sort((a, b) => a.startPage - b.startPage);

  // Build full SectionRange objects
  const results: SectionRange[] = [];

  patterns.forEach(pat => {
    const found = sectionStarts.find(s => s.key === pat.key);
    let startPage = 0;
    let endPage = 0;

    if (found) {
      startPage = found.startPage;
      // End page is right before next section's start page or end of document
      const nextSection = sectionStarts.find(s => s.startPage > startPage);
      if (nextSection) {
        endPage = nextSection.startPage - 1;
      } else {
        endPage = total;
      }

      // Hard limits for single-page sections
      if (pat.key === 'HALAMAN_PERSETUJUAN' || pat.key === 'HALAMAN_PENGESAHAN' || pat.key === 'KEASLIAN_TULISAN' || pat.key === 'RIWAYAT_HIDUP') {
        if (endPage > startPage) endPage = startPage;
      } else if (pat.key === 'COVER') {
        if (endPage > startPage + 1) endPage = Math.min(startPage + 1, total);
      }
    }

    const detected = startPage > 0 && endPage >= startPage;
    const pageCount = detected ? endPage - startPage + 1 : 0;
    const filename = `${meta.nama}_${meta.nim}_${pat.filenameSuffix}_${meta.prodiCode}.pdf`.replace(/\s+/g, '_');

    results.push({
      key: pat.key,
      label: pat.label,
      filename,
      startPage: detected ? startPage : 0,
      endPage: detected ? endPage : 0,
      pageCount,
      detected,
      notes: detected ? `Halaman ${startPage}–${endPage}` : 'Tidak ditemukan dalam dokumen',
    });
  });

  return results;
}
