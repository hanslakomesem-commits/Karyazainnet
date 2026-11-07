/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Building2,
  BookOpen,
  Columns2,
  Type,
  ExternalLink,
  Edit3,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { JournalTemplateConfig } from '../../types/template';

interface TemplateCardProps {
  key?: React.Key;
  template: JournalTemplateConfig;
  onSelect?: (template: JournalTemplateConfig) => void;
  onEdit?: (template: JournalTemplateConfig) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  selectableOnly?: boolean;
}

export function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
  selectableOnly = false,
}: TemplateCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  return (
    <div
      id={`card-template-${template.id}`}
      className={`group relative flex flex-col justify-between rounded-xl border transition-all duration-200 bg-white dark:bg-slate-900 ${
        isSelected
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md dark:border-indigo-400'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:hover:border-slate-700'
      }`}
    >
      <div className="p-5">
        {/* Top Header & Field Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {template.fieldOfStudy}
              </span>
            </div>
          </div>
          {template.isCustom ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
              Kustom
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
              Master Template
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-2">
          {template.name}
        </h3>

        {/* Publisher */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{template.publisher}</span>
        </div>

        {/* Technical Specs Tags */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Columns2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{template.pageLayout.columns === 2 ? '2 Kolom' : '1 Kolom (Single)'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">
              {template.bodyStyle.fontFamily} {template.bodyStyle.fontSizePt}pt
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Kertas {template.pageLayout.paperSize}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Tahun {template.year || 2026}</span>
          </div>
        </div>

        {/* Notes preview if any */}
        {template.notes && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed italic">
            "{template.notes}"
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl flex items-center justify-between gap-2">
        {selectableOnly ? (
          <button
            id={`btn-select-template-${template.id}`}
            type="button"
            onClick={() => onSelect && onSelect(template)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isSelected
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
            }`}
          >
            {isSelected ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Template Terpilih
              </>
            ) : (
              'Pilih Template Ini'
            )}
          </button>
        ) : (
          <>
            <button
              id={`btn-use-template-${template.id}`}
              type="button"
              onClick={() => onSelect && onSelect(template)}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gunakan
            </button>

            {onEdit && (
              <button
                id={`btn-edit-template-${template.id}`}
                type="button"
                onClick={() => onEdit(template)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Konfigurasi Aturan Template"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {template.journalUrl && (
              <a
                href={template.journalUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Buka Website Jurnal"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {onDelete && template.isCustom && (
              <button
                id={`btn-delete-template-${template.id}`}
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                title="Hapus Template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="absolute inset-0 z-10 p-5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col justify-center items-center text-center">
          <div className="p-3 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-2">
            <Trash2 className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">Hapus Template?</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-2">
            Template "{template.name}" akan dihapus dari repository lokal Anda.
          </p>
          <div className="flex items-center gap-2 w-full">
            <button
              id={`btn-cancel-delete-${template.id}`}
              type="button"
              onClick={() => setShowConfirmDelete(false)}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              id={`btn-confirm-delete-${template.id}`}
              type="button"
              onClick={() => {
                setShowConfirmDelete(false);
                if (onDelete) onDelete(template.id);
              }}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
