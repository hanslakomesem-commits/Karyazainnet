import React from 'react';
import { ParsedDocument } from '../../types/document';
import { JournalTemplateConfig } from '../../types/template';
import { extractArticleMeta } from '../../services/formattingEngine';

interface DocumentPaperPreviewProps {
  doc: ParsedDocument;
  template: JournalTemplateConfig;
  zoomLevel?: number;
}

export function DocumentPaperPreview({ doc, template, zoomLevel = 1 }: DocumentPaperPreviewProps) {
  const layout = template.pageLayout;
  const allElements = doc.bodyElements || [];
  const meta = extractArticleMeta(doc);
  const pageNumberConfig = template.pageNumberConfig;
  const pageNumberAlign = pageNumberConfig?.firstPageAlignment || pageNumberConfig?.alignment || 'right';
  const pageNumberText = pageNumberConfig?.displayText || (pageNumberAlign === 'left' ? 'Kiri Bawah' : pageNumberAlign === 'center' ? 'Tengah Bawah' : 'Kanan Bawah');

  return (
    <div className="flex flex-col items-center p-4 overflow-auto">
      {/* Banner Konfirmasi Running Header & Penomoran Halaman */}
      <div className="w-[794px] max-w-full mb-3 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
            ✓ Running Header
          </span>
          <span className="italic text-white">
            {meta.author}, {meta.shortTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold text-[11px]">
            ✓ Penomoran: {pageNumberText}
          </span>
          <span className="text-[11px] text-slate-400">
            Sesuai Template
          </span>
        </div>
      </div>

      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          width: '794px',
          minHeight: '1123px',
          paddingTop: `${layout.marginTopMm * 3.78}px`,
          paddingBottom: `${layout.marginBottomMm * 3.78}px`,
          paddingLeft: `${layout.marginLeftMm * 3.78}px`,
          paddingRight: `${layout.marginRightMm * 3.78}px`,
          fontFamily: template.bodyStyle.fontFamily || 'Times New Roman',
        }}
        className="bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-300 relative transition-transform duration-200"
      >
        {/* Crop Marks Word di Sudut Halaman */}
        <div className="absolute top-2 left-2 text-slate-300 font-mono text-xs select-none pointer-events-none">┌</div>
        <div className="absolute top-2 right-2 text-slate-300 font-mono text-xs select-none pointer-events-none">┐</div>

        {/* Running Header Sebelah Kanan Atas Sesuai Format Jurnal */}
        <div className="text-right text-[10px] text-slate-600 mb-2 leading-tight">
          <p className="italic">{meta.author}, {meta.shortTitle}</p>
          <p className="text-[9px] text-sky-700">
            DOI: {template.doi ? `https://doi.org/${template.doi.replace(/^https?:\/\/doi\.org\//, '')}` : 'https://doi.org/10.19105/karsa.vX1iX.XXXX'}
          </p>
        </div>

        {/* KOP / BANNER TEMPLATE JURNAL (LOGO + TEKS + GARIS PEMBATAS) */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            {/* Logo Template */}
            <div className="shrink-0 flex items-center justify-center">
              {template.headerLogoUrl ? (
                <img
                  src={template.headerLogoUrl}
                  alt="Logo Template"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                /* Emblem Kaligrafi Bintang Geometris Hijau (Sesuai Logo Karsa / Template Jurnal) */
                <svg
                  className="w-16 h-16 text-emerald-700"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  {/* Bintang Geometri 8 Sudut */}
                  <rect x="20" y="20" width="60" height="60" rx="3" stroke="#15803d" strokeWidth="2.5" />
                  <rect x="20" y="20" width="60" height="60" rx="3" transform="rotate(45 50 50)" stroke="#15803d" strokeWidth="2.5" />
                  {/* Motif Kaligrafi Kufi di Dalam */}
                  <path d="M35 35h30v30H35z" stroke="#166534" strokeWidth="1.5" />
                  <path d="M40 40h20v20H40z" stroke="#15803d" strokeWidth="1.5" />
                  <path d="M45 35v30M55 35v30M35 45h30M35 55h30" stroke="#15803d" strokeWidth="1" />
                </svg>
              )}
            </div>

            {/* Teks Identitas Jurnal */}
            <div className="flex-1 space-y-0.5">
              <h1 className="font-bold text-[13px] text-slate-900 tracking-tight leading-tight">
                {template.headerTitle || 'Karsa: Journal of Social and Islamic Culture'}
              </h1>
              {template.headerLines && template.headerLines.length > 0 ? (
                template.headerLines.map((line, idx) => (
                  <p key={idx} className="text-[11px] text-slate-800 leading-tight">
                    {line}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-[11px] text-slate-800 leading-tight">ISSN: 2442-3289 (p); 2442-8285 (e)</p>
                  <p className="text-[11px] text-slate-800 leading-tight">Vol. XX No.X, December 20XX, pp. XX–XX</p>
                  <p className="text-[11px] text-slate-800 leading-tight">DOI: 10.19105/karsa.vX1iX.XXXX</p>
                </>
              )}
            </div>
          </div>

          {/* Garis Horizontal Pembatas Tebal Sesuai Template Jurnal */}
          <div className="w-full border-b-2 border-slate-900 mt-3 mb-6" />
        </div>

        {/* Tampilkan 100% seluruh paragraf dan tabel tanpa ada pemotongan */}
        <div
          style={{
            columnCount: layout.columns,
            columnGap: `${layout.columnSpacingMm * 3.78}px`,
            columnRule: layout.columns === 2 ? '1px solid #e2e8f0' : 'none',
          }}
          className="text-justify space-y-2 text-xs leading-relaxed"
        >
          {allElements.map((el, idx) => {
            if (el.type === 'paragraph') {
              return (
                <p key={idx} className="whitespace-pre-wrap text-slate-800">
                  {el.paragraph.text}
                </p>
              );
            } else {
              return (
                <div key={idx} className="my-2 overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-[10px]">
                    <tbody>
                      {el.table.rows.map((r, rIdx) => (
                        <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-bold' : ''}>
                          {r.cells.map((c, cIdx) => (
                            <td key={cIdx} className="p-1 border border-slate-300">
                              {c.text}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          })}
        </div>

        {/* PENOMORAN HALAMAN DI KAKI KERTAS SESUAI TATA LETAK TEMPLATE */}
        <div className={`mt-8 pt-4 border-t border-slate-100 ${
          pageNumberAlign === 'left' ? 'text-left' : pageNumberAlign === 'center' ? 'text-center' : 'text-right'
        }`}>
          <span className="font-serif text-[11px] text-slate-500 font-medium select-none">1</span>
        </div>
      </div>
    </div>
  );
}