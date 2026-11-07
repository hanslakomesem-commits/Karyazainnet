import React from 'react';
import { Download, FileDown, CodeXml, Loader2, CheckCircle2 } from 'lucide-react';
import { CalculatedLayout, GridConfig, PhotoItem } from '../types';

interface ExportToolbarProps {
  onExportDocx: () => void;
  onExportPdf?: () => void;
  onOpenXmlModal: () => void;
  isGenerating: boolean;
  isGeneratingPdf?: boolean;
  progressPercent: number;
  progressText: string;
  photos: PhotoItem[];
  layout: CalculatedLayout;
  config: GridConfig;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  onExportDocx,
  onExportPdf,
  onOpenXmlModal,
  isGenerating,
  isGeneratingPdf = false,
  progressPercent,
  progressText,
  photos,
  layout,
  config,
}) => {
  const hasPhotos = photos.length > 0;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Document specifications summary */}
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h4 className="text-sm font-bold text-neutral-900">
              Dokumen Word Siap Diekspor
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 font-mono">
            <span>
              {layout.totalPhotosWithCopies} Foto Cetak
            </span>
            <span>·</span>
            <span>
              {layout.photoWidthCm} × {layout.photoHeightCm} cm
            </span>
            <span>·</span>
            <span>
              {config.paperType} ({layout.columns} Kolom × {layout.rowsPerPage} Baris)
            </span>
            <span>·</span>
            <span className="text-blue-700 font-semibold">
              {layout.totalPages} Halaman
            </span>
          </div>
        </div>

        {/* Progress bar when generating */}
        {isGenerating && (
          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span className="truncate">{progressText}</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onOpenXmlModal}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            <CodeXml className="w-4 h-4" />
            <span>Ekspor XML / Template</span>
          </button>

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={!hasPhotos || isGenerating || isGeneratingPdf}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
              title="Unduh dokumen PDF langsung siap cetak 1:1"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Unduh Dokumen PDF (.pdf)</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onExportDocx}
            disabled={!hasPhotos || isGenerating || isGeneratingPdf}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membuat Dokumen Word...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh Dokumen Word (.docx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
