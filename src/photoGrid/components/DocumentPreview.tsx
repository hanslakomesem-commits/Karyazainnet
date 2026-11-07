import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  FileText,
  Printer,
  Sparkles,
} from 'lucide-react';
import { CalculatedLayout, GridConfig, PhotoItem } from '../types';
import { expandPhotosWithCopies } from '../utils/openXmlGenerator';

interface DocumentPreviewProps {
  photos: PhotoItem[];
  config: GridConfig;
  layout: CalculatedLayout;
  onChangeOrientation?: (orientation: 'portrait' | 'landscape') => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  photos,
  config,
  layout,
  onChangeOrientation,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 0.75, 1.25

  const expandedPhotos = expandPhotosWithCopies(photos, config.labelType, config);
  const {
    columns,
    rowsPerPage,
    photosPerPage,
    totalPages,
    pageWidthCm,
    pageHeightCm,
    photoWidthCm,
    photoHeightCm,
  } = layout;

  // Ensure currentPage is within bounds
  const activePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  // Slices for current page
  const pageStartIndex = activePage * photosPerPage;
  const pageItems = expandedPhotos.slice(pageStartIndex, pageStartIndex + photosPerPage);

  // Compute paper aspect ratio
  const aspectRatio = `${pageWidthCm} / ${pageHeightCm}`;

  // Conversion factor from cm to preview percentage
  const marginT = (config.margins.topCm / pageHeightCm) * 100;
  const marginB = (config.margins.bottomCm / pageHeightCm) * 100;
  const marginL = (config.margins.leftCm / pageWidthCm) * 100;
  const marginR = (config.margins.rightCm / pageWidthCm) * 100;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col h-full">
      {/* Top preview toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Pratinjau Lembar Word ({config.paperType})
            </h3>
            <p className="text-xs text-neutral-500 font-mono">
              {pageWidthCm} × {pageHeightCm} cm ({config.orientation}) · {layout.columns} kolom
            </p>
          </div>
        </div>

        {/* Page navigation & Zoom controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Paper Orientation Toggle */}
          {onChangeOrientation && (
            <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => onChangeOrientation('portrait')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] ${
                  config.orientation === 'portrait'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Kertas Portrait (Tegak)"
              >
                📄 Tegak
              </button>
              <button
                type="button"
                onClick={() => onChangeOrientation('landscape')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] ${
                  config.orientation === 'landscape'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Kertas Landscape (Mendatar)"
              >
                📑 Mendatar
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={activePage === 0}
                className="p-1 rounded hover:bg-white text-neutral-700 disabled:opacity-30 cursor-pointer"
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px] text-neutral-600">
                Hal {activePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={activePage >= totalPages - 1}
                className="p-1 rounded hover:bg-white text-neutral-700 disabled:opacity-30 cursor-pointer"
                title="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
              className="p-1 rounded hover:bg-white text-neutral-600 cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-neutral-600">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.15))}
              className="p-1 rounded hover:bg-white text-neutral-600 cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Sheet Container Canvas */}
      <div className="flex-1 bg-neutral-100/80 rounded-xl p-4 sm:p-6 flex items-center justify-center overflow-auto min-h-[460px]">
        {photos.length === 0 ? (
          <div className="text-center py-12 px-4 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-neutral-200/80 text-neutral-400 mx-auto flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-700 mb-1">
              Belum Ada Foto Diunggah
            </p>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Silakan unggah foto dari komputer Anda atau klik tombol di bawah untuk memuat contoh pas foto.
            </p>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full max-w-[540px] drop-shadow-md"
          >
            {/* The Virtual Paper Sheet */}
            <div
              className="bg-white rounded-xs shadow-lg relative border border-neutral-300 mx-auto transition-all"
              style={{
                aspectRatio,
                width: '100%',
              }}
            >
              {/* Paper Watermark / Header line simulator */}
              <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-[9px] text-neutral-300 pointer-events-none select-none font-mono">
                <span>{config.paperType} ({config.orientation})</span>
                <span>Margin: {config.margins.topCm}cm</span>
              </div>

              {/* Margin boundary guides (subtle dashed box) */}
              <div
                className="absolute border border-dashed border-blue-200/60 pointer-events-none rounded-xs"
                style={{
                  top: `${marginT}%`,
                  bottom: `${marginB}%`,
                  left: `${marginL}%`,
                  right: `${marginR}%`,
                }}
              />

              {/* Printable Table Grid Area */}
              <div
                className="absolute flex flex-col justify-start"
                style={{
                  top: `${marginT}%`,
                  bottom: `${marginB}%`,
                  left: `${marginL}%`,
                  right: `${marginR}%`,
                }}
              >
                <div
                  className="flex flex-col items-center justify-start w-full h-full"
                  style={{
                    gap: `${(config.rowSpacingCm / layout.printableHeightCm) * 100}%`,
                  }}
                >
                  {(() => {
                    let consumedInPage = 0;

                    return layout.resolvedRows.map((rowLayout, rIdx) => {
                      if (consumedInPage >= pageItems.length) return null;
                      const rowSlice = pageItems.slice(
                        consumedInPage,
                        consumedInPage + rowLayout.columns
                      );
                      consumedInPage += rowLayout.columns;
                      const hasCells = rowLayout.cells && rowLayout.cells.length > 0;
                      const rowTotalCellsW = hasCells
                        ? rowLayout.cells!.reduce((sum, c) => sum + c.widthCm, 0) + Math.max(0, rowLayout.cells!.length - 1) * config.gutterCm
                        : rowLayout.columns * rowLayout.widthCm + Math.max(0, rowLayout.columns - 1) * config.gutterCm;

                      const effectiveRowPrintableW = Math.max(layout.printableWidthCm, rowTotalCellsW);
                      const gutterPct = (config.gutterCm / effectiveRowPrintableW) * 100;

                      return (
                        <div
                          key={rIdx}
                          className="flex items-center justify-center w-full"
                          style={{ gap: `${gutterPct}%` }}
                        >
                          {Array.from({ length: rowLayout.columns }).map((_, cIdx) => {
                            const item = rowSlice[cIdx];
                            const cellDef = rowLayout.cells?.[cIdx];
                            const cellW = cellDef ? cellDef.widthCm : rowLayout.widthCm;
                            const cellH = cellDef ? cellDef.heightCm : rowLayout.heightCm;
                            const cellWidthPct = (cellW / effectiveRowPrintableW) * 100;

                            if (!item || item.isPlaceholder || !item.photo) {
                              return (
                                <div
                                  key={cIdx}
                                  style={{
                                    width: `${cellWidthPct}%`,
                                    aspectRatio: `${cellW} / ${cellH + (config.showLabels ? 0.6 : 0)}`,
                                  }}
                                  className="opacity-0 pointer-events-none"
                                />
                              );
                            }

                            const isSmartCrop = config.resizeMode === 'smart_crop';
                            const isStretch = config.resizeMode === 'stretch';
                            const isLandscapeSrc =
                              item.photo.originalWidth > item.photo.originalHeight;
                            const isPortraitSrc =
                              item.photo.originalHeight > item.photo.originalWidth;
                            const isPortraitSlot = cellH > cellW;
                            const isLandscapeSlot = cellW > cellH;
                            const shouldRotateInRow =
                              config.autoRotateMode === 'auto_rotate_to_target' &&
                              ((isLandscapeSrc && isPortraitSlot) ||
                                (isPortraitSrc && isLandscapeSlot));

                            return (
                              <div
                                key={`${item.photo.id}-${item.copyIndex}-${rIdx}-${cIdx}`}
                                className={`flex flex-col items-center justify-center p-0.5 relative ${
                                  config.showCutGuides
                                    ? 'border border-dashed border-neutral-400'
                                    : 'border border-transparent'
                                }`}
                                style={{
                                  width: `${cellWidthPct}%`,
                                }}
                              >
                                {/* Photo image element */}
                                <div
                                  className="w-full overflow-hidden relative bg-neutral-100 flex items-center justify-center"
                                  style={{
                                    aspectRatio: `${cellW} / ${cellH}`,
                                  }}
                                >
                                  {config.sizeLayoutMode === 'uniform' ? (
                                    <img
                                      src={item.photo.processedDataUrl || item.photo.dataUrl}
                                      alt={item.photo.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full"
                                      style={{
                                        objectFit: isSmartCrop
                                          ? 'cover'
                                          : isStretch
                                          ? 'fill'
                                          : 'contain',
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={item.photo.dataUrl}
                                      alt={item.photo.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full transition-transform"
                                      style={{
                                        objectFit: isSmartCrop
                                          ? 'cover'
                                          : isStretch
                                          ? 'fill'
                                          : 'contain',
                                        transform: shouldRotateInRow
                                          ? 'rotate(90deg) scale(1.35)'
                                          : undefined,
                                      }}
                                    />
                                  )}
                                  <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[7px] font-mono px-1 rounded">
                                    {rowLayout.widthCm}×{rowLayout.heightCm}
                                  </span>
                                </div>

                                {/* Optional label below */}
                                {config.showLabels && item.label && (
                                  <div className="w-full text-center mt-0.5">
                                    <span className="text-[8px] font-mono text-neutral-600 truncate block px-0.5 leading-tight">
                                      {item.label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Footer page number indicator */}
              <div className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] text-neutral-400 font-mono pointer-events-none select-none">
                Halaman {activePage + 1}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sheet dimension info footer */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800">
            {layout.columns} × {Math.ceil(pageItems.length / layout.columns || 1)} Grid
          </span>
          <span>·</span>
          <span>{pageItems.length} foto di halaman ini</span>
        </div>
        <div className="font-mono text-[11px] text-neutral-400">
          Tabel Word: &lt;w:tbl&gt; transparan presisi OpenXML
        </div>
      </div>
    </div>
  );
};
