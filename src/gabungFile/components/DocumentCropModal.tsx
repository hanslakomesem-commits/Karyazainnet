/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DocumentCropModal
 * Interactive crop-only editor for student attachment photos.
 * Removes outer table/desk background without rotating the document.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Crop, 
  Sparkles, 
  Undo2, 
  CheckCircle2,
} from 'lucide-react';
import { ScanFile } from '../types/skripsi';
import { 
  detectDocumentBounds, 
  cropAndDeskewImage, 
  loadImage, 
  DocumentBounds,
  CropResult
} from '../utils/documentCropper';

interface DocumentCropModalProps {
  scan: ScanFile;
  onClose: () => void;
  onApplyCrop: (scanId: string, result: CropResult) => void;
  onRevertOriginal?: (scanId: string) => void;
}

export const DocumentCropModal: React.FC<DocumentCropModalProps> = ({
  scan,
  onClose,
  onApplyCrop,
  onRevertOriginal,
}) => {
  // Use original uncropped photo as base if available, or current dataUrl
  const baseImageSource = scan.originalDataUrl || scan.dataUrl;

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: scan.width, height: scan.height });

  // Margins in percentage (0 to 45%) from outer edges
  const [marginTop, setMarginTop] = useState(0);
  const [marginBottom, setMarginBottom] = useState(0);
  const [marginLeft, setMarginLeft] = useState(0);
  const [marginRight, setMarginRight] = useState(0);

  // Filter option
  const [enhanceContrast, setEnhanceContrast] = useState(!!scan.enhancedContrast);

  // Detected info
  const [detectedBounds, setDetectedBounds] = useState<DocumentBounds | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [previewDimensions, setPreviewDimensions] = useState({ width: scan.width, height: scan.height });

  // 1. Initial Load and Auto-Detection
  useEffect(() => {
    let isMounted = true;
    const runInitialDetection = async () => {
      try {
        setIsLoading(true);
        const img = await loadImage(baseImageSource);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!isMounted) return;
        setNaturalSize({ width: w, height: h });

        const detection = await detectDocumentBounds(img);
        if (!isMounted) return;
        setDetectedBounds(detection);

        if (scan.isCropped && scan.cropBounds) {
          // Restore already applied crop
          const b = scan.cropBounds;
          setMarginLeft(Math.max(0, Math.min(75, (b.x / w) * 100)));
          setMarginTop(Math.max(0, Math.min(75, (b.y / h) * 100)));
          setMarginRight(Math.max(0, Math.min(75, ((w - (b.x + b.width)) / w) * 100)));
          setMarginBottom(Math.max(0, Math.min(75, ((h - (b.y + b.height)) / h) * 100)));
        } else {
          // Default: Utuh tanpa crop (0%), pengguna bebas crop manual bagian penting
          setMarginLeft(0);
          setMarginTop(0);
          setMarginRight(0);
          setMarginBottom(0);
        }
      } catch (err) {
        console.error('Error running document crop detection:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    runInitialDetection();
    return () => {
      isMounted = false;
    };
  }, [baseImageSource]);

  // 2. Generate Real-time Preview whenever margins or filter changes
  useEffect(() => {
    let isCancelled = false;
    const updatePreview = async () => {
      if (isLoading || naturalSize.width === 0) return;
      try {
        const w = naturalSize.width;
        const h = naturalSize.height;

        const x = Math.round((marginLeft / 100) * w);
        const y = Math.round((marginTop / 100) * h);
        const cropW = Math.max(50, Math.round(w - x - (marginRight / 100) * w));
        const cropH = Math.max(50, Math.round(h - y - (marginBottom / 100) * h));

        const res = await cropAndDeskewImage(baseImageSource, {
          bounds: { x, y, width: cropW, height: cropH },
          enhanceContrast,
          fileName: scan.name,
        });

        if (!isCancelled) {
          setPreviewDataUrl(res.dataUrl);
          setPreviewDimensions({ width: res.width, height: res.height });
        }
      } catch (err) {
        console.warn('Preview generation error:', err);
      }
    };

    const timeout = setTimeout(updatePreview, 60);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [marginLeft, marginTop, marginRight, marginBottom, enhanceContrast, isLoading, naturalSize, baseImageSource, scan.name]);

  // Auto-Detect Table Button handler
  const handleAutoDetect = () => {
    if (!detectedBounds) return;
    const w = naturalSize.width;
    const h = naturalSize.height;
    setMarginLeft(Math.max(0, Math.min(45, (detectedBounds.x / w) * 100)));
    setMarginTop(Math.max(0, Math.min(45, (detectedBounds.y / h) * 100)));
    setMarginRight(Math.max(0, Math.min(45, ((w - (detectedBounds.x + detectedBounds.width)) / w) * 100)));
    setMarginBottom(Math.max(0, Math.min(45, ((h - (detectedBounds.y + detectedBounds.height)) / h) * 100)));
  };

  // Reset to full uncropped original
  const handleReset = () => {
    setMarginTop(0);
    setMarginBottom(0);
    setMarginLeft(0);
    setMarginRight(0);
    setEnhanceContrast(false);
  };

  // Apply and save
  const handleSaveAndApply = async () => {
    try {
      setIsProcessing(true);
      const w = naturalSize.width;
      const h = naturalSize.height;

      const x = Math.round((marginLeft / 100) * w);
      const y = Math.round((marginTop / 100) * h);
      const cropW = Math.max(50, Math.round(w - x - (marginRight / 100) * w));
      const cropH = Math.max(50, Math.round(h - y - (marginBottom / 100) * h));

      const res = await cropAndDeskewImage(baseImageSource, {
        bounds: { x, y, width: cropW, height: cropH },
        enhanceContrast,
        fileName: scan.name,
      });

      onApplyCrop(scan.id, res);
      onClose();
    } catch (err: any) {
      alert('Gagal menerapkan hasil crop: ' + (err?.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Crop Manual Dokumen (Pilih Bagian Penting)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                  Crop Presisi
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {scan.name} • {naturalSize.width} × {naturalSize.height} px • Atur potongan manual bagian penting
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Visual Preview (Cropped Result) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 min-h-[360px] relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs font-medium">Memuat gambar dokumen...</p>
              </div>
            ) : previewDataUrl ? (
              <div className="relative max-h-[500px] flex items-center justify-center overflow-hidden rounded-lg shadow-md border border-slate-700/50 bg-white/5">
                <img
                  src={previewDataUrl}
                  alt="Pratinjau Hasil Crop"
                  className="max-h-[480px] max-w-full object-contain shadow-sm"
                />
                
                {/* Overlay Badge */}
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-[10px] text-emerald-300 font-mono flex items-center gap-1.5 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{previewDimensions.width} × {previewDimensions.height} px</span>
                  {marginTop > 0 || marginBottom > 0 || marginLeft > 0 || marginRight > 0 ? (
                    <span className="text-amber-300 ml-1">
                      (Dipangkas: T{marginTop}% B{marginBottom}% L{marginLeft}% R{marginRight}%)
                    </span>
                  ) : (
                    <span className="text-slate-400 ml-1">(Utuh 100%)</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Gagal memuat pratinjau</p>
            )}
          </div>

          {/* Right Column: Adjustment Controls */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              {/* Quick Preset Buttons for Manual Crop */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pilihan Cepat Potong Bagian Penting:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setMarginTop(50);
                      setMarginBottom(2);
                      setMarginLeft(5);
                      setMarginRight(5);
                    }}
                    className="p-2 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/40 text-indigo-200 text-left transition cursor-pointer"
                  >
                    <span className="font-bold block text-white">✍️ Tanda Tangan & Cap</span>
                    <span className="text-[10px] text-indigo-300">Ambil bagian bawah dokumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMarginTop(18);
                      setMarginBottom(18);
                      setMarginLeft(5);
                      setMarginRight(5);
                    }}
                    className="p-2 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/40 text-indigo-200 text-left transition cursor-pointer"
                  >
                    <span className="font-bold block text-white">📄 Badan Surat / Inti</span>
                    <span className="text-[10px] text-indigo-300">Ambil area tengah dokumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMarginTop(5);
                      setMarginBottom(5);
                      setMarginLeft(5);
                      setMarginRight(5);
                    }}
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 text-left transition cursor-pointer"
                  >
                    <span className="font-bold block text-white">✂️ Pangkas Tepi Meja (5%)</span>
                    <span className="text-[10px] text-slate-400">Bersihkan tepi luar 5%</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 text-left transition cursor-pointer"
                  >
                    <span className="font-bold block text-amber-300">🔄 Dokumen Utuh (0%)</span>
                    <span className="text-[10px] text-slate-400">Tampilkan penuh tanpa crop</span>
                  </button>
                </div>
              </div>

              {/* Crop Sliders: Atas, Bawah, Kiri, Kanan (Max 85% untuk crop bagian spesifik) */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5 text-emerald-400" />
                    Atur Persentase Potong Tepi Manual:
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Undo2 className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Tepi Atas</span>
                      <span className="font-mono text-emerald-400">{marginTop}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      step="0.5"
                      value={marginTop}
                      onChange={(e) => setMarginTop(parseFloat(e.target.value) || 0)}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Tepi Bawah</span>
                      <span className="font-mono text-emerald-400">{marginBottom}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      step="0.5"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(parseFloat(e.target.value) || 0)}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Tepi Kiri</span>
                      <span className="font-mono text-emerald-400">{marginLeft}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      step="0.5"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(parseFloat(e.target.value) || 0)}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Tepi Kanan</span>
                      <span className="font-mono text-emerald-400">{marginRight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      step="0.5"
                      value={marginRight}
                      onChange={(e) => setMarginRight(parseFloat(e.target.value) || 0)}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Document Filter: Perjelas Kontras Kertas */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer hover:bg-slate-800/70 transition">
                <input
                  type="checkbox"
                  checked={enhanceContrast}
                  onChange={(e) => setEnhanceContrast(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 block">
                    Tingkatkan Kontras Kertas (Scanner Filter)
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Memutihkan latar kertas & memperjelas tulisan/tanda tangan seperti scanner fisik
                  </span>
                </div>
              </label>
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {scan.isCropped && onRevertOriginal ? (
                <button
                  type="button"
                  onClick={() => {
                    onRevertOriginal(scan.id);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 text-xs font-semibold transition cursor-pointer border border-slate-700"
                >
                  Kembalikan ke Foto Asli
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSaveAndApply}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan Crop Saja</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
