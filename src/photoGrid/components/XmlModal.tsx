import React, { useState } from 'react';
import { X, Copy, Check, Download, CodeXml, Layers, FileCode } from 'lucide-react';
import { CalculatedLayout, GridConfig } from '../types';

interface XmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentXml: string;
  layout: CalculatedLayout;
  config: GridConfig;
}

export const XmlModal: React.FC<XmlModalProps> = ({
  isOpen,
  onClose,
  documentXml,
  layout,
  config,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(documentXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([documentXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${config.targetWidthCm}x${config.targetHeightCm}cm.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Struktur Office OpenXML (document.xml)
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                EMU: {layout.emuWidth.toLocaleString()} × {layout.emuHeight.toLocaleString()} · Twips: {layout.twipWidth} × {layout.twipHeight}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin XML</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadXml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh document.xml</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer ml-2"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Technical Explainer Sub-bar */}
        <div className="px-6 py-2.5 bg-neutral-900 text-neutral-300 text-xs font-mono flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">● OpenXML 2.0 Compliant</span>
            <span>·</span>
            <span>Tag Utama: &lt;w:tbl&gt; &lt;w:tr&gt; &lt;w:tc&gt; &lt;w:drawing&gt;</span>
          </div>
          <div className="text-neutral-400">
            1 cm = 360,000 EMU · 1 cm ≈ 567 Twips (dxa)
          </div>
        </div>

        {/* Code Content View */}
        <div className="flex-1 p-6 overflow-auto bg-neutral-950 text-neutral-100 font-mono text-xs leading-relaxed select-text">
          <pre className="whitespace-pre overflow-x-auto text-emerald-300/90 font-mono">
            {documentXml}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <span>
            File XML ini siap diintegrasikan ke sistem otomasi, template engine Word, atau OpenXML SDK.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
