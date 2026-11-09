import React, { useState } from 'react';
import { Header } from './components/Header';
import { SkripsiUploader } from './components/SkripsiUploader';
import { JournalPreview } from './components/JournalPreview';
import { SectionEditorModal } from './components/SectionEditorModal';
import { FootnoteManager } from './components/FootnoteManager';
import { SkripsiInput, JournalArticle, FootnoteItem } from './types/journal';
import { buildJournalDocx, exportJournalToDocx } from './utils/docxExport';
import { triggerBundleDownload, downloadCoverCdOnly } from './utils/bundleExport';
import { buildCoverCdDocx } from './utils/coverCdExport';
import { isSuspiciousFilenameTitle, isValidThesisTitle, extractMetadataFromSkripsiText } from './components/SkripsiUploader';
import { AlertCircle } from 'lucide-react';

interface JournalConverterAppProps {
  onArticleComplete?: (fileName: string) => void;
  onDownloadsConfirmed?: () => void;
}

export default function App({ onArticleComplete, onDownloadsConfirmed }: JournalConverterAppProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'footnotes'>('upload');
  const [article, setArticle] = useState<JournalArticle | null>(null);

  const handleTabChange = (tab: 'upload' | 'preview' | 'footnotes') => {
    // Cegah kembali ke menu unggah skripsi jika naskah artikel sudah berhasil dibuat
    if (article && tab === 'upload') {
      return;
    }
    setActiveTab(tab);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingCoverCd, setIsDownloadingCoverCd] = useState(false);
  // ZAINNET_LINK7_TWO_DOCX_SAFE_CLOSE_20261109
  // Browser websites cannot observe the OS download manager. Require the user
  // to confirm both Word files exist before returning to the main menu.
  const [wordPairPhase, setWordPairPhase] = useState<'idle' | 'preparing' | 'requested' | 'error'>('idle');
  const [wordPairMessage, setWordPairMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Zainnet Model State (saved to localStorage so user choice persists)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem('zainnet_selected_model') || 'gemini-3.1-flash-lite';
    } catch {
      return 'gemini-3.1-flash-lite';
    }
  });

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('zainnet_selected_model', modelId);
    } catch {
      // ignore
    }
  };

  // Section Editor Modal state
  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean;
    sectionKey: string;
    sectionTitle: string;
    content: string;
  }>({
    isOpen: false,
    sectionKey: '',
    sectionTitle: '',
    content: '',
  });

  // Generation Progress status state
  const [generationStatus, setGenerationStatus] = useState<{
    stage: number;
    message: string;
    percent: number;
  }>({ stage: 0, message: '', percent: 0 });

  // Helper to safely execute and parse JSON API responses with automatic retry and endpoint fallback
  const safeFetchJson = async (
    primaryPath: string,
    options: RequestInit,
    stageName: string,
    maxRetries = 4
  ) => {
    let lastErr: any = null;
    const pathsToTry = [
      primaryPath.startsWith('/api/journal7') ? primaryPath : `/api/journal7${primaryPath.replace('/api', '')}`,
      primaryPath.startsWith('/api/journal7') ? primaryPath.replace('/api/journal7', '/api') : primaryPath,
    ];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      for (const targetUrl of pathsToTry) {
        try {
          const res = await fetch(targetUrl, options);
          if (res.status === 404) {
            // Try fallback URL in pathsToTry
            continue;
          }
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const rawText = await res.text();
            console.warn(`Non-JSON response from ${targetUrl} (attempt ${attempt}/${maxRetries}):`, rawText.slice(0, 200));
            if (attempt < maxRetries) {
              setGenerationStatus((prev) => ({
                ...prev,
                message: `Menghubungkan ke server (${attempt}/${maxRetries})... mohon tunggu sejenak.`,
              }));
              await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
              continue;
            }
            throw new Error(
              `Server mengembalikan respon tidak valid pada ${stageName}. Silakan coba klik tombol Mulai Proses kembali.`
            );
          }

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Gagal pada ${stageName}.`);
          }
          return data;
        } catch (err: any) {
          lastErr = err;
          console.warn(`Fetch error for ${stageName} on ${targetUrl} (attempt ${attempt}/${maxRetries}):`, err.message);

          if (err.message && (err.message.includes('spending cap') || err.message.includes('Monthly Spending Cap'))) {
            throw err;
          }

          if (
            attempt < maxRetries &&
            (err.message?.includes('Failed to fetch') ||
              err.message?.includes('NetworkError') ||
              err.message?.includes('tidak valid') ||
              err.message?.includes('timeout') ||
              err.message?.includes('JSON'))
          ) {
            setGenerationStatus((prev) => ({
              ...prev,
              message: `Menghubungkan kembali (${attempt}/${maxRetries})...`,
            }));
            await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
            continue;
          }
        }
      }
    }
    throw lastErr || new Error(`Gagal memproses ${stageName}.`);
  };

  const makeSafeWordFileName = (value: string): string =>
    String(value || 'Mahasiswa').trim().slice(0, 45)
      .replace(/[\\/?%*:|"<>]/g, '').replace(/\s+/g, '_') || 'Mahasiswa';

  // Prepare BOTH files before starting either browser download. A single error
  // never closes the article preview; it can be retried without regenerating AI.
  const requestTwoWordDownloads = async (readyArticle: JournalArticle) => {
    setWordPairPhase('preparing');
    setWordPairMessage('Menyiapkan Artikel Word dan Cover CD Word...');
    try {
      const [articleBlob, coverBlob] = await Promise.all([
        buildJournalDocx(readyArticle), buildCoverCdDocx(readyArticle),
      ]);
      if (articleBlob.size < 100 || coverBlob.size < 100) {
        throw new Error('Salah satu dokumen Word yang dihasilkan kosong.');
      }
      const title = makeSafeWordFileName(readyArticle.metadata?.judul || 'Artikel');
      const name = makeSafeWordFileName(readyArticle.metadata?.nama || 'Mahasiswa');
      triggerBundleDownload(articleBlob, `Artikel_Jurnal_${title}.docx`);
      triggerBundleDownload(coverBlob, `Cover_CD_${name}.docx`);
      setWordPairPhase('requested');
      setWordPairMessage('Dua unduhan Word sudah diminta ke browser. Periksa folder Download dan izinkan beberapa unduhan bila diminta. Jika ada yang belum tersimpan, klik Unduh Ulang.');
    } catch (err: any) {
      console.error('[ZAIN.NET Link7] Gagal menyiapkan dua DOCX:', err);
      setWordPairPhase('error');
      setWordPairMessage(`Dua Word belum siap: ${err?.message || 'Terjadi kesalahan.'} Halaman tetap terbuka, silakan coba Unduh Ulang.`);
    }
  };

  const retryTwoWordDownloads = async () => {
    if (!article || wordPairPhase === 'preparing') return;
    // Always use current article so manual edits are included in both documents.
    await requestTwoWordDownloads(article);
  };

  const confirmTwoWordDownloads = () => {
    if (wordPairPhase !== 'requested') return;
    // The user confirms both files exist; the parent will now close the module.
    onDownloadsConfirmed?.();
  };

  // Handle Journal AI Generation (Multi-stage process to prevent JSON truncation/timeouts)
  const handleGenerateJournal = async (input: SkripsiInput) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Stage 1: Metadata, Abstract, Pendahuluan, Metode
      setGenerationStatus({
        stage: 1,
        message: 'Tahap 1/3: Mengekstrak Metadata, Abstrak, Pendahuluan & Metode Penelitian...',
        percent: 30,
      });

      const stage1Data = await safeFetchJson(
        '/api/journal7/generate-journal/stage1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
        'Tahap 1 (Pendahuluan & Metode)'
      );

      // Stage 2: Hasil & Pembahasan
      setGenerationStatus({
        stage: 2,
        message: 'Tahap 2/3: Menganalisis & Menyusun Hasil Penelitian Empiris & Pembahasan Mendalam...',
        percent: 65,
      });

      const stage2Data = await safeFetchJson(
        '/api/journal7/generate-journal/stage2',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: input.rawText,
            stage1Data,
            targetLengthPages: input.targetLengthPages,
            selectedModel: input.selectedModel,
            methodologyType: input.methodologyType,
          }),
        },
        'Tahap 2 (Hasil & Pembahasan)'
      );

      // Stage 3: Kesimpulan, Footnotes & Daftar Pustaka
      setGenerationStatus({
        stage: 3,
        message: 'Tahap 3/3: Merumuskan Kesimpulan, Catatan Kaki (Footnotes) & Cover CD...',
        percent: 90,
      });

      const stage3Data = await safeFetchJson(
        '/api/journal7/generate-journal/stage3',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: input.rawText,
            stage1Data,
            stage2Data,
            footnoteStyle: input.footnoteStyle,
            selectedModel: input.selectedModel,
            methodologyType: input.methodologyType,
          }),
        },
        'Tahap 3 (Kesimpulan & Referensi)'
      );

      // Merge all 3 stages with authentic title resolution
      const clientTitle = (input.metadata?.judul && !isSuspiciousFilenameTitle(input.metadata.judul) && isValidThesisTitle(input.metadata.judul))
        ? input.metadata.judul.trim()
        : '';
      const stage1Title = (stage1Data.metadata?.judul && !isSuspiciousFilenameTitle(stage1Data.metadata.judul) && isValidThesisTitle(stage1Data.metadata.judul))
        ? stage1Data.metadata.judul.trim()
        : '';
      const fallbackExtracted = extractMetadataFromSkripsiText(input.rawText).judul || '';
      const resolvedTitle = stage1Title || clientTitle || fallbackExtracted || 'ARTIKEL ILMIAH HASIL PENELITIAN';

      const fullArticle: JournalArticle = {
        id: 'art_' + Date.now(),
        createdAt: new Date().toISOString(),
        metadata: {
          ...input.metadata,
          ...(stage1Data.metadata || {}),
          judul: resolvedTitle,
          nim: input.metadata?.nim || stage1Data.metadata?.nim || '',
          bulanTahun: input.metadata?.bulanTahun || stage1Data.metadata?.bulanTahun || '',
        },
        abstract: stage1Data.abstract,
        pendahuluan: stage1Data.pendahuluan,
        metode: stage1Data.metode,
        hasil: stage2Data.hasil,
        pembahasan: stage2Data.pembahasan,
        kesimpulan: stage3Data.kesimpulan,
        daftarPustaka: stage3Data.daftarPustaka || [],
        footnotes: stage3Data.footnotes || [],
        selectedModel: input.selectedModel || 'gemini-3.1-flash-lite',
        detectedMethodType: stage1Data.detectedMethodType || input.methodologyType,
        methodologyDetails: stage1Data.methodologyDetails,
      };

      if (!fullArticle.pendahuluan || !fullArticle.hasil || !fullArticle.kesimpulan) {
        throw new Error('Hasil belum lengkap. Silakan ulangi proses; sesi belum dianggap selesai.');
      }
      setArticle(fullArticle);
      setActiveTab('preview');
      setGenerationStatus({ stage: 0, message: '', percent: 100 });
      // Record creation/quota ONCE, without closing the module.
      onArticleComplete?.(`${(fullArticle.metadata as any)?.judul || 'Artikel'}.docx`);
      // Automatically request two standalone Word files, not a ZIP.
      await requestTwoWordDownloads(fullArticle);
    } catch (err: any) {
      console.error('Generation Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses skripsi.');
    } finally {
      setIsLoading(false);
      setGenerationStatus({ stage: 0, message: '', percent: 0 });
    }
  };

  // Handle Word Export (.docx artikel)
  const handleDownloadDocx = async () => {
    if (!article) return;
    setIsDownloadingDocx(true);
    try {
      await exportJournalToDocx(article);
      // Re-download does not re-record the session or consume another quota.
    } catch (err: any) {
      console.error('Docx Export Error:', err);
      alert('Gagal mengunduh file Word artikel: ' + (err?.message || 'Harap coba lagi.'));
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // Handle Cover CD Export (.docx)
  const handleDownloadCoverCd = async () => {
    if (!article) return;
    setIsDownloadingCoverCd(true);
    try {
      await downloadCoverCdOnly(article);
    } catch (err: any) {
      console.error('Cover CD Export Error:', err);
      alert('Gagal mengunduh Cover CD: ' + (err?.message || 'Pastikan Nama, NIM, dan Prodi terisi.'));
    } finally {
      setIsDownloadingCoverCd(false);
    }
  };

  // Open Editor Modal for a specific section
  const handleOpenSectionEditor = (sectionKey: string, sectionTitle: string, currentContent: string) => {
    setEditorModal({
      isOpen: true,
      sectionKey,
      sectionTitle,
      content: currentContent,
    });
  };

  // Save edited section
  const handleSaveSection = (sectionKey: string, newContent: string) => {
    if (!article) return;

    if (
      sectionKey === 'abstract' ||
      sectionKey === 'abstrakIndo' ||
      sectionKey === 'abstrakInggris' ||
      sectionKey === 'abstrakEnglish'
    ) {
      setArticle({
        ...article,
        abstract: {
          ...article.abstract,
          ...(sectionKey === 'abstrakInggris' || sectionKey === 'abstrakEnglish'
            ? { abstrakEnglish: newContent }
            : { abstrakIndo: newContent }),
        },
      });
    } else {
      setArticle({
        ...article,
        [sectionKey]: newContent,
      });
    }
  };

  // Footnote update
  const handleUpdateFootnotes = (updatedFootnotes: FootnoteItem[]) => {
    if (!article) return;
    setArticle({
      ...article,
      footnotes: updatedFootnotes,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-200">
      
      {/* Global Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        hasArticle={!!article}
        onDownloadDocx={handleDownloadDocx}
        onDownloadCoverCd={handleDownloadCoverCd}
        isDownloading={isDownloadingDocx || isDownloadingCoverCd || wordPairPhase === 'preparing'}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
      />

      {/* 2-file download confirmation stays visible until the user confirms. */}
      {article && (
        <div role="status" className="sticky top-0 z-40 mx-auto w-full max-w-5xl bg-blue-950 text-white p-4 shadow-xl border-b-4 border-cyan-400">
          <p className="font-bold text-base">Artikel selesai — 2 File Word (tanpa ZIP)</p>
          <p className="text-sm mt-1" aria-live="polite">{wordPairMessage}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={retryTwoWordDownloads}
              disabled={wordPairPhase === 'preparing'}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50">
              {wordPairPhase === 'preparing' ? 'Menyiapkan 2 Word...' : 'Unduh Ulang 2 File Word'}
            </button>
            <button type="button" onClick={handleDownloadDocx}
              disabled={isDownloadingDocx || wordPairPhase === 'preparing'}
              className="rounded-lg bg-slate-700 px-4 py-2 font-semibold disabled:opacity-50">
              Unduh Artikel.docx
            </button>
            <button type="button" onClick={handleDownloadCoverCd}
              disabled={isDownloadingCoverCd || wordPairPhase === 'preparing'}
              className="rounded-lg bg-slate-700 px-4 py-2 font-semibold disabled:opacity-50">
              Unduh Cover_CD.docx
            </button>
            <button type="button" onClick={confirmTwoWordDownloads}
              disabled={wordPairPhase !== 'requested'}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-bold disabled:opacity-50">
              Saya Sudah Menerima Kedua File — Kembali ke Beranda
            </button>
          </div>
          <p className="text-xs text-blue-100 mt-2">
            Browser dapat memblokir unduhan otomatis ganda. ZAIN.NET tidak akan kembali ke beranda sebelum Anda mengonfirmasi kedua file sudah tersimpan.
          </p>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 pb-16">
        
        {/* Error Notification Bar */}
        {errorMsg && (
          <div className="max-w-5xl mx-auto mt-6 px-4">
            {errorMsg.includes('https://ai.studio/spend') || errorMsg.includes('Spending Cap') ? (
              <div className="p-5 bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl shadow-sm">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-amber-950 mb-1">
                      Batas Pengeluaran Bulanan Tercapai (Monthly Spending Cap Exceeded)
                    </h3>
                    <p className="text-sm text-amber-800 leading-relaxed mb-3">
                      Layanan pemrosesan naskah / API Anda telah mencapai limit kuota bulanan yang ditetapkan. Untuk melanjutkan pembuatan artikel:
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href="https://ai.studio/spend"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                      >
                        Buka https://ai.studio/spend &rarr;
                      </a>
                      <button
                        onClick={() => setErrorMsg(null)}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline px-2 py-1"
                      >
                        Tutup Pemberitahuan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start sm:items-center space-x-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline self-end sm:self-auto flex-shrink-0 px-2 py-1 rounded bg-rose-100/60 sm:bg-transparent"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Upload / Input Skripsi (Dihilangkan jika artikel sudah berhasil dibuat) */}
        {activeTab === 'upload' && !article && (
          <SkripsiUploader
            onSubmit={handleGenerateJournal}
            isLoading={isLoading}
            generationStatus={generationStatus}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
          />
        )}

        {/* Tab 2: Journal Article Preview & Editor */}
        {activeTab === 'preview' && article && (
          <JournalPreview
            article={article}
            onUpdateArticle={setArticle}
            onDownloadDocx={handleDownloadDocx}
            onDownloadCoverCd={handleDownloadCoverCd}
            isDownloading={isDownloadingDocx}
            isDownloadingCoverCd={isDownloadingCoverCd}
            isDownloadingBundle={false}
            onEditSection={handleOpenSectionEditor}
          />
        )}

        {/* Tab 3: Footnote Manager */}
        {activeTab === 'footnotes' && article && (
          <FootnoteManager
            footnotes={article.footnotes || []}
            onUpdateFootnotes={handleUpdateFootnotes}
            article={article}
          />
        )}
      </main>

      {/* Section Editor Modal */}
      {article && (
        <SectionEditorModal
          isOpen={editorModal.isOpen}
          onClose={() => setEditorModal({ ...editorModal, isOpen: false })}
          sectionTitle={editorModal.sectionTitle}
          sectionKey={editorModal.sectionKey}
          initialContent={editorModal.content}
          contextTitle={article.metadata.judul}
          selectedModel={article.selectedModel}
          onSave={handleSaveSection}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          ZAIN.NET • Aplikasi Pembuat Artikel Ilmiah Skripsi (IAIN Madura) + Cover CD Word • Sesuai Kaidah Jurnal (Times New Roman 12pt, Spasi 1.5, Margins 3cm & Footnote) • Didukung Google Gemini 3.1 Flash Lite
        </p>
      </footer>
    </div>
  );
}
