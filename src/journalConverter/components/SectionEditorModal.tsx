import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, RefreshCw, MessageSquare } from 'lucide-react';

interface SectionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionKey: string;
  initialContent: string;
  contextTitle: string;
  selectedModel?: string;
  onSave: (sectionKey: string, newContent: string) => void;
}

export const SectionEditorModal: React.FC<SectionEditorModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  sectionKey,
  initialContent,
  contextTitle,
  selectedModel = 'gemini-3.1-flash-lite',
  onSave,
}) => {
  const [content, setContent] = useState(initialContent);
  const [aiInstructions, setAiInstructions] = useState('');
  const [activeModel, setActiveModel] = useState(selectedModel);
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setContent(initialContent);
    setActiveModel(selectedModel || 'gemini-3.1-flash-lite');
  }, [initialContent, selectedModel, isOpen]);

  if (!isOpen) return null;

  const handleAiPolish = async () => {
    setIsPolishing(true);
    setAiError(null);

    try {
      const apiUrl = '/api/journal7/regenerate-section';
      let res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: sectionTitle,
          currentText: content,
          instructions: aiInstructions || 'Sempurnakan kepadatan bahasa, istilah ilmiah, dan tata bahasa akademis.',
          contextTitle,
          selectedModel: activeModel,
        }),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch('/api/regenerate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName: sectionTitle,
            currentText: content,
            instructions: aiInstructions || 'Sempurnakan kepadatan bahasa, istilah ilmiah, dan tata bahasa akademis.',
            contextTitle,
            selectedModel: activeModel,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui bagian.');

      setContent(data.newText);
      setAiInstructions('');
    } catch (err: any) {
      setAiError(err.message || 'Gagal menghubungi server pemrosesan ilmiah.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = () => {
    onSave(sectionKey, content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Editor Bagian Artikel</span>
            <h3 className="text-lg font-bold text-slate-900">{sectionTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Auto Refine Bar */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Sempurnakan / Revisi Bagian Ini secara Otomatis</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Contoh: Perjelas nilai f-hitung, tambahkan kutipan teori, atau perbaiki kepadatan argumen..."
                className="flex-1 text-xs px-3.5 py-2.5 border border-blue-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-xs text-slate-900"
              />
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={isPolishing}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-sm transform hover:-translate-y-0.5"
              >
                {isPolishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengolah...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sempurnakan Teks</span>
                  </>
                )}
              </button>
            </div>
            {aiError && <p className="text-xs text-rose-600 mt-1">{aiError}</p>}
          </div>

          {/* Text Editor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Isi Teks Bagian (Bisa Diedit Manual)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="w-full text-sm font-tnr p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed text-slate-900 bg-white transition-all shadow-xs"
            />
            <p className="text-xs text-slate-500 mt-1 text-right font-medium">
              Jumlah Karakter: {content.length.toLocaleString('id-ID')}
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-2 transform hover:-translate-y-0.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>

      </div>
    </div>
  );
};
