/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { FileUp, FileText, CheckCircle2, AlertCircle, Layers, BookOpen, Trash2 } from 'lucide-react';
import { DocxAnalysis } from '../types/skripsi';

interface DocxUploaderProps {
  analysis: DocxAnalysis | null;
  onFileLoaded: (file: File) => void;
  onClear: () => void;
  onOpenOutline: () => void;
  isLoading: boolean;
}

export const DocxUploader: React.FC<DocxUploaderProps> = ({
  analysis,
  onFileLoaded,
  onClear,
  onOpenOutline,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.docx')) {
        onFileLoaded(file);
      } else {
        alert('Mohon pilih file berformat .docx (Microsoft Word)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              1
            </span>
            Input A — File Skripsi Word (.docx)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah file skripsi asli. Struktur, margin, nomor halaman, dan teks asli akan 100% dipertahankan.
          </p>
        </div>

        {analysis && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            File Siap
          </span>
        )}
      </div>

      {!analysis ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FileUp className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {isLoading ? 'Sedang membaca struktur DOCX...' : 'Tarik & Letakkan File Skripsi .docx di Sini'}
          </p>
          <p className="text-xs text-slate-500 mt-1">atau klik untuk memilih file dari komputer</p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-md">
            <span>Format yang didukung:</span>
            <span className="font-semibold text-slate-600">Microsoft Word (.docx)</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{analysis.fileName}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Ukuran: {formatFileSize(analysis.fileSize)}</span>
                  <span>•</span>
                  <span>Estimasi: ~{analysis.totalPagesEstimate} Halaman</span>
                  <span>•</span>
                  <span>{analysis.totalElements} Elemen XML</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={onOpenOutline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                Lihat Outline Halaman
              </button>
              <button
                onClick={onClear}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ganti File
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/80">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Total Halaman Estimasi</span>
              <span className="text-base font-bold text-slate-800">{analysis.totalPagesEstimate} Hal</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Judul/Heading Terdeteksi</span>
              <span className="text-base font-bold text-blue-600">{analysis.headingsList.length} Heading</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Target Lampiran Ditemukan</span>
              <span className="text-base font-bold text-emerald-600">
                {analysis.detectedTargets.filter((t) => t.elementIndex !== undefined).length} Lokasi
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Gambar Eksisting di Word</span>
              <span className="text-base font-bold text-slate-700">{analysis.existingMediaCount} Media</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
