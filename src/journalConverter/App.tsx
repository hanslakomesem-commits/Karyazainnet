import React, { useState, useRef, useEffect } from 'react'; // ZAINNET_LINK7_GEMINI_FAST_FALLBACK_20261112
import { Header } from './components/Header';
import { SkripsiUploader } from './components/SkripsiUploader';
import { JournalPreview } from './components/JournalPreview';
import { SectionEditorModal } from './components/SectionEditorModal';
import { FootnoteManager } from './components/FootnoteManager';
import { SkripsiInput, JournalArticle, FootnoteItem } from './types/journal';
import { buildJournalDocx, exportJournalToDocx } from './utils/docxExport';
import { triggerBundleDownload, downloadCoverCdOnly, buildFiveFileBundle, convertWordToPdf } from './utils/bundleExport';
import { buildCoverCdDocx } from './utils/coverCdExport';
import { database } from '../storage/client'; // ZAINNET_LINK7_QUOTA_SERVER_GUARD_20261112
import { isSuspiciousFilenameTitle, isValidThesisTitle, extractMetadataFromSkripsiText } from './components/SkripsiUploader';
import { AlertCircle } from 'lucide-react';
import { JOURNAL_MASTER_CATALOG, findJournalMaster } from './data/journalTemplatesCatalog';
import { buildTemplateArticleWord } from './utils/journalTemplateService';

interface JournalConverterAppProps {
  onGenerationStarted?: () => void;
  onArticleComplete?: (fileName: string) => void;
  onDownloadsConfirmed?: () => void;
}

// ZAINNET_LINK7_DOWNLOAD_SYNC_FIX_20261112
export default function App({ onGenerationStarted, onArticleComplete, onDownloadsConfirmed }: JournalConverterAppProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'footnotes'>('upload');
  const [article, setArticle] = useState<JournalArticle | null>(null);
  // ZAINNET_LINK7_DUA_MODE_TEMPLATE_V1
  const [articleMode, setArticleMode] = useState<'choose' | 'normal' | 'template'>('choose');
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [templateWarnings, setTemplateWarnings] = useState<string[]>([]);
  const templateCache = useRef<{ key: string; blob: Blob } | null>(null);

  const getArticleWord = async (readyArticle: JournalArticle): Promise<Blob> => {
    if (articleMode !== 'template') return buildJournalDocx(readyArticle);
    if (!findJournalMaster(selectedJournalId)) throw new Error('Jurnal belum dipilih.');
    const key = selectedJournalId + ':' + JSON.stringify(readyArticle);
    if (templateCache.current?.key === key) return templateCache.current.blob;
    const formatted = await buildTemplateArticleWord(readyArticle, selectedJournalId);
    templateCache.current = { key, blob: formatted.blob };
    setTemplateWarnings(formatted.warnings);
    return formatted.blob;
  };

  const handleTabChange = (tab: 'upload' | 'preview' | 'footnotes') => {
    // Cegah kembali ke menu unggah skripsi jika naskah artikel sudah berhasil dibuat
    if (article && tab === 'upload') {
      return;
    }
    setActiveTab(tab);
  };
  // ZAINNET_LINK7_GEMINI_FAST_FALLBACK_20261112
  // In-memory progress cache; never saved to localStorage or to a third-party service.
  // Completed stages can be reused if the next stage fails and the same input is re-submitted.
  const stageCache = useRef<{
    rawText: string; settings: string; stage1?: any; stage2?: any; stage3?: any;
  } | null>(null);
  const generationBusy = useRef(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (!isLoading) { setElapsedSeconds(0); return; }
    const startedAt = Date.now();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isLoading]);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingCoverCd, setIsDownloadingCoverCd] = useState(false);
  // ZAINNET_LINK7_ZIP5_20261111: File objects remain in browser memory, not backend storage.
  const [sourceThesis, setSourceThesis] = useState<{ word: File | null; pdf: File | null }>({ word: null, pdf: null });
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  // ZAINNET_LINK7_LAYOUT_WARN_NONBLOCK_20261111
  const [zipLayoutWarnings, setZipLayoutWarnings] = useState<string[]>([]);
  const [zipAutoFixed, setZipAutoFixed] = useState(0);
  const [zipMessage, setZipMessage] = useState('Untuk ZIP lengkap, unggah skripsi Word (.docx) dan PDF (.pdf) asli.');
  // ZAINNET_LINK7_TWO_DOCX_SAFE_CLOSE_20261109
  // Browser websites cannot observe the OS download manager. Require the user
  // to confirm both Word files exist before returning to the main menu.
  const [wordPairPhase, setWordPairPhase] = useState<'idle' | 'preparing' | 'requested' | 'error'>('idle');
  const [wordPairMessage, setWordPairMessage] = useState('');
  // ZAINNET_LINK7_AUTO_ZIP_V2_20261112: one automatic ZIP, visible concurrent PDF job.
  const [thesisPdfStatus, setThesisPdfStatus] = useState<{
    status: 'idle' | 'running' | 'ready' | 'error' | 'skipped'; message: string;
  }>({ status: 'idle', message: 'Menunggu file Word skripsi.' });
  const zipBusy = useRef(false);
  const zipReadyAssets = useRef<{ article: JournalArticle; templateId: string; thesis: File; blob: Blob; filename: string } | null>(null);
  // ZAINNET_LINK7_PARALLEL_PDF_20261112: early thesis conversion and per-article cache.
  const thesisPdfJob = useRef<{ file: File; promise: Promise<Blob | null> } | null>(null);
  const articleReadyAssets = useRef<{ article: JournalArticle; templateId: string; word: Blob; pdf: Blob; cover: Blob } | null>(null);
  const startThesisPdfInParallel = (file: File) => {
    if (thesisPdfJob.current?.file === file) return;
    setThesisPdfStatus({
      status: 'running',
      message: 'Konversi skripsi Word ke PDF sedang berjalan di server LibreOffice, bersamaan dengan proses AI.'
    });
    const promise = convertWordToPdf(file, 'Skripsi.docx')
      .then((pdf) => {
        setThesisPdfStatus({ status: 'ready', message: 'PDF skripsi selesai dan siap dimasukkan ke ZIP.' });
        return pdf;
      })
      .catch((err: unknown) => {
        console.warn('[Link7] PDF skripsi latar belakang gagal; akan dicoba kembali saat ZIP:', err);
        setThesisPdfStatus({ status: 'error', message: 'PDF skripsi gagal diproses di awal. Sistem akan mencoba kembali saat mengemas ZIP.' });
        return null;
      });
    thesisPdfJob.current = { file, promise };
  };
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

  // ZAINNET_LINK7_PERFORMANCE_RETRY_GUARD_V1
  // Hindari pemanggilan ganda endpoint tahap AI bila server sudah mengembalikan error.
  // Tetap gunakan prompt, model, struktur artikel, dan panjang konten yang sama.
  const safeFetchJson = async (
    primaryPath: string,
    options: RequestInit,
    stageName: string,
    maxRetries = 1 // Never duplicate expensive POST stage requests on uncertain network errors.
  ) => {
    const pathsToTry = [
      primaryPath.startsWith('/api/journal7') ? primaryPath : `/api/journal7${primaryPath.replace('/api', '')}`,
      primaryPath.startsWith('/api/journal7') ? primaryPath.replace('/api/journal7', '/api') : primaryPath,
    ];
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let shouldRetry = false;
      let matchedEndpoint = false;
      for (const targetUrl of pathsToTry) {
        try {
          // Always send the logged-in Supabase session to the protected AI API.
          // A fresh user token is required even if a browser cached an old quota.
          const { data: { session }, error: authError } = await database().auth.getSession();
          if (authError || !session?.access_token) {
            throw new Error('Sesi akun sudah berakhir. Masuk kembali untuk membuat artikel.');
          }
          const requestHeaders = new Headers(options.headers);
          requestHeaders.set('Authorization', `Bearer ${session.access_token}`);
          const res = await fetch(targetUrl, { ...options, headers: requestHeaders });
          if (res.status === 404) continue; // URL kedua hanya jika endpoint pertama tidak ada.
          matchedEndpoint = true;
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const error = new Error(`Respons server tidak berupa JSON pada ${stageName} (HTTP ${res.status}).`);
            (error as any).retryable = res.status >= 502;
            throw error;
          }
          const data = await res.json();
          if (!res.ok) {
            const message = String(data?.error || `Gagal pada ${stageName} (HTTP ${res.status}).`);
            const error = new Error(message);
            (error as any).retryable = [502, 503, 504].includes(res.status) ||
              (res.status === 500 && /\b503\b|high demand|UNAVAILABLE|timeout/i.test(message));
            throw error;
          }
          return data;
        } catch (err: any) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          const transient = err?.retryable === true ||
            (err?.retryable === undefined &&
              /Failed to fetch|NetworkError|ECONNRESET|ETIMEDOUT/i.test(String(err?.message || '')));
          if (!transient) throw lastErr; // Jangan panggil ulang AI jika kuota/validasi gagal.
          shouldRetry = true;
          break; // Jangan kirim pekerjaan yang sama ke URL fallback.
        }
      }
      if (!matchedEndpoint && !shouldRetry) {
        throw new Error(`Endpoint AI untuk ${stageName} tidak tersedia (404).`);
      }
      if (!shouldRetry || attempt >= maxRetries) break;
      setGenerationStatus((prev) => ({
        ...prev,
        message: `Koneksi ${stageName} terputus; menghubungkan ulang (${attempt}/${maxRetries})...`,
      }));
      await new Promise(resolve => setTimeout(resolve, attempt * 1800));
    }
    throw lastErr || new Error(`Gagal memproses ${stageName}.`);
  };

  const makeSafeWordFileName = (value: string): string =>
    String(value || 'Mahasiswa').trim().slice(0, 45)
      .replace(/[\\/?%*:|"<>]/g, '').replace(/\s+/g, '_') || 'Mahasiswa';

  // Keep the article and the student files from the SAME final AI result.
  // The browser can block an automatic download; manual retry uses the cached ZIP.
  const prepareAndDownloadZip = async (readyArticle: JournalArticle, originalWord: File | null): Promise<boolean> => {
    if (zipBusy.current) return false;
    if (!originalWord) {
      setWordPairPhase('error');
      setWordPairMessage('ZIP otomatis membutuhkan skripsi Word .docx asli. Unggah Word pada panel paket lalu pilih Unduh Ulang ZIP; AI tidak perlu diulang.');
      return false;
    }
    zipBusy.current = true;
    setIsDownloadingZip(true);
    setWordPairPhase('preparing');
    setWordPairMessage('Artikel selesai. Menyiapkan 5 file dan mengunduh satu ZIP otomatis...');
    const templateId = articleMode === 'template' ? selectedJournalId : '';
    try {
      const cached = zipReadyAssets.current;
      if (cached && cached.article === readyArticle && cached.templateId === templateId && cached.thesis === originalWord) {
        triggerBundleDownload(cached.blob, cached.filename);
        setWordPairPhase('requested');
        setWordPairMessage('ZIP lengkap kembali diminta ke browser. Periksa folder Download.');
        onArticleComplete?.(cached.filename);
        return true;
      }

      let assets = articleReadyAssets.current;
      if (!assets || assets.article !== readyArticle || assets.templateId !== templateId) {
        setWordPairMessage('AI selesai. Membuat Word artikel dan Cover CD secara bersamaan...');
        const [word, cover] = await Promise.all([
          getArticleWord(readyArticle), buildCoverCdDocx(readyArticle),
        ]);
        if (word.size < 200 || cover.size < 200) {
          throw new Error('Word artikel atau Cover CD tidak berhasil dibuat.');
        }
        setWordPairMessage('Word artikel selesai. Mengonversi PDF artikel di server LibreOffice...');
        const pdf = await convertWordToPdf(word, 'Artikel.docx');
        assets = { article: readyArticle, templateId, word, pdf, cover };
        articleReadyAssets.current = assets;
      }

      setWordPairMessage('Menggabungkan semua berkas: menunggu PDF skripsi yang diproses bersamaan dengan AI...');
      const existingThesisPdf = thesisPdfJob.current?.file === originalWord
        ? await thesisPdfJob.current.promise : null;
      if (!existingThesisPdf) {
        setWordPairMessage('Konversi PDF skripsi belum berhasil; mencoba ulang saat membuat ZIP...');
      }
      setZipMessage('Mengemas ZIP lengkap otomatis; tidak perlu menekan tombol Download Paket Lengkap.');
      const { blob, filename, layoutWarnings, autoFixedCount } = await buildFiveFileBundle(
        readyArticle,
        { word: originalWord },
        setZipMessage,
        assets.word,
        { thesisPdf: existingThesisPdf || undefined, articlePdf: assets.pdf, coverWord: assets.cover },
      );
      setZipLayoutWarnings(layoutWarnings);
      setZipAutoFixed(autoFixedCount);
      zipReadyAssets.current = { article: readyArticle, templateId, thesis: originalWord, blob, filename };
      triggerBundleDownload(blob, filename);
      setWordPairPhase('requested');
      setWordPairMessage(`ZIP 5 file sudah dibuat dan unduhannya diminta otomatis: ${filename}. Periksa folder Download. Bila Chrome memblokirnya, tekan Unduh Ulang ZIP tanpa menjalankan AI kembali.`);
      setZipMessage('ZIP selesai dibuat. Tidak ada unduhan Word/PDF terpisah yang berjalan otomatis.');
      // Report completion only after the entire ZIP exists and the browser download was requested.
      onArticleComplete?.(filename);
      return true;
    } catch (err: any) {
      console.error('[ZAIN.NET Link 7] Auto ZIP:', err);
      setWordPairPhase('error');
      setWordPairMessage(`ZIP belum berhasil: ${err?.message || 'Konversi gagal'}. Artikel AI tetap tersedia. Tekan Unduh Ulang ZIP untuk mencoba lagi.`);
      setZipMessage(`Paket ZIP belum siap: ${err?.message || 'Periksa server LibreOffice.'}`);
      return false;
    } finally {
      zipBusy.current = false;
      setIsDownloadingZip(false);
    }
  };

  const retryZipDownload = async () => {
    if (!article || zipBusy.current) return;
    const requested = await prepareAndDownloadZip(article, sourceThesis.word);
    // The cached ZIP is clicked synchronously in the user's gesture, which
    // makes this path more reliable on Firefox/Chrome than background auto-save.
    if (requested) onDownloadsConfirmed?.();
  };

  const confirmZipDownload = () => {
    if (wordPairPhase !== 'requested') return;
    // The OS download manager is not inspectable from a website.
    onDownloadsConfirmed?.();
  };

  // Handle Journal AI Generation (Multi-stage process to prevent JSON truncation/timeouts)
  const handleGenerateJournal = async (input: SkripsiInput) => {
    const original = input.originalFile;
    const templateId = articleMode === 'template' ? selectedJournalId : undefined;
    if (articleMode === 'template' && !findJournalMaster(templateId)) {
      setErrorMsg('Pilih master jurnal yang tersedia terlebih dahulu.'); return;
    }
    if (generationBusy.current) return; // Prevent double-click / duplicate charge.
    generationBusy.current = true;
    const settings = JSON.stringify({
      metadata: input.metadata, footnoteStyle: input.footnoteStyle,
      pages: input.targetLengthPages, model: input.selectedModel,
      methodology: input.methodologyType, templateId,
      file: original ? [original.name, original.size, original.lastModified] : null,
    });
    if (!stageCache.current || stageCache.current.rawText !== input.rawText || stageCache.current.settings !== settings) {
      stageCache.current = { rawText: input.rawText, settings };
    }
    const cached = stageCache.current;
    const totalStartedAt = Date.now();
    // Starting a genuinely new generation opens a new transaction. Merely
    // opening the module or retrying the existing ZIP does not.
    onGenerationStarted?.();
    setSourceThesis({
      word: original?.name.toLowerCase().endsWith('.docx') ? original : null,
      pdf: original?.name.toLowerCase().endsWith('.pdf') ? original : null,
    });
    articleReadyAssets.current = null;
    zipReadyAssets.current = null;
    setWordPairPhase('idle');
    if (original?.name.toLowerCase().endsWith('.docx')) {
      startThesisPdfInParallel(original);
    }
    if (!original?.name.toLowerCase().endsWith('.docx')) {
      setThesisPdfStatus({ status: 'skipped', message: 'PDF otomatis memerlukan skripsi Word .docx asli. Upload Word untuk menyiapkan ZIP lengkap.' });
    }
    setZipMessage(original?.name.toLowerCase().endsWith('.docx')
      ? 'PDF skripsi disiapkan bersamaan dengan AI. ZIP lima file akan diunduh otomatis.'
      : 'Untuk ZIP, pilih skripsi Word .docx asli sekali saja.');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Stage 1: Metadata, Abstract, Pendahuluan, Metode
      setGenerationStatus({
        stage: 1,
        message: 'Tahap 1/3: Mengekstrak Metadata, Abstrak, Pendahuluan & Metode Penelitian...',
        percent: 30,
      });

      const stage1Data = cached.stage1 ?? await safeFetchJson(
        '/api/journal7/generate-journal/stage1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, templateId }),
        },
        'Tahap 1 (Pendahuluan & Metode)'
      );
      cached.stage1 = stage1Data;
      console.info(`[Link7] Tahap 1 selesai/dipulihkan pada detik ${Math.round((Date.now() - totalStartedAt) / 1000)}.`);

      // Stage 2: Hasil & Pembahasan
      setGenerationStatus({
        stage: 2,
        message: 'Tahap 2/3: Menganalisis & Menyusun Hasil Penelitian Empiris & Pembahasan Mendalam...',
        percent: 65,
      });

      const stage2Data = cached.stage2 ?? await safeFetchJson(
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
            templateId,
          }),
        },
        'Tahap 2 (Hasil & Pembahasan)'
      );
      cached.stage2 = stage2Data;
      console.info(`[Link7] Tahap 2 selesai/dipulihkan pada detik ${Math.round((Date.now() - totalStartedAt) / 1000)}.`);

      // Stage 3: Kesimpulan, Footnotes & Daftar Pustaka
      setGenerationStatus({
        stage: 3,
        message: 'Tahap 3/3: Merumuskan Kesimpulan, Catatan Kaki (Footnotes) & Cover CD...',
        percent: 90,
      });

      const stage3Data = cached.stage3 ?? await safeFetchJson(
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
            templateId,
          }),
        },
        'Tahap 3 (Kesimpulan & Referensi)'
      );
      cached.stage3 = stage3Data;
      console.info(`[Link7] Tahap 3 selesai/dipulihkan pada detik ${Math.round((Date.now() - totalStartedAt) / 1000)}.`);

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
      // Auto-download ONE five-file ZIP (no separate Word downloads, no extra ZIP button).
      const thesisWord = original?.name.toLowerCase().endsWith('.docx') ? original : null;
      const zipRequested = await prepareAndDownloadZip(fullArticle, thesisWord);
      if (zipRequested) stageCache.current = null; // New purchase => fresh content.
    } catch (err: any) {
      console.error('Generation Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses skripsi.');
    } finally {
      generationBusy.current = false;
      console.info(`[Link7] Durasi total proses yang diamati: ${Math.round((Date.now() - totalStartedAt) / 1000)} detik.`);
      setIsLoading(false);
      setGenerationStatus({ stage: 0, message: '', percent: 0 });
    }
  };

  // Handle Word Export (.docx artikel)
  const handleDownloadDocx = async () => {
    if (!article) return;
    setIsDownloadingDocx(true);
    try {
      if (articleMode === 'template') {
        setWordPairMessage('Menyiapkan Word artikel sesuai master jurnal...');
        const formatted = await getArticleWord(article);
        const selected = findJournalMaster(selectedJournalId);
        triggerBundleDownload(formatted, `Artikel_${selected?.name.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Jurnal'}_${makeSafeWordFileName(article.metadata.nama)}.docx`);
      } else {
        await exportJournalToDocx(article);
      }
      // Re-download does not re-record the session or consume another quota.
    } catch (err: any) {
      console.error('Docx Export Error:', err);
      alert('Gagal mengunduh file Word artikel: ' + (err?.message || 'Harap coba lagi.'));
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // ZAINNET_LINK7_AUTO_PDF_FROM_WORD_20261111
  const handleThesisWordPick = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setZipMessage('Berkas harus berformat Word .docx asli. Jangan hanya mengganti ekstensi.');
      return;
    }
    setSourceThesis(prev => ({ ...prev, word: file }));
    zipReadyAssets.current = null;
    startThesisPdfInParallel(file);
    setZipMessage(`${file.name} diterima. Konversi PDF skripsi dimulai di latar belakang.`);
  };

  // Optional fallback when Chrome blocks the automatic ZIP download.
  const handleDownloadZip = async () => {
    await retryZipDownload();
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

      {/* ZAINNET_LINK7_MOBILE_AUTORETURN_V1: compact, mobile-first ZIP status. */}
      {article && (
        <section role="status" aria-live="polite" className="w-full max-w-5xl mx-auto px-3 sm:px-5 pt-3 pb-2">
          <div className="rounded-xl border border-cyan-600/60 bg-slate-900 text-white shadow-md p-3 sm:p-4 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <span aria-hidden="true" className="text-emerald-300 text-xl shrink-0">{wordPairPhase === 'requested' ? '✓' : '📦'}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold leading-snug break-words">{wordPairPhase === 'requested' ? 'ZIP 5 File Siap' : wordPairPhase === 'error' ? 'ZIP Belum Berhasil' : 'Menyiapkan ZIP 5 File'}</h2>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 break-words">{wordPairPhase === 'requested' ? 'Unduhan otomatis sudah dicoba. Periksa folder Download. Bila terblokir, tekan Unduh Ulang ZIP sebelum kembali otomatis.' : wordPairMessage}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={retryZipDownload} disabled={isDownloadingZip || wordPairPhase === 'preparing' || !sourceThesis.word}
                className="w-full sm:w-auto min-h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-bold disabled:opacity-50">
                {isDownloadingZip || wordPairPhase === 'preparing' ? 'Sedang menyiapkan...' : 'Unduh Ulang ZIP'}
              </button>
              {wordPairPhase === 'requested' && (
                <button type="button" onClick={confirmZipDownload} className="w-full sm:w-auto min-h-11 rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold">
                   ZIP Sudah Tersimpan — Kembali
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">Periksa folder Download. Jika Chrome memblokir unduhan otomatis, tekan Unduh Ulang ZIP sebelum kembali.</p>
            <details className="mt-2 text-xs text-slate-300">
              <summary className="cursor-pointer py-1">Rincian paket dan pemeriksaan</summary>
              <div className="mt-2 space-y-2 break-words">
                <p>Isi: Skripsi Word + PDF, Artikel Word + PDF, dan Cover CD Word.</p>
                <p>{sourceThesis.word ? `Skripsi: ${sourceThesis.word.name}` : 'Skripsi Word belum tersedia.'}</p>
                {!sourceThesis.word && <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => handleThesisWordPick(e.target.files?.[0])} className="w-full max-w-full text-xs" />}
                <p>{zipMessage}</p>
                {zipAutoFixed > 0 && <p>Perbaikan otomatis PDF: {zipAutoFixed} bagian.</p>}
                {templateWarnings.length > 0 && <p>Catatan template ({templateWarnings.length}): {templateWarnings.join('; ')}</p>}
                {zipLayoutWarnings.length > 0 && <p className="text-amber-200">Peringatan tata letak: {zipLayoutWarnings.join('; ')}</p>}
              </div>
            </details>
          </div>
        </section>
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
        {activeTab === 'upload' && !article && articleMode === 'choose' && (
          <section className="max-w-5xl mx-auto mt-8 p-5 bg-white rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold text-slate-900">Pilih cara pembuatan artikel</h2>
            <p className="text-slate-600 mt-2 mb-5">Tentukan jenis artikel sebelum mengunggah skripsi.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setArticleMode('normal')}
                className="text-left rounded-xl p-5 border-2 border-blue-200 hover:bg-blue-50 focus-visible:outline-4 focus-visible:outline-blue-400">
                <span className="block text-lg font-bold">1. Buat Artikel Biasa</span>
                <span className="block text-sm mt-2 text-slate-600">Tetap menggunakan mesin AI Link 7 dan aturan artikel standar seperti sebelumnya.</span>
              </button>
              <button type="button" onClick={() => setArticleMode('template')}
                className="text-left rounded-xl p-5 border-2 border-emerald-300 hover:bg-emerald-50 focus-visible:outline-4 focus-visible:outline-emerald-400">
                <span className="block text-lg font-bold">2. Buat Artikel dengan Template</span>
                <span className="block text-sm mt-2 text-slate-600">Pilih salah satu dari 15 jurnal dengan master Word dan aturan sendiri.</span>
              </button>
            </div>
          </section>
        )}
        {activeTab === 'upload' && !article && articleMode === 'template' && (
          <section className="max-w-5xl mx-auto mt-6 p-5 bg-white rounded-2xl shadow-sm border border-emerald-200">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-bold">Pilih Template Jurnal (15 jurnal)</h2>
              <button type="button" onClick={() => { setArticleMode('choose'); setSelectedJournalId(''); }}
                className="text-sm text-blue-700 underline">Kembali ke pilihan</button>
            </div>
            <label htmlFor="zainnet-jurnal-template" className="block text-sm mt-3 mb-2 font-semibold">Master DOCX jurnal</label>
            <select id="zainnet-jurnal-template" value={selectedJournalId}
              onChange={e => { setSelectedJournalId(e.target.value); templateCache.current = null; }}
              className="w-full border-2 border-slate-300 rounded-lg p-3 bg-white text-slate-900">
              <option value="">-- Pilih jurnal --</option>
              {JOURNAL_MASTER_CATALOG.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {findJournalMaster(selectedJournalId) && (
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-slate-700">
                <p><strong>Font:</strong> {findJournalMaster(selectedJournalId)?.bodyFont} {findJournalMaster(selectedJournalId)?.bodySize || ''} pt</p>
                <p><strong>Aturan:</strong> {findJournalMaster(selectedJournalId)?.note}</p>
                <a target="_blank" rel="noreferrer" className="text-blue-700 underline" download
                  href={`${import.meta.env.BASE_URL}articleTemplates/${findJournalMaster(selectedJournalId)?.docx}`}>
                  Lihat/unduh master DOCX asli
                </a>
              </div>
            )}
            <p className="text-xs mt-3 text-amber-800">AI menulis isi berdasarkan skripsi. Master asli dipakai untuk format Word; hasil wajib diperiksa karena tidak semua format jurnal dapat dijamin identik.</p>
            {!selectedJournalId && <p className="text-sm mt-2 text-rose-700">Pilih jurnal terlebih dahulu agar menu unggah skripsi terbuka.</p>}
          </section>
        )}
        {activeTab === 'upload' && !article && (articleMode === 'normal' || (articleMode === 'template' && !!selectedJournalId)) && (
          <div>
            {articleMode === 'normal' && (
              <button type="button" onClick={() => setArticleMode('choose')}
                className="block max-w-5xl mx-auto my-3 text-sm font-medium text-blue-700 underline">
                Ganti mode artikel
              </button>
            )}
          <SkripsiUploader
            onSubmit={handleGenerateJournal}
            isLoading={isLoading}
            generationStatus={{
              ...generationStatus,
              message: isLoading ? `${generationStatus.message} (${elapsedSeconds} detik berjalan)` : generationStatus.message,
            }}
            thesisPdfStatus={thesisPdfStatus}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
          />
          </div>
        )}

        {/* Tab 2: Journal Article Preview & Editor */}
        {activeTab === 'preview' && article && (
          <JournalPreview
            article={article}
            onUpdateArticle={setArticle}
            onDownloadDocx={handleDownloadDocx}
            onDownloadCoverCd={handleDownloadCoverCd}
            onDownloadBundle={handleDownloadZip}
            isDownloading={isDownloadingDocx}
            isDownloadingCoverCd={isDownloadingCoverCd}
            isDownloadingBundle={isDownloadingZip}
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
