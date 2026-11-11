import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, FileText, GraduationCap, Layers, ScrollText, CheckCircle2, ShieldCheck, Globe2, UploadCloud } from 'lucide-react';
import { SkripsiPaginatorFixedView } from './SkripsiPaginatorFixedView';
import type { DocumentNumberingProfile } from '../utils/docxPaginatorFixed';

/** ZAINNET_LINK3_WIZARD_V1 — dedicated mobile-first Link 3 flow; Link 2 stays unchanged. */
interface Props { onCorrectionComplete?: (fileName: string) => void }
type Kind = 'skripsi' | 'proposal' | 'makalah' | 'tesis';
type Language = 'id' | 'ar';
const options = [
  { id: 'skripsi' as const, label: 'Skripsi', desc: 'Romawi untuk awal, angka mulai BAB I', icon: GraduationCap },
  { id: 'proposal' as const, label: 'Proposal', desc: 'Format proposal penelitian', icon: FileText },
  { id: 'makalah' as const, label: 'Makalah', desc: 'Nomor halaman makalah akademik', icon: BookOpen },
  { id: 'tesis' as const, label: 'Tesis', desc: 'Nomor bab hingga BAB VI', icon: ScrollText },
];

export const SkripsiPaginatorLink3View: React.FC<Props> = ({ onCorrectionComplete }) => {
  const [kind, setKind] = useState<Kind | null>(null);
  const [language, setLanguage] = useState<Language>('id');
  const [ready, setReady] = useState(false);
  const selected = options.find(v => v.id === kind);
  const profile: DocumentNumberingProfile = language === 'ar' ? (`arab-${kind || 'skripsi'}` as DocumentNumberingProfile) : (kind || 'skripsi');

  if (ready && kind) return (
    <main className="min-h-full bg-slate-100 text-slate-900" data-testid="zainnet-link3-editor">
      <div className="sticky top-0 z-40 border-b border-indigo-100 bg-white/95 backdrop-blur shadow-sm px-3 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setReady(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-indigo-800 flex items-center gap-1"><ArrowLeft size={15}/> Ubah pilihan</button>
          <div className="min-w-0 flex-1"><p className="text-xs text-slate-500">MENU 3 / LINK 3 · LANGKAH 3–4</p><p className="text-sm font-black truncate">{selected?.label} · {language === 'ar' ? 'Arabic' : 'Indonesia'}</p></div>
          <span className="text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 px-3 py-1.5">Edit + Unduh DOCX</span>
        </div>
      </div>
      <SkripsiPaginatorFixedView key={`${profile}-${kind}`} initialProfile={profile} initialTocMode="auto_detect" onCorrectionComplete={onCorrectionComplete}/>
    </main>
  );

  return (
    <main className="min-h-full bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-100 pb-12 text-slate-900" data-testid="zainnet-link3-wizard">
      <section className="max-w-4xl mx-auto px-4 pt-7 sm:pt-10">
        <div className="text-indigo-200 text-[11px] uppercase tracking-[.22em] font-bold mb-2">ZAIN.NET · MENU 3 · LINK 3</div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Edit Penomoran Halaman</h1>
        <p className="text-indigo-100/80 mt-2 text-sm sm:text-base">Pilih jenis dokumen terlebih dahulu. Kemudian tentukan bahasa dan lanjutkan untuk upload file Word.</p>
        <div className="grid grid-cols-4 gap-2 mt-6 mb-6">
          {['Jenis file', 'Bahasa', 'Upload & cek', 'Unduh'].map((label, i) => (
            <div key={label} className="space-y-1.5">
              <div className={`h-1.5 rounded-full ${i === 0 || (i === 1 && kind) ? 'bg-indigo-400' : 'bg-white/20'}`}/>
              <p className={`text-[10px] sm:text-xs ${i < 2 ? 'text-white' : 'text-indigo-200/80'}`}>{i + 1}. {label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-3xl p-4 sm:p-7 shadow-xl border border-indigo-100 space-y-5">
          <header><p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Langkah 1</p><h2 className="text-xl font-extrabold mt-1">Pilih jenis dokumen</h2><p className="text-sm text-slate-500">Jenis dokumen menentukan aturan nomor halaman dan pergantian BAB.</p></header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map(({id,label,desc,icon:Icon},idx)=> (
              <button key={id} type="button" onClick={() => setKind(id)} aria-pressed={kind === id} className={`text-left flex gap-3 items-start rounded-2xl p-4 border-2 transition-all min-h-[88px] ${kind === id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                <span className={`rounded-xl p-2.5 ${kind === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-700'}`}><Icon size={22}/></span>
                <span className="flex-1"><span className="block font-bold text-base">{idx + 1}. {label}</span><span className="block text-xs text-slate-500 mt-1">{desc}</span></span>
                {kind === id && <CheckCircle2 size={20} className="text-indigo-600 shrink-0"/>}
              </button>
            ))}
          </div>
          <hr className="border-slate-100"/>
          <div className="space-y-3">
            <header><p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Langkah 2</p><h2 className="text-lg font-extrabold">Bahasa dokumen</h2></header>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLanguage('id')} aria-pressed={language === 'id'} className={`rounded-xl border-2 p-3 text-left ${language==='id' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}><span className="block font-bold text-sm">Indonesia</span><span className="block text-xs text-slate-500 mt-1">i, ii, iii · 1, 2, 3</span></button>
              <button type="button" onClick={() => setLanguage('ar')} aria-pressed={language === 'ar'} className={`rounded-xl border-2 p-3 text-left ${language==='ar' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}><span className="block font-bold text-sm">Arabic</span><span className="block text-xs text-slate-500 mt-1">ب، ج · ١، ٢، ٣</span></button>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 flex gap-2.5 text-xs text-emerald-950"><ShieldCheck size={20} className="shrink-0"/><p><strong>Daftar Isi manual diprioritaskan.</strong> Isi dan urutan dipertahankan bila dapat dikenali. Nomor yang cocok diberi field PAGEREF; hasil final masih perlu pembaruan field di Word. Judul yang belum cocok harus diperiksa sebelum cetak.</p></div>
          <button disabled={!kind} onClick={() => setReady(true)} type="button" className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white min-h-[54px] font-black flex items-center justify-center gap-2 shadow-md">Lanjut ke Upload Word (.docx) <ArrowRight size={19}/></button>
          <p className="text-xs text-center text-slate-500">File diproses menggunakan mesin penomoran yang ada. Gunakan Word untuk memeriksa nomor halaman setelah perbarui field.</p>
        </div>
        <div className="mt-5 text-center text-xs text-indigo-100/70 flex items-center justify-center gap-2"><Layers size={14}/> Word DOCX · Penomoran · Daftar Isi dinamis</div>
      </section>
    </main>
  );
};
