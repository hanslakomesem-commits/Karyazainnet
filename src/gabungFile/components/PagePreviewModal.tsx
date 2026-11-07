/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DocxAnalysis, TargetDocument, ScanFile } from '../types/skripsi';
import {
  X,
  Search,
  MapPin,
  CheckCircle2,
  FileText,
  Layers,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface PagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  analysis: DocxAnalysis | null;
  targets: TargetDocument[];
  scans: ScanFile[];
  onSetTargetPosition: (targetId: string, elementIndex: number, mode: 'replace_page' | 'after_element') => void;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  isOpen,
  onClose,
  targetId,
  analysis,
  targets,
  scans,
  onSetTargetPosition,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(1);
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);

  if (!isOpen || !analysis) return null;

  const currentTarget = targets.find((t) => t.id === targetId);

  // Group elements into pages
  const pages = useMemo(() => {
    const pageMap = new Map<number, typeof analysis.elements>();
    analysis.elements.forEach((el) => {
      const page = el.estimatedPage || 1;
      if (!pageMap.has(page)) {
        pageMap.set(page, []);
      }
      pageMap.get(page)!.push(el);
    });

    const result: { page: number; elements: typeof analysis.elements; summary: string; hasDrawing: boolean }[] = [];
    pageMap.forEach((els, page) => {
      const texts = els.map((e) => e.text).filter((t) => t.length > 0);
      const summary = texts.slice(0, 4).join(' ').substring(0, 180);
      const hasDrawing = els.some((e) => e.hasDrawing);
      result.push({
        page,
        elements: els,
        summary: summary || '(Halaman Kosong / Format Khusus)',
        hasDrawing,
      });
    });

    return result.sort((a, b) => a.page - b.page);
  }, [analysis]);

  // Filtered pages based on search
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const q = searchQuery.toLowerCase();
    return pages.filter(
      (p) =>
        p.summary.toLowerCase().includes(q) ||
        p.elements.some((e) => e.text.toLowerCase().includes(q)) ||
        `halaman ${p.page}`.includes(q)
    );
  }, [pages, searchQuery]);

  const activePage = pages.find((p) => p.page === selectedPageIndex) || pages[0];

  const handleApplyPosition = () => {
    if (!currentTarget) return;
    const elemIdx = selectedElementIndex !== null ? selectedElementIndex : activePage?.elements[0]?.index || 0;
    const mode = currentTarget.category === 'signed_page' ? 'replace_page' : 'after_element';
    onSetTargetPosition(currentTarget.id, elemIdx, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Preview Halaman & Penentuan Posisi Sasaran
                </h3>
                <p className="text-xs text-slate-500">
                  Target saat ini: <strong className="text-blue-700">{currentTarget?.title || 'Dokumen'}</strong>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Pages List */}
          <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari teks/judul halaman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* List of Pages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
              {filteredPages.map((page) => {
                const isSelected = page.page === selectedPageIndex;
                return (
                  <button
                    key={page.page}
                    onClick={() => {
                      setSelectedPageIndex(page.page);
                      setSelectedElementIndex(page.elements[0]?.index || null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                        Halaman {page.page}
                      </span>
                      {page.hasDrawing && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                          Ada Gambar
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {page.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Page Content Detail & Action */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/50">
            {/* Active Page Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">
                  Tinjauan Halaman {activePage.page} dari {analysis.totalPagesEstimate}
                </span>
                <p className="text-[11px] text-slate-500">
                  {activePage.elements.length} paragraf/elemen terdeteksi di halaman ini
                </p>
              </div>

              <button
                onClick={handleApplyPosition}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer transition"
              >
                <MapPin className="w-3.5 h-3.5" />
                Tetapkan Target di Halaman Ini
              </button>
            </div>

            {/* Simulated Word Sheet */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center">
              <div className="bg-white rounded-lg shadow-sm border border-slate-300 w-full max-w-2xl p-8 min-h-[500px] text-slate-800 font-serif leading-relaxed text-sm">
                <div className="text-[11px] text-slate-400 font-mono mb-4 pb-2 border-b border-slate-100 flex justify-between">
                  <span>Halaman {activePage.page}</span>
                  <span>{activePage.hasDrawing ? 'Memuat Objek Visual / Gambar' : 'Teks Standar'}</span>
                </div>

                <div className="space-y-3">
                  {activePage.elements.map((el) => {
                    const isSelected = selectedElementIndex === el.index;
                    return (
                      <div
                        key={el.index}
                        onClick={() => setSelectedElementIndex(el.index)}
                        className={`p-2 rounded-md transition cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-blue-100/80 ring-2 ring-blue-500'
                            : 'hover:bg-slate-50'
                        } ${el.isHeading ? 'font-bold font-sans text-sm text-slate-900 uppercase pt-2' : ''}`}
                      >
                        {el.text || (
                          <span className="text-slate-300 italic text-[11px]">
                            [Paragraf Kosong / Pemisah Baris]
                          </span>
                        )}
                        {el.hasDrawing && (
                          <div className="mt-1 p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-sans flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Objek Gambar / Drawing Terpasang</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Pilih paragraf atau halaman di atas, lalu klik <strong>"Tetapkan Target di Halaman Ini"</strong> untuk mengunci posisi.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
