import JSZip from 'jszip';
import {
  cmToEmu,
  cmToTwips,
  PAPER_PRESETS,
} from './conversions';
import {
  CalculatedLayout,
  GridConfig,
  PhotoItem,
  ResolvedRowLayout,
} from '../types';
import { processImageToBlob } from './imageProcessor';

export function getPhotoSlotKey(photoId: string, widthCm: number, heightCm: number): string {
  return `${photoId}_${widthCm.toFixed(2)}x${heightCm.toFixed(2)}`;
}

export function calculateLayout(
  photos: PhotoItem[],
  config: GridConfig
): CalculatedLayout {
  // Determine paper dimensions
  let pW: number;
  let pH: number;

  if (config.paperType === 'Custom') {
    pW = config.customPaperWidthCm;
    pH = config.customPaperHeightCm;
  } else {
    const preset = PAPER_PRESETS[config.paperType] || PAPER_PRESETS.A4;
    pW = preset.widthCm;
    pH = preset.heightCm;
  }

  // Adjust for orientation
  const pageWidthCm = config.orientation === 'landscape' ? Math.max(pW, pH) : Math.min(pW, pH);
  const pageHeightCm = config.orientation === 'landscape' ? Math.min(pW, pH) : Math.max(pW, pH);

  // Margins
  const m = config.margins;
  const printableWidthCm = Math.max(1, pageWidthCm - m.leftCm - m.rightCm);
  const printableHeightCm = Math.max(1, pageHeightCm - m.topCm - m.bottomCm);

  const photoWidthCm = Math.max(0.5, config.targetWidthCm);
  const photoHeightCm = Math.max(0.5, config.targetHeightCm);
  const gutterCm = Math.max(0, config.gutterCm);
  const rowSpacingCm = Math.max(0, config.rowSpacingCm);

  // Extra height per cell if label/caption is enabled
  const labelExtraCm = config.showLabels ? 0.6 : 0;

  const resolvedRows: ResolvedRowLayout[] = [];

  const isMultiSize =
    config.sizeLayoutMode === 'multi_size_mix' ||
    photos.some((p) => {
      const ms = p.multiSizeCopies;
      return (ms?.size2x3 || 0) > 0 || (ms?.size3x4 || 0) > 0 || (ms?.size4x6 || 0) > 0;
    });

  if (isMultiSize) {
    const packingMode = config.multiSizePackingMode || 'compact_side_by_side';

    if (packingMode === 'compact_side_by_side') {
      const itemsToPack: { widthCm: number; heightCm: number; sizeKey: string }[] = [];
      for (const photo of photos) {
        const ms = photo.multiSizeCopies;
        const count4x6 = ms?.size4x6 || 0;
        const count3x4 = ms?.size3x4 || 0;
        const count2x3 = ms?.size2x3 || 0;
        if (count4x6 > 0 || count3x4 > 0 || count2x3 > 0) {
          for (let i = 0; i < count4x6; i++) itemsToPack.push({ widthCm: 4.0, heightCm: 6.0, sizeKey: '4x6' });
          for (let i = 0; i < count3x4; i++) itemsToPack.push({ widthCm: 3.0, heightCm: 4.0, sizeKey: '3x4' });
          for (let i = 0; i < count2x3; i++) itemsToPack.push({ widthCm: 2.0, heightCm: 3.0, sizeKey: '2x3' });
        } else {
          const count = Math.max(1, photo.copies || 1);
          for (let i = 0; i < count; i++) {
            itemsToPack.push({ widthCm: photoWidthCm, heightCm: photoHeightCm, sizeKey: 'default' });
          }
        }
      }

      // Pack photos dynamically to the right (side-by-side) to save paper
      let currentRowCells: {
        cellIndex: number;
        widthCm: number;
        heightCm: number;
        sizeKey: string;
        emuWidth: number;
        emuHeight: number;
        twipWidth: number;
        twipHeight: number;
      }[] = [];
      let currentRowWidth = 0;
      let rIdx = 0;

      for (const item of itemsToPack) {
        const neededWidth = currentRowCells.length === 0 ? item.widthCm : (item.widthCm + gutterCm);
        if (currentRowCells.length > 0 && currentRowWidth + neededWidth > printableWidthCm + 0.05) {
          // Wrap to new row
          const maxH = Math.max(...currentRowCells.map(c => c.heightCm));
          const avgW = currentRowCells.reduce((a, b) => a + b.widthCm, 0) / currentRowCells.length;
          resolvedRows.push({
            rowIndex: rIdx++,
            widthCm: avgW,
            heightCm: maxH,
            maxHeightCm: maxH,
            columns: currentRowCells.length,
            emuWidth: cmToEmu(avgW),
            emuHeight: cmToEmu(maxH),
            twipWidth: cmToTwips(avgW),
            twipHeight: cmToTwips(maxH),
            cells: [...currentRowCells],
          });
          currentRowCells = [];
          currentRowWidth = 0;
        }

        currentRowCells.push({
          cellIndex: currentRowCells.length,
          widthCm: item.widthCm,
          heightCm: item.heightCm,
          sizeKey: item.sizeKey,
          emuWidth: cmToEmu(item.widthCm),
          emuHeight: cmToEmu(item.heightCm),
          twipWidth: cmToTwips(item.widthCm),
          twipHeight: cmToTwips(item.heightCm),
        });
        currentRowWidth += currentRowCells.length === 1 ? item.widthCm : (item.widthCm + gutterCm);
      }

      if (currentRowCells.length > 0) {
        const maxH = Math.max(...currentRowCells.map(c => c.heightCm));
        const avgW = currentRowCells.reduce((a, b) => a + b.widthCm, 0) / currentRowCells.length;
        resolvedRows.push({
          rowIndex: rIdx++,
          widthCm: avgW,
          heightCm: maxH,
          maxHeightCm: maxH,
          columns: currentRowCells.length,
          emuWidth: cmToEmu(avgW),
          emuHeight: cmToEmu(maxH),
          twipWidth: cmToTwips(avgW),
          twipHeight: cmToTwips(maxH),
          cells: [...currentRowCells],
        });
      }

      if (resolvedRows.length === 0) {
        resolvedRows.push({
          rowIndex: 0,
          widthCm: photoWidthCm,
          heightCm: photoHeightCm,
          columns: 6,
          emuWidth: cmToEmu(photoWidthCm),
          emuHeight: cmToEmu(photoHeightCm),
          twipWidth: cmToTwips(photoWidthCm),
          twipHeight: cmToTwips(photoHeightCm),
        });
      }
    } else {
      let total4x6 = 0;
      let total3x4 = 0;
      let total2x3 = 0;
      let totalOther = 0;

      for (const photo of photos) {
        const ms = photo.multiSizeCopies;
        const count4x6 = ms?.size4x6 || 0;
        const count3x4 = ms?.size3x4 || 0;
        const count2x3 = ms?.size2x3 || 0;
        if (count4x6 > 0 || count3x4 > 0 || count2x3 > 0) {
          total4x6 += count4x6;
          total3x4 += count3x4;
          total2x3 += count2x3;
        } else {
          totalOther += Math.max(1, photo.copies || 1);
        }
      }

      let rIdx = 0;
      // Baris 4x6: 5 foto per baris
      if (total4x6 > 0) {
        const rows4x6 = Math.ceil(total4x6 / 5);
        for (let r = 0; r < rows4x6; r++) {
          resolvedRows.push({
            rowIndex: rIdx++,
            widthCm: 4.0,
            heightCm: 6.0,
            columns: 5,
            emuWidth: cmToEmu(4.0),
            emuHeight: cmToEmu(6.0),
            twipWidth: cmToTwips(4.0),
            twipHeight: cmToTwips(6.0),
          });
        }
      }

      // Baris 3x4: 6 foto per baris
      if (total3x4 > 0) {
        const rows3x4 = Math.ceil(total3x4 / 6);
        for (let r = 0; r < rows3x4; r++) {
          resolvedRows.push({
            rowIndex: rIdx++,
            widthCm: 3.0,
            heightCm: 4.0,
            columns: 6,
            emuWidth: cmToEmu(3.0),
            emuHeight: cmToEmu(4.0),
            twipWidth: cmToTwips(3.0),
            twipHeight: cmToTwips(4.0),
          });
        }
      }

      // Baris 2x3: 8 foto per baris
      if (total2x3 > 0) {
        const rows2x3 = Math.ceil(total2x3 / 8);
        for (let r = 0; r < rows2x3; r++) {
          resolvedRows.push({
            rowIndex: rIdx++,
            widthCm: 2.0,
            heightCm: 3.0,
            columns: 8,
            emuWidth: cmToEmu(2.0),
            emuHeight: cmToEmu(3.0),
            twipWidth: cmToTwips(2.0),
            twipHeight: cmToTwips(3.0),
          });
        }
      }

      // Baris foto lainnya jika ada
      if (totalOther > 0) {
        const cols = Math.abs(photoWidthCm - 4.0) < 0.15 ? 5 : (Math.abs(photoWidthCm - 3.0) < 0.15 ? 6 : 6);
        const rowsOther = Math.ceil(totalOther / cols);
        for (let r = 0; r < rowsOther; r++) {
          resolvedRows.push({
            rowIndex: rIdx++,
            widthCm: photoWidthCm,
            heightCm: photoHeightCm,
            columns: cols,
            emuWidth: cmToEmu(photoWidthCm),
            emuHeight: cmToEmu(photoHeightCm),
            twipWidth: cmToTwips(photoWidthCm),
            twipHeight: cmToTwips(photoHeightCm),
          });
        }
      }

      if (resolvedRows.length === 0) {
        resolvedRows.push({
          rowIndex: 0,
          widthCm: photoWidthCm,
          heightCm: photoHeightCm,
          columns: 6,
          emuWidth: cmToEmu(photoWidthCm),
          emuHeight: cmToEmu(photoHeightCm),
          twipWidth: cmToTwips(photoWidthCm),
          twipHeight: cmToTwips(photoHeightCm),
        });
      }
    }
  } else if (config.sizeLayoutMode === 'per_row' && config.rowConfigs && config.rowConfigs.length > 0) {
    config.rowConfigs.forEach((rc, idx) => {
      const rW = Math.max(0.5, rc.widthCm);
      const rH = Math.max(0.5, rc.heightCm);
      let rCols: number;
      if (rc.columnsMode === 'custom' && rc.customColumns > 0) {
        rCols = rc.customColumns;
      } else if (config.columnsMode === 'custom' && config.customColumns > 0) {
        rCols = config.customColumns;
      } else {
        // Aturan spesifik revisi menu 8:
        // Ukuran 4x6 harus muat 1 baris 5 foto
        // Ukuran 3x4 harus muat 1 baris 6 foto
        if (Math.abs(rW - 4.0) < 0.15) {
          rCols = 5;
        } else if (Math.abs(rW - 3.0) < 0.15) {
          rCols = 6;
        } else if (Math.abs(rW - 2.0) < 0.15) {
          rCols = 8;
        } else {
          const fitCols = Math.floor((printableWidthCm + gutterCm) / (rW + gutterCm));
          rCols = Math.max(1, fitCols);
        }
      }

      resolvedRows.push({
        rowIndex: idx,
        widthCm: rW,
        heightCm: rH,
        columns: rCols,
        emuWidth: cmToEmu(rW),
        emuHeight: cmToEmu(rH),
        twipWidth: cmToTwips(rW),
        twipHeight: cmToTwips(rH),
      });
    });
  } else {
    const effectiveCellHeightCm = photoHeightCm + labelExtraCm;
    let columns: number;
    if (config.columnsMode === 'custom' && config.customColumns > 0) {
      columns = config.customColumns;
    } else {
      // Aturan spesifik revisi menu 8:
      // Ukuran 4x6 harus muat 1 baris 5 foto
      // Ukuran 3x4 harus muat 1 baris 6 foto
      if (Math.abs(photoWidthCm - 4.0) < 0.15) {
        columns = 5;
      } else if (Math.abs(photoWidthCm - 3.0) < 0.15) {
        columns = 6;
      } else if (Math.abs(photoWidthCm - 2.0) < 0.15) {
        columns = 8;
      } else {
        const fitCols = Math.floor((printableWidthCm + gutterCm) / (photoWidthCm + gutterCm));
        columns = Math.max(1, fitCols);
      }
    }

    const fitRows = Math.floor(
      (printableHeightCm + rowSpacingCm) / (effectiveCellHeightCm + rowSpacingCm)
    );
    const rowsPerPage = (config.customRows && config.customRows > 0)
      ? config.customRows
      : Math.max(1, fitRows);

    for (let r = 0; r < rowsPerPage; r++) {
      resolvedRows.push({
        rowIndex: r,
        widthCm: photoWidthCm,
        heightCm: photoHeightCm,
        columns,
        emuWidth: cmToEmu(photoWidthCm),
        emuHeight: cmToEmu(photoHeightCm),
        twipWidth: cmToTwips(photoWidthCm),
        twipHeight: cmToTwips(photoHeightCm),
      });
    }
  }

  const rowsPerPage = Math.max(1, resolvedRows.length);
  const columns = resolvedRows[0]?.columns || 1;
  const photosPerPage = Math.max(
    1,
    resolvedRows.reduce((acc, r) => acc + r.columns, 0)
  );

  // Count total items including duplicates/copies
  let totalPhotosWithCopies = 0;
  if (isMultiSize) {
    for (const p of photos) {
      const ms = p.multiSizeCopies;
      const countMulti = (ms?.size4x6 || 0) + (ms?.size3x4 || 0) + (ms?.size2x3 || 0);
      if (countMulti > 0) {
        totalPhotosWithCopies += countMulti;
      } else {
        totalPhotosWithCopies += Math.max(1, p.copies || 1);
      }
    }
  } else {
    totalPhotosWithCopies = photos.reduce((acc, p) => acc + (p.copies || 1), 0);
  }
  const totalPages = Math.max(1, Math.ceil(totalPhotosWithCopies / photosPerPage));

  // Convert to EMU & Twips (primary/first row fallback)
  const emuWidth = cmToEmu(photoWidthCm);
  const emuHeight = cmToEmu(photoHeightCm);

  const twipWidth = cmToTwips(photoWidthCm);
  const twipHeight = cmToTwips(photoHeightCm);
  const twipPageWidth = cmToTwips(pageWidthCm);
  const twipPageHeight = cmToTwips(pageHeightCm);

  const twipMargins = {
    top: cmToTwips(m.topCm),
    bottom: cmToTwips(m.bottomCm),
    left: cmToTwips(m.leftCm),
    right: cmToTwips(m.rightCm),
  };

  return {
    pageWidthCm,
    pageHeightCm,
    printableWidthCm,
    printableHeightCm,
    columns,
    rowsPerPage,
    photosPerPage,
    totalPages,
    totalPhotosWithCopies,
    photoWidthCm,
    photoHeightCm,
    gutterCm,
    rowSpacingCm,
    emuWidth,
    emuHeight,
    twipWidth,
    twipHeight,
    twipPageWidth,
    twipPageHeight,
    twipMargins,
    resolvedRows,
  };
}

export interface ImageRelationship {
  id: string;
  rId: string;
  fileName: string;
  blob: Blob;
  name: string;
}

export interface ExpandedPhotoItem {
  photo?: PhotoItem;
  copyIndex?: number;
  label?: string;
  widthCm?: number;
  heightCm?: number;
  sizeKey?: '4x6' | '3x4' | '2x3' | 'default';
  isPlaceholder?: boolean;
}

export function expandPhotosWithCopies(
  photos: PhotoItem[],
  labelType: 'filename' | 'counter' | 'blank',
  config?: GridConfig
): ExpandedPhotoItem[] {
  const isMultiSize =
    config?.sizeLayoutMode === 'multi_size_mix' ||
    photos.some((p) => {
      const ms = p.multiSizeCopies;
      return (ms?.size2x3 || 0) > 0 || (ms?.size3x4 || 0) > 0 || (ms?.size4x6 || 0) > 0;
    });

  if (isMultiSize) {
    const raw4x6: ExpandedPhotoItem[] = [];
    const raw3x4: ExpandedPhotoItem[] = [];
    const raw2x3: ExpandedPhotoItem[] = [];
    const rawOther: ExpandedPhotoItem[] = [];

    let counter = 1;

    for (const photo of photos) {
      const ms = photo.multiSizeCopies;
      const count4x6 = ms?.size4x6 || 0;
      const count3x4 = ms?.size3x4 || 0;
      const count2x3 = ms?.size2x3 || 0;

      const hasMulti = count4x6 > 0 || count3x4 > 0 || count2x3 > 0;

      if (hasMulti) {
        // 4x6
        for (let c = 0; c < count4x6; c++) {
          const label = labelType === 'filename'
            ? `${photo.name.replace(/\.[^/.]+$/, '')} (4×6)`
            : labelType === 'counter' ? `Foto ${counter} (4×6)` : '';
          raw4x6.push({
            photo,
            copyIndex: c,
            label,
            widthCm: 4.0,
            heightCm: 6.0,
            sizeKey: '4x6',
          });
          counter++;
        }
        // 3x4
        for (let c = 0; c < count3x4; c++) {
          const label = labelType === 'filename'
            ? `${photo.name.replace(/\.[^/.]+$/, '')} (3×4)`
            : labelType === 'counter' ? `Foto ${counter} (3×4)` : '';
          raw3x4.push({
            photo,
            copyIndex: c,
            label,
            widthCm: 3.0,
            heightCm: 4.0,
            sizeKey: '3x4',
          });
          counter++;
        }
        // 2x3
        for (let c = 0; c < count2x3; c++) {
          const label = labelType === 'filename'
            ? `${photo.name.replace(/\.[^/.]+$/, '')} (2×3)`
            : labelType === 'counter' ? `Foto ${counter} (2×3)` : '';
          raw2x3.push({
            photo,
            copyIndex: c,
            label,
            widthCm: 2.0,
            heightCm: 3.0,
            sizeKey: '2x3',
          });
          counter++;
        }
      } else {
        const count = Math.max(1, photo.copies || 1);
        for (let c = 0; c < count; c++) {
          const label = labelType === 'filename'
            ? `${photo.name.replace(/\.[^/.]+$/, '')}${count > 1 ? ` #${c + 1}` : ''}`
            : labelType === 'counter' ? `Foto ${counter}` : '';
          rawOther.push({
            photo,
            copyIndex: c,
            label,
            widthCm: config?.targetWidthCm || 3.0,
            heightCm: config?.targetHeightCm || 4.0,
            sizeKey: 'default',
          });
          counter++;
        }
      }
    }

    const packingMode = config?.multiSizePackingMode || 'compact_side_by_side';
    if (packingMode === 'compact_side_by_side') {
      // In compact side-by-side mode, items flow continuously across rows without dummy placeholders
      return [...raw4x6, ...raw3x4, ...raw2x3, ...rawOther];
    }

    const result: ExpandedPhotoItem[] = [];

    const padGroupIntoRows = (items: ExpandedPhotoItem[], colsPerRow: number, widthCm: number, heightCm: number, sizeKey: '4x6' | '3x4' | '2x3' | 'default') => {
      for (let i = 0; i < items.length; i += colsPerRow) {
        const slice = items.slice(i, i + colsPerRow);
        for (const it of slice) {
          result.push(it);
        }
        const neededPadding = colsPerRow - slice.length;
        for (let p = 0; p < neededPadding; p++) {
          result.push({
            isPlaceholder: true,
            widthCm,
            heightCm,
            sizeKey,
          });
        }
      }
    };

    if (raw4x6.length > 0) padGroupIntoRows(raw4x6, 5, 4.0, 6.0, '4x6');
    if (raw3x4.length > 0) padGroupIntoRows(raw3x4, 6, 3.0, 4.0, '3x4');
    if (raw2x3.length > 0) padGroupIntoRows(raw2x3, 8, 2.0, 3.0, '2x3');
    if (rawOther.length > 0) {
      const defaultCols = Math.abs((config?.targetWidthCm || 3.0) - 4.0) < 0.15 ? 5 : (Math.abs((config?.targetWidthCm || 3.0) - 3.0) < 0.15 ? 6 : 6);
      padGroupIntoRows(rawOther, defaultCols, config?.targetWidthCm || 3.0, config?.targetHeightCm || 4.0, 'default');
    }

    return result;
  }

  const result: ExpandedPhotoItem[] = [];
  let counter = 1;

  for (const photo of photos) {
    const count = Math.max(1, photo.copies || 1);
    for (let c = 0; c < count; c++) {
      let label = '';
      if (labelType === 'filename') {
        label = photo.name.replace(/\.[^/.]+$/, '');
        if (count > 1) label += ` #${c + 1}`;
      } else if (labelType === 'counter') {
        label = `Foto ${counter}`;
      }
      result.push({
        photo,
        copyIndex: c,
        label,
        widthCm: config?.targetWidthCm || 3.0,
        heightCm: config?.targetHeightCm || 4.0,
        sizeKey: 'default',
      });
      counter++;
    }
  }

  return result;
}

/**
 * Escapes XML special characters for safety in Word OpenXML
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates document.xml Office OpenXML string conforming to ECMA-376 standard
 */
export function generateDocumentXml(
  expandedPhotos: ExpandedPhotoItem[],
  photoRIdMap: Map<string, string>,
  layout: CalculatedLayout,
  config: GridConfig
): string {
  const {
    photosPerPage,
    totalPages,
    twipPageWidth,
    twipPageHeight,
    twipMargins,
    gutterCm,
    rowSpacingCm,
    resolvedRows,
  } = layout;

  const twipGutter = cmToTwips(gutterCm);
  const twipHalfGutter = Math.round(twipGutter / 2);
  const twipRowSpacing = cmToTwips(rowSpacingCm);
  const twipHalfRowSpacing = Math.round(twipRowSpacing / 2);

  // Border settings for cut guides
  const cutBordersXml = config.showCutGuides
    ? `<w:tcBorders>
        <w:top w:val="dashed" w:sz="4" w:space="0" w:color="999999"/>
        <w:left w:val="dashed" w:sz="4" w:space="0" w:color="999999"/>
        <w:bottom w:val="dashed" w:sz="4" w:space="0" w:color="999999"/>
        <w:right w:val="dashed" w:sz="4" w:space="0" w:color="999999"/>
      </w:tcBorders>`
    : `<w:tcBorders>
        <w:top w:val="none"/>
        <w:left w:val="none"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
      </w:tcBorders>`;

  let bodyContent = '';

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageStartIndex = pageIdx * photosPerPage;
    const pageItems = expandedPhotos.slice(pageStartIndex, pageStartIndex + photosPerPage);

    if (pageItems.length === 0) continue;

    // Add page break if subsequent page
    if (pageIdx > 0) {
      bodyContent += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:br w:type="page"/>
      </w:r>
    </w:p>`;
    }

    let consumedInPage = 0;

    for (let r = 0; r < resolvedRows.length; r++) {
      if (consumedInPage >= pageItems.length) break;

      const rowLayout = resolvedRows[r];
      const rowCols = rowLayout.columns;
      const rowEmuW = rowLayout.emuWidth;
      const rowEmuH = rowLayout.emuHeight;
      const rowTwipColW = rowLayout.twipWidth;

      let rowCells = '';
      for (let c = 0; c < rowCols; c++) {
        const itemIndex = consumedInPage + c;
        if (itemIndex < pageItems.length) {
          const item = pageItems[itemIndex];
          const cellDef = rowLayout.cells?.[c];
          const cellW = cellDef ? cellDef.widthCm : rowLayout.widthCm;
          const cellH = cellDef ? cellDef.heightCm : rowLayout.heightCm;
          const cellTwipW = cellDef ? cellDef.twipWidth : rowTwipColW;
          const cellEmuW = cellDef ? cellDef.emuWidth : rowEmuW;
          const cellEmuH = cellDef ? cellDef.emuHeight : rowEmuH;

          if (item && !item.isPlaceholder && item.photo) {
            const slotKey = getPhotoSlotKey(item.photo.id, cellW, cellH);
            const rId =
              photoRIdMap.get(slotKey) ||
              photoRIdMap.get(item.photo.id) ||
              'rId1';
            const docPrId = pageStartIndex + itemIndex + 100;
            const photoName = escapeXml(item.photo.name);
            const labelText = escapeXml(item.label || '');

            rowCells += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${cellTwipW}" w:type="dxa"/>
            <w:tcMar>
              <w:top w:w="${twipHalfRowSpacing}" w:type="dxa"/>
              <w:left w:w="${twipHalfGutter}" w:type="dxa"/>
              <w:bottom w:w="${twipHalfRowSpacing}" w:type="dxa"/>
              <w:right w:w="${twipHalfGutter}" w:type="dxa"/>
            </w:tcMar>
            ${cutBordersXml}
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="${cellEmuW}" cy="${cellEmuH}"/>
                  <wp:effectExtent l="0" t="0" r="0" b="0"/>
                  <wp:docPr id="${docPrId}" name="${photoName}"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                          <pic:cNvPr id="${docPrId}" name="${photoName}"/>
                          <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="${rId}"/>
                          <a:stretch>
                            <a:fillRect/>
                          </a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="${cellEmuW}" cy="${cellEmuH}"/>
                          </a:xfrm>
                          <a:prstGeom prst="rect">
                            <a:avLst/>
                          </a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>${
            config.showLabels && labelText
              ? `
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="40" w:after="20"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                <w:sz w:val="14"/>
                <w:color w:val="666666"/>
              </w:rPr>
              <w:t>${labelText}</w:t>
            </w:r>
          </w:p>`
              : ''
          }
        </w:tc>`;
          } else {
            // Placeholder cell
            rowCells += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${rowTwipColW}" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="none"/>
              <w:left w:val="none"/>
              <w:bottom w:val="none"/>
              <w:right w:val="none"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="0"/>
            </w:pPr>
          </w:p>
        </w:tc>`;
          }
        } else {
          // Empty cell in last row to maintain grid width
          rowCells += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${rowTwipColW}" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="none"/>
              <w:left w:val="none"/>
              <w:bottom w:val="none"/>
              <w:right w:val="none"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="0"/>
            </w:pPr>
          </w:p>
        </w:tc>`;
        }
      }

      consumedInPage += rowCols;

      let gridColsXml = '';
      for (let c = 0; c < rowCols; c++) {
        const cellDef = rowLayout.cells?.[c];
        const colW = cellDef ? cellDef.twipWidth : rowTwipColW;
        gridColsXml += `<w:gridCol w:w="${colW}"/>`;
      }

      // Check for STNK dimensions (23x7.5cm) to center it in A4
      const isStnk = Math.abs(rowLayout.widthCm - 23.0) < 0.1 && Math.abs(rowLayout.heightCm - 7.5) < 0.1;
      const tblW = isStnk ? `<w:tblW w:w="0" w:type="auto"/>` : `<w:tblW w:w="0" w:type="auto"/>`;
      const jc = isStnk ? `<w:jc w:val="center"/>` : `<w:jc w:val="center"/>`;

      bodyContent += `
    <w:tbl>
      <w:tblPr>
        ${tblW}
        ${jc}
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        ${gridColsXml}
      </w:tblGrid>
      <w:tr>
        <w:trPr>
          <w:cantSplit/>
        </w:trPr>
        ${rowCells}
      </w:tr>
    </w:tbl>`;
    }
  }

  // Final section properties (page size, orientation, margins in Twips)
  const orientationAttr = config.orientation === 'landscape' ? 'w:orient="landscape"' : 'w:orient="portrait"';

  // Pastikan margin kiri & kanan tidak memotong baris foto (misal 5 foto ukuran 4x6 = 20 cm di A4 21 cm)
  let maxRowRequiredTwips = 0;
  for (const r of resolvedRows) {
    const rowTwipTotal = r.columns * r.twipWidth + Math.max(0, r.columns - 1) * twipGutter;
    if (rowTwipTotal > maxRowRequiredTwips) {
      maxRowRequiredTwips = rowTwipTotal;
    }
  }

  let effTwipLeft = twipMargins.left;
  let effTwipRight = twipMargins.right;
  if (maxRowRequiredTwips + effTwipLeft + effTwipRight > twipPageWidth) {
    const sisaTwips = Math.max(140, twipPageWidth - maxRowRequiredTwips);
    effTwipLeft = Math.round(sisaTwips / 2);
    effTwipRight = Math.round(sisaTwips / 2);
  }

  const sectPrXml = `
    <w:sectPr>
      <w:pgSz w:w="${twipPageWidth}" w:h="${twipPageHeight}" ${orientationAttr}/>
      <w:pgMar w:top="${twipMargins.top}" w:right="${effTwipRight}" w:bottom="${twipMargins.bottom}" w:left="${effTwipLeft}" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
${bodyContent}
${sectPrXml}
  </w:body>
</w:document>`;
}

/**
 * Builds standard [Content_Types].xml
 */
function buildContentTypesXml(imageFiles: { ext: string }[]): string {
  const extensions = new Set<string>(['png', 'jpeg', 'jpg']);
  for (const img of imageFiles) {
    extensions.add(img.ext.toLowerCase());
  }

  let defaultsXml = '';
  defaultsXml += `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n`;
  defaultsXml += `<Default Extension="xml" ContentType="application/xml"/>\n`;

  for (const ext of extensions) {
    if (ext === 'jpg' || ext === 'jpeg') {
      defaultsXml += `<Default Extension="${ext}" ContentType="image/jpeg"/>\n`;
    } else if (ext === 'png') {
      defaultsXml += `<Default Extension="png" ContentType="image/png"/>\n`;
    } else if (ext === 'webp') {
      defaultsXml += `<Default Extension="webp" ContentType="image/webp"/>\n`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  ${defaultsXml}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;
}

/**
 * Builds _rels/.rels
 */
function buildRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

/**
 * Builds word/_rels/document.xml.rels
 */
function buildDocumentRelsXml(
  imageRelations: { rId: string; target: string }[]
): string {
  let imgRels = '';
  for (const rel of imageRelations) {
    imgRels += `<Relationship Id="${rel.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${rel.target}"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  ${imgRels}
</Relationships>`;
}

/**
 * Builds minimal word/styles.xml
 */
function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="id-ID"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal">
    <w:name w:val="Normal Table"/>
    <w:uiPriority w:val="99"/>
    <w:semiHidden/>
    <w:unhideWhenUsed/>
    <w:tblPr>
      <w:tblInd w:w="0" w:type="dxa"/>
      <w:tblCellMar>
        <w:top w:w="0" w:type="dxa"/>
        <w:left w:w="0" w:type="dxa"/>
        <w:bottom w:w="0" w:type="dxa"/>
        <w:right w:w="0" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
  </w:style>
</w:styles>`;
}

/**
 * Builds minimal word/settings.xml
 */
function buildSettingsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;
}

/**
 * Full Generator for .docx archive & document.xml template
 */
export async function generateDocxBlob(
  photos: PhotoItem[],
  config: GridConfig,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ docxBlob: Blob; documentXml: string }> {
  onProgress?.(10, 'Menghitung tata letak & rasio...');

  const layout = calculateLayout(photos, config);
  const expandedPhotos = expandPhotosWithCopies(photos, config.labelType, config);

  onProgress?.(25, 'Menyiapkan arsip OpenXML...');

  const zip = new JSZip();

  // Create unique image map and process Blobs per (photo, row dimensions)
  const photoRIdMap = new Map<string, string>();
  const imageRelations: { rId: string; target: string; ext: string }[] = [];
  const imageFiles: { ext: string }[] = [];

  // Identify all needed (photo, widthCm, heightCm) combinations across all pages/rows
  const neededSlots: { photo: PhotoItem; widthCm: number; heightCm: number; slotKey: string }[] = [];
  const seenSlotKeys = new Set<string>();

  for (let pageIdx = 0; pageIdx < layout.totalPages; pageIdx++) {
    const pageStartIndex = pageIdx * layout.photosPerPage;
    const pageItems = expandedPhotos.slice(pageStartIndex, pageStartIndex + layout.photosPerPage);
    let consumedInPage = 0;
    for (let r = 0; r < layout.resolvedRows.length; r++) {
      if (consumedInPage >= pageItems.length) break;
      const rowLayout = layout.resolvedRows[r];
      for (let c = 0; c < rowLayout.columns; c++) {
        const itemIndex = consumedInPage + c;
        if (itemIndex < pageItems.length) {
          const item = pageItems[itemIndex];
          if (item && !item.isPlaceholder && item.photo) {
            const cellDef = rowLayout.cells?.[c];
            const slotW = cellDef ? cellDef.widthCm : rowLayout.widthCm;
            const slotH = cellDef ? cellDef.heightCm : rowLayout.heightCm;
            const slotKey = getPhotoSlotKey(item.photo.id, slotW, slotH);
            if (!seenSlotKeys.has(slotKey)) {
              seenSlotKeys.add(slotKey);
              neededSlots.push({
                photo: item.photo,
                widthCm: slotW,
                heightCm: slotH,
                slotKey,
              });
            }
          }
        }
      }
      consumedInPage += rowLayout.columns;
    }
  }

  let imgCounter = 1;
  const totalTasks = Math.max(1, neededSlots.length);

  for (let i = 0; i < neededSlots.length; i++) {
    const { photo, widthCm, heightCm, slotKey } = neededSlots[i];
    const rId = `rIdImg${imgCounter}`;
    photoRIdMap.set(slotKey, rId);
    if (!photoRIdMap.has(photo.id)) {
      photoRIdMap.set(photo.id, rId);
    }

    let blob: Blob | undefined;
    const isDefaultSize =
      Math.abs(widthCm - config.targetWidthCm) < 0.01 &&
      Math.abs(heightCm - config.targetHeightCm) < 0.01;

    const isSlotStnk = !!photo.isStnk || (Math.abs(widthCm - 23.0) < 0.2 && Math.abs(heightCm - 7.5) < 0.2) || (Math.abs(widthCm - 7.5) < 0.2 && Math.abs(heightCm - 23.0) < 0.2);
    const effectiveMode = isSlotStnk ? 'stretch' : config.resizeMode;

    if (isDefaultSize && photo.processedBlob && (!isSlotStnk || effectiveMode === 'stretch')) {
      blob = photo.processedBlob;
    } else {
      const processed = await processImageToBlob(photo.dataUrl, {
        widthCm,
        heightCm,
        mode: effectiveMode,
        autoRotateMode: config.autoRotateMode,
        manualRotateAngle: photo.rotation || 0,
        dpi: config.dpi,
        backgroundColor: config.backgroundColor,
      });
      blob = processed.blob;
    }

    let ext = 'jpg';
    if (blob.type === 'image/png') ext = 'png';
    else if (blob.type === 'image/webp') ext = 'jpg';
    else ext = 'jpg';

    const filename = `image${imgCounter}.${ext}`;
    const targetPath = `media/${filename}`;

    const arrayBuffer = await blob.arrayBuffer();
    zip.file(`word/media/${filename}`, arrayBuffer);

    imageRelations.push({ rId, target: targetPath, ext });
    imageFiles.push({ ext });

    imgCounter++;

    const progressPct = 25 + Math.round(((i + 1) / totalTasks) * 45);
    onProgress?.(progressPct, `Menyisipkan gambar ${i + 1} dari ${totalTasks} (${widthCm}x${heightCm} cm)...`);
  }

  onProgress?.(75, 'Menyusun dokumen OpenXML (document.xml)...');

  const documentXml = generateDocumentXml(expandedPhotos, photoRIdMap, layout, config);

  // Write all OpenXML structure files
  zip.file('[Content_Types].xml', buildContentTypesXml(imageFiles));
  zip.file('_rels/.rels', buildRootRelsXml());
  zip.file('word/_rels/document.xml.rels', buildDocumentRelsXml(imageRelations));
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', buildStylesXml());
  zip.file('word/settings.xml', buildSettingsXml());

  onProgress?.(90, 'Mengompresi ke arsip .docx...');

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, 'Selesai! Dokumen siap.');

  return { docxBlob, documentXml };
}

