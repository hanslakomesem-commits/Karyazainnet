/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RotateCw,
  Eye,
  ScanText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  Loader2,
  Crop,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { ScanFile, TargetDocument } from '../types/skripsi';

interface ScanUploaderProps {
  scans: ScanFile[];
  targets: TargetDocument[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveScan: (id: string) => void;
  onRotateScan: (id: string) => void;
  onRunOcrForScan: (id: string) => void;
  onAssignTarget: (scanId: string, targetId: string | undefined) => void;
  isOcrRunning: boolean;
  isConvertingPdf?: boolean;
  pdfConversionStatus?: string;
  onOpenCropModal?: (scan: ScanFile) => void;
  onRevertOriginal?: (scanId: string) => void;
  onAutoCropAll?: () => void;
  isAutoCropping?: boolean;
}

export const ScanUploader: React.FC<ScanUploaderProps> = ({
  scans,
  targets,
  onAddFiles,
  onRemoveScan,
  onRotateScan,
  onRunOcrForScan,
  onAssignTarget,
  isOcrRunning,
  isConvertingPdf,
  pdfConversionStatus,
  onOpenCropModal,
  onRevertOriginal,
  onAutoCropAll,
  isAutoCropping,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<ScanFile | null>(null);
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
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
              2
            </span>
            Input B — Foto / Scan Dokumen Lampiran
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah semua foto/scan dokumen sekaligus. Sistem secara otomatis mengenali nama dokumen & orientasi rotasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {scans.length > 0 && onOpenCropModal && (
            <button
              type="button"
              onClick={() => onOpenCropModal(scans[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition"
              title="Pilih bagian penting dokumen secara manual"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>✂️ Crop Manual Dokumen</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Tambah Foto / Scan / PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* PDF Conversion Progress Alert Banner */}
      {isConvertingPdf && (
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 text-indigo-950 flex items-center gap-3 shadow-xs animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <span>Sedang Mengonversi Berkas Lampiran PDF ke Format JPG...</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 font-semibold font-mono">
                Auto-Export 300 DPI
              </span>
            </p>
            <p className="text-[11px] text-indigo-700 mt-0.5 truncate">
              {pdfConversionStatus || 'Mengekstrak lembar dokumen PDF menjadi gambar JPG beresolusi tinggi siap tempel...'}
            </p>
          </div>
        </div>
      )}

      {scans.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Tarik & Letakkan Banyak Foto / Scan atau Dokumen PDF di Sini
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Mendukung file foto (JPG/PNG) & file dokumen PDF (Surat Izin Penelitian, Surat Telah Meneliti, Surat Tugas Pembimbing, Kartu Bimbingan, dsb.). File PDF akan otomatis diekstrak & dikonversi ke gambar JPG berkualitas tinggi.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200">
            <span>Format Diterima:</span>
            <span className="font-bold text-indigo-700">JPG, PNG, WEBP & PDF</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Auto PDF → JPG
            </span>
          </div>
        </div>
      ) : (
        <div>
          {/* Scans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scans.map((scan, idx) => {
              const assignedTarget = targets.find((t) => t.id === scan.matchedTargetId);
              const isLandscape = scan.width > scan.height;

              return (
                <div
                  key={scan.id}
                  className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col"
                >
                  {/* Thumbnail area */}
                  <div className="relative h-44 bg-slate-800 flex items-center justify-center overflow-hidden group">
                    <img
                      src={scan.dataUrl}
                      alt={scan.name}
                      style={{
                        transform: `rotate(${scan.rotation || 0}deg)`,
                      }}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                    />

                    {/* Quick index pill */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                      #{idx + 1}
                    </span>

                    {/* PDF Badge if file was converted from PDF */}
                    {scan.isFromPdf && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                        <FileText className="w-3 h-3 text-indigo-200" />
                        <span>PDF Hal {scan.pdfPageNumber || 1}</span>
                      </span>
                    )}

                    {/* Action overlay buttons */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        title="Perbesar Preview"
                        onClick={() => setPreviewModalImg(scan)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {onOpenCropModal && (
                        <button
                          title="Auto-Crop Meja Tanpa Rotasi"
                          onClick={() => onOpenCropModal(scan)}
                          className="p-2 rounded-full bg-emerald-600/80 hover:bg-emerald-600 text-white backdrop-blur-xs transition cursor-pointer"
                        >
                          <Crop className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        title="Putar 90 Derajat"
                        onClick={() => onRotateScan(scan.id)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        title="Hapus Gambar"
                        onClick={() => onRemoveScan(scan.id)}
                        className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-slate-800 text-xs truncate" title={scan.name}>
                          {scan.name}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatFileSize(scan.size)}
                        </span>
                      </div>

                      {/* Dimensions & Rotation Control */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isLandscape ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className={isLandscape ? 'text-indigo-700 font-medium' : 'text-amber-700 font-medium'}>
                            {isLandscape ? 'Horizontal (Landscape)' : 'Tegak (Portrait)'}
                          </span>
                        </span>
                        <button
                          onClick={() => onRotateScan(scan.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition"
                          title="Putar 90 Derajat"
                        >
                          <RotateCw className="w-3 h-3" />
                          Putar 90°
                        </button>
                      </div>

                      {/* Manual Crop Status & Controls */}
                      {scan.isCropped ? (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-800">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                            <span className="font-bold truncate">✂️ Di-crop Manual</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-1">
                            {onOpenCropModal && (
                              <button
                                type="button"
                                onClick={() => onOpenCropModal(scan)}
                                className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer text-[10px]"
                              >
                                ✂️ Ubah Crop
                              </button>
                            )}
                            {onRevertOriginal && scan.originalDataUrl && (
                              <button
                                type="button"
                                onClick={() => onRevertOriginal(scan.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer text-[10px]"
                                title="Kembalikan foto asli belum di-crop"
                              >
                                Foto Asli
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between text-[11px] bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1.5 rounded-lg">
                          <span className="text-slate-600 font-medium">Foto Asli Utuh</span>
                          {onOpenCropModal && (
                            <button
                              type="button"
                              onClick={() => onOpenCropModal(scan)}
                              className="text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer inline-flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs hover:bg-emerald-100/70 transition"
                              title="Pilih bagian penting dokumen seperti tanda tangan, stempel, atau isi teks"
                            >
                              <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✂️ Crop Manual</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Target Selector */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Dipetakan Ke Target:
                      </label>
                      <select
                        value={scan.matchedTargetId || ''}
                        onChange={(e) => onAssignTarget(scan.id, e.target.value || undefined)}
                        className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${
                          assignedTarget
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800'
                            : 'bg-amber-50 border-amber-300 text-amber-800'
                        }`}
                      >
                        <option value="">-- Belum Dipetakan (Pilih Target) --</option>
                        {targets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} {t.category === 'signed_page' ? '(Pengganti Teks)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Detection badge info */}
                      <div className="flex items-center justify-between mt-2">
                        {assignedTarget ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {scan.detectionSource === 'filename'
                              ? 'Dikenali via nama file'
                              : scan.detectionSource === 'ocr'
                              ? 'Dikenali via OCR'
                              : 'Dipilih manual'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                            <HelpCircle className="w-3 h-3 text-amber-600" />
                            Pilih jenis dokumen
                          </span>
                        )}

                        <button
                          onClick={() => onRunOcrForScan(scan.id)}
                          disabled={isOcrRunning}
                          title="Jalankan OCR untuk mengenali judul dari foto"
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <ScanText className="w-3 h-3" />
                          {isOcrRunning ? 'OCR...' : 'Pindai OCR'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Total <strong className="text-slate-800">{scans.length} file scan</strong> diunggah.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  scans.forEach((s) => onRunOcrForScan(s.id));
                }}
                disabled={isOcrRunning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition disabled:opacity-50"
              >
                <ScanText className="w-3.5 h-3.5 text-indigo-600" />
                Pindai OCR Semua Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <p className="font-bold text-sm">{previewModalImg.name}</p>
                <p className="text-xs text-slate-400">
                  {previewModalImg.width} × {previewModalImg.height} piksel •{' '}
                  {formatFileSize(previewModalImg.size)}
                </p>
              </div>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Tutup ✕
              </button>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-slate-950">
              <img
                src={previewModalImg.dataUrl}
                alt={previewModalImg.name}
                style={{
                  transform: `rotate(${previewModalImg.rotation || 0}deg)`,
                }}
                className="max-h-[70vh] object-contain rounded-md shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
