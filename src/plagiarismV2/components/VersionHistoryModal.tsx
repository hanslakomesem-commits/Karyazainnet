import React from 'react';
import { History, RotateCcw, Clock, Sparkles, User, X, Check } from 'lucide-react';
import type { PlagiarismSegment, SegmentVersionHistory } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: PlagiarismSegment | null;
  onRevertToVersion: (segmentId: string, version: SegmentVersionHistory) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  segment,
  onRevertToVersion,
}) => {
  if (!isOpen || !segment) return null;

  const history = segment.history || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="version-history-modal"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Riwayat Versi Kalimat</h3>
              <p className="text-xs text-slate-500">
                {segment.locationLabel} • {history.length} Versi Tersimpan
              </p>
            </div>
          </div>
          <button
            id="close-history-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-xs text-slate-500 font-medium">
            Pilih salah satu versi sebelumnya untuk mengembalikan (revert) isi teks naskah jika diperlukan:
          </div>

          <div className="space-y-3">
            {history.map((hist, idx) => {
              const isCurrent = (segment.paraphrasedText || segment.originalText) === hist.text;
              const formattedDate = new Date(hist.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={hist.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                        {hist.author === 'ai' ? (
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        ) : hist.author === 'user' ? (
                          <User className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {hist.technique || `Versi #${idx + 1}`}
                      </span>
                      {hist.modelUsed && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {hist.modelUsed}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">{formattedDate}</span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Versi Aktif
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    "{hist.text}"
                  </p>

                  {!isCurrent && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onRevertToVersion(segment.id, hist);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kembalikan ke Versi Ini (Revert)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
