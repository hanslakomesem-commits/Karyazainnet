import React, { useState, useEffect } from 'react';
import { Search, Grid, Eye, Layers } from 'lucide-react';
import { PageTextInfo, SectionRange } from '../types';
import { renderPageToDataUrl } from '../lib/pdfExtractor';
import * as pdfjsLib from 'pdfjs-dist';

interface ThumbnailGridProps {
  pdfDoc: any | null;
  pagesText: PageTextInfo[];
  sections: SectionRange[];
  onPageClick?: (pageNumber: number) => void;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  pdfDoc,
  pagesText,
  sections,
  onPageClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loadingPages, setLoadingPages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!pdfDoc) return;

    // Render first 12 pages thumbnails initially for performance
    const renderCount = Math.min(12, pdfDoc.numPages);
    for (let i = 1; i <= renderCount; i++) {
      if (!thumbnails[i] && !loadingPages[i]) {
        setLoadingPages(prev => ({ ...prev, [i]: true }));
        renderPageToDataUrl(pdfDoc, i, 0.3)
          .then(url => {
            setThumbnails(prev => ({ ...prev, [i]: url }));
          })
          .finally(() => {
            setLoadingPages(prev => ({ ...prev, [i]: false }));
          });
      }
    }
  }, [pdfDoc]);

  const getSectionBadgeForPage = (pageNumber: number) => {
    return sections.find(s => s.detected && pageNumber >= s.startPage && pageNumber <= s.endPage);
  };

  const filteredPages = pagesText.filter(p => {
    if (!searchTerm) return true;
    return p.text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Grid className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pratinjau Halaman & Pencarian Kata Kunci ({pagesText.length} Halaman)
          </h3>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata (misal: 'BAB I', 'Abstrak')..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {filteredPages.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          Tidak ditemukan halaman dengan kata kunci "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-1">
          {filteredPages.map((p) => {
            const secBadge = getSectionBadgeForPage(p.pageNumber);
            const thumbUrl = thumbnails[p.pageNumber];

            return (
              <div
                key={p.pageNumber}
                onClick={() => onPageClick && onPageClick(p.pageNumber)}
                className={`group relative border rounded-xl overflow-hidden cursor-pointer transition-all ${
                  secBadge
                    ? 'border-blue-300 dark:border-blue-800 hover:border-blue-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                {/* Thumbnail image or placeholder */}
                <div className="aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Halaman ${p.pageNumber}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="p-2 text-center text-[10px] text-slate-400">
                      Hal #{p.pageNumber}
                    </div>
                  )}
                </div>

                {/* Section Badge Overlay */}
                {secBadge && (
                  <div className="absolute top-1 left-1 right-1">
                    <span className="block text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded shadow truncate text-center">
                      {secBadge.key.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {/* Page Number Footer */}
                <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Hal #{p.pageNumber}</span>
                  {p.isOcr && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded">OCR</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
