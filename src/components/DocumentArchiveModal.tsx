import React, { useState, useMemo } from 'react';
import { 
  X, 
  FolderArchive, 
  Search, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ExternalLink,
  Eye,
  FileCode,
  Save,
  Share2
} from 'lucide-react';
import { UserDocumentItem } from '../types';

interface DocumentArchiveModalProps {
  documents?: UserDocumentItem[];
  isOpen: boolean;
  onClose: () => void;
  onSaveDocument: (doc: UserDocumentItem) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
}

export const DocumentArchiveModal: React.FC<DocumentArchiveModalProps> = ({
  documents = [],
  isOpen,
  onClose,
  onSaveDocument,
  onDeleteDocument
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<UserDocumentItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Draft State
  const [newTitle, setNewTitle] = useState('');
  const [newToolTitle, setNewToolTitle] = useState('Generator Artikel Ilmiah');
  const [newCategoryTitle, setNewCategoryTitle] = useState('Buat Artikel Ilmiah');
  const [newContent, setNewContent] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return (documents || []).filter((d) => {
      if (categoryFilter !== 'all' && d.categoryTitle !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (d.title || '').toLowerCase().includes(q);
        const matchesTool = (d.toolTitle || '').toLowerCase().includes(q);
        const matchesContent = (d.content || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesTool && !matchesContent) return false;
      }
      return true;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [documents, searchQuery, categoryFilter]);

  // Unique categories for filter
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    (documents || []).forEach(d => {
      if (d?.categoryTitle) set.add(d.categoryTitle);
    });
    return Array.from(set);
  }, [documents]);

  if (!isOpen) return null;

  const handleSelectDoc = (doc: UserDocumentItem) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditNotes(doc.notes || '');
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadDocx = (doc: UserDocumentItem) => {
    // Generate clean HTML-based docx file
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${doc.title}</title>
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2.5cm; }
      h1 { font-size: 16pt; text-align: center; font-weight: bold; margin-bottom: 20px; }
      h2 { font-size: 14pt; font-weight: bold; margin-top: 18px; margin-bottom: 8px; }
      p { text-align: justify; text-indent: 1.25cm; margin-bottom: 6px; }
      .meta { text-align: center; font-size: 10pt; color: #555; margin-bottom: 25px; }
    </style>
    </head><body>
    <h1>${doc.title.toUpperCase()}</h1>
    <div class="meta">Digenerate melalui ${doc.toolTitle} (ZAIN.NET Academic Suite) | ${new Date(doc.createdAt).toLocaleDateString('id-ID')}</div>
    <div>${doc.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</div>
    </body></html>`;

    const blob = new Blob(['\ufeff', header], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = (doc: UserDocumentItem) => {
    const textContent = `${doc.title.toUpperCase()}\n` +
      `Sumber: ${doc.toolTitle} - ZAIN.NET\n` +
      `Tanggal: ${new Date(doc.createdAt).toLocaleString('id-ID')}\n\n` +
      `===================================================\n\n` +
      doc.content;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    const wordCount = editContent.trim().split(/\s+/).filter(Boolean).length;
    const updated: UserDocumentItem = {
      ...selectedDoc,
      title: editTitle.trim() || 'Dokumen Tanpa Judul',
      content: editContent,
      notes: editNotes,
      wordCount,
      updatedAt: Date.now()
    };
    await onSaveDocument(updated);
    setSelectedDoc(updated);
    setIsEditing(false);
  };

  const handleCreateNewDoc = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Judul dan isi dokumen wajib diisi.');
      return;
    }

    const wordCount = newContent.trim().split(/\s+/).filter(Boolean).length;
    const newDoc: UserDocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'user',
      toolId: 'manual',
      toolTitle: newToolTitle,
      categoryTitle: newCategoryTitle,
      title: newTitle.trim(),
      content: newContent,
      notes: newNotes,
      wordCount,
      fileType: 'docx',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await onSaveDocument(newDoc);
    setSelectedDoc(newDoc);
    setIsCreatingNew(false);
    setNewTitle('');
    setNewContent('');
    setNewNotes('');
  };

  const handleDelete = async (docId: string) => {
    if (confirm('Hapus dokumen ini dari arsip riwayat Anda?')) {
      await onDeleteDocument(docId);
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/80 my-auto text-slate-100 max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20 shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Manajemen Dokumen & Riwayat Hasil Karya
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {documents.length} Berkas Tersimpan
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Arsip otomatis hasil generate skripsi, artikel & makalah. Unduh ulang kapan saja tanpa kuota.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setSelectedDoc(null);
              }}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Simpan Draft Baru</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Document List (Left) & Document Preview / Editor (Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: List & Search (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3 overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:pr-3">
            {/* Search & Filter bar */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari naskah skripsi, judul..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {categoryOptions.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Semua ({documents.length})
                  </button>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                        categoryFilter === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Document Card Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-3">
                  <FolderArchive className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                  <p className="text-xs">
                    {documents.length === 0
                      ? 'Belum ada arsip dokumen. Hasil karya dari modul akan tersimpan di sini.'
                      : 'Tidak ada dokumen yang cocok dengan filter pencarian.'}
                  </p>
                  {documents.length === 0 && (
                    <button
                      onClick={() => setIsCreatingNew(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      + Tambah Draft Manual
                    </button>
                  )}
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-left relative group ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 truncate max-w-[150px]">
                          {doc.toolTitle}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-300 transition-colors">
                        {doc.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {doc.content}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                        <span>{doc.wordCount || doc.content.split(/\s+/).filter(Boolean).length} kata</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyText(doc.content, doc.id);
                            }}
                            title="Salin isi teks"
                            className="p-1 hover:text-white transition-colors"
                          >
                            {copiedId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDocx(doc);
                            }}
                            title="Unduh format Word (.doc)"
                            className="p-1 hover:text-white transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Document Viewer / Editor / New Draft (7 cols) */}
          <div className="md:col-span-7 flex flex-col overflow-hidden bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
            
            {isCreatingNew ? (
              /* CREATE NEW DRAFT FORM */
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Buat / Simpan Draft Naskah Baru</span>
                  </h3>
                  <button
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Judul Karya / Naskah Skripsi</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Contoh: Analisis Kinerja Keuangan Perbankan Syariah..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Modul Generator</label>
                      <input
                        type="text"
                        value={newToolTitle}
                        onChange={(e) => setNewToolTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Kategori</label>
                      <input
                        type="text"
                        value={newCategoryTitle}
                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Isi Naskah Lengkap (Abstrak / Bab / Artikel)</label>
                    <textarea
                      rows={10}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Tempel atau ketik teks hasil karya di sini..."
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Catatan Tambahan (Opsional)</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Contoh: Revisi Dosen Pembimbing 1..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewDoc}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan ke Arsip</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedDoc ? (
              /* VIEW / EDIT SELECTED DOCUMENT */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Action Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0 gap-2 flex-wrap">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedDoc.toolTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">
                      Dibuat: {new Date(selectedDoc.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          title="Edit judul atau naskah"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          onClick={() => handleCopyText(selectedDoc.content, selectedDoc.id)}
                          title="Salin seluruh isi dokumen"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === selectedDoc.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 hidden sm:inline">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadDocx(selectedDoc)}
                          title="Unduh berkas Word (.doc)"
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Word (.doc)</span>
                        </button>

                        <button
                          onClick={() => handleDownloadTxt(selectedDoc)}
                          title="Unduh format Teks (.txt)"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold hidden sm:flex items-center gap-1 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>TXT</span>
                        </button>

                        <button
                          onClick={() => handleDelete(selectedDoc.id)}
                          title="Hapus dari arsip"
                          className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content View / Edit Area */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 custom-scrollbar">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Judul Dokumen</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Isi Naskah</label>
                        <textarea
                          rows={14}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-serif"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Catatan</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug mb-2 font-serif">
                        {selectedDoc.title}
                      </h3>

                      {selectedDoc.notes && (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 mb-3 italic">
                          Catatan: {selectedDoc.notes}
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-wrap selection:bg-blue-500 selection:text-white">
                        {selectedDoc.content}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                  <span>{selectedDoc.wordCount || selectedDoc.content.split(/\s+/).filter(Boolean).length} kata total</span>
                  <span>Diperbarui: {new Date(selectedDoc.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            ) : (
              /* EMPTY SELECTION STATE */
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 p-8 text-center">
                <FileText className="w-12 h-12 opacity-30 text-slate-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-300">Pilih Dokumen dari Daftar</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Klik salah satu dokumen di sebelah kiri untuk membaca pratinjau, menyalin teks, atau mengunduh ulang berkas Word (.doc).
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer info bar */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Tersinkronisasi otomatis ke cloud akun ZAIN.NET Anda</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Tutup Arsip
          </button>
        </div>

      </div>
    </div>
  );
};
