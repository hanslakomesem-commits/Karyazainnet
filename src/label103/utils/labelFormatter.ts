import { FormatSettings, LabelItem, LabelSheet, TextCasing } from '../types';

export const DEFAULT_SETTINGS: FormatSettings = {
  prefixLine: 'Di',
  destinationLine: 'Tempat',
  casing: 'original',
  separator: 'comma',
  removeDuplicates: false,
  fontFamily: 'Plus Jakarta Sans',
  fontSize: 11,
  isBoldName: true,
  alignment: 'center',
};

export const SAMPLE_GUEST_NAMES = [
  'Bpk. H. Rahmat Hidayat & Istri',
  'Ibu Hj. Siti Nurhaliza',
  'Dr. Hendra Wijaya, Sp.PD & Keluarga',
  'Prof. Dr. Ir. Bambang Soeprapto, M.Sc.',
  'Bpk. Joko Susilo, S.E. & Rekan',
  'Sdr. Kevin Pratama, S.Kom.',
  'Sdri. Amanda Putri Maharani, S.Ked.',
  'Bpk. Agus Santoso & Keluarga',
  'Keluarga Besar Bpk. Gunawan Wibisono',
  'Ibu Ratna Sari Dewi & Suami',
  'Bpk. Doni Firmansyah, S.T.',
  'Sdr. Muhammad Fajar Shiddiq',
  'Bpk. Drs. H. Achmad Fauzi, M.M.',
  'Ibu drg. Citra Lestari & Pasangan',
  'Bpk. Ridwan Kamil & Istri',
  'Sdr. Aditya Pratama',
  'Keluarga Bpk. Herman Suherman',
  'Sdri. Nadia Farhana, S.Psi.',
].join(', ');

/**
 * Capitalizes names neatly while respecting common titles and abbreviations
 */
export function applyCasing(name: string, casing: TextCasing): string {
  if (casing === 'original') return name;
  if (casing === 'upper') return name.toUpperCase();

  // Title Case logic
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (!word) return '';
      // Keep small connectives lowercase if in middle, unless at start
      const lowerWords = ['dan', 'di', 'ke', 'dari', 'bin', 'binti', '&'];
      if (lowerWords.includes(word)) return word;

      // Handle common titles & abbreviations like S.T., M.Kom, etc.
      if (word.includes('.')) {
        return word
          .split('.')
          .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
          .join('.');
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Parses raw text input into cleaned guest name array
 */
export function parseRawNames(rawText: string, settings: FormatSettings): {
  names: string[];
  totalDuplicates: number;
  duplicateNames: string[];
} {
  if (!rawText || !rawText.trim()) {
    return { names: [], totalDuplicates: 0, duplicateNames: [] };
  }

  let items: string[] = [];

  if (settings.separator === 'newline') {
    items = rawText.split(/\r?\n/);
  } else if (settings.separator === 'auto') {
    // If text contains newlines and very few commas, prefer newlines
    const newlineCount = (rawText.match(/\n/g) || []).length;
    const commaCount = (rawText.match(/,/g) || []).length;
    if (newlineCount > commaCount && newlineCount > 1) {
      items = rawText.split(/\r?\n/);
    } else {
      items = rawText.split(',');
    }
  } else {
    // Default: split strictly by comma (,)
    items = rawText.split(',');
  }

  // Clean and filter empty
  const cleanedList: string[] = [];
  const seenMap = new Map<string, number>();
  const duplicateList: string[] = [];

  for (const rawItem of items) {
    // Clean extra whitespace at start/end
    const cleaned = rawItem.trim().replace(/\s+/g, ' ');
    if (cleaned.length > 0) {
      const lower = cleaned.toLowerCase();
      const count = seenMap.get(lower) || 0;
      seenMap.set(lower, count + 1);

      if (count > 0 && !duplicateList.includes(cleaned)) {
        duplicateList.push(cleaned);
      }

      if (!settings.removeDuplicates || count === 0) {
        cleanedList.push(applyCasing(cleaned, settings.casing));
      }
    }
  }

  const totalDuplicates = Array.from(seenMap.values()).reduce(
    (acc, count) => acc + (count > 1 ? count - 1 : 0),
    0
  );

  return {
    names: cleanedList,
    totalDuplicates,
    duplicateNames: duplicateList,
  };
}

/**
 * Groups names into 103 sheets (12 labels per sheet, arranged in 4 rows x 3 columns)
 */
export function createSheets(names: string[], settings: FormatSettings): LabelSheet[] {
  if (names.length === 0) return [];

  const ITEMS_PER_SHEET = 12; // 3 columns x 4 rows
  const totalSheets = Math.ceil(names.length / ITEMS_PER_SHEET);
  const sheets: LabelSheet[] = [];

  let nameIndex = 0;

  for (let s = 1; s <= totalSheets; s++) {
    const rows: LabelItem[][] = [];
    let activeInSheet = 0;
    let emptyInSheet = 0;

    for (let r = 1; r <= 4; r++) {
      const rowItems: LabelItem[] = [];

      for (let c = 1; c <= 3; c++) {
        const globalIdx = (s - 1) * ITEMS_PER_SHEET + (r - 1) * 3 + c;
        if (nameIndex < names.length) {
          const currentName = names[nameIndex];
          rowItems.push({
            id: `sheet-${s}-r${r}-c${c}-${nameIndex}`,
            name: currentName,
            prefix: settings.prefixLine || 'Di',
            destination: settings.destinationLine || 'Tempat',
            isEmpty: false,
            globalIndex: globalIdx,
            sheetNumber: s,
            rowNumber: r,
            colNumber: c,
          });
          activeInSheet++;
          nameIndex++;
        } else {
          // Rule 6: Sisa sel dibiarkan kosong
          rowItems.push({
            id: `sheet-${s}-r${r}-c${c}-empty`,
            name: '',
            prefix: '',
            destination: '',
            isEmpty: true,
            globalIndex: globalIdx,
            sheetNumber: s,
            rowNumber: r,
            colNumber: c,
          });
          emptyInSheet++;
        }
      }
      rows.push(rowItems);
    }

    sheets.push({
      sheetNumber: s,
      rows,
      activeItemCount: activeInSheet,
      emptyItemCount: emptyInSheet,
    });
  }

  return sheets;
}

/**
 * Generates exact Markdown output following all required formatting rules:
 * 1. 3-column markdown table
 * 2. Keterangan ukuran label (3,2 cm x 6,4 cm) pada setiap awal lembar sebagai acuan margin Word
 * 3. Format 3 baris per sel: Nama Tamu <br> Di <br> Tempat
 * 4. Penanda "=== LEMBAR BARU (LABEL 103) ===" setiap 12 nama sebelum melanjutkan
 * 5. Sel kosong jika nama sudah habis di lembar terakhir
 */
export function generateMarkdownOutput(sheets: LabelSheet[]): string {
  if (sheets.length === 0) {
    return 'Belum ada data nama tamu. Silakan masukkan nama tamu yang dipisahkan koma.';
  }

  const parts: string[] = [];

  sheets.forEach((sheet, sheetIdx) => {
    // Add page break separator if not the first sheet
    if (sheetIdx > 0) {
      parts.push('\n=== LEMBAR BARU (LABEL 103) ===\n');
    }

    // Header information as required: Keterangan ukuran label (6,4 cm x 3,3 cm) sebagai acuan margin Word
    const headerInfo = [
      `### LEMBAR ${sheet.sheetNumber} - LABEL UNDANGAN 103`,
      `*Ukuran Kolom / Label: 6,4 cm x 3,3 cm (Ukuran Kertas Undangan: 20 cm x 14 cm, Acuan Margin Word: Top 0,5 cm, Side 0,2 cm)*`,
      `*Tata Letak: 3 Kolom ke Samping x 4 Baris ke Bawah (Presisi 12 Kolom/Lembar)*\n`,
    ].join('\n');

    // Build 3-column Markdown Table
    const tableHeader = '| Kolom 1 | Kolom 2 | Kolom 3 |\n| :---: | :---: | :---: |';
    const tableRows = sheet.rows.map((row) => {
      const colCells = row.map((cell) => {
        if (cell.isEmpty || !cell.name.trim()) {
          return ' '; // Empty cell
        }
        // Format 3 baris: Nama Tamu <br> Di <br> Tempat
        return `${escapeMarkdown(cell.name)}<br>${cell.prefix}<br>${cell.destination}`;
      });
      return `| ${colCells.join(' | ')} |`;
    });

    parts.push(`${headerInfo}\n${tableHeader}\n${tableRows.join('\n')}`);
  });

  return parts.join('\n');
}

/**
 * Helper to escape pipes in markdown table cells
 */
function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|');
}

/**
 * Generates an HTML table formatted specifically for Microsoft Word copy-pasting.
 * When a user copies this rich text HTML and presses Ctrl+V in Word,
 * it creates a 3x4 table with 3.2cm height and 6.4cm width per cell.
 */
export function generateWordHtml(sheets: LabelSheet[], settings: FormatSettings): string {
  const fontFam = settings.fontFamily || 'Arial, sans-serif';
  const fontSize = `${settings.fontSize}pt`;
  const align = settings.alignment;

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      @page {
        size: 20cm 14cm; /* Ukuran Kertas Label Undangan 103 (20 × 14 cm) */
        margin: 0.4cm 0.2cm 0.4cm 0.2cm;
        mso-page-orientation: landscape;
      }
      @page Section1 {
        size: 20cm 14cm; /* Ukuran Kertas Label Undangan 103 (20 × 14 cm) */
        margin: 0.4cm 0.2cm 0.4cm 0.2cm;
        mso-header-margin: 0cm;
        mso-footer-margin: 0cm;
        mso-paper-source: 0;
      }
      div.Section1 {
        page: Section1;
        width: 20cm;
      }
      body {
        font-family: ${fontFam};
        margin: 0;
        padding: 0;
      }
      table.label103-sheet {
        width: 20cm;
        max-width: 20cm;
        border-collapse: separate;
        border-spacing: 0.3cm 0.2cm;
        margin: 0 auto;
        page-break-after: always;
      }
      td.label-cell {
        width: 6.4cm;
        min-width: 6.4cm;
        max-width: 6.4cm;
        height: 3.3cm;
        min-height: 3.3cm;
        max-height: 3.3cm;
        text-align: ${align};
        vertical-align: middle;
        padding: 0.1cm 0.2cm;
        border: 1px dashed #d1d5db;
        font-size: ${fontSize};
        line-height: 1.25;
        font-family: ${fontFam};
      }
      .guest-name {
        font-weight: ${settings.isBoldName ? 'bold' : 'normal'};
        font-size: ${fontSize};
        margin: 0;
        padding: 0;
      }
      .label-prefix {
        font-size: 9.5pt;
        margin: 2px 0;
        color: #374151;
      }
      .label-dest {
        font-size: 10pt;
        margin: 0;
        color: #1f2937;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
    </style>
  </head>
  <body>
    <div class="Section1">`;

  sheets.forEach((sheet, idx) => {
    html += `<!-- Lembar ${sheet.sheetNumber} (Ukuran Kolom Label: 6,4 cm x 3,3 cm, Kertas Undangan: 20 cm x 14 cm, Presisi 12 Kolom) -->`;
    html += `<table class="label103-sheet" border="0" cellpadding="0" cellspacing="0" style="width: 20cm; margin-bottom: 20px;">`;

    sheet.rows.forEach((row) => {
      html += `<tr>`;
      row.forEach((cell) => {
        if (cell.isEmpty || !cell.name.trim()) {
          html += `<td class="label-cell" style="width: 6.4cm; height: 3.3cm; border: 1px dashed #e5e7eb;">&nbsp;</td>`;
        } else {
          html += `<td class="label-cell" style="width: 6.4cm; height: 3.3cm; text-align: ${align}; vertical-align: middle; padding: 4px; border: 1px dashed #9ca3af;">
            <div class="guest-name" style="font-weight: ${settings.isBoldName ? 'bold' : 'normal'}; font-size: ${fontSize}; margin-bottom: 3px;">${escapeHtml(cell.name)}</div>
            <div class="label-prefix" style="font-size: 9pt; margin-bottom: 2px;">${escapeHtml(cell.prefix)}</div>
            <div class="label-dest" style="font-size: 9.5pt;">${escapeHtml(cell.destination)}</div>
          </td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</table>`;
    if (idx < sheets.length - 1) {
      html += `<br class="page-break" style="page-break-after: always;" />`;
    }
  });

  html += `</div></body></html>`;
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Downloads a pre-formatted Word Document (.doc format with embedded HTML table)
 * that Microsoft Word natively opens directly formatted as a 3x4 table.
 */
export function downloadWordDocument(sheets: LabelSheet[], settings: FormatSettings): void {
  const content = generateWordHtml(sheets, settings);
  const blob = new Blob(['\ufeff', content], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Label_Undangan_103_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a Markdown file (.md)
 */
export function downloadMarkdownFile(markdownContent: string): void {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Label_Undangan_103_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
