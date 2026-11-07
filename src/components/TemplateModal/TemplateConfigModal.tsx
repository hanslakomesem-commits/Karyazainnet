import React, { useState } from 'react';
import { X, Upload, CheckCircle2, FileCheck } from 'lucide-react';
import { JournalTemplateConfig } from '../../types/template';
import { parseMasterTemplateDocx } from '../../services/templateParser';
import { storageService } from '../../services/storage';

interface TemplateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: JournalTemplateConfig) => void;
  initialTemplate?: JournalTemplateConfig | null;
}

export function TemplateConfigModal({
  isOpen,
  onClose,
  onSave,
  initialTemplate,
}: TemplateConfigModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'meta'>('upload');
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [templateBlobKey, setTemplateBlobKey] = useState<string | undefined>(initialTemplate?.templateBlobKey);

  const [name, setName] = useState(initialTemplate?.name || '');
  const [publisher, setPublisher] = useState(initialTemplate?.publisher || '');
  const [issn, setIssn] = useState(initialTemplate?.issn || '');
  const [eIssn, setEIssn] = useState(initialTemplate?.eIssn || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(initialTemplate?.fieldOfStudy || 'Sosial & Keislaman');
  const [journalUrl, setJournalUrl] = useState(initialTemplate?.journalUrl || '');
  const [notes, setNotes] = useState(initialTemplate?.notes || '');

  const paperSize = initialTemplate?.pageLayout.paperSize === 'Letter' ? 'Letter' : 'A4';
  const columns = initialTemplate?.pageLayout.columns || 1;
  const marginTopMm = initialTemplate?.pageLayout.marginTopMm || 25;
  const marginBottomMm = initialTemplate?.pageLayout.marginBottomMm || 25;
  const marginLeftMm = initialTemplate?.pageLayout.marginLeftMm || 20;
  const marginRightMm = initialTemplate?.pageLayout.marginRightMm || 20;
  const columnSpacingMm = initialTemplate?.pageLayout.columnSpacingMm || 8;

  const fontFamily = initialTemplate?.bodyStyle.fontFamily || 'Times New Roman';
  const bodyFontSizePt = initialTemplate?.bodyStyle.fontSizePt || 10;
  const titleFontSizePt = initialTemplate?.titleStyle.fontSizePt || 14;
  const heading1FontSizePt = initialTemplate?.heading1Style.fontSizePt || 11;
  const lineSpacing = initialTemplate?.bodyStyle.lineSpacing || 1.15;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsingDocx(true);
      setParseMessage(null);

      const key = `tpl-blob-${Date.now()}`;
      await storageService.saveDocxBlob(key, file);
      setTemplateBlobKey(key);

      const parsedConfig = await parseMasterTemplateDocx(file);
      if (parsedConfig.name && !name) setName(parsedConfig.name);

      setParseMessage(`Master template "${file.name}" berhasil disimpan beserta Header & Logonya.`);
      setActiveTab('meta');
    } catch (err: any) {
      setParseMessage(`Gagal membaca file: ${err.message || 'Format tidak valid'}.`);
    } finally {
      setIsParsingDocx(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Mohon isi nama jurnal.');
      return;
    }

    const templateId = initialTemplate?.id || `tpl-${Date.now()}`;
    const config: JournalTemplateConfig = {
      id: templateId,
      name,
      publisher: publisher || 'UIN Madura',
      issn,
      eIssn,
      fieldOfStudy,
      journalUrl,
      notes,
      createdAt: initialTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true,
      language: 'id',
      templateBlobKey,
      pageLayout: {
        paperSize,
        orientation: 'portrait',
        marginTopMm,
        marginBottomMm,
        marginLeftMm,
        marginRightMm,
        columns,
        columnSpacingMm,
      },
      titleStyle: {
        fontFamily,
        fontSizePt: titleFontSizePt,
        lineSpacing: 1.15,
        spaceBeforePt: 0,
        spaceAfterPt: 12,
        alignment: 'center',
        bold: true,
      },
      authorStyle: {
        fontFamily,
        fontSizePt: Math.max(9, bodyFontSizePt + 0.5),
        lineSpacing: 1.0,
        spaceBeforePt: 0,
        spaceAfterPt: 4,
        alignment: 'center',
        bold: true,
      },
      affiliationStyle: {
        fontFamily,
        fontSizePt: Math.max(8, bodyFontSizePt - 1),
        lineSpacing: 1.0,
        spaceBeforePt: 0,
        spaceAfterPt: 4,
        alignment: 'center',
        italic: true,
      },
      emailStyle: {
        fontFamily,
        fontSizePt: Math.max(8, bodyFontSizePt - 1),
        lineSpacing: 1.0,
        spaceBeforePt: 0,
        spaceAfterPt: 12,
        alignment: 'center',
      },
      abstractTitleStyle: {
        fontFamily,
        fontSizePt: bodyFontSizePt,
        lineSpacing: 1.0,
        spaceBeforePt: 6,
        spaceAfterPt: 4,
        alignment: 'left',
        bold: true,
      },
      abstractBodyStyle: {
        fontFamily,
        fontSizePt: Math.max(8.5, bodyFontSizePt - 0.5),
        lineSpacing: 1.0,
        spaceBeforePt: 0,
        spaceAfterPt: 6,
        alignment: 'justify',
        italic: true,
      },
      keywordsStyle: {
        fontFamily,
        fontSizePt: Math.max(8.5, bodyFontSizePt - 0.5),
        lineSpacing: 1.0,
        spaceBeforePt: 0,
        spaceAfterPt: 14,
        alignment: 'justify',
        italic: true,
      },
      heading1Style: {
        fontFamily,
        fontSizePt: heading1FontSizePt,
        lineSpacing: 1.15,
        spaceBeforePt: 12,
        spaceAfterPt: 4,
        alignment: 'left',
        bold: true,
      },
      heading2Style: {
        fontFamily,
        fontSizePt: bodyFontSizePt,
        lineSpacing: 1.15,
        spaceBeforePt: 8,
        spaceAfterPt: 2,
        alignment: 'left',
        bold: true,
      },
      heading3Style: {
        fontFamily,
        fontSizePt: bodyFontSizePt,
        lineSpacing: 1.0,
        spaceBeforePt: 6,
        spaceAfterPt: 2,
        alignment: 'left',
        italic: true,
      },
      bodyStyle: {
        fontFamily,
        fontSizePt: bodyFontSizePt,
        lineSpacing,
        spaceBeforePt: 0,
        spaceAfterPt: 4,
        alignment: 'justify',
        indentFirstLineMm: 5,
      },
      tableCaptionStyle: {
        fontFamily,
        fontSizePt: Math.max(8.5, bodyFontSizePt - 1),
        lineSpacing: 1.0,
        spaceBeforePt: 6,
        spaceAfterPt: 2,
        alignment: 'left',
        bold: true,
      },
      figureCaptionStyle: {
        fontFamily,
        fontSizePt: Math.max(8.5, bodyFontSizePt - 1),
        lineSpacing: 1.0,
        spaceBeforePt: 4,
        spaceAfterPt: 6,
        alignment: 'center',
      },
      referenceStyle: {
        fontFamily,
        fontSizePt: Math.max(8.5, bodyFontSizePt - 1),
        lineSpacing: 1.0,
        spaceBeforePt: 0,
        spaceAfterPt: 3,
        alignment: 'justify',
        indentFirstLineMm: -5,
      },
      expectedStructure: [
        'TITLE',
        'AUTHOR',
        'AFFILIATION',
        'EMAIL',
        'ABSTRACT',
        'KEYWORDS',
        'PENDAHULUAN',
        'METODE',
        'HASIL DAN PEMBAHASAN',
        'KESIMPULAN',
        'DAFTAR PUSTAKA',
      ],
      headingNumbering: 'none',
      referenceCitationStyle: 'APA',
    };

    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Konfigurasi Master Template Jurnal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unggah file master .DOCX untuk menyimpan Logo dan Header bawaan template.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Upload className="w-4 h-4" />
            Unggah File Master (.docx)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'meta'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Informasi Jurnal
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {parseMessage && (
            <div className="p-3 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{parseMessage}</span>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center">
              <input
                type="file"
                id="template-file-input"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="template-file-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {isParsingDocx ? 'Memproses File...' : 'Klik untuk Unggah Master Template Word (.DOCX)'}
                </span>
              </label>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Jurnal
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Karsa: Journal of Social and Islamic Culture"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
          >
            Simpan Master Template
          </button>
        </div>
      </div>
    </div>
  );
}
