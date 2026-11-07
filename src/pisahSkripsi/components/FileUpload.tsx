import React, { useRef } from 'react';
import { UploadCloud, FileCheck, RefreshCw, Sparkles, ShieldCheck, FileText, Play } from 'lucide-react';
import { AnalysisProgress } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onBatchSelect?: (files: File[]) => void;
  onSampleSelect: () => void;
  fileName: string | null;
  fileSize: number | null;
  progress: AnalysisProgress | null;
  onReset: () => void;
  batchCount?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onBatchSelect,
  onSampleSelect,
  fileName,
  fileSize,
  progress,
  onReset,
  batchCount = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files);
      if (filesList.length > 1 && onBatchSelect) {
        onBatchSelect(filesList);
      } else if (filesList.length === 1) {
        onFileSelect(filesList[0]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesList = Array.from(e.target.files);
      if (filesList.length > 1 && onBatchSelect) {
        onBatchSelect(filesList);
      } else if (filesList.length === 1) {
        onFileSelect(filesList[0]);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-all duration-200 space-y-4">
      {/* Top Welcome / Start Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Unggah Skripsi (PDF, Word, atau Gambar JPG/PNG)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mendukung pemisahan dokumen tunggal maupun <strong>banyak file sekaligus (batch processing)</strong>.
          </p>
        </div>

        {!fileName && batchCount === 0 && (
          <button
            id="start-sample-direct-btn"
            onClick={onSampleSelect}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>MULAI APLIKASI SEKARANG (1-Klik)</span>
          </button>
        )}
      </div>

      {!fileName && batchCount === 0 ? (
        <div
          id="dropzone-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="group relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
            Klik untuk memilih atau seret & lepas file <strong>PDF / Word / Gambar JPG-PNG</strong> di sini
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Bisa pilih <strong>banyak file sekaligus</strong> (Batch Multi-File), PDF Digital, Scan OCR, maupun foto naskah JPG/PNG.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="upload-select-btn"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Pilih File Dari Komputer (Multi-Select)</span>
            </button>

            <span className="text-xs font-semibold text-slate-400">atau</span>

            <button
              type="button"
              id="upload-sample-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSampleSelect();
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Gunakan Contoh Skripsi Lengkap</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {batchCount > 0 ? `Batch Processing: ${batchCount} File Skripsi Terpilih` : fileName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {batchCount > 0 ? 'Mode Pemisahan Masal Aktif' : (fileSize ? formatBytes(fileSize) : 'Ukuran File OK')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="file-reset-btn"
                onClick={onReset}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ganti / Reset File</span>
              </button>
            </div>
          </div>

          {progress && progress.step !== 'done' && progress.step !== 'error' && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {progress.message}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {progress.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
