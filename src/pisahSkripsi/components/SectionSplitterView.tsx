import React, { useState } from 'react';
import {
  Download,
  Eye,
  Edit3,
  Archive,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Scissors,
  Loader2,
  FileArchive,
  QrCode,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  ScanText
} from 'lucide-react';
import { PageTextInfo, SectionRange, SplitPdfResult, ThesisMetadata } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { splitPdfSections } from '../lib/pdfSplitter';
import { getScanQualityStatus } from '../lib/pdfExtractor';
import { QrisPaymentModal } from './QrisPaymentModal';

interface SectionSplitterViewProps {
  sections: SectionRange[];
  metadata: ThesisMetadata;
  pdfBuffer: ArrayBuffer | null;
  pagesText?: PageTextInfo[];
  onUpdateSectionRange: (key: string, startPage: number, endPage: number) => void;
  onOpenPreview: (url: string, title: string) => void;
  onOpenManualModal: (section: SectionRange) => void;
  onReScanOcr?: () => Promise<void>;
  isReScanningOcr?: boolean;
  isAdminLoggedIn?: boolean;
  onExportComplete?: (fileName: string) => void;
}

export const SectionSplitterView: React.FC<SectionSplitterViewProps> = ({
  sections,
  metadata,
  pdfBuffer,
  pagesText = [],
  onUpdateSectionRange,
  onOpenPreview,
  onOpenManualModal,
  onReScanOcr,
  isReScanningOcr = false,
  isAdminLoggedIn = false,
  onExportComplete,
}) => {
  const [splitResults, setSplitResults] = useState<SplitPdfResult[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const scanQualityInfo = getScanQualityStatus(pagesText, false, false);

  // QRIS Payment States (1x pakai per proses)
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [qrisInfo, setQrisInfo] = useState({ title: '', description: '', amount: 5000 });

  const requireQrisPayment = (_actionName: string, actionFn: () => Promise<void>, _amount = 5000) => {
    // Metode pembayaran QRIS dinonaktifkan: Langsung jalankan aksi
    actionFn();
    return;
  };

  const handleQrisPaymentSuccess = async () => {
    setShowQrisModal(false);
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
    setIsPaid(false); // Reset payment after process completion so next process requires new payment
    localStorage.removeItem('qris_paid_splitter');
  };

  const handleExecuteSplit = async () => {
    requireQrisPayment('Proses Pemisahan PDF', async () => {
      if (!pdfBuffer) return;
      setIsSplitting(true);
      try {
        const results = await splitPdfSections(pdfBuffer, sections);
        setSplitResults(results);
      } catch (err) {
        console.error('Error splitting PDF:', err);
        alert('Gagal memisahkan PDF. Mohon periksa kembali file PDF.');
      } finally {
        setIsSplitting(false);
      }
    });
  };

  const handleDownloadSingle = async (sec: SectionRange) => {
    requireQrisPayment(`Download ${sec.label}`, async () => {
      if (!pdfBuffer) return;
      try {
        const existing = splitResults.find(r => r.key === sec.key);
        if (existing) {
          saveAs(existing.blob, existing.filename);
          onExportComplete?.(existing.filename);
          return;
        }
        // Split on the fly if not yet generated
        const results = await splitPdfSections(pdfBuffer, [sec]);
        if (results[0]) {
          saveAs(results[0].blob, results[0].filename);
          onExportComplete?.(results[0].filename);
        }
      } catch (err) {
        console.error('Error downloading single file:', err);
        alert('Gagal mengunduh file.');
      }
    });
  };

  const handleDownloadZip = async () => {
    requireQrisPayment('Download Semua Bagian (ZIP)', async () => {
      if (!pdfBuffer) return;
      setIsZipping(true);
      try {
        // Ensure we have split results for all detected sections
        let currentResults = splitResults;
        if (currentResults.length === 0) {
          currentResults = await splitPdfSections(pdfBuffer, sections);
          setSplitResults(currentResults);
        }

        const zip = new JSZip();
        const folderName = `${metadata.nama}_${metadata.nim}_${metadata.prodiCode}`.replace(/\s+/g, '_');
        const folder = zip.folder(folderName) || zip;

        for (const res of currentResults) {
          folder.file(res.filename, res.blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${folderName}.zip`);
        onExportComplete?.(`${folderName}.zip`);
      } catch (err) {
        console.error('Error generating ZIP:', err);
        alert('Gagal membuat file ZIP.');
      } finally {
        setIsZipping(false);
      }
    });
  };

  const activeCount = sections.filter(s => s.detected && s.startPage > 0).length;

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-md">
              Struktur Naskah
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Scissors className="w-5 h-5 text-blue-400" />
              Pemisah Naskah Skripsi Berdasarkan Bab
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Teridentifikasi <strong className="text-white font-bold">{activeCount} dari 15 komponen</strong> skripsi. File asli dipisahkan secara murni tanpa kompresi, resolusi dan keaslian dokumen tetap 100% terjaga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="process-split-btn"
            onClick={handleExecuteSplit}
            disabled={isSplitting || !pdfBuffer}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSplitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Pemisahan...</span>
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                <span>Proses Pemisahan Naskah</span>
              </>
            )}
          </button>

          <button
            id="download-zip-btn"
            onClick={handleDownloadZip}
            disabled={isZipping || !pdfBuffer || activeCount === 0}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membuat Arsip ZIP...</span>
              </>
            ) : (
              <>
                <FileArchive className="w-4 h-4" />
                <span>Unduh Berkas Lengkap (ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* OCR Scan Status & Re-Scan Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              scanQualityInfo.status === 'digital_pdf'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400'
                : scanQualityInfo.status === 'docx_word'
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400'
            }`}
          >
            <ScanText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                Status Kualitas Dokumen: {scanQualityInfo.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {scanQualityInfo.description}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Jika dokumen skripsi hasil scan fotokopi miring/buram, gunakan tombol Re-Scan OCR untuk mendeteksi ulang struktur bab dengan presisi tinggi.
            </p>
          </div>
        </div>

        {onReScanOcr && (
          <button
            onClick={onReScanOcr}
            disabled={isReScanningOcr || !pdfBuffer}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-md shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isReScanningOcr ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sedang Re-Scan OCR (Tesseract)...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Paksa Re-Scan OCR (Presisi Tinggi)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Sections List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec, idx) => {
          const splitRes = splitResults.find(r => r.key === sec.key);

          return (
            <div
              key={sec.key}
              className={`rounded-xl border p-4 transition-all ${
                sec.detected && sec.startPage > 0
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mr-2">
                    #{idx + 1}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white inline">
                    {sec.label}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    sec.detected && sec.startPage > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {sec.detected && sec.startPage > 0 ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Terdeteksi ({sec.pageCount} Hal)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Tidak Ditemukan
                    </>
                  )}
                </span>
              </div>

              {/* Filename output preview */}
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-2 border border-slate-200/80 dark:border-slate-700/80 mb-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                {sec.filename}
              </div>

              {/* Page Range Display & Controls */}
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <span>Halaman:</span>
                  <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {sec.startPage > 0 ? `${sec.startPage} – ${sec.endPage}` : '0 – 0'}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onOpenManualModal(sec)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Edit Rentang Halaman Secara Manual"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {splitRes && (
                    <button
                      onClick={() => onOpenPreview(splitRes.url, sec.label)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Pratinjau Hasil PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDownloadSingle(sec)}
                    disabled={!sec.detected || sec.startPage === 0}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded text-[11px] font-medium transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Unduh PDF</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <QrisPaymentModal
        isOpen={showQrisModal}
        onClose={() => setShowQrisModal(false)}
        onSuccess={handleQrisPaymentSuccess}
        title={qrisInfo.title}
        description={qrisInfo.description}
        amount={qrisInfo.amount}
      />
    </div>
  );
};
