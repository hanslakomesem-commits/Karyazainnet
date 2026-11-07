/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Eye,
  Download,
  FileCheck,
  Columns2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ParsedDocument } from '../types/document';
import { JournalTemplateConfig } from '../types/template';
import { DocumentPaperPreview } from '../components/Preview/DocumentPaperPreview';
import { DiffViewer } from '../components/DiffViewer/DiffViewer';
import { generateFormattedFilename, downloadBlob } from '../services/exportService';
import { formatArticleDocument } from '../services/formattingEngine';

interface PreviewResultProps {
  document: ParsedDocument | null;
  templates: JournalTemplateConfig[];
  selectedTemplate: JournalTemplateConfig | null;
  onSelectTemplate: (template: JournalTemplateConfig) => void;
  onLoadSampleIfEmpty: () => void;
}

export function PreviewResult({
  document,
  templates,
  selectedTemplate,
  onSelectTemplate,
  onLoadSampleIfEmpty,
}: PreviewResultProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [viewMode, setViewMode] = useState<'paper' | 'diff'>('paper');
  const [isExporting, setIsExporting] = useState(false);

  const activeTemplate = selectedTemplate || (templates.length > 0 ? templates[0] : null);

  const handleExport = async () => {
    if (!document || !activeTemplate) return;
    try {
      setIsExporting(true);
      const result = await formatArticleDocument(document, activeTemplate);
      const filename = generateFormattedFilename(document.fileName, activeTemplate.name);
      downloadBlob(result.formattedDocxBlob, filename);
    } catch (err: any) {
      alert('Gagal mengekspor dokumen: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!document || !activeTemplate) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 w-16 h-16 mx-auto flex items-center justify-center">
          <Eye className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
          Belum ada dokumen yang siap di-preview
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Silakan unggah artikel ilmiah Anda di menu Format Artikel atau muat artikel sampel untuk melihat simulasi visual halaman kertas A4.
        </p>
        <button
          type="button"
          onClick={onLoadSampleIfEmpty}
          className="mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          Muat Contoh Artikel untuk Preview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Template Selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Pilih Tampilan Template:</span>
          <select
            value={activeTemplate.id}
            onChange={(e) => {
              const found = templates.find((t) => t.id === e.target.value);
              if (found) onSelectTemplate(found);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.pageLayout.columns} Kolom - {t.bodyStyle.fontFamily})
              </option>
            ))}
          </select>
        </div>

        {/* View Mode & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('paper')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'paper' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Simulasi Kertas
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'diff' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Inspeksi Diff
            </button>
          </div>

          {viewMode === 'paper' && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px] w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Export Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Mengekspor...' : 'Export DOCX'}
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      {viewMode === 'paper' ? (
        <div className="bg-slate-200/70 dark:bg-slate-950 p-6 rounded-2xl overflow-auto max-h-[800px] border border-slate-300 dark:border-slate-800 flex justify-center">
          <DocumentPaperPreview
            doc={document}
            template={activeTemplate}
            zoomLevel={zoomLevel}
          />
        </div>
      ) : (
        <DiffViewer originalDoc={document} formattedDoc={document} />
      )}
    </div>
  );
}
