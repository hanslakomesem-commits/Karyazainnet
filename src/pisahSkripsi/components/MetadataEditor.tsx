import React from 'react';
import { User, IdCard, GraduationCap, BookOpen, Mail, CheckCircle2 } from 'lucide-react';
import { ThesisMetadata } from '../types';
import { getProdiCode, OFFICIAL_PRODI_LIST } from '../lib/prodiMapping';

interface MetadataEditorProps {
  metadata: ThesisMetadata;
  onChange: (updated: ThesisMetadata) => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ metadata, onChange }) => {
  const handleChange = (field: keyof ThesisMetadata, value: string) => {
    const updated = { ...metadata, [field]: value };
    if (field === 'prodi') {
      updated.prodiCode = getProdiCode(value);
    }
    onChange(updated);
  };

  const handleSelectOfficialProdi = (prodiName: string) => {
    const updated = {
      ...metadata,
      prodi: prodiName,
      prodiCode: getProdiCode(prodiName),
    };
    onChange(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Metadata Identitas Skripsi (Deteksi Otomatis Cover)
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Format: NAMA_NIM_BAGIAN_PRODI.pdf
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nama Mahasiswa */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Nama Mahasiswa
          </label>
          <input
            type="text"
            value={metadata.nama}
            onChange={(e) => handleChange('nama', e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            placeholder="M. RIFQI"
          />
        </div>

        {/* NIM */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            <IdCard className="w-3.5 h-3.5 text-slate-400" />
            NIM / NPM
          </label>
          <input
            type="text"
            value={metadata.nim}
            onChange={(e) => handleChange('nim', e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            placeholder="22382071037"
          />
        </div>

        {/* Program Studi & Singkatan */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              Program Studi (Prodi)
            </span>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-full">
              Kode: {metadata.prodiCode}
            </span>
          </label>
          <input
            type="text"
            list="official-prodi-list"
            value={metadata.prodi}
            onChange={(e) => handleChange('prodi', e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            placeholder="Pilih atau ketik Program Studi..."
          />
          <datalist id="official-prodi-list">
            {OFFICIAL_PRODI_LIST.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name} ({p.code})
              </option>
            ))}
          </datalist>
        </div>

        {/* Judul Skripsi */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            Judul Skripsi
          </label>
          <input
            type="text"
            value={metadata.judul}
            onChange={(e) => handleChange('judul', e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            placeholder="IMPLEMENTASI HUKUM KELUARGA ISLAM..."
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Email Mahasiswa (Opsional)
          </label>
          <input
            type="email"
            value={metadata.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            placeholder="mahasiswa@example.com"
          />
        </div>
      </div>

      {/* Quick Select Buttons for 22 Official Prodi */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Pilihan Cepat 22 Prodi Resmi & Kode Penamaan File:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {OFFICIAL_PRODI_LIST.map((p) => {
            const isSelected = metadata.prodiCode === p.code || metadata.prodi.toLowerCase().includes(p.name.toLowerCase());
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => handleSelectOfficialProdi(p.name)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
                title={`${p.name} (${p.code})`}
              >
                <span className="font-bold mr-1">[{p.code}]</span> {p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

