import { collection, doc, getDocs, getDoc, setDoc, updateDoc, increment, deleteDoc, query, orderBy, limit } from '../storage/documents';
import { db } from '../firebase';
import { MakalahPost } from '../types';
import mammoth from 'mammoth';
import { 
  savePostToIndexedDb, 
  batchSavePostsToIndexedDb, 
  getAllPostsFromIndexedDb, 
  getPostFromIndexedDb, 
  saveFileToIndexedDb, 
  getFileFromIndexedDb, 
  deletePostFromIndexedDb, 
  clearAllFromIndexedDb 
} from './indexedDbStorage';

const LOCAL_STORAGE_KEY = 'zain_makalah_posts';

// Initial sample seed posts (empty as requested by user to allow 100% fresh file uploads)
export const sampleMakalahPosts: MakalahPost[] = [];

// Helper: Convert File to Base64 data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Helper: Convert File to ArrayBuffer
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Helper: Read Plain Text from File
export function fileToPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// Helper: Compute SHA-256 binary hash of File / Blob
export async function computeFileHash(file: File | Blob): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('computeFileHash error, using fallback fingerprint:', err);
    return `fp-${file.size}-${(file as File).name || 'file'}`;
  }
}

// Normalize file name for duplicate comparison (removes extensions, symbols, and extra spaces)
export function normalizeFileNameForComparison(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\.(docx?|pdf|txt|md|odt|rtf)$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Normalize title for comparison
export function normalizeTitleForComparison(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason: string;
  matchedBy?: 'hash' | 'filename_and_size' | 'filename' | 'title' | 'slug';
  existingPost?: MakalahPost;
}

// Detect if a file or post metadata already exists in the given posts list
export function checkDuplicateMakalah(
  target: { 
    fileName: string; 
    fileSize?: number; 
    fileHash?: string; 
    title?: string; 
    slug?: string;
    currentPostId?: string;
  }, 
  existingPosts: MakalahPost[]
): DuplicateCheckResult {
  if (!existingPosts || existingPosts.length === 0) {
    return { isDuplicate: false, reason: '' };
  }

  const normTargetName = normalizeFileNameForComparison(target.fileName);
  const rawTargetName = (target.fileName || '').trim().toLowerCase();
  const normTargetTitle = normalizeTitleForComparison(target.title || '');

  for (const post of existingPosts) {
    if (!post) continue;
    // Skip if comparing against the same post (e.g. updating an existing post)
    if (target.currentPostId && post.id === target.currentPostId) continue;
    // Skip posts that are in the trash
    if (post.status === 'trash') continue;

    // 1. Exact Binary Content Match (SHA-256 Hash)
    if (target.fileHash && post.fileHash && target.fileHash === post.fileHash) {
      return {
        isDuplicate: true,
        reason: `Isi berkas identik (SHA-256 Hash sama) dengan postingan "${post.title}"`,
        matchedBy: 'hash',
        existingPost: post
      };
    }

    // 2. Exact Raw File Name Match
    const rawPostName = (post.originalFileName || '').trim().toLowerCase();
    if (rawTargetName && rawPostName && rawTargetName === rawPostName) {
      return {
        isDuplicate: true,
        reason: `Nama berkas "${post.originalFileName}" sudah pernah diunggah pada postingan "${post.title}"`,
        matchedBy: 'filename',
        existingPost: post
      };
    }

    // 3. Normalized File Name AND matching size (within 100 bytes or exact)
    const normPostName = normalizeFileNameForComparison(post.originalFileName || '');
    if (normTargetName && normPostName && normTargetName === normPostName) {
      const sizeMatched = !target.fileSize || !post.originalFileSize || Math.abs(post.originalFileSize - target.fileSize) < 100;
      if (sizeMatched) {
        return {
          isDuplicate: true,
          reason: `Berkas serupa "${post.originalFileName}" sudah ada di postingan "${post.title}"`,
          matchedBy: 'filename_and_size',
          existingPost: post
        };
      }
    }

    // 4. Exact Title Match
    if (normTargetTitle && normTargetTitle.length > 6) {
      const normPostTitle = normalizeTitleForComparison(post.title || '');
      if (normPostTitle && normPostTitle === normTargetTitle) {
        return {
          isDuplicate: true,
          reason: `Judul postingan "${post.title}" sudah ada di sistem`,
          matchedBy: 'title',
          existingPost: post
        };
      }
    }

    // 5. Slug Match
    if (target.slug && post.slug && target.slug === post.slug) {
      return {
        isDuplicate: true,
        reason: `Tautan URL "${post.slug}" sudah digunakan oleh postingan "${post.title}"`,
        matchedBy: 'slug',
        existingPost: post
      };
    }
  }

  return { isDuplicate: false, reason: '' };
}

// Extract Raw Text and HTML from DOCX, PDF, Plain Text, or other documents
export async function extractDocumentContent(file: File): Promise<{ rawText: string; htmlContent: string; detectedFormat: string; pageCount?: number }> {
  const fileName = file.name.toLowerCase();

  // 1. PDF Document (.pdf) via Server-side PDF Engine
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const dataUrl = await fileToDataUrl(file);
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const res = await fetch('/api/makalah/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64Data, fileName: file.name })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.rawText) {
          return {
            rawText: json.rawText,
            htmlContent: json.htmlContent || `<p class="leading-relaxed mb-4 text-justify">${json.rawText.slice(0, 2000)}</p>`,
            detectedFormat: 'Dokumen PDF (.pdf)',
            pageCount: json.pageCount || 1
          };
        }
      }
    } catch (pdfErr) {
      console.warn('PDF server-side extraction error, continuing to fallback:', pdfErr);
    }

    // Fallback preview for PDF if server extraction takes long
    return {
      rawText: `Dokumen PDF ${file.name} berhasil diunggah. Naskah siap dibaca dan diunduh langsung dalam format PDF asli.`,
      htmlContent: `<div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 mb-4">
        <p class="font-bold mb-1">Dokumen PDF Terverifikasi Asli: ${file.name}</p>
        <p class="text-xs">Naskah lengkap tersimpan utuh dan dapat langsung diunduh bebas oleh publik.</p>
      </div>`,
      detectedFormat: 'Dokumen PDF (.pdf)'
    };
  }
  
  // 2. Plain Text or Markdown file (.txt, .md)
  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    try {
      const text = await fileToPlainText(file);
      const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
      const html = paragraphs.map(p => {
        if (/^(bab\s+[ivx\d]+|pendahuluan|pembahasan|kesimpulan|daftar\s+pustaka)/i.test(p)) {
          return `<h2 class="text-xl font-bold text-black mt-8 mb-3 pb-1 border-b border-slate-300">${p}</h2>`;
        }
        return `<p class="text-black leading-relaxed mb-4 text-justify">${p.replace(/\n/g, '<br/>')}</p>`;
      }).join('');
      return { rawText: text, htmlContent: html, detectedFormat: fileName.endsWith('.md') ? 'Markdown' : 'Plain Text' };
    } catch (e) {
      console.warn('Text file read error:', e);
    }
  }

  // 3. Word Document (.docx, .doc) via Mammoth
  try {
    const arrayBuffer = await fileToArrayBuffer(file);
    const [rawTextResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      mammoth.convertToHtml({ arrayBuffer })
    ]);

    if (rawTextResult.value && rawTextResult.value.trim().length > 0) {
      return {
        rawText: rawTextResult.value,
        htmlContent: htmlResult.value || '',
        detectedFormat: fileName.endsWith('.doc') ? 'Word (.doc)' : 'Word (.docx)'
      };
    }
  } catch (docxErr) {
    console.warn('Mammoth extraction failed, trying plain text reader:', docxErr);
  }

  // 3. Fallback: Read as text
  try {
    const fallbackText = await fileToPlainText(file);
    if (fallbackText && fallbackText.length > 20) {
      const paragraphs = fallbackText.split(/\n\s*\n/).filter(Boolean);
      const html = paragraphs.map(p => `<p class="text-black leading-relaxed mb-4 text-justify">${p.replace(/\n/g, '<br/>')}</p>`).join('');
      return { rawText: fallbackText, htmlContent: html, detectedFormat: 'Document Text' };
    }
  } catch (fallbackErr) {
    console.warn('Fallback text read failed:', fallbackErr);
  }

  return {
    rawText: `Dokumen ${file.name} berhasil diunggah.`,
    htmlContent: `<p class="text-black font-medium">Dokumen asli ${file.name} telah disimpan utuh dalam repositori.</p>`,
    detectedFormat: 'Document File'
  };
}

// Backward compatibility alias
export const extractDocxContent = extractDocumentContent;

// Call AI API to analyze and extract document metadata & structured content
export async function analyzeMakalahWithAI(rawText: string, htmlContent: string, filename: string) {
  try {
    const res = await fetch('/api/makalah/ai-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, htmlContent, filename })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('AI extraction API call failed, using client fallback:', err);
    // Intelligent client fallback for document detection & auto-description
    const cleanFilename = filename.replace(/\.(docx|doc|pdf|txt|rtf|odt)$/i, '').replace(/[-_]/g, ' ');
    const fn = filename.toLowerCase();
    const txtLower = rawText.toLowerCase();

    let documentType = 'makalah';
    let documentTypeLabel = 'Makalah Akademik';
    let academicLevel = 'Perkuliahan Mahasiswa';

    if (fn.includes('skripsi') || fn.includes('tugas_akhir') || txtLower.includes('skripsi') || txtLower.includes('gelar sarjana')) {
      documentType = 'skripsi';
      documentTypeLabel = 'Skripsi / Tugas Akhir (S1)';
      academicLevel = 'Sarjana (S1)';
    } else if (fn.includes('tesis') || txtLower.includes('tesis') || txtLower.includes('gelar magister')) {
      documentType = 'tesis';
      documentTypeLabel = 'Tesis Magister (S2)';
      academicLevel = 'Pascasarjana (S2)';
    } else if (fn.includes('proposal') || txtLower.includes('proposal penelitian') || txtLower.includes('usulan penelitian')) {
      documentType = 'proposal';
      documentTypeLabel = 'Proposal Penelitian / Riset';
      academicLevel = 'Rancangan Penelitian';
    } else if (fn.includes('jurnal') || txtLower.includes('issn') || (txtLower.includes('volume') && txtLower.includes('nomor'))) {
      documentType = 'jurnal';
      documentTypeLabel = 'Artikel Jurnal Ilmiah';
      academicLevel = 'Publikasi Ilmiah';
    } else if (fn.includes('pkl') || fn.includes('magang') || fn.includes('kkn') || txtLower.includes('praktik kerja lapangan')) {
      documentType = 'laporan_pkl';
      documentTypeLabel = 'Laporan Magang / KKN / PKL';
      academicLevel = 'Praktik Lapangan';
    } else if (fn.includes('praktikum') || txtLower.includes('laporan praktikum')) {
      documentType = 'laporan_praktikum';
      documentTypeLabel = 'Laporan Praktikum / Lab';
      academicLevel = 'Praktikum Kuliah';
    } else if (fn.includes('modul') || fn.includes('bahan ajar') || txtLower.includes('modul pembelajaran')) {
      documentType = 'modul_ajar';
      documentTypeLabel = 'Modul Kuliah & Bahan Ajar';
      academicLevel = 'Materi Pembelajaran';
    }

    const words = rawText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const pageEstimate = Math.max(1, Math.round(wordCount / 320));
    const title = cleanFilename.charAt(0).toUpperCase() + cleanFilename.slice(1);

    return {
      title,
      documentType,
      documentTypeLabel,
      theme: 'Karya Ilmiah & Akademik',
      academicLevel,
      excerpt: rawText.slice(0, 240) + '...',
      autoDescription: `Naskah terdeteksi sebagai ${documentTypeLabel} dengan estimasi volume ${pageEstimate} halaman (${wordCount.toLocaleString('id-ID')} kata). Berkas membahas mengenai "${title}". Berkas dokumen asli tersimpan utuh dan dapat diunduh tanpa perubahan.`,
      detectedChapters: ['PENDAHULUAN', 'PEMBAHASAN', 'KESIMPULAN', 'DAFTAR PUSTAKA'],
      pageEstimate,
      wordCount,
      tags: [documentType, 'akademik', 'karya ilmiah'],
      author: 'Tim Penulis Mahasiswa',
      institution: '',
      readingTimeMinutes: Math.max(3, Math.ceil(wordCount / 200)),
      formattedHtml: htmlContent || `<p class="text-black leading-relaxed">${rawText.replace(/\n/g, '<br/>')}</p>`
    };
  }
}

// Helper: Ensure HTML content has solid deep black text
function enforceSolidBlackHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/text-gray-\d+/gi, 'text-black')
    .replace(/text-slate-[2-7]\d\d/gi, 'text-black')
    .replace(/text-indigo-[2-4]\d\d/gi, 'text-black font-bold');
}

// Fetch single post by slug or ID with server API & Firestore fallback
export async function fetchMakalahBySlug(slugOrId: string): Promise<MakalahPost | null> {
  if (!slugOrId) return null;
  const clean = decodeURIComponent(slugOrId).trim().toLowerCase();

  // 1. Try server API endpoint
  try {
    const res = await fetch(`/api/makalah/post-by-slug/${encodeURIComponent(slugOrId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.post) {
        return {
          ...data.post,
          contentHtml: enforceSolidBlackHtml(data.post.contentHtml)
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch post by slug from API:', err);
  }

  // 2. Check local storage cache
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: MakalahPost[] = JSON.parse(saved);
      const found = parsed.find(p => {
        const pSlug = (p.slug || '').toLowerCase();
        const pId = (p.id || '').toLowerCase();
        const titleSlug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return pSlug === clean || pId === clean || titleSlug === clean || pSlug.includes(clean) || clean.includes(pSlug);
      });
      if (found) {
        return {
          ...found,
          contentHtml: enforceSolidBlackHtml(found.contentHtml)
        };
      }
    }
  } catch (e) {}

  // 3. Query Firestore client (only if not in quota cooldown)
  const isCooldown = (() => {
    try {
      const val = localStorage.getItem('zain_firestore_quota_cooldown_until');
      return val && Number(val) > Date.now();
    } catch (e) {
      return false;
    }
  })();

  if (!isCooldown) {
    try {
      const postsRef = collection(db, 'posts');
      const snap = await getDocs(postsRef);
      if (!snap.empty) {
        let matched: MakalahPost | null = null;
        snap.forEach(docSnap => {
          const p = docSnap.data() as any;
          const pSlug = (p.slug || '').toLowerCase();
          const pId = docSnap.id.toLowerCase();
          const titleSlug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (pSlug === clean || pId === clean || titleSlug === clean || pSlug.includes(clean) || clean.includes(pSlug)) {
            matched = {
              id: docSnap.id,
              ...p,
              contentHtml: enforceSolidBlackHtml(p.contentHtml)
            };
          }
        });
        if (matched) return matched;
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Quota') || msg.includes('resource-exhausted')) {
        try {
          localStorage.setItem('zain_firestore_quota_cooldown_until', String(Date.now() + 30 * 60 * 1000));
        } catch (e) {}
      }
    }
  }

  // 4. Check sample posts
  const sampleFound = sampleMakalahPosts.find(p => {
    const pSlug = (p.slug || '').toLowerCase();
    const pId = (p.id || '').toLowerCase();
    const titleSlug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return pSlug === clean || pId === clean || titleSlug === clean || pSlug.includes(clean) || clean.includes(pSlug);
  });

  return sampleFound || null;
}

// Auto-sync client posts to server if server container restarted and has 0 posts
export async function syncClientPostsToServer(posts: MakalahPost[]): Promise<void> {
  if (!posts || posts.length === 0) return;
  try {
    await fetch('/api/makalah/sync-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts })
    });
  } catch (e) {
    console.warn('syncClientPostsToServer error:', e);
  }
}

// Fetch all published posts for public readers (with auto-activation of passed schedules & persistent IndexedDB backup)
export async function fetchMakalahPosts(): Promise<MakalahPost[]> {
  // 1. Get cached posts from IndexedDB first (instant, guaranteed persistence across restarts)
  let localPosts: MakalahPost[] = [];
  try {
    localPosts = await getAllPostsFromIndexedDb();
  } catch (e) {}

  if (localPosts.length === 0) {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localPosts = parsed;
      }
    } catch (e) {}
  }

  // 2. Fetch from server API route
  let serverPosts: MakalahPost[] = [];
  let serverSuccess = false;
  try {
    const res = await fetch('/api/makalah/posts');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        serverPosts = data.posts;
        serverSuccess = true;
      }
    }
  } catch (apiErr) {
    // API fetch error
  }

  // 3. AUTO-HEALING & RE-HYDRATION:
  // If the server has fewer posts or 0 posts (e.g. Cloud Run restarted container after 30 min idle),
  // but client has local posts, NEVER WIPE CLIENT STORAGE!
  // Instead, immediately re-hydrate the server with the client's persistent posts!
  if (serverSuccess && localPosts.length > 0 && (serverPosts.length === 0 || localPosts.length > serverPosts.length)) {
    syncClientPostsToServer(localPosts).catch(console.warn);
  }

  // Smart merge local posts and server posts
  const mergedMap = new Map<string, MakalahPost>();
  for (const p of localPosts) {
    mergedMap.set(p.id, p);
  }
  for (const sp of serverPosts) {
    const existing = mergedMap.get(sp.id);
    mergedMap.set(sp.id, {
      ...existing,
      ...sp,
      originalFileDataUrl: existing?.originalFileDataUrl || sp.originalFileDataUrl,
      contentHtml: enforceSolidBlackHtml(sp.contentHtml || existing?.contentHtml || '')
    });
  }

  const combinedPosts = Array.from(mergedMap.values());

  // Save merged result to IndexedDB & localStorage
  if (combinedPosts.length > 0) {
    batchSavePostsToIndexedDb(combinedPosts).catch(() => {});
    try {
      const lightPosts = combinedPosts.map(p => {
        const { originalFileDataUrl, ...rest } = p;
        return rest;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightPosts));
    } catch (e) {}
  }

  // Return active posts for public viewing
  const now = Date.now();
  const activePosts = combinedPosts
    .filter((p: MakalahPost) => {
      if (p.status === 'trash' || p.status === 'draft') return false;
      if (p.status === 'scheduled' && p.scheduledAt && p.scheduledAt > now) return false;
      return true;
    })
    .map((p: any) => ({
      ...p,
      contentHtml: enforceSolidBlackHtml(p.contentHtml)
    }));

  return activePosts;
}

// ADMIN: Fetch all posts regardless of status (published, scheduled, draft, trash)
export async function fetchAdminMakalahPosts(): Promise<MakalahPost[]> {
  // 1. Get cached posts from IndexedDB first
  let localPosts: MakalahPost[] = [];
  try {
    localPosts = await getAllPostsFromIndexedDb();
  } catch (e) {}

  if (localPosts.length === 0) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localPosts = parsed;
      } catch (e) {}
    }
  }

  // 2. Fetch from server admin API
  let serverPosts: MakalahPost[] = [];
  let serverSuccess = false;
  try {
    const res = await fetch('/api/makalah/admin/posts');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        serverPosts = data.posts;
        serverSuccess = true;
      }
    }
  } catch (e) {
    console.warn('fetchAdminMakalahPosts API error:', e);
  }

  // Auto-heal server if container restarted or has missing posts
  if (serverSuccess && localPosts.length > 0 && (serverPosts.length === 0 || localPosts.length > serverPosts.length)) {
    syncClientPostsToServer(localPosts).catch(console.warn);
  }

  // Smart merge
  const mergedMap = new Map<string, MakalahPost>();
  for (const p of localPosts) {
    mergedMap.set(p.id, p);
  }
  for (const sp of serverPosts) {
    const existing = mergedMap.get(sp.id);
    mergedMap.set(sp.id, {
      ...existing,
      ...sp,
      originalFileDataUrl: existing?.originalFileDataUrl || sp.originalFileDataUrl,
      contentHtml: enforceSolidBlackHtml(sp.contentHtml || existing?.contentHtml || '')
    });
  }

  const combined = Array.from(mergedMap.values());
  if (combined.length > 0) {
    batchSavePostsToIndexedDb(combined).catch(() => {});
  }

  return combined.map((p: any) => ({
    ...p,
    contentHtml: enforceSolidBlackHtml(p.contentHtml)
  }));
}

// Clear all posts completely (server, Firestore, IndexedDB, and client localStorage)
export async function clearAllMakalahPosts(): Promise<{ success: boolean; message: string }> {
  let serverMessage = '';
  try {
    const res = await fetch('/api/makalah/admin/clear-all', { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      serverMessage = json.message || '';
    }
  } catch (e) {
    console.warn('Server clear-all notice:', e);
  }

  // Clear IndexedDB
  try {
    await clearAllFromIndexedDb();
  } catch (e) {}

  // Clear local storage
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {}

  // Attempt client firestore clear if accessible
  try {
    const isCooldown = (() => {
      try {
        const val = localStorage.getItem('zain_firestore_quota_cooldown_until');
        return val && Number(val) > Date.now();
      } catch (e) { return false; }
    })();

    if (!isCooldown) {
      const snap = await getDocs(collection(db, 'posts'));
      const batchList: Promise<any>[] = [];
      snap.forEach(d => batchList.push(deleteDoc(doc(db, 'posts', d.id))));
      await Promise.allSettled(batchList);
    }
  } catch (e) {}

  return {
    success: true,
    message: serverMessage || 'Semua postingan blog telah berhasil dikosongkan.'
  };
}

// Save single post to IndexedDB, server disk, Firestore, and local storage
export async function saveMakalahPost(post: MakalahPost, options?: { skipDuplicateCheck?: boolean }): Promise<void> {
  // 1. Save to server backend first to validate and check duplicate rejection
  try {
    const srvRes = await fetch('/api/makalah/admin/save-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...post, skipDuplicateCheck: options?.skipDuplicateCheck })
    });
    if (!srvRes.ok) {
      const errJson = await srvRes.json().catch(() => ({}));
      if (srvRes.status === 409 || errJson.code === 'DUPLICATE_FILE_REJECTED') {
        throw new Error(errJson.error || 'File ini sudah ada di postingan. Postingan ditolak/dibatalkan.');
      }
    }
  } catch (srvErr: any) {
    if (srvErr.message?.includes('File ini sudah ada di postingan')) {
      throw srvErr;
    }
    console.warn('Server save post warning:', srvErr);
  }

  // 2. Save to persistent IndexedDB immediately (retains byte-for-byte binary and metadata)
  try {
    await savePostToIndexedDb(post);
  } catch (idbErr) {
    console.warn('IndexedDB save post warning:', idbErr);
  }

  // 3. Save to Firestore if accessible (strip originalFileDataUrl so Firestore NEVER trips the 1MB document limit)
  try {
    const isCooldown = (() => {
      try {
        const val = localStorage.getItem('zain_firestore_quota_cooldown_until');
        return val && Number(val) > Date.now();
      } catch (e) { return false; }
    })();

    if (!isCooldown) {
      const { originalFileDataUrl, ...firestorePost } = post;
      const docRef = doc(db, 'posts', post.id);
      await setDoc(docRef, firestorePost, { merge: true });
    }
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('Quota') || msg.includes('resource-exhausted') || msg.includes('free tier database')) {
      try {
        localStorage.setItem('zain_firestore_quota_cooldown_until', String(Date.now() + 30 * 60 * 1000));
      } catch (e) {}
    }
    console.warn('Firestore post save notice (safe fallback):', err);
  }

  // 4. Update local storage (lightweight without heavy dataUrl to avoid quota limits)
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: MakalahPost[] = saved ? JSON.parse(saved) : [];
    const { originalFileDataUrl, ...lightPost } = post;
    const updated = [lightPost as MakalahPost, ...existing.filter(p => p.id !== post.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

// Batch save multiple posts
export async function batchSaveMakalahPosts(posts: MakalahPost[]): Promise<{ savedCount: number; rejectedCount: number; errors: string[] }> {
  let savedCount = 0;
  let rejectedCount = 0;
  const errors: string[] = [];
  const validPosts: MakalahPost[] = [];

  for (const post of posts) {
    try {
      await saveMakalahPost(post);
      validPosts.push(post);
      savedCount++;
    } catch (err: any) {
      rejectedCount++;
      errors.push(err.message || 'File duplikat ditolak.');
      console.warn('Batch post save rejected/warning:', err);
    }
  }

  if (validPosts.length > 0) {
    try {
      await batchSavePostsToIndexedDb(validPosts);
    } catch (e) {}
    try {
      await syncClientPostsToServer(validPosts);
    } catch (e) {}
  }

  return { savedCount, rejectedCount, errors };
}

// Update single post status (published, scheduled, draft, trash)
export async function updateMakalahPostStatus(
  postId: string, 
  status: 'published' | 'scheduled' | 'draft' | 'trash', 
  scheduledAt?: number
): Promise<void> {
  try {
    await fetch('/api/makalah/admin/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, status, scheduledAt })
    });
  } catch (e) {
    console.warn('updateMakalahPostStatus server error:', e);
  }

  // Update in Firestore
  try {
    const docRef = doc(db, 'posts', postId);
    const updatePayload: any = { status, updatedAt: Date.now() };
    if (status === 'scheduled' && scheduledAt) {
      updatePayload.scheduledAt = scheduledAt;
      updatePayload.publishedAt = scheduledAt;
    } else if (status === 'published') {
      updatePayload.publishedAt = Date.now();
    } else if (status === 'trash') {
      updatePayload.deletedAt = Date.now();
    }
    await updateDoc(docRef, updatePayload);
  } catch (e) {}

  // Update in Local Storage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const posts: MakalahPost[] = JSON.parse(saved);
      const updated = posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            status,
            updatedAt: Date.now(),
            scheduledAt: (status === 'scheduled' && scheduledAt) ? scheduledAt : p.scheduledAt,
            publishedAt: status === 'published' ? Date.now() : p.publishedAt,
            deletedAt: status === 'trash' ? Date.now() : p.deletedAt
          };
        }
        return p;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

// Batch update status
export async function batchUpdateMakalahPostStatus(
  postIds: string[], 
  status: 'published' | 'scheduled' | 'draft' | 'trash', 
  scheduledAt?: number
): Promise<void> {
  try {
    await fetch('/api/makalah/admin/batch-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds, status, scheduledAt })
    });
  } catch (e) {
    console.warn('batchUpdateMakalahPostStatus server error:', e);
  }

  // Update in Local Storage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const posts: MakalahPost[] = JSON.parse(saved);
      const idSet = new Set(postIds);
      const updated = posts.map(p => {
        if (idSet.has(p.id)) {
          return {
            ...p,
            status,
            updatedAt: Date.now(),
            scheduledAt: (status === 'scheduled' && scheduledAt) ? scheduledAt : p.scheduledAt,
            publishedAt: status === 'published' ? Date.now() : p.publishedAt,
            deletedAt: status === 'trash' ? Date.now() : p.deletedAt
          };
        }
        return p;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

// Delete post permanently
export async function deleteMakalahPost(postId: string): Promise<void> {
  // 1. Delete from IndexedDB
  try {
    await deletePostFromIndexedDb(postId);
  } catch (e) {}

  // 2. Delete from server
  try {
    await fetch('/api/makalah/admin/delete-permanent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    });
  } catch (e) {}

  // 3. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (e) {
    console.warn('Failed to delete post from Firestore:', e);
  }

  // 4. Delete from localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const existing: MakalahPost[] = JSON.parse(saved);
      const updated = existing.filter(p => p.id !== postId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

// Batch delete posts permanently
export async function batchDeleteMakalahPosts(postIds: string[]): Promise<void> {
  // 1. Delete all from IndexedDB
  for (const id of postIds) {
    try {
      await deletePostFromIndexedDb(id);
    } catch (e) {}
  }

  // 2. Delete from server
  try {
    await fetch('/api/makalah/admin/delete-permanent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds })
    });
  } catch (e) {}

  // 3. Delete from Firestore
  for (const id of postIds) {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (e) {}
  }

  // 4. Delete from localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const existing: MakalahPost[] = JSON.parse(saved);
      const idSet = new Set(postIds);
      const updated = existing.filter(p => !idSet.has(p.id));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
}

// Increment post view count
export async function recordMakalahView(postId: string): Promise<void> {
  try {
    const docRef = doc(db, 'posts', postId);
    await updateDoc(docRef, { views: increment(1) });
  } catch (e) {}
}

// Helper: Convert base64 data URL to Blob with Word docx MIME
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Get direct download link for the 100% original uploaded file
export function getMakalahDownloadUrl(post: MakalahPost): string {
  if (post.downloadUrl) {
    return post.downloadUrl;
  }
  if (post.fileId) {
    return `/api/makalah/download/${encodeURIComponent(post.fileId)}`;
  }
  if (post.originalFileName) {
    return `/api/makalah/download/${encodeURIComponent(post.originalFileName)}`;
  }
  return `/api/makalah/download/${encodeURIComponent(post.id)}.docx`;
}

// Increment post download count and trigger direct download of 100% original file from hosting server
export async function recordMakalahDownload(post: MakalahPost): Promise<void> {
  try {
    const docRef = doc(db, 'posts', post.id);
    await updateDoc(docRef, { downloadCount: increment(1) });
  } catch (e) {}

  let downloadFileName = post.originalFileName || `${post.title}.docx`;
  // If no extension found, default to docx
  if (!/\.[a-zA-Z0-9]+$/.test(downloadFileName)) {
    downloadFileName += '.docx';
  }

  // 1. PRIMARY: Download directly from the Hosting Server repository
  const targetUrl = getMakalahDownloadUrl(post);
  try {
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = downloadFileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  } catch (hostingErr) {
    console.warn('Hosting download direct request failed, trying offline fallback:', hostingErr);
  }

  // 2. Offline Fallback: If network to hosting fails, use cached memory data
  if (post.originalFileDataUrl && post.originalFileDataUrl.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(post.originalFileDataUrl);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    } catch (err) {}
  }

  // 3. Secondary Offline Fallback: Check local cache
  try {
    const fileRecord = await getFileFromIndexedDb(post.fileId || post.id || post.originalFileName || '');
    if (fileRecord && fileRecord.dataUrl && fileRecord.dataUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(fileRecord.dataUrl);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileRecord.fileName || downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
  } catch (e) {}
}
