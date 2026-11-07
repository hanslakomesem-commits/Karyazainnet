/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  Filter,
  Library,
  Columns2,
  BookOpen,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { JournalTemplateConfig } from '../types/template';
import { TemplateCard } from '../components/TemplateCard/TemplateCard';

interface TemplatesProps {
  templates: JournalTemplateConfig[];
  onAddTemplate: () => void;
  onEditTemplate: (template: JournalTemplateConfig) => void;
  onDeleteTemplate: (id: string) => void;
  onSelectForFormatting: (template: JournalTemplateConfig) => void;
  onResetDefaults?: () => void;
}

export function Templates({
  templates,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onSelectForFormatting,
  onResetDefaults,
}: TemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState('ALL');
  const [selectedColumns, setSelectedColumns] = useState<'ALL' | '1' | '2'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');

  // Filter & Search
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.issn && tpl.issn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tpl.fieldOfStudy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesField = selectedField === 'ALL' || tpl.fieldOfStudy.toLowerCase().includes(selectedField.toLowerCase());

    const matchesCols =
      selectedColumns === 'ALL' ||
      (selectedColumns === '1' && tpl.pageLayout.columns === 1) ||
      (selectedColumns === '2' && tpl.pageLayout.columns === 2);

    return matchesSearch && matchesField && matchesCols;
  });

  // Sorting
  filteredTemplates.sort((a, b) => {
    if (sortBy === 'az') return a.name.localeCompare(b.name);
    if (sortBy === 'za') return b.name.localeCompare(a.name);
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Repository Template Jurnal Ilmiah
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar template master berkas Word (.docx) untuk publikasi jurnal nasional dan internasional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResetDefaults && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Kembalikan Template Default"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          )}

          <button
            id="btn-add-template-main"
            type="button"
            onClick={onAddTemplate}
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            + Tambah Master Template
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="search-journal-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jurnal, penerbit, ISSN, atau rumpun ilmu..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Field of Study Filter */}
          <div>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Bidang Ilmu</option>
              <option value="Teknologi">Teknologi Informasi & Komputer</option>
              <option value="Pendidikan">Pendidikan & Humaniora</option>
              <option value="Kesehatan">Kesehatan & Kedokteran</option>
              <option value="Ekonomi">Ekonomi, Bisnis & Manajemen</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Urutan: Terbaru Ditambahkan</option>
              <option value="oldest">Urutan: Terlama</option>
              <option value="az">Nama Jurnal (A - Z)</option>
              <option value="za">Nama Jurnal (Z - A)</option>
            </select>
          </div>
        </div>

        {/* Quick Column Filter Chips */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Columns2 className="w-3 h-3" /> Layout Kolom:
          </span>
          <button
            type="button"
            onClick={() => setSelectedColumns('ALL')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              selectedColumns === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setSelectedColumns('1')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              selectedColumns === '1'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            1 Kolom (Single Column)
          </button>
          <button
            type="button"
            onClick={() => setSelectedColumns('2')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              selectedColumns === '2'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            2 Kolom (Two Columns)
          </button>
          <span className="ml-auto text-[11px] text-slate-400">
            Ditemukan {filteredTemplates.length} template
          </span>
        </div>
      </div>

      {/* Template Cards Grid or Empty State */}
      {filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 w-16 h-16 mx-auto flex items-center justify-center">
            <Library className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Belum ada template jurnal yang sesuai
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? `Tidak ada template yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain atau reset filter.`
              : 'Tambahkan template master jurnal pertama Anda untuk mulai menggunakan pemformatan artikel.'}
          </p>
          <button
            type="button"
            onClick={onAddTemplate}
            className="mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            + Tambah Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => onSelectForFormatting(template)}
              onEdit={() => onEditTemplate(template)}
              onDelete={onDeleteTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
