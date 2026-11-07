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
  BookOpen,
  ListChecks,
  Code2,
  Copy,
  Check
} from 'lucide-react';
import {
  analyzeDocx,
  correctThesisDocx,
  createSampleFaultyThesisDocx,
  createSampleNoTocThesisDocx,
  createSampleArabicThesisDocx,
  createSampleProposalDocx,
  isBabHeading,
  ThesisSection,
  DocumentAnalysis,
  DocumentNumberingProfile,
  TocProcessMode,
  TocWorkflowResult
} from '../utils/docxPaginatorFixed';

interface SkripsiPaginatorFixedViewProps {
  onCorrectionComplete?: (fileName: string) => void;
}

export const SkripsiPaginatorFixedView: React.FC<SkripsiPaginatorFixedViewProps> = ({ onCorrectionComplete }) => {
  const [file, setFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [workingData, setWorkingData] = useState<{ zip: any; docXml: Document } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<'sections' | 'toc_json' | 'visual' | 'guide'>('sections');
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number>(0);
  const [editToc, setEditToc] = useState<boolean>(true);
  const [tocMode, setTocMode] = useState<TocProcessMode>('auto_generate');
  const [numberingProfile, setNumberingProfile] = useState<DocumentNumberingProfile>('skripsi');
  const [tocResult, setTocResult] = useState<TocWorkflowResult | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectProfile = async (newProfile: DocumentNumberingProfile) => {
    setNumberingProfile(newProfile);
    if (file && fileName) {
      try {
        setIsProcessing(true);
        setErrorMsg(null);
        const { zip, docXml, analysis: docAnalysis } = await analyzeDocx(file, fileName, newProfile);
        setAnalysis(docAnalysis);
        setWorkingData({ zip, docXml });
        setTocResult(docAnalysis.tocWorkflowPreview || null);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Proses file yang diunggah
  const handleFileUpload = async (uploadedFile: File | Blob, name: string, profileOverride?: DocumentNumberingProfile) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDownloadBlob(null);
      setFile(uploadedFile);
      setFileName(name);

      let activeProfile = profileOverride || numberingProfile;
      let { zip, docXml, analysis: docAnalysis } = await analyzeDocx(uploadedFile, name, activeProfile);
      
      // Auto-deteksi dokumen Proposal Penelitian jika tidak ada BAB dan ada Judul Penelitian
      if (docAnalysis.isProposal && activeProfile !== 'proposal' && activeProfile !== 'arab-proposal') {
        activeProfile = 'proposal';
        setNumberingProfile('proposal');
        const re = await analyzeDocx(uploadedFile, name, 'proposal');
        zip = re.zip;
        docXml = re.docXml;
        docAnalysis = re.analysis;
      }

      setAnalysis(docAnalysis);
      setWorkingData({ zip, docXml });
      setTocResult(docAnalysis.tocWorkflowPreview || null);
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

  // Muat contoh skripsi uji coba (dengan Daftar Isi Manual & BAB V/Daftar Pustaka menyatu)
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const sampleBlob = await createSampleFaultyThesisDocx();
      await handleFileUpload(sampleBlob, 'Contoh_Skripsi_DaftarIsi_Manual_Bermasalah.docx');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal membuat file simulasi.');
      setIsProcessing(false);
    }
  };

  // Muat contoh skripsi tanpa Daftar Isi (uji Modul B: Create Heading & TOC Baru)
  const handleLoadSampleNoToc = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setEditToc(true);
      const sampleBlob = await createSampleNoTocThesisDocx();
      await handleFileUpload(sampleBlob, 'Contoh_Skripsi_Tanpa_DaftarIsi_ModulB.docx');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal membuat file simulasi tanpa Daftar Isi.');
      setIsProcessing(false);
    }
  };

  // Muat contoh Skripsi / Proposal Bahasa Arab (uji Penomoran Bahasa Arab Traditional Arabic 18pt & Deteksi Daftar Isi / BAB Bahasa Arab)
  const handleLoadSampleArabic = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setEditToc(true);
      setNumberingProfile('arab');
      const sampleBlob = await createSampleArabicThesisDocx();
      await handleFileUpload(sampleBlob, 'Contoh_Skripsi_Proposal_Bahasa_Arab.docx', 'arab');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal membuat file simulasi Bahasa Arab.');
      setIsProcessing(false);
    }
  };

  // Muat contoh Proposal Penelitian (uji A. Judul Penelitian s/d Daftar Pustaka dengan Sub-Judul & Sub-Sub Judul)
  const handleLoadSampleProposal = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setEditToc(true);
      setNumberingProfile('proposal');
      const sampleBlob = await createSampleProposalDocx();
      await handleFileUpload(sampleBlob, 'Contoh_Proposal_Penelitian_Tahfidz.docx', 'proposal');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal membuat file simulasi Proposal Penelitian.');
      setIsProcessing(false);
    }
  };

  // Jalankan koreksi penomoran (+ opsional koreksi/pembuatan Daftar Isi)
  const handleApplyCorrection = async () => {
    if (!workingData || !analysis || !file) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      // Re-analyze fresh copy from original uploaded file so user can toggle editToc & numberingProfile freely
      const fresh = await analyzeDocx(file, fileName, numberingProfile);

      const isProposal =
        numberingProfile === 'proposal' ||
        numberingProfile === 'arab-proposal' ||
        fresh.analysis.isProposal;

      const detectedChapterNums = [1, 2, 3, 4, 5, 6].filter(n =>
        fresh.analysis.sections.some(s =>
          s.chapterNumber === n ||
          (n === 1 && (s.type === 'bab_1' || /judul/i.test(s.title))) ||
          (s.type === 'bab_other' && s.isChapterStart && isBabHeading(s.title, n))
        )
      );

      const hasStartBody = isProposal
        ? fresh.analysis.sections.some(s => s.type === 'bab_1' || s.chapterNumber === 1 || s.paragraphIndex > 0)
        : detectedChapterNums.includes(1) ||
          fresh.analysis.sections.some(s => s.type === 'bab_1' || /judul/i.test(s.title));

      if (!hasStartBody) {
        throw new Error(
          isProposal
            ? 'Koreksi dibatalkan: Judul atau teks awal naskah belum terdeteksi pada proposal ini. Pastikan dokumen memuat teks isi proposal setelah cover.'
            : 'Koreksi dibatalkan: BAB I belum terdeteksi pada dokumen ini. Pastikan dokumen memuat judul bab (misal BAB I PENDAHULUAN atau الباب الأول) agar penomoran dapat diatur per section.'
        );
      }

      const { blob: correctedBlob, tocResult: appliedTocResult } = await correctThesisDocx(
        fresh.zip,
        fresh.docXml,
        fresh.analysis.sections,
        { editToc, tocMode, numberingProfile }
      );

      // Re-open the generated DOCX and verify the actual XML result before
      // offering it to the user. A correction that cannot be verified is rejected.
      const post = await analyzeDocx(correctedBlob, fileName, numberingProfile);
      const postMissing = isProposal
        ? []
        : detectedChapterNums.filter(n =>
            !post.analysis.sections.some(s =>
              s.chapterNumber === n ||
              (n === 1 && s.type === 'bab_1') ||
              (s.type === 'bab_other' && s.isChapterStart && isBabHeading(s.title, n))
            )
          );
      const postProblems = isProposal
        ? []
        : post.analysis.sections
            .filter(s => ['front_matter', 'bab_1', 'bab_other', 'back_matter'].includes(s.type))
            .flatMap(s => s.currentStatus.hasNumberingIssue ? [`${s.title}: ${s.currentStatus.issues.join('; ')}`] : []);

      if (postMissing.length || postProblems.length) {
        throw new Error(
          `Validasi hasil gagal. ${postMissing.length ? `BAB belum terbaca: ${postMissing.map(n => ['','I','II','III','IV','V','VI'][n]).join(', ')}. ` : ''}` +
          `${postProblems.length ? postProblems.slice(0, 4).join(' | ') : ''}`
        );
      }

      setAnalysis(post.analysis);
      if (appliedTocResult) {
        setTocResult(appliedTocResult);
      }
      setDownloadBlob(correctedBlob);
      setSuccessMsg(
        editToc
          ? `Penomoran halaman (termasuk pemisahan halaman baru BAB V & Daftar Pustaka) serta ${appliedTocResult?.action_taken === 'GENERATE_NEW_TOC' ? 'Pembuatan Daftar Isi Otomatis (Modul B)' : 'Sinkronisasi & Pencocokan Nomor Daftar Isi (Modul A)'} berhasil diterapkan!`
          : 'Penomoran halaman berhasil diperbaiki (BAB I–V & Daftar Pustaka dijamin mulai di halaman baru senza menyatu). Daftar Isi tidak diubah sesuai pilihan Anda.'
      );

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
    setEditToc(true);
    setTocResult(null);
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
              Margin & Teks Dipertahankan
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Pilihan 5 Opsi Jenis Penomoran Dokumen (Menu No. 3) */}
        <section className="bg-white rounded-2xl border border-indigo-200/90 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Pilihan Jenis Penomoran Dokumen (2 Versi Utama):
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Font penomoran halaman menggunakan <b>Times New Roman ukuran 12</b> (Versi Indonesia) atau <b>Traditional Arabic</b> (Versi Arab). Fokus hanya pada penomoran halaman &amp; daftar isi tanpa mengubah isi naskah asli.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white font-bold self-start md:self-auto">
              Aktif: {
                numberingProfile === 'skripsi' ? 'Versi Indonesia • Skripsi' :
                numberingProfile === 'tesis' ? 'Versi Indonesia • Tesis' :
                numberingProfile === 'makalah' ? 'Versi Indonesia • Makalah' :
                numberingProfile === 'proposal' ? 'Versi Indonesia • Proposal' :
                numberingProfile === 'arab-makalah' ? 'Versi Arabic • Makalah' :
                numberingProfile === 'arab-proposal' ? 'Versi Arabic • Proposal' :
                numberingProfile === 'arab-tesis' ? 'Versi Arabic • Tesis' :
                'Versi Arabic • Skripsi'
              }
            </span>
          </div>

          {/* Tab Pemilihan 2 Versi: Versi Indonesia & Versi Arabic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                if (numberingProfile.startsWith('arab')) {
                  if (numberingProfile === 'arab-makalah') handleSelectProfile('makalah');
                  else if (numberingProfile === 'arab-proposal') handleSelectProfile('proposal');
                  else if (numberingProfile === 'arab-tesis') handleSelectProfile('tesis');
                  else handleSelectProfile('skripsi');
                }
              }}
              className={`py-3 px-4 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between ${
                !numberingProfile.startsWith('arab')
                  ? 'bg-white shadow-sm border border-indigo-200 ring-2 ring-indigo-500/20'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Versi 1
                  </span>
                  <span className="font-bold text-sm text-slate-900">1. Versi Indonesia</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Makalah, Proposal, Skripsi, Tesis (Font <b>Times New Roman 12</b>, Romawi &amp; Angka Latin)
                </p>
              </div>
              {!numberingProfile.startsWith('arab') && (
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!numberingProfile.startsWith('arab')) {
                  if (numberingProfile === 'makalah') handleSelectProfile('arab-makalah');
                  else if (numberingProfile === 'proposal') handleSelectProfile('arab-proposal');
                  else if (numberingProfile === 'tesis') handleSelectProfile('arab-tesis');
                  else handleSelectProfile('arab-skripsi');
                }
              }}
              className={`py-3 px-4 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between ${
                numberingProfile.startsWith('arab')
                  ? 'bg-white shadow-sm border border-teal-200 ring-2 ring-teal-500/20'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                    Versi 2
                  </span>
                  <span className="font-bold text-sm text-slate-900">2. Versi Arabic</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Makalah, Proposal, Skripsi, Tesis (Semua penomoran pakai format Arab: <b>ب، ج... &amp; ١، ٢...</b>)
                </p>
              </div>
              {numberingProfile.startsWith('arab') && (
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
              )}
            </button>
          </div>

          {/* Sub-Opsi untuk Versi Indonesia */}
          {!numberingProfile.startsWith('arab') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Indonesia 1: Makalah */}
              <button
                type="button"
                onClick={() => handleSelectProfile('makalah')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'makalah'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Makalah
                    </span>
                    {numberingProfile === 'makalah' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Makalah Indonesia</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Cover tanpa nomor. Setelah cover s/d sebelum BAB I (<b>Romawi ii, iii...</b>), dari BAB I s/d Daftar Pustaka (<b>Angka 1, 2...</b>) <b>ditaruh di Bawah semua</b>.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-emerald-700">
                    Posisi: Bawah Tengah Semua • Font TNR 12
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ Daftar Isi Otomatis</span>
                  </div>
                </div>
              </button>

              {/* Indonesia 2: Proposal */}
              <button
                type="button"
                onClick={() => handleSelectProfile('proposal')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'proposal'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Proposal
                    </span>
                    {numberingProfile === 'proposal' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Proposal Indonesia</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Cover tanpa nomor. Setelah cover s/d sebelum BAB I (<b>Romawi ii, iii...</b>), dari BAB I s/d Daftar Pustaka (<b>Angka 1, 2...</b>) <b>ditaruh di Bawah semua</b>.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-amber-700">
                    Posisi: Bawah Tengah Semua • Font TNR 12
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ Daftar Isi Otomatis</span>
                  </div>
                </div>
              </button>

              {/* Indonesia 3: Skripsi */}
              <button
                type="button"
                onClick={() => handleSelectProfile('skripsi')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'skripsi'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      Skripsi
                    </span>
                    {numberingProfile === 'skripsi' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Skripsi Indonesia</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Cover tanpa nomor. Pengantar: <b>Romawi (ii...)</b> Bawah Tengah. <b>BAB I–V</b>: awal BAB di Bawah Tengah, lanjutan &amp; Daftar Pustaka di Kanan Atas.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-indigo-700">
                    Deteksi: BAB I s/d BAB V • Font TNR 12
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ Daftar Isi Otomatis</span>
                  </div>
                </div>
              </button>

              {/* Indonesia 4: Tesis */}
              <button
                type="button"
                onClick={() => handleSelectProfile('tesis')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'tesis'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Tesis
                    </span>
                    {numberingProfile === 'tesis' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Tesis Indonesia</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Format sama seperti Skripsi (Romawi <b>ii..</b>, Angka <b>1..</b> awal BAB bawah, lanjutan kanan atas), dengan deteksi bab sampai <b>BAB VI</b>.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-purple-700">
                    Deteksi: BAB I s/d BAB VI • Font TNR 12
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ Daftar Isi Otomatis</span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Sub-Opsi untuk Versi Arabic */}
          {numberingProfile.startsWith('arab') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Arabic 1: Makalah */}
              <button
                type="button"
                onClick={() => handleSelectProfile('arab-makalah')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'arab-makalah'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      مقالة (Makalah)
                    </span>
                    {numberingProfile === 'arab-makalah' && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Makalah Arab</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Cover tanpa nomor. Setelah cover mulai huruf Arab (<b>ب، ج، ت، ث...</b>), dari BAB I s/d akhir <b>Angka Hindi (١، ٢...)</b> di <b>Bawah Tengah semua</b>.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-teal-700">
                    Posisi: Bawah Tengah Semua • Huruf Arab &amp; Hindi
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ فهرس المحتويات Otomatis</span>
                  </div>
                </div>
              </button>

              {/* Arabic 2: Proposal */}
              <button
                type="button"
                onClick={() => handleSelectProfile('arab-proposal')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'arab-proposal'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      خطة بحث (Proposal)
                    </span>
                    {numberingProfile === 'arab-proposal' && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Proposal Arab</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Cover tanpa nomor. Setelah cover mulai huruf Arab (<b>ب، ج، ت...</b>), dari BAB I s/d akhir <b>Angka Hindi (١، ٢...)</b> di <b>Bawah Tengah semua</b>.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-teal-700">
                    Posisi: Bawah Tengah Semua • Huruf Arab &amp; Hindi
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ فهرس المحتويات Otomatis</span>
                  </div>
                </div>
              </button>

              {/* Arabic 3: Skripsi */}
              <button
                type="button"
                onClick={() => handleSelectProfile('arab-skripsi')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'arab-skripsi' || numberingProfile === 'arab'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      بحث جامعي (Skripsi)
                    </span>
                    {(numberingProfile === 'arab-skripsi' || numberingProfile === 'arab') && (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Skripsi Arab</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Cover tanpa nomor. Pengantar: <b>ب، ج، ت...</b> di Bawah. Dari BAB I (<b>الباب الأول</b>) s/d BAB V (<b>الخامس</b>) awal bab di Bawah (<b>١</b>), lanjutan di Atas (<b>٢، ٣...</b>).
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-teal-700">
                    Deteksi: الباب الأول–الخامس • Hindi &amp; Abjad
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ فهرس المحتويات Otomatis</span>
                  </div>
                </div>
              </button>

              {/* Arabic 4: Tesis */}
              <button
                type="button"
                onClick={() => handleSelectProfile('arab-tesis')}
                className={`text-left rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  numberingProfile === 'arab-tesis'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      رسالة الماجستير (Tesis)
                    </span>
                    {numberingProfile === 'arab-tesis' && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                  </div>
                  <div className="font-bold text-sm text-slate-900">Tesis Arab</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Aturan penomoran Arab (huruf <b>ب، ج...</b> &amp; angka Hindi <b>١، ٢...</b>), dengan deteksi penomoran bab sampai <b>الباب السادس (BAB VI)</b>.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1">
                  <div className="text-[10px] font-semibold text-purple-700">
                    Deteksi: s/d الباب السادس • Hindi &amp; Abjad
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>+ فهرس المحتويات Otomatis</span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Toggle Daftar Isi Otomatis untuk Semua Model (Skripsi, Tesis, Makalah, Proposal, Bahasa Arab) */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <ListChecks className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Fitur Daftar Isi Otomatis (Tersedia untuk Semua Model: Skripsi, Tesis, Makalah, Proposal &amp; Bahasa Arab)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {editToc ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Mendeteksi otomatis kata kunci <b>DAFTAR ISI</b> maupun Bahasa Arab (<b>فهرس المحتويات / قائمة المحتويات / الفهرس</b>) serta BAB Bahasa Indonesia &amp; Bahasa Arab (<b>الباب الأول، الفصل الأول، المقدمة، المراجع</b>). Khusus Bahasa Arab otomatis diformat dengan font <b>Traditional Arabic ukuran 18 pt</b>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditToc(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  editToc
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                + Daftar Isi Otomatis
              </button>
              <button
                type="button"
                onClick={() => setEditToc(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  !editToc
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                Penomoran Saja
              </button>
            </div>
          </div>
        </section>

        {/* Aturan Baku Notification Cards */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Ringkasan Aturan Penomoran ({
                  numberingProfile === 'skripsi' ? 'Skripsi — BAB I s/d BAB V' :
                  numberingProfile === 'tesis' ? 'Tesis — Deteksi s/d BAB VI' :
                  numberingProfile === 'makalah' ? 'Makalah — Semua Nomor di Bawah' :
                  numberingProfile === 'proposal' ? 'Proposal — Semua Nomor di Bawah' :
                  'Bahasa Arab — ب، ج، ت، ث & Angka Hindi ١، ٢، ٣'
                }):
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aplikasi hanya memperbaiki penomoran halaman dan section yang diperlukan untuk mengatur posisi nomor. Margin, teks, tabel, gambar, style, dan page break existing dipertahankan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                Otomatis Sesuai Opsi Pilihan
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
            {/* Rule 1 */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Bagian 1</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Cover</span>
              </div>
              <div className="font-bold text-sm text-slate-900">Tanpa Nomor</div>
              <p className="text-xs text-slate-600 mt-1">
                Halaman Cover tidak diberi nomor halaman sama sekali. Penomoran dimulai dari halaman setelah Cover.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Bagian 2</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Setelah Cover s/d BAB I</span>
              </div>
              <div className="font-bold text-sm text-indigo-950">
                {numberingProfile.startsWith('arab') ? 'Huruf Arab "ب، ج، ت، ث..."' : 'Romawi "ii, iii..."'}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {numberingProfile.startsWith('arab') ? (
                  <>Setelah cover langsung diberi nomor mulai huruf <b className="text-indigo-900">ب، ج، ت، ث</b> dan seterusnya di Bawah Tengah sampai sebelum BAB I.</>
                ) : (
                  <>Setelah cover langsung diberi nomor mulai <b className="text-indigo-900">romawi "ii"</b> di Bawah Tengah sampai sebelum BAB I.</>
                )}
              </p>
            </div>

            {/* Rule 3 */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Bagian 3</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Mulai BAB I</span>
              </div>
              <div className="font-bold text-sm text-emerald-950">
                {numberingProfile.startsWith('arab') ? 'Mulai Angka Hindi "١"' : 'Mulai Angka "1"'}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {numberingProfile === 'makalah' || numberingProfile === 'proposal' || numberingProfile === 'arab-makalah' || numberingProfile === 'arab-proposal' ? (
                  <>Mulai BAB I menggunakan {numberingProfile.startsWith('arab') ? <b>Angka Hindi (١، ٢...)</b> : <b>Angka (1, 2, 3...)</b>} dan seluruh nomor halaman ditaruh di <b>Bawah Tengah semua</b>.</>
                ) : numberingProfile.startsWith('arab') ? (
                  <>Mulai BAB I menggunakan <b>Angka Hindi (١، ٢، ٣...)</b>: awal BAB di <b>Bawah Tengah (١)</b>, lanjutan di <b>Atas (٢، ٣...)</b>.</>
                ) : (
                  <>BAB I wajib ada penomoran: awal di <b>Bawah Tengah (1)</b>, lanjutan di <b>Kanan Atas (2, 3...)</b>.</>
                )}
              </p>
            </div>

            {/* Rule 4 */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Bagian 4</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {numberingProfile === 'tesis' || numberingProfile === 'arab-tesis' ? 'BAB II s/d BAB VI' : 'BAB II s/d BAB Akhir'}
                </span>
              </div>
              <div className="font-bold text-sm text-amber-950">Nomor Berlanjut</div>
              <p className="text-xs text-slate-600 mt-1">
                {numberingProfile === 'makalah' || numberingProfile === 'proposal' || numberingProfile === 'arab-makalah' || numberingProfile === 'arab-proposal' ? (
                  <>Seluruh BAB berikutnya berlanjut angkanya dan <b>tetap ditaruh di Bawah Tengah semua</b> tanpa reset.</>
                ) : numberingProfile === 'tesis' || numberingProfile === 'arab-tesis' ? (
                  <>Deteksi otomatis sampai <b>BAB VI</b>. Awal BAB di Bawah Tengah, lanjutan di Kanan Atas, nomor berlanjut tanpa reset.</>
                ) : numberingProfile.startsWith('arab') ? (
                  <>Seluruh BAB berikutnya menggunakan <b>Angka Hindi (١، ٢، ٣...)</b> berlanjut tanpa reset ke ١.</>
                ) : (
                  <>Awal BAB di Bawah Tengah, lanjutan di Kanan Atas. <b>BAB V tidak boleh reset ke 1</b>, melainkan berlanjut dari BAB IV!</>
                )}
              </p>
            </div>

            {/* Rule 5 */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Bagian 5</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Daftar Pustaka s/d Akhir</span>
              </div>
              <div className="font-bold text-sm text-blue-950">
                {numberingProfile === 'makalah' || numberingProfile === 'proposal' || numberingProfile === 'arab-makalah' || numberingProfile === 'arab-proposal'
                  ? 'Tetap di Bawah Tengah'
                  : numberingProfile.startsWith('arab')
                  ? 'Angka Hindi Berlanjut'
                  : 'Tetap di Kanan Atas'}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {numberingProfile === 'makalah' || numberingProfile === 'proposal' || numberingProfile === 'arab-makalah' || numberingProfile === 'arab-proposal' ? (
                  <>Daftar Pustaka sampai halaman terakhir menggunakan <b>Angka berlanjut di Bawah Tengah</b>.</>
                ) : numberingProfile.startsWith('arab') ? (
                  <>Daftar Pustaka / المراجع sampai akhir dokumen melanjutkan <b>Angka Hindi</b> di bagian Atas.</>
                ) : (
                  <>Daftar Pustaka, Lampiran, sampai Riwayat Hidup seluruh halamannya <b>tetap di Kanan Atas</b>.</>
                )}
              </p>
            </div>
          </div>

          {/* Jaminan Khusus: Kebal Daftar Isi & Zero Content Touch */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">100% Kebal & Pintar Deteksi Daftar Isi:</span>
                Sistem secara otomatis mendeteksi baris bertitik-titik (<code className="text-emerald-800 font-mono">.......</code>), format tab leader, dan rujukan halaman di Daftar Isi/Tabel/Gambar sehingga <b>tidak dipakai sebagai BAB asli</b> dengan BAB asli.
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
                  Contoh 1: Ada Daftar Isi Manual (Modul A)
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleNoToc}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-200"
                >
                  <ListChecks className="w-4 h-4 text-indigo-600" />
                  Contoh 2: Tanpa Daftar Isi (Modul B)
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleArabic}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-teal-200"
                >
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  Contoh 3: Skripsi/Proposal Arab
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleProposal}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-200"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Contoh 4: Proposal Penelitian (A. Judul s/d Daftar Pustaka)
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
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base max-w-md truncate" title={fileName}>
                        {fileName}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        {(analysis.fileSizeBytes / 1024).toFixed(1)} KB
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        analysis.toc.tocKind === 'manual_toc'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : analysis.toc.tocKind === 'openxml_sdt'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {analysis.toc.tocKind === 'manual_toc'
                          ? 'Terdeteksi: Daftar Isi Manual (has_toc = true)'
                          : analysis.toc.tocKind === 'openxml_sdt'
                          ? 'Terdeteksi: Daftar Isi Otomatis OpenXML (has_toc = true)'
                          : 'Terdeteksi: Belum Ada Daftar Isi (has_toc = false)'}
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
                        {editToc
                          ? 'Koreksi Penomoran + Daftar Isi & Unduh (.docx)'
                          : 'Koreksi Penomoran Saja & Unduh (.docx)'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pilihan Edit Daftar Isi atau Tidak (Sebelum Dikoreksi) */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-indigo-600" />
                      Pilihan Fitur Sebelum Koreksi: Apakah Ingin Sekalian Edit / Buat Daftar Isi?
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pilih apakah Anda hanya ingin memperbaiki penomoran halaman & pisah halaman baru BAB I–V / Daftar Pustaka, atau sekalian memproses Daftar Isi (TOC).
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 shrink-0">
                    {analysis.toc.exists ? 'Mode Tersedia: MODUL A (Auto-Check & Revisi)' : 'Mode Tersedia: MODUL B (Create Heading & TOC)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option 1: No TOC Edit */}
                  <button
                    type="button"
                    onClick={() => setEditToc(false)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      !editToc
                        ? 'border-indigo-600 bg-white shadow-sm'
                        : 'border-slate-200 bg-white/60 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                      !editToc ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {!editToc && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Tidak Edit Daftar Isi (Fokus Penomoran Halaman Saja)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Hanya memperbaiki nomor halaman (Cover tanpa nomor, Romawi ii dst., BAB I–V awal Bawah Tengah & lanjutan Kanan Atas, Daftar Pustaka Kanan Atas) serta memastikan <b>BAB V & Daftar Pustaka berada di halaman baru</b> (tidak menyatu dengan akhir bab sebelumnya).
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Yes, Edit/Create TOC */}
                  <button
                    type="button"
                    onClick={() => setEditToc(true)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      editToc
                        ? 'border-indigo-600 bg-white shadow-sm'
                        : 'border-slate-200 bg-white/60 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                      editToc ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {editToc && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>Ya, Sekalian Proses Daftar Isi (TOC)</span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px]">
                          Full Add Text BAB &amp; Sub-Bab
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Mencari halaman dengan kata kunci <b>DAFTAR ISI</b> lalu membuat isi Daftar Isi Otomatis langsung di bawah kata kunci <b>DAFTAR ISI</b>, lengkap dengan <b>Add Text Level 1 (BAB), Level 2 (Sub-Bab), dan Level 3 (Sub-Sub-Bab)</b>.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Sub-Pilihan Mode Daftar Isi saat Edit TOC Aktif */}
                {editToc && (
                  <div className="bg-white rounded-xl border border-indigo-200 p-3.5 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800">
                      Pilih Mode Pemrosesan Daftar Isi:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTocMode('auto_generate')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          tocMode === 'auto_generate'
                            ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            1. Buat Daftar Isi Otomatis di Bawah Kata Kunci &ldquo;DAFTAR ISI&rdquo; (Full Add Text)
                          </span>
                          {tocMode === 'auto_generate' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          Sistem mencari letak kata kunci <b>DAFTAR ISI</b> pada dokumen Anda, menerapkan <b>Add Text (Heading 1–3 &amp; Outline Level)</b> secara sempurna pada seluruh <b>BAB, Sub-Bab (1.1 / A.), dan Sub-Sub-Bab (1.1.1 / 1.)</b>, lalu membuat isi Daftar Isi Otomatis langsung di bawah kata kunci <b>DAFTAR ISI</b>.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTocMode('manual_sync')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          tocMode === 'manual_sync'
                            ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            2. Pertahankan Daftar Isi Manual (Hanya Cocokkan Nomor Halaman)
                          </span>
                          {tocMode === 'manual_sync' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          Jika skripsi sudah memiliki Daftar Isi manual dan tidak ingin diubah ke tabel otomatis, sistem hanya mencocokkan nomor halaman serta urutan sub-bab yang belum sesuai.
                        </p>
                      </button>
                    </div>

                    {tocResult?.tagged_headings_count && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          ✓ Add Text Level 1 (BAB / Judul Utama): {tocResult.tagged_headings_count.level1} item
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                          ✓ Add Text Level 2 (Sub-Bab): {tocResult.tagged_headings_count.level2} item
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                          ✓ Add Text Level 3 (Sub-Sub-Bab): {tocResult.tagged_headings_count.level3} item
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview of TOC workflow logs */}
                {tocResult && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-indigo-600" />
                        Hasil Analisis Struktur TOC ({tocResult.action_taken === 'CHECK_AND_REVISE' ? 'MODUL A: CHECK_AND_REVISE' : 'MODUL B: GENERATE_NEW_TOC'}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('toc_json')}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                      >
                        Lihat Format JSON Lengkap &rarr;
                      </button>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5 max-h-24 overflow-y-auto">
                      {tocResult.revision_logs.map((log, i) => (
                        <li key={i}>{log}</li>
                      ))}
                    </ul>

                    {/* Visual Preview of Daftar Isi Structure & Pages */}
                    {tocResult.toc_preview_items && tocResult.toc_preview_items.length > 0 && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-[11px]">
                        <div className="font-bold text-slate-800 text-xs pb-1 border-b border-slate-200 font-sans flex items-center justify-between">
                          <span>Tinjauan Daftar Isi (Judul Lengkap &amp; Nomor Halaman Akurat):</span>
                          <span className="text-[10px] text-emerald-700 font-normal bg-emerald-100 px-2 py-0.5 rounded">
                            ✓ Tab titik-titik rapi 13.5 cm
                          </span>
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                          {tocResult.toc_preview_items.map((it, idx) => (
                            <div
                              key={idx}
                              className={`flex items-baseline justify-between gap-2 ${
                                it.level === 1 ? 'font-bold text-slate-900 pt-1' : it.level === 2 ? 'pl-4 text-slate-800 font-medium' : 'pl-8 text-slate-600'
                              }`}
                            >
                              <span className="truncate">{it.title}</span>
                              <span className="border-b border-dotted border-slate-400 flex-1 mx-1.5 self-center min-w-8"></span>
                              <span className="font-bold tabular-nums shrink-0">{it.page}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                      Penomoran halaman telah disesuaikan tanpa menyentuh isi skripsi, Daftar Isi, page break, maupun margin asli mahasiswa.
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
            <div className="flex flex-wrap border-b border-slate-200 gap-4">
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
                onClick={() => setActiveTab('toc_json')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'toc_json'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Analisis & Output JSON Daftar Isi (TOC)
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

            {/* Tab TOC JSON Output */}
            {activeTab === 'toc_json' && tocResult && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      Format Luaran (Output Format) JSON Terstruktur — Workflow Daftar Isi (TOC)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hasil pemrosesan struktur XML OpenXML (.docx) sesuai alur logika <b>{tocResult.has_toc_detected ? 'MODUL A (AUTOCECK & REVISI)' : 'MODUL B (CREATE HEADING & TOC)'}</b>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const jsonStr = JSON.stringify(
                        {
                          status: tocResult.status,
                          has_toc_detected: tocResult.has_toc_detected,
                          action_taken: tocResult.action_taken,
                          revision_logs: tocResult.revision_logs,
                          updated_xml_data: tocResult.updated_xml_data,
                          generated_toc_xml: tocResult.generated_toc_xml
                        },
                        null,
                        2
                      );
                      navigator.clipboard.writeText(jsonStr);
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedJson ? 'JSON Tersalin!' : 'Salin Output JSON Lengkap'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">has_toc_detected</span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {String(tocResult.has_toc_detected)} ({tocResult.toc_kind})
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">action_taken</span>
                    <span className="font-mono font-bold text-sm text-indigo-700">
                      {tocResult.action_taken}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Total Log Revisi</span>
                    <span className="font-mono font-bold text-sm text-emerald-700">
                      {tocResult.revision_logs.length} poin
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Pratinjau JSON Terstruktur:
                  </div>
                  <pre className="bg-slate-950 text-emerald-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
                    {JSON.stringify(
                      {
                        status: tocResult.status,
                        has_toc_detected: tocResult.has_toc_detected,
                        action_taken: tocResult.action_taken,
                        revision_logs: tocResult.revision_logs,
                        updated_xml_data:
                          tocResult.updated_xml_data.length > 600
                            ? `${tocResult.updated_xml_data.slice(0, 600)}... [total ${tocResult.updated_xml_data.length} chars]`
                            : tocResult.updated_xml_data,
                        generated_toc_xml: tocResult.generated_toc_xml
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

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
                            {sec.expectedNumbering.format === 'none' ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                Tanpa Nomor
                              </span>
                            ) : sec.expectedNumbering.format === 'arabicAlpha' ? (
                              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                                Huruf Arab (ب، ج، ت، ث...)
                              </span>
                            ) : sec.expectedNumbering.format === 'hindi' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                                Angka Hindi (١، ٢، ٣...)
                              </span>
                            ) : sec.expectedNumbering.format === 'lowerRoman' ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                                Romawi Kecil (ii, iii, ...)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                Angka (1, 2, 3...)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-medium">
                            {sec.expectedNumbering.format === 'none' ? (
                              <span className="text-slate-400">-</span>
                            ) : sec.type === 'front_matter' ? (
                              <span className="text-indigo-900 font-bold font-mono">
                                {sec.expectedNumbering.format === 'arabicAlpha' ? 'ب' : 'ii'}
                              </span>
                            ) : sec.type === 'bab_1' ? (
                              <span className="text-emerald-900 font-bold font-mono">
                                {sec.expectedNumbering.format === 'hindi' ? '١' : '1'}
                              </span>
                            ) : (
                              <span className="text-slate-600">Berlanjut</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {sec.expectedNumbering.firstPagePos === 'none' ? (
                              <span className="text-slate-400">Tidak ada</span>
                            ) : sec.expectedNumbering.firstPagePos === 'top_right' ? (
                              <span className="inline-flex items-center gap-1 text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Kanan Atas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Bawah Tengah
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {sec.expectedNumbering.defaultPagePos === 'none' ? (
                              <span className="text-slate-400">Tidak ada</span>
                            ) : sec.expectedNumbering.defaultPagePos === 'bottom_center' ? (
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
                    const isCover = currentSec.type === 'cover' || currentSec.expectedNumbering.format === 'none';
                    const isFront = currentSec.type === 'front_matter';
                    const fmt = currentSec.expectedNumbering.format;
                    const firstPos = currentSec.expectedNumbering.firstPagePos;
                    const defaultPos = currentSec.expectedNumbering.defaultPagePos;
                    const firstSampleNum = isFront
                      ? fmt === 'arabicAlpha' ? 'ب' : 'ii'
                      : fmt === 'hindi'
                      ? currentSec.type === 'bab_1' ? '١' : '٥'
                      : currentSec.type === 'bab_1' ? '1' : 'X';
                    const nextSampleNum = isFront
                      ? fmt === 'arabicAlpha' ? 'ت' : 'iii'
                      : fmt === 'hindi'
                      ? currentSec.type === 'bab_1' ? '٢' : '٦'
                      : currentSec.type === 'bab_1' ? '2' : 'X+1';

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Halaman Pertama (Awalan Bab / Cover) */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center">
                          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-700 pb-2 mb-3 border-b border-slate-200">
                            <span>Halaman 1 dari {currentSec.title}</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                              {isCover ? 'Cover Sampul' : 'Awalan Bagian / Bab'}
                            </span>
                          </div>

                          {/* Paper Sheet */}
                          <div className="w-64 h-88 bg-white border border-slate-300 shadow-md rounded-md p-4 relative flex flex-col justify-between select-none">
                            {/* Header area */}
                            <div className="h-6 border-b border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Header</span>
                              {!isCover && firstPos === 'top_right' ? (
                                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[11px] shadow-sm">
                                  {firstSampleNum} (Kanan Atas)
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
                              ) : firstPos === 'bottom_center' ? (
                                <span className={`px-2.5 py-0.5 rounded-full text-white font-mono font-bold text-xs shadow-sm ${
                                  isFront ? 'bg-indigo-600' : 'bg-amber-500'
                                }`}>
                                  {firstSampleNum} (Bawah Tengah)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">
                                  Kosong (Nomor di Kanan Atas)
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 text-center mt-3 max-w-xs">
                            {isCover
                              ? 'Halaman cover tanpa penomoran sama sekali.'
                              : firstPos === 'bottom_center'
                              ? `Halaman pertama ${currentSec.title} diletakkan di Bawah Tengah (${firstSampleNum}).`
                              : `Halaman pertama ${currentSec.title} diletakkan di Kanan Atas (${firstSampleNum}).`}
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
                              {!isCover && defaultPos === 'top_right' ? (
                                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[11px] shadow-sm">
                                  {nextSampleNum} (Kanan Atas)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">Kosong</span>
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
                              ) : defaultPos === 'bottom_center' ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-sm">
                                  {nextSampleNum} (Bawah Tengah)
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
                              ? 'Cover hanya halaman sampul tanpa nomor.'
                              : defaultPos === 'bottom_center'
                              ? `Halaman lanjutan tetap berada di Bawah Tengah (${nextSampleNum}).`
                              : `Halaman lanjutan berada di Kanan Atas (${nextSampleNum}).`}
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
                      Mode default hanya mengubah struktur penomoran yang diperlukan serta header/footer nomor halaman. Isi teks bab, kutipan, referensi, tabel, formula, margin halaman, dan page break existing tidak disentuh. Daftar Isi tetap apa adanya kecuali opsi Edit Daftar Isi diaktifkan.
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

export default SkripsiPaginatorFixedView;
