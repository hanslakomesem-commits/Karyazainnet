import { downloadBackendFile } from '../utils/downloadBackendFile';
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  FileEdit,
  Upload,
  Download,
  CheckCircle2,
  FileText,
  Sparkles,
  FolderArchive,
  Trash2,
  Plus,
  Library,
  Layers,
  Eye,
  Check,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
  Search,
  History as HistoryIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
  BookOpen,
  Edit3,
  AlertCircle,
  Building2,
  Mail,
  Calendar,
  ListOrdered,
  Columns
} from 'lucide-react';
import { readDocxFile } from '../services/docxReader';
import { parseMasterTemplateDocx } from '../services/templateParser';
import { formatArticleDocument, extractArticleMeta } from '../services/formattingEngine';
import {
  saveTemplateToStorage,
  getAllSavedTemplates,
  deleteSavedTemplate,
  clearAllSavedTemplates,
} from '../services/templateStorage';
import { storageService } from '../services/storage';
import { ParsedDocument, IntegrityReport } from '../types/document';
import { JournalTemplateConfig } from '../types/template';
import { DocumentPaperPreview } from './Preview/DocumentPaperPreview';
import { Sidebar, NavPage } from './Layout/Sidebar';
import { Header } from './Layout/Header';
import { Dashboard } from '../pages/Dashboard';
import { Templates } from '../pages/Templates';
import { FormatArticle } from '../pages/FormatArticle';
import { DocumentAnalyzerView } from '../pages/DocumentAnalyzerView';
import { PreviewResult } from '../pages/PreviewResult';
import { History } from '../pages/History';
import { Settings } from '../pages/Settings';
import { TemplateConfigModal } from './TemplateModal/TemplateConfigModal';

export interface BatchArticleItem {
  id: string;
  fileName: string;
  file: File;
  parsedDoc?: ParsedDocument;
  status: 'parsing' | 'ready' | 'processing' | 'done' | 'error';
  resultBlob?: Blob;
  integrityReport?: IntegrityReport;
  error?: string;
  customAuthor?: string;
  customTitle?: string;
  customShortTitle?: string;
  customAffiliation?: string;
  customEmail?: string;
  historyReceived?: string;
  historyRevised?: string;
  historyAccepted?: string;
  historyPublished?: string;
  headingLetterCase?: 'UPPERCASE' | 'TITLE_CASE' | 'ORIGINAL';
  headingNumbering?: 'NONE' | 'ARABIC' | 'ROMAN';
  abstractTransition?: boolean;
}

interface TemplateJurnalManagerProps {
  userRole?: string;
  userEmail?: string;
  onBackToHome?: () => void;
}

export function TemplateJurnalManager({
  userRole,
  userEmail,
  onBackToHome,
}: TemplateJurnalManagerProps) {
  // Main view mode: 'batch' (Multi-File Fast Sync) or 'studio' (Full Workspace)
  const [viewMode, setViewMode] = useState<'batch' | 'studio'>('batch');

  // Studio Sub-page State
  const [currentNavPage, setCurrentNavPage] = useState<NavPage>('format');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Template & Koleksi State (Shared between batch & studio)
  const [savedTemplates, setSavedTemplates] = useState<JournalTemplateConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<JournalTemplateConfig | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JournalTemplateConfig | null>(null);

  // Batch Article State
  const [articles, setArticles] = useState<BatchArticleItem[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentProcessIndex, setCurrentProcessIndex] = useState<number>(0);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load templates on mount from IndexedDB
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  const loadSavedTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const list = await getAllSavedTemplates();
      setSavedTemplates(list);
      if (list.length > 0) {
        setSelectedTemplate((prev) => (prev ? (list.find((t) => t.id === prev.id) || list[0]) : list[0]));
      } else {
        setSelectedTemplate(null);
      }
    } catch (err) {
      console.error('Gagal memuat template tersimpan:', err);
      setSavedTemplates([]);
      setSelectedTemplate(null);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Bersihkan seluruh template dari penyimpanan (mengosongkan keadaan template)
  const handleClearAllTemplates = async () => {
    if (!confirm('Hapus seluruh template yang tersimpan? Keadaan web template akan kembali kosong dan siap menerima upload baru.')) {
      return;
    }
    try {
      await clearAllSavedTemplates();
      await storageService.clearAllTemplates();
      setSavedTemplates([]);
      setSelectedTemplate(null);
      showToast('Seluruh template berhasil dihapus. Koleksi template sekarang kosong.');
    } catch (err: any) {
      alert('Gagal membersihkan template: ' + err.message);
    }
  };

  // Upload Master Template Baru (.docx) & Simpan Permanen ke IndexedDB
  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Menganalisis file template master DOCX...');
      const parsedTpl = await parseMasterTemplateDocx(file);
      const newTemplateConfig: JournalTemplateConfig = {
        id: `tpl-${Date.now()}`,
        name: parsedTpl.name || file.name.replace(/\.[^/.]+$/, ''),
        publisher: 'Penerbit Jurnal',
        fieldOfStudy: 'Umum',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templateArrayBuffer: parsedTpl.templateArrayBuffer,
        headerLogoUrl: parsedTpl.headerLogoUrl,
        headerTitle: parsedTpl.headerTitle,
        headerLines: parsedTpl.headerLines,
        issn: parsedTpl.issn,
        doi: parsedTpl.doi,
        volumeNo: parsedTpl.volumeNo,
        hasHeaderBanner: true,
        pageNumberConfig: parsedTpl.pageNumberConfig,
        pageLayout: parsedTpl.pageLayout || {
          paperSize: 'A4',
          orientation: 'portrait',
          marginTopMm: 25,
          marginBottomMm: 25,
          marginLeftMm: 20,
          marginRightMm: 20,
          columns: 1,
          columnSpacingMm: 0,
        },
        titleStyle: parsedTpl.titleStyle || { fontFamily: 'Times New Roman', fontSizePt: 14, lineSpacing: 1.15, spaceBeforePt: 0, spaceAfterPt: 12, alignment: 'center', bold: true },
        authorStyle: parsedTpl.authorStyle || { fontFamily: 'Times New Roman', fontSizePt: 11, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'center', bold: true },
        affiliationStyle: parsedTpl.affiliationStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'center', italic: true },
        emailStyle: parsedTpl.emailStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 14, alignment: 'center' },
        abstractTitleStyle: parsedTpl.abstractTitleStyle || { fontFamily: 'Times New Roman', fontSizePt: 10, lineSpacing: 1.0, spaceBeforePt: 6, spaceAfterPt: 4, alignment: 'left', bold: true },
        abstractBodyStyle: parsedTpl.abstractBodyStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 6, alignment: 'justify', italic: true },
        keywordsStyle: parsedTpl.keywordsStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 14, alignment: 'justify', italic: true },
        heading1Style: parsedTpl.heading1Style || { fontFamily: 'Times New Roman', fontSizePt: 11, lineSpacing: 1.15, spaceBeforePt: 12, spaceAfterPt: 4, alignment: 'left', bold: true },
        heading2Style: parsedTpl.heading2Style || { fontFamily: 'Times New Roman', fontSizePt: 10, lineSpacing: 1.15, spaceBeforePt: 8, spaceAfterPt: 2, alignment: 'left', bold: true },
        heading3Style: parsedTpl.heading3Style || { fontFamily: 'Times New Roman', fontSizePt: 10, lineSpacing: 1.0, spaceBeforePt: 6, spaceAfterPt: 2, alignment: 'left', italic: true },
        bodyStyle: parsedTpl.bodyStyle || { fontFamily: 'Times New Roman', fontSizePt: 10, lineSpacing: 1.15, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'justify', indentFirstLineMm: 5 },
        tableCaptionStyle: parsedTpl.tableCaptionStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 6, spaceAfterPt: 2, alignment: 'left', bold: true },
        figureCaptionStyle: parsedTpl.figureCaptionStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 4, spaceAfterPt: 6, alignment: 'center' },
        referenceStyle: parsedTpl.referenceStyle || { fontFamily: 'Times New Roman', fontSizePt: 9, lineSpacing: 1.0, spaceBeforePt: 0, spaceAfterPt: 4, alignment: 'left', hangingIndentMm: 7.5 },
      };

      await saveTemplateToStorage(newTemplateConfig);
      await loadSavedTemplates();
      setSelectedTemplate(newTemplateConfig);
      showToast(`Template "${newTemplateConfig.name}" berhasil disimpan permanen!`);
    } catch (err: any) {
      alert('Gagal membaca & menyimpan template: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus template ini dari koleksi tersimpan?')) return;
    try {
      await deleteSavedTemplate(id);
      const updated = savedTemplates.filter((t) => t.id !== id);
      setSavedTemplates(updated);
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(updated[0] || null);
      }
      showToast('Template berhasil dihapus dari penyimpanan.');
    } catch (err: any) {
      alert('Gagal menghapus template: ' + err.message);
    }
  };

  // Upload Multi File Artikel Mahasiswa
  const handleUploadArticles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: BatchArticleItem[] = files.map((file, idx) => ({
      id: `art-${Date.now()}-${idx}`,
      fileName: file.name,
      file,
      status: 'parsing',
    }));

    setArticles((prev) => [...prev, ...newItems]);
    if (!activePreviewId && newItems.length > 0) {
      setActivePreviewId(newItems[0].id);
    }

    // Parse setiap berkas DOCX dengan pembaca XML utuh
    for (const item of newItems) {
      try {
        const parsed = await readDocxFile(item.file);
        const meta = extractArticleMeta(parsed);
        setArticles((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? {
                  ...a,
                  parsedDoc: parsed,
                  status: 'ready',
                  customAuthor: meta.author,
                  customTitle: meta.title,
                  customShortTitle: meta.shortTitle,
                  customAffiliation: meta.affiliation,
                  customEmail: meta.email,
                  historyReceived: meta.suggestedHistory.received,
                  historyRevised: meta.suggestedHistory.revised,
                  historyAccepted: meta.suggestedHistory.accepted,
                  historyPublished: meta.suggestedHistory.published,
                  headingLetterCase: 'UPPERCASE',
                  headingNumbering: 'NONE',
                  abstractTransition: true,
                }
              : a
          )
        );
      } catch (err: any) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === item.id ? { ...a, status: 'error', error: err.message } : a
          )
        );
      }
    }
  };

  const handleUpdateArticleCustomMeta = (
    id: string,
    field: keyof BatchArticleItem,
    val: any
  ) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  const handleRemoveArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    if (activePreviewId === id) {
      const remaining = articles.filter((a) => a.id !== id);
      setActivePreviewId(remaining[0]?.id || null);
    }
  };

  // Eksekusi Pemformatan Batch (1 atau 10+ artikel sekaligus tanpa memotong konten)
  const handleProcessBatch = async () => {
    if (!selectedTemplate) {
      alert('Pilih atau unggah template jurnal terlebih dahulu.');
      return;
    }
    const readyItems = articles.filter((a) => a.status === 'ready' || a.status === 'done');
    if (readyItems.length === 0) {
      alert('Unggah setidaknya satu artikel DOCX untuk diproses.');
      return;
    }

    setIsBatchProcessing(true);

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      if (!art.parsedDoc) continue;

      setCurrentProcessIndex(i + 1);
      setArticles((prev) =>
        prev.map((a) => (a.id === art.id ? { ...a, status: 'processing' } : a))
      );

      try {
        const res = await formatArticleDocument(
          art.parsedDoc,
          selectedTemplate,
          undefined,
          {
            author: art.customAuthor,
            title: art.customTitle,
            shortTitle: art.customShortTitle,
            affiliation: art.customAffiliation,
            email: art.customEmail,
            articleHistory: {
              received: art.historyReceived,
              revised: art.historyRevised,
              accepted: art.historyAccepted,
              published: art.historyPublished,
            },
            headingStyle: {
              letterCase: art.headingLetterCase || 'UPPERCASE',
              numbering: art.headingNumbering || 'NONE',
            },
            abstractTransition: art.abstractTransition !== false,
          }
        );
        setArticles((prev) =>
          prev.map((a) =>
            a.id === art.id
              ? {
                  ...a,
                  status: 'done',
                  resultBlob: res.formattedDocxBlob,
                  integrityReport: res.integrityReport,
                }
              : a
          )
        );
      } catch (err: any) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === art.id ? { ...a, status: 'error', error: err.message } : a
          )
        );
      }
    }

    setIsBatchProcessing(false);
    showToast('Pemformatan naskah selesai! Seluruh teks dan konten 100% utuh.');
  };

  // Unduh 1 Artikel Terformat
  const handleDownloadSingle = (item: BatchArticleItem) => {
    if (!item.resultBlob) return;
    const url = URL.createObjectURL(item.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.fileName.replace(/\.[^/.]+$/, '')}_terformat.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Unduh Seluruh Artikel Terformat dalam 1 File ZIP
  const handleDownloadAllZip = async () => {
    const completedItems = articles.filter((a) => a.status === 'done' && a.resultBlob);
    if (completedItems.length === 0) {
      alert('Belum ada artikel yang selesai diproses.');
      return;
    }

    const zip = new JSZip();
    completedItems.forEach((item) => {
      const baseName = item.fileName.replace(/\.[^/.]+$/, '');
      zip.file(`${baseName}_terformat.docx`, item.resultBlob!);
    });

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
    });

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_Artikel_Terformat_${completedItems.length}_File.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeArticle = articles.find((a) => a.id === activePreviewId);
  const doneCount = articles.filter((a) => a.status === 'done').length;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP PORTAL BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back to Home + Title */}
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all"
                title="Kembali ke Beranda Tools Utama"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>Portal Utama</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  TemplateJurnal Formatter
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                    Content Locked
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Isi naskah 100% utuh tanpa kompresi • Preservasi running header & nomor halaman
                </p>
              </div>
            </div>
          </div>

          {/* Center: Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Batch Sync (Multi-File)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'studio'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Studio & Repository</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <a
              href="/api/export-code"
            onClick={async (event) => {
              event.preventDefault();
              try { await downloadBackendFile('/api/export-code', 'source-code-templatejurnal.zip'); }
              catch (e: any) { alert(e?.message || 'Gagal mengunduh source code.'); }
            }}
              download="source-code-templatejurnal.zip"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-200 font-medium shadow-xs transition-all"
              title="Unduh seluruh source code proyek dalam format .ZIP"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Source Code (.ZIP)</span>
            </a>
          </div>
        </div>
      </header>

      {/* MODE 1: BATCH MULTI-FILE SYNC (Dari Script Pengguna) */}
      {viewMode === 'batch' && (
        <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          {/* Banner Integritas Tanpa Kompresi */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <h3 className="font-bold text-indigo-200">Prinsip Sinkronisasi: Content Locked - Format Only</h3>
              <p className="text-slate-300 leading-relaxed">
                Seluruh isi naskah (Pendahuluan, Metode, Hasil, Pembahasan, Kesimpulan, hingga Daftar Pustaka) disinkronkan <b>100% utuh tanpa dirangkum, tanpa dipotong, dan tanpa sekat-sekat kolom buatan yang membatasi teks</b>. Dokumen hasil format Word (.docx) dapat langsung dibuka dan disunting di Microsoft Word.
              </p>
            </div>
          </div>

          {/* 1. SELEKSI & KOLEKSI TEMPLATE JURNAL */}
          <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                  <Library className="w-4 h-4" /> 1. Pilih Template Jurnal Tersimpan
                </h2>
                <p className="text-xs text-slate-400">
                  Template tersimpan otomatis di browser lokal. Tinggal pilih salah satu atau unggah template master (.docx) baru.
                </p>
              </div>

              {/* Input Tambah Template Baru & Tombol Bersihkan */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {savedTemplates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllTemplates}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs border border-rose-800/40 shadow-sm transition-all"
                    title="Kosongkan seluruh template tersimpan di browser"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Semua Template
                  </button>
                )}

                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all">
                  <Plus className="w-4 h-4" /> Unggah Master Template Baru (.docx)
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleUploadTemplate}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Galeri Template Tersimpan */}
            {isLoadingTemplates ? (
              <div className="p-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Memeriksa template tersimpan...
              </div>
            ) : savedTemplates.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-indigo-500/30 bg-slate-950/80 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                  <Library className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-sm text-slate-100">Keadaan Template Masih Kosong</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tidak ada template bawaan di dalam kode. Silakan unggah berkas master <b>template jurnal (.docx)</b> yang ingin Anda gunakan. Template yang diunggah akan otomatis dianalisis dan disimpan di browser ini.
                  </p>
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all">
                    <Upload className="w-4 h-4" /> Unggah Master Template Sekarang (.docx)
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleUploadTemplate}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {savedTemplates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`relative p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {tpl.headerLogoUrl ? (
                          <img
                            src={tpl.headerLogoUrl}
                            alt="Logo"
                            className="w-10 h-10 object-contain rounded bg-white p-1 shrink-0"
                          />
                        ) : (
                          <span className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 text-sm shrink-0 font-bold">
                            🏛️
                          </span>
                        )}
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="font-semibold text-slate-200 truncate">
                            {tpl.headerTitle || tpl.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Layout {tpl.pageLayout.columns} Kolom • Font: {tpl.bodyStyle.fontFamily || 'Times New Roman'}
                          </p>
                          {tpl.issn && (
                            <p className="text-[10px] text-slate-500 truncate">ISSN: {tpl.issn}</p>
                          )}
                        </div>
                      </div>

                      {/* Tombol Hapus Template */}
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        title="Hapus dari koleksi tersimpan"
                        className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex items-center gap-1.5 text-indigo-300 text-[11px] font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Template Aktif Terpilih</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. UNGGAH BANYAK ARTIKEL (MULTI-FILE BATCH) */}
          <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                  <Upload className="w-4 h-4" /> 2. Unggah Naskah Artikel (Bisa 1 atau Banyak File Sekaligus)
                </h2>
                <p className="text-xs text-slate-400">
                  Mendukung format Microsoft Word (.docx). Struktur teks asli akan diekstrak dan diselaraskan secara presisi.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all self-start sm:self-auto">
                <Plus className="w-4 h-4" /> Pilih File Artikel (Multi-File)
                <input
                  type="file"
                  accept=".docx"
                  multiple
                  onChange={handleUploadArticles}
                  className="hidden"
                />
              </label>
            </div>

            {/* List Berkas Artikel Terunggah */}
            {articles.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Belum ada file artikel yang dipilih.</p>
                <p className="text-[11px] text-slate-500">
                  Klik tombol <b>"Pilih File Artikel (Multi-File)"</b> untuk memilih satu atau beberapa file DOCX sekaligus.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Daftar Artikel ({articles.length} berkas)</span>
                  <button
                    onClick={() => setArticles([])}
                    className="text-slate-500 hover:text-rose-400 text-[11px]"
                  >
                    Bersihkan Semua
                  </button>
                </div>

                <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                  {articles.map((item, idx) => {
                    const meta = item.parsedDoc ? extractArticleMeta(item.parsedDoc) : null;
                    const isActive = activePreviewId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActivePreviewId(item.id)}
                        className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isActive ? 'bg-indigo-950/30' : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-slate-500 text-[11px] w-5">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 truncate">{item.fileName}</p>
                            {meta && (
                              <p className="text-[11px] text-slate-400 truncate">
                                <span className="text-indigo-400 font-medium">{meta.author}</span> —{' '}
                                <span>{meta.shortTitle}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {/* Status Badge */}
                          {item.status === 'parsing' && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                              Membaca...
                            </span>
                          )}
                          {item.status === 'ready' && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                              Siap
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Memproses...
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Selesai
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                              Gagal
                            </span>
                          )}

                          {/* Tombol Unduh Satuan */}
                          {item.status === 'done' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadSingle(item);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Unduh
                            </button>
                          )}

                          {/* Tombol Hapus Satuan */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveArticle(item.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Hapus dari antrean"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 3. PRA-PEMERIKSAAN & AUDIT PENYELARASAN: DATA MAHASISWA VS TEMPLATE */}
          {selectedTemplate && articles.length > 0 && (
            <section className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wider uppercase border border-indigo-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      Audit Pra-Penyelarasan
                    </span>
                    <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      3. Pra-Pemeriksaan: Pemisahan Data Template vs Data Riil Mahasiswa
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Periksa dan pastikan elemen yang dipertahankan dari master template serta data riil mahasiswa yang disuntikkan sebelum diaplikasikan ke berkas Word.
                  </p>
                </div>

                {articles.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">Pilih Artikel:</span>
                    {articles.map((art, idx) => (
                      <button
                        key={art.id}
                        onClick={() => setActivePreviewId(art.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                          (activePreviewId === art.id || (!activePreviewId && idx === 0))
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        #{idx + 1} {art.customAuthor ? art.customAuthor.split(' ')[0] : `Naskah ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dual Column Comparative Audit Box */}
              {(() => {
                const auditedArt = articles.find((a) => a.id === activePreviewId) || articles[0];
                if (!auditedArt) return null;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    {/* KOLOM KIRI: ELEMEN TEMPLATE JURNAL (100% TETAP DIPERTAHANKAN) */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <h3 className="font-bold text-emerald-400 text-xs tracking-wide uppercase">
                            Elemen Template Jurnal (100% Tetap Dipertahankan)
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Data Master Terkunci
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* Kop & Identitas Resmi Jurnal */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                              Header Kop Awal Halaman Pertama
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">Tidak Boleh Diubah</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 whitespace-pre-line leading-relaxed">
                            {selectedTemplate.headerTitle || selectedTemplate.name || 'Jurnal Ilmiah'}
                            {selectedTemplate.issn ? `\nISSN: ${selectedTemplate.issn}` : ''}
                            {selectedTemplate.volumeNo ? `\n${selectedTemplate.volumeNo}` : '\nVol. XX No. X, pp. XX–XX'}
                            {`\nDOI: ${selectedTemplate.doi || '10.19105/karsa.vX1iX.XXXX'}`}
                          </div>
                          <p className="text-[10px] text-slate-400 italic">
                            ✓ Kop jurnal, ISSN, Volume, DOI bawaan, logo, dan garis pembatas atas 100% dipertahankan dari master template.
                          </p>
                        </div>

                        {/* Tata Letak Penomoran Halaman */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-emerald-400" />
                              Tata Letak Penomoran Halaman (Page Numbering)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">Ikuti Aturan Template</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Format penomoran halaman Word dinamis (<code className="text-emerald-400">w:fldSimple PAGE</code>) mengikuti posisi template (tengah/kanan/kiri atau header/footer bergantian).
                          </p>
                          <p className="text-[10px] text-amber-400/90 font-medium">
                            ⚡ Nomor halaman acak yang diketik di berkas artikel mahasiswa diabaikan secara otomatis agar tidak merusak penomoran master template.
                          </p>
                        </div>

                        {/* Layout & Margin */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                          <span className="font-semibold text-slate-200 text-[11px]">Layout Kertas &amp; Tipografi:</span>
                          <p className="text-[11px] text-slate-400">
                            • Kolom: <b className="text-slate-200">{selectedTemplate.pageLayout.columns} Kolom</b>
                            {' • '}Font Utama: <b className="text-slate-200">{selectedTemplate.bodyStyle.fontFamily || 'Times New Roman'}</b>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            • Margin: Atas {selectedTemplate.pageLayout.marginTopMm}mm, Bawah {selectedTemplate.pageLayout.marginBottomMm}mm, Kiri {selectedTemplate.pageLayout.marginLeftMm}mm, Kanan {selectedTemplate.pageLayout.marginRightMm}mm
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* KOLOM KANAN: DATA RIIL MAHASISWA (DISINKRONKAN KE DOKUMEN & RUNNING HEADER) */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                          <h3 className="font-bold text-indigo-400 text-xs tracking-wide uppercase">
                            Data Riil Mahasiswa (Diinjeksikan ke Naskah)
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          Hasil Deteksi Artikel (Editable)
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* Judul Riil Mahasiswa */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              Judul Artikel Riil Mahasiswa:
                            </label>
                            <span className="text-[10px] text-indigo-400">Ganti Judul Dummy</span>
                          </div>
                          <textarea
                            rows={2}
                            value={auditedArt.customTitle || ''}
                            onChange={(e) =>
                              handleUpdateArticleCustomMeta(auditedArt.id, 'customTitle', e.target.value)
                            }
                            placeholder="Ketik judul artikel mahasiswa..."
                            className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                          <p className="text-[10px] text-slate-400">
                            ✓ Judul contoh bawaan template di badan artikel akan diganti 100% dengan judul riil ini.
                          </p>
                        </div>

                        {/* Nama Penulis / Mahasiswa Riil */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                              Nama Mahasiswa / Penulis Riil:
                            </label>
                            <span className="text-[10px] text-indigo-400">Ganti Nama Dummy</span>
                          </div>
                          <input
                            type="text"
                            value={auditedArt.customAuthor || ''}
                            onChange={(e) =>
                              handleUpdateArticleCustomMeta(auditedArt.id, 'customAuthor', e.target.value)
                            }
                            placeholder="Nama penulis riil dari artikel..."
                            className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                          />
                          <p className="text-[10px] text-slate-400">
                            ✓ Menggantikan nama contoh template (misal <em>"Author’s name"</em>, <em>"First Author"</em>, dll) di naskah &amp; Running Header kanan/kiri halaman genap.
                          </p>
                        </div>

                        {/* Afiliasi Mahasiswa & Email Korespondensi */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                              Afiliasi (Prodi / Universitas):
                            </label>
                            <input
                              type="text"
                              value={auditedArt.customAffiliation || ''}
                              onChange={(e) =>
                                handleUpdateArticleCustomMeta(auditedArt.id, 'customAffiliation', e.target.value)
                              }
                              placeholder="Contoh: Universitas Islam Negeri Sunan Kalijaga..."
                              className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <p className="text-[10px] text-slate-400">
                              ✓ Mencegah afiliasi bawaan template tertinggal.
                            </p>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-indigo-400" />
                              Email Korespondensi:
                            </label>
                            <input
                              type="text"
                              value={auditedArt.customEmail || ''}
                              onChange={(e) =>
                                handleUpdateArticleCustomMeta(auditedArt.id, 'customEmail', e.target.value)
                              }
                              placeholder="penulis@kampus.ac.id"
                              className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <p className="text-[10px] text-slate-400">
                              ✓ Menggantikan email dummy master template.
                            </p>
                          </div>
                        </div>

                        {/* Kotak Riwayat Naskah (Article History Box) */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              Riwayat Naskah (Article History Box):
                            </label>
                            <span className="text-[10px] text-emerald-400">Update Tanggal Realtime</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Received (Diterima):</span>
                              <input
                                type="text"
                                value={auditedArt.historyReceived || ''}
                                onChange={(e) =>
                                  handleUpdateArticleCustomMeta(auditedArt.id, 'historyReceived', e.target.value)
                                }
                                placeholder="Tanggal upload..."
                                className="w-full text-xs p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Revised (Direvisi):</span>
                              <input
                                type="text"
                                value={auditedArt.historyRevised || ''}
                                onChange={(e) =>
                                  handleUpdateArticleCustomMeta(auditedArt.id, 'historyRevised', e.target.value)
                                }
                                placeholder="Bulan revisi..."
                                className="w-full text-xs p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Accepted (Disetujui):</span>
                              <input
                                type="text"
                                value={auditedArt.historyAccepted || ''}
                                onChange={(e) =>
                                  handleUpdateArticleCustomMeta(auditedArt.id, 'historyAccepted', e.target.value)
                                }
                                placeholder="Bulan disetujui..."
                                className="w-full text-xs p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            ✓ Memperbarui tahun/tanggal lama bawaan template master secara otomatis.
                          </p>
                        </div>

                        {/* Standarisasi Judul Bab (Heading 1, 2, 3) */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                              Standarisasi Format Judul Bab (Heading Utama):
                            </label>
                            <span className="text-[10px] text-indigo-400">Gaya Selingkung</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Kapitalisasi Huruf:</span>
                              <select
                                value={auditedArt.headingLetterCase || 'UPPERCASE'}
                                onChange={(e) =>
                                  handleUpdateArticleCustomMeta(
                                    auditedArt.id,
                                    'headingLetterCase',
                                    e.target.value as any
                                  )
                                }
                                className="w-full text-xs p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="UPPERCASE">ALL CAPS (PENDAHULUAN, METODE, HASIL)</option>
                                <option value="TITLE_CASE">Title Case (Pendahuluan, Metode)</option>
                                <option value="ORIGINAL">Sesuai Naskah Asli</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Format Penomoran:</span>
                              <select
                                value={auditedArt.headingNumbering || 'NONE'}
                                onChange={(e) =>
                                  handleUpdateArticleCustomMeta(
                                    auditedArt.id,
                                    'headingNumbering',
                                    e.target.value as any
                                  )
                                }
                                className="w-full text-xs p-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="NONE">Tanpa Nomor (PENDAHULUAN)</option>
                                <option value="ARABIC">Angka Arab (1. PENDAHULUAN)</option>
                                <option value="ROMAN">Angka Romawi (I. PENDAHULUAN)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Penataan Transisi Layout Abstrak (1 Kolom) ke Badan Teks (2 Kolom) */}
                        {selectedTemplate.pageLayout.columns === 2 && (
                          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                                <Columns className="w-3.5 h-3.5 text-indigo-400" />
                                Transisi Layout Abstrak (1 Kolom) ➔ Badan Naskah (2 Kolom)
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Section Break Continuous otomatis dipasang di bawah Keywords agar Abstrak 1 kolom lebar dan Pendahuluan s/d Daftar Pustaka 2 kolom rapi.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateArticleCustomMeta(
                                  auditedArt.id,
                                  'abstractTransition',
                                  auditedArt.abstractTransition === false
                                )
                              }
                              className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors ${
                                auditedArt.abstractTransition !== false
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {auditedArt.abstractTransition !== false ? 'Aktif (1 Kolom ➔ 2 Kolom)' : 'Non-aktif (Seragam)'}
                            </button>
                          </div>
                        )}

                        {/* Judul Singkat Running Header (Halaman Ganjil) */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              Judul Singkat Running Header Atas (Halaman Ganjil):
                            </label>
                            <span className="text-[10px] text-indigo-400">Short Title</span>
                          </div>
                          <input
                            type="text"
                            value={auditedArt.customShortTitle || ''}
                            onChange={(e) =>
                              handleUpdateArticleCustomMeta(auditedArt.id, 'customShortTitle', e.target.value)
                            }
                            placeholder="Judul singkat untuk running header..."
                            className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                          <p className="text-[10px] text-slate-400">
                            ✓ Dipasang di header atas halaman ganjil, menggantikan judul contoh template lama.
                          </p>
                        </div>

                        {/* Integritas Teks Isi */}
                        <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Seluruh isi naskah (Pendahuluan, Metode, Hasil, Pembahasan, Kesimpulan, dan Referensi) dipindahkan 100% utuh tanpa kompresi kata.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {/* 4. TOMBOL EKSEKUSI & UNDUH HASIL */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleProcessBatch}
              disabled={!selectedTemplate || articles.length === 0 || isBatchProcessing}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {isBatchProcessing
                ? `Sedang Memproses ${currentProcessIndex} dari ${articles.length} Artikel...`
                : !selectedTemplate
                ? 'Unggah Master Template Terlebih Dahulu'
                : articles.length === 0
                ? 'Unggah File Artikel Naskah'
                : articles.length > 1
                ? `Singkronkan Semua Artikel (${articles.length} Berkas) Sekarang`
                : `Singkronkan Artikel ke Template Jurnal Sekarang`}
            </button>

            {/* Jika hanya 1 file: unduh langsung berformat .docx tanpa ZIP */}
            {doneCount === 1 && (
              <button
                onClick={() => {
                  const singleDone = articles.find((a) => a.status === 'done' && a.resultBlob);
                  if (singleDone) handleDownloadSingle(singleDone);
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                Unduh Artikel Terformat (.docx)
              </button>
            )}

            {/* Jika lebih dari 1 file: unduh seluruh berkas dalam bentuk .ZIP */}
            {doneCount > 1 && (
              <button
                onClick={handleDownloadAllZip}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <FolderArchive className="w-4 h-4" />
                Unduh Semua Artikel Selesai ({doneCount} File .ZIP)
              </button>
            )}
          </div>

          {/* 4. PREVIEW TAMPILAN KERTAS DOKUMEN AKTIF */}
          {activeArticle?.parsedDoc && selectedTemplate && (
            <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-xs text-slate-200">
                    Pratinjau Kertas: {activeArticle.fileName}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Template: <b className="text-slate-200">{selectedTemplate.headerTitle || selectedTemplate.name}</b>
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl overflow-auto max-h-[600px]">
                <DocumentPaperPreview
                  doc={activeArticle.parsedDoc}
                  template={selectedTemplate}
                  zoomLevel={0.85}
                />
              </div>
            </section>
          )}
        </main>
      )}

      {/* MODE 2: STUDIO & REPOSITORY LENGKAP (7 Sub-halaman) */}
      {viewMode === 'studio' && (
        <div className="flex min-h-[calc(100vh-65px)]">
          {/* Sidebar */}
          <Sidebar
            currentPage={currentNavPage}
            onNavigate={(page) => setCurrentNavPage(page)}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Studio Content Container */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            <Header
              currentPage={currentNavPage}
              onNavigate={(page) => setCurrentNavPage(page)}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            />

            <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
              {currentNavPage === 'dashboard' && (
                <Dashboard
                  onNavigate={(page) => setCurrentNavPage(page)}
                  onOpenAddTemplateModal={() => {
                    setEditingTemplate(null);
                    setIsTemplateModalOpen(true);
                  }}
                  onSelectTemplateForFormat={(tpl) => {
                    setSelectedTemplate(tpl);
                    setCurrentNavPage('format');
                  }}
                />
              )}

              {currentNavPage === 'templates' && (
                <Templates
                  templates={savedTemplates}
                  onAddTemplate={() => {
                    setEditingTemplate(null);
                    setIsTemplateModalOpen(true);
                  }}
                  onEditTemplate={(tpl) => {
                    setEditingTemplate(tpl);
                    setIsTemplateModalOpen(true);
                  }}
                  onDeleteTemplate={async (id) => {
                    await deleteSavedTemplate(id);
                    await loadSavedTemplates();
                    showToast('Template berhasil dihapus.');
                  }}
                  onSelectForFormatting={(tpl) => {
                    setSelectedTemplate(tpl);
                    setCurrentNavPage('format');
                  }}
                  onResetDefaults={async () => {
                    await storageService.resetToDefaults();
                    await loadSavedTemplates();
                    showToast('Template direset ke default.');
                  }}
                />
              )}

              {currentNavPage === 'format' && (
                <FormatArticle
                  templates={savedTemplates}
                  selectedTemplateFromProps={selectedTemplate}
                  onNavigate={(page) => setCurrentNavPage(page)}
                />
              )}

              {currentNavPage === 'analyze' && (
                <DocumentAnalyzerView
                  onNavigateToFormat={(_doc) => {
                    setCurrentNavPage('format');
                  }}
                />
              )}

              {currentNavPage === 'preview' && (
                <PreviewResult
                  document={activeArticle?.parsedDoc || null}
                  templates={savedTemplates}
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
                  onLoadSampleIfEmpty={() => setCurrentNavPage('format')}
                />
              )}

              {currentNavPage === 'history' && <History />}

              {currentNavPage === 'settings' && (
                <Settings
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                  onResetTemplatesToDefault={async () => {
                    await storageService.resetToDefaults();
                    await loadSavedTemplates();
                    showToast('Konfigurasi template berhasil dipulihkan.');
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Master Template */}
      <TemplateConfigModal
        isOpen={isTemplateModalOpen}
        initialTemplate={editingTemplate}
        onClose={() => setIsTemplateModalOpen(false)}
        onSave={async (tpl) => {
          await saveTemplateToStorage(tpl);
          await loadSavedTemplates();
          setIsTemplateModalOpen(false);
          showToast(`Template "${tpl.name}" berhasil disimpan!`);
        }}
      />
    </div>
  );
}

export default TemplateJurnalManager;
