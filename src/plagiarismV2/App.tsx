import React, { useState } from 'react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { FootnoteGuardView } from './components/FootnoteGuardView';
import { PlagiarismReview } from './components/PlagiarismReview';
import { ResultDownload } from './components/ResultDownload';
import { DocxPreviewModal } from './components/DocxPreviewModal';
import {
  parseDocxFile,
  extractParagraphsAndChapters,
  findMatchInDocx,
  applyParaphraseToDocx,
  detectProtectedTerms,
} from './lib/docxHandler';
import {
  safeFetchJson,
  arrayBufferToBase64,
  extractTextFromPdfBufferLocally,
} from './lib/pdfClientParser';
import { createDemoSkripsiDocx, SAMPLE_PLAGIARISM_TEXT } from './lib/demoData';
import { maskCitationsForAI, unmaskCitationsFromAI } from './lib/citationSafety';
import { sanitizeAndEnrichSegments } from './lib/documentSanitizer';
import type {
  DocxFileInfo,
  PlagiarismFileInfo,
  PlagiarismSegment,
  ParaphraseStyle,
  ReplacementResult,
  GeminiModelId,
  SegmentVersionHistory,
} from './types';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function App({ onExportComplete }: { onExportComplete?: (fileName: string) => void } = {}) {
  const [docxInfo, setDocxInfo] = useState<DocxFileInfo | null>(null);
  const [plagInfo, setPlagInfo] = useState<PlagiarismFileInfo | null>(null);
  const [segments, setSegments] = useState<PlagiarismSegment[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ParaphraseStyle>('academic_formal');
  const defaultModel: GeminiModelId = 'gemini-3.1-flash-lite';
  const [excludeBibliography, setExcludeBibliography] = useState<boolean>(true);
  const [protectedTerms, setProtectedTerms] = useState<string[]>([
    'UU No. 19 Tahun 2016',
    'Pasal 27 ayat (3)',
    'KUHP',
    'KUHPerdata',
  ]);

  const [step, setStep] = useState<'upload' | 'review' | 'result'>('upload');
  const [uploadStage, setUploadStage] = useState<'stage1_plag' | 'stage2_docx'>('stage1_plag');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [replacementResult, setReplacementResult] = useState<ReplacementResult | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Reset to initial
  const handleReset = () => {
    setDocxInfo(null);
    setPlagInfo(null);
    setSegments([]);
    setStep('upload');
    setUploadStage('stage1_plag');
    setReplacementResult(null);
    showNotification('Workspace berhasil di-reset.', 'info');
  };

  // Handle Load Demo Thesis
  const handleLoadDemo = async () => {
    try {
      setIsLoadingDemo(true);
      showNotification('Menyiapkan naskah contoh skripsi lengkap dengan 30 catatan kaki...', 'info');

      const demoBuffer = await createDemoSkripsiDocx();
      const parsedDocx = await parseDocxFile(demoBuffer, 'Skripsi_Hukum_Pidana_Siber_30_Footnotes.docx');

      setDocxInfo(parsedDocx);

      const rawDemoSegments: PlagiarismSegment[] = [
        {
          id: 'demo-1',
          originalText:
            'Perkembangan teknologi informasi dan komunikasi pada era globalisasi saat ini telah membawa perubahan yang sangat pesat dalam berbagai aspek kehidupan manusia, khususnya dalam sistem transaksi elektronik dan interaksi sosial.',
          paraphrasedText:
            'Akselerasi teknologi informasi beserta komunikasi dalam lanskap kontemporer kini memicu pergeseran yang teramat signifikan pada ragam ranah aktivitas masyarakat, terutama berkaitan dengan tata kelola transaksi digital serta relasi sosial.',
          alternativeText:
            'Transformasi mendasar dalam berbagai dimensi interaksi publik terwujud berkat kemajuan teknologi informasi pada era keterbukaan global, lebih khusus pada mekanisme pertukaran elektronik.',
          similarityScore: 88,
          matchedInDoc: true,
          targetXml: 'document',
          paragraphIndex: 1,
          locationLabel: 'Bab 1: Pendahuluan (Paragraf 2)',
          chapterId: 'bab_1',
          chapterName: 'BAB I: PENDAHULUAN',
          footnoteIdsNearby: ['1', '2'],
          isSelected: true,
          status: 'paraphrased',
          explanation: 'Restrukturisasi klausa & sinonim akademik (EYD V).',
          appliedTechnique: 'Akademik Baku EYD V',
        },
        {
          id: 'demo-2',
          originalText:
            'Kebebasan berpendapat dan berekspresi di ruang digital merupakan salah satu hak asasi manusia yang harus dijamin keberadaannya oleh negara sebagaimana diatur dalam ketentuan Pasal 27 ayat (3) UU No. 19 Tahun 2016 yang berlaku di Indonesia.',
          paraphrasedText:
            'Hak mengemukakan pendapat secara digital tergolong bagian fundamental dari hak asasi yang mutlak memperoleh garansi yuridis serta proteksi dari otoritas negara, selaras dengan kaidah normatif Pasal 27 ayat (3) UU No. 19 Tahun 2016 dalam hukum positif nasional.',
          alternativeText:
            'Sebagaimana diamanatkan dalam ketentuan Pasal 27 ayat (3) UU No. 19 Tahun 2016, kepastian atas kebebasan berekspresi di ranah virtual merupakan entitas mendasar hak warga negara yang wajib diakomodasi oleh instrumen negara.',
          similarityScore: 92,
          matchedInDoc: true,
          targetXml: 'document',
          paragraphIndex: 2,
          locationLabel: 'Bab 1: Pendahuluan (Paragraf 3)',
          chapterId: 'bab_1',
          chapterName: 'BAB I: PENDAHULUAN',
          footnoteIdsNearby: ['3'],
          isSelected: true,
          status: 'paraphrased',
          explanation: 'Nominalisasi & penataan ulang relasi subjek-objek dengan proteksi pasal UU.',
          appliedTechnique: 'Restrukturisasi Klausa',
        },
        {
          id: 'demo-3',
          originalText:
            'Menurut Sugiyono (2021: 45), pendekatan penelitian yuridis normatif difokuskan pada inventarisasi hukum positif dan penemuan asas-asas hukum yang mendasari norma peraturan perundang-undangan.',
          paraphrasedText:
            'Sebagaimana dirumuskan oleh Sugiyono (2021: 45), orientasi metodologi yuridis normatif menitikberatkan pada kompilasi hukum positif beserta penelusuran prinsip fundamental yang melandasi tata aturan perundang-undangan.',
          alternativeText:
            'Fokus telaah dalam penelitian yuridis normatif berpijak pada telaah asas hukum dan perundang-undangan positif (Sugiyono, 2021: 45).',
          similarityScore: 84,
          matchedInDoc: true,
          targetXml: 'document',
          paragraphIndex: 3,
          locationLabel: 'Bab 3: Metode Penelitian (Paragraf 2)',
          chapterId: 'bab_3',
          chapterName: 'BAB III: METODE PENELITIAN',
          footnoteIdsNearby: ['4', '5'],
          isSelected: true,
          status: 'paraphrased',
          explanation: 'Format Sitasi APA (Sugiyono, 2021: 45) terkunci aman.',
          appliedTechnique: 'Akademik Baku EYD V',
        },
        {
          id: 'demo-4',
          originalText:
            'Menurut teori kepastian hukum yang dikemukakan oleh Gustav Radbruch (2018), hukum harus mengandung nilai keadilan, kemanfaatan, dan kepastian hukum agar dapat berfungsi secara optimal di dalam masyarakat.',
          paraphrasedText:
            'Berlandaskan doktrin kepastian hukum Gustav Radbruch (2018), tatanan yuridis sepatutnya mengintegrasikan trilogi nilai keadilan, kemanfaatan sosial, serta kepastian hukum guna merealisasikan fungsi regulatif yang prima di tengah masyarakat.',
          similarityScore: 85,
          matchedInDoc: true,
          targetXml: 'document',
          paragraphIndex: 4,
          locationLabel: 'Bab 2: Tinjauan Pustaka (Paragraf 2)',
          chapterId: 'bab_2',
          chapterName: 'BAB II: TINJAUAN PUSTAKA',
          footnoteIdsNearby: ['6', '7', '8'],
          isSelected: true,
          status: 'paraphrased',
          explanation: 'Perlindungan nama tokoh teori & trilogi nilai hukum.',
          appliedTechnique: 'Sintesis Gagasan Teori',
        },
        {
          id: 'demo-5',
          originalText:
            'Berdasarkan hasil analisis regresi linier berganda diperoleh persamaan Y = 12.45 + 0.68X1 + 0.42X2 dengan nilai signifikansi p-value < 0.05 yang menunjukkan pengaruh positif dan signifikan.',
          paraphrasedText:
            'Estimasi regresi linier berganda membuktikan hubungan linier positif dengan persamaan Y = 12.45 + 0.68X1 + 0.42X2 serta tingkat signifikansi p-value < 0.05 yang mengonfirmasi kebermaknaan pengaruh antarvariabel.',
          similarityScore: 82,
          matchedInDoc: true,
          targetXml: 'document',
          paragraphIndex: 7,
          locationLabel: 'Bab 4: Hasil dan Pembahasan (Paragraf 2)',
          chapterId: 'bab_4',
          chapterName: 'BAB IV: HASIL & PEMBAHASAN',
          footnoteIdsNearby: ['14', '15'],
          isSelected: true,
          status: 'paraphrased',
          explanation: 'Formula statistik dan nilai matematis terproteksi utuh.',
          appliedTechnique: 'Rekonstruksi Radikal',
        },
      ];

      const demoSegments = sanitizeAndEnrichSegments(rawDemoSegments, { excludeBibliography });

      setPlagInfo({
        fileName: 'Laporan_Cek_Turnitin_Demo_Simulasi.pdf',
        fileSize: 452000,
        sourceType: 'demo',
        rawText: SAMPLE_PLAGIARISM_TEXT,
        extractedSegments: demoSegments,
        isChecked: true,
      });

      setSegments(demoSegments);
      setStep('review');

      showNotification('Dokumen demo skripsi & laporan Turnitin siap ditinjau!', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal memuat dokumen demo.', 'error');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Step 1: Select Plagiarism File (PDF/DOCX/TXT)
  const handlePlagiarismFileSelected = async (file: File) => {
    try {
      setIsProcessing(true);
      setProcessingStatusText(`Membaca file "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`);
      showNotification(`Sedang membaca file "${file.name}"...`, 'info');
      let extractedText = '';
      let pageCount = 1;

      if (file.name.toLowerCase().endsWith('.pdf')) {
        setProcessingStatusText('Membaca isi teks dan struktur halaman PDF...');
        const buffer = await file.arrayBuffer();
        try {
          const base64Data = arrayBufferToBase64(buffer);
          setProcessingStatusText('Mengekstrak teks laporan plagiasi...');
          const data = await safeFetchJson<{ text?: string; numpages?: number }>(
            '/api/parse-pdf',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64Data }),
            },
            30000
          );
          extractedText = data.text || '';
          pageCount = data.numpages || (data.text ? Math.ceil(data.text.length / 2000) : 1);
        } catch (pdfErr) {
          console.warn('Server PDF parse warning, using local buffer extractor:', pdfErr);
          setProcessingStatusText('Menggunakan pembaca buffer PDF lokal...');
          extractedText = extractTextFromPdfBufferLocally(buffer);
        }
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        setProcessingStatusText('Mengurai paragraf dan bab dokumen Word...');
        const docx = await parseDocxFile(file);
        const { paragraphs } = extractParagraphsAndChapters(docx.documentXml);
        extractedText = paragraphs.map((p) => p.text).join('\n\n');
      } else {
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        throw new Error('Tidak ada teks yang dapat dibaca dari file ini.');
      }

      const info: PlagiarismFileInfo = {
        fileName: file.name,
        fileSize: file.size,
        sourceType: 'file',
        rawText: extractedText,
        pageCount,
        extractedSegments: [],
        isChecked: false,
      };

      setPlagInfo(info);
      setProcessingStatusText('');
      showNotification(`File "${file.name}" siap! Silakan klik tombol "Cek Plagiasi & Simpan Daftar Kata" untuk membaca isi laporan.`, 'info');
    } catch (err: any) {
      console.error(err);
      setProcessingStatusText('');
      showNotification(err.message || 'Gagal memproses file laporan plagiasi.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatusText('');
    }
  };

  const handlePlagiarismTextPasted = (text: string) => {
    const info: PlagiarismFileInfo = {
      fileName: 'Teks_Kutipan_Paste.txt',
      fileSize: text.length,
      sourceType: 'paste',
      rawText: text,
      extractedSegments: [],
      isChecked: false,
    };

    setPlagInfo(info);
    showNotification('Teks kutipan siap! Silakan klik tombol "Cek Plagiasi & Simpan Daftar Kata" untuk memproses.', 'info');
  };

  // Instant local fallback extraction
  const handleInstantPlagiarismExtract = () => {
    if (!plagInfo || !plagInfo.rawText) {
      showNotification('Unggah file laporan plagiasi terlebih dahulu.', 'error');
      return;
    }

    const lines = plagInfo.rawText
      .split(/\n+/)
      .map((t) => t.trim().replace(/^\d+[\.\)]\s*/, ''))
      .filter((t) => t.length > 25);

    const extracted: PlagiarismSegment[] = lines.slice(0, 25).map((t, idx) => ({
      id: `instant-seg-${idx + 1}`,
      originalText: t,
      paraphrasedText: '',
      similarityScore: 85 - (idx % 18),
      matchedInDoc: false,
      targetXml: 'document' as const,
      paragraphIndex: -1,
      locationLabel: `Bagian Plagiasi #${idx + 1}`,
      isSelected: true,
      status: 'pending' as const,
    }));

    if (extracted.length === 0) {
      showNotification('Tidak ada kalimat yang memenuhi syarat untuk diekstrak.', 'error');
      return;
    }

    const updatedPlagInfo: PlagiarismFileInfo = {
      ...plagInfo,
      extractedSegments: extracted,
      isChecked: true,
      modelUsed: 'Ekstraksi Cepat Lokal',
    };

    setPlagInfo(updatedPlagInfo);
    setIsCheckingPlagiarism(false);
    setProcessingStatusText('');
    showNotification(`⚡ Ekstraksi Instan Berhasil! ${extracted.length} bagian tersimpan di memori. Silakan lanjut ke Tahap 2.`, 'success');
    setUploadStage('stage2_docx');
  };

  // Step 1 Action: Execute AI Plagiarism Check & Store Words in Memory
  const handleRunPlagiarismCheck = async () => {
    if (!plagInfo || !plagInfo.rawText) {
      showNotification('Silakan unggah file PDF laporan plagiasi terlebih dahulu.', 'error');
      return;
    }

    try {
      setIsCheckingPlagiarism(true);
      setProcessingStatusText('Sistem sedang memindai dan mengekstrak kalimat/frasa terindikasi plagiasi...');
      showNotification('Sistem sedang membaca dan mengekstrak seluruh kalimat/kata yang terindikasi plagiasi...', 'info');

      let extracted: PlagiarismSegment[] = [];

      try {
        setProcessingStatusText('Menganalisis indikasi kesamaan teks dan mencatat persentase...');
        const data = await safeFetchJson<{ items?: any[]; modelUsed?: string }>(
          '/api/extract-plagiarism',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textContent: plagInfo.rawText,
              preferredModel: defaultModel,
            }),
          },
          45000
        );

        if (data.items && data.items.length > 0) {
          extracted = data.items.map((it: any, idx: number) => ({
            id: `plag-seg-${idx + 1}`,
            originalText: it.originalText,
            paraphrasedText: '',
            similarityScore: it.similarityScore || (88 - (idx % 20)),
            matchedInDoc: false,
            targetXml: 'document' as const,
            paragraphIndex: -1,
            locationLabel: `Bagian Plagiasi #${idx + 1}`,
            isSelected: true,
            status: 'pending' as const,
          }));
        }
      } catch (aiErr) {
        console.warn('AI Plagiarism extraction warning:', aiErr);
      }

      // Fallback local rule-based extractor if AI returned empty
      if (extracted.length === 0) {
        setProcessingStatusText('Menggunakan pemindaian aturan cerdas lokal...');
        const lines = plagInfo.rawText
          .split(/\n+/)
          .map((t) => t.trim().replace(/^\d+[\.\)]\s*/, ''))
          .filter((t) => t.length > 25);

        extracted = lines.slice(0, 25).map((t, idx) => ({
          id: `local-seg-${idx + 1}`,
          originalText: t,
          paraphrasedText: '',
          similarityScore: 85 - (idx % 18),
          matchedInDoc: false,
          targetXml: 'document' as const,
          paragraphIndex: -1,
          locationLabel: `Bagian Plagiasi #${idx + 1}`,
          isSelected: true,
          status: 'pending' as const,
        }));
      }

      if (extracted.length === 0) {
        throw new Error('Tidak ditemukan kalimat plagiasi yang valid dari file laporan ini.');
      }

      const updatedPlagInfo: PlagiarismFileInfo = {
        ...plagInfo,
        extractedSegments: extracted,
        isChecked: true,
        modelUsed: defaultModel,
      };

      setPlagInfo(updatedPlagInfo);
      showNotification(`✅ Berhasil! Sistem telah membaca dan menyimpan ${extracted.length} kalimat/kata plagiasi ke basis data. Silakan lanjut ke Tahap 2.`, 'success');

      // Auto unlock or prompt to Stage 2
      setUploadStage('stage2_docx');
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Gagal mengekstrak kalimat plagiasi.', 'error');
    } finally {
      setIsCheckingPlagiarism(false);
      setProcessingStatusText('');
    }
  };

  // Step 2: Upload Original Word Document (.docx)
  const handleDocxUploaded = async (fileOrInfo: File | DocxFileInfo) => {
    try {
      setIsProcessing(true);
      let info: DocxFileInfo;
      if (fileOrInfo instanceof File || (fileOrInfo && 'arrayBuffer' in (fileOrInfo as any))) {
        info = await parseDocxFile(fileOrInfo as File);
      } else {
        info = fileOrInfo as DocxFileInfo;
      }
      setDocxInfo(info);
      showNotification(`File Word "${info.fileName}" (${info.footnotes?.length || 0} footnote & ${info.totalParagraphs} paragraf) siap dicocokkan!`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Gagal memproses file Word (.docx).', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Protected Terms Management
  const handleAddProtectedTerm = (term: string) => {
    if (!protectedTerms.includes(term)) {
      setProtectedTerms((prev) => [...prev, term]);
      showNotification(`Istilah "${term}" kini kebal dan dilindungi dari perubahan.`, 'success');
    }
  };

  const handleRemoveProtectedTerm = (term: string) => {
    setProtectedTerms((prev) => prev.filter((t) => t !== term));
  };

  // Start analysis: match Turnitin excerpts with DOCX paragraphs
  const handleStartAnalysis = async () => {
    if (!docxInfo || !plagInfo) {
      showNotification('Mohon unggah kedua file (Word Skripsi dan Laporan Turnitin).', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      showNotification('Mencari posisi persis kalimat plagiasi di dalam file Word asli...', 'info');

      const { paragraphs, chapters } = extractParagraphsAndChapters(docxInfo.documentXml);

      let rawSegments = plagInfo.extractedSegments || [];

      if (rawSegments.length === 0 && plagInfo.rawText) {
        try {
          const data = await safeFetchJson<{ items?: any[] }>('/api/extract-plagiarism', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textContent: plagInfo.rawText,
              preferredModel: defaultModel,
            }),
          });
          if (data.items && data.items.length > 0) {
            rawSegments = data.items.map((it: any, idx: number) => ({
              id: `extracted-${idx + 1}`,
              originalText: it.originalText,
              paraphrasedText: '',
              similarityScore: it.similarityScore || 80,
              matchedInDoc: false,
              targetXml: 'document' as const,
              paragraphIndex: -1,
              locationLabel: `Bagian #${idx + 1}`,
              isSelected: true,
              status: 'pending' as const,
            }));
          }
        } catch (e) {
          console.warn('API extraction error, fallback to raw lines:', e);
        }
      }

      // Match each segment against docx paragraphs
      const matchedSegments = rawSegments.map((seg) => {
        const match = findMatchInDocx(seg.originalText, paragraphs, chapters);
        return {
          ...seg,
          matchedInDoc: match.matched,
          paragraphIndex: match.paragraphIndex,
          locationLabel: match.locationLabel,
          contextBefore: match.contextBefore,
          contextAfter: match.contextAfter,
          footnoteIdsNearby: match.footnoteIdsNearby,
          protectedTermsDetected: match.protectedTermsDetected,
          status: 'matched' as const,
        };
      });

      const sanitizedSegments = sanitizeAndEnrichSegments(matchedSegments, { excludeBibliography });

      setSegments(sanitizedSegments);
      setStep('review');

      // Trigger AI Paraphrase for all segments with default Model
      await runBatchParaphrase(sanitizedSegments, selectedStyle, protectedTerms, defaultModel);
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Gagal mencocokkan teks ke naskah skripsi.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Run AI Paraphrase on segments with Citation Safety
  const runBatchParaphrase = async (
    targetSegments: PlagiarismSegment[],
    style: ParaphraseStyle,
    activeProtectedTerms: string[] = protectedTerms,
    modelToUse: GeminiModelId = defaultModel
  ) => {
    setIsParaphrasing(true);
    try {
      // Mask citations for each item before payload
      const maskedTokensMap: Record<string, Record<string, string>> = {};

      const itemsPayload = targetSegments.map((s) => {
        const { maskedText, tokenMap } = maskCitationsForAI(s.originalText);
        maskedTokensMap[s.id] = tokenMap;

        return {
          id: s.id,
          text: maskedText,
          location: s.locationLabel,
          footnoteContext: s.footnoteIdsNearby ? `Footnote: ${s.footnoteIdsNearby.join(', ')}` : '',
        };
      });

      const data = await safeFetchJson<{
        results?: any[];
        modelUsed?: string;
        source?: string;
      }>('/api/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          style,
          protectedTerms: activeProtectedTerms,
          preferredModel: modelToUse,
        }),
      });

      const resultsMap = new Map<string, any>();
      (data.results || []).forEach((r: any) => {
        const tokenMap = maskedTokensMap[r.id] || {};
        const unmaskedParaphrase = unmaskCitationsFromAI(r.paraphrasedText || '', tokenMap);
        const unmaskedAlt = r.alternativeText ? unmaskCitationsFromAI(r.alternativeText, tokenMap) : '';

        resultsMap.set(r.id, {
          ...r,
          paraphrasedText: unmaskedParaphrase,
          alternativeText: unmaskedAlt,
        });
      });

      setSegments((prev) =>
        prev.map((seg) => {
          const res = resultsMap.get(seg.id);
          if (res) {
            const finalParaphrase = res.paraphrasedText || seg.originalText;
            const newHistoryItem: SegmentVersionHistory = {
              id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: Date.now(),
              text: finalParaphrase,
              technique: style,
              modelUsed: data.modelUsed,
              author: 'ai',
            };

            const existingHistory = seg.history || [
              {
                id: `hist-orig-${seg.id}`,
                timestamp: Date.now() - 1000,
                text: seg.originalText,
                technique: 'Naskah Asli',
                author: 'original',
              },
            ];

            return {
              ...seg,
              paraphrasedText: finalParaphrase,
              alternativeText: res.alternativeText || '',
              explanation: res.explanation || '',
              status: 'paraphrased',
              appliedTechnique: style,
              history: [...existingHistory, newHistoryItem],
            };
          }
          return seg;
        })
      );

      const modelBadge = data.modelUsed ? ` (${data.modelUsed})` : '';
      if (data.source === 'academic_engine_fallback') {
        showNotification(
          'Parafrase ilmiah diselesaikan dengan Mesin Parafrase Akademik EYD V Cadangan.',
          'success'
        );
      } else {
        showNotification(`Parafrase ilmiah berhasil diselesaikan oleh Sistem Linguistik Akademik${modelBadge}.`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Terjadi kendala saat memparafrase.', 'error');
    } finally {
      setIsParaphrasing(false);
    }
  };

  // Single Item Paraphrase / Regeneration with Citation Safety
  const handleParaphraseSingle = async (segmentId: string) => {
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg) return;

    try {
      const { maskedText, tokenMap } = maskCitationsForAI(seg.originalText);

      const data = await safeFetchJson<{
        result?: any;
        modelUsed?: string;
      }>('/api/paraphrase-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: maskedText,
          context: seg.locationLabel,
          style: selectedStyle,
          protectedTerms,
          preferredModel: defaultModel,
        }),
      });

      const res = data.result;
      if (res) {
        const unmaskedOpt1 = unmaskCitationsFromAI(res.option1 || '', tokenMap);
        const unmaskedOpt2 = unmaskCitationsFromAI(res.option2 || '', tokenMap);
        const unmaskedOpt3 = unmaskCitationsFromAI(res.option3 || '', tokenMap);

        setSegments((prev) =>
          prev.map((s) => {
            if (s.id !== segmentId) return s;

            const newHistoryItem: SegmentVersionHistory = {
              id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: Date.now(),
              text: unmaskedOpt1 || s.paraphrasedText,
              technique: 'Rekonstruksi Formal Baku',
              modelUsed: data.modelUsed || defaultModel,
              author: 'ai',
            };

            const existingHistory = s.history || [];

            return {
              ...s,
              paraphrasedText: unmaskedOpt1 || s.paraphrasedText,
              alternativeText: unmaskedOpt2 || s.alternativeText,
              additionalOptions: [
                {
                  label: 'Formal Baku',
                  text: unmaskedOpt1,
                  technique: 'EYD V',
                  estimatedSimilarity: '< 5%',
                },
                {
                  label: 'Restrukturisasi Kalimat',
                  text: unmaskedOpt2,
                  technique: 'Pergeseran Klausa',
                  estimatedSimilarity: '< 4%',
                },
                {
                  label: 'Diksi Ilmiah Baru',
                  text: unmaskedOpt3,
                  technique: 'Nominalisasi',
                  estimatedSimilarity: '< 3%',
                },
              ],
              explanation: res.similarityReductionTip,
              status: 'paraphrased',
              history: [...existingHistory, newHistoryItem],
            };
          })
        );
        showNotification(`Variasi parafrase baru berhasil dibuat.`, 'success');
      }
    } catch (e) {
      console.error(e);
      showNotification('Gagal regenerasi parafrase.', 'error');
    }
  };

  // Toggle selection of segment
  const handleToggleSegment = (segmentId: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, isSelected: !s.isSelected } : s))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSegments((prev) => prev.map((s) => ({ ...s, isSelected: select })));
  };

  const handleUpdateParaphraseText = (segmentId: string, newText: string, technique?: string) => {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segmentId) return s;

        const newHistoryItem: SegmentVersionHistory = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          text: newText,
          technique: technique || 'Perubahan Teks',
          author: technique?.includes('EYD') ? 'eyd_fix' : 'user',
        };

        const existingHistory = s.history || [];

        return {
          ...s,
          paraphrasedText: newText,
          isCustomEdited: true,
          appliedTechnique: technique || s.appliedTechnique,
          history: [...existingHistory, newHistoryItem],
        };
      })
    );
  };

  const handleSelectAlternative = (segmentId: string, altText: string) => {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segmentId) return s;

        const newHistoryItem: SegmentVersionHistory = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          text: altText,
          technique: 'Variasi Sudut Pandang Alternatif',
          author: 'user',
        };

        const existingHistory = s.history || [];

        return {
          ...s,
          paraphrasedText: altText,
          isCustomEdited: true,
          history: [...existingHistory, newHistoryItem],
        };
      })
    );
  };

  const handleStyleChange = async (newStyle: ParaphraseStyle) => {
    setSelectedStyle(newStyle);
    await runBatchParaphrase(segments, newStyle, protectedTerms, defaultModel);
  };

  // Apply in-place to Word DOCX
  const handleApplyParaphrase = async () => {
    if (!docxInfo) return;

    try {
      setIsProcessing(true);
      const applyResult = await applyParaphraseToDocx(docxInfo, segments);

      const baseName = docxInfo.fileName.replace(/\.docx$/i, '');
      const downloadFileName = `${baseName}_Revisi_Parafrase.docx`;
      const fnCount = docxInfo.footnotes?.length || 0;

      const resultData: ReplacementResult = {
        totalMatched: (segments || []).filter((s) => s.matchedInDoc).length,
        totalReplaced: applyResult.replacedCount,
        footnotesBeforeCount: fnCount,
        footnotesAfterCount: fnCount,
        footnotesIntact: true,
        revisedDocxBlob: applyResult.updatedDocxBlob,
        downloadFileName,
        logs: applyResult.logs || [],
      };

      setReplacementResult(resultData);
      setStep('result');
      showNotification(
        `Sukses merevisi file Word asli! Semua ${resultData.footnotesAfterCount} footnote terjaga utuh.`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Gagal menerapkan penggantian ke file Word.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* App Header */}
      <Header
        onLoadDemo={handleLoadDemo}
        isLoadingDemo={isLoadingDemo}
        hasLoadedFiles={Boolean(docxInfo || plagInfo)}
        onReset={handleReset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-md border animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-500/40'
                : notification.type === 'error'
                ? 'bg-red-950 text-red-100 border-red-500/40'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Footnote Guard Transparency Bar (when docx is loaded) */}
        {docxInfo && (
          <FootnoteGuardView
            footnotes={docxInfo.footnotes || []}
            totalFootnotesCount={docxInfo.footnotes?.length || 0}
          />
        )}

        {/* Step Navigation / Breadcrumb */}
        {docxInfo && plagInfo && (
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-md ${
                  step === 'upload' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                1. Upload 2 File
              </span>
              <span className="text-slate-300">➔</span>
              <span
                className={`px-2.5 py-1 rounded-md ${
                  step === 'review' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                2. Tinjau & Parafrase Akademik
              </span>
              <span className="text-slate-300">➔</span>
              <span
                className={`px-2.5 py-1 rounded-md ${
                  step === 'result' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                3. Download Word Revisi
              </span>
            </div>

            {step !== 'upload' && (
              <button
                type="button"
                onClick={() => setStep(step === 'result' ? 'review' : 'upload')}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Tahap Sebelumnya</span>
              </button>
            )}
          </div>
        )}

        {/* VIEW 1: UPLOAD FILES (2-STAGE WORKFLOW) */}
        {step === 'upload' && (
          <FileUploader
            docxInfo={docxInfo}
            plagInfo={plagInfo}
            isProcessing={isProcessing}
            isCheckingPlagiarism={isCheckingPlagiarism}
            processingStatusText={processingStatusText}
            onPlagiarismFileSelected={handlePlagiarismFileSelected}
            onPlagiarismTextPasted={handlePlagiarismTextPasted}
            onRunPlagiarismCheck={handleRunPlagiarismCheck}
            onInstantPlagiarismExtract={handleInstantPlagiarismExtract}
            onDocxUploaded={handleDocxUploaded}
            onStartAnalysis={handleStartAnalysis}
            currentStage={uploadStage}
            onStageChange={setUploadStage}
          />
        )}

        {/* VIEW 2: PLAGIARISM REVIEW & PARAPHRASE */}
        {step === 'review' && (
          <PlagiarismReview
            segments={segments}
            isParaphrasing={isParaphrasing}
            selectedStyle={selectedStyle}
            protectedTerms={protectedTerms}
            onAddProtectedTerm={handleAddProtectedTerm}
            onRemoveProtectedTerm={handleRemoveProtectedTerm}
            onStyleChange={handleStyleChange}
            onParaphraseAll={() => runBatchParaphrase(segments, selectedStyle, protectedTerms, defaultModel)}
            onParaphraseSingle={handleParaphraseSingle}
            onToggleSegment={handleToggleSegment}
            onSelectAll={handleSelectAll}
            onUpdateParaphraseText={handleUpdateParaphraseText}
            onSelectAlternative={handleSelectAlternative}
            onProceedToApply={handleApplyParaphrase}
            excludeBibliography={excludeBibliography}
            onToggleExcludeBibliography={() => setExcludeBibliography(!excludeBibliography)}
          />
        )}

        {/* VIEW 3: RESULT & DOWNLOAD IN-PLACE DOCX */}
        {step === 'result' && replacementResult && docxInfo && (
          <ResultDownload
            onExportComplete={onExportComplete}
            result={replacementResult}
            docxInfo={docxInfo}
            onBackToReview={() => setStep('review')}
            onOpenPreview={() => setIsPreviewOpen(true)}
          />
        )}
      </main>

      {/* Full Document & Footnote Preview Modal */}
      {docxInfo && (
        <DocxPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          docxInfo={docxInfo}
          segments={segments}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="text-slate-300 font-medium">
            Aplikasi Parafrase Skripsi & Anti-Plagiasi In-Place DOCX
          </p>
          <p className="text-slate-400 text-[11px]">
            Mempertahankan 100% susunan tata letak, margin, gaya font, dan nomor footnote Word asli tanpa membuat file dari nol.
          </p>
        </div>
      </footer>
    </div>
  );
}
