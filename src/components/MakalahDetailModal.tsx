import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  BookOpen, 
  Calendar, 
  Clock, 
  Eye, 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  Printer, 
  Tag, 
  ExternalLink,
  Building,
  UserCheck,
  Globe,
  MessageCircle,
  Link as LinkIcon,
  Quote,
  ArrowRight,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { MakalahPost } from '../types';
import { recordMakalahDownload, getMakalahDownloadUrl } from '../utils/makalahService';
import { updatePageSeo, resetDefaultSeo } from '../utils/seoUtils';

interface MakalahDetailModalProps {
  post: MakalahPost | null;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated?: (updated: MakalahPost) => void;
  allPosts?: MakalahPost[];
  onSelectRelatedPost?: (post: MakalahPost) => void;
}

export const MakalahDetailModal: React.FC<MakalahDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onPostUpdated,
  allPosts = [],
  onSelectRelatedPost
}) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloadLinkCopied, setDownloadLinkCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [citationFormat, setCitationFormat] = useState<'APA' | 'MLA' | 'Harvard' | 'Chicago'>('APA');
  const [citationCopied, setCitationCopied] = useState(false);
  const [pingingGoogle, setPingingGoogle] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  // Related posts from repository (always called before conditional returns)
  const relatedPosts = useMemo(() => {
    if (!post || !allPosts || allPosts.length <= 1) return [];
    const directRelated = allPosts.filter(p => 
      p.id !== post.id && 
      (p.theme === post.theme || (p.tags && post.tags && p.tags.some(t => post.tags.includes(t))))
    );
    if (directRelated.length > 0) return directRelated.slice(0, 3);
    return allPosts.filter(p => p.id !== post.id).slice(0, 3);
  }, [allPosts, post]);

  // Clean and enforce solid black (#000000) typography for article reading body
  const sanitizedContentHtml = useMemo(() => {
    if (!post?.contentHtml) return '';
    return post.contentHtml
      .replace(/text-gray-\d+/gi, 'text-black')
      .replace(/text-slate-[2-7]\d\d/gi, 'text-black')
      .replace(/text-indigo-[2-4]\d\d/gi, 'text-black font-bold');
  }, [post?.contentHtml]);

  // Dynamic SEO & Google Search Snippet indexing
  useEffect(() => {
    if (!isOpen || !post) return;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('view', 'blog');
    currentUrl.searchParams.set('makalah', post.slug || post.id);
    const postPermalink = currentUrl.toString();

    // Update browser URL without reloading
    window.history.replaceState(null, '', `?view=blog&makalah=${encodeURIComponent(post.slug || post.id)}`);

    // Update Head tags: Title, Description, OpenGraph, Twitter Cards, Schema.org
    updatePageSeo({
      title: `${post.title} | Blog Makalah Ilmiah ZAIN.NET`,
      description: post.excerpt || `Baca naskah lengkap makalah ilmiah ${post.title} oleh ${post.author}. Tersedia unduhan file Word asli (.docx).`,
      url: postPermalink,
      type: 'article',
      author: post.author || 'Penulis Mahasiswa',
      publishedTime: new Date(post.createdAt).toISOString(),
      modifiedTime: new Date(post.updatedAt || post.createdAt).toISOString(),
      section: post.theme || 'Karya Ilmiah',
      tags: post.tags || ['makalah', 'skripsi', 'penelitian', 'akademik']
    });

    return () => {
      // Revert URL to blog view when closed
      window.history.replaceState(null, '', '?view=blog');
      resetDefaultSeo();
    };
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const getShareUrl = () => {
    if (typeof window === 'undefined') return `/makalah/${encodeURIComponent(post.slug || post.id)}`;
    return `${window.location.origin}/makalah/${encodeURIComponent(post.slug || post.id)}`;
  };

  const handleCopyText = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.contentHtml;
    const cleanText = `${post.title}\nOleh: ${post.author}\n\n${tempDiv.textContent || tempDiv.innerText || ''}`;
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(`*${post.title}*\n\nBaca artikel karya tulis ilmiah & unduh file Word (.docx) lengkap di ZAIN.NET:\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(`Baca makalah ilmiah "${post.title}" di ZAIN.NET Blog Repositori:`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleNativeShare = () => {
    const url = getShareUrl();
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: url
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDownloadLink = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!post) return;
    const directUrl = getMakalahDownloadUrl(post);
    const fullUrl = directUrl.startsWith('http') ? directUrl : `${window.location.origin}${directUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setDownloadLinkCopied(true);
    setTimeout(() => setDownloadLinkCopied(false), 2000);
  };

  const handleDownloadWord = async () => {
    setIsDownloading(true);
    try {
      await recordMakalahDownload(post);
      if (onPostUpdated) {
        onPostUpdated({ ...post, downloadCount: (post.downloadCount || 0) + 1 });
      }
    } finally {
      setTimeout(() => setIsDownloading(false), 1200);
    }
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Citations generator (APA 7, MLA 9, Harvard, Chicago)
  const getCitationText = () => {
    const author = post.author || 'Tim Penulis';
    const year = new Date(post.createdAt).getFullYear();
    const title = post.title;
    const url = getShareUrl();
    const inst = post.institution ? `${post.institution}. ` : '';

    switch (citationFormat) {
      case 'APA':
        return `${author}. (${year}). ${title}. ${inst}Repositori Akademik ZAIN.NET. ${url}`;
      case 'MLA':
        return `${author}. "${title}." Repositori Akademik ZAIN.NET, ${year}, ${url}.`;
      case 'Harvard':
        return `${author}, ${year}. ${title}. ${inst}ZAIN.NET. Tersedia pada: <${url}> [Diakses ${new Date().toLocaleDateString('id-ID')}].`;
      case 'Chicago':
        return `${author}. "${title}." Repositori Akademik ZAIN.NET (${year}). ${url}.`;
      default:
        return `${author}. (${year}). ${title}. ${url}`;
    }
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(getCitationText());
    setCitationCopied(true);
    setTimeout(() => setCitationCopied(false), 2500);
  };

  const handlePingGoogle = async () => {
    setPingingGoogle(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/seo/ping-google', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPingResult('Sitemap terkirim ke Google Search Engine!');
      } else {
        setPingResult('Gagal mengirim ping sitemap');
      }
    } catch (e) {
      setPingResult('Koneksi server gagal');
    } finally {
      setPingingGoogle(false);
      setTimeout(() => setPingResult(null), 5000);
    }
  };

  const isPdf = post.originalFileName?.toLowerCase().endsWith('.pdf') || post.slug?.toLowerCase().endsWith('.pdf');
  const fileExt = post.originalFileName?.split('.').pop()?.toUpperCase() || (isPdf ? 'PDF' : 'DOCX');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:text-black">
      <article className="bg-white border border-slate-200/90 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] text-slate-800 print:max-h-none print:border-none print:bg-white print:text-black">
        
        {/* Top Navbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Makalah</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                linkCopied 
                  ? 'bg-emerald-600 text-white border-emerald-500' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Salin tautan permanen artikel"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Link Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Link</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Salin isi artikel"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-sm"
              title="Cetak / Simpan PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Public Access Badge */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-800 print:hidden">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold">Publikasi Terbuka (Open Access)</span>
            <span className="text-emerald-700/80 hidden sm:inline">— Dapat diakses & dibaca oleh siapa pun secara gratis tanpa login.</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800 border border-emerald-300">
            Akses Bebas
          </span>
        </div>

        {/* Article Body Container (Clean Bright Reading Experience with Solid Black Font) */}
        <div className="p-5 sm:p-8 md:p-10 overflow-y-auto space-y-6 flex-1 text-black bg-white selection:bg-blue-100 selection:text-black">
          
          {/* Article Header & Metadata */}
          <header className="space-y-4 border-b border-slate-200 pb-6 print:border-gray-300">
            
            {/* Theme & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Document Type Badge */}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                {post.documentTypeLabel || 'Makalah Ilmiah'}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Tema: {post.theme}
              </span>

              {post.pageEstimate && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  ~{post.pageEstimate} Hlm
                </span>
              )}

              {post.wordCount && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  {post.wordCount.toLocaleString('id-ID')} Kata
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <time dateTime={new Date(post.createdAt).toISOString()}>{formattedDate}</time>
              </span>

              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {post.readingTimeMinutes} Menit Baca
              </span>

              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                {post.views || 1}x Dilihat
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-black leading-tight tracking-tight print:text-black">
              {post.title}
            </h1>

            {/* Author & Institution */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 print:text-gray-700">
              <span className="flex items-center gap-1 font-bold text-black">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Penulis: {post.author || 'Tim Penulis Mahasiswa'}
              </span>
              {post.institution && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    {post.institution}
                  </span>
                </>
              )}
            </div>

            {/* Social Share Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs text-slate-500 mr-1 font-medium">Bagikan:</span>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-3 h-3 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleShareFacebook}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 cursor-pointer transition-colors"
              >
                <span>Facebook</span>
              </button>
              <button
                type="button"
                onClick={handleShareTwitter}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 border border-sky-200 cursor-pointer transition-colors"
              >
                <span>X / Twitter</span>
              </button>
              <button
                type="button"
                onClick={handleNativeShare}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-colors"
              >
                <Share2 className="w-3 h-3 text-slate-500" />
                <span>Lainnya</span>
              </button>
            </div>

            {/* Keterangan Otomatis Dokumen (AI & Heuristic Auto-Description) */}
            {post.autoDescription && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-black leading-relaxed print:bg-gray-100 print:text-black print:border-gray-300 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5 text-emerald-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Keterangan & Ringkasan Dokumen (Deteksi Otomatis):</span>
                </div>
                <p className="leading-relaxed text-black font-medium">
                  {post.autoDescription}
                </p>
                {post.detectedChapters && post.detectedChapters.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-200 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-900">Struktur Bab:</span>
                    {post.detectedChapters.map((chap, cIdx) => (
                      <span key={cIdx} className="px-2 py-0.5 rounded bg-white text-black text-[11px] font-bold border border-emerald-300 shadow-xs">
                        {chap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Abstract Box */}
            {post.excerpt && !post.autoDescription && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs sm:text-sm text-black leading-relaxed italic print:bg-gray-100 print:text-black print:border-gray-300">
                <strong className="not-italic text-black font-bold block mb-1">Abstrak Dokumen:</strong>
                <span className="text-black font-medium not-italic">"{post.excerpt}"</span>
              </div>
            )}
          </header>

          {/* Extracted Article Content (Hitam Pekat / Solid Pure Black Reading Experience) */}
          <div className="prose max-w-none space-y-4 text-sm sm:text-base leading-relaxed text-black print:text-black font-normal">
            <div 
              className="article-content space-y-4 leading-relaxed text-black font-normal"
              dangerouslySetInnerHTML={{ __html: sanitizedContentHtml }}
            />
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Tag className="w-3 h-3" /> Kata Kunci:
              </span>
              {post.tags.map((tag, idx) => (
                <span 
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* ============================================================ */}
          {/* GOOGLE INDEXING & OPEN PUBLIC ACCESS STATUS BAR              */}
          {/* ============================================================ */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Status Publikasi & Indexing Google:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Akses 100% Bebas Tanpa Login
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                      Sitemap & Schema.org Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Artikel ini dapat ditemukan langsung di mesin pencari Google, dibaca tanpa hambatan, dan diunduh oleh siapa saja.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePingGoogle}
                  disabled={pingingGoogle}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="Kirim notifikasi update sitemap ke bot mesin pencari Google"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${pingingGoogle ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                  <span>{pingingGoogle ? 'Pinging Googlebot...' : 'Percepat Index Google'}</span>
                </button>
              </div>
            </div>
            {pingResult && (
              <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fadeIn">
                {pingResult}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* ACADEMIC CITATION BOX (APA, MLA, Harvard, Chicago)           */}
          {/* ============================================================ */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Kutip Naskah Ilmiah Ini (Format Sitasi)</h4>
              </div>
              
              {/* Citation Format Tabs */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] shadow-xs">
                {(['APA', 'MLA', 'Harvard', 'Chicago'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setCitationFormat(fmt)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      citationFormat === fmt 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed select-all shadow-xs">
              {getCitationText()}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Format {citationFormat} standar penulisan daftar pustaka akademik</span>
              <button
                type="button"
                onClick={handleCopyCitation}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                  citationCopied 
                    ? 'bg-emerald-600 text-white border-emerald-500' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm'
                }`}
              >
                {citationCopied ? (
                  <>
                    <Check className="w-3 h-3 text-white" />
                    <span>Sitasi Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-indigo-100" />
                    <span>Salin Sitasi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RELATED ARTICLES / INTERNAL LINKING (SEO Deep Crawling)       */}
          {/* ============================================================ */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200 print:hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900">Makalah Terkait Lainnya di Repositori</h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Rekomendasi Riset Mahasiswa</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {relatedPosts.map((relPost) => (
                  <div
                    key={relPost.id}
                    onClick={() => onSelectRelatedPost ? onSelectRelatedPost(relPost) : null}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group shadow-xs"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        {relPost.theme || 'Akademik'}
                      </span>
                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 line-clamp-2 mt-2 leading-snug">
                        {relPost.title}
                      </h5>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate max-w-[120px] font-medium">{relPost.author || 'Mahasiswa'}</span>
                      <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Baca <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* BOTTOM FILE DOWNLOAD BOX (Support DOCX & PDF 100% Asli)      */}
          {/* ============================================================ */}
          <div className="mt-10 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border-2 border-blue-200 shadow-md print:hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl ${isPdf ? 'bg-rose-600 shadow-rose-500/20' : 'bg-blue-600 shadow-blue-500/20'} flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-md`}>
                  {fileExt}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {isPdf ? 'Unduh Berkas PDF 100% Asli (.pdf)' : 'Unduh Berkas Word 100% Asli (.docx)'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      100% File Asli Upload
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                      Bukan Buatan AI
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 font-mono break-all font-medium">
                    {post.originalFileName || `${post.slug}.${isPdf ? 'pdf' : 'docx'}`} 
                    {post.originalFileSize ? ` • ${(post.originalFileSize / 1024).toFixed(1)} KB` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Berkas asli yang diunggah penulis tanpa ada yang diubah. Telah diunduh <strong className="text-blue-700 font-bold">{post.downloadCount || 0} kali</strong>.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Direct Download Link & Copy Direct Link */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadWord}
                  disabled={isDownloading}
                  className={`px-5 py-3 rounded-2xl ${isPdf ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'} text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all disabled:opacity-75`}
                >
                  <Download className="w-4 h-4 text-white shrink-0" />
                  <span>{isDownloading ? 'Mengunduh Berkas Asli...' : `Download File Asli (.${fileExt.toLowerCase()})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDownloadLink}
                  className={`px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                    downloadLinkCopied
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                  }`}
                  title="Salin tautan unduh langsung"
                >
                  {downloadLinkCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Link Unduh Disalin!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Link Unduh</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Direct Link Preview Bar */}
            <div className="mt-4 p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px] shadow-xs">
              <div className="flex items-center gap-2 overflow-hidden text-slate-600">
                <span className="font-bold text-blue-700 shrink-0">Link Langsung:</span>
                <span className="truncate font-mono text-slate-800">
                  {typeof window !== 'undefined' ? `${window.location.origin}${getMakalahDownloadUrl(post)}` : getMakalahDownloadUrl(post)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyDownloadLink}
                className="text-blue-600 hover:text-blue-700 font-bold shrink-0 cursor-pointer hover:underline text-[11px]"
              >
                {downloadLinkCopied ? 'Tersalin' : 'Salin'}
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <span>✓ 100% berkas dokumen asli murni (Word / PDF) tanpa manipulasi teks oleh AI.</span>
              <span className="text-emerald-700 font-bold">Publik & Bebas Unduh Langsung Tanpa Akun</span>
            </div>
          </div>

        </div>

      </article>
    </div>
  );
};
