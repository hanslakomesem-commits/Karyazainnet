import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Eye,
  Info,
  Check,
  Zap,
  Wand2,
  Layers,
  Bookmark,
  Quote,
  ArrowLeft,
} from 'lucide-react';
import { readDocx, buildArticleDocx, sourceFootnotes, ParsedDoc } from '../lib/docx-engine';
import {
  analyzeThesis,
  generatePlan,
  diagnostics,
  extractAbstractSource,
  helpers,
  ArticlePlan,
  PlanItem,
} from '../lib/article-ai';
import {
  tidySectionWithGemini,
} from '../lib/gemini-service';

function academicCase(s: string) {
  let t = (s || '').replace(/^(?:PROGRAM\s+STUDI|PROGRAM\s+STUDY|PRODI|JURUSAN)\s*[:.]?\s*/i, '').trim();
  if (/^UIN\s+MADURA$/i.test(t)) return 'Universitas Islam Negeri Madura';
  if (/^IAIN\s+MADURA$/i.test(t)) return 'Institut Agama Islam Negeri Madura';
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const caps = letters.replace(/[^A-ZÀ-Ý]/g, '').length;
  if (letters && caps / letters.length > 0.7) {
    t = t.toLowerCase().replace(/(^|[\s.'’/-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  }
  return t;
}

function shortAuthor(authorVal: string, fallback = 'Mahasiswa') {
  const raw = (authorVal || fallback).trim();
  return (raw.split(/\s+/)[0] || fallback).replace(/[^\p{L}\p{N}-]+/gu, '') || fallback;
}

function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export interface ArtikelGeminiViewProps {
  onBackToHome?: () => void;
  onExportComplete?: (fileName: string) => void;
  isStandalone?: boolean;
}

export function ArtikelGeminiView({ onBackToHome, onExportComplete, isStandalone }: ArtikelGeminiViewProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<ParsedDoc | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [plan, setPlan] = useState<ArticlePlan | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  // Form states (Hanya Nama, Prodi, Universitas sesuai revisi)
  const [mode, setMode] = useState<string>('contoh');
  const [author, setAuthor] = useState<string>('');
  const [prodi, setProdi] = useState<string>('');
  const [univ, setUniv] = useState<string>('');
  const [useEnglish, setUseEnglish] = useState<boolean>(false);
  const [autoTidyWithGemini, setAutoTidyWithGemini] = useState<boolean>(false);

  // Mapping state
  const [mapping, setMapping] = useState<{
    intro: string;
    method: string;
    discussion: string;
    conclusion: string;
  }>({
    intro: 'auto',
    method: 'auto',
    discussion: 'auto',
    conclusion: 'auto',
  });

  // English abstract state
  const [englishAbstract, setEnglishAbstract] = useState<string>('');
  const [englishKeywords, setEnglishKeywords] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isTidying, setIsTidying] = useState<boolean>(false);
  const [isTidyingAll, setIsTidyingAll] = useState<boolean>(false);
  const [tidyAllProgress, setTidyAllProgress] = useState<{ current: number; total: number; title: string }>({
    current: 0,
    total: 0,
    title: '',
  });
  const [tidiedSections, setTidiedSections] = useState<Record<string, boolean>>({});

  // UI status and progress
  const [progress, setProgress] = useState<number>(0);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'warn' | 'info' | '' }>({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState<'review' | 'preview' | 'info'>('preview');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper for text item
  const itemText = (d: ParsedDoc, x: PlanItem) => {
    if (x.customText) return x.customText;
    if (x.virtual) return x.text || '';
    if (x.index != null && d.items[x.index]) return d.items[x.index].text;
    return '';
  };

  // Helper to extract footnote IDs for an item
  const itemFootnoteIds = (d: ParsedDoc, x: PlanItem): string[] => {
    if (x.footnoteIds && x.footnoteIds.length > 0) return x.footnoteIds;
    if (x.index != null && d.items[x.index]?.footnoteIds) return d.items[x.index].footnoteIds;
    return [];
  };

  // Ordered list of all unique footnotes used in the article
  const usedFootnotes = useMemo(() => {
    if (!doc || !plan) return [];
    const list: { id: string; text: string; num: number }[] = [];
    const seen = new Set<string>();
    let counter = 1;

    for (const sec of plan.sections) {
      if (sec.id === 'biblio') continue;
      for (const item of sec.items) {
        const fnIds = itemFootnoteIds(doc, item);
        for (const id of fnIds) {
          const k = String(id);
          if (!seen.has(k)) {
            seen.add(k);
            const fnText = doc.footnotes.get(k) || '';
            list.push({ id: k, text: fnText, num: counter++ });
          }
        }
      }
    }
    return list;
  }, [doc, plan]);

  // Footnote ID to sequential number map (1, 2, 3...)
  const footnoteNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    usedFootnotes.forEach(f => map.set(f.id, f.num));
    return map;
  }, [usedFootnotes]);

  // Check paragraph match between ID and EN
  const paragraphMatchStatus = useMemo(() => {
    if (!doc || !plan || !useEnglish) return { match: true, idCount: 0, enCount: 0 };
    const src = extractAbstractSource(doc, plan);
    const idCount = src.paragraphs.length;
    const enParagraphs = englishAbstract
      .split(/\n\s*\n/)
      .map(x => x.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const enCount = enParagraphs.length;
    return {
      match: idCount === 0 || enCount === idCount,
      idCount,
      enCount,
    };
  }, [doc, plan, useEnglish, englishAbstract]);

  // Handle file select
  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.docx')) {
      setMsg({ text: 'Mohon pilih file Word berekstensi .DOCX.', type: 'warn' });
      return;
    }
    setFile(f);
    setDoc(null);
    setAnalysis(null);
    setPlan(null);
    setBlob(null);
    setEnglishAbstract('');
    setEnglishKeywords('');
    setTidiedSections({});
    setMsg({ text: `File "${f.name}" siap dianalisis dengan Gemini 3.1 Flash Lite.`, type: 'ok' });
  };

  // Rebuild the Word DOCX blob whenever data changes
  const updateBlob = async (
    currentDoc: ParsedDoc,
    currentAnalysis: any,
    currentPlan: ArticlePlan
  ) => {
    try {
      const newBlob = await buildArticleDocx(
        currentDoc,
        currentAnalysis,
        currentPlan,
        {
          author: author || currentAnalysis.meta?.author,
          prodi: academicCase(prodi || currentAnalysis.meta?.prodi),
          univ: academicCase(univ || currentAnalysis.meta?.univ),
        }
      );
      setBlob(newBlob);
      return newBlob;
    } catch (e: any) {
      console.error('Rebuild DOCX error:', e);
      return null;
    }
  };

  // Main pipeline: Read DOCX -> Universal Detector -> Footnote Preservation -> Auto Download
  const runAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setProgress(20);
    setMsg({ text: 'Membaca seluruh struktur XML DOCX skripsi & memetakan footnote...', type: 'info' });

    try {
      const parsed = await readDocx(file);
      setDoc(parsed);
      setProgress(45);
      setMsg({ text: 'Menganalisis bab, footnote, style Word, dan relevansi akademik...', type: 'info' });

      const evaluated = analyzeThesis(parsed);
      setAnalysis(evaluated);

      // Auto fill metadata: Hanya Nama, Prodi, Universitas
      if (!author) setAuthor(evaluated.meta.author || '');
      if (!prodi) setProdi(academicCase(evaluated.meta.prodi || ''));
      if (!univ) setUniv(academicCase(evaluated.meta.univ || ''));

      setProgress(70);
      setMsg({ text: 'Menyusun draft artikel ilmiah dengan penomoran rapi dan footnote asli skripsi...', type: 'info' });

      const currentPlan = generatePlan(parsed, evaluated, { mode, mapping });
      setPlan(currentPlan);

      setProgress(90);
      setMsg({ text: 'Membuat dokumen Word .DOCX lengkap dengan catatan kaki (footnote)...', type: 'info' });

      const finalBlob = await updateBlob(parsed, evaluated, currentPlan);

      setProgress(100);
      const readyAuthor = shortAuthor(author || evaluated.meta.author);
      const downloadName = `Artikel_${readyAuthor}.docx`;

      setMsg({
        text: `Draft artikel selesai! Footnote skripsi tersinkronisasi 100%. File <b>${downloadName}</b> otomatis didownload. Mengalihkan kembali ke menu Web utama...`,
        type: 'ok',
      });

      // Auto download as requested
      if (finalBlob) {
        onExportComplete?.(downloadName);
        setTimeout(() => saveBlob(finalBlob, downloadName), 300);
      }
    } catch (err: any) {
      console.error(err);
      setProgress(0);
      setMsg({ text: 'Gagal memproses dokumen: ' + (err.message || String(err)), type: 'warn' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-generate plan when mapping or mode changes
  const applyNewPlan = async (customMapping = mapping) => {
    if (!doc || !analysis) return;
    const newPlan = generatePlan(doc, analysis, { mode, mapping: customMapping });
    setPlan(newPlan);
    setMsg({ text: 'Pemetaan baru diterapkan. Silakan periksa review draf.', type: 'ok' });
    await updateBlob(doc, analysis, newPlan);
  };

  // Tidying a single section using Gemini 3.1 Flash Lite (preserves all footnoteIds!)
  const tidySingleSection = async (secId: string, secTitle: string) => {
    if (!doc || !plan || !analysis) return;
    const targetSection = plan.sections.find(s => s.id === secId);
    if (!targetSection) return;

    setIsTidying(true);
    setMsg({ text: `Gemini 3.1 Flash Lite sedang merapikan bagian ${secTitle} tanpa menghilangkan footnote...`, type: 'info' });

    try {
      const rawParagraphs = targetSection.items.map(x => itemText(doc, x)).filter(Boolean);
      const res = await tidySectionWithGemini(secId, secTitle, rawParagraphs, analysis.meta?.title || 'Artikel Ilmiah');

      // Update section items with customText, while strictly PRESERVING all footnoteIds!
      const newPlan = {
        ...plan,
        sections: plan.sections.map(s => {
          if (s.id !== secId) return s;
          return {
            ...s,
            items: s.items.map((it, idx) => ({
              ...it,
              customText: res.paragraphs[idx] || it.customText,
              footnoteIds: itemFootnoteIds(doc, it),
            })),
          };
        }),
      };

      setPlan(newPlan);
      setTidiedSections(prev => ({ ...prev, [secId]: true }));
      await updateBlob(doc, analysis, newPlan);
      setMsg({ text: `Bagian ${secTitle} berhasil dirapikan: ${res.note}`, type: 'ok' });
    } catch (e: any) {
      setMsg({ text: `Gagal merapikan bagian: ${e.message || String(e)}`, type: 'warn' });
    } finally {
      setIsTidying(false);
    }
  };

  // Batch Tidying: Polishes all eligible sections sequentially with Gemini 3.1 Flash Lite
  const tidyAllSectionsWithGemini = async () => {
    if (!doc || !plan || !analysis) return;

    const eligibleSections = plan.sections.filter(s => s.id !== 'abstract' && s.id !== 'biblio');
    if (eligibleSections.length === 0) return;

    setIsTidyingAll(true);
    setMsg({
      text: `⚡ Menyiapkan perapian ${eligibleSections.length} bab artikel sekaligus dengan Gemini 3.1 Flash Lite...`,
      type: 'info',
    });

    try {
      let currentWorkingPlan = { ...plan };
      const articleTitle = analysis.meta?.title || 'Artikel Ilmiah';
      const newlyTidied: Record<string, boolean> = { ...tidiedSections };

      for (let i = 0; i < eligibleSections.length; i++) {
        const sec = eligibleSections[i];
        setTidyAllProgress({ current: i + 1, total: eligibleSections.length, title: sec.title });
        setMsg({
          text: `⚡ [${i + 1}/${eligibleSections.length}] Merapikan bab <b>${sec.title}</b> dengan Gemini 3.1 Flash Lite...`,
          type: 'info',
        });

        // Extract paragraphs excluding raw tables
        const textItems = sec.items.filter(it => it.index == null || doc.items[it.index]?.type !== 'table');
        const rawParagraphs = textItems.map(x => itemText(doc, x)).filter(Boolean);

        if (rawParagraphs.length > 0) {
          const res = await tidySectionWithGemini(sec.id, sec.title, rawParagraphs, articleTitle);

          let pIdx = 0;
          currentWorkingPlan = {
            ...currentWorkingPlan,
            sections: currentWorkingPlan.sections.map(s => {
              if (s.id !== sec.id) return s;
              return {
                ...s,
                items: s.items.map(it => {
                  const isTable = it.index != null && doc.items[it.index]?.type === 'table';
                  if (isTable) return it;
                  const polished = res.paragraphs[pIdx++];
                  return {
                    ...it,
                    customText: polished || it.customText,
                    footnoteIds: itemFootnoteIds(doc, it),
                  };
                }),
              };
            }),
          };
          newlyTidied[sec.id] = true;
        }
      }

      setPlan(currentWorkingPlan);
      setTidiedSections(newlyTidied);
      await updateBlob(doc, analysis, currentWorkingPlan);

      setMsg({
        text: `⚡ <b>Selesai Sempurna!</b> Seluruh bab naskah artikel (${eligibleSections.length} bab) berhasil dirapikan berstandar jurnal ilmiah Gemini 3.1 Flash Lite. Footnote skripsi tetap tersinkronisasi 100%.`,
        type: 'ok',
      });
    } catch (err: any) {
      console.error('Tidy all error:', err);
      setMsg({
        text: `Terjadi kendala saat merapikan seluruh bab: ${err.message || String(err)}`,
        type: 'warn',
      });
    } finally {
      setIsTidyingAll(false);
      setTidyAllProgress({ current: 0, total: 0, title: '' });
    }
  };


  // Save report .TXT
  const downloadReport = () => {
    if (!doc || !analysis || !plan) return;
    const fns = sourceFootnotes(doc, plan);
    const refs = plan.sections.find(s => s.id === 'biblio')?.items.length || 0;
    const abs = extractAbstractSource(doc, plan);

    let txt = `ZAIN.NET — LAPORAN SCRIB ARTICLE AI • GEMINI 3.1 FLASH LITE\n\n`;
    txt += `File Sumber: ${file?.name || 'Skripsi'}\n`;
    txt += `Judul Artikel: ${analysis.meta.title}\n`;
    txt += `Penulis: ${author || analysis.meta.author}\n`;
    txt += `Program Studi: ${academicCase(prodi || analysis.meta.prodi)}\n`;
    txt += `Universitas: ${academicCase(univ || analysis.meta.univ)}\n\n`;
    txt += `Jumlah Kata Skripsi: ${analysis.wordCount.toLocaleString('id-ID')}\n`;
    txt += `Jumlah Kata Draft Artikel: ${plan.totalWords.toLocaleString('id-ID')}\n`;
    txt += `Skor Deteksi Struktur: ${Math.round(analysis.confidence * 100)}%\n`;
    txt += `Footnote yang Tersinkron: ${fns.length}\n`;
    txt += `Referensi Daftar Pustaka Terpilih: ${refs}\n`;
    txt += `Paragraf Abstrak Indonesia: ${abs.paragraphs.length}\n`;
    txt += `Paragraf Abstract English: ${paragraphMatchStatus.enCount}\n`;
    txt += `Model AI: gemini-3.1-flash-lite (Ultra Cepat & Rapi)\n\n`;
    txt += `DAFTAR CATATAN KAKI (FOOTNOTES) TERPAKAI:\n`;
    usedFootnotes.forEach(f => {
      txt += `[${f.num}] ${f.text}\n`;
    });
    txt += `\nBAGIAN TERPILIH:\n`;
    for (const s of plan.sections) {
      txt += `- ${s.title}: ${s.items.length} blok (${s.items.reduce((acc, it) => acc + helpers.wc(itemText(doc, it)), 0)} kata)\n`;
    }
    txt += `\nPEMETAAN STRUKTUR:\n`;
    const roleLabels: Record<string, string> = {
      intro: 'Pendahuluan',
      method: 'Metode Penelitian',
      discussion: 'Hasil & Pembahasan',
      conclusion: 'Kesimpulan & Saran',
    };
    for (const r of ['intro', 'method', 'discussion', 'conclusion']) {
      const b = plan.usedBlocks?.[r];
      txt += `- ${roleLabels[r]}: ${b ? b.label + ' (' + b.wordCount.toLocaleString('id-ID') + ' kata)' : 'TIDAK DITEMUKAN'}\n`;
    }

    saveBlob(new Blob([txt], { type: 'text/plain;charset=utf-8' }), 'Laporan_Artikel_ZAINNET.txt');
  };

  const diagList = useMemo(() => {
    if (!doc || !analysis || !plan) return [];
    return diagnostics(doc, analysis, plan);
  }, [doc, analysis, plan]);

  return (
    <div className="min-h-screen text-[#eaf2ff] text-sm" style={{ background: 'radial-gradient(circle at top right, #11345c 0, #07111f 42%, #050b14 100%)' }}>
      {/* Top Header / Branding */}
      <header className="border-b border-[#243b57] bg-[#07111f]/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer shadow-sm mr-1"
                title="Kembali ke Beranda ZAIN.NET"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Beranda</span>
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-sky-500/20">
              Z
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                ZAIN.NET — Skripsi Jadi Artikel
                <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono font-medium">
                  Gemini 3.1 Flash Lite
                </span>
              </h1>
              <p className="text-xs text-[#98aac2] hidden sm:block">
                Detektor universal skripsi • Catatan Kaki (Footnote) & Daftar Pustaka Tersinkron • Format Word .DOCX
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d2137] border border-[#234b71] text-xs font-semibold text-sky-300">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Ultra Cepat
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
              Footnote Aktif ({usedFootnotes.length})
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1360px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration (5 cols) */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="bg-gradient-to-b from-[#12243b] to-[#0a182a] border border-[#243b57] rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2 mb-4 pb-3 border-b border-[#243b57]">
              <Upload className="w-4 h-4" /> 1. Upload & Pengaturan
            </h2>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault();
                e.currentTarget.classList.add('border-sky-400', 'bg-sky-500/5');
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-sky-400', 'bg-sky-500/5');
              }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-sky-400', 'bg-sky-500/5');
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-[#355273] hover:border-sky-400 rounded-xl p-5 text-center cursor-pointer transition bg-[#081526]/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              <div className="w-11 h-11 mx-auto mb-2 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition">
                <FileText className="w-6 h-6" />
              </div>
              <strong className="block text-sm text-slate-100 font-semibold mb-1">
                {file ? file.name : 'Upload Skripsi Utuh (.DOCX)'}
              </strong>
              <small className="text-xs text-[#98aac2]">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Klik untuk mengganti file`
                  : 'Klik atau seret file skripsi Word (.docx) ke area ini'}
              </small>
            </div>

            {/* Mode Artikel */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Mode Panjang Artikel</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full bg-[#081526] border border-[#2a4562] focus:border-sky-400 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition"
              >
                <option value="contoh">Mirip Format Contoh Jurnal (~3.300 kata)</option>
                <option value="ringkas">Ringkas & Padat (~2.300 kata)</option>
                <option value="lengkap">Lengkap & Mendalam (~5.000+ kata)</option>
              </select>
            </div>

            {/* Metadata Skripsi */}
            <div className="grid grid-cols-1 gap-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Penulis</label>
                <input
                  type="text"
                  placeholder="Deteksi otomatis dari cover skripsi..."
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  className="w-full bg-[#081526] border border-[#2a4562] focus:border-sky-400 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Program Studi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pendidikan Agama Islam"
                  value={prodi}
                  onChange={e => setProdi(e.target.value)}
                  className="w-full bg-[#081526] border border-[#2a4562] focus:border-sky-400 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Universitas / Institut</label>
                <input
                  type="text"
                  placeholder="Contoh: Universitas Islam Negeri Madura"
                  value={univ}
                  onChange={e => setUniv(e.target.value)}
                  className="w-full bg-[#081526] border border-[#2a4562] focus:border-sky-400 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Universal Chapter Mapping Box */}
            <div className="mt-5 p-4 rounded-xl border border-[#315374] bg-[#08192a]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs uppercase tracking-wide text-sky-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Pemetaan Struktur Skripsi
                </span>
                <span className="text-[11px] text-[#91a9c2]">Detektor Universal</span>
              </div>
              <p className="text-[11px] text-[#91a9c2] mb-3 leading-relaxed">
                Detektor otomatis membaca BAB skripsi, style Word, dan menjaga seluruh catatan kaki (footnote) pada paragraf terpilih.
              </p>

              <div className="space-y-2">
                {[
                  { role: 'intro', label: 'Pendahuluan' },
                  { role: 'method', label: 'Metode Penelitian' },
                  { role: 'discussion', label: 'Hasil / Pembahasan' },
                  { role: 'conclusion', label: 'Kesimpulan / Saran' },
                ].map(({ role, label }) => {
                  const blocks = (analysis?.blocks || []).filter((b: any) => b.wordCount >= 40);
                  return (
                    <div key={role}>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>{label}</span>
                        {plan?.usedBlocks?.[role] && (
                          <span className="text-emerald-400 font-mono text-[10px]">
                            {plan.usedBlocks[role]?.wordCount.toLocaleString('id-ID')} kata
                          </span>
                        )}
                      </div>
                      <select
                        disabled={!analysis}
                        value={mapping[role as keyof typeof mapping]}
                        onChange={e => {
                          const newMap = { ...mapping, [role]: e.target.value };
                          setMapping(newMap);
                        }}
                        className="w-full bg-[#081526] border border-[#2a4562] disabled:opacity-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                      >
                        <option value="auto">AUTO — deteksi terbaik ({analysis?.roleBlocks?.[role]?.label || 'Menunggu analisis'})</option>
                        {blocks.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.label} — {b.wordCount.toLocaleString('id-ID')} kata {b.role === role ? '✓' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {analysis && (
                <button
                  type="button"
                  onClick={() => applyNewPlan(mapping)}
                  className="mt-3 w-full py-1.5 px-3 rounded-lg bg-[#142d4a] hover:bg-[#1b3d64] border border-[#2b5178] text-xs font-semibold text-sky-200 transition"
                >
                  Terapkan Pemetaan Baru & Susun Ulang
                </button>
              )}
            </div>

            {/* Footnote & English Toggles */}
            <div className="mt-4 space-y-2">
              <div className="p-3 rounded-xl bg-[#091a2d] border border-emerald-600/40 text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <b className="text-white block">Catatan Kaki (Footnote) Terintegrasi</b>
                    <span className="text-[11px] text-emerald-300/80">
                      Footnote skripsi tetap utuh dan tersinkron ke Daftar Pustaka
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 text-[10px] font-bold">
                  AKTIF
                </span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={!file || isAnalyzing}
                onClick={runAnalysis}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-400 via-sky-500 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Memproses Skripsi & Menyusun Footnote...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    Analisis & Buat Draft + Download Otomatis
                  </>
                )}
              </button>

              {plan && (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => applyNewPlan(mapping)}
                  className="w-full py-2 px-3 rounded-xl bg-[#132943] hover:bg-[#183455] border border-[#2b4867] text-xs font-semibold text-sky-200 flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Buat Ulang Draft
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {progress > 0 && (
              <div className="mt-4">
                <div className="h-2 w-full bg-[#081526] rounded-full overflow-hidden p-0.5 border border-[#1b344e]">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Notice */}
            {msg.text && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                  msg.type === 'ok'
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
                    : msg.type === 'warn'
                    ? 'bg-amber-950/60 border-amber-600/50 text-amber-200'
                    : 'bg-sky-950/60 border-sky-600/50 text-sky-200'
                }`}
              >
                {msg.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />}
                {msg.type === 'warn' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />}
                {msg.type === 'info' && <Zap className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />}
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Output, Preview & Management (7 cols) */}
        <main className="lg:col-span-7 space-y-5">
          <div className="bg-gradient-to-b from-[#12243b] to-[#0a182a] border border-[#243b57] rounded-2xl p-5 shadow-xl flex flex-col min-h-[640px]">
            {/* Header & Stats */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#243b57]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> 2. Hasil Scrib Article AI • Gemini 3.1 Flash Lite
              </h2>

              {/* Action Downloads & Batch AI Tidying */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!plan || isTidyingAll || isAnalyzing}
                  onClick={tidyAllSectionsWithGemini}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Rapikan seluruh bab artikel (Pendahuluan, Metode, Pembahasan, Kesimpulan) menjadi standar jurnal ilmiah bereputasi sekaligus"
                >
                  {isTidyingAll ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Merapikan {tidyAllProgress.title} ({tidyAllProgress.current}/{tidyAllProgress.total})...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                      <span>⚡ Rapikan Seluruh Bab Sekaligus (Gemini)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!blob || isTidyingAll}
                  onClick={() => {
                    if (blob) {
                      const dlName = `Artikel_${shortAuthor(author || analysis?.meta?.author)}.docx`;
                      saveBlob(blob, dlName);
                      setMsg({
                        text: `File <b>${dlName}</b> berhasil didownload! Mengalihkan kembali ke menu Web utama...`,
                        type: 'ok',
                      });
                      onExportComplete?.(dlName);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .DOCX
                </button>
                <button
                  type="button"
                  disabled={!plan || isTidyingAll}
                  onClick={downloadReport}
                  className="px-3 py-1.5 rounded-lg bg-[#142d4a] hover:bg-[#1a3d66] border border-[#294a6e] text-xs font-medium text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Laporan .TXT
                </button>
              </div>
            </div>

            {/* Active Batch Tidying Status Banner */}
            {isTidyingAll && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <div>
                    <b className="text-white block">
                      Gemini 3.1 Flash Lite sedang merapikan bab: {tidyAllProgress.title} ({tidyAllProgress.current} dari {tidyAllProgress.total})
                    </b>
                    <span className="text-[11px] text-amber-300/80">
                      Mengubah gaya bahasa skripsi menjadi jurnal ilmiah dan menjaga seluruh rujukan catatan kaki (footnote).
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-amber-900 text-amber-100 font-mono text-[11px] font-bold shrink-0">
                  {Math.round((tidyAllProgress.current / Math.max(1, tidyAllProgress.total)) * 100)}%
                </span>
              </div>
            )}

            {/* Numeric Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#081728] border border-[#1d3550]">
                <b className="text-lg font-bold text-white block">
                  {analysis ? analysis.wordCount.toLocaleString('id-ID') : '0'}
                </b>
                <span className="text-[11px] text-[#98aac2]">Kata Skripsi</span>
              </div>
              <div className="p-3 rounded-xl bg-[#081728] border border-[#1d3550]">
                <b className="text-lg font-bold text-sky-400 block">
                  {plan ? plan.totalWords.toLocaleString('id-ID') : '0'}
                </b>
                <span className="text-[11px] text-[#98aac2]">Kata Draft Artikel</span>
              </div>
              <div className="p-3 rounded-xl bg-[#081728] border border-[#1d3550]">
                <b className="text-lg font-bold text-emerald-400 block">
                  {usedFootnotes.length}
                </b>
                <span className="text-[11px] text-[#98aac2]">Footnote Terpakai</span>
              </div>
              <div className="p-3 rounded-xl bg-[#081728] border border-[#1d3550]">
                <b className="text-lg font-bold text-yellow-400 block">
                  {plan?.sections.find(s => s.id === 'biblio')?.items.length || 0}
                </b>
                <span className="text-[11px] text-[#98aac2]">Daftar Pustaka Sinkron</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#1f3752] pb-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'preview'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview Artikel ({usedFootnotes.length} Footnote)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'review'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Review Sumber & Detail Footnote
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'info'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                Cara Kerja Footnote & AI
              </button>
            </div>

            {/* Tab 1: Preview Artikel (Academic Paper View with Footnotes) */}
            {activeTab === 'preview' && (
              <div className="flex-1 overflow-y-auto max-h-[750px] pr-1">
                {plan && doc ? (
                  <div className="previewPaper text-slate-900 shadow-2xl relative">
                    {/* Title & Metadata */}
                    <h3>{((analysis?.meta?.title || 'ARTIKEL ILMIAH') as string).toUpperCase()}</h3>
                    <div className="identity author">
                      <b>{author || analysis?.meta?.author || 'Nama Penulis'}</b>
                    </div>
                    {prodi && <div className="identity academic">{academicCase(prodi)}</div>}
                    {univ && <div className="identity academic">{academicCase(univ)}</div>}

                    {/* Render Each Section */}
                    {plan.sections.map(sec => {
                      const isAbs = sec.id === 'abstract';
                      const isBib = sec.id === 'biblio';

                      return (
                        <div key={sec.id} className="mt-4">
                          <div className={`flex items-baseline gap-2 ${isAbs ? 'justify-center' : 'justify-start'}`}>
                            <h4 className={isAbs ? 'center' : isBib ? 'left' : ''}>{sec.title}</h4>
                            {isBib && (
                              <span className="text-[10pt] font-sans font-normal text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full select-none">
                                Tersinkronisasi Otomatis ({sec.items.length} Referensi dari Footnote)
                              </span>
                            )}
                          </div>

                          {sec.items.map((x, idx) => {
                            const isTable = x.index != null && doc.items[x.index]?.type === 'table';
                            if (isTable) {
                              const tblItem = doc.items[x.index!];
                              const tRows = tblItem.tableRows || [];
                              return (
                                <div key={idx} className="my-5 overflow-x-auto rounded border border-slate-300 bg-white shadow-sm p-1">
                                  <table className="w-full border-collapse text-[10pt] font-serif text-slate-900">
                                    {tRows.length > 0 && (
                                      <thead>
                                        <tr className="border-b-2 border-slate-800 bg-slate-100 font-bold">
                                          {tRows[0].map((cell, cIdx) => (
                                            <th key={cIdx} className="py-2 px-3 text-left border-x border-slate-200 first:border-l-0 last:border-r-0">
                                              {cell}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                    )}
                                    <tbody>
                                      {(tRows.length > 1 ? tRows.slice(1) : tRows).map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-slate-200 hover:bg-sky-50/30">
                                          {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="py-1.5 px-3 text-left border-x border-slate-200 first:border-l-0 last:border-r-0 align-top">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }

                            const t = itemText(doc, x);
                            const isConc =
                              sec.id === 'conclusion' &&
                              /^(?:[A-Z]\s*[.)]\s*)?(?:KESIMPULAN|SIMPULAN|SARAN)\b/i.test(t);
                            const isKey = isAbs && (x.role === 'keywords' || /^KATA\s*KUNCI\b/i.test(t));
                            const fnIds = itemFootnoteIds(doc, x);

                            const isNumbered = x.role === 'numbered' || /^\d+[.)]\s+/.test(t);

                            let pClass = '';
                            if (x.role === 'subheading') pClass += 'sub ';
                            if (isAbs) pClass += 'abstractText ';
                            if (isNumbered) pClass += 'numbered ';
                            if (isConc) pClass += 'conclusionHead ';
                            if (isKey) pClass += 'abstractKeywords ';
                            if (isBib) pClass += 'bib ';

                            return (
                              <p key={idx} className={pClass.trim()}>
                                {isKey ? <b>{t}</b> : t}
                                {fnIds.length > 0 && !isBib && !isAbs && (
                                  <span className="inline-flex items-baseline gap-0.5 ml-0.5 select-none font-sans">
                                    {fnIds.map((fnId, fIdx) => {
                                      const num = footnoteNumberMap.get(String(fnId)) || fnId;
                                      const fnText = doc.footnotes.get(String(fnId)) || '';
                                      return (
                                        <sup
                                          key={fIdx}
                                          className="text-sky-700 font-bold px-0.5 hover:text-sky-950 transition cursor-help text-[9pt]"
                                          title={`Footnote [${num}]: ${fnText}`}
                                        >
                                          [{num}]
                                        </sup>
                                      );
                                    })}
                                  </span>
                                )}
                              </p>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Dedicated Footnotes Section at Bottom of Paper */}
                    {usedFootnotes.length > 0 && (
                      <div className="mt-8 pt-4 border-t-2 border-slate-300 font-serif text-slate-800">
                        <div className="text-[11pt] font-bold mb-2 text-slate-900 font-sans flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Bookmark className="w-4 h-4 text-sky-700" />
                            Catatan Kaki (Footnotes) — {usedFootnotes.length} Referensi
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Akan tampil di bawah halaman masing-masing di Word .DOCX)
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[10pt] leading-snug">
                          {usedFootnotes.map(fn => (
                            <div key={fn.id} className="flex items-start gap-1.5 text-left indent-0 text-slate-800">
                              <sup className="font-bold text-sky-800 shrink-0 select-none text-[9pt] pt-0.5">
                                [{fn.num}]
                              </sup>
                              <span className="flex-1 text-[10pt]">{fn.text || '(Teks catatan kaki)'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#1f3752] rounded-xl text-slate-500">
                    <BookOpen className="w-12 h-12 mb-3 text-slate-600 stroke-[1.5]" />
                    <p className="text-base font-semibold text-slate-300">Belum ada dokumen yang dianalisis</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Upload file skripsi Word (.docx) Anda di panel sebelah kiri untuk melihat draf artikel ilmiah lengkap dengan catatan kaki (footnote).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Review Sumber & Rapikan */}
            {activeTab === 'review' && (
              <div className="flex-1 overflow-y-auto max-h-[750px] space-y-4 pr-1">
                {/* Diagnostics */}
                {diagList.length > 0 ? (
                  <div className="space-y-2">
                    {diagList.map((dNote, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/40 text-amber-200 text-xs flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        {dNote}
                      </div>
                    ))}
                  </div>
                ) : plan ? (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Struktur skripsi terdeteksi lengkap dan {usedFootnotes.length} footnote berhasil disinkronkan.
                  </div>
                ) : null}

                {/* Section Cards */}
                {plan && doc ? (
                  plan.sections.map(sec => {
                    const wordCount = sec.items.reduce((z, x) => z + helpers.wc(itemText(doc, x)), 0);
                    const isTidied = tidiedSections[sec.id];
                    const canTidy = sec.id !== 'abstract' && sec.id !== 'biblio';

                    return (
                      <div key={sec.id} className="rounded-xl border border-[#244263] bg-[#08182b] overflow-hidden">
                        <div className="px-4 py-3 bg-[#0d223a] border-b border-[#244263] flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <b className="text-xs text-sky-200 font-bold uppercase tracking-wider">{sec.title}</b>
                            <span className="text-[11px] text-[#8aa5c2] ml-2">
                              {wordCount.toLocaleString('id-ID')} kata • {sec.items.length} blok
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isTidied && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Dirapikan Gemini (Footnote Terjaga)
                              </span>
                            )}
                            {canTidy && (
                              <button
                                type="button"
                                disabled={isTidying}
                                onClick={() => tidySingleSection(sec.id, sec.title)}
                                className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <Wand2 className="w-3 h-3" />
                                Rapikan Paragraf (Gemini)
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-3 font-serif text-slate-200 text-xs leading-relaxed max-h-[360px] overflow-y-auto">
                          {sec.id === 'biblio' && (
                            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-[11px] text-emerald-200 font-sans">
                              <b className="text-white block mb-0.5">Sinkronisasi Footnote ➔ Daftar Pustaka:</b>
                              Entri di bawah ini disaring secara presisi: hanya memuat buku/jurnal yang footnote-nya benar-benar dikutip dalam artikel ini (bukan copy-paste seluruh daftar pustaka skripsi). Tersusun alfabetis A–Z.
                            </div>
                          )}
                          {sec.items.map((x, idx) => {
                            const fnIds = itemFootnoteIds(doc, x);
                            const isTable = x.index != null && doc.items[x.index]?.type === 'table';
                            const tblRows = (isTable && doc.items[x.index!]?.tableRows) || [];

                            return (
                              <div key={idx} className="pb-3 border-b border-[#1b344e] last:border-0">
                                {isTable ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-600/50 text-[10px] font-bold flex items-center gap-1 font-sans">
                                        <Layers className="w-3 h-3 text-sky-400" />
                                        Tabel Word Asli ({tblRows.length} baris)
                                      </span>
                                      <span className="text-[10px] text-emerald-400 font-sans">✓ Format tabel asli terjaga di artikel</span>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-[#234261] bg-[#071322] p-2 max-h-48">
                                      <table className="w-full text-[11px] font-sans border-collapse text-slate-300">
                                        <tbody>
                                          {tblRows.map((r, rIdx) => (
                                            <tr key={rIdx} className="border-b border-[#1a334d] last:border-0 hover:bg-[#0c1f36]">
                                              {r.map((c, cIdx) => (
                                                <td key={cIdx} className="py-1 px-2 border-r border-[#1a334d] last:border-0">
                                                  {c}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <p className={x.role === 'subheading' ? 'font-bold text-sky-300' : ''}>
                                    {itemText(doc, x)}
                                    {fnIds.length > 0 && (
                                      <span className="font-sans font-bold text-sky-400 ml-1">
                                        [{fnIds.map(f => footnoteNumberMap.get(String(f)) || f).join(', ')}]
                                      </span>
                                    )}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                                  <span className="font-sans text-[10px] text-[#708aa8]">
                                    {isTable ? `Tabel data penelitian • ${x.source}` : x.virtual ? 'Dari footnote terpakai' : `Sumber blok #${(x.index || 0) + 1}`} {!isTable && `• ${x.source}`}
                                    {x.customText ? ' • (Telah dirapikan)' : ''}
                                  </span>
                                </div>

                                {/* Footnote Box on the item */}
                                {fnIds.length > 0 && (
                                  <div className="mt-2 p-2.5 rounded-lg bg-[#0a2036] border border-sky-800/40 text-[11px] text-sky-200">
                                    <div className="font-bold text-sky-300 flex items-center gap-1 mb-1 font-sans">
                                      <Bookmark className="w-3 h-3 text-yellow-400" />
                                      Catatan Kaki ({fnIds.length}):
                                    </div>
                                    <div className="space-y-1 font-serif">
                                      {fnIds.map(fnId => {
                                        const num = footnoteNumberMap.get(String(fnId)) || fnId;
                                        const fnText = doc.footnotes.get(String(fnId)) || '';
                                        return (
                                          <div key={fnId} className="pl-2 border-l-2 border-sky-400 text-slate-300">
                                            <b className="text-yellow-300 font-sans">[{num}]</b> {fnText}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">Belum ada data review.</div>
                )}
              </div>
            )}

            {/* Tab 3: Cara Kerja Footnote & AI */}
            {activeTab === 'info' && (
              <div className="flex-1 overflow-y-auto max-h-[750px] space-y-4 pr-1 text-xs leading-relaxed text-slate-300">
                <div className="p-4 rounded-xl bg-[#091a2d] border border-emerald-600/40">
                  <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2 mb-2">
                    <Bookmark className="w-4 h-4 text-emerald-400" /> Bagaimana Footnote Skripsi Diproses?
                  </h3>
                  <p className="mb-2">
                    Sistem membaca file XML asli (<code>word/document.xml</code> dan <code>word/footnotes.xml</code>) dari skripsi Anda:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                    <li>
                      <b className="text-white">Tidak Ada Footnote yang Hilang:</b> Seluruh tanda rujukan catatan kaki (<code>w:footnoteReference</code>) pada paragraf skripsi yang lolos seleksi tetap dipertahankan ke dokumen artikel.
                    </li>
                    <li>
                      <b className="text-white">Penomoran Ulang Otomatis:</b> Di Word .DOCX hasil download, penomoran footnote akan otomatis dimulai dari angka 1 dan tampil tepat di bagian bawah halaman masing-masing (bukan di akhir dokumen).
                    </li>
                    <li>
                      <b className="text-white">Sinkronisasi Daftar Pustaka:</b> Referensi footnote yang benar-benar dikutip dalam artikel disinkronkan dengan Daftar Pustaka akhir skripsi. Jika ada referensi footnote yang belum tercantum di Daftar Pustaka, teks footnote otomatis diubah menjadi entri bibliografi.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#081829] border border-[#1f3b5c]">
                  <h4 className="font-bold text-sky-400 mb-2">Peran Gemini 3.1 Flash Lite:</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                    <li>
                      <b className="text-white">Terjemahan Abstrak Kilat:</b> Menggantikan model AI lokal yang lemot, Gemini menerjemahkan Abstrak Indonesia ke Inggris dalam hitungan 1 detik dengan susunan paragraf yang 100% simetris.
                    </li>
                    <li>
                      <b className="text-white">Perapian Kalimat Akademis:</b> Tombol "Rapikan Paragraf (Gemini)" membersihkan frasa khas skripsi (seperti "pada bab selanjutnya", "tujuan penulisan skripsi") tanpa menghapus nomor atau rujukan footnote.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ArtikelGeminiView;
