import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Copy, 
  Check, 
  Search, 
  RefreshCw, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Layers, 
  FolderMinus, 
  Archive, 
  ArrowUpRight, 
  SlidersHorizontal,
  X,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldCheck,
  ExternalLink,
  Cloud,
  Upload,
  Database
} from 'lucide-react';
import { MakalahPost, DocumentType } from '../types';
import { 
  fetchAdminMakalahPosts, 
  updateMakalahPostStatus, 
  batchUpdateMakalahPostStatus, 
  deleteMakalahPost, 
  batchDeleteMakalahPosts,
  clearAllMakalahPosts,
  getMakalahDownloadUrl,
  recordMakalahDownload,
  syncClientPostsToServer,
  saveMakalahPost
} from '../utils/makalahService';

interface MakalahAdminPanelProps {
  onBackToBlog: () => void;
  onOpenUploadModal: () => void;
  onSelectPost: (post: MakalahPost) => void;
}

type TabFilter = 'all' | 'published' | 'scheduled' | 'draft' | 'trash';

export const MakalahAdminPanel: React.FC<MakalahAdminPanelProps> = ({
  onBackToBlog,
  onOpenUploadModal,
  onSelectPost
}) => {
  const [posts, setPosts] = useState<MakalahPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());

  // Action status message
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copied link indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scheduling Modal State
  const [scheduleModalPost, setScheduleModalPost] = useState<MakalahPost | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');

  // Clear All Confirmation Modal State
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  // Cloudflare R2 Settings Modal State
  const [showR2Modal, setShowR2Modal] = useState<boolean>(false);
  const [r2Configured, setR2Configured] = useState<boolean>(false);
  const [r2BucketName, setR2BucketName] = useState<string>('');
  const [r2AccountId, setR2AccountId] = useState<string>('');
  const [r2AccessKeyId, setR2AccessKeyId] = useState<string>('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState<string>('');
  const [r2PublicDomain, setR2PublicDomain] = useState<string>('');
  const [isSavingR2, setIsSavingR2] = useState<boolean>(false);

  // Check Cloudflare R2 status from server
  const checkR2Status = async () => {
    try {
      const res = await fetch('/api/r2/status');
      if (res.ok) {
        const data = await res.json();
        setR2Configured(!!data.configured);
        if (data.bucketName) setR2BucketName(data.bucketName);
        if (data.publicDomain) setR2PublicDomain(data.publicDomain);
      }
    } catch (e) {}
  };

  const handleSaveR2Config = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
      alert('Mohon isi Account ID, Access Key ID, Secret Access Key, dan Bucket Name.');
      return;
    }
    setIsSavingR2(true);
    try {
      const res = await fetch('/api/r2/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
          publicDomain: r2PublicDomain
        })
      });
      const data = await res.json();
      if (data.success) {
        setR2Configured(true);
        setShowR2Modal(false);
        showNotice('Konfigurasi Cloudflare R2 berhasil disimpan dan aktif permanen!');
      } else {
        alert(data.error || 'Gagal menyimpan konfigurasi Cloudflare R2');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSavingR2(false);
    }
  };

  // Load all posts (including draft, scheduled, trash)
  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminMakalahPosts();
      setPosts(data);
    } catch (err: any) {
      console.error('Failed to load admin posts:', err);
      setActionNotice({ type: 'error', text: 'Gagal memuat data postingan server.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    checkR2Status();
  }, []);

  // Post counts
  const counts = useMemo(() => {
    const now = Date.now();
    let published = 0;
    let scheduled = 0;
    let draft = 0;
    let trash = 0;
    let totalViews = 0;
    let totalDownloads = 0;

    posts.forEach(p => {
      totalViews += (p.views || 0);
      totalDownloads += (p.downloadCount || 0);

      const status = p.status || 'published';
      if (status === 'trash') {
        trash++;
      } else if (status === 'draft') {
        draft++;
      } else if (status === 'scheduled' || (p.scheduledAt && p.scheduledAt > now)) {
        scheduled++;
      } else {
        published++;
      }
    });

    return {
      all: posts.length,
      published,
      scheduled,
      draft,
      trash,
      totalViews,
      totalDownloads
    };
  }, [posts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    const now = Date.now();
    let list = posts;

    // Filter by tab
    if (activeTab === 'published') {
      list = list.filter(p => (p.status === 'published' || !p.status) && (!p.scheduledAt || p.scheduledAt <= now));
    } else if (activeTab === 'scheduled') {
      list = list.filter(p => p.status === 'scheduled' || (p.scheduledAt && p.scheduledAt > now));
    } else if (activeTab === 'draft') {
      list = list.filter(p => p.status === 'draft');
    } else if (activeTab === 'trash') {
      list = list.filter(p => p.status === 'trash');
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.title || '').toLowerCase().includes(q) ||
        (p.author || '').toLowerCase().includes(q) ||
        (p.theme || '').toLowerCase().includes(q) ||
        (p.originalFileName || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [posts, activeTab, searchQuery]);

  // Notification helper
  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ type, text });
    setTimeout(() => {
      setActionNotice(null);
    }, 4000);
  };

  // Status changers
  const handleUpdateStatus = async (postId: string, newStatus: 'published' | 'scheduled' | 'draft' | 'trash', scheduledAt?: number) => {
    try {
      await updateMakalahPostStatus(postId, newStatus, scheduledAt);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            status: newStatus,
            scheduledAt: scheduledAt || p.scheduledAt,
            publishedAt: newStatus === 'published' ? Date.now() : p.publishedAt
          };
        }
        return p;
      }));
      showNotice(`Postingan berhasil diubah menjadi ${newStatus}.`);
    } catch (err: any) {
      showNotice('Gagal memperbarui status: ' + err.message, 'error');
    }
  };

  // Open schedule modal
  const openScheduleModal = (post: MakalahPost) => {
    setScheduleModalPost(post);
    const targetDate = post.scheduledAt ? new Date(post.scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const hh = String(targetDate.getHours()).padStart(2, '0');
    const min = String(targetDate.getMinutes()).padStart(2, '0');
    setScheduleDate(`${yyyy}-${mm}-${dd}`);
    setScheduleTime(`${hh}:${min}`);
  };

  // Save schedule
  const handleConfirmSchedule = async () => {
    if (!scheduleModalPost) return;
    if (!scheduleDate || !scheduleTime) {
      alert('Pilih tanggal dan jam penjadwalan terlebih dahulu.');
      return;
    }

    const scheduledTimestamp = new Date(`${scheduleDate}T${scheduleTime}`).getTime();
    if (isNaN(scheduledTimestamp)) {
      alert('Format tanggal atau jam tidak valid.');
      return;
    }

    await handleUpdateStatus(scheduleModalPost.id, 'scheduled', scheduledTimestamp);
    setScheduleModalPost(null);
  };

  // Permanent Delete Single
  const handleDeletePermanent = async (postId: string, title: string) => {
    if (!window.confirm(`Hapus permanen postingan "${title}"?\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await deleteMakalahPost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedPostIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      showNotice('Postingan berhasil dihapus permanen.');
    } catch (err: any) {
      showNotice('Gagal menghapus: ' + err.message, 'error');
    }
  };

  // Clear All Blog Posts Completely
  const handleExecuteClearAll = async () => {
    setIsClearingAll(true);
    try {
      const res = await clearAllMakalahPosts();
      setPosts([]);
      setSelectedPostIds(new Set());
      setShowClearConfirmModal(false);
      showNotice(res.message || 'Semua postingan blog telah berhasil dikosongkan!');
    } catch (err: any) {
      showNotice('Gagal mengosongkan blog: ' + err.message, 'error');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Export all posts as a master JSON backup file to prevent any data loss
  const handleExportBackup = () => {
    try {
      if (posts.length === 0) {
        showNotice('Tidak ada postingan untuk dicadangkan.', 'error');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(posts, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `karyazainnet_backup_makalah_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotice(`Berhasil mencadangkan ${posts.length} naskah makalah ke berkas JSON!`);
    } catch (err: any) {
      showNotice('Gagal mengekspor cadangan: ' + err.message, 'error');
    }
  };

  // Import and restore posts from a master JSON backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsedPosts = JSON.parse(content);
        if (!Array.isArray(parsedPosts) || parsedPosts.length === 0) {
          showNotice('Format berkas cadangan JSON tidak valid atau kosong.', 'error');
          return;
        }
        setIsLoading(true);
        await syncClientPostsToServer(parsedPosts);
        for (const p of parsedPosts) {
          try { await saveMakalahPost(p); } catch (err) {}
        }
        await loadPosts();
        showNotice(`Sukses memulihkan ${parsedPosts.length} naskah makalah ke server hosting!`);
      } catch (err: any) {
        showNotice('Gagal mengimpor cadangan: ' + err.message, 'error');
      } finally {
        setIsLoading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Manual trigger to push all local posts to hosting server
  const handleManualSyncServer = async () => {
    setIsLoading(true);
    try {
      await syncClientPostsToServer(posts);
      showNotice(`Berhasil menyinkronkan ${posts.length} naskah ke server hosting!`);
    } catch (err: any) {
      showNotice('Gagal menyinkronkan ke hosting: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Batch action handler
  const handleBatchStatus = async (status: 'published' | 'scheduled' | 'draft' | 'trash') => {
    const ids = Array.from<string>(selectedPostIds);
    if (ids.length === 0) return;

    try {
      await batchUpdateMakalahPostStatus(ids, status);
      setPosts(prev => prev.map(p => {
        if (selectedPostIds.has(p.id)) {
          return {
            ...p,
            status,
            publishedAt: status === 'published' ? Date.now() : p.publishedAt
          };
        }
        return p;
      }));
      setSelectedPostIds(new Set());
      showNotice(`${ids.length} postingan berhasil diubah menjadi ${status}.`);
    } catch (err: any) {
      showNotice('Gagal melakukan aksi massal: ' + err.message, 'error');
    }
  };

  // Batch Delete Permanent
  const handleBatchDeletePermanent = async () => {
    const ids = Array.from<string>(selectedPostIds);
    if (ids.length === 0) return;

    if (!window.confirm(`Hapus permanen ${ids.length} postingan yang dipilih?\nData tidak dapat dipulihkan.`)) {
      return;
    }

    try {
      await batchDeleteMakalahPosts(ids);
      setPosts(prev => prev.filter(p => !selectedPostIds.has(p.id)));
      setSelectedPostIds(new Set());
      showNotice(`${ids.length} postingan berhasil dihapus permanen.`);
    } catch (err: any) {
      showNotice('Gagal menghapus: ' + err.message, 'error');
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedPostIds.size === filteredPosts.length && filteredPosts.length > 0) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(filteredPosts.map(p => p.id)));
    }
  };

  const toggleSelectPost = (postId: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Copy download link
  const handleCopyDownloadLink = (post: MakalahPost) => {
    const downloadUrl = `${window.location.origin}${getMakalahDownloadUrl(post)}`;
    navigator.clipboard.writeText(downloadUrl);
    setCopiedId(post.id);
    showNotice('Link unduhan file asli disalin ke clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Format date helper
  const formatDateDisplay = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Header: Blogger Control Center */}
      <header className="sticky top-0 z-30 bg-[#0c1222]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToBlog}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Kembali ke Tampilan Blog Publik"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lihat Blog</span>
          </button>
          
          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-black shadow-md shadow-orange-500/20">
              <span className="text-base font-serif">B</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Panel Admin Blogspot
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase">
                  Kontrol Penuh
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Kelola postingan naskah, jadwal tayang, berkas asli & tautan unduhan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          {/* Refresh Button */}
          <button
            onClick={loadPosts}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
            title="Muat ulang postingan"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {/* Cloudflare R2 Configuration Button */}
          <button
            onClick={() => setShowR2Modal(true)}
            className={`hidden md:flex px-3 py-2 rounded-xl border text-xs font-semibold transition-all items-center gap-1.5 shadow-sm cursor-pointer ${
              r2Configured
                ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/40 text-amber-300 hover:text-amber-100'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Konfigurasi Cloudflare R2 untuk penyimpanan berkas permanen (tidak pernah hilang)"
          >
            <Cloud className={`w-3.5 h-3.5 ${r2Configured ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Cloudflare R2</span>
            {r2Configured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>

          {/* Sinkron ke Hosting */}
          <button
            onClick={handleManualSyncServer}
            disabled={isLoading}
            className="hidden md:flex px-3 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 hover:text-blue-100 font-semibold text-xs transition-all items-center gap-1.5 shadow-sm cursor-pointer"
            title="Sinkronkan semua data artikel & berkas dari browser ini ke server hosting Cloud Run"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Sinkron ke Hosting</span>
          </button>

          {/* Ekspor Cadangan (Backup JSON) */}
          <button
            onClick={handleExportBackup}
            className="hidden md:flex px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 font-semibold text-xs transition-all items-center gap-1.5 shadow-sm cursor-pointer"
            title="Unduh file cadangan JSON berisi seluruh artikel & naskah untuk disimpan aman di laptop/HP"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cadangkan JSON</span>
          </button>

          {/* Impor Cadangan (Restore JSON) */}
          <label
            className="hidden md:flex px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-purple-100 font-semibold text-xs transition-all items-center gap-1.5 shadow-sm cursor-pointer"
            title="Pulihkan artikel dari file cadangan JSON ke server hosting"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Pulihkan</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          {/* DANGER: KOSONGKAN SEMUA BLOG */}
          <button
            onClick={() => setShowClearConfirmModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-rose-100 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            title="Kosongkan semua postingan blog (0 postingan) untuk mengunggah berkas baru dari awal"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Kosongkan Semua Blog</span>
          </button>

          {/* + UNGGAH & POSTINGAN BARU */}
          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Unggah Naskah Asli</span>
          </button>
        </div>
      </header>

      {/* Floating Action Alert / Notification */}
      {actionNotice && (
        <div className="fixed top-16 right-4 z-50 animate-fadeIn">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold ${
            actionNotice.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}>
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
        </div>
      )}

      {/* Main Layout: Sidebar + Posts Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* Left Sidebar (Blogspot style navigation) */}
        <aside className="w-full md:w-64 shrink-0 space-y-5">
          {/* Quick Metrics */}
          <div className="bg-[#0f172a] rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Status Blog</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </h2>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">Total Postingan</span>
                <span className="text-lg font-black text-white">{counts.all}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">Terjadwal</span>
                <span className="text-lg font-black text-amber-400">{counts.scheduled}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">Total Pembaca</span>
                <span className="text-sm font-bold text-blue-400">{counts.totalViews}x</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block">Total Unduhan</span>
                <span className="text-sm font-bold text-emerald-400">{counts.totalDownloads}x</span>
              </div>
            </div>
          </div>

          {/* Navigation Filter Tabs (Blogspot Menu) */}
          <nav className="bg-[#0f172a] rounded-2xl p-2.5 border border-slate-800 space-y-1 shadow-lg">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Koleksi Postingan
            </div>

            <button
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-orange-400" />
                <span>Semua Postingan</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('published')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Diterbitkan (Live)</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                {counts.published}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('scheduled')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Terjadwal (Antrean)</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                {counts.scheduled}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('draft')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'draft'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Draf Disimpan</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                {counts.draft}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'trash'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Kotak Sampah</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                {counts.trash}
              </span>
            </button>
          </nav>

          {/* Quick Guide Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0c1322] border border-slate-800 text-xs text-slate-400 space-y-2">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Integritas Berkas Asli</span>
            </h3>
            <p className="leading-relaxed text-[11px]">
              Setiap berkas Word (.docx) atau dokumen yang diunggah disimpan <strong>100% utuh tanpa modifikasi</strong> di repositori hosting. Tautan download instan langsung aktif bagi pembaca.
            </p>
          </div>

          {/* Cloud Persistence & Backup Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-[#0c1322] border border-amber-500/30 text-xs text-slate-400 space-y-2.5">
            <h3 className="font-bold text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span>Penyimpanan Cloudflare R2</span>
              </span>
              {r2Configured ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                  Aktif
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold border border-amber-500/30">
                  Belum Diatur
                </span>
              )}
            </h3>
            <p className="leading-relaxed text-[11px] text-slate-300">
              {r2Configured ? (
                <>Cloudflare R2 aktif! Berkas yang Anda unggah otomatis disimpan permanen di bucket <strong>{r2BucketName}</strong> dan tidak akan pernah hilang.</>
              ) : (
                <>Simpan berkas Word (.docx) secara permanen di Cloudflare R2 tanpa khawatir hilang saat server Cloud Run tidur (idle) setelah 30 menit.</>
              )}
            </p>
            <button
              onClick={() => setShowR2Modal(true)}
              className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{r2Configured ? 'Kelola Cloudflare R2' : 'Atur Cloudflare R2 Sekarang'}</span>
            </button>
          </div>
        </aside>

        {/* Right Main Post Management List */}
        <main className="flex-1 space-y-4">
          
          {/* Top Search & Filter Bar */}
          <div className="bg-[#0f172a] rounded-2xl p-3 sm:p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            
            {/* Search Box */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul postingan, penulis, atau berkas..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selection Status & Batch Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedPostIds.size > 0 ? (
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                  <span className="font-bold text-orange-400">{selectedPostIds.size} dipilih</span>
                  <div className="h-4 w-px bg-slate-600"></div>
                  
                  {activeTab !== 'published' && (
                    <button
                      onClick={() => handleBatchStatus('published')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition-all"
                      title="Terbitkan massal"
                    >
                      Terbitkan
                    </button>
                  )}

                  {activeTab !== 'draft' && (
                    <button
                      onClick={() => handleBatchStatus('draft')}
                      className="text-blue-400 hover:text-blue-300 font-bold transition-all"
                      title="Jadikan draf"
                    >
                      Draf
                    </button>
                  )}

                  {activeTab !== 'trash' && (
                    <button
                      onClick={() => handleBatchStatus('trash')}
                      className="text-amber-400 hover:text-amber-300 font-bold transition-all"
                      title="Pindahkan ke sampah"
                    >
                      Sampah
                    </button>
                  )}

                  {activeTab === 'trash' && (
                    <button
                      onClick={() => handleBatchStatus('published')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition-all"
                      title="Pulihkan & terbitkan"
                    >
                      Pulihkan
                    </button>
                  )}

                  <button
                    onClick={handleBatchDeletePermanent}
                    className="text-rose-400 hover:text-rose-300 font-bold transition-all"
                    title="Hapus permanen dari server"
                  >
                    Hapus Permanen
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium">
                  Menampilkan <strong className="text-white">{filteredPosts.length}</strong> postingan
                </div>
              )}
            </div>
          </div>

          {/* Posts List / Table View */}
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            
            {/* Header row with Select All */}
            <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Pilih semua yang tampil"
                >
                  {selectedPostIds.size > 0 && selectedPostIds.size === filteredPosts.length ? (
                    <CheckSquare className="w-4 h-4 text-orange-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <span>Judul Postingan & Dokumen</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="hidden sm:inline">Status & Jadwal</span>
                <span>Aksi Kontrol</span>
              </div>
            </div>

            {/* List items */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-orange-400" />
                <p className="text-xs font-semibold">Memuat database postingan blog...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-sm font-bold text-white">Tidak ada postingan di tab ini</h3>
                  <p className="text-xs text-slate-400">
                    {activeTab === 'all' 
                      ? 'Blog Anda saat ini bersih (0 postingan). Klik "+ Unggah Naskah Asli" untuk mulai mempublikasikan file Word pertama Anda.'
                      : `Tidak ditemukan postingan berstatus "${activeTab}".`}
                  </p>
                </div>
                <button
                  onClick={onOpenUploadModal}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  + Unggah Berkas Word Baru Sekarang
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {filteredPosts.map((post) => {
                  const isSelected = selectedPostIds.has(post.id);
                  const now = Date.now();
                  const isScheduled = post.status === 'scheduled' || (post.scheduledAt && post.scheduledAt > now);
                  const isTrash = post.status === 'trash';
                  const isDraft = post.status === 'draft';
                  const isLive = !isScheduled && !isTrash && !isDraft;

                  return (
                    <div 
                      key={post.id}
                      className={`p-4 transition-all hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected ? 'bg-orange-500/5' : ''
                      }`}
                    >
                      {/* Left: Checkbox + Title + Meta */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleSelectPost(post.id)}
                          className="mt-1 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                              {post.documentTypeLabel || 'Makalah'}
                            </span>
                            {post.theme && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/40 text-[10px] font-medium">
                                {post.theme}
                              </span>
                            )}
                            {post.originalFileName && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                📎 {post.originalFileName}
                              </span>
                            )}
                          </div>

                          <h3 
                            onClick={() => onSelectPost(post)}
                            className="text-sm font-bold text-white hover:text-orange-400 cursor-pointer transition-all line-clamp-2 leading-snug"
                          >
                            {post.title}
                          </h3>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span>Oleh: <strong className="text-slate-300">{post.author || 'Penulis'}</strong></span>
                            <span>•</span>
                            <span>{post.pageEstimate || 1} Hlm</span>
                            <span>•</span>
                            <span className="text-blue-400 font-semibold">{post.views || 0} Pembaca</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">{post.downloadCount || 0} Unduhan</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Pill & Action Buttons */}
                      <div className="flex items-center gap-3 sm:ml-4 shrink-0 justify-between sm:justify-end">
                        
                        {/* Status Badge */}
                        <div className="text-right">
                          {isLive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Diterbitkan
                            </span>
                          )}

                          {isScheduled && (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-amber-400" />
                                Terjadwal
                              </span>
                              <div className="text-[10px] text-amber-300/80 mt-0.5">
                                {formatDateDisplay(post.scheduledAt)}
                              </div>
                            </div>
                          )}

                          {isDraft && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                              Draf
                            </span>
                          )}

                          {isTrash && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                              Sampah
                            </span>
                          )}
                        </div>

                        {/* Action Buttons Group */}
                        <div className="flex items-center gap-1.5">
                          {/* View public */}
                          <button
                            onClick={() => onSelectPost(post)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Pratinjau naskah publik"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct download original binary */}
                          <button
                            onClick={() => recordMakalahDownload(post)}
                            className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all cursor-pointer"
                            title="Unduh berkas asli sekarang"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy download link */}
                          <button
                            onClick={() => handleCopyDownloadLink(post)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Salin link download langsung"
                          >
                            {copiedId === post.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Quick Schedule button */}
                          {!isTrash && (
                            <button
                              onClick={() => openScheduleModal(post)}
                              className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-300 hover:text-white transition-all cursor-pointer"
                              title="Jadwalkan tanggal & jam publikasi"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Publish / Draft */}
                          {!isTrash && isLive && (
                            <button
                              onClick={() => handleUpdateStatus(post.id, 'draft')}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                              title="Jadikan draf"
                            >
                              Jadikan Draf
                            </button>
                          )}

                          {!isTrash && !isLive && (
                            <button
                              onClick={() => handleUpdateStatus(post.id, 'published')}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm"
                              title="Terbitkan sekarang"
                            >
                              Terbitkan
                            </button>
                          )}

                          {/* Move to Trash or Restore */}
                          {!isTrash ? (
                            <button
                              onClick={() => handleUpdateStatus(post.id, 'trash')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Pindahkan ke kotak sampah"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateStatus(post.id, 'published')}
                                className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:text-white transition-all cursor-pointer"
                                title="Pulihkan postingan ini"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePermanent(post.id, post.title)}
                                className="p-1.5 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-300 hover:text-white transition-all cursor-pointer"
                                title="Hapus permanen dari server"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* SCHEDULE MODAL (Blogspot-style Post Schedule) */}
      {scheduleModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1120] border border-amber-500/40 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Jadwalkan Postingan</h3>
              </div>
              <button
                onClick={() => setScheduleModalPost(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 line-clamp-2">
                <strong>Judul:</strong> {scheduleModalPost.title}
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Pilih Tanggal Tayang Otomatis:
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Pilih Jam Tayang:
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                Postingan ini akan berstatus <strong>Terjadwal</strong> dan akan otomatis live ditampilkan kepada pengunjung umum saat waktu tersebut tiba.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setScheduleModalPost(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-md shadow-amber-500/20"
              >
                Simpan Jadwal Tayang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUDFLARE R2 SETTINGS MODAL */}
      {showR2Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-[#0f1422] border border-amber-500/40 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-10 h-10 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Konfigurasi Cloudflare R2 Storage</h3>
                  <p className="text-xs text-amber-300">Penyimpanan Berkas Cloud Permanen (10GB Gratis, 0 Biaya Egress)</p>
                </div>
              </div>
              <button
                onClick={() => setShowR2Modal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-amber-300">✨ Keuntungan Cloudflare R2:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>Berkas Word (.docx) & PDF yang diunggah tersimpan <strong>permanen</strong> di cloud global Cloudflare.</li>
                <li>Tidak akan hilang meskipun server Cloud Run tidur (idle) setelah 30 menit.</li>
                <li>Dapat menampung 500+ berkas sekaligus tanpa batasan kuota Firestore.</li>
              </ul>
            </div>

            <form onSubmit={handleSaveR2Config} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cloudflare Account ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1a2b3c4d5e6f7g8h9i0j..."
                  value={r2AccountId}
                  onChange={(e) => setR2AccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  R2 Bucket Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: zain-makalah-files"
                  value={r2BucketName}
                  onChange={(e) => setR2BucketName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  R2 Access Key ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 9e32f91a789..."
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  R2 Secret Access Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Secret access key dari Cloudflare API Tokens"
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Public Domain R2 (Opsional jika mengaktifkan Public Access di R2)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: https://pub-xxxx.r2.dev atau https://files.domainanda.com"
                  value={r2PublicDomain}
                  onChange={(e) => setR2PublicDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">
                  Jika dikosongkan, berkas tetap dapat diunduh melalui proxy server <code>/api/r2/download/:key</code>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowR2Modal(false)}
                  disabled={isSavingR2}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSavingR2}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingR2 ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan & Aktifkan R2</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f1422] border border-rose-500/50 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Kosongkan Semua Postingan Blog?</h3>
                <p className="text-xs text-rose-300">Tindakan ini akan mengosongkan seluruh isi blog menjadi 0 postingan</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Sesuai permintaan Anda, fitur ini akan menghapus <strong>seluruh postingan yang ada</strong> di database dan repositori server.
              </p>
              <p>
                Setelah dikosongkan, Anda dapat mengunggah berkas-berkas baru Anda secara segar (fresh) dan langsung dipublikasikan dengan tautan unduhan naskah asli 100%.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearingAll}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batalkan
              </button>
              <button
                onClick={handleExecuteClearAll}
                disabled={isClearingAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
              >
                {isClearingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Mengosongkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Kosongkan Semua Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
