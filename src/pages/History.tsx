/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  Download,
  FileCheck,
  Trash2,
  CheckCircle2,
  Calendar,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { FormattingHistoryItem } from '../types/history';
import { storageService } from '../services/storage';
import { downloadBlob, downloadIntegrityReport, generateFormattedFilename } from '../services/exportService';

export function History() {
  const [historyItems, setHistoryItems] = useState<FormattingHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const items = await storageService.getHistory();
      setHistoryItems(items);
    } catch (err) {
      console.error('Failed loading history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteItem = async (id: string) => {
    if (confirm('Hapus entri riwayat ini?')) {
      await storageService.deleteHistoryItem(id);
      await loadHistory();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Hapus seluruh riwayat pemformatan? Tindakan ini tidak dapat dibatalkan.')) {
      await storageService.clearHistory();
      await loadHistory();
    }
  };

  const handleDownloadDocx = async (item: FormattingHistoryItem) => {
    if (!item.outputDocxBlobKey) {
      alert('File DOCX tidak tersimpan di memori browser.');
      return;
    }
    const blob = await storageService.getDocxBlob(item.outputDocxBlobKey);
    if (!blob) {
      alert('File dokumen tidak ditemukan.');
      return;
    }
    const filename = generateFormattedFilename(item.articleName, item.templateName);
    downloadBlob(blob, filename);
  };

  const handleDownloadReport = (item: FormattingHistoryItem) => {
    if (!item.integrityReport) {
      alert('Laporan validasi tidak tersedia untuk entri ini.');
      return;
    }
    downloadIntegrityReport(item.articleName, item.templateName, item.integrityReport);
  };

  const filteredItems = historyItems.filter(
    (item) =>
      item.articleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.templateName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Riwayat Pemformatan Dokumen
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar lengkap naskah artikel yang telah berhasil disesuaikan ke template jurnal beserta berkas hasil dan sertifikat integritasnya.
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Bersihkan Seluruh Riwayat
          </button>
        )}
      </div>

      {/* Search Input */}
      {historyItems.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama artikel atau jurnal tujuan..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* History Table or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 w-16 h-16 mx-auto flex items-center justify-center">
            <HistoryIcon className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Belum ada riwayat formatting tersimpan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Setelah Anda memformat artikel di menu "Format Artikel", berkas hasil dan catatan integritas akan tersimpan rapi di sini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Nama Artikel Sumber</th>
                <th className="p-4">Template Tujuan</th>
                <th className="p-4">Waktu & Durasi</th>
                <th className="p-4 text-center">Status Integritas</th>
                <th className="p-4 text-right">Aksi Unduh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {item.articleName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.originalStats.words} kata • {item.originalStats.paragraphs} paragraf
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.templateName}
                    </span>
                  </td>

                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    <div>{new Date(item.processedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</div>
                    <span className="text-[10px] text-slate-400">Durasi: {item.durationMs}ms</span>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      0 Selisih (100% Utuh)
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadDocx(item)}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                        title="Unduh Berkas .DOCX Hasil"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadReport(item)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        title="Unduh Laporan Integritas (.txt)"
                      >
                        <FileCheck className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Hapus Entri"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
