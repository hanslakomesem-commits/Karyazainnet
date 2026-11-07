import jsPDF from 'jspdf';
import { CalculatedLayout, GridConfig, PhotoItem } from '../types';
import { expandPhotosWithCopies, getPhotoSlotKey } from './openXmlGenerator';
import { processImageToBlob } from './imageProcessor';

/**
 * Generates print-ready high-resolution PDF document matching exact centimeter dimensions and layout
 */
export async function generatePdfBlob(
  photos: PhotoItem[],
  config: GridConfig,
  layout: CalculatedLayout,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ pdfBlob: Blob; fileName: string }> {
  onProgress?.(10, 'Menyiapkan dokumen PDF...');

  const expandedPhotos = expandPhotosWithCopies(photos, config.labelType, config);
  const totalPages = Math.max(1, layout.totalPages);

  // Determine paper format for jsPDF
  const isLandscape = config.orientation === 'landscape';
  let pdfFormat: [number, number] | string = 'a4';

  if (config.paperType === 'F4') {
    // Folio / F4: 21.5 x 33.0 cm
    pdfFormat = isLandscape ? [33.0, 21.5] : [21.5, 33.0];
  } else if (config.paperType === 'Letter') {
    pdfFormat = isLandscape ? [27.94, 21.59] : [21.59, 27.94];
  } else if (config.paperType === 'Custom') {
    const pw = config.customPaperWidthCm;
    const ph = config.customPaperHeightCm;
    pdfFormat = isLandscape ? [Math.max(pw, ph), Math.min(pw, ph)] : [Math.min(pw, ph), Math.max(pw, ph)];
  } else {
    // A4
    pdfFormat = isLandscape ? [29.7, 21.0] : [21.0, 29.7];
  }

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'cm',
    format: pdfFormat,
    compress: true,
  });

  onProgress?.(25, 'Memproses resolusi foto untuk cetak PDF...');

  // Cache processed image data URLs per (photoId, widthCm, heightCm)
  const imageCache = new Map<string, string>();

  // Collect all unique slots
  const neededSlots: { photo: PhotoItem; widthCm: number; heightCm: number; slotKey: string }[] = [];
  const seenSlotKeys = new Set<string>();

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageStartIndex = pageIdx * layout.photosPerPage;
    const pageItems = expandedPhotos.slice(pageStartIndex, pageStartIndex + layout.photosPerPage);
    let consumedInPage = 0;

    for (let r = 0; r < layout.resolvedRows.length; r++) {
      if (consumedInPage >= pageItems.length) break;
      const rowLayout = layout.resolvedRows[r];

      if (rowLayout.cells && rowLayout.cells.length > 0) {
        for (let c = 0; c < rowLayout.cells.length; c++) {
          const itemIndex = consumedInPage + c;
          if (itemIndex < pageItems.length) {
            const item = pageItems[itemIndex];
            if (item && !item.isPlaceholder && item.photo) {
              const cell = rowLayout.cells[c];
              const slotKey = getPhotoSlotKey(item.photo.id, cell.widthCm, cell.heightCm);
              if (!seenSlotKeys.has(slotKey)) {
                seenSlotKeys.add(slotKey);
                neededSlots.push({
                  photo: item.photo,
                  widthCm: cell.widthCm,
                  heightCm: cell.heightCm,
                  slotKey,
                });
              }
            }
          }
        }
        consumedInPage += rowLayout.cells.length;
      } else {
        for (let c = 0; c < rowLayout.columns; c++) {
          const itemIndex = consumedInPage + c;
          if (itemIndex < pageItems.length) {
            const item = pageItems[itemIndex];
            if (item && !item.isPlaceholder && item.photo) {
              const slotKey = getPhotoSlotKey(item.photo.id, rowLayout.widthCm, rowLayout.heightCm);
              if (!seenSlotKeys.has(slotKey)) {
                seenSlotKeys.add(slotKey);
                neededSlots.push({
                  photo: item.photo,
                  widthCm: rowLayout.widthCm,
                  heightCm: rowLayout.heightCm,
                  slotKey,
                });
              }
            }
          }
        }
        consumedInPage += rowLayout.columns;
      }
    }
  }

  // Pre-render images into 300 DPI canvas blobs/dataUrls
  for (let i = 0; i < neededSlots.length; i++) {
    const slot = neededSlots[i];
    const isDefaultSize =
      Math.abs(slot.widthCm - config.targetWidthCm) < 0.01 &&
      Math.abs(slot.heightCm - config.targetHeightCm) < 0.01;

    const isSlotStnk = !!slot.photo.isStnk || (Math.abs(slot.widthCm - 23.0) < 0.2 && Math.abs(slot.heightCm - 7.5) < 0.2) || (Math.abs(slot.widthCm - 7.5) < 0.2 && Math.abs(slot.heightCm - 23.0) < 0.2);
    const effectiveMode = isSlotStnk ? 'stretch' : config.resizeMode;

    let dataUrl: string;
    if (isDefaultSize && slot.photo.processedDataUrl && (!isSlotStnk || effectiveMode === 'stretch')) {
      dataUrl = slot.photo.processedDataUrl;
    } else {
      const processed = await processImageToBlob(slot.photo.dataUrl, {
        widthCm: slot.widthCm,
        heightCm: slot.heightCm,
        mode: effectiveMode,
        autoRotateMode: config.autoRotateMode,
        manualRotateAngle: slot.photo.rotation || 0,
        dpi: 300,
        backgroundColor: config.backgroundColor,
      });
      dataUrl = processed.dataUrl;
    }

    imageCache.set(slot.slotKey, dataUrl);
    if (!imageCache.has(slot.photo.id)) {
      imageCache.set(slot.photo.id, dataUrl);
    }

    const pct = 25 + Math.round(((i + 1) / Math.max(1, neededSlots.length)) * 45);
    onProgress?.(pct, `Menyiapkan foto ${i + 1} dari ${neededSlots.length} untuk PDF...`);
  }

  onProgress?.(75, 'Menyusun halaman PDF siap cetak...');

  const pageWidthCm = layout.pageWidthCm;
  const pageHeightCm = layout.pageHeightCm;
  const marginLeft = config.margins.leftCm;
  const marginTop = config.margins.topCm;
  const gutter = config.gutterCm;
  const rowSpacing = config.rowSpacingCm;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage(pdfFormat, isLandscape ? 'landscape' : 'portrait');
    }

    const pageStartIndex = pageIdx * layout.photosPerPage;
    const pageItems = expandedPhotos.slice(pageStartIndex, pageStartIndex + layout.photosPerPage);
    if (pageItems.length === 0) continue;

    let consumedInPage = 0;
    let currentY = marginTop;

    for (let r = 0; r < layout.resolvedRows.length; r++) {
      if (consumedInPage >= pageItems.length) break;
      const rowLayout = layout.resolvedRows[r];

      if (rowLayout.cells && rowLayout.cells.length > 0) {
        // Variable-cell-width row (Hemat Kertas / Samping)
        const cellCount = rowLayout.cells.length;
        const rowSlice = pageItems.slice(consumedInPage, consumedInPage + cellCount);
        consumedInPage += cellCount;

        // Calculate total width of this row to optionally center it
        let totalRowW = 0;
        rowLayout.cells.forEach((cell, idx) => {
          totalRowW += cell.widthCm + (idx > 0 ? gutter : 0);
        });

        // Center row in printable area if smaller than printable width
        const extraSpace = Math.max(0, layout.printableWidthCm - totalRowW);
        let startX = marginLeft + (extraSpace > 0.4 ? extraSpace / 2 : 0);
        let maxRowH = rowLayout.maxHeightCm || rowLayout.heightCm;

        for (let c = 0; c < cellCount; c++) {
          const item = rowSlice[c];
          const cell = rowLayout.cells[c];
          const cellW = cell.widthCm;
          const cellH = cell.heightCm;
          maxRowH = Math.max(maxRowH, cellH);

          if (item && !item.isPlaceholder && item.photo) {
            const slotKey = getPhotoSlotKey(item.photo.id, cellW, cellH);
            const imgData = imageCache.get(slotKey) || imageCache.get(item.photo.id) || item.photo.dataUrl;

            try {
              doc.addImage(imgData, 'JPEG', startX, currentY, cellW, cellH);
            } catch (e) {
              console.warn('Gagal menambahkan foto ke PDF:', e);
            }

            // Cut guides
            if (config.showCutGuides) {
              doc.setDrawColor(180, 180, 180);
              doc.setLineWidth(0.015);
              doc.setLineDashPattern([0.1, 0.1], 0);
              doc.rect(startX, currentY, cellW, cellH);
              doc.setLineDashPattern([], 0); // reset
            }

            // Caption
            if (config.showLabels && item.label) {
              doc.setFontSize(7);
              doc.setTextColor(90, 90, 90);
              doc.text(item.label, startX + cellW / 2, currentY + cellH + 0.35, { align: 'center' });
            }
          }

          startX += cellW + gutter;
        }

        currentY += maxRowH + (config.showLabels ? 0.5 : 0) + rowSpacing;
      } else {
        // Uniform-cell row
        const rowCols = rowLayout.columns;
        const rowSlice = pageItems.slice(consumedInPage, consumedInPage + rowCols);
        consumedInPage += rowCols;

        const cellW = rowLayout.widthCm;
        const cellH = rowLayout.heightCm;
        const totalRowW = rowCols * cellW + Math.max(0, rowCols - 1) * gutter;
        const extraSpace = Math.max(0, layout.printableWidthCm - totalRowW);
        let startX = marginLeft + (extraSpace > 0.4 ? extraSpace / 2 : 0);

        for (let c = 0; c < rowCols; c++) {
          const item = rowSlice[c];

          if (item && !item.isPlaceholder && item.photo) {
            const slotKey = getPhotoSlotKey(item.photo.id, cellW, cellH);
            const imgData = imageCache.get(slotKey) || imageCache.get(item.photo.id) || item.photo.dataUrl;

            try {
              doc.addImage(imgData, 'JPEG', startX, currentY, cellW, cellH);
            } catch (e) {
              console.warn('Gagal menambahkan foto ke PDF:', e);
            }

            // Cut guides
            if (config.showCutGuides) {
              doc.setDrawColor(180, 180, 180);
              doc.setLineWidth(0.015);
              doc.setLineDashPattern([0.1, 0.1], 0);
              doc.rect(startX, currentY, cellW, cellH);
              doc.setLineDashPattern([], 0);
            }

            // Caption
            if (config.showLabels && item.label) {
              doc.setFontSize(7);
              doc.setTextColor(90, 90, 90);
              doc.text(item.label, startX + cellW / 2, currentY + cellH + 0.35, { align: 'center' });
            }
          }

          startX += cellW + gutter;
        }

        currentY += cellH + (config.showLabels ? 0.5 : 0) + rowSpacing;
      }
    }
  }

  onProgress?.(95, 'Mengompresi berkas PDF...');

  const pdfBlob = doc.output('blob');
  const fileName = `Grid_Foto_${config.targetWidthCm}x${config.targetHeightCm}cm_${config.paperType}_${config.orientation}.pdf`;

  onProgress?.(100, 'Selesai! PDF siap diunduh.');

  return { pdfBlob, fileName };
}
