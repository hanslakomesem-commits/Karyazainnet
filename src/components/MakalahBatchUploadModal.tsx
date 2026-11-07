import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  FileCheck, 
  Layers, 
  GraduationCap,
  ListChecks,
  Compass,
  Calendar,
  Clock,
  ShieldCheck,
  TrendingUp,
  Ban,
  ShieldAlert,
  FileWarning
} from 'lucide-react';
import { MakalahBatchItem, MakalahPost, UserRole, DocumentType } from '../types';
import { 
  extractDocumentContent, 
  analyzeMakalahWithAI, 
  fileToDataUrl, 
  batchSaveMakalahPosts,
  computeFileHash,
  checkDuplicateMakalah,
  fetchMakalahPosts
} from '../utils/makalahService';

interface MakalahBatchUploadModalProps {
  isOpen: boolean;
  userRole?: UserRole;
  existingPosts?: MakalahPost[];
  onClose: () => void;
  onSuccessPublished: (newPostsCount: number) => void;
}

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string; icon: string }[] = [
  { value: 'makalah', label: 'Makalah Akademik / Paper Kuliah', icon: '📝' },
  { value: 'skripsi', label: 'Skripsi / Tugas Akhir (S1)', icon: '🎓' },
  { value: 'tesis', label: 'Tesis / Disertasi (Pascasarjana)', icon: '🏛️' },
  { value: 'proposal', label: 'Proposal Penelitian / PKM', icon: '📑' },
  { value: 'jurnal', label: 'Artikel Jurnal Ilmiah', icon: '📄' },
  { value: 'laporan_pkl', label: 'Laporan Magang / KKN / PKL', icon: '🏢' },
  { value: 'laporan_praktikum', label: 'Laporan Praktikum & Lab', icon: '🔬' },
  { value: 'modul_ajar', label: 'Modul Kuliah & Bahan Ajar', icon: '📘' },
  { value: 'esai', label: 'Esai & Opini Ilmiah', icon: '✍️' },
  { value: 'review_buku', label: 'Review Buku & Kritik Pustaka', icon: '📖' },
  { value: 'lainnya', label: 'Dokumen Akademik Lainnya', icon: '📋' }
];

export const MakalahBatchUploadModal: React.FC<MakalahBatchUploadModalProps> = ({
  isOpen,
  userRole = 'public',
  existingPosts = [],
  onClose,
  onSuccessPublished
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchItems, setBatchItems] = useState<MakalahBatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // SEO Drip Release Settings
  const [publishMode, setPublishMode] = useState<'drip' | 'instant'>('drip');
  const [postsPerDay, setPostsPerDay] = useState<number>(5);

  // Helper to fetch freshest posts if existingPosts prop is empty
  const getReferencePosts = async (): Promise<MakalahPost[]> => {
    if (existingPosts && existingPosts.length > 0) return existingPosts;
    try {
      return await fetchMakalahPosts();
    } catch (e) {
      return [];
    }
  };

  // Strictly restrict to admin only
  if (!isOpen || userRole !== 'admin') return null;

  // Helper to detect format preview from extension
  const getFileFormatBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    if (ext === 'DOCX' || ext === 'DOC') return { label: ext, color: 'bg-blue-600 text-white' };
    if (ext === 'PDF') return { label: 'PDF', color: 'bg-rose-600 text-white' };
    if (ext === 'TXT' || ext === 'MD') return { label: ext, color: 'bg-emerald-600 text-white' };
    if (ext === 'RTF' || ext === 'ODT') return { label: ext, color: 'bg-indigo-600 text-white' };
    return { label: ext, color: 'bg-gray-700 text-white' };
  };

  // Handle file addition with instant duplicate detection
  const handleAddFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const currentPosts = await getReferencePosts();
    const newItems: MakalahBatchItem[] = [];

    // Track hashes & filenames within current batch items and previous added items
    const seenHashesInBatch = new Set<string>();
    const seenNamesInBatch = new Set<string>();

    // Register existing batch items
    batchItems.forEach(b => {
      if (b.fileHash) seenHashesInBatch.add(b.fileHash);
      if (b.fileName) seenNamesInBatch.add(b.fileName.trim().toLowerCase());
    });

    for (let idx = 0; idx < fileList.length; idx++) {
      const file = fileList[idx];
      const itemId = `batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      
      // Calculate SHA-256 binary hash
      let fileHash = '';
      try {
        fileHash = await computeFileHash(file);
      } catch (err) {
        console.warn('Hash calc warning:', err);
      }

      // Check against already published/saved posts in the blog
      const dupCheck = checkDuplicateMakalah(
        {
          fileName: file.name,
          fileSize: file.size,
          fileHash: fileHash || undefined
        },
        currentPosts
      );

      // Check duplicate within the same batch
      const rawName = file.name.trim().toLowerCase();
      const isBatchDup = (fileHash && seenHashesInBatch.has(fileHash)) || seenNamesInBatch.has(rawName);

      if (fileHash) seenHashesInBatch.add(fileHash);
      seenNamesInBatch.add(rawName);

      if (dupCheck.isDuplicate && dupCheck.existingPost) {
        newItems.push({
          id: itemId,
          file,
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          status: 'duplicate_rejected',
          progressMessage: 'Postingan ditolak / dibatalkan: File sudah ada di postingan.',
          errorMessage: `File ini sudah ada di postingan: "${dupCheck.existingPost.title}" (${dupCheck.reason}). Postingan ditolak/dibatalkan untuk menghindari data ganda.`,
          duplicateInfo: {
            existingPostId: dupCheck.existingPost.id,
            existingTitle: dupCheck.existingPost.title,
            existingSlug: dupCheck.existingPost.slug,
            existingFileName: dupCheck.existingPost.originalFileName,
            matchedBy: dupCheck.matchedBy || 'filename',
            reason: dupCheck.reason
          }
        });
      } else if (isBatchDup) {
        newItems.push({
          id: itemId,
          file,
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          status: 'duplicate_rejected',
          progressMessage: 'Postingan ditolak / dibatalkan: File terduplikasi dalam antrean unggahan ini.',
          errorMessage: `File "${file.name}" terduplikasi dengan file lain dalam antrean unggah ini. Postingan otomatis ditolak/dibatalkan.`,
          duplicateInfo: {
            existingPostId: '',
            existingTitle: file.name,
            matchedBy: 'filename',
            reason: 'File ganda dalam satu antrean unggahan'
          }
        });
      } else {
        newItems.push({
          id: itemId,
          file,
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          status: 'pending',
          progressMessage: 'Lolos deteksi duplikat. Menunggu ekstraksi & analisis otomatis...'
        });
      }
    }

    setBatchItems(prev => [...prev, ...newItems]);
  };

  // Start AI Processing on all pending items
  const startBatchProcessing = async () => {
    if (batchItems.length === 0) return;
    setIsProcessing(true);

    const currentPosts = await getReferencePosts();
    const items = [...batchItems];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Skip already processed items or duplicate rejected items
      if (item.status === 'ready' || item.status === 'duplicate_rejected') continue;

      try {
        // Step 1: Extract Text & HTML and store original file intact
        setBatchItems(curr => curr.map((it, idx) => 
          idx === i ? { ...it, status: 'extracting', progressMessage: 'Menyimpan berkas asli 100% & membaca naskah...' } : it
        ));

        const [extracted, dataUrl] = await Promise.all([
          extractDocumentContent(item.file),
          fileToDataUrl(item.file)
        ]);

        let fileHash = item.fileHash;
        if (!fileHash) {
          try {
            fileHash = await computeFileHash(item.file);
          } catch (e) {}
        }

        // Upload exact binary file to server storage without any modifications (server also validates duplicate)
        let uploadedFileId = '';
        let directDownloadUrl = '';
        try {
          const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          const uploadRes = await fetch('/api/makalah/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: item.fileName,
              fileSize: item.fileSize,
              fileBase64: base64Data,
              checkDuplicate: true
            })
          });

          const upJson = await uploadRes.json().catch(() => ({}));

          // Server rejected as duplicate!
          if (uploadRes.status === 409 || upJson.isDuplicate === true || upJson.code === 'DUPLICATE_FILE_REJECTED') {
            setBatchItems(curr => curr.map((it, idx) => 
              idx === i ? { 
                ...it, 
                status: 'duplicate_rejected',
                progressMessage: 'Postingan ditolak/dibatalkan: File sudah ada di postingan.',
                errorMessage: upJson.error || `File ini sudah ada di postingan: "${upJson.duplicateTitle || ''}". Postingan ditolak/dibatalkan.`,
                duplicateInfo: {
                  existingPostId: upJson.duplicateId || '',
                  existingTitle: upJson.duplicateTitle || '',
                  matchedBy: upJson.matchedBy || 'hash',
                  reason: upJson.error || 'File sudah ada di postingan'
                }
              } : it
            ));
            continue; // Stop processing this duplicate item!
          }

          if (uploadRes.ok) {
            uploadedFileId = upJson.fileId;
            directDownloadUrl = upJson.downloadUrl;
            if (upJson.fileHash && !fileHash) fileHash = upJson.fileHash;
          }
        } catch (uploadErr) {
          console.warn('Upload original file notice:', uploadErr);
        }

        // Step 2: AI / Heuristic Analysis & Document Type Detection + Auto Description
        setBatchItems(curr => curr.map((it, idx) => 
          idx === i ? { ...it, status: 'ai_processing', progressMessage: 'AI mendeteksi jenis dokumen & menyusun keterangan otomatis...', dataUrl, fileHash } : it
        ));

        const aiResult = await analyzeMakalahWithAI(extracted.rawText, extracted.htmlContent, item.fileName);

        const slug = (aiResult.title || item.fileName)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 70);

        // Check if generated title or slug already exists in blog posts
        const titleDupCheck = checkDuplicateMakalah(
          {
            fileName: item.fileName,
            fileSize: item.fileSize,
            fileHash,
            title: aiResult.title,
            slug
          },
          currentPosts
        );

        if (titleDupCheck.isDuplicate && titleDupCheck.existingPost) {
          setBatchItems(curr => curr.map((it, idx) => 
            idx === i ? { 
              ...it, 
              status: 'duplicate_rejected',
              progressMessage: 'Postingan ditolak/dibatalkan: Judul naskah sudah ada di postingan.',
              errorMessage: `File/Naskah ini sudah ada di postingan: "${titleDupCheck.existingPost!.title}" (${titleDupCheck.reason}). Postingan ditolak/dibatalkan.`,
              duplicateInfo: {
                existingPostId: titleDupCheck.existingPost!.id,
                existingTitle: titleDupCheck.existingPost!.title,
                existingSlug: titleDupCheck.existingPost!.slug,
                existingFileName: titleDupCheck.existingPost!.originalFileName,
                matchedBy: titleDupCheck.matchedBy || 'title',
                reason: titleDupCheck.reason
              }
            } : it
          ));
          continue; // Stop duplicate post from proceeding to ready!
        }

        const generatedPost: Partial<MakalahPost> = {
          id: `makalah-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: aiResult.title,
          slug,
          theme: aiResult.theme || 'Karya Ilmiah',
          documentType: (aiResult.documentType as DocumentType) || 'makalah',
          documentTypeLabel: aiResult.documentTypeLabel || 'Makalah Akademik',
          academicLevel: aiResult.academicLevel || 'Perkuliahan Mahasiswa',
          advisor: aiResult.advisor || '',
          autoDescription: aiResult.autoDescription || '',
          detectedChapters: Array.isArray(aiResult.detectedChapters) ? aiResult.detectedChapters : [],
          pageEstimate: aiResult.pageEstimate || Math.max(1, Math.round(extracted.rawText.split(/\s+/).length / 320)),
          wordCount: aiResult.wordCount || extracted.rawText.split(/\s+/).filter(Boolean).length,
          excerpt: aiResult.excerpt || '',
          contentHtml: aiResult.formattedHtml,
          rawText: extracted.rawText.slice(0, 3000),
          author: aiResult.author || 'Tim Penulis Mahasiswa',
          institution: aiResult.institution || '',
          tags: Array.isArray(aiResult.tags) ? aiResult.tags : [aiResult.documentType || 'makalah', 'akademik'],
          readingTimeMinutes: aiResult.readingTimeMinutes || 4,
          createdAt: Date.now() - (items.length - i) * 60000,
          views: 1,
          downloadCount: 0,
          originalFileName: item.fileName,
          originalFileSize: item.fileSize,
          originalFileDataUrl: dataUrl,
          fileHash: fileHash || undefined,
          fileId: uploadedFileId || undefined,
          downloadUrl: directDownloadUrl || (uploadedFileId ? `/api/makalah/download/${uploadedFileId}` : undefined)
        };

        setBatchItems(curr => curr.map((it, idx) => 
          idx === i ? { 
            ...it, 
            status: 'ready', 
            progressMessage: `100% Terdeteksi sebagai ${aiResult.documentTypeLabel}! Berkas asli tersimpan & siap dipublikasikan.`,
            result: generatedPost,
            dataUrl,
            fileHash
          } : it
        ));

      } catch (err: any) {
        console.error('Failed to process batch item:', err);
        setBatchItems(curr => curr.map((it, idx) => 
          idx === i ? { 
            ...it, 
            status: 'error', 
            errorMessage: err?.message || 'Gagal membaca isi dokumen',
            progressMessage: 'Gagal diproses' 
          } : it
        ));
      }
    }

    setIsProcessing(false);
  };

  // Update item field manually if user wants to tweak
  const handleUpdateField = (itemId: string, field: 'title' | 'theme' | 'author' | 'autoDescription', value: string) => {
    setBatchItems(prev => prev.map(item => {
      if (item.id === itemId && item.result) {
        return {
          ...item,
          result: {
            ...item.result,
            [field]: value
          }
        };
      }
      return item;
    }));
  };

  // Change document type manually
  const handleUpdateDocumentType = (itemId: string, newType: DocumentType) => {
    const matched = DOCUMENT_TYPE_OPTIONS.find(opt => opt.value === newType);
    const label = matched?.label || newType;

    setBatchItems(prev => prev.map(item => {
      if (item.id === itemId && item.result) {
        return {
          ...item,
          result: {
            ...item.result,
            documentType: newType,
            documentTypeLabel: label
          }
        };
      }
      return item;
    }));
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setBatchItems(prev => prev.filter(it => it.id !== itemId));
  };

  // Clear all rejected duplicate items
  const handleClearRejected = () => {
    setBatchItems(prev => prev.filter(it => it.status !== 'duplicate_rejected'));
  };

  // Publish all ready items with optional SEO drip staggering
  const handlePublishAll = async () => {
    const duplicateRejectedCount = batchItems.filter(i => i.status === 'duplicate_rejected').length;
    const readyItems = batchItems
      .filter(item => item.status === 'ready' && item.result);

    if (readyItems.length === 0) {
      if (duplicateRejectedCount > 0 && batchItems.length === duplicateRejectedCount) {
        alert('Semua file yang diunggah ditolak karena sudah ada di postingan. Postingan dibatalkan.');
      } else {
        alert('Belum ada postingan yang siap diterbitkan. Silakan klik "Mulai Deteksi Otomatis & Ekstrak AI" terlebih dahulu.');
      }
      return;
    }

    setIsPublishing(true);
    try {
      const scheduleHours = [8, 11, 14, 17, 20, 9, 13, 16, 19, 21];
      const now = Date.now();
      const perDay = Math.max(1, postsPerDay);

      const readyPosts: MakalahPost[] = readyItems.map((item, idx) => {
        const base = { ...(item.result as MakalahPost) };
        if (publishMode === 'drip') {
          const dayIndex = Math.floor(idx / perDay);
          const slotInDay = idx % perDay;
          const targetHour = scheduleHours[slotInDay % scheduleHours.length] || (8 + slotInDay * 2);
          const minuteOffset = (slotInDay * 17) % 60;

          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + dayIndex);
          targetDate.setHours(targetHour, minuteOffset, 0, 0);
          const scheduledTimestamp = targetDate.getTime();

          const isLiveNow = dayIndex === 0 && scheduledTimestamp <= now;

          return {
            ...base,
            status: isLiveNow ? 'published' : 'scheduled',
            scheduledAt: scheduledTimestamp,
            createdAt: scheduledTimestamp, // Chronological ordering matches scheduled date
            publishedAt: isLiveNow ? now : scheduledTimestamp
          };
        } else {
          return {
            ...base,
            status: 'published',
            scheduledAt: now,
            publishedAt: now
          };
        }
      });

      const saveResult = await batchSaveMakalahPosts(readyPosts);
      
      let alertMsg = `${saveResult.savedCount} postingan berhasil dipublikasikan.`;
      if (saveResult.rejectedCount > 0 || duplicateRejectedCount > 0) {
        const totalRej = saveResult.rejectedCount + duplicateRejectedCount;
        alertMsg += ` (${totalRej} file ditolak/dibatalkan karena sudah ada di postingan).`;
      }
      alert(alertMsg);

      onSuccessPublished(saveResult.savedCount);
      onClose();
    } catch (err: any) {
      alert('Gagal mempublikasikan: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const readyCount = batchItems.filter(i => i.status === 'ready').length;
  const duplicateRejectedCount = batchItems.filter(i => i.status === 'duplicate_rejected').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b1120] border border-blue-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-[#080d19] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Unggah & Deteksi Otomatis File</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" /> Multi-Document AI Engine
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Unggah berbagai jenis file (Makalah, Skripsi, Tesis, Jurnal, Proposal, Laporan PKL, Modul dll). Sistem otomatis mendeteksi jenis dokumen & menyusun keterangan lengkap.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          
          {/* Dropzone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver 
                ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' 
                : 'border-gray-700/80 hover:border-blue-500/60 bg-[#070b14]/80'
            }`}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              accept=".docx,.doc,.txt,.md,.rtf,.odt,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown,application/pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) handleAddFiles(e.target.files);
              }}
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base mb-1">
              Klik atau Seret (Drag & Drop) File Dokumen ke Sini
            </h3>
            <p className="text-gray-400 text-xs max-w-lg mx-auto mb-3">
              Mendukung berbagai format: <strong>.docx, .doc, .txt, .md, .pdf, .rtf, .odt</strong>. Bisa unggah <strong>10 file sekaligus atau lebih</strong>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300">🎓 Skripsi & TA</span>
              <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300">📄 Artikel Jurnal</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">📑 Proposal Penelitian</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">🏢 Laporan PKL/KKN</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">🔬 Laporan Praktikum</span>
              <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">📝 Makalah Kuliah</span>
            </div>
          </div>

          {/* Auto-Detection Duplicate Alert Banner if duplicates found */}
          {duplicateRejectedCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/30">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 sm:mt-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-200 flex items-center gap-1.5">
                    <span>{duplicateRejectedCount} File Ditolak / Dibatalkan (File Sudah Ada di Postingan)</span>
                  </h4>
                  <p className="text-xs text-rose-300/85 leading-relaxed">
                    Sistem mendeteksi berkas ini sudah pernah diunggah atau naskahnya sudah ada dalam daftar postingan. 
                    Postingan otomatis ditolak/dibatalkan untuk menjaga kebersihan repositori dari duplikasi data.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearRejected}
                className="px-3.5 py-1.5 rounded-xl bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-500/50 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                Bersihkan Ditolak ({duplicateRejectedCount})
              </button>
            </div>
          )}

          {/* Action & Stats Bar if items exist */}
          {batchItems.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-gray-800">
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Total File: {batchItems.length}
                </span>
                <span className="text-gray-500">|</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Siap: {readyCount}
                </span>
                {duplicateRejectedCount > 0 && (
                  <>
                    <span className="text-gray-500">|</span>
                    <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      <Ban className="w-3.5 h-3.5" /> Ditolak (Duplikat): {duplicateRejectedCount}
                    </span>
                  </>
                )}
                {batchItems.length - readyCount - duplicateRejectedCount > 0 && (
                  <>
                    <span className="text-gray-500">|</span>
                    <span className="text-amber-400 font-semibold">
                      Belum diproses: {batchItems.length - readyCount - duplicateRejectedCount}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={startBatchProcessing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sedang Deteksi Otomatis & Analisis AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mulai Deteksi Otomatis & Ekstrak AI</span>
                    </>
                  )}
                </button>

                {duplicateRejectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearRejected}
                    disabled={isProcessing}
                    className="px-3 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer"
                  >
                    Hapus Ditolak
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setBatchItems([])}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Bersihkan
                </button>
              </div>
            </div>
          )}

          {/* SEO Publishing Strategy Panel */}
          {batchItems.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-blue-950/30 border border-indigo-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      Strategi Jadwal SEO Googlebot (Drip-Feed Antrean)
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Mencegah deteksi bot / spam scraping dengan membagi rilis dokumen secara berkala.
                    </p>
                  </div>
                </div>

                {/* Mode Selector Buttons */}
                <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPublishMode('drip')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      publishMode === 'drip'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Jadwal Bertahap (SEO Drip)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishMode('instant')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      publishMode === 'instant'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Terbit Sekaligus (Instan)</span>
                  </button>
                </div>
              </div>

              {publishMode === 'drip' ? (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold text-gray-300">
                        Kecepatan Terbit Harian (Rekomendasi Google: 3 - 5 File/Hari):
                      </span>
                      <p className="text-[11px] text-gray-400">
                        Membuat Googlebot melihat website aktif dan konsisten secara organik setiap hari.
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5">
                      {[3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPostsPerDay(num)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            postsPerDay === num
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-900 border-gray-800 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {num} File/hari {num === 5 && '🌟'}
                        </button>
                      ))}

                      <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-gray-800">
                        <span className="text-[11px] text-gray-400">Kustom:</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={postsPerDay}
                          onChange={(e) => setPostsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 bg-transparent text-white font-bold text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculation Forecast */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-gray-400 text-[10px]">Hari Ini Terbit:</div>
                        <div className="font-bold text-white">
                          {Math.min(batchItems.length, postsPerDay)} Dokumen
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-gray-400 text-[10px]">Rentang Waktu:</div>
                        <div className="font-bold text-white">
                          {Math.ceil(batchItems.length / Math.max(1, postsPerDay))} Hari Terjadwal
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="text-gray-400 text-[10px]">Perlindungan Google:</div>
                        <div className="font-bold text-emerald-400">
                          100% Alami & Bebas Spam
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Catatan Publikasi Sekaligus:</span>
                    Semua dokumen ({batchItems.length} file) akan langsung live saat ini juga. Jika jumlahnya mencapai 50-100 file, disarankan menggunakan Mode Jadwal Bertahap agar sitemap tidak dianggap bot indexing oleh mesin pencari.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Item List */}
          {batchItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Daftar Dokumen yang Diunggah ({batchItems.length})</span>
                <span className="text-gray-500 text-[11px] normal-case">Format & jenis terdeteksi otomatis saat diproses</span>
              </h4>

              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {batchItems.map((item, idx) => {
                  const formatBadge = getFileFormatBadge(item.fileName);

                  return (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.status === 'duplicate_rejected'
                          ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/20'
                          : item.status === 'ready'
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : item.status === 'ai_processing' || item.status === 'extracting'
                          ? 'bg-blue-950/20 border-blue-500/40 animate-pulse'
                          : item.status === 'error'
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-slate-900/60 border-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                            item.status === 'duplicate_rejected' 
                              ? 'bg-rose-700' 
                              : (item.status === 'ready' ? 'bg-emerald-600' : 'bg-blue-600')
                          }`}>
                            {idx + 1}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${formatBadge.color}`}>
                                {formatBadge.label}
                              </span>

                              <span className="font-mono text-[11px] text-gray-300 bg-slate-800 px-2 py-0.5 rounded border border-gray-700">
                                {item.fileName} ({Math.round(item.fileSize / 1024)} KB)
                              </span>

                              {/* Status badges */}
                              {item.status === 'duplicate_rejected' && (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/25 text-rose-200 border border-rose-500/50 flex items-center gap-1.5 shadow-sm">
                                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                                  DITOLAK / DIBATALKAN: FILE SUDAH ADA DI POSTINGAN
                                </span>
                              )}
                              {item.status === 'ready' && item.result && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Terdeteksi: {item.result.documentTypeLabel}
                                </span>
                              )}
                              {(item.status === 'extracting' || item.status === 'ai_processing') && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> {item.progressMessage}
                                </span>
                              )}
                              {item.status === 'pending' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                                  Menunggu Deteksi
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> {item.errorMessage}
                                </span>
                              )}
                            </div>

                            {/* Rejection Detail Box for Duplicate Files */}
                            {item.status === 'duplicate_rejected' && (
                              <div className="mt-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs space-y-2">
                                <div className="flex items-center gap-2 font-bold text-rose-300">
                                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                                  <span>Keterangan Penolakan: File ini sudah ada di postingan</span>
                                </div>
                                <p className="text-xs text-rose-200 leading-relaxed pl-6">
                                  {item.errorMessage || 'File ini sudah ada di postingan, jadi kami tolak/batalkan untuk diposting agar tidak terjadi duplikasi.'}
                                </p>
                                {item.duplicateInfo?.existingTitle && (
                                  <div className="mt-2 pl-6 pt-2 border-t border-rose-500/20 text-[11px] text-gray-300 flex flex-wrap items-center gap-1.5">
                                    <span className="text-gray-400 font-medium">Judul Postingan yang Cocok:</span>
                                    <span className="text-amber-300 font-semibold underline decoration-amber-500/40">
                                      "{item.duplicateInfo.existingTitle}"
                                    </span>
                                    {item.duplicateInfo.matchedBy && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900/90 text-gray-300 border border-slate-700 ml-1">
                                        Metode Deteksi: {item.duplicateInfo.matchedBy === 'hash' ? 'Konten Berkas Identik (SHA-256)' : item.duplicateInfo.matchedBy === 'title' ? 'Judul Postingan Sama' : 'Nama & Ukuran Berkas'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Editable Results & Automatic Details once extracted */}
                            {item.result && (
                              <div className="space-y-3 bg-[#060a14] p-3.5 rounded-xl border border-slate-800">
                                
                                {/* Document Type Selector (Auto-detected, user can adjust) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2 border-b border-slate-800">
                                  <div>
                                    <label className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mb-1">
                                      <GraduationCap className="w-3 h-3 text-indigo-400" />
                                      Jenis Dokumen (Deteksi Otomatis):
                                    </label>
                                    <select
                                      value={item.result.documentType || 'makalah'}
                                      onChange={(e) => handleUpdateDocumentType(item.id, e.target.value as DocumentType)}
                                      className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-bold focus:border-indigo-400 focus:outline-none"
                                    >
                                      {DOCUMENT_TYPE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.icon} {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mb-1">
                                      <Compass className="w-3 h-3 text-blue-400" />
                                      Tema / Bidang Keilmuan:
                                    </label>
                                    <input
                                      type="text"
                                      value={item.result.theme || ''}
                                      onChange={(e) => handleUpdateField(item.id, 'theme', e.target.value)}
                                      placeholder="Contoh: Hukum, Teknologi, Ekonomi..."
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Title */}
                                <div>
                                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">
                                    Judul Dokumen (Dibuat Otomatis dari Naskah):
                                  </label>
                                  <input
                                    type="text"
                                    value={item.result.title || ''}
                                    onChange={(e) => handleUpdateField(item.id, 'title', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:border-blue-500 focus:outline-none"
                                  />
                                </div>

                                {/* Author & Level */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="text-[10px] text-gray-400 font-semibold block mb-1">
                                      Penulis / Penyusun:
                                    </label>
                                    <input
                                      type="text"
                                      value={item.result.author || ''}
                                      onChange={(e) => handleUpdateField(item.id, 'author', e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-400 font-semibold block mb-1">
                                      Volume & Estimasi:
                                    </label>
                                    <div className="flex items-center gap-2 text-xs text-gray-300 py-1 font-mono">
                                      <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-bold">
                                        ~{item.result.pageEstimate || 1} Halaman
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">
                                        {(item.result.wordCount || 0).toLocaleString('id-ID')} Kata
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Keterangan Otomatis Dokumen */}
                                <div>
                                  <label className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mb-1">
                                    <Sparkles className="w-3 h-3" /> Keterangan Dokumen Otomatis (Ringkasan & Analisis):
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={item.result.autoDescription || ''}
                                    onChange={(e) => handleUpdateField(item.id, 'autoDescription', e.target.value)}
                                    className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2 text-xs text-emerald-200/90 leading-relaxed focus:border-emerald-400 focus:outline-none"
                                    placeholder="Keterangan otomatis ringkasan isi dokumen..."
                                  />
                                </div>

                                {/* Detected Chapters */}
                                {item.result.detectedChapters && item.result.detectedChapters.length > 0 && (
                                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                      <ListChecks className="w-3 h-3" /> Struktur Bab:
                                    </span>
                                    {item.result.detectedChapters.slice(0, 5).map((chap, cIdx) => (
                                      <span key={cIdx} className="px-2 py-0.5 rounded bg-slate-800/80 text-gray-300 text-[10px] border border-slate-700">
                                        {chap}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isProcessing}
                          className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                          title="Hapus file ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-800 bg-[#080d19] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-400 text-center sm:text-left">
            {readyCount > 0 ? (
              <span>
                <strong className="text-emerald-400">{readyCount} dokumen</strong> siap dipublikasikan ke blog repositori terbuka.
              </span>
            ) : (
              <span>Unggah file (.docx, .doc, .txt, .pdf dll) lalu klik "Mulai Deteksi Otomatis & Ekstrak AI".</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handlePublishAll}
              disabled={readyCount === 0 || isPublishing || isProcessing}
              className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menerbitkan...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {publishMode === 'drip' ? `Jadwalkan & Rilis Bertahap (${readyCount})` : `Publikasikan Sekaligus (${readyCount})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
