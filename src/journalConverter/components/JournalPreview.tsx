import React, { useState } from 'react';
import { Download, Edit3, Sparkles, Copy, Check, FileText, HelpCircle, Layers, BookOpen, Quote, AlertCircle, RefreshCw } from 'lucide-react';
import { JournalArticle, FootnoteItem } from '../types/journal';
import { cleanSectionContent } from '../utils/textCleaner';

interface JournalPreviewProps {
  article: JournalArticle;
  onUpdateArticle: (updatedArticle: JournalArticle) => void;
  onDownloadDocx: () => void;
  onDownloadCoverCd?: () => void;
  onDownloadBundle?: () => void;
  isDownloading?: boolean;
  isDownloadingCoverCd?: boolean;
  isDownloadingBundle?: boolean;
  onEditSection: (sectionKey: string, sectionTitle: string, currentContent: string) => void;
}

export const JournalPreview: React.FC<JournalPreviewProps> = ({
  article,
  onUpdateArticle,
  onDownloadDocx,
  onDownloadCoverCd,
  onDownloadBundle,
  isDownloading = false,
  isDownloadingCoverCd = false,
  isDownloadingBundle = false,
  onEditSection,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const { metadata, abstract, pendahuluan, metode, hasil, pembahasan, kesimpulan, daftarPustaka, footnotes } = article;

  const handleCopyText = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Calculate total words in the article
  const totalWords = [
    abstract?.abstrakIndo || '',
    abstract?.abstrakEnglish || '',
    pendahuluan || '',
    metode || '',
    hasil || '',
    pembahasan || '',
    kesimpulan || '',
    Array.isArray(daftarPustaka) ? daftarPustaka.join(' ') : (daftarPustaka || ''),
  ].reduce((acc, text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);

  // Standard Indonesian Academic Word metric (TNR 12pt, 1.5 line spacing, 3cm margin = ~300-320 words/page)
  const estimatedPages = Math.max(1, Math.round(totalWords / 310) + 1); // +1 for title/abstract/metadata header layout

  // Helper to render footnote text with *Judul Buku* in italics
  const renderFormattedFootnoteText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <i key={i} className="italic font-tnr">
            {part.slice(1, -1)}
          </i>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Helper to render footnote superscripts and highlight footnote references
  const renderParagraphWithFootnotes = (textBlock: string, sectionId: string) => {
    if (!textBlock) return null;

    const cleanedBlock = cleanSectionContent(textBlock);
    const paragraphs = cleanedBlock
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false;
        // Ignore lines that only repeat the section heading
        const isMainSectionDuplicate = /^(?:#+\s*)?(?:(?:BAGIAN|BAB|[A-E])[\.\:]\s*)?(?:HASIL(?:\s+DAN)?\s+PEMBAHASAN|HASIL\s+PENELITIAN|HASIL|PEMBAHASAN|METODE(?:\s+PENELITIAN)?|PENDAHULUAN|KESIMPULAN(?:\s+DAN\s+SARAN)?)\s*[:\.\-–—]?$/i.test(p);
        return !isMainSectionDuplicate;
      });

    const sectionFootnotes = footnotes?.filter((fn) => (fn.sectionId || 'pendahuluan') === sectionId) || [];
    const assignedMap = new Map<number, FootnoteItem[]>();
    const unassigned: FootnoteItem[] = [];

    sectionFootnotes.forEach((fn) => {
      let matchedIdx = -1;
      if (fn.anchorWord) {
        const lowerAnchor = fn.anchorWord.toLowerCase();
        matchedIdx = paragraphs.findIndex((p) => p.toLowerCase().includes(lowerAnchor));
      }
      if (matchedIdx !== -1) {
        const list = assignedMap.get(matchedIdx) || [];
        list.push(fn);
        assignedMap.set(matchedIdx, list);
      } else {
        unassigned.push(fn);
      }
    });

    if (unassigned.length > 0 && paragraphs.length > 0) {
      unassigned.forEach((fn, i) => {
        const targetIdx = i % paragraphs.length;
        const list = assignedMap.get(targetIdx) || [];
        list.push(fn);
        assignedMap.set(targetIdx, list);
      });
    }

    return paragraphs.map((para, idx) => {
      const paraFootnotes = assignedMap.get(idx) || [];

      return (
        <p key={idx} className="mb-4 text-justify leading-[1.8] indent-8 text-[15px] font-tnr text-slate-900">
          {para}
          {paraFootnotes.map((fn) => (
            <sup
              key={fn.id}
              className="ml-0.5 font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded text-[11px] cursor-pointer hover:bg-blue-200 transition-all border border-blue-300"
              title={`Catatan Kaki ${fn.number}: ${fn.text.replace(/\*/g, '')}`}
            >
              [{fn.number}]
            </sup>
          ))}
        </p>
      );
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-20 z-30">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold border border-emerald-200/60">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format Jurnal Siap Export</span>
          </span>
          <span className="inline-flex items-center space-x-1 bg-indigo-50 text-indigo-800 text-xs px-3 py-1 rounded-full font-bold border border-indigo-200/60">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>± {estimatedPages} Halaman Word ({totalWords.toLocaleString('id-ID')} Kata)</span>
          </span>
          {article.detectedMethodType && (
            <span className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-800 text-xs px-3 py-1 rounded-full font-bold border border-blue-200/80">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Metode: {
                article.detectedMethodType === 'kualitatif' ? 'Kualitatif (Sesuai Skripsi)' :
                article.detectedMethodType === 'pustaka' ? 'Studi Pustaka (Sesuai Skripsi)' :
                article.detectedMethodType === 'rnd' ? 'Pengembangan R&D (Sesuai Skripsi)' :
                article.detectedMethodType === 'campuran' ? 'Mixed Methods (Sesuai Skripsi)' :
                'Kuantitatif (Sesuai Skripsi)'
              }</span>
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium hidden lg:inline">
            Standar Wajib Tepat 18 Halaman • TNR 12pt • Spasi 1.5 • Footnotes
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onDownloadDocx}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 text-xs transform hover:-translate-y-0.5"
            title="Unduh Naskah Artikel Ilmiah (.docx)"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Membuat Word...' : 'Download (.docx)'}</span>
          </button>

          {onDownloadCoverCd && (
            <button
              onClick={onDownloadCoverCd}
              disabled={isDownloadingCoverCd}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 text-xs transform hover:-translate-y-0.5"
              title="Unduh Berkas Cover CD Word (.docx)"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingCoverCd ? 'Menyiapkan...' : 'Cover CD (.docx)'}</span>
            </button>
          )}

          {onDownloadBundle && (
            <button
              onClick={onDownloadBundle}
              disabled={isDownloadingBundle}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-1.5 text-xs transform hover:-translate-y-0.5"
              title="ZIP 5 File: Skripsi Word + PDF, Artikel Word + PDF, dan Cover CD Word"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingBundle ? 'Membuat Zip...' : 'Paket Lengkap 5 File (.zip)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Cover CD Synchronization Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm shadow-emerald-500/20">
            CD
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Cover CD Word Siap Cetak (Tersinkronisasi)</span>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                Sesuai Format IAIN/UIN
              </span>
            </p>
            <p className="text-emerald-800 leading-relaxed">
              Mahasiswa: <b>{metadata.nama || 'Penulis'}</b> (NIM: <b>{metadata.nim || '-'}</b>) • Prodi: <b>{metadata.prodi || '-'}</b> • Bulan/Tahun: <b>{metadata.bulanTahun || 'OKTOBER 2026'}</b>
            </p>
          </div>
        </div>
        {onDownloadCoverCd && (
          <button
            onClick={onDownloadCoverCd}
            disabled={isDownloadingCoverCd}
            className="text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100/60 border border-emerald-300 px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-2xs whitespace-nowrap self-end sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isDownloadingCoverCd ? 'Menyiapkan...' : 'Download Cover CD (.docx)'}</span>
          </button>
        )}
      </div>

      {/* ACADEMIC JOURNAL PAPER SIMULATOR CONTAINER */}
      <div className="bg-slate-200/50 p-4 sm:p-8 rounded-2xl border border-slate-200/60 shadow-inner">
        <div className="bg-white max-w-[850px] mx-auto shadow-md rounded-xl p-8 sm:p-14 border border-slate-200/80 font-tnr text-slate-900 min-h-[1100px] relative">
          
          {/* Header Paper Simulation Note */}
          <div className="text-center text-[11px] text-slate-400 border-b border-slate-100 pb-3 mb-8 font-sans">
            [Pratinjau Halaman Jurnal Ilmiah • Times New Roman 12pt • Spasi 1.5 • Margins 3cm]
          </div>

          {/* 1. JUDUL & METADATA PENULIS */}
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide leading-tight text-slate-900 font-tnr">
              {metadata.judul}
            </h1>

            <div className="pt-2 text-sm font-tnr space-y-1">
              <p className="font-bold text-slate-900">{metadata.nama}</p>
              <p className="italic text-slate-700">
                {metadata.prodi}
                {metadata.instansi ? `, ${metadata.instansi}` : ''}
              </p>
              {metadata.email && metadata.email.trim() && metadata.email !== '-' && (
                <p className="italic text-slate-600 text-xs">Email: {metadata.email}</p>
              )}
            </div>
          </div>

          {/* 2. ABSTRAK & ABSTRACT */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8 space-y-4 font-tnr">
            
            {/* Abstrak Indonesia */}
            <div>
              <h3 className="text-center font-bold text-sm uppercase mb-2 text-slate-900">ABSTRAK</h3>
              <p className="text-xs text-justify leading-relaxed text-slate-800">
                {abstract.abstrakIndo}
              </p>
              <p className="text-xs mt-2 text-slate-900">
                <span className="font-bold italic">Kata Kunci: </span>
                <span className="italic">
                  {Array.isArray(abstract.keywordsIndo)
                    ? abstract.keywordsIndo.join(', ')
                    : abstract.keywordsIndo}
                </span>
              </p>
            </div>

            <hr className="border-slate-300 my-3" />

            {/* Abstract English */}
            <div>
              <h3 className="text-center font-bold text-sm uppercase mb-2 text-slate-900">ABSTRACT</h3>
              <p className="text-xs text-justify italic leading-relaxed text-slate-800">
                {abstract.abstrakEnglish}
              </p>
              <p className="text-xs mt-2 text-slate-900">
                <span className="font-bold italic">Keywords: </span>
                <span className="italic">
                  {Array.isArray(abstract.keywordsEnglish)
                    ? abstract.keywordsEnglish.join(', ')
                    : abstract.keywordsEnglish}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 font-sans">
              <button
                id="edit-abstrak-indo-btn"
                onClick={() =>
                  onEditSection(
                    'abstrakIndo',
                    'Abstrak (Bahasa Indonesia)',
                    abstract.abstrakIndo
                  )
                }
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Abstrak (ID)</span>
              </button>
              <button
                id="edit-abstrak-inggris-btn"
                onClick={() =>
                  onEditSection(
                    'abstrakInggris',
                    'Abstract (English)',
                    abstract.abstrakEnglish
                  )
                }
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Abstract (EN)</span>
              </button>
            </div>
          </div>

          {/* SECTION HELPER COMPONENT */}
          {renderSectionBlock(
            'A. PENDAHULUAN',
            pendahuluan,
            'pendahuluan',
            () => onEditSection('pendahuluan', 'A. PENDAHULUAN', pendahuluan),
            () => handleCopyText(pendahuluan, 'pendahuluan'),
            copiedSection === 'pendahuluan'
          )}

          {renderSectionBlock(
            'B. METODE PENELITIAN',
            metode,
            'metode',
            () => onEditSection('metode', 'B. METODE PENELITIAN', metode),
            () => handleCopyText(metode, 'metode'),
            copiedSection === 'metode'
          )}

          {renderSectionBlock(
            'C. HASIL PENELITIAN',
            hasil,
            'hasil',
            () => onEditSection('hasil', 'C. HASIL PENELITIAN', hasil),
            () => handleCopyText(hasil, 'hasil'),
            copiedSection === 'hasil'
          )}

          {renderSectionBlock(
            'D. PEMBAHASAN',
            pembahasan,
            'pembahasan',
            () => onEditSection('pembahasan', 'D. PEMBAHASAN', pembahasan),
            () => handleCopyText(pembahasan, 'pembahasan'),
            copiedSection === 'pembahasan'
          )}

          {renderSectionBlock(
            'E. KESIMPULAN DAN SARAN',
            kesimpulan,
            'kesimpulan',
            () => onEditSection('kesimpulan', 'E. KESIMPULAN DAN SARAN', kesimpulan),
            () => handleCopyText(kesimpulan, 'kesimpulan'),
            copiedSection === 'kesimpulan'
          )}

          {/* DAFTAR PUSTAKA */}
          <div className="mb-8 font-tnr border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-3 font-sans">
              <h3 className="font-bold text-base uppercase text-slate-900 font-tnr">
                DAFTAR PUSTAKA
              </h3>
              <button
                onClick={() =>
                  onEditSection(
                    'daftarPustaka',
                    'DAFTAR PUSTAKA',
                    Array.isArray(daftarPustaka) ? daftarPustaka.join('\n') : daftarPustaka
                  )
                }
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Referensi</span>
              </button>
            </div>

            <div className="space-y-2 text-sm text-justify pl-8 -indent-8 font-tnr leading-relaxed">
              {Array.isArray(daftarPustaka) ? (
                daftarPustaka.map((item, idx) => (
                  <p key={idx} className="text-slate-900">
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-slate-900">{daftarPustaka}</p>
              )}
            </div>
          </div>

          {/* CATATAN KAKI (FOOTNOTES DISPLAY AT BOTTOM-LEFT OF PAGE) */}
          <div className="mt-14 pt-4 font-tnr text-left">
            {/* Standard Academic Footnote Separator Bar (Bottom-Left) */}
            <div className="w-36 border-t-2 border-slate-900 mb-3"></div>
            
            <div className="flex items-center justify-between mb-2 font-sans">
              <span className="font-bold text-slate-900 text-[11px] tracking-wider uppercase font-tnr flex items-center space-x-1">
                <span>CATATAN KAKI (Footnotes Kiri Bawah Halaman)</span>
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                {footnotes?.length || 0} Catatan Kaki
              </span>
            </div>

            {footnotes && footnotes.length > 0 ? (
              <div className="space-y-1.5 text-left font-tnr">
                {footnotes.map((fn) => (
                  <div key={fn.id} className="flex items-start space-x-1.5 text-slate-900 text-[11px] sm:text-[12px] leading-snug">
                    <sup className="font-bold text-blue-800 text-[10px] mt-0.5">{fn.number}</sup>
                    <p className="font-tnr text-slate-800">{renderFormattedFootnoteText(fn.text)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px] font-tnr">
                Belum ada catatan kaki khusus. Tambahkan footnote di tab "Kelola Footnotes".
              </p>
            )}

            <p className="mt-3 text-[10px] text-slate-400 font-sans italic border-t border-slate-100 pt-2">
              * Pada dokumen Microsoft Word (.docx) hasil unduhan, catatan kaki ini otomatis diposisikan secara presisi di sudut kiri bawah pada setiap halaman (bottom-left page footnote).
            </p>
          </div>

        </div>
      </div>

    </div>
  );

  function renderSectionBlock(
    title: string,
    content: string,
    sectionKey: string,
    onEdit: () => void,
    onCopy: () => void,
    isCopied: boolean
  ) {
    return (
      <div className="mb-8 font-tnr group relative">
        <div className="flex items-center justify-between mb-2 font-sans">
          <div className="flex items-center space-x-2.5">
            <h3 className="font-bold text-base uppercase text-slate-900 font-tnr tracking-tight">
              {title}
            </h3>
            {sectionKey === 'metode' && article.detectedMethodType && (
              <span className="text-[10px] font-sans font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {article.detectedMethodType === 'kualitatif' ? 'Kualitatif (Sesuai Skripsi)' :
                 article.detectedMethodType === 'pustaka' ? 'Studi Pustaka (Sesuai Skripsi)' :
                 article.detectedMethodType === 'rnd' ? 'R&D / Pengembangan' :
                 article.detectedMethodType === 'campuran' ? 'Mixed Methods' :
                 'Kuantitatif (Sesuai Skripsi)'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onCopy}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
              title="Salin Teks Bagian Ini"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onEdit}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded border border-blue-200"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Penyuntingan Akademis</span>
            </button>
          </div>
        </div>

        <div className="text-slate-900 leading-[1.8] text-[15px] font-tnr">
          {renderParagraphWithFootnotes(content, sectionKey)}
        </div>
      </div>
    );
  }
};
