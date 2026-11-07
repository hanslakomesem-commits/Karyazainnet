import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Trash2, Plus } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onClearAll: () => void;
  onLoadSamples: () => void;
  photoCount: number;
  totalCopies: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  onClearAll,
  onLoadSamples,
  photoCount,
  totalCopies,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value so same files can be re-selected if deleted
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
      {/* Header controls & counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Modul Unggah Foto (Multi-Upload)
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span>{photoCount} foto asli</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{totalCopies} total cetak</span>
              <span aria-hidden="true">·</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">JPG, PNG, WEBP</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                ★ PDF (KTP &amp; STNK Auto Compress ke JPG)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSamples}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Muat Foto Sampel</span>
          </button>

          {photoCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
            : 'border-neutral-200 hover:border-blue-400 hover:bg-neutral-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-neutral-800">
            Tarik &amp; lepas foto atau berkas PDF ke sini, atau <span className="text-blue-600 underline underline-offset-2">pilih dari perangkat</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-600 mt-1 max-w-lg">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px]">
              📷 Pas Foto (JPG / PNG)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-medium">
              📄 Scan PDF KTP / STNK (Otomatis Kompres ke JPG Siap Cetak)
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 max-w-md mt-1">
            Jika mengunggah file PDF (misal scan KTP atau STNK), sistem akan otomatis membaca tiap halaman dan mengompresnya langsung ke format JPG tajam. Semua proses berjalan 100% lokal di browser Anda.
          </p>
        </div>
      </div>
    </div>
  );
};
