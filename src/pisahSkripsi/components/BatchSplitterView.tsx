import React, { useState, useEffect } from 'react';
import {
  Layers,
  Archive,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Zap,
  FileArchive,
  Eye,
  Trash2,
  Check
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BatchFileItem, SectionRange, ThesisMetadata } from '../types';
import { extractPdfText, getScanQualityStatus } from '../lib/pdfExtractor';
import { extractDocxText } from '../lib/docxExtractor';
import { convertImagesToPdfBuffer } from '../lib/imageToPdf';
import { detectMetadataFromText, detectSectionsFromText } from '../lib/heuristicsDetector';
import { splitPdfSections } from '../lib/pdfSplitter';

interface BatchSplitterViewProps {
  files: File[];
  onSelectSingleFile: (
    file: File,
    buffer: ArrayBuffer,
    pagesText: any[],
    metadata: ThesisMetadata,
    sections: SectionRange[]
  ) => void;
  onResetBatch: () => void;
  onExportComplete?: (fileName: string) => void;
}

export const BatchSplitterView: React.FC<BatchSplitterViewProps> = ({
  files,
  onSelectSingleFile,
  onResetBatch,
  onExportComplete,
}) => {
  const [items, setItems] = useState<BatchFileItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const [isZippingAll, setIsZippingAll] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);

  // Initialize items on mount or when files change
  useEffect(() => {
    if (!files || files.length === 0) return;

    const initialItems: BatchFileItem[] = files.map((file, idx) => {
      const ext = file.name.toLowerCase();
      let fileType: 'pdf' | 'docx' | 'image' = 'pdf';
      if (ext.endsWith('.docx') || ext.endsWith('.doc')) fileType = 'docx';
      else if (
        ext.endsWith('.jpg') ||
        ext.endsWith('.jpeg') ||
        ext.endsWith('.png') ||
        ext.endsWith('.webp') ||
        ext.endsWith('.bmp') ||
        file.type.startsWith('image/')
      ) {
        fileType = 'image';
      }

      return {
        id: `batch-${Date.now()}-${idx}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        buffer: null,
        pagesText: [],
        pdfDoc: null,
        metadata: null,
        sections: [],
        scanQuality: fileType === 'docx' ? 'docx_word' : fileType === 'image' ? 'image_file' : 'digital_pdf',
        ocrPageCount: 0,
        status: 'pending',
        progressPercentage: 0,
      };
    });

    setItems(initialItems);
  }, [files]);

  // Process all items sequentially
  const startBatchProcessing = async () => {
    setIsProcessingAll(true);

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];
      if (currentItem.status === 'completed') continue;

      // Update current item to processing
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'processing', progressPercentage: 10 } : item
        )
      );

      try {
        let pdfBuffer: ArrayBuffer;
        let pagesText: any[] = [];
        let pdfDocProxy: any = null;

        if (currentItem.fileType === 'image') {
          // Image file -> Convert to PDF buffer
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, progressPercentage: 20 } : item
            )
          );
          pdfBuffer = await convertImagesToPdfBuffer([currentItem.file]);
          const extracted = await extractPdfText(pdfBuffer);
          pagesText = extracted.pages;
          pdfDocProxy = extracted.pdfDoc;
        } else if (currentItem.fileType === 'docx') {
          // Word file -> Extract docx text
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, progressPercentage: 30 } : item
            )
          );
          pdfBuffer = await currentItem.file.arrayBuffer();
          const extracted = await extractDocxText(pdfBuffer);
          pagesText = extracted.pages;
        } else {
          // PDF file -> Extract PDF text
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, progressPercentage: 30 } : item
            )
          );
          pdfBuffer = await currentItem.file.arrayBuffer();
          const extracted = await extractPdfText(pdfBuffer);
          pagesText = extracted.pages;
          pdfDocProxy = extracted.pdfDoc;
        }

        // Run heuristics detector
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, progressPercentage: 70 } : item
          )
        );

        const metadata = detectMetadataFromText(pagesText, currentItem.fileName);
        const sections = detectSectionsFromText(pagesText, metadata);
        const qualityInfo = getScanQualityStatus(
          pagesText,
          currentItem.fileType === 'docx',
          currentItem.fileType === 'image'
        );

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  buffer: pdfBuffer,
                  pagesText,
                  pdfDoc: pdfDocProxy,
                  metadata,
                  sections,
                  scanQuality: qualityInfo.status,
                  ocrPageCount: qualityInfo.ocrPageCount,
                  status: 'completed',
                  progressPercentage: 100,
                }
              : item
          )
        );
      } catch (err: any) {
        console.error(`Error processing batch file ${currentItem.fileName}:`, err);
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: err.message || 'Gagal memproses file',
                  progressPercentage: 0,
                }
              : item
          )
        );
      }
    }

    setIsProcessingAll(false);
  };

  // Auto start batch processing when items are populated
  useEffect(() => {
    if (items.length > 0 && items.some((item) => item.status === 'pending') && !isProcessingAll) {
      startBatchProcessing();
    }
  }, [items]);

  // Master Zipping & Download all processed files
  const handleDownloadMasterZip = async () => {
    const completedItems = items.filter((it) => it.status === 'completed' && it.buffer && it.sections.length > 0);
    if (completedItems.length === 0) {
      alert('Belum ada file yang selesai diproses.');
      return;
    }

    setIsZippingAll(true);
    setZipProgress(0);

    try {
      const masterZip = new JSZip();

      for (let i = 0; i < completedItems.length; i++) {
        const item = completedItems[i];
        const meta = item.metadata || { nama: 'MAHASISWA', nim: '000000', prodiCode: 'SKRIPSI', judul: 'SKRIPSI' };
        
        // Clean folder name
        const folderName = `${meta.prodiCode || 'PRODI'}_${meta.nim || 'NIM'}_${meta.nama.replace(/[^a-zA-Z0-0]/g, '_').toUpperCase()}`;
        const folder = masterZip.folder(folderName);

        if (folder && item.buffer) {
          const splitResults = await splitPdfSections(item.buffer, item.sections);
          splitResults.forEach((secRes) => {
            folder.file(secRes.filename, secRes.blob);
          });
        }

        setZipProgress(Math.round(((i + 1) / completedItems.length) * 100));
      }

      const zipBlob = await masterZip.generateAsync({ type: 'blob' });
      const zipFileName = `BATCH_SKRIPSI_TERPISAH_${new Date().toISOString().split('T')[0]}.zip`;
      saveAs(zipBlob, zipFileName);
      onExportComplete?.(zipFileName);
    } catch (err) {
      console.error('Error generating master zip:', err);
      alert('Gagal mengunduh ZIP gabungan.');
    } finally {
      setIsZippingAll(false);
      setZipProgress(0);
    }
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 backdrop-blur-md flex items-center justify-center border border-blue-400/30 shrink-0 shadow-inner">
              <Layers className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-300" />
                  Batch Multi-File Splitter
                </span>
                <span className="text-xs text-blue-200">{items.length} File Terdeteksi</span>
              </div>
              <h2 className="text-2xl font-black mt-1 tracking-tight">Pemisahan Banyak Skripsi Sekaligus</h2>
              <p className="text-xs text-blue-200 mt-1 max-w-xl leading-relaxed">
                Memilih dan memproses banyak file PDF, Word (.docx), dan foto naskah JPG/PNG dalam satu kali jalan secara otomatis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadMasterZip}
              disabled={completedCount === 0 || isZippingAll}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isZippingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengompresi ZIP ({zipProgress}%)...</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>UNDUH SEMUA SKRIPSI (1 ZIP GABUNGAN)</span>
                </>
              )}
            </button>

            <button
              onClick={onResetBatch}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs border border-white/20 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Batch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Stats Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="text-xs space-y-1">
            <span className="text-slate-500 block">Kemajuan Pemrosesan:</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">
              {completedCount} dari {items.length} File Selesai
            </span>
          </div>
        </div>

        <div className="w-full md:w-1/2 space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span>Progress Otomatis</span>
            <span>{Math.round((completedCount / (items.length || 1)) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completedCount / (items.length || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Batch File Cards List */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const isDocx = item.fileType === 'docx';
          const isImage = item.fileType === 'image';
          const detectedSectionsCount = item.sections.filter((s) => s.detected).length;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* File details info */}
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isDocx
                      ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
                      : isImage
                      ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800'
                      : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                  }`}
                >
                  {isImage ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white max-w-xs sm:max-w-md truncate">
                      {idx + 1}. {item.fileName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({(item.fileSize / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  {item.status === 'completed' && item.metadata ? (
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {item.metadata.nama} ({item.metadata.nim})
                      </span>
                      <span>•</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {item.metadata.prodiCode}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {detectedSectionsCount} Bagian Terpisah Sempurna
                      </span>
                    </div>
                  ) : item.status === 'processing' ? (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 animate-pulse font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sedang Mengekstrak Halaman & Mendeteksi Struktur Bab...
                    </p>
                  ) : item.status === 'error' ? (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.errorMessage || 'Gagal memproses file ini'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Menunggu antrean pemrosesan...</p>
                  )}
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center space-x-3 shrink-0">
                {/* Scan Quality Indicator */}
                <div className="text-right hidden sm:block">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      item.scanQuality === 'docx_word'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                        : item.scanQuality === 'digital_pdf'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.scanQuality === 'image_file'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {item.scanQuality === 'docx_word'
                      ? 'Naskah Digital (.docx)'
                      : item.scanQuality === 'digital_pdf'
                      ? 'PDF Digital Native'
                      : item.scanQuality === 'image_file'
                      ? 'Dokumen Gambar (OCR)'
                      : 'PDF Hasil Scan OCR'}
                  </span>
                </div>

                {/* Individual Action Button */}
                {item.status === 'completed' && item.buffer && item.metadata && (
                  <button
                    onClick={() =>
                      onSelectSingleFile(
                        item.file,
                        item.buffer!,
                        item.pagesText,
                        item.metadata!,
                        item.sections
                      )
                    }
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat & Edit Splitter</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
