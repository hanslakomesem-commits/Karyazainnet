import React, { useState } from 'react';
import { Plus, Trash2, Edit2, BookOpen, FileText, Users, Sparkles, RefreshCw } from 'lucide-react';
import { FootnoteItem, JournalArticle } from '../types/journal';

interface FootnoteManagerProps {
  footnotes: FootnoteItem[];
  onUpdateFootnotes: (updatedFootnotes: FootnoteItem[]) => void;
  article?: JournalArticle;
}

export const FootnoteManager: React.FC<FootnoteManagerProps> = ({
  footnotes,
  onUpdateFootnotes,
  article,
}) => {
  const [inputMode, setInputMode] = useState<'book' | 'interview' | 'manual'>('book');

  // Book citation builder state
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookCity, setBookCity] = useState('');
  const [bookPublisher, setBookPublisher] = useState('');
  const [bookYear, setBookYear] = useState('2022');
  const [bookPage, setBookPage] = useState('');

  // Interview / Observation builder state
  const [intervieweeName, setIntervieweeName] = useState('');
  const [intervieweeRole, setIntervieweeRole] = useState('');
  const [observationType, setObservationType] = useState('Hasil Observasi dan Wawancara Mendalam');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewDate, setInterviewDate] = useState('');

  // Manual text state
  const [newText, setNewText] = useState('');

  // Common placement fields
  const [newSectionId, setNewSectionId] = useState('pendahuluan');
  const [newAnchorWord, setNewAnchorWord] = useState('');

  // Edit existing footnote state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Regenerating footnotes state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Build formatted preview for Book or Interview mode
  const getBuiltFootnoteText = (): string => {
    if (inputMode === 'book') {
      const authorPart = bookAuthor.trim() || 'Nama Penulis';
      const titlePart = bookTitle.trim() ? `*${bookTitle.trim()}*` : '*Judul Buku*';
      const cityPart = bookCity.trim() || 'Kota';
      const pubPart = bookPublisher.trim() || 'Penerbit';
      const yearPart = bookYear.trim() || 'Tahun';
      const pagePart = bookPage.trim() ? `, hlm. ${bookPage.trim().replace(/^hlm\.?\s*/i, '')}` : '';
      return `${authorPart}, ${titlePart} (${cityPart}: ${pubPart}, ${yearPart})${pagePart}.`;
    }

    if (inputMode === 'interview') {
      const activity = observationType.trim() || 'Hasil Observasi dan Wawancara';
      const namePart = intervieweeName.trim() || 'Nama Narasumber';
      const rolePart = intervieweeRole.trim() ? ` (${intervieweeRole.trim()})` : '';
      const locPart = interviewLocation.trim() ? `, di ${interviewLocation.trim()}` : '';
      const datePart = interviewDate.trim() ? `, pada tanggal ${interviewDate.trim()}` : '';
      return `${activity} dengan ${namePart}${rolePart}${locPart}${datePart}.`;
    }

    return newText.trim();
  };

  const handleAddFootnote = (e: React.FormEvent) => {
    e.preventDefault();

    let finalFootnoteText = '';
    if (inputMode === 'book') {
      if (!bookAuthor.trim() || !bookTitle.trim()) return;
      finalFootnoteText = getBuiltFootnoteText();
    } else if (inputMode === 'interview') {
      if (!intervieweeName.trim()) return;
      finalFootnoteText = getBuiltFootnoteText();
    } else {
      if (!newText.trim()) return;
      finalFootnoteText = newText.trim();
    }

    const newFn: FootnoteItem = {
      id: 'fn_' + Date.now(),
      number: footnotes.length + 1,
      text: finalFootnoteText,
      sectionId: newSectionId,
      anchorWord: newAnchorWord.trim() || undefined,
      sourceType:
        inputMode === 'interview' || /wawancara|observasi|narasumber/i.test(finalFootnoteText)
          ? 'interview'
          : 'book',
    };

    onUpdateFootnotes([...footnotes, newFn]);

    // Reset fields
    setBookAuthor('');
    setBookTitle('');
    setBookCity('');
    setBookPublisher('');
    setBookPage('');
    setIntervieweeName('');
    setIntervieweeRole('');
    setInterviewLocation('');
    setInterviewDate('');
    setNewText('');
    setNewAnchorWord('');
  };

  const handleRegenerateFootnotes = async () => {
    if (!article) return;
    setIsRegenerating(true);
    setRegenError(null);
    try {
      let res = await fetch('/api/journal7/regenerate-footnotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article,
          selectedModel: article.selectedModel,
        }),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch('/api/regenerate-footnotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article,
            selectedModel: article.selectedModel,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui footnote.');
      }
      if (Array.isArray(data.footnotes) && data.footnotes.length > 0) {
        onUpdateFootnotes(data.footnotes);
      }
    } catch (err: any) {
      setRegenError(err.message || 'Gagal membuat ulang catatan kaki.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteFootnote = (id: string) => {
    const filtered = footnotes.filter((fn) => fn.id !== id);
    const renumbered = filtered.map((fn, idx) => ({ ...fn, number: idx + 1 }));
    onUpdateFootnotes(renumbered);
  };

  const handleStartEdit = (fn: FootnoteItem) => {
    setEditingId(fn.id);
    setEditText(fn.text);
  };

  const handleSaveEdit = (id: string) => {
    const updated = footnotes.map((fn) =>
      fn.id === id
        ? {
            ...fn,
            text: editText,
            sourceType: (/wawancara|observasi|narasumber/i.test(editText) ? 'interview' : 'book') as
              | 'book'
              | 'interview',
          }
        : fn
    );
    onUpdateFootnotes(updated);
    setEditingId(null);
  };

  const renderFormattedFootnoteText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <i key={i} className="italic font-tnr font-semibold text-slate-900">
            {part.slice(1, -1)}
          </i>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-100 flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Kelola Catatan Kaki (Footnotes Standar Buku & Observasi/Wawancara)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Format standar ilmiah: memakai Nama Penulis & <i>Judul Buku</i> untuk literatur, serta menyertakan Nama Narasumber yang diwawancarai untuk observasi lapangan.
            </p>
          </div>
        </div>

        {article && (
          <button
            type="button"
            onClick={handleRegenerateFootnotes}
            disabled={isRegenerating}
            className="inline-flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>
              {isRegenerating ? 'Menyusun Ulang Footnote...' : 'Buat Ulang Footnote Standar'}
            </span>
          </button>
        )}
      </div>

      {regenError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          {regenError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Add New Footnote */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 h-fit space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Tambah Catatan Kaki Baru</span>
          </h3>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setInputMode('book')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                inputMode === 'book'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buku</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('interview');
                if (newSectionId === 'pendahuluan') setNewSectionId('hasil');
              }}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                inputMode === 'interview'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Wawancara</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                inputMode === 'manual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manual</span>
            </button>
          </div>

          <form onSubmit={handleAddFootnote} className="space-y-3.5">
            {inputMode === 'book' && (
              <div className="space-y-3 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Lengkap Penulis Buku (Tanpa Dibalik) *
                  </label>
                  <input
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    placeholder="Contoh: Sugiyono / Philip Kotler dan Kevin Lane Keller"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama / Judul Buku (Otomatis Cetak Miring) *
                  </label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="Contoh: Metode Penelitian Kuantitatif, Kualitatif, dan R&D"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 italic"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kota Terbit
                    </label>
                    <input
                      type="text"
                      value={bookCity}
                      onChange={(e) => setBookCity(e.target.value)}
                      placeholder="Misal: Bandung"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Penerbit
                    </label>
                    <input
                      type="text"
                      value={bookPublisher}
                      onChange={(e) => setBookPublisher(e.target.value)}
                      placeholder="Misal: Alfabeta"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tahun Terbit
                    </label>
                    <input
                      type="text"
                      value={bookYear}
                      onChange={(e) => setBookYear(e.target.value)}
                      placeholder="Misal: 2022"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nomor Halaman (hlm.)
                    </label>
                    <input
                      type="text"
                      value={bookPage}
                      onChange={(e) => setBookPage(e.target.value)}
                      placeholder="Misal: 85"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                </div>
                <div className="pt-1 border-t border-blue-200/60">
                  <span className="block text-[10px] font-bold text-blue-800 uppercase mb-0.5">
                    Pratinjau Format Footnote Buku:
                  </span>
                  <p className="text-xs font-tnr text-slate-800 bg-white p-2 rounded border border-blue-100">
                    {renderFormattedFootnoteText(getBuiltFootnoteText())}
                  </p>
                </div>
              </div>
            )}

            {inputMode === 'interview' && (
              <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Lengkap Narasumber yang Diwawancarai *
                  </label>
                  <input
                    type="text"
                    value={intervieweeName}
                    onChange={(e) => setIntervieweeName(e.target.value)}
                    placeholder="Contoh: Bapak H. Hendra Wijaya / Ibu Rina Kartika"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jabatan / Peran Narasumber
                  </label>
                  <input
                    type="text"
                    value={intervieweeRole}
                    onChange={(e) => setIntervieweeRole(e.target.value)}
                    placeholder="Contoh: Pemilik UMKM Kedai Nusantara / Manajer Operasional"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jenis Kegiatan Lapangan
                  </label>
                  <select
                    value={observationType}
                    onChange={(e) => setObservationType(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="Hasil Observasi dan Wawancara Mendalam">
                      Hasil Observasi dan Wawancara Mendalam
                    </option>
                    <option value="Wawancara Pribadi dan Observasi Lapangan">
                      Wawancara Pribadi dan Observasi Lapangan
                    </option>
                    <option value="Hasil Wawancara Langsung">Hasil Wawancara Langsung</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lokasi Observasi
                    </label>
                    <input
                      type="text"
                      value={interviewLocation}
                      onChange={(e) => setInterviewLocation(e.target.value)}
                      placeholder="Misal: Kota Bandung"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tanggal Wawancara
                    </label>
                    <input
                      type="text"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      placeholder="Misal: 14 Januari 2025"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                </div>
                <div className="pt-1 border-t border-emerald-200/60">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                    Pratinjau Footnote Observasi & Wawancara:
                  </span>
                  <p className="text-xs font-tnr text-slate-800 bg-white p-2 rounded border border-emerald-100">
                    {getBuiltFootnoteText()}
                  </p>
                </div>
              </div>
            )}

            {inputMode === 'manual' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Isi Catatan Kaki (Gunakan *Judul Buku* untuk cetak miring)
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Contoh: Basu Swastha, *Manajemen Pemasaran Modern* (Yogyakarta: Liberty, 2020), hlm. 45."
                  rows={3}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 text-slate-900 transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lokasi Bagian Artikel
              </label>
              <select
                value={newSectionId}
                onChange={(e) => setNewSectionId(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 font-medium transition-all shadow-sm"
              >
                <option value="pendahuluan">A. Pendahuluan</option>
                <option value="metode">B. Metode Penelitian</option>
                <option value="hasil">C. Hasil Penelitian</option>
                <option value="pembahasan">D. Pembahasan</option>
                <option value="kesimpulan">E. Kesimpulan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Kunci Acuan (Anchor Word - Opsional)
              </label>
              <input
                type="text"
                value={newAnchorWord}
                onChange={(e) => setNewAnchorWord(e.target.value)}
                placeholder="Kata dalam paragraf yang diberi nomor footnote (misal: 'Slovin' atau 'wawancara')"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center space-x-1.5 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan Footnote</span>
            </button>
          </form>
        </div>

        {/* List of Existing Footnotes */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Daftar Catatan Kaki Terdaftar ({footnotes.length})</span>
            <span className="text-xs font-semibold text-slate-500">
              Format Standar Buku & Wawancara
            </span>
          </h3>

          {footnotes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                Belum ada catatan kaki yang dibuat.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {footnotes.map((fn) => {
                const isInterview =
                  fn.sourceType === 'interview' ||
                  /wawancara|observasi|narasumber|informan/i.test(fn.text);
                return (
                  <div
                    key={fn.id}
                    className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-blue-50/30 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-blue-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                        {fn.number}
                      </span>

                      <div className="flex-1">
                        {editingId === fn.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              className="w-full text-xs p-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 bg-white"
                            />
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSaveEdit(fn.id)}
                                className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="bg-slate-200 text-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs sm:text-[13px] text-slate-800 font-tnr leading-relaxed">
                              {renderFormattedFootnoteText(fn.text)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1 ${
                                  isInterview
                                    ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                                    : 'bg-blue-100/80 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {isInterview ? (
                                  <>
                                    <Users className="w-3 h-3 mr-1" />
                                    <span>Observasi & Wawancara</span>
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    <span>Referensi Buku</span>
                                  </>
                                )}
                              </span>
                              <span className="bg-slate-200/70 px-2.5 py-0.5 rounded-md text-slate-700 capitalize font-medium">
                                Bagian: {fn.sectionId}
                              </span>
                              {fn.anchorWord && (
                                <span className="text-blue-700 font-medium">
                                  Acuan: "{fn.anchorWord}"
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEdit(fn)}
                        className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                        title="Edit Footnote"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFootnote(fn.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Footnote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
