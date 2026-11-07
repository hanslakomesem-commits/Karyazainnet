import React, { useState } from 'react';
import { FormatSettings, TextCasing, InputSeparator } from '../types';
import { SAMPLE_GUEST_NAMES } from '../utils/labelFormatter';
import { Sparkles, Trash2, Sliders, AlertCircle, Camera, FileText } from 'lucide-react';
import { IntegratedPhotoDropzone } from './IntegratedPhotoDropzone';

interface InputPanelProps {
  rawInput: string;
  onInputChange: (val: string) => void;
  settings: FormatSettings;
  onSettingsChange: (newSettings: FormatSettings) => void;
  totalGuests: number;
  totalSheets: number;
  totalDuplicates: number;
  duplicateNames: string[];
  emptySlotsLastSheet: number;
  onOpenPhotoModal: () => void;
  onOpenWordFilterModal: () => void;
  onPhotoNamesDetected: (names: string[], mode: 'append' | 'replace') => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  rawInput,
  onInputChange,
  settings,
  onSettingsChange,
  totalGuests,
  totalSheets,
  totalDuplicates,
  duplicateNames,
  emptySlotsLastSheet,
  onOpenPhotoModal,
  onOpenWordFilterModal,
  onPhotoNamesDetected,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleLoadSample = () => {
    onInputChange(SAMPLE_GUEST_NAMES);
  };

  const handleClear = () => {
    onInputChange('');
  };

  const updateSetting = <K extends keyof FormatSettings>(key: K, value: FormatSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs no-print flex flex-col gap-4">
      {/* Header of Input Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Daftar Nama Tamu Undangan</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              (Pisahkan tanda koma)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap sel akan disusun 3 baris: Nama Tamu, Baris &quot;{settings.prefixLine}&quot;, Baris &quot;{settings.destinationLine}&quot;.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scan Photo Button */}
          <button
            type="button"
            onClick={onOpenPhotoModal}
            title="Foto buku catatan tulisan tangan pulpen tanpa koma"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto Catatan Pulpen (AI)</span>
          </button>

          {/* Saring dari Word */}
          <button
            type="button"
            onClick={onOpenWordFilterModal}
            title="Saring teks salinan dari Microsoft Word (hilangkan nomor 1. 2. dan bullet)"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Saring dari Word</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Contoh</span>
          </button>

          {rawInput && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Area Upload & Scan Foto Buku Catatan Pulpen */}
      <IntegratedPhotoDropzone
        onNamesDetected={onPhotoNamesDetected}
        currentNameCount={totalGuests}
      />

      {/* Textarea Kotak Nama */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>Kotak Daftar Nama Tamu (Siap Cetak Label 103):</span>
          </label>
          <span className="text-[11px] text-slate-500 font-mono">
            {totalGuests} nama aktif
          </span>
        </div>
        <textarea
          rows={6}
          value={rawInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Ketik, tempel, atau foto buku tamu di atas...&#10;Contoh: Bpk. H. Rahmat Hidayat & Istri, Ibu Siti Nurhaliza, Dr. Hendra Wijaya, Sp.PD, Prof. Bambang Soeprapto..."
          className="w-full rounded-lg border border-slate-300 p-3 text-sm font-sans focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden placeholder:text-slate-400 bg-slate-50/50 leading-relaxed transition-all"
        />
        {rawInput.length > 0 && (
          <div className="text-right text-[11px] text-slate-400 mt-1">
            {rawInput.length} karakter
          </div>
        )}
      </div>

      {/* Metrics & Duplicate Notice */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
        <div>
          <div className="text-slate-500 font-medium">Total Nama Tamu</div>
          <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {totalGuests} <span className="text-xs font-normal text-slate-500">orang</span>
          </div>
        </div>

        <div>
          <div className="text-slate-500 font-medium">Kebutuhan Lembar</div>
          <div className="text-base font-bold text-amber-700 font-mono tabular-nums">
            {totalSheets} <span className="text-xs font-normal text-slate-500">lembar 103</span>
          </div>
        </div>

        <div>
          <div className="text-slate-500 font-medium">Kapasitas Stiker</div>
          <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {totalSheets * 12} <span className="text-xs font-normal text-slate-500">slot</span>
          </div>
        </div>

        <div>
          <div className="text-slate-500 font-medium">Sisa Sel Kosong</div>
          <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {totalGuests > 0 ? emptySlotsLastSheet : 0}{' '}
            <span className="text-xs font-normal text-slate-500">stiker</span>
          </div>
        </div>
      </div>

      {/* Duplicate Alert if any */}
      {totalDuplicates > 0 && (
        <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-lg text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Ditemukan {totalDuplicates} nama duplikat:</span>{' '}
              <span className="text-amber-800">{duplicateNames.slice(0, 3).join(', ')}{duplicateNames.length > 3 ? '...' : ''}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSetting('removeDuplicates', !settings.removeDuplicates)}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[11px] whitespace-nowrap transition-colors cursor-pointer"
          >
            {settings.removeDuplicates ? 'Batalkan Filter' : 'Hapus Duplikat Otomatis'}
          </button>
        </div>
      )}

      {/* Collapsible Format Settings */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Pengaturan Format Teks & Label (Baris 2 & 3, Kapitalisasi, Pemisah)</span>
          </span>
          <span className="text-slate-400 font-mono text-xs">{showAdvanced ? '▲ Tutup' : '▼ Atur'}</span>
        </button>

        {showAdvanced && (
          <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs border-t border-slate-200">
            {/* Baris 2 Prefix */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Teks Baris 2 (Kata Sambung):
              </label>
              <input
                type="text"
                value={settings.prefixLine}
                onChange={(e) => updateSetting('prefixLine', e.target.value)}
                placeholder="Di / di / Di Tempat"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
              />
              <div className="flex gap-1 mt-1.5">
                {['Di', 'di', 'Di -', 'Kepada Yth:'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateSetting('prefixLine', opt)}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      settings.prefixLine === opt
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Baris 3 Destination */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Teks Baris 3 (Tujuan / Alamat):
              </label>
              <input
                type="text"
                value={settings.destinationLine}
                onChange={(e) => updateSetting('destinationLine', e.target.value)}
                placeholder="Tempat / Kediaman / Kota"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
              />
              <div className="flex gap-1 mt-1.5">
                {['Tempat', 'Kediaman', 'Jakarta', 'Bandung'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateSetting('destinationLine', opt)}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      settings.destinationLine === opt
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Huruf / Casing */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Format Huruf (Kapitalisasi):
              </label>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'original', label: 'Sesuai Input Asli' },
                  { id: 'title', label: 'Kapital Tiap Kata (Title Case)' },
                  { id: 'upper', label: 'HURUF BESAR SEMUA' },
                ].map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900"
                  >
                    <input
                      type="radio"
                      name="casing"
                      checked={settings.casing === c.id}
                      onChange={() => updateSetting('casing', c.id as TextCasing)}
                      className="text-amber-600 focus:ring-amber-600"
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pemisah Input */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Mode Pemisah Input:
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'comma', label: 'Tanda Koma (,)' },
                  { id: 'newline', label: 'Baris Baru (Enter)' },
                  { id: 'auto', label: 'Otomatis' },
                ].map((sep) => (
                  <button
                    key={sep.id}
                    type="button"
                    onClick={() => updateSetting('separator', sep.id as InputSeparator)}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                      settings.separator === sep.id
                        ? 'bg-amber-600 text-white border-amber-600 font-medium'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {sep.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Gunakan &quot;Baris Baru&quot; jika Anda meng-copy kolom dari Excel.
              </p>
            </div>

            {/* Opsi Hapus Duplikat */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.removeDuplicates}
                  onChange={(e) => updateSetting('removeDuplicates', e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-600"
                />
                <span className="font-semibold">Otomatis Abaikan Nama Duplikat</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
