import React, { useState } from 'react';
import { X, FileText, ShieldCheck, Search, BookOpen, Layers } from 'lucide-react';
import type { DocxFileInfo, PlagiarismSegment } from '../types';

interface DocxPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docxInfo: DocxFileInfo;
  segments: PlagiarismSegment[];
}

export const DocxPreviewModal: React.FC<DocxPreviewModalProps> = ({
  isOpen,
  onClose,
  docxInfo,
  segments,
}) => {
  if (!isOpen || !docxInfo) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'document' | 'footnotes'>('document');

  const safeFootnotes = docxInfo.footnotes || [];
  const safeSegments = segments || [];

  // Extract text paragraphs from document.xml DOM
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docxInfo.documentXml || '', 'application/xml');
  const pElements = Array.from(xmlDoc.getElementsByTagName('w:p'));

  const parsedParagraphs = pElements
    .map((p, idx) => {
      const tNodes = p.getElementsByTagName('w:t');
      let text = '';
      for (let j = 0; j < tNodes.length; j++) {
        text += tNodes[j].textContent || '';
      }

      const fnRefs = Array.from(p.getElementsByTagName('w:footnoteReference')).map(
        (fn) => fn.getAttribute('w:id')
      ).filter(Boolean);

      const cleanText = text.trim();
      return {
        index: idx,
        text: cleanText,
        footnoteIds: fnRefs as string[],
        isHeading: cleanText.startsWith('BAB ') || cleanText.startsWith('A. ') || cleanText.startsWith('B. ') || cleanText.startsWith('C. '),
      };
    })
    .filter((p) => p.text.length > 0);

  const filteredParagraphs = parsedParagraphs.filter((p) =>
    p.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Pratinjau Naskah Skripsi: {docxInfo.fileName}
              </h3>
              <p className="text-[11px] text-slate-400">
                {docxInfo.totalParagraphs || 0} Paragraf • {safeFootnotes.length} Footnote Terjaga
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Navigation Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('document')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'document' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Isi Naskah Dokumen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('footnotes')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'footnotes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Daftar {safeFootnotes.length} Footnote</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari teks dalam dokumen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4 bg-slate-100/40">
          {activeTab === 'document' ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 font-serif text-slate-800 text-sm leading-relaxed max-w-3xl mx-auto">
              {filteredParagraphs.map((p) => {
                // Check if this paragraph contains a plagiarized or paraphrased segment
                const matchedSegment = safeSegments.find(
                  (s) => s.matchedInDoc && s.paragraphIndex === p.index
                );

                return (
                  <div
                    key={p.index}
                    className={`relative ${
                      p.isHeading
                        ? 'font-sans font-bold text-slate-900 text-center py-2'
                        : 'indent-8 text-justify'
                    } ${
                      matchedSegment
                        ? 'bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/80'
                        : ''
                    }`}
                  >
                    <span>{p.text}</span>

                    {/* Render Footnote Reference Badges */}
                    {p.footnoteIds.map((fnId) => (
                      <sup
                        key={fnId}
                        className="inline-flex items-center justify-center ml-0.5 px-1 py-0.2 bg-emerald-600 text-white text-[10px] font-sans font-bold rounded-sm shadow-xs"
                        title={`Catatan Kaki Footnote #${fnId}`}
                      >
                        {fnId}
                      </sup>
                    ))}

                    {matchedSegment && (
                      <div className="not-italic text-[10px] font-sans text-emerald-800 font-semibold mt-1 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Bagian ini telah diparafrase & siap diupdate</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl mx-auto">
              {safeFootnotes.map((fn) => (
                <div
                  key={fn.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
                    {fn.number}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-xs">
                      <span className="font-bold text-slate-900">Footnote #{fn.number}</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        w:id="{fn.id}"
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-serif italic">
                      {fn.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Struktur format Word, margin, font, dan penomoran footnote 100% diproteksi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
