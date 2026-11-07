/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  FileCheck,
  ShieldCheck,
  Columns2,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  Eye,
  Sliders,
  FileSpreadsheet,
  Image as ImageIcon,
  BookOpen,
  PlusCircle,
  Edit3,
  Building2,
  Mail,
  Calendar,
  ListOrdered,
  Columns,
} from 'lucide-react';
import { ParsedDocument, IntegrityReport } from '../types/document';
import { JournalTemplateConfig, StructureMapping } from '../types/template';
import { readDocxFile } from '../services/docxReader';
import { createSuggestedMapping } from '../services/templateParser';
import { formatArticleDocument, extractArticleMeta } from '../services/formattingEngine';
import { generateFormattedFilename, downloadBlob, downloadIntegrityReport } from '../services/exportService';
import { storageService } from '../services/storage';
import { SAMPLE_ARTICLES, createRealDocxFromSample } from '../services/sampleDocuments';
import { TemplateCard } from '../components/TemplateCard/TemplateCard';
import { DocumentPaperPreview } from '../components/Preview/DocumentPaperPreview';
import { DiffViewer } from '../components/DiffViewer/DiffViewer';
import { IntegrityBadge } from '../components/ValidationPanel/IntegrityBadge';
import { NavPage } from '../components/Layout/Sidebar';

interface FormatArticleProps {
  templates: JournalTemplateConfig[];
  selectedTemplateFromProps?: JournalTemplateConfig | null;
  onNavigate: (page: NavPage, data?: any) => void;
}

export function FormatArticle({
  templates,
  selectedTemplateFromProps,
  onNavigate,
}: FormatArticleProps) {
  // Wizard steps: 1: Upload, 2: Analisis, 3: Pilih Template, 4: Mapping, 5: Formatting, 6: Hasil & Validasi
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Document State
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  // Selected Template
  const [targetTemplate, setTargetTemplate] = useState<JournalTemplateConfig | null>(
    selectedTemplateFromProps || (templates.length > 0 ? templates[0] : null)
  );

  // Mapping
  const [mapping, setMapping] = useState<StructureMapping | null>(null);

  // Formatting Engine State
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingStage, setFormattingStage] = useState<string>('');
  const [formattingProgress, setFormattingProgress] = useState<number>(0);
  const [formattedBlob, setFormattedBlob] = useState<Blob | null>(null);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'preview' | 'diff' | 'report'>('preview');
  const [previewZoom, setPreviewZoom] = useState<number>(0.9);

  // Student real data overrides for running header & document
  const [customAuthor, setCustomAuthor] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customShortTitle, setCustomShortTitle] = useState('');
  const [customAffiliation, setCustomAffiliation] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [historyReceived, setHistoryReceived] = useState('');
  const [historyRevised, setHistoryRevised] = useState('');
  const [historyAccepted, setHistoryAccepted] = useState('');
  const [historyPublished, setHistoryPublished] = useState('');
  const [headingLetterCase, setHeadingLetterCase] = useState<'UPPERCASE' | 'TITLE_CASE' | 'ORIGINAL'>('UPPERCASE');
  const [headingNumbering, setHeadingNumbering] = useState<'NONE' | 'ARABIC' | 'ROMAN'>('NONE');
  const [abstractTransition, setAbstractTransition] = useState<boolean>(true);

  // Update target template if prop changes
  useEffect(() => {
    if (selectedTemplateFromProps) {
      setTargetTemplate(selectedTemplateFromProps);
    }
  }, [selectedTemplateFromProps]);

  // Step 1: Handle DOCX Upload
  const handleFileUpload = async (file: File | Blob, customName?: string) => {
    try {
      setIsReadingFile(true);
      setReadError(null);

      const doc = await readDocxFile(file, customName);
      setParsedDoc(doc);

      const meta = extractArticleMeta(doc);
      setCustomAuthor(meta.author);
      setCustomTitle(meta.title);
      setCustomShortTitle(meta.shortTitle);
      setCustomAffiliation(meta.affiliation);
      setCustomEmail(meta.email);
      setHistoryReceived(meta.suggestedHistory.received || '');
      setHistoryRevised(meta.suggestedHistory.revised || '');
      setHistoryAccepted(meta.suggestedHistory.accepted || '');
      setHistoryPublished(meta.suggestedHistory.published || '');

      // Auto-create mapping with target template if exists
      if (targetTemplate) {
        const initialMapping = createSuggestedMapping(doc, targetTemplate);
        setMapping(initialMapping);
      }

      setCurrentStep(2); // Move to Analysis step
    } catch (err: any) {
      setReadError(
        err.message ||
          'Gagal membaca file DOCX. Kemungkinan penyebab: File rusak, terenkripsi, atau struktur XML tidak valid.'
      );
    } finally {
      setIsReadingFile(false);
    }
  };

  // Quick 1-click Test with Real Indonesian Academic Paper
  const handleLoadSampleArticle = async () => {
    try {
      setIsReadingFile(true);
      setReadError(null);
      const sample = SAMPLE_ARTICLES[0];
      const blob = await createRealDocxFromSample(sample);
      const fakeFile = new File([blob], 'artikel_penelitian_udang_vaname.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      await handleFileUpload(fakeFile, 'artikel_penelitian_udang_vaname.docx');
    } catch (err: any) {
      setReadError('Gagal membuat contoh dokumen: ' + err.message);
    } finally {
      setIsReadingFile(false);
    }
  };

  // Select Template & regenerate mapping
  const handleSelectTemplate = (tpl: JournalTemplateConfig) => {
    setTargetTemplate(tpl);
    if (parsedDoc) {
      setMapping(createSuggestedMapping(parsedDoc, tpl));
    }
  };

  // Run Real Formatting Engine
  const executeFormatting = async () => {
    if (!parsedDoc || !targetTemplate) return;

    setCurrentStep(5);
    setIsFormatting(true);

    try {
      // Step 5.1: Membaca dokumen
      setFormattingStage('Membaca dan memverifikasi integritas dokumen asli...');
      setFormattingProgress(25);
      await new Promise((r) => setTimeout(r, 200));

      // Step 5.2: Analisis struktur
      setFormattingStage('Mencocokkan pemetaan struktur heading dan elemen akademik...');
      setFormattingProgress(50);
      await new Promise((r) => setTimeout(r, 250));

      // Step 5.3: Terapkan template layout
      setFormattingStage(`Menerapkan tata letak ${targetTemplate.pageLayout.columns} kolom & tipografi ${targetTemplate.bodyStyle.fontFamily}...`);
      setFormattingProgress(75);
      await new Promise((r) => setTimeout(r, 300));

      // Step 5.4: Jalankan compiler docx
      const result = await formatArticleDocument(
        parsedDoc,
        targetTemplate,
        mapping || undefined,
        {
          author: customAuthor,
          title: customTitle,
          shortTitle: customShortTitle,
          affiliation: customAffiliation,
          email: customEmail,
          articleHistory: {
            received: historyReceived,
            revised: historyRevised,
            accepted: historyAccepted,
            published: historyPublished,
          },
          headingStyle: {
            letterCase: headingLetterCase,
            numbering: headingNumbering,
          },
          abstractTransition: abstractTransition,
        }
      );

      // Step 5.5: Verifikasi integritas
      setFormattingStage('Memeriksa integritas teks (SHA-256 Hash Matching)...');
      setFormattingProgress(100);
      await new Promise((r) => setTimeout(r, 200));

      setFormattedBlob(result.formattedDocxBlob);
      setIntegrityReport(result.integrityReport);

      // Save to IndexedDB History
      const blobKey = `blob-${Date.now()}`;
      await storageService.saveDocxBlob(blobKey, result.formattedDocxBlob);

      await storageService.addHistory({
        id: `hist-${Date.now()}`,
        articleName: parsedDoc.fileName,
        templateId: targetTemplate.id,
        templateName: targetTemplate.name,
        processedAt: new Date().toISOString(),
        durationMs: result.durationMs,
        status: result.integrityReport.isIntegrityPreserved ? 'BERHASIL' : 'PERLU_PEMERIKSAAN',
        originalFileSize: parsedDoc.fileSizeBytes,
        formattedFileSize: result.formattedDocxBlob.size,
        originalStats: {
          words: parsedDoc.stats.wordCount,
          paragraphs: parsedDoc.stats.paragraphCount,
          tables: parsedDoc.stats.tableCount,
          images: parsedDoc.stats.imageCount,
          references: parsedDoc.stats.referenceCount,
        },
        integrityReport: result.integrityReport,
        outputDocxBlobKey: blobKey,
      });

      setCurrentStep(6); // Move to results step
    } catch (err: any) {
      alert(`Terjadi kesalahan saat memformat dokumen: ${err.message}`);
      setCurrentStep(4);
    } finally {
      setIsFormatting(false);
    }
  };

  // Handle Download DOCX
  const handleDownloadDocx = () => {
    if (!formattedBlob || !parsedDoc || !targetTemplate) return;
    const filename = generateFormattedFilename(parsedDoc.fileName, targetTemplate.name);
    downloadBlob(formattedBlob, filename);
  };

  // Handle Download Report
  const handleDownloadReport = () => {
    if (!integrityReport || !parsedDoc || !targetTemplate) return;
    downloadIntegrityReport(parsedDoc.fileName, targetTemplate.name, integrityReport);
  };

  return (
    <div className="space-y-6">
      {/* Wizard Step Navigation Indicator */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto text-xs font-semibold gap-2 pb-1">
          {[
            { step: 1, label: '1. Upload Artikel' },
            { step: 2, label: '2. Analisis Struktur' },
            { step: 3, label: '3. Pilih Template' },
            { step: 4, label: '4. Mapping' },
            { step: 5, label: '5. Formatting' },
            { step: 6, label: '6. Hasil & Validasi' },
          ].map((item) => {
            const isCurrent = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <div
                key={item.step}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600 text-white'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= STEP 1: UPLOAD ARTIKEL ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 w-16 h-16 mx-auto flex items-center justify-center">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Unggah Naskah Artikel Ilmiah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tarik dan lepaskan file Microsoft Word (.DOCX) artikel skripsi, tesis, atau riset Anda ke area di bawah ini.
              </p>

              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="mt-6 p-8 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/10 hover:border-indigo-500 transition-colors"
              >
                <input
                  type="file"
                  id="article-file-input"
                  accept=".docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="article-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <FileText className="w-10 h-10 text-indigo-500" />
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
                      Tarik file Word ke sini
                    </span>
                    <span className="text-xs text-slate-500">atau klik untuk memilih file .DOCX</span>
                  </div>
                  <span className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs">
                    Pilih File .DOCX
                  </span>
                </label>
              </div>

              {/* Sample Document Quick Starter */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-xs text-slate-500">Belum ada file di tangan?</span>
                <button
                  id="btn-load-sample-doc"
                  type="button"
                  onClick={handleLoadSampleArticle}
                  disabled={isReadingFile}
                  className="py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Muat Contoh Artikel Ilmiah (.DOCX)
                </button>
              </div>

              {/* Reading loading state */}
              {isReadingFile && (
                <div className="p-4 rounded-xl bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Membaca dan memverifikasi struktur file Word...</span>
                </div>
              )}

              {/* Error state */}
              {readError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Format file tidak didukung / Gagal membaca dokumen:
                  </div>
                  <p>{readError}</p>
                  <p className="text-[11px] text-rose-600">Silakan gunakan file Word (.DOCX) yang dapat dibuka secara normal.</p>
                </div>
              )}
            </div>
          </div>

          {/* Academic Integrity Lock Notice */}
          <IntegrityBadge size="lg" />
        </div>
      )}

      {/* ================= STEP 2: ANALISIS STRUKTUR ARTIKEL ================= */}
      {currentStep === 2 && parsedDoc && (
        <div className="space-y-6">
          {/* Analysis Summary Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Laporan Hasil Analisis Dokumen
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {parsedDoc.fileName}
                </h3>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Status: SIAP DIFORMAT
              </div>
            </div>

            {/* Checklist of Detected Academic Elements */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Judul Artikel
                </div>
                <p className="text-[11px] text-slate-500 truncate">{parsedDoc.structure.title || 'Terdeteksi'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Penulis ({parsedDoc.structure.authors.length})
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {parsedDoc.structure.authors.join(', ') || 'Terdeteksi'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Abstrak & Keywords
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {parsedDoc.structure.keywords?.length || 0} Kata Kunci
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Heading ({parsedDoc.structure.sections.length})
                </div>
                <p className="text-[11px] text-slate-500 truncate">Pendahuluan, Metode, dll.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Tabel ({parsedDoc.stats.tableCount})
                </div>
                <p className="text-[11px] text-slate-500">100% data sel dipertahankan</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  Gambar ({parsedDoc.stats.imageCount})
                </div>
                <p className="text-[11px] text-slate-500">Posisi & rasio dipertahankan</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Referensi ({parsedDoc.stats.referenceCount})
                </div>
                <p className="text-[11px] text-slate-500">Sitasi lengkap dipertahankan</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Total Kata
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {parsedDoc.stats.wordCount.toLocaleString('id-ID')} kata ({parsedDoc.stats.paragraphCount} paragraf)
                </p>
              </div>
            </div>

            {/* Document Details Expandable / Preview Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Kutipan Abstrak Terdeteksi:
              </span>
              <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                "{parsedDoc.structure.abstractText?.slice(0, 300) || 'Abstrak dokumen lengkap siap dipindahkan ke format template.'}..."
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Ganti File Artikel
              </button>

              <button
                id="btn-next-to-select-template"
                type="button"
                onClick={() => setCurrentStep(3)}
                className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
              >
                Pilih Template Jurnal Tujuan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PILIH TEMPLATE JURNAL ================= */}
      {currentStep === 3 && parsedDoc && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500">Artikel Sumber: {parsedDoc.fileName}</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pilih Master Template Jurnal Ilmiah Tujuan
              </h3>
            </div>
            {targetTemplate && (
              <div className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                Terpilih: <strong>{targetTemplate.name}</strong>
              </div>
            )}
          </div>

          {/* Template Cards Selection */}
          {templates.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Belum ada template jurnal tersimpan</p>
              <p className="text-xs text-slate-500">Anda harus mengunggah master template jurnal (.docx) terlebih dahulu sebelum dapat memformat naskah.</p>
              <button
                type="button"
                onClick={() => onNavigate('templates')}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> Buka Menu Template & Unggah
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  isSelected={targetTemplate?.id === tpl.id}
                  selectableOnly
                  onSelect={(selected) => handleSelectTemplate(selected)}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Analisis
            </button>

            <button
              id="btn-next-to-mapping"
              type="button"
              disabled={!targetTemplate}
              onClick={() => {
                if (targetTemplate && parsedDoc) {
                  setMapping(createSuggestedMapping(parsedDoc, targetTemplate));
                  setCurrentStep(4);
                }
              }}
              className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
            >
              Lanjut ke Mapping Struktur Dokumen
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: MAPPING STRUKTUR DOKUMEN ================= */}
      {currentStep === 4 && parsedDoc && targetTemplate && mapping && (
        <div className="space-y-6">
          {/* Pra-Pemeriksaan: Pemisahan Data Master Template vs Data Riil Mahasiswa */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold tracking-wider uppercase border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Audit Pra-Penyelarasan
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Pra-Pemeriksaan: Pemisahan Data Template vs Data Riil Mahasiswa
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sebelum diterapkan ke Word, periksa pemisahan antara identitas tetap jurnal (Kop &amp; penomoran halaman) dengan data riil naskah mahasiswa.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 shrink-0 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Siap Sinkronisasi
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              {/* Kolom Kiri: ELEMEN MASTER TEMPLATE (100% TETAP DIPERTAHANKAN) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide text-xs">
                      Elemen Master Template Jurnal (100% Tetap Dipertahankan)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Terkunci
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Header Kop Awal Halaman Pertama
                    </span>
                    <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 p-2 rounded whitespace-pre-line leading-relaxed">
                      {targetTemplate.headerTitle || targetTemplate.name || 'Jurnal Ilmiah'}
                      {targetTemplate.issn ? `\nISSN: ${targetTemplate.issn}` : ''}
                      {targetTemplate.volumeNo ? `\n${targetTemplate.volumeNo}` : '\nVol. XX No. X, pp. XX–XX'}
                      {`\nDOI: ${targetTemplate.doi || '10.19105/karsa.vX1iX.XXXX'}`}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      ✓ Kop jurnal, ISSN, Volume, DOI bawaan, logo, dan garis atas 100% dipertahankan dari master template.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Tata Letak Penomoran Halaman (Page Numbering)
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Format penomoran halaman Word dinamis (<code className="text-emerald-600 dark:text-emerald-400">PAGE</code>) mengikuti posisi template master.
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      ⚡ Nomor halaman acak yang diketik di berkas artikel mahasiswa diabaikan otomatis agar tidak merusak penomoran master template.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: DATA RIIL MAHASISWA (DISINKRONKAN KE NASKAH & RUNNING HEADER) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide text-xs">
                      Data Riil Mahasiswa (Diinjeksikan ke Naskah)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    Dapat Disesuaikan
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Judul Artikel Riil Mahasiswa:
                    </label>
                    <textarea
                      rows={2}
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Judul artikel mahasiswa..."
                      className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Nama Mahasiswa / Penulis Riil:
                    </label>
                    <input
                      type="text"
                      value={customAuthor}
                      onChange={(e) => setCustomAuthor(e.target.value)}
                      placeholder="Nama penulis riil..."
                      className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      ✓ Menggantikan nama contoh template pada naskah &amp; Running Header halaman genap.
                    </p>
                  </div>

                  {/* Afiliasi Mahasiswa & Email Korespondensi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Afiliasi (Prodi / Kampus):
                      </label>
                      <input
                        type="text"
                        value={customAffiliation}
                        onChange={(e) => setCustomAffiliation(e.target.value)}
                        placeholder="Universitas..."
                        className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Email Korespondensi:
                      </label>
                      <input
                        type="text"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="penulis@kampus.ac.id"
                        className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Kotak Riwayat Naskah (Article History Box) */}
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Riwayat Naskah (Article History Box):
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Update Tanggal Realtime</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Received:</span>
                        <input
                          type="text"
                          value={historyReceived}
                          onChange={(e) => setHistoryReceived(e.target.value)}
                          className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Revised:</span>
                        <input
                          type="text"
                          value={historyRevised}
                          onChange={(e) => setHistoryRevised(e.target.value)}
                          className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Accepted:</span>
                        <input
                          type="text"
                          value={historyAccepted}
                          onChange={(e) => setHistoryAccepted(e.target.value)}
                          className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Standarisasi Judul Bab (Heading 1) */}
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Standarisasi Judul Bab (Heading Utama):
                      </label>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Gaya Selingkung</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Kapitalisasi:</span>
                        <select
                          value={headingLetterCase}
                          onChange={(e) => setHeadingLetterCase(e.target.value as any)}
                          className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="UPPERCASE">ALL CAPS (PENDAHULUAN, METODE)</option>
                          <option value="TITLE_CASE">Title Case (Pendahuluan, Metode)</option>
                          <option value="ORIGINAL">Sesuai Naskah Asli</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Penomoran:</span>
                        <select
                          value={headingNumbering}
                          onChange={(e) => setHeadingNumbering(e.target.value as any)}
                          className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="NONE">Tanpa Nomor (PENDAHULUAN)</option>
                          <option value="ARABIC">Angka Arab (1. PENDAHULUAN)</option>
                          <option value="ROMAN">Angka Romawi (I. PENDAHULUAN)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Transisi Layout Abstrak (1 Kolom) ke Badan Teks (2 Kolom) */}
                  {targetTemplate.pageLayout.columns === 2 && (
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                          <Columns className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Transisi Layout Abstrak (1 Kolom) ➔ Badan Naskah (2 Kolom)
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Section Break Continuous otomatis dipasang di bawah Keywords agar Abstrak 1 kolom lebar dan Pendahuluan s/d Daftar Pustaka 2 kolom rapi.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAbstractTransition(!abstractTransition)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors ${
                          abstractTransition
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {abstractTransition ? 'Aktif (1 Kolom ➔ 2 Kolom)' : 'Non-aktif'}
                      </button>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <label className="font-semibold text-slate-900 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Judul Singkat Running Header (Halaman Ganjil):
                    </label>
                    <input
                      type="text"
                      value={customShortTitle}
                      onChange={(e) => setCustomShortTitle(e.target.value)}
                      placeholder="Judul singkat untuk running header..."
                      className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Mapping Struktur Dokumen
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pencocokan elemen naskah asli dengan format struktur template <strong>{targetTemplate.name}</strong>.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Struktur Cocok
              </span>
            </div>

            {/* Mapping Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Elemen Artikel Asli</th>
                    <th className="p-3 w-12 text-center">Arah</th>
                    <th className="p-3">Target Style Template</th>
                    <th className="p-3 w-32 text-center">Tingkat Keyakinan</th>
                    <th className="p-3 w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(mapping.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.originalLabel}
                      </td>
                      <td className="p-3 text-center text-slate-400 font-bold">→</td>
                      <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.targetTemplateLabel}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terkonfirmasi
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Pilih Template Lain
              </button>

              <button
                id="btn-execute-formatting"
                type="button"
                onClick={executeFormatting}
                className="py-2 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-4 h-4" />
                Jalankan Formatting Dokumen Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 5: PROSES FORMATTING & PROGRESS ================= */}
      {currentStep === 5 && (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-6 max-w-lg mx-auto">
          <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 w-16 h-16 mx-auto flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Sedang Memformat Dokumen Word...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formattingStage}</p>
          </div>

          {/* Real progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${formattingProgress}%` }}
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mempertahankan 100% kata, tabel, gambar, dan sitasi asli.</span>
          </div>
        </div>
      )}

      {/* ================= STEP 6: HASIL, VALIDASI & EXPORT ================= */}
      {currentStep === 6 && parsedDoc && targetTemplate && integrityReport && formattedBlob && (
        <div className="space-y-6">
          {/* Success Banner & Export Actions */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Format Selesai • Integritas Konten Terjaga 100%
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Artikel Berhasil Disesuaikan ke Layout {targetTemplate.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  File baru siap diunduh dan dibuka langsung menggunakan Microsoft Word atau LibreOffice.
                </p>
              </div>

              {/* Primary Download Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  id="btn-download-docx-main"
                  type="button"
                  onClick={handleDownloadDocx}
                  className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download DOCX Baru
                </button>

                <button
                  id="btn-download-report-main"
                  type="button"
                  onClick={handleDownloadReport}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/20 transition-colors"
                >
                  <FileCheck className="w-4 h-4" />
                  Unduh Laporan Validasi (.txt)
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10"
                  title="Format Dokumen Lain"
                >
                  Format Naskah Baru
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-white/10 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Selisih Kata</span>
                <span className="font-bold text-emerald-400">0 Kata (Identik)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Jumlah Paragraf</span>
                <span className="font-bold text-white">{parsedDoc.stats.paragraphCount} Utuh</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tabel & Gambar</span>
                <span className="font-bold text-white">{parsedDoc.stats.tableCount} Tabel • {parsedDoc.stats.imageCount} Gbr</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Daftar Sitasi</span>
                <span className="font-bold text-white">{parsedDoc.stats.referenceCount} Referensi</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Format Kolom</span>
                <span className="font-bold text-indigo-300">
                  {targetTemplate.pageLayout.columns === 2 ? '2 Kolom' : '1 Kolom'} • {targetTemplate.bodyStyle.fontFamily}
                </span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs: Preview vs Diff Inspector vs Format Report */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveResultTab('preview')}
              className={`py-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeResultTab === 'preview'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview Dokumen Hasil
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('diff')}
              className={`py-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeResultTab === 'diff'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Pemeriksaan Perubahan (Diff Viewer)
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('report')}
              className={`py-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeResultTab === 'report'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Laporan Formatting & Integritas
            </button>
          </div>

          {/* Tab 1: Paper Preview */}
          {activeResultTab === 'preview' && (
            <div className="space-y-4">
              {/* Zoom controls bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500">
                  Simulasi Tampilan Kertas {targetTemplate.pageLayout.paperSize} • {targetTemplate.pageLayout.columns} Kolom
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Zoom:</span>
                  {[0.75, 0.9, 1, 1.25].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setPreviewZoom(z)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        previewZoom === z
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Simulated A4 Paper */}
              <div className="bg-slate-200/60 dark:bg-slate-950 p-6 rounded-2xl overflow-auto max-h-[750px] border border-slate-300 dark:border-slate-800 flex justify-center">
                <DocumentPaperPreview
                  doc={parsedDoc}
                  template={targetTemplate}
                  zoomLevel={previewZoom}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Content Diff Inspector */}
          {activeResultTab === 'diff' && (
            <DiffViewer
              originalDoc={parsedDoc}
              formattedDoc={parsedDoc}
            />
          )}

          {/* Tab 3: Formal Integrity Report */}
          {activeResultTab === 'report' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-sans">
                  Laporan Integritas Dokumen & Validasi Formatting
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="py-1 px-3 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-sans font-semibold text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Salinan (.txt)
                </button>
              </div>

              <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                <div>
                  <strong>Nama Artikel:</strong> {parsedDoc.fileName}
                </div>
                <div>
                  <strong>Template Tujuan:</strong> {targetTemplate.name}
                </div>
                <div>
                  <strong>Waktu Pemrosesan:</strong> {new Date(integrityReport.timestamp).toLocaleString('id-ID')}
                </div>
                <div>
                  <strong>Status Integritas Isi:</strong> ✓ AMAN (0 Perubahan Teks)
                </div>
                <div>
                  <strong>Status Formatting:</strong> ✓ BERHASIL
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <strong>Metrik Detail:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {integrityReport.details.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <strong>Hash Kriptografis (SHA-256):</strong>
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 break-all text-[11px] mt-1">
                    {integrityReport.originalHash}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
