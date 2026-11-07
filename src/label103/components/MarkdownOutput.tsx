import React, { useState } from 'react';
import { Copy, Check, Download, FileText, Eye, Code } from 'lucide-react';
import { LabelSheet } from '../types';

interface MarkdownOutputProps {
  markdownText: string;
  sheets: LabelSheet[];
  onCopySuccess: () => void;
  onDownloadMd: () => void;
}

export const MarkdownOutput: React.FC<MarkdownOutputProps> = ({
  markdownText,
  sheets,
  onCopySuccess,
  onDownloadMd,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'rendered'>('rendered');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      onCopySuccess();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = markdownText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      onCopySuccess();
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs no-print">
      {/* Top action bar */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm tracking-tight">
            Output Tabel Markdown (3 Kolom × 4 Baris)
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            · Sesuai Aturan Label 103
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="bg-slate-800 p-0.5 rounded-lg flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('rendered')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'rendered'
                  ? 'bg-amber-600 text-white font-medium shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tampilan Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-amber-600 text-white font-medium shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Kode Mentah (.md)</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            type="button"
            onClick={onDownloadMd}
            title="Unduh file .md"
            className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unduh .MD</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-900" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Checklist of rules enforced */}
      <div className="bg-slate-50 px-5 py-2 border-b border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold text-slate-700">Format Wajib:</span>
        <span className="flex items-center gap-1 text-emerald-700">
          <Check className="w-3 h-3" /> Ukuran Kolom 6,4 cm × 3,3 cm di tiap lembar
        </span>
        <span className="flex items-center gap-1 text-emerald-700">
          <Check className="w-3 h-3" /> 12 Kolom (3 Kesamping × 4 Kebawah)
        </span>
        <span className="flex items-center gap-1 text-emerald-700">
          <Check className="w-3 h-3" /> 3 Baris per sel (Nama / Di / Tempat)
        </span>
        <span className="flex items-center gap-1 text-emerald-700">
          <Check className="w-3 h-3" /> Penanda &quot;=== LEMBAR BARU (LABEL 103) ===&quot;
        </span>
      </div>

      {/* Main content body */}
      <div className="p-5">
        {viewMode === 'raw' ? (
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed max-h-[500px] border border-slate-800 selection:bg-amber-500 selection:text-slate-900">
              <code>{markdownText}</code>
            </pre>
          </div>
        ) : (
          <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2">
            {sheets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Belum ada data nama tamu untuk ditampilkan.
              </div>
            ) : (
              sheets.map((sheet, sIdx) => (
                <div key={sheet.sheetNumber} className="space-y-3">
                  {sIdx > 0 && (
                    <div className="py-2 flex items-center justify-center my-4">
                      <div className="border-t-2 border-dashed border-amber-400 w-full flex-1"></div>
                      <span className="px-4 py-1 bg-amber-100 text-amber-900 font-mono text-xs font-bold rounded-full border border-amber-300">
                        === LEMBAR BARU (LABEL 103) ===
                      </span>
                      <div className="border-t-2 border-dashed border-amber-400 w-full flex-1"></div>
                    </div>
                  )}

                  {/* Sheet Header Info */}
                  <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-lg text-xs">
                    <h3 className="font-bold text-slate-900 text-sm">
                      LEMBAR {sheet.sheetNumber} - LABEL UNDANGAN 103
                    </h3>
                    <p className="text-slate-600 mt-0.5">
                      Ukuran Kolom Label: <strong>6,4 cm × 3,3 cm</strong> (Ukuran Kertas Undangan: 20 cm × 14 cm, Acuan Margin Word: Top 0,5 cm, Side 0,2 cm) · 3 Kolom × 4 Baris (12 Kolom)
                    </p>
                  </div>

                  {/* Rendered 3-Column Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                          <th className="py-2.5 px-4 border-r border-slate-200 w-1/3">Kolom 1</th>
                          <th className="py-2.5 px-4 border-r border-slate-200 w-1/3">Kolom 2</th>
                          <th className="py-2.5 px-4 w-1/3">Kolom 3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sheet.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cell.id}
                                className={`p-3.5 align-middle ${
                                  cIdx < 2 ? 'border-r border-slate-200' : ''
                                } ${cell.isEmpty ? 'bg-slate-50/40 text-slate-300 italic' : ''}`}
                              >
                                {cell.isEmpty ? (
                                  <span className="text-slate-300 text-[11px]">(Sel Kosong)</span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-slate-900">{cell.name}</div>
                                    <div className="text-[11px] text-slate-500 font-medium">{cell.prefix}</div>
                                    <div className="text-slate-700">{cell.destination}</div>
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
