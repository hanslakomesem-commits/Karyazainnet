import React, { useState } from 'react';
import {
  SpellCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { EYDAuditResult, EYDIssue } from '../types';

interface EYDAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResult: EYDAuditResult;
  onApplyAllFixes: () => void;
  onApplySingleFix?: (issue: EYDIssue) => void;
  targetTitle?: string;
}

export const EYDAuditModal: React.FC<EYDAuditModalProps> = ({
  isOpen,
  onClose,
  auditResult,
  onApplyAllFixes,
  targetTitle = 'Seluruh Naskah / Segmen Aktif',
}) => {
  const [appliedIssues, setAppliedIssues] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const { totalIssues, score, issues, correctedText } = auditResult;

  const categoryLabels: Record<EYDIssue['category'], { label: string; color: string }> = {
    non_baku: { label: 'KBBI Non-Baku', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    spacing_pdf: { label: 'Spasi Rusak (PDF)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    punctuation: { label: 'Tanda Baca', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    capitalization: { label: 'Huruf Kapital', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    affix: { label: 'Kata Depan / Terikat', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  const handleApplySingle = (issueId: string) => {
    setAppliedIssues((prev) => new Set(prev).add(issueId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="eyd-audit-modal"
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <SpellCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Audit EYD V & KBBI Akademik</h3>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    score >= 90
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : score >= 75
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  Skor Kepatuhan: {score}/100
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <span className="font-medium text-slate-700">{targetTitle}</span>
              </p>
            </div>
          </div>
          <button
            id="close-eyd-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Standar Ejaan</p>
                <p className="text-sm font-bold text-slate-800">EYD Edisi V & KBBI</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Temuan Koreksi</p>
                <p className="text-sm font-bold text-slate-800">{totalIssues} Kata / Tanda Baca</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Perbaikan Otomatis</p>
                <p className="text-sm font-bold text-emerald-600">Tersedia 1-Klik</p>
              </div>
            </div>
          </div>

          {/* Issues List */}
          {issues.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Daftar Kata & Ejaan yang Perlu Diperbaiki ({issues.length})
                </h4>
                <span className="text-xs text-slate-400">Disesuaikan otomatis dengan KBBI</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {issues.map((issue) => {
                  const meta = categoryLabels[issue.category] || {
                    label: 'Umum',
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const isDone = appliedIssues.has(issue.id);

                  return (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        isDone
                          ? 'bg-slate-50/60 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs font-semibold text-rose-600 line-through">
                            {issue.originalWord}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {issue.suggestedWord}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{issue.explanation}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySingle(issue.id)}
                        disabled={isDone}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                          isDone
                            ? 'bg-slate-100 text-slate-400 cursor-default'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Terapkan</span>
                          </>
                        ) : (
                          <span>Tandai Selesai</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-base font-bold text-emerald-900">Ejaan Sangat Rapi & Sesuai EYD V</h4>
              <p className="text-xs text-emerald-700 mt-1">
                Tidak ditemukan kata tidak baku atau kesalahan tanda baca yang signifikan pada teks ini.
              </p>
            </div>
          )}

          {/* Preview Result Box */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pratinjau Teks Bersih Sesuai EYD V
            </h4>
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono leading-relaxed max-h-36 overflow-y-auto">
              {correctedText}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            id="cancel-eyd-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Tutup
          </button>

          <button
            id="apply-all-eyd-btn"
            type="button"
            onClick={() => {
              onApplyAllFixes();
              onClose();
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Perbaiki Semua Ejaan Otomatis ({issues.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
