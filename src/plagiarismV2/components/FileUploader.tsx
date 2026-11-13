import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  FileCheck2,
  ClipboardPaste,
  Hash,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Bot,
  Search,
  Check,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Percent,
  ListFilter,
  Clock,
  Zap,
  Activity,
  Cpu,
  Loader2,
} from 'lucide-react';
import type { DocxFileInfo, PlagiarismFileInfo, PlagiarismSegment } from '../types';

interface FileUploaderProps {
  docxInfo: DocxFileInfo | null;
  plagInfo: PlagiarismFileInfo | null;
  isProcessing: boolean;
  isCheckingPlagiarism: boolean;
  processingStatusText?: string;
  onPlagiarismFileSelected: (file: File) => Promise<void>;
  onPlagiarismTextPasted: (text: string) => void;
  onRunPlagiarismCheck: () => Promise<void>;
  onInstantPlagiarismExtract?: () => void;
  onDocxUploaded: (file: File) => Promise<void>;
  onStartAnalysis: () => Promise<void>;
  currentStage: 'stage1_plag' | 'stage2_docx';
  onStageChange: (stage: 'stage1_plag' | 'stage2_docx') => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  docxInfo,
  plagInfo,
  isProcessing,
  isCheckingPlagiarism,
  processingStatusText,
  onPlagiarismFileSelected,
  onPlagiarismTextPasted,
  onRunPlagiarismCheck,
  onInstantPlagiarismExtract,
  onDocxUploaded,
  onStartAnalysis,
  currentStage,
  onStageChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [dragOverPlag, setDragOverPlag] = useState(false);
  const [dragOverDocx, setDragOverDocx] = useState(false);
  const [showExtractedList, setShowExtractedList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const plagInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  // Live timer when processing is active
  useEffect(() => {
    let interval: any = null;
    if (isProcessing || isCheckingPlagiarism) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, isCheckingPlagiarism]);

  const handlePlagDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPlag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onPlagiarismFileSelected(file);
    }
  };

  const handleDocxDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDocx(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      onDocxUploaded(file);
    }
  };

  const handleApplyPaste = () => {
    if (pastedText.trim().length > 10) {
      onPlagiarismTextPasted(pastedText);
    }
  };

  const hasPlagFile = Boolean(plagInfo);
  const isPlagChecked = Boolean(plagInfo && plagInfo.isChecked);
  const hasDocx = Boolean(docxInfo);

  const filteredSegments = (plagInfo?.extractedSegments || []).filter((s) =>
    (s.originalText || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Principle & Workflow Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Alur Pemrosesan 2 Tahap: Ekstraksi Plagiasi & Revisi In-Place
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                <strong>Tahap 1:</strong> Sistem membaca dan menyimpan seluruh kata/kalimat yang terindikasi kesamaan dari file PDF laporan Turnitin Anda.
                <br />
                <strong>Tahap 2:</strong> Upload file Word (.docx) asli untuk mengganti persis kalimat plagiasi tanpa merusak susunan nomor catatan kaki (footnote).
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onStageChange('stage1_plag')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentStage === 'stage1_plag'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isPlagChecked
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isPlagChecked ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'bg-slate-700 text-white'
              }`}>
                {isPlagChecked ? '✓' : '1'}
              </span>
              <span>Tahap 1: Cek PDF Plagiasi</span>
            </button>

            <span className="text-slate-600 font-bold">➔</span>

            <button
              type="button"
              onClick={() => {
                if (isPlagChecked) onStageChange('stage2_docx');
              }}
              disabled={!isPlagChecked}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentStage === 'stage2_docx'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : hasDocx
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : isPlagChecked
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                hasDocx ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'bg-slate-700 text-white'
              }`}>
                {hasDocx ? '✓' : '2'}
              </span>
              <span>Tahap 2: File Word Asli</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAHAP 1: UPLOAD & CEK PLAGIASI PDF DULU                                  */}
      {/* ========================================================================= */}
      {currentStage === 'stage1_plag' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Stage 1 */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold shadow-xs">
                  1
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Tahap 1: Wajib Unggah File PDF Laporan Plagiasi / Hasil Cek Turnitin
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sistem akan membaca dan menyimpan seluruh daftar kalimat dan kata yang terindikasi kesamaan teks.
                  </p>
                </div>
              </div>

              {/* Upload vs Paste Toggle */}
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold text-slate-600 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Upload File PDF / Laporan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Tempel Teks Plagiasi
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* ========================================================= */}
              {/* LIVE PROCESSING & PROGRESS STATUS INDICATOR CARD          */}
              {/* ========================================================= */}
              {(isProcessing || isCheckingPlagiarism) && (
                <div className="bg-slate-950 border-2 border-amber-500/80 rounded-2xl p-6 text-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Aplikasi Sedang Berjalan
                          </span>
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                            Server Aktif
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">
                          {isProcessing
                            ? 'Membaca dan Memproses Dokumen...'
                            : 'Sistem Sedang Memindai & Menyimpan Kalimat Kesamaan...'}
                        </h3>
                      </div>
                    </div>

                    {/* Live Seconds Counter */}
                    <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-slate-400">Waktu Proses:</span>
                      <span className="text-xs font-bold text-amber-300 font-mono">
                        {elapsedSeconds} detik
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Status Text */}
                  <div className="mt-4 space-y-3">
                    <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex items-start gap-3">
                      <Bot className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200">
                          {processingStatusText ||
                            (isProcessing
                              ? 'Sedang membaca teks dari berkas PDF/Word dan mengurai struktur dokumen...'
                              : 'Sistem sedang menganalisis kalimat yang terkena indikasi Turnitin dan menyusun indeks frasa...')}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          ⚡ Proses ini berjalan di latar belakang dan <strong>tidak macet</strong>. Untuk dokumen dengan banyak halaman, sistem secara otomatis menerapkan ekstraksi teroptimasi.
                        </p>
                      </div>
                    </div>

                    {/* Step-by-Step Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                        plagInfo
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        {plagInfo ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                        )}
                        <span className="truncate">1. Muat Berkas PDF</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                        isCheckingPlagiarism
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                          : isPlagChecked
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {isPlagChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isCheckingPlagiarism ? (
                          <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0">2</span>
                        )}
                        <span className="truncate">2. Pindai Kalimat Plagiasi</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                        isPlagChecked
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {isPlagChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0">3</span>
                        )}
                        <span className="truncate">3. Simpan ke Memori</span>
                      </div>
                    </div>

                    {/* Instant Fallback Button if user wants immediate response */}
                    {isCheckingPlagiarism && onInstantPlagiarismExtract && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">
                          Butuh ekstraksi langsung tanpa antrean? Gunakan pemrosesan instan:
                        </span>
                        <button
                          type="button"
                          onClick={onInstantPlagiarismExtract}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>⚡ Jalankan Ekstraksi Instan Cepat (0 Detik)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'upload' ? (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverPlag(true);
                    }}
                    onDragLeave={() => setDragOverPlag(false)}
                    onDrop={handlePlagDrop}
                    onClick={() => !isProcessing && !isCheckingPlagiarism && plagInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                      dragOverPlag
                        ? 'border-amber-500 bg-amber-50/60'
                        : isProcessing || isCheckingPlagiarism
                        ? 'border-amber-400 bg-amber-50/20 cursor-wait opacity-80'
                        : plagInfo
                        ? isPlagChecked
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-amber-400 bg-amber-50/40 shadow-xs'
                        : 'border-slate-300 hover:border-amber-400 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={plagInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onPlagiarismFileSelected(file);
                      }}
                    />

                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xs ${
                      isProcessing || isCheckingPlagiarism
                        ? 'bg-amber-500 text-white animate-bounce'
                        : isPlagChecked
                        ? 'bg-emerald-100 text-emerald-700'
                        : plagInfo
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isProcessing || isCheckingPlagiarism ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : isPlagChecked ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        <FileText className="w-7 h-7" />
                      )}
                    </div>

                    <p className="text-base font-bold text-slate-800">
                      {isProcessing
                        ? 'Sedang Membaca & Mengekstrak Dokumen...'
                        : isCheckingPlagiarism
                        ? 'Sistem Sedang Menganalisis Kalimat Kesamaan...'
                        : plagInfo
                        ? plagInfo.fileName
                        : 'Pilih atau Tarik File Laporan Plagiasi (PDF / Turnitin)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isProcessing || isCheckingPlagiarism
                        ? 'Mohon tunggu sebentar, file sedang diolah...'
                        : 'Mendukung PDF hasil cek Turnitin, iThenticate, Plagiarism Checker, atau dokumen teks'}
                    </p>

                    {plagInfo && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-200/90 text-slate-800 border border-slate-300">
                        <span className="font-bold text-emerald-700">✓ Dokumen Terbaca</span>
                        <span>• {(plagInfo.fileSize / 1024).toFixed(1)} KB</span>
                        {plagInfo.pageCount && <span>• {plagInfo.pageCount} Halaman</span>}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Tempelkan Kalimat atau Paragraf yang Terindikasi Plagiasi:
                  </label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Tempel kalimat atau paragraf yang terkena kesamaan Turnitin di sini..."
                    className="w-full text-xs p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800 placeholder-slate-400 resize-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPaste}
                    disabled={pastedText.trim().length < 10 || isProcessing || isCheckingPlagiarism}
                    className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    Simpan Teks Kutipan Ini
                  </button>
                </div>
              )}

              {/* ACTION: TOMBOL CEK PLAGIASI & SIMPAN DAFTAR KATA */}
              {plagInfo && (
                <div className={`p-5 rounded-2xl border transition-all shadow-lg ${
                  isPlagChecked
                    ? 'bg-slate-900 text-white border-slate-800'
                    : 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white border-amber-500/50 ring-2 ring-amber-500/20'
                }`}>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isPlagChecked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500 text-slate-950 font-bold shadow-md animate-pulse'
                      }`}>
                        {isPlagChecked ? <CheckCircle2 className="w-6 h-6" /> : <Search className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isPlagChecked
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-400 text-slate-950'
                          }`}>
                            {isPlagChecked ? 'Tahap 1 Selesai' : 'Langkah Wajib Selanjutnya'}
                          </span>
                          <span className="text-xs text-slate-400 truncate max-w-xs">{plagInfo.fileName}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {isPlagChecked
                            ? `✅ Sistem Berhasil Menyimpan ${plagInfo.extractedSegments?.length || 0} Bagian Kesamaan`
                            : 'Dokumen PDF Siap: Klik Tombol di Kanan untuk Memulai Pemindaian Kalimat Plagiasi'}
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {isPlagChecked
                            ? 'Daftar kata/kalimat terindikasi plagiasi telah tersimpan di basis data sistem. Silakan lanjut ke Tahap 2.'
                            : 'Sistem akan membaca teks laporan Turnitin, mengidentifikasi setiap kalimat kesamaan, dan menyimpannya ke basis data.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      <button
                        type="button"
                        onClick={onRunPlagiarismCheck}
                        disabled={isCheckingPlagiarism || isProcessing}
                        className={`px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                          isCheckingPlagiarism
                            ? 'bg-amber-600 text-white cursor-wait'
                            : isPlagChecked
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/20 shadow-lg'
                        }`}
                      >
                        {isCheckingPlagiarism ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sistem Sedang Memproses ({elapsedSeconds}s)...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>{isPlagChecked ? 'Ulangi Pemindaian Dokumen' : '▶️ 1. Pindai & Ekstraksi Kalimat Plagiasi'}</span>
                          </>
                        )}
                      </button>

                      {/* Instant Button for instant zero-wait execution */}
                      {!isPlagChecked && onInstantPlagiarismExtract && (
                        <button
                          type="button"
                          onClick={onInstantPlagiarismExtract}
                          disabled={isCheckingPlagiarism || isProcessing}
                          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                          title="Ekstraksi kalimat langsung dalam 0 detik tanpa menunggu API"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>⚡ 2. Ekstraksi Cepat (0s)</span>
                        </button>
                      )}

                      {isPlagChecked && (
                        <button
                          type="button"
                          onClick={() => onStageChange('stage2_docx')}
                          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <span>Lanjut ke Tahap 2: File Word Asli</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* LIST OF SAVED PLAGIARISM SEGMENTS IN MEMORY */}
              {isPlagChecked && (plagInfo.extractedSegments?.length || 0) > 0 && (
                <div className="border border-emerald-200 rounded-2xl bg-emerald-50/20 overflow-hidden space-y-3">
                  <div className="bg-emerald-100/70 px-5 py-3 border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <h3 className="text-xs font-bold text-emerald-950">
                        Daftar Kata & Kalimat Terindikasi Plagiasi yang Tersimpan ({plagInfo.extractedSegments.length} Bagian)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowExtractedList(!showExtractedList)}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                    >
                      <span>{showExtractedList ? 'Sembunyikan' : 'Tampilkan'}</span>
                      {showExtractedList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {showExtractedList && (
                    <div className="p-4 space-y-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari kata atau kalimat dalam daftar plagiasi..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {filteredSegments.map((seg, idx) => (
                          <div
                            key={seg.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3"
                          >
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-800 font-serif leading-relaxed line-clamp-2">
                                "{seg.originalText}"
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {seg.similarityScore || 85}% Sim
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                Tersimpan
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60 text-xs text-slate-600">
                        <span>Menampilkan {filteredSegments.length} dari total {plagInfo.extractedSegments.length} kalimat</span>
                        <button
                          type="button"
                          onClick={() => onStageChange('stage2_docx')}
                          className="font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                        >
                          <span>Lanjut ke Unggah File Word Asli</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAHAP 2: UPLOAD FILE WORD ASLI (.DOCX) SETELAH PLAGIASI TERSIMPAN        */}
      {/* ========================================================================= */}
      {currentStage === 'stage2_docx' && (
        <div className="space-y-6">
          {/* Summary of Saved Stage 1 */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300">Tahap 1 Selesai:</span>
                  <span className="text-xs font-medium text-slate-200 truncate max-w-xs">{plagInfo?.fileName}</span>
                </div>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  {plagInfo?.extractedSegments?.length || 0} kata/kalimat plagiasi tersimpan di basis data sistem
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStageChange('stage1_plag')}
              className="text-xs font-semibold text-emerald-300 hover:text-white bg-slate-900/80 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-colors self-start sm:self-auto flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ganti Laporan Plagiasi</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Stage 2 */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Tahap 2: Unggah File Skripsi Word Asli (.docx) untuk Revisi In-Place
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sistem akan mencari posisi persis kata-kata plagiasi yang tersimpan di Tahap 1 pada file Word ini.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                Format .docx
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDocx(true);
                  }}
                  onDragLeave={() => setDragOverDocx(false)}
                  onDrop={handleDocxDrop}
                  onClick={() => docxInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    dragOverDocx
                      ? 'border-blue-500 bg-blue-50/60'
                      : docxInfo
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={docxInputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onDocxUploaded(file);
                    }}
                  />
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xs ${
                    docxInfo ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {docxInfo ? <CheckCircle2 className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
                  </div>
                  <p className="text-base font-bold text-slate-800">
                    {docxInfo ? docxInfo.fileName : 'Pilih atau Tarik File Skripsi Word (.docx) Asli'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    File naskah lengkap dengan catatan kaki (footnote), daftar pustaka, tabel, & bab
                  </p>
                </div>
              </div>

              {/* Docx Details & Footnote Guard Verification Badge */}
              {docxInfo && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Struktur File Word Asli Terbaca:</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      100% Siap In-Place Revision
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-slate-500 text-[10px]">Total Paragraf</div>
                        <div className="font-bold text-slate-900">{docxInfo.totalParagraphs} Paragraf</div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="text-slate-500 text-[10px]">Total Bab Terdeteksi</div>
                        <div className="font-bold text-slate-900">{docxInfo.chapters?.length || 0} Bab Naskah</div>
                      </div>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-300 flex items-center gap-2.5">
                      <Hash className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-emerald-700 text-[10px] font-bold">Footnote Guard Aktif</div>
                        <div className="font-extrabold text-emerald-950">
                          {docxInfo.footnotes?.length || 0} Catatan Kaki Utuh
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION: START ANALYSIS & MATCHING */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      {docxInfo
                        ? 'Semua Data Lengkap: Siap Mencocokkan & Memparafrase'
                        : 'Silakan Unggah File Skripsi Word (.docx) di atas'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sistem akan mencari posisi kata plagiasi di naskah Word dan merevisi in-place tanpa mengubah nomor footnote.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onStartAnalysis}
                  disabled={!docxInfo || isProcessing}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Mencocokkan & Memproses Parafrase Ilmiah...</span>
                    </>
                  ) : (
                    <>
                      <span>Cocokkan Kalimat & Mulai Parafrase</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
