import React from 'react';
import { X, Copy, FileDown, CheckCircle2, Table, Layers } from 'lucide-react';

interface WordGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyWordTable: () => void;
  onDownloadDoc: () => void;
}

export const WordGuideModal: React.FC<WordGuideModalProps> = ({
  isOpen,
  onClose,
  onCopyWordTable,
  onDownloadDoc,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              103
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Panduan Ukuran Margin &amp; Cetak Word (Label 103)
              </h2>
              <p className="text-xs text-slate-500">
                Spesifikasi stiker Tom &amp; Jerry No. 103 (Kolom 6,4 cm × 3,3 cm, Kertas 20 × 14 cm, 3 Kolom × 4 Baris)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Quick Methods Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span>Cara Instan Tanpa Atur Margin Manual:</span>
            </h3>
            <p className="text-xs text-amber-950">
              Aplikasi ini sudah menyediakan 2 metode instan agar tabel otomatis pas berukuran 6,4 cm × 3,3 cm di Word pada kertas undangan 20 × 14 cm:
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onCopyWordTable();
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Format Tabel Word &amp; Langsung Paste (Ctrl+V)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDownloadDoc();
                  onClose();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh File .DOC Siap Buka</span>
              </button>
            </div>
          </div>

          {/* Detailed Word Specifications Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-600" />
              <span>Parameter Margin Microsoft Word (Mailings &gt; Labels &gt; Options):</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3.5">Parameter Word</th>
                    <th className="py-2.5 px-3.5">Nilai Rekomendasi</th>
                    <th className="py-2.5 px-3.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11.5px]">
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Top margin (Batas Atas)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">0,5 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Jarak tepi atas kertas ke stiker pertama</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Side margin (Batas Samping)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">0,2 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Jarak tepi kiri kertas ke stiker</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Label height (Tinggi Label)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">3,3 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Tinggi fisik tiap label</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Label width (Lebar Label)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">6,4 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Lebar fisik tiap label</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Vertical pitch</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">3,5 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Tinggi label (3,3cm) + celah vertikal (0,2cm)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Horizontal pitch</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">6,7 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Lebar label (6,4cm) + celah horizontal (0,3cm)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Number across (Kolom)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">3</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">3 label menyamping</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Number down (Baris)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">4</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">4 label menurun (Total 12 label)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-sans font-medium text-slate-800">Page size (Ukuran Kertas)</td>
                    <td className="py-2 px-3.5 font-bold text-amber-800">Ukuran Undangan: 20 cm × 14 cm</td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">Wajib gunakan ukuran undangan 20 × 14 cm (jangan gunakan Letter/A4)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Steps in MS Word */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>Langkah-langkah Pembuatan di Microsoft Word:</span>
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 ml-1">
              <li>Buka Microsoft Word, buat dokumen baru kosong.</li>
              <li>Pilih menu <strong>Mailings &gt; Labels &gt; Options</strong>.</li>
              <li>Klik tombol <strong>New Label...</strong>, beri nama misalnya &quot;Label 103&quot;.</li>
              <li>Masukkan parameter angka sesuai tabel di atas, lalu klik <strong>OK</strong>.</li>
              <li>Klik <strong>New Document</strong> untuk menghasilkan dokumen tabel 3×4.</li>
              <li>Salin daftar nama dari aplikasi ini lalu paste ke dalam tabel tersebut.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs rounded-md transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
