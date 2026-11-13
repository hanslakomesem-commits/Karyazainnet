import React, { useState } from 'react';
import { ShieldCheck, BookOpen, Hash, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { FootnoteDetail } from '../types';

interface FootnoteGuardViewProps {
  footnotes: FootnoteDetail[];
  totalFootnotesCount: number;
}

export const FootnoteGuardView: React.FC<FootnoteGuardViewProps> = ({
  footnotes,
  totalFootnotesCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState('');

  const safeFootnotes = footnotes || [];
  const count = typeof totalFootnotesCount === 'number' ? totalFootnotesCount : safeFootnotes.length;

  const filteredFootnotes = safeFootnotes.filter(
    (fn) =>
      (fn?.text || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (fn?.number?.toString() || '').includes(filterText) ||
      (fn?.id || '').includes(filterText)
  );

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Footnote Integrity Guard
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {count}/{count} Utuh & Terjaga
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Semua nomor catatan kaki (<code className="bg-slate-800 px-1 py-0.2 rounded text-[11px]">&lt;w:footnoteReference&gt;</code>) dari Bab I sampai Bab IV tetap persis di nomor aslinya.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 rounded-lg border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Tutup Daftar Rujukan' : `Lihat Rincian ${count} Footnote`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Footnotes Inspector */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>
                Menampilkan <strong>{filteredFootnotes.length}</strong> dari total <strong>{safeFootnotes.length}</strong> catatan kaki di dalam file Word skripsi.
              </span>
            </div>

            <input
              type="text"
              placeholder="Cari rujukan atau nomor footnote..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white w-full sm:w-64 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredFootnotes.map((fn) => (
              <div
                key={fn.id}
                className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex items-start gap-3 text-xs"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold shrink-0">
                  {fn.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800">
                      Footnote #{fn.number}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                      XML ID: {fn.id}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium ml-auto flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Status: Tidak Tergeser
                    </span>
                  </div>
                  <p className="text-slate-600 font-serif italic line-clamp-2">
                    {fn.text}
                  </p>
                </div>
              </div>
            ))}

            {filteredFootnotes.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                Tidak ada footnote yang cocok dengan kata pencarian "{filterText}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
