import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Eye,
  FileCheck,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  BookmarkCheck,
  BookOpen
} from 'lucide-react';
import {
  analyzeDocx,
  correctThesisDocx,
  createSampleFaultyThesisDocx,
  ThesisSection,
  DocumentAnalysis
} from '../utils/docxPaginator';

interface SkripsiPaginatorViewProps {
  onCorrectionComplete?: (fileName: string) => void;
}

export const SkripsiPaginatorView: React.FC<SkripsiPaginatorViewProps> = ({ onCorrectionComplete }) => {
  const [file, setFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [workingData, setWorkingData] = useState<{ zip: any; docXml: Document } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<'sections' | 'visual' | 'guide'>('sections');
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Proses file yang diunggah
  const handleFileUpload = async (uploadedFile: File | Blob, name: string) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDownloadBlob(null);
      setFile(uploadedFile);
      setFileName(name);

      const { zip, docXml, analysis: docAnalysis } = await analyzeDocx(uploadedFile, name);
      setAnalysis(docAnalysis);
      setWorkingData({ zip, docXml });
      setSelectedSectionIdx(0);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memproses file Word. Pastikan file berformat .docx.');
      setAnalysis(null);
      setWorkingData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selected = files[0];
      if (!selected.name.toLowerCase().endsWith('.docx')) {
        setErrorMsg('Format file harus .docx (Microsoft Word)');
        return;
      }
      handleFileUpload(selected, selected.name);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.toLowerCase().endsWith('.docx')) {
        setErrorMsg('Format file harus .docx (Microsoft Word)');
        return;
      }
      handleFileUpload(dropped, dropped.name);
    }
  };

  // Muat contoh skripsi uji coba
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const sampleBlob = await createSampleFaultyThesisDocx();
      await handleFileUpload(sampleBlob, 'Contoh_Skripsi_Simulasi_Bermasalah.docx');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal membuat file simulasi.');
      setIsProcessing(false);
    }
  };

  // Jalankan koreksi penomoran
  const handleApplyCorrection = async () => {
    if (!workingData || !analysis) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const detectedBabCount =
        (analysis.sections.some(s => s.type === 'bab_1') ? 1 : 0) +
        analysis.sections.filter(s => s.type === 'bab_other' && s.isChapterStart).length;

      if (!analysis.sections.some(s => s.type === 'bab_1')) {
        throw new Error(
          'Koreksi tidak dapat dilanjutkan: BAB I belum terdeteksi. ' +
          'Pastikan dokumen Anda memuat judul bab diawali "BAB I" atau "BAB 1".'
        );
      }

      const correctedBlob = await correctThesisDocx(
        workingData.zip,
        workingData.docXml,
        analysis.sections
      );

      setDownloadBlob(correctedBlob);
      setSuccessMsg('Penomoran halaman berhasil diperbaiki secara otomatis sesuai standar baku!');

      // Langsung download secara otomatis
      const cleanName = fileName.replace(/\.docx$/i, '');
      const outName = `${cleanName}_koreksi_penomoran.docx`;
      triggerDownload(correctedBlob, fileName);
      if (onCorrectionComplete) {
        onCorrectionComplete(outName);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Terjadi kesalahan saat memperbaiki dokumen: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = (blob: Blob, originalName: string) => {
    const cleanName = originalName.replace(/\.docx$/i, '');
    const outName = `${cleanName}_koreksi_penomoran.docx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFile(null);
    setFileName('');
    setAnalysis(null);
    setWorkingData(null);
    setDownloadBlob(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      {/* Top Banner / Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-inner">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Auto Koreksi Penomoran Skripsi Word
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  .docx
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Format Baku Skripsi & Karya Tulis Ilmiah PTN / PTS Indonesia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Margin & Teks Asli Terjaga
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Aturan Baku Notification Cards */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Ketentuan Penomoran Skripsi yang Diterapkan Otomatis:
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aplikasi hanya merevisi penomoran romawi/angka serta posisi header & footer, seluruh konten lainnya dijamin utuh.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                5 Aturan Wajib
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
            {/* Rule 1 (Poin 7) */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Poin 7</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Cover 1</span>
              </div>
              <div className="font-bold text-sm text-slate-900">Tanpa Nomor</div>
              <p className="text-xs text-slate-600 mt-1">
                Hanya Cover 1 saja yang tidak diberi nomor halaman sama sekali.
              </p>
            </div>

            {/* Rule 2 (Poin 7) */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Poin 7</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Cover 2 s/d BAB I</span>
              </div>
              <div className="font-bold text-sm text-indigo-950">Romawi "ii" ...</div>
              <p className="text-xs text-slate-600 mt-1">
                Cover 2 langsung diberi nomor mulai <b className="text-indigo-900">romawi "ii"</b> di Bawah Tengah sampai sebelum BAB I.
              </p>
            </div>

            {/* Rule 3 (Poin 8) */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Poin 8</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Mulai BAB I</span>
              </div>
              <div className="font-bold text-sm text-emerald-950">Mulai Angka "1"</div>
              <p className="text-xs text-slate-600 mt-1">
                BAB I wajib ada penomoran: awal di <b>Bawah Tengah (1)</b>, lanjutan di <b>Kanan Atas (2, 3...)</b>.
              </p>
            </div>

            {/* Rule 4 (Poin 9 & 10) */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Poin 9 & 10</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">BAB II s/d BAB V</span>
              </div>
              <div className="font-bold text-sm text-amber-950">Nomor Berlanjut</div>
              <p className="text-xs text-slate-600 mt-1">
                Awal BAB di Bawah Tengah, lanjutan di Kanan Atas. <b>BAB V tidak boleh reset ke 1</b>, melainkan berlanjut dari BAB IV!
              </p>
            </div>

            {/* Rule 5 (Poin 11) */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Poin 11</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Daftar Pustaka s/d Akhir</span>
              </div>
              <div className="font-bold text-sm text-blue-950">Tetap di Kanan Atas</div>
              <p className="text-xs text-slate-600 mt-1">
                Daftar Pustaka, Lampiran, sampai Riwayat Hidup seluruh halamannya <b>tetap di Kanan Atas</b>.
              </p>
            </div>
          </div>

          {/* Jaminan Khusus: Kebal Daftar Isi & Zero Content Touch */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">100% Kebal & Pintar Deteksi Daftar Isi:</span>
                Sistem secara otomatis mendeteksi baris bertitik-titik (<code className="text-emerald-800 font-mono">.......</code>), format tab leader, dan rujukan halaman di Daftar Isi/Tabel/Gambar sehingga <b>TIDAK AKAN PERNAH</b> tertukar dengan BAB asli.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-950">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Dilarang & Nol Pengubahan Isi Dokumen:</span>
                Tidak ada penghapusan enter (<code className="text-indigo-800 font-mono">&lt;w:p&gt;</code>), tidak ada penghapusan page break (<code className="text-indigo-800 font-mono">&lt;w:br&gt;</code>), dan tidak ada perubahan teks/tabel. Murni hanya mengoreksi penomoran halaman!
              </div>
            </div>
          </div>
        </section>

        {/* Upload & Action Card */}
        {!analysis ? (
          <section className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center shadow-sm transition-all hover:border-indigo-400"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".docx"
              className="hidden"
              onChange={onFileInputChange}
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Unggah Dokumen Skripsi (.docx)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tarik dan lepas file Word skripsi Anda ke sini, atau klik tombol di bawah untuk memilih file dari komputer.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Pilih File Word (.docx)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Coba dengan Contoh Skripsi (1-Klik Test)
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const sampleBlob = await createSampleFaultyThesisDocx();
                    triggerDownload(sampleBlob, 'Contoh_Skripsi_Bermasalah_SEBELUM_Koreksi.docx');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh File Simulasi (Sebelum Dikoreksi) untuk Pembanding di Word
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Kompatibel Microsoft Word 2013-2026, 365, LibreOffice
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tanpa Server Eksternal / Diproses Aman di Browser
                </span>
              </div>
            </div>
          </section>
        ) : (
          /* Document Loaded & Inspection Interface */
          <div className="space-y-6">
            {/* File Info & Action Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base max-w-md truncate" title={fileName}>
                      {fileName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                      {(analysis.fileSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {analysis.totalParagraphs} Paragraf &bull; Terdeteksi {analysis.sections.length} Bagian Skripsi &bull; {analysis.totalExistingSections} Section Break Asli
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ganti File
                </button>

                <button
                  type="button"
                  onClick={handleApplyCorrection}
                  disabled={isProcessing}
                  className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menerapkan Koreksi...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Koreksi & Unduh File Word (.docx)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success Download Card if available */}
            {downloadBlob && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      File Word Siap Diunduh!
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Penomoran halaman telah disesuaikan: Cover tanpa nomor, Romawi 'ii' di halaman awal, angka 1 dari BAB I, awalan bab di bawah tengah, dan lanjutan di kanan atas.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerDownload(downloadBlob, fileName)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Unduh Ulang File (.docx)
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 space-x-4">
              <button
                type="button"
                onClick={() => setActiveTab('sections')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'sections'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Rincian Koreksi Per Bagian ({analysis.sections.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'visual'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-4 h-4" />
                Simulasi Visual Tata Letak Halaman
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'guide'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                Cara Verifikasi di Microsoft Word
              </button>
            </div>

            {/* Tab 1: Sections Table */}
            {activeTab === 'sections' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Pemetaan Bagian Skripsi & Target Penomoran
                    </h4>
                    <p className="text-xs text-slate-500">
                      Berikut adalah struktur section break yang diterapkan pada dokumen Word Anda.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Otomatis Dikonfigurasi Sesuai Aturan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Bagian / Bab</th>
                        <th className="py-3 px-4">Format Nomor</th>
                        <th className="py-3 px-4">Mulai Dari</th>
                        <th className="py-3 px-4">Halaman Pertama (Awalan Bab)</th>
                        <th className="py-3 px-4">Halaman Lanjutan</th>
                        <th className="py-3 px-4 text-right">Status Koreksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {analysis.sections.map((sec, idx) => (
                        <tr key={sec.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span>{sec.title}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {sec.type === 'cover' ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                Tanpa Nomor
                              </span>
                            ) : sec.type === 'front_matter' ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                                Romawi Kecil (ii, iii, ...)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                Angka Arab (1, 2, 3...)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-medium">
                            {sec.type === 'cover' ? (
                              <span className="text-slate-400">-</span>
                            ) : sec.type === 'front_matter' ? (
                              <span className="text-indigo-900 font-bold font-mono">ii</span>
                            ) : sec.type === 'bab_1' ? (
                              <span className="text-emerald-900 font-bold font-mono">1</span>
                            ) : (
                              <span className="text-slate-600">Berlanjut</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {sec.type === 'cover' ? (
                              <span className="text-slate-400">Tidak ada</span>
                            ) : sec.type === 'back_matter' ? (
                              <span className="inline-flex items-center gap-1 text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Kanan Atas (Poin 11)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Bawah Tengah
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {sec.type === 'cover' ? (
                              <span className="text-slate-400">Tidak ada</span>
                            ) : sec.type === 'front_matter' ? (
                              <span className="inline-flex items-center gap-1 text-indigo-900 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Bawah Tengah
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Kanan Atas
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Siap Diterapkan
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    💡 Seluruh format margin (4-4-3-3 cm / standar dokumen), font (Times New Roman), spasi dan tabel tetap asli.
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyCorrection}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer"
                  >
                    Unduh File Hasil Revisi
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Visual Layout Simulation */}
            {activeTab === 'visual' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Pratinjau Visual Penempatan Nomor Halaman
                      </h4>
                      <p className="text-xs text-slate-500">
                        Pilih bagian di bawah ini untuk melihat bagaimana Microsoft Word memposisikan penomoran halaman pertama dan halaman lanjutannya.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {analysis.sections.map((sec, idx) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedSectionIdx(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedSectionIdx === idx
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {sec.title.split(':')[0].substring(0, 18)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Paper Simulation */}
                  {analysis.sections[selectedSectionIdx] && (() => {
                    const currentSec = analysis.sections[selectedSectionIdx];
                    const isCover = currentSec.type === 'cover';
                    const isFront = currentSec.type === 'front_matter';
                    const isBab = currentSec.type === 'bab_1' || currentSec.type === 'bab_other' || currentSec.type === 'back_matter';

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Halaman Pertama (Awalan Bab / Cover) */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center">
                          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-700 pb-2 mb-3 border-b border-slate-200">
                            <span>Halaman 1 dari {currentSec.title}</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                              {isCover ? 'Cover Sampul' : 'Awalan Bab'}
                            </span>
                          </div>

                          {/* Paper Sheet */}
                          <div className="w-64 h-88 bg-white border border-slate-300 shadow-md rounded-md p-4 relative flex flex-col justify-between select-none">
                            {/* Header area */}
                            <div className="h-6 border-b border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Header</span>
                              {currentSec.type === 'back_matter' ? (
                                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[11px] shadow-sm">
                                  Kanan Atas (Poin 11)
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Kosong</span>
                              )}
                            </div>

                            {/* Content mock */}
                            <div className="space-y-2 py-4">
                              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto"></div>
                              <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto"></div>
                              <div className="pt-4 space-y-1.5">
                                <div className="h-2 bg-slate-100 rounded w-full"></div>
                                <div className="h-2 bg-slate-100 rounded w-11/12"></div>
                                <div className="h-2 bg-slate-100 rounded w-4/5"></div>
                                <div className="h-2 bg-slate-100 rounded w-full"></div>
                              </div>
                            </div>

                            {/* Footer area */}
                            <div className="h-8 border-t border-dashed border-slate-200 flex items-center justify-center text-xs">
                              {isCover ? (
                                <span className="text-[11px] text-slate-400 italic">
                                  Tanpa Penomoran
                                </span>
                              ) : isFront ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-sm">
                                  ii (Bawah Tengah)
                                </span>
                              ) : currentSec.type === 'back_matter' ? (
                                <span className="text-slate-400 text-[10px] italic">
                                  Kosong (Nomor di Kanan Atas)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold text-xs shadow-sm">
                                  {currentSec.type === 'bab_1' ? '1' : 'X'} (Bawah Tengah)
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 text-center mt-3 max-w-xs">
                            {isCover
                              ? 'Poin 7: Halaman cover 1 tanpa penomoran sama sekali.'
                              : isFront
                              ? 'Poin 7: Mulai dari angka romawi "ii" diletakkan di posisi Bawah Tengah.'
                              : currentSec.type === 'back_matter'
                              ? 'Poin 11: Daftar Pustaka s/d Riwayat Hidup penomoran tetap di Kanan Atas.'
                              : 'Poin 8 & 9: Semua awalan BAB diletakkan di posisi Bawah Tengah.'}
                          </p>
                        </div>

                        {/* Halaman Kedua / Lanjutan */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center">
                          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-700 pb-2 mb-3 border-b border-slate-200">
                            <span>Halaman Lanjutan ({currentSec.title})</span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">
                              {isCover ? 'Tidak Ada' : 'Halaman Isi'}
                            </span>
                          </div>

                          {/* Paper Sheet */}
                          <div className="w-64 h-88 bg-white border border-slate-300 shadow-md rounded-md p-4 relative flex flex-col justify-between select-none">
                            {/* Header area */}
                            <div className="h-6 border-b border-dashed border-slate-200 flex items-center justify-between text-xs">
                              <span className="text-[10px] text-slate-400">Header</span>
                              {isCover ? (
                                <span className="text-slate-400 text-[10px] italic">Kosong</span>
                              ) : isFront ? (
                                <span className="text-slate-400 text-[10px] italic">Kosong</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[11px] shadow-sm">
                                  {currentSec.type === 'bab_1' ? '2' : 'X+1'} (Kanan Atas)
                                </span>
                              )}
                            </div>

                            {/* Content mock */}
                            <div className="space-y-1.5 py-4">
                              <div className="h-2 bg-slate-100 rounded w-full"></div>
                              <div className="h-2 bg-slate-100 rounded w-full"></div>
                              <div className="h-2 bg-slate-100 rounded w-5/6"></div>
                              <div className="h-2 bg-slate-100 rounded w-full"></div>
                              <div className="h-2 bg-slate-100 rounded w-4/5"></div>
                              <div className="h-2 bg-slate-100 rounded w-full"></div>
                              <div className="h-2 bg-slate-100 rounded w-11/12"></div>
                            </div>

                            {/* Footer area */}
                            <div className="h-8 border-t border-dashed border-slate-200 flex items-center justify-center text-xs">
                              {isCover ? (
                                <span className="text-[11px] text-slate-400 italic">Tanpa Nomor</span>
                              ) : isFront ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-sm">
                                  iii (Bawah Tengah)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">
                                  Kosong (Karena sudah di kanan atas)
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 text-center mt-3 max-w-xs">
                            {isCover
                              ? 'Cover hanya 1 halaman sampul.'
                              : isFront
                              ? 'Bagian awal romawi tetap berada di Bawah Tengah.'
                              : 'Aturan 5: Halaman selain awalan BAB nomor diletakkan di Kanan Atas.'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Tab 3: Word Verification Guide */}
            {activeTab === 'guide' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Panduan Verifikasi Penomoran di Microsoft Word
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Setelah Anda mengunduh file hasil revisi, berikut langkah mudah untuk memverifikasi penomoran di Word:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                      1
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 mb-1">
                      Buka File di Microsoft Word
                    </h5>
                    <p className="text-xs text-slate-600">
                      Buka dokumen yang baru saja diunduh. Klik ganda (double-click) pada area paling atas (Header) atau paling bawah (Footer).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                      2
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 mb-1">
                      Cek "Different First Page"
                    </h5>
                    <p className="text-xs text-slate-600">
                      Pada tab <i>Header & Footer Tools</i> di pita atas Word, Anda akan melihat centang <b>"Different First Page" (Halaman Pertama Berbeda)</b> aktif otomatis pada setiap BAB.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                      3
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 mb-1">
                      Cek Posisi Nomor
                    </h5>
                    <p className="text-xs text-slate-600">
                      - Cover: Kosong.<br />
                      - Cover 2 s/d sebelum BAB I: Romawi <b>ii, iii</b> di bawah tengah.<br />
                      - Awal BAB: Angka di <b>bawah tengah</b>.<br />
                      - Lanjutan BAB: Angka di <b>kanan atas</b>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-900 space-y-1">
                    <p className="font-semibold">
                      Jaminan Integritas File Word / XML Asli:
                    </p>
                    <p>
                      Aplikasi ini hanya menyisipkan dan merevisi node XML <code>&lt;w:sectPr&gt;</code>, <code>&lt;w:headerReference&gt;</code>, <code>&lt;w:footerReference&gt;</code>, dan <code>&lt;w:pgNumType&gt;</code>. Seluruh isi teks bab, kutipan, referensi, tabel, formula, margin, dan gaya paragraf Anda tidak disentuh sama sekali.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8 text-center text-xs text-slate-500">
        <p>
          Auto Koreksi Penomoran Skripsi Word (.docx) &bull; Standar Baku Pedoman Penulisan Skripsi Akademik Indonesia
        </p>
      </footer>
    </div>
  );
};

export default SkripsiPaginatorView;
