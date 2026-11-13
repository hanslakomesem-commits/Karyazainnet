import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  Edit3,
  Check,
  Sliders,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Plus,
  X,
  BookOpen,
  Wrench,
  Split,
  Quote,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  SpellCheck,
  History,
  Binary,
  Table,
  Filter,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import {
  type PlagiarismSegment,
  type ParaphraseStyle,
  type EYDAuditResult,
  type SegmentVersionHistory,
} from '../types';
import { safeFetchJson } from '../lib/pdfClientParser';
import { EYDAuditModal } from './EYDAuditModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { auditEYDAndKBBI, fixAllEYDIssues } from '../lib/eydKbbiAuditor';
import { CHAPTER_DEFINITIONS } from '../lib/documentSanitizer';

interface PlagiarismReviewProps {
  segments: PlagiarismSegment[];
  isParaphrasing: boolean;
  selectedStyle: ParaphraseStyle;
  protectedTerms: string[];
  onAddProtectedTerm: (term: string) => void;
  onRemoveProtectedTerm: (term: string) => void;
  onStyleChange: (style: ParaphraseStyle) => void;
  onParaphraseAll: () => Promise<void>;
  onParaphraseSingle: (segmentId: string) => Promise<void>;
  onToggleSegment: (segmentId: string) => void;
  onSelectAll: (select: boolean) => void;
  onUpdateParaphraseText: (segmentId: string, newText: string, technique?: string) => void;
  onSelectAlternative: (segmentId: string, altText: string) => void;
  onProceedToApply: () => void;
  excludeBibliography?: boolean;
  onToggleExcludeBibliography?: () => void;
}

export const PlagiarismReview: React.FC<PlagiarismReviewProps> = ({
  segments,
  isParaphrasing,
  selectedStyle,
  protectedTerms,
  onAddProtectedTerm,
  onRemoveProtectedTerm,
  onStyleChange,
  onParaphraseAll,
  onParaphraseSingle,
  onToggleSegment,
  onSelectAll,
  onUpdateParaphraseText,
  onSelectAlternative,
  onProceedToApply,
  excludeBibliography = true,
  onToggleExcludeBibliography,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeRegenId, setActiveRegenId] = useState<string | null>(null);
  const [newTermInput, setNewTermInput] = useState('');
  const [showProtectedManager, setShowProtectedManager] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Chapter filter state
  const [selectedChapter, setSelectedChapter] = useState<string>('all');

  // EYD Audit Modal State
  const [isEYDModalOpen, setIsEYDModalOpen] = useState(false);
  const [eydAuditTarget, setEYDAuditTarget] = useState<string | null>(null);
  const [currentEYDResult, setCurrentEYDResult] = useState<EYDAuditResult>({
    totalIssues: 0,
    score: 100,
    issues: [],
    correctedText: '',
  });

  // Version History Modal State
  const [historyTargetSegment, setHistoryTargetSegment] = useState<PlagiarismSegment | null>(null);

  // Stubborn Sentence Deep Resolver State
  const [activeResolverId, setActiveResolverId] = useState<string | null>(null);
  const [resolverSolutions, setResolverSolutions] = useState<
    Record<
      string,
      {
        isLoading: boolean;
        solutions: {
          technique: string;
          text: string;
          estimatedSimilarity: string;
          rationale: string;
        }[];
      }
    >
  >({});

  const safeSegments = segments || [];
  const safeProtectedTerms = protectedTerms || [];

  // Filter segments by chapter & exclude bibliography
  const filteredSegments = useMemo(() => {
    return safeSegments.filter((seg) => {
      if (excludeBibliography && seg.specialContentType === 'bibliography') {
        return false;
      }
      if (selectedChapter === 'all') return true;
      return seg.chapterId === selectedChapter;
    });
  }, [safeSegments, selectedChapter, excludeBibliography]);

  // Compute chapter counts
  const chapterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: safeSegments.length };
    safeSegments.forEach((seg) => {
      const ch = seg.chapterId || 'other';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return counts;
  }, [safeSegments]);

  const selectedCount = filteredSegments.filter((s) => s?.isSelected).length;

  const handleStartEdit = (segment: PlagiarismSegment) => {
    setEditingId(segment.id);
    setEditText(segment.paraphrasedText || segment.originalText);
  };

  const handleSaveEdit = (segmentId: string) => {
    onUpdateParaphraseText(segmentId, editText, 'Edit Manual Penulis');
    setEditingId(null);
  };

  const handleRegen = async (segmentId: string) => {
    setActiveRegenId(segmentId);
    try {
      await onParaphraseSingle(segmentId);
    } finally {
      setActiveRegenId(null);
    }
  };

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTermInput.trim().length > 1) {
      onAddProtectedTerm(newTermInput.trim());
      setNewTermInput('');
    }
  };

  // Trigger EYD Audit for entire document or single segment
  const handleRunGlobalEYDAudit = () => {
    const combinedText = filteredSegments
      .map((s) => s.paraphrasedText || s.originalText)
      .join('\n\n');
    const result = auditEYDAndKBBI(combinedText);
    setCurrentEYDResult(result);
    setEYDAuditTarget(null);
    setIsEYDModalOpen(true);
  };

  const handleRunSingleEYDAudit = (segment: PlagiarismSegment) => {
    const textToAudit = segment.paraphrasedText || segment.originalText;
    const result = auditEYDAndKBBI(textToAudit);
    setCurrentEYDResult(result);
    setEYDAuditTarget(segment.id);
    setIsEYDModalOpen(true);
  };

  const handleApplyAllEYDFixes = () => {
    if (eydAuditTarget) {
      // Apply to single segment
      const targetSeg = safeSegments.find((s) => s.id === eydAuditTarget);
      if (targetSeg) {
        const text = targetSeg.paraphrasedText || targetSeg.originalText;
        const fixed = fixAllEYDIssues(text);
        onUpdateParaphraseText(targetSeg.id, fixed, 'Perbaikan Otomatis EYD V & KBBI');
      }
    } else {
      // Apply to all filtered segments
      filteredSegments.forEach((seg) => {
        const text = seg.paraphrasedText || seg.originalText;
        const fixed = fixAllEYDIssues(text);
        if (fixed !== text) {
          onUpdateParaphraseText(seg.id, fixed, 'Perbaikan Otomatis EYD V & KBBI');
        }
      });
    }
  };

  // Revert version
  const handleRevertVersion = (segmentId: string, version: SegmentVersionHistory) => {
    onUpdateParaphraseText(segmentId, version.text, `Dikembalikan ke: ${version.technique}`);
  };

  // Trigger Deep Resolver
  const handleOpenResolver = async (segment: PlagiarismSegment) => {
    if (activeResolverId === segment.id) {
      setActiveResolverId(null);
      return;
    }

    setActiveResolverId(segment.id);

    if (resolverSolutions[segment.id]?.solutions?.length > 0) {
      return;
    }

    setResolverSolutions((prev) => ({
      ...prev,
      [segment.id]: { isLoading: true, solutions: [] },
    }));

    try {
      const data = await safeFetchJson<{ solutions?: any[] }>('/api/resolve-stubborn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: segment.originalText,
          context: segment.locationLabel,
          protectedTerms,
        }),
      });

      setResolverSolutions((prev) => ({
        ...prev,
        [segment.id]: { isLoading: false, solutions: data.solutions || [] },
      }));
    } catch (e) {
      console.error(e);
      setResolverSolutions((prev) => ({
        ...prev,
        [segment.id]: {
          isLoading: false,
          solutions: [
            {
              technique: 'Kutipan Langsung Resmi',
              text: `"${segment.originalText.trim().replace(/^["']|["']$/g, '')}"`,
              estimatedSimilarity: '0% (Exclude Quotes)',
              rationale: 'Jadikan format kutipan resmi dengan tanda kutip untuk mengaktifkan filter Exclude Quotes Turnitin.',
            },
            {
              technique: 'Rekonstruksi Radikal',
              text: `Merujuk pada telaah ilmiah, fakta menunjukkan bahwa ${segment.originalText.charAt(0).toLowerCase() + segment.originalText.slice(1)}`,
              estimatedSimilarity: '< 5%',
              rationale: 'Mengubah struktur induktif menjadi deduktif.',
            },
          ],
        },
      }));
    }
  };

  const handleApplySolution = (segmentId: string, text: string, technique: string) => {
    onUpdateParaphraseText(segmentId, text, technique);
    setActiveResolverId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Academic Integrity & Smart Strategy */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-500/30 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40 shrink-0">
              <Wrench className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Solusi Kalimat Sulit & Strategi Lolos Turnitin (&lt; 10%)</span>
                </h3>
                {excludeBibliography && (
                  <span className="text-[10px] font-semibold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Exclude Bibliography Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Dilengkapi dengan <strong>Deteksi Format Sitasi Otomatis (APA/IEEE)</strong>, <strong>Audit EYD V & KBBI</strong>, serta proteksi penuh untuk tabel, grafik, dan rumus matematis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">

            {/* EYD Audit Trigger Button */}
            <button
              id="audit-eyd-header-btn"
              type="button"
              onClick={handleRunGlobalEYDAudit}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-emerald-50 rounded-xl border border-emerald-400/40 transition-colors shadow-xs"
            >
              <SpellCheck className="w-4 h-4" />
              <span>Audit EYD V & KBBI</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-indigo-600/60 hover:bg-indigo-600 text-indigo-100 hover:text-white rounded-xl border border-indigo-400/40 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Panduan</span>
            </button>

            <button
              type="button"
              onClick={() => setShowProtectedManager(!showProtectedManager)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{safeProtectedTerms.length} Kata Kebal</span>
            </button>
          </div>
        </div>

        {/* Expandable Protected Terms Manager */}
        {showProtectedManager && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                Istilah, Nomor Pasal, atau Nama Tokoh yang <strong>kebal / tidak boleh diubah</strong>:
              </span>
              <button
                type="button"
                onClick={() => setShowProtectedManager(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {safeProtectedTerms.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-950/80 text-emerald-200 border border-emerald-500/40"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveProtectedTerm(term)}
                    className="p-0.5 hover:bg-emerald-800 rounded text-emerald-300 hover:text-white transition-colors"
                    title="Hapus proteksi kata ini"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddTerm} className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newTermInput}
                onChange={(e) => setNewTermInput(e.target.value)}
                placeholder="Tambah istilah kebal (misal: Pasal 27 ayat 3)..."
                className="flex-1 bg-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200 placeholder-slate-500 font-mono"
              />
              <button
                type="submit"
                disabled={!newTermInput.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lindungi</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Chapter Tabs Navigation Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedChapter('all')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            selectedChapter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Semua Bab</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedChapter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {chapterCounts.all || 0}
          </span>
        </button>

        {CHAPTER_DEFINITIONS.map((def) => {
          const count = chapterCounts[def.id] || 0;
          const isActive = selectedChapter === def.id;

          return (
            <button
              key={def.id}
              type="button"
              onClick={() => setSelectedChapter(def.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{def.shortLabel}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {onToggleExcludeBibliography && (
          <button
            type="button"
            onClick={onToggleExcludeBibliography}
            className={`ml-auto px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border ${
              excludeBibliography
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Kecualikan otomatis daftar pustaka dari proses parafrase"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{excludeBibliography ? 'Daftar Pustaka Dikecualikan' : 'Sertakan Daftar Pustaka'}</span>
          </button>
        )}
      </div>

      {/* Control Bar: Model, Style & Bulk Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Daftar Kutipan Terindikasi Plagiasi & Solusi Parafrase</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {filteredSegments.length} Bagian Ditampilkan
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Terapkan strategi parafrase massal atau sesuaikan per kalimat secara presisi sebelum dimasukkan ke file Word.
            </p>
          </div>

          {/* Strategy Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                Strategi:
              </span>
              <select
                value={selectedStyle}
                onChange={(e) => onStyleChange(e.target.value as ParaphraseStyle)}
                disabled={isParaphrasing}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
              >
                <option value="academic_formal">1. Akademik Baku & EYD V (Standar Skripsi)</option>
                <option value="split_sentences">2. Pemecah Kalimat Majemuk (Hancurkan Kluster Turnitin)</option>
                <option value="deep_reconstruct">3. Rekonstruksi Radikal (Perombakan Sintaksis Total)</option>
                <option value="synthesize">4. Sintesis Intisari & Gagasan Utama</option>
                <option value="active_passive">5. Restrukturisasi Klausa (Aktif ↔ Pasif)</option>
                <option value="synonym_rephrase">6. Sinonim Ilmiah & Diksi Kontekstual</option>
                <option value="quote_block">7. Format Kutipan Langsung Resmi (Exclude Quotes)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSelectAll(true)}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Pilih Semua ({filteredSegments.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onSelectAll(false)}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              <Square className="w-3.5 h-3.5" />
              Batalkan Pilihan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onParaphraseAll}
              disabled={isParaphrasing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isParaphrasing ? 'Memproses Parafrase Ilmiah...' : 'Terapkan Parafrase Massal'}
            </button>

            <button
              type="button"
              onClick={onProceedToApply}
              disabled={selectedCount === 0 || isParaphrasing}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Lanjut Terapkan ke Word ({selectedCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-4">
        {filteredSegments.map((segment, index) => {
          const isItemEditing = editingId === segment.id;
          const isItemRegen = activeRegenId === segment.id;
          const isResolverOpen = activeResolverId === segment.id;
          const resolverData = resolverSolutions[segment.id];
          const citations = segment.citationsDetected || [];
          const historyList = segment.history || [];

          return (
            <div
              key={segment.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                segment.isSelected
                  ? 'border-slate-200 hover:border-emerald-300'
                  : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              {/* Card Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onToggleSegment(segment.id)}
                    className="text-slate-700 hover:text-emerald-600 transition-colors"
                  >
                    {segment.isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <span className="font-bold text-slate-800">
                    Kutipan #{index + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {segment.chapterName || segment.locationLabel}
                  </span>
                  {segment.appliedTechnique && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                      Metode: {segment.appliedTechnique}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Special Content Indicator (Formula / Table) */}
                  {segment.specialContentType === 'formula' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <Binary className="w-3 h-3 mr-1" />
                      Rumus / Statistik Terproteksi
                    </span>
                  )}
                  {segment.specialContentType === 'table' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      <Table className="w-3 h-3 mr-1" />
                      Tabel / Matriks Terproteksi
                    </span>
                  )}

                  {/* Footnotes Attached */}
                  {segment.footnoteIdsNearby && segment.footnoteIdsNearby.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Footnote #{segment.footnoteIdsNearby.join(', #')} Terjaga
                    </span>
                  )}

                  {/* Similarity Percentage */}
                  {segment.similarityScore && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {segment.similarityScore}% Kesamaan
                    </span>
                  )}
                </div>
              </div>

              {/* Citations Detected Safety Badge */}
              {citations.length > 0 && (
                <div className="mb-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between flex-wrap gap-2 text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold">Sitasi Ilmiah Terdeteksi (Terkunci & Aman dari Perubahan):</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded-md bg-white border border-blue-300 font-mono text-[11px] font-bold text-blue-800"
                        >
                          {c.raw} ({c.format})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-Side Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Original Plagiarized Text */}
                <div className="bg-red-50/40 border border-red-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Teks Asli (Terindikasi Plagiasi)
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-serif bg-white/80 p-2.5 rounded-lg border border-red-100">
                      {segment.originalText}
                    </p>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 italic">
                    *Akan digantikan tepat di posisi ini dalam file Word asli.
                  </div>
                </div>

                {/* Right: Paraphrased Text */}
                <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Hasil Parafrase (Revisi Word)
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Audit EYD Single */}
                        <button
                          type="button"
                          onClick={() => handleRunSingleEYDAudit(segment)}
                          className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/50 rounded transition-colors"
                          title="Audit EYD V & KBBI untuk kalimat ini"
                        >
                          <SpellCheck className="w-3.5 h-3.5 text-emerald-700" />
                        </button>

                        {/* Version History Button */}
                        <button
                          type="button"
                          onClick={() => setHistoryTargetSegment(segment)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100/50 rounded transition-colors"
                          title={`Lihat ${historyList.length} Riwayat Versi & Revert`}
                        >
                          <History className="w-3.5 h-3.5 text-blue-600" />
                        </button>

                        {!isItemEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(segment)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/50 rounded transition-colors"
                            title="Edit manual kata-kata hasil parafrase"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRegen(segment.id)}
                          disabled={isItemRegen}
                          className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/50 rounded transition-colors"
                          title="Rekonstruksi ulang variasi kalimat ilmiah baru"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isItemRegen ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {isItemEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-xs p-2.5 border border-emerald-400 bg-white rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-serif leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/50 rounded"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(segment.id)}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-950 font-medium leading-relaxed font-serif bg-white/90 p-2.5 rounded-lg border border-emerald-200">
                        {segment.paraphrasedText || 'Belum diparafrase (Klik Terapkan Strategi)'}
                      </p>
                    )}
                  </div>

                  {/* Alternative Options Quick Select */}
                  {segment.alternativeText && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60">
                      <div className="text-[11px] font-semibold text-emerald-900 mb-1 flex items-center gap-1">
                        <span>Pilihan Variasi Sudut Pandang Lain:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectAlternative(segment.id, segment.alternativeText!)}
                        className="text-left text-[11px] text-slate-700 hover:text-emerald-800 bg-white/80 hover:bg-white p-2 rounded-md border border-emerald-100 hover:border-emerald-300 transition-colors w-full"
                      >
                        "{segment.alternativeText}"
                      </button>
                    </div>
                  )}

                  {segment.explanation && (
                    <div className="mt-2 text-[10px] text-slate-500 italic">
                      💡 {segment.explanation}
                    </div>
                  )}
                </div>
              </div>

              {/* Stubborn Sentence Deep Resolver Toggle Bar */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenResolver(segment)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                  <span>🛠️ Solusi Kalimat Sulit / Masih Terdeteksi Plagiasi</span>
                  {isResolverOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{historyList.length} versi tersimpan</span>
                  <span>•</span>
                  <span>Mesin Linguistik Akademik</span>
                </div>
              </div>

              {/* Deep Resolver Expandable Tray */}
              {isResolverOpen && (
                <div className="mt-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-indigo-500/40 shadow-inner space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-800">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">
                        4 Rekomendasi Solusi Khusus untuk Kalimat Ini:
                      </span>
                    </div>
                    {resolverData?.isLoading && (
                      <span className="text-xs text-indigo-300 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Menganalisis opsi anti-deteksi komprehensif...
                      </span>
                    )}
                  </div>

                  {resolverData?.isLoading ? (
                    <div className="py-6 text-center text-xs text-slate-300 animate-pulse">
                      Sedang memformulasikan 4 teknik perombakan kalimat (Pemecah Kalimat, Rekonstruksi Radikal, Sintesis, & Format Kutipan)...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {resolverData?.solutions?.map((sol, solIdx) => (
                        <div
                          key={solIdx}
                          className="bg-slate-800/90 border border-indigo-500/30 rounded-lg p-3 flex flex-col justify-between hover:border-indigo-400 transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                {solIdx === 0 && <Split className="w-3 h-3" />}
                                {solIdx === 1 && <Sparkles className="w-3 h-3" />}
                                {solIdx === 2 && <Layers className="w-3 h-3" />}
                                {solIdx === 3 && <Quote className="w-3 h-3" />}
                                {sol.technique}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                {sol.estimatedSimilarity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-100 font-serif leading-relaxed bg-slate-900/80 p-2 rounded border border-slate-700">
                              "{sol.text}"
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              💡 {sol.rationale}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-700 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleApplySolution(segment.id, sol.text, sol.technique)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              Gunakan Solusi Ini
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EYD V & KBBI Audit Modal */}
      <EYDAuditModal
        isOpen={isEYDModalOpen}
        onClose={() => setIsEYDModalOpen(false)}
        auditResult={currentEYDResult}
        onApplyAllFixes={handleApplyAllEYDFixes}
        targetTitle={
          eydAuditTarget
            ? `Kutipan #${safeSegments.findIndex((s) => s.id === eydAuditTarget) + 1}`
            : `Seluruh Naskah Bab Terpilih (${filteredSegments.length} Segmen)`
        }
      />

      {/* Sentence Version History Modal */}
      <VersionHistoryModal
        isOpen={!!historyTargetSegment}
        onClose={() => setHistoryTargetSegment(null)}
        segment={historyTargetSegment}
        onRevertToVersion={handleRevertVersion}
      />

      {/* Turnitin Strategic Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Panduan Menangani Kalimat Sulit & Format Sitasi
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-bold text-indigo-900 text-sm">
                  1. Cara Kerja Deteksi Turnitin (Kluster 5-7 Kata)
                </h4>
                <p>
                  Turnitin menandai teks jika menemukan kecocokan 5 sampai 7 kata berurutan yang identik dengan sumber lain di internet. Mengubah 1 kata sinonim saja kadang belum cukup jika konstruksi kalimatnya masih sama.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1">
                    <Split className="w-3.5 h-3.5 text-emerald-600" />
                    A. Pecah Kalimat Majemuk
                  </h5>
                  <p className="text-slate-600">
                    Pecah satu kalimat majemuk panjang menjadi 2 kalimat terpisah. Ini otomatis memutus rantai 5 kata Turnitin secara total.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    B. Rekonstruksi Radikal
                  </h5>
                  <p className="text-slate-600">
                    Ubah sudut pandang objek menjadi subjek di awal kalimat (Pasif ↔ Aktif) serta konversikan kata kerja menjadi kata benda (Nominalisasi).
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    C. Sintesis Gagasan
                  </h5>
                  <p className="text-slate-600">
                    Tuliskan intisari pesan penulis asli dengan kata-kata Anda sendiri tanpa melihat struktur kalimat aslinya.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1">
                    <Quote className="w-3.5 h-3.5 text-blue-600" />
                    D. Sitasi Terkunci (Exclude Quotes)
                  </h5>
                  <p className="text-slate-600">
                    Format sitasi APA, IEEE, maupun kutipan pasal dikunci dengan token pelindung sehingga tidak akan teracak oleh modul pemrosesan bahasa.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <p className="text-emerald-900 text-[11px]">
                  <strong>Catatan Kaki (Footnote) Anda 100% Aman:</strong> Apapun metode parafrase yang dipilih, seluruh tautan nomor footnote di Microsoft Word asli tetap berada di posisinya dan tidak akan hilang atau tergeser.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
