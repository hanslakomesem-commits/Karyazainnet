import React, { useState } from 'react';
import { FileText, X, Check, Sparkles, Filter, Loader2 } from 'lucide-react';

interface WordFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNames: (names: string[], mode: 'replace' | 'append') => void;
}

export const WordFilterModal: React.FC<WordFilterModalProps> = ({
  isOpen,
  onClose,
  onApplyNames,
}) => {
  const [inputText, setInputText] = useState('');
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Instant local rule-based filter
  const handleLocalFilter = () => {
    if (!inputText.trim()) return;

    setErrorMessage(null);
    const lines = inputText.split(/\r?\n/);
    const result: string[] = [];

    for (let line of lines) {
      // Remove numbering (1., 2), 3 -), bullet points (•, *, -, ·)
      let cleaned = line
        .replace(/^[\s\d.)\-\•\*\·\t]+/, '') // leading numbers & bullets
        .replace(/[\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Ignore common non-name headers or blanks
      const lower = cleaned.toLowerCase();
      if (
        cleaned.length > 1 &&
        !lower.startsWith('daftar nama') &&
        !lower.startsWith('tamu undangan') &&
        !lower.startsWith('halaman') &&
        !lower.startsWith('nomor') &&
        !lower.startsWith('no.')
      ) {
        result.push(cleaned);
      }
    }

    if (result.length === 0) {
      setErrorMessage('Tidak ditemukan nama yang valid setelah penyaringan.');
    } else {
      setFilteredNames(result);
    }
  };

  // AI-assisted filter for unstructured text
  const handleAiFilter = async () => {
    if (!inputText.trim()) return;

    setIsAiLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/clean-word-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: inputText }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses dengan AI');
      }

      setFilteredNames(data.names || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyaring teks. Coba gunakan Penyaringan Cepat.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApply = (mode: 'replace' | 'append') => {
    if (filteredNames.length === 0) return;
    onApplyNames(filteredNames, mode);
    setInputText('');
    setFilteredNames([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Saring Daftar Nama dari Dokumen Word / Catatan
              </h2>
              <p className="text-xs text-slate-500">
                Otomatis hilangkan nomor urut (1., 2.), simbol bullet, spasi ganda, dan header
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tempel (Paste) teks dari Microsoft Word / WhatsApp di sini:
            </label>
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setFilteredNames([]);
              }}
              placeholder={`Contoh teks dari Word:\n1. Bpk. H. Rahmat Hidayat & Istri\n2. Ibu Siti Nurhaliza\n3. Dr. Hendra Wijaya, Sp.PD\n4. Keluarga Bpk. Bambang`}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs font-mono focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-400">
              {inputText.split('\n').filter((l) => l.trim()).length} baris terdeteksi
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLocalFilter}
                disabled={!inputText.trim() || isAiLoading}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Saring Cepat (Instan)</span>
              </button>

              <button
                type="button"
                onClick={handleAiFilter}
                disabled={!inputText.trim() || isAiLoading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Menyaring...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Saring dengan AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Filtered Result */}
          {filteredNames.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Hasil Penyaringan ({filteredNames.length} nama bersih):</span>
                </span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 text-xs pr-1">
                {filteredNames.map((name, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md"
                  >
                    <span className="font-mono text-slate-400 text-[10px] w-5">
                      {idx + 1}.
                    </span>
                    <span className="font-medium text-slate-800">{name}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleApply('append')}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  + Tambahkan ke Daftar Yang Ada
                </button>
                <button
                  type="button"
                  onClick={() => handleApply('replace')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Ganti Daftar Nama Saat Ini
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
