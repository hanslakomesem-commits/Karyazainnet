import React, { useState } from 'react';
import { X, Save, Check } from 'lucide-react';
import { SectionRange } from '../types';

interface ManualRangeModalProps {
  section: SectionRange | null;
  totalPages: number;
  onClose: () => void;
  onSave: (key: string, startPage: number, endPage: number) => void;
}

export const ManualRangeModal: React.FC<ManualRangeModalProps> = ({
  section,
  totalPages,
  onClose,
  onSave,
}) => {
  if (!section) return null;

  const [start, setStart] = useState<number>(section.startPage || 1);
  const [end, setEnd] = useState<number>(section.endPage || 1);

  const handleSave = () => {
    if (start < 1 || start > totalPages || end < start || end > totalPages) {
      alert(`Nomor halaman harus antara 1 sampai ${totalPages}, dan Halaman Akhir tidak boleh kurang dari Halaman Awal.`);
      return;
    }
    onSave(section.key, start, end);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Edit Rentang Halaman Manual
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Atur halaman awal dan halaman akhir untuk bagian <strong className="text-slate-900 dark:text-white">{section.label}</strong> (Total: {totalPages} Halaman PDF).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Halaman Awal (1-{totalPages})
              </label>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={start}
                onChange={(e) => setStart(parseInt(e.target.value) || 1)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Halaman Akhir (1-{totalPages})
              </label>
              <input
                type="number"
                min={start}
                max={totalPages}
                value={end}
                onChange={(e) => setEnd(parseInt(e.target.value) || start)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
