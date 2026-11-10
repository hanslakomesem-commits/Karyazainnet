/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DocxAnalysis, TargetDocument } from '../types/skripsi';
import { X, BookOpen, Bookmark, Check, Sparkles, Search } from 'lucide-react';

interface DocumentOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DocxAnalysis | null;
  targetToPick?: TargetDocument | null;
  onSelectPosition?: (targetId: string, elementIndex: number, page: number) => void;
}

export const DocumentOutlineModal: React.FC<DocumentOutlineModalProps> = ({
  isOpen,
  onClose,
  analysis,
  targetToPick,
  onSelectPosition,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !analysis) return null;

  const filteredHeadings = analysis.headingsList.filter((h) =>
    h.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (index: number, page: number) => {
    if (targetToPick && onSelectPosition) {
      onSelectPosition(targetToPick.id, index, page);
      onClose();
    }
  };

  // Never recommend 'approval index + 10' as an actual Pengesahan page.
  // Real Word page boundaries do not correspond to a fixed number of XML paragraphs.

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {targetToPick ? `Pilih Posisi Manual: ${targetToPick.title}` : 'Outline & Struktur Dokumen Word'}
              </h3>
              <p className="text-xs text-slate-500">
                {targetToPick
                  ? 'Klik tombol "Pilih Posisi Ini" pada heading atau halaman yang sesuai di file Word Anda'
                  : `${analysis.headingsList.length} heading utama terdeteksi pada ${analysis.fileName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {targetToPick?.id === 'pengesahan' && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Pilih judul <strong>Halaman Pengesahan</strong> yang benar dari daftar di bawah.
            Jangan menggunakan perkiraan otomatis "Persetujuan + 10 paragraf".
          </div>
        )}

        {/* Search Bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kata kunci heading (contoh: PENGESAHAN, PENGUJI, BAB, ABSTRAK)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filteredHeadings.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Tidak ada heading yang cocok dengan pencarian "{searchTerm}"
            </div>
          ) : (
            filteredHeadings.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{h.text}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                    Hal ~{h.page}
                  </span>
                  {targetToPick && onSelectPosition && (
                    <button
                      onClick={() => handleSelect(h.index, h.page)}
                      className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Pilih Posisi Ini
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
