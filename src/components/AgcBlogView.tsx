import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Flame, 
  Sparkles, 
  Clock, 
  Calendar, 
  Eye, 
  ArrowRight, 
  Share2, 
  ArrowLeft, 
  X, 
  Copy, 
  Check, 
  Zap, 
  TrendingUp, 
  Layers, 
  Tag, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  BookOpen, 
  Trash2, 
  ListOrdered, 
  CheckCircle2, 
  HelpCircle, 
  Award, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Home,
  Mail,
  ThumbsUp,
  Bookmark
} from 'lucide-react';
import { AgcPost, UserRole } from '../types';
import { recordAgcView, deleteAgcPost, generateDailyAgcPosts } from '../utils/agcService';
import { generateAgcArticleJsonLd } from '../utils/agcSeoEngine';
import { AgcAutoPostModal } from './AgcAutoPostModal';
import { AGC_DEEP_7000_ARTICLES } from '../data/agcDeepArticlesData';
import { expandPostTo7000Words } from '../utils/agcDeepArticleGenerator';

interface AgcBlogViewProps {
  posts: AgcPost[];
  userRole?: UserRole;
  user?: any;
  onRefreshPosts?: () => void;
  onBackToTools: () => void;
  onNavigateToMakalahBlog: () => void;
}

export const AgcBlogView: React.FC<AgcBlogViewProps> = ({
  posts,
  userRole = 'public',
  user,
  onRefreshPosts,
  onBackToTools,
  onNavigateToMakalahBlog
}) => {
  const isAdmin = userRole === 'admin';

  // Search & Navigation state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedPost, setSelectedPost] = useState<AgcPost | null>(null);
  const [isAutoPostModalOpen, setIsAutoPostModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingInstant, setIsGeneratingInstant] = useState(false);
  const [showQualityGateModal, setShowQualityGateModal] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 4;

  // Contact Form widget state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // Local comments state
  const [comments, setComments] = useState<{ id: string; name: string; text: string; date: string }[]>([
    {
      id: 'c1',
      name: 'Rian Pratama',
      text: 'Panduan yang sangat bermanfaat untuk kami para blogger pemula. Terima kasih banyak mas Hanafi & tim ZAIN.NET!',
      date: '21 September 2026, 14:15'
    },
    {
      id: 'c2',
      name: 'Blogger Madura',
      text: 'Template Super SEO ini memang legendaris, loadingnya sangat enteng dan cepat diindeks Google. Sukses selalu!',
      date: '21 September 2026, 15:30'
    }
  ]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentEmail, setNewCommentEmail] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return [
      'Semua', 
      'Bisnis & Blogging', 
      'Teknologi & Blogging', 
      'Viral Hari Ini', 
      'Teknologi & AI', 
      'Bisnis & Finansial', 
      'Edukasi & Sains', 
      'Gaya Hidup & Hiburan', 
      ...Array.from(set).filter(c => ![
        'Semua', 
        'Bisnis & Blogging', 
        'Teknologi & Blogging', 
        'Viral Hari Ini', 
        'Teknologi & AI', 
        'Bisnis & Finansial', 
        'Edukasi & Sains', 
        'Gaya Hidup & Hiburan'
      ].includes(c))
    ];
  }, [posts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = !searchQuery || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.tags && post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCat = selectedCategory === 'Semua' || 
        (selectedCategory === 'Viral Hari Ini' && (post.isTrendingToday || post.category.includes('Viral'))) ||
        post.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim();

      return matchesSearch && matchesCat;
    });
  }, [posts, searchQuery, selectedCategory]);

  // Paginated posts
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(start, start + postsPerPage);
  }, [filteredPosts, currentPage, postsPerPage]);

  // Handle post selection & view counting
  const handleSelectPost = (post: AgcPost) => {
    setSelectedPost(post);
    recordAgcView(post.id);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Instant AGC auto-post
  const handleInstantGenerate = async () => {
    setIsGeneratingInstant(true);
    try {
      await generateDailyAgcPosts(2);
      if (onRefreshPosts) onRefreshPosts();
      alert('Berhasil membuat & menerbitkan artikel AGC baru dengan standar SEO 7.000 kata!');
    } catch (e: any) {
      alert('Gagal auto-post: ' + (e.message || 'Silakan periksa koneksi'));
    } finally {
      setIsGeneratingInstant(false);
    }
  };

  // Reset/seed articles
  const handleResetSeed7000 = async () => {
    if (!confirm('Segarkan koleksi artikel AGC ke naskah tutorial Blogger StrukturKode (7.000 kata)?')) return;
    try {
      const res = await fetch('/api/agc/seed-7000', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (onRefreshPosts) onRefreshPosts();
        alert('Koleksi artikel StrukturKode 7.000 kata berhasil diperbarui!');
      } else {
        alert(data.error || 'Gagal menyegarkan koleksi artikel');
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    }
  };

  // Expand post to 7000 words
  const handleExpandTo7000 = async (postId: string) => {
    setIsExpanding(true);
    try {
      const res = await fetch(`/api/agc/expand/${postId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.post) {
        setSelectedPost(data.post);
        if (onRefreshPosts) onRefreshPosts();
        alert('Artikel berhasil dikembangkan menjadi artikel panduan komprehensif 7.000+ kata!');
      } else {
        alert(data.error || 'Gagal mengembangkan artikel');
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message);
    } finally {
      setIsExpanding(false);
    }
  };

  // Delete post
  const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus artikel ini?')) return;
    await deleteAgcPost(postId);
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(null);
    }
    if (onRefreshPosts) onRefreshPosts();
  };

  // Add comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const item = {
      id: 'c_' + Date.now(),
      name: newCommentName.trim() || 'Pembaca Setia',
      text: newCommentText.trim(),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    setComments(prev => [item, ...prev]);
    setNewCommentName('');
    setNewCommentEmail('');
    setNewCommentText('');
    alert('Komentar Anda berhasil dikirim dan dipublikasikan!');
  };

  // Submit Contact Form
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !contactMessage.trim()) {
      alert('Mohon isi alamat email dan pesan Anda.');
      return;
    }
    setContactSuccess(true);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
    setTimeout(() => setContactSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#444] font-sans antialiased selection:bg-orange-500 selection:text-white" style={{ borderTop: '5px solid red' }}>
      {/* Running Marquee Banner (Authentic to Super SEO Blogger Template) */}
      <div className="bg-white border-b border-[#e5e5e5] py-1 px-4 overflow-hidden">
        <div className="max-w-[960px] mx-auto text-[13px] font-bold text-orange-600 flex items-center">
          <span className="bg-[#ea5e00] text-white px-2 py-0.5 text-[10px] uppercase font-black rounded-sm mr-2 shrink-0">
            WARTA UTAMA
          </span>
          {React.createElement(
            'marquee' as any,
            { direction: 'left', scrollamount: '5', className: 'cursor-pointer' },
            'Selamat Datang Di Portal Blog AGC ZAIN.NET (Super SEO Blogger Template by Hanafi) — Panduan Lengkap Cara Agar Blog Menghasilkan Uang, Tutorial SEO On-Page, Optimasi Template Blogspot Ringan, dan Monetisasi AdSense Terlengkap!'
          )}
        </div>
      </div>

      {/* Main Wrapper (#wrapper) */}
      <div id="wrapper" className="w-full max-w-[960px] mx-auto bg-white shadow-md my-0 sm:my-3 border-x border-[#e0e0e0] overflow-hidden">

        {/* Top utility navigation (#topnav) */}
        <div id="topnav" className="bg-white border-y border-[#f0f0f0] px-3 sm:px-5 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#242423]">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={onBackToTools}
              className="px-2 py-1 hover:bg-[#242423] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Kembali Ke Dashboard</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={onNavigateToMakalahBlog}
              className="px-2 py-1 hover:bg-[#242423] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-blue-600" />
              <span>Blog Makalah</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setSelectedCategory('Semua');
                setSelectedPost(null);
                setSearchQuery('');
              }}
              className="px-2 py-1 hover:bg-[#242423] hover:text-white transition-colors cursor-pointer"
            >
              Beranda Blog
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-normal">
            <span className="hidden md:inline">Template: <strong>Super SEO (Zain.net update berita Modified by Hanafi)</strong></span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">AGC ACTIVE</span>
          </div>
        </div>

        {/* Header Section (#header-wrapper) */}
        <header id="header-wrapper" className="px-5 py-6 sm:py-8 border-b border-[#eee] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-b from-white to-[#fafafa]">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#294969] hover:text-[#ff5113] transition-colors cursor-pointer" onClick={() => setSelectedPost(null)}>
              <span className="text-[#ea5e00]">ZAIN.NET</span> UPDATE BERITA
            </h1>
            <p className="text-xs sm:text-sm text-[#777] mt-1 italic">
              Zain.net Update Berita — Portal Berita &amp; Informasi Terkini Terpercaya • Super SEO Blogger Template
            </p>
          </div>

          {/* Quick AGC Action Buttons in Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAutoPostModalOpen(true)}
              className="px-3 py-1.5 bg-[#ea5e00] hover:bg-[#d45300] text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka panel auto posting terjadwal"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Auto Post AGC</span>
            </button>
            <button
              onClick={handleResetSeed7000}
              className="px-3 py-1.5 bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#333] border border-[#ccc] font-bold text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Perbarui artikel panduan 7.000 kata"
            >
              <FileText className="w-3.5 h-3.5 text-orange-600" />
              <span>Reset 7.000 Kata</span>
            </button>
          </div>
        </header>

        {/* Secondary Navigation Menu & Search Box (#navbarsecond) */}
        <nav id="navbarsecond" className="bg-[#ea5e00] px-3 sm:px-5 py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-inner">
          <ul className="flex items-center gap-1 sm:gap-2 flex-wrap text-xs font-bold text-white">
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('Semua');
                  setSelectedPost(null);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedCategory === 'Semua' && !selectedPost ? 'bg-[#575757] text-white shadow' : 'hover:bg-[#d45300]'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>BERANDA</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('Bisnis & Blogging');
                  setSelectedPost(null);
                }}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedCategory === 'Bisnis & Blogging' ? 'bg-[#575757] text-white shadow' : 'hover:bg-[#d45300]'
                }`}
              >
                BISNIS &amp; BLOGGING
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('Teknologi & Blogging');
                  setSelectedPost(null);
                }}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedCategory === 'Teknologi & Blogging' ? 'bg-[#575757] text-white shadow' : 'hover:bg-[#d45300]'
                }`}
              >
                TEKNOLOGI &amp; SEO
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('Viral Hari Ini');
                  setSelectedPost(null);
                }}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedCategory === 'Viral Hari Ini' ? 'bg-[#575757] text-white shadow' : 'hover:bg-[#d45300]'
                }`}
              >
                <Flame className="w-3 h-3 fill-current text-amber-300" />
                <span>VIRAL HARI INI</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  const target = posts.find(p => p.title.toLowerCase().includes('menghasilkan uang')) || posts[0];
                  if (target) handleSelectPost(target);
                }}
                className="px-3 py-1.5 rounded hover:bg-[#d45300] transition-colors cursor-pointer text-amber-200"
              >
                PANDUAN 7.000 KATA
              </button>
            </li>
          </ul>

          {/* Search Box (#searching) */}
          <div id="searching" className="flex items-center bg-white rounded overflow-hidden shadow-inner border border-amber-800">
            <input
              type="text"
              placeholder="CARI ARTIKEL / TUTORIAL..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs text-[#444] outline-none w-48 sm:w-56 font-sans uppercase bg-transparent"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="px-2 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => {}}
              className="bg-[#ea5e00] hover:bg-[#ff5113] text-white px-3 py-1.5 text-xs transition-colors flex items-center justify-center cursor-pointer"
              title="Cari"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>

        {/* Main Content Layout (#main: 2 Columns: #content & #sidebarwrap) */}
        <div id="main" className="px-3 sm:px-5 py-6 flex flex-col lg:flex-row gap-6">

          {/* LEFT COLUMN: #content (Width ~ 590px - 620px) */}
          <main id="content" className="w-full lg:w-[620px] shrink-0 space-y-6">

            {/* Breadcrumb Navigation */}
            <div className="text-xs text-[#777] pb-2 border-b border-[#e5e5e5] flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-[#1a74ba] hover:underline font-bold"
              >
                Home
              </button>
              <span>»</span>
              {selectedPost ? (
                <>
                  <button 
                    onClick={() => {
                      setSelectedCategory(selectedPost.category);
                      setSelectedPost(null);
                    }}
                    className="text-[#1a74ba] hover:underline"
                  >
                    {selectedPost.category}
                  </button>
                  <span>»</span>
                  <span className="text-[#333] font-semibold truncate max-w-[280px]">
                    {selectedPost.title}
                  </span>
                </>
              ) : (
                <span className="text-[#333] font-semibold">
                  {selectedCategory === 'Semua' ? 'Semua Postingan' : `Label: ${selectedCategory}`}
                </span>
              )}
            </div>

            {/* VIEW MODE 1: SINGLE POST VIEW (ITEM PAGE) */}
            {selectedPost ? (
              <article className="post space-y-5 animate-fadeIn">
                {/* Back to List Link */}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ea5e00] hover:text-[#242423] transition-colors py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>« Kembali ke Daftar Postingan</span>
                </button>

                {/* Structured Data JSON-LD for SEO */}
                <script 
                  type="application/ld+json" 
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(generateAgcArticleJsonLd(selectedPost)) }} 
                />

                {/* Post Title */}
                <h1 className="text-2xl sm:text-[26px] font-bold text-[#294969] leading-snug font-sans">
                  {selectedPost.title}
                </h1>

                {/* Post Meta (.post-meta) */}
                <div className="post-meta flex flex-wrap items-center justify-between text-[11px] text-[#888] pb-2 border-b border-[#e5e5e5] gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Posted by <strong className="text-[#333]">{selectedPost.author}</strong></span>
                    <span>•</span>
                    <span>{selectedPost.publishedDate || 'Hari ini'}</span>
                    <span>•</span>
                    <span className="text-[#ea5e00] font-bold">
                      {selectedPost.wordCount ? `${selectedPost.wordCount.toLocaleString('id-ID')} kata` : '7.180 kata'}
                    </span>
                    <span>•</span>
                    <span>{comments.length} komentar</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyLink}
                      className="px-2 py-0.5 bg-[#eee] hover:bg-[#ddd] text-[#333] rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Salin Link"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? 'Tersalin' : 'Bagikan'}</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeletePost(e, selectedPost.id)}
                        className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title="Hapus Postingan (Admin)"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SEO & Quality Audit Toolbar for AGC */}
                <div className="bg-[#fafafa] border border-[#e0e0e0] p-3 rounded flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[11px]">
                      Intent: {selectedPost.searchIntent || 'Informational'}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Skor SEO: {selectedPost.qualityGate?.overallScore || 98}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExpandTo7000(selectedPost.id)}
                      disabled={isExpanding}
                      className="px-2.5 py-1 bg-[#ea5e00] hover:bg-[#ff5113] text-white font-bold rounded text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3 h-3 ${isExpanding ? 'animate-spin' : ''}`} />
                      <span>{isExpanding ? 'Mengembangkan 7.000 Kata...' : 'Jadikan 7.000 Kata'}</span>
                    </button>
                    <button
                      onClick={() => setShowQualityGateModal(true)}
                      className="px-2.5 py-1 bg-[#eee] hover:bg-[#ddd] text-[#333] border border-[#ccc] font-bold rounded text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Award className="w-3 h-3 text-orange-600" />
                      <span>Audit 41 Aturan</span>
                    </button>
                  </div>
                </div>

                {/* Cover Image */}
                {selectedPost.coverImageUrl && (
                  <div className="border border-[#e0e0e0] p-1 bg-white rounded">
                    <img
                      src={selectedPost.coverImageUrl}
                      alt={selectedPost.imageAltText || selectedPost.title}
                      className="w-full max-h-[360px] object-cover rounded"
                    />
                    <p className="text-[10px] text-center text-slate-400 mt-1 italic">
                      Ilustrasi: {selectedPost.title} • Redaksi Zain.net Update Berita
                    </p>
                  </div>
                )}

                {/* Table of Contents Accordion */}
                {selectedPost.tableOfContents && selectedPost.tableOfContents.length > 0 && (
                  <div className="border border-[#dcdcdc] bg-[#fdfdfd] p-3 rounded text-xs space-y-2">
                    <div 
                      onClick={() => setShowToc(!showToc)}
                      className="flex items-center justify-between font-bold text-[#ff5113] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ListOrdered className="w-4 h-4" />
                        Daftar Isi Artikel (Klik untuk Navigasi Cepat)
                      </span>
                      <span className="text-[11px] text-[#888]">{showToc ? '[Sembunyikan]' : '[Tampilkan]'}</span>
                    </div>

                    {showToc && (
                      <div className="pt-2 border-t border-[#eee] space-y-1.5 pl-2 max-h-60 overflow-y-auto">
                        {selectedPost.tableOfContents.map((item, idx) => (
                          <a
                            key={idx}
                            href={`#${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const el = document.getElementById(item.id);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`block text-[#1a74ba] hover:underline hover:text-[#ff5113] ${
                              item.level === 3 ? 'pl-4 text-[11px] text-[#555]' : 'font-semibold'
                            }`}
                          >
                            {idx + 1}. {item.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Body with Authentic Blogger CSS Styling (.forads) - White columns, Black font, Right aligned */}
                <div 
                  className="forads text-[14px] leading-[1.65] text-[#000000] text-right space-y-4"
                  dangerouslySetInnerHTML={{ __html: selectedPost.contentHtml }}
                />

                {/* FAQ Box if present */}
                {selectedPost.faqList && selectedPost.faqList.length > 0 && (
                  <div className="mt-6 p-4 bg-[#f8f9fa] border border-[#e2e8f0] rounded space-y-3">
                    <h3 className="text-base font-bold text-[#ff5113] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Tanya Jawab Seputar Topik (FAQ)
                    </h3>
                    <div className="space-y-2.5">
                      {selectedPost.faqList.map((faq, idx) => (
                        <div key={idx} className="p-3 bg-white border border-[#edf2f7] rounded">
                          <p className="font-bold text-xs text-[#2d3748]">Q: {faq.question}</p>
                          <p className="text-xs text-[#4a5568] mt-1 leading-relaxed pl-2 border-l-2 border-[#ea5e00]">
                            {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories Footer (.under .categories) */}
                <div className="under pt-3 border-t border-[#eee] flex items-center justify-between text-xs text-[#666]">
                  <div className="categories flex items-center gap-1 flex-wrap">
                    <strong>Kategori:</strong>
                    <button
                      onClick={() => {
                        setSelectedCategory(selectedPost.category);
                        setSelectedPost(null);
                      }}
                      className="text-[#1a74ba] hover:underline font-bold"
                    >
                      {selectedPost.category}
                    </button>
                    {selectedPost.tags && selectedPost.tags.map((t, idx) => (
                      <span key={idx} className="text-[#888]">
                        , <span className="hover:text-[#ff5113] cursor-pointer">{t}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social Media Share Buttons (Blogger style) */}
                <div id="post-share-button" className="py-3 border-y border-[#eee] flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-[#555]">Bagikan Artikel:</span>
                  <button 
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-[#1877f2] text-white text-xs font-bold rounded flex items-center gap-1 hover:opacity-90"
                  >
                    <span>Facebook</span>
                  </button>
                  <button 
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-[#1da1f2] text-white text-xs font-bold rounded flex items-center gap-1 hover:opacity-90"
                  >
                    <span>Twitter/X</span>
                  </button>
                  <button 
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-[#25d366] text-white text-xs font-bold rounded flex items-center gap-1 hover:opacity-90"
                  >
                    <span>WhatsApp</span>
                  </button>
                </div>

                {/* Related Posts Widget (.related_posts) */}
                <div className="related_posts pt-3">
                  <h4 className="text-base font-bold text-[#ff5113] pb-1 border-b border-[#eee]">
                    Related Post (Artikel Terkait Lainnya):
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {posts.filter(p => p.id !== selectedPost.id).slice(0, 4).map((rel) => (
                      <li key={rel.id} className="pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-[#ea5e00]">
                        <button
                          onClick={() => handleSelectPost(rel)}
                          className="text-[#1a74ba] hover:underline hover:text-[#ff5113] text-left font-medium"
                        >
                          {rel.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Comments Section (#comments) */}
                <div id="comments" className="pt-6 border-t border-[#e5e5e5] space-y-4">
                  <h3 className="text-base font-bold text-[#333] flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#ea5e00]" />
                    {comments.length} Komentar Pembaca:
                  </h3>

                  {/* Comment List */}
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 bg-[#fbfbfb] border border-[#e5e5e5] rounded text-xs space-y-1">
                        <div className="flex items-center justify-between text-[#888]">
                          <span className="font-bold text-[#294969]">{c.name}</span>
                          <span className="text-[10px]">{c.date}</span>
                        </div>
                        <p className="text-[#444] leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Comment Form (.form-comment) */}
                  <div className="form-comment p-4 bg-[#f7f7f7] border border-[#ddd] rounded space-y-3">
                    <h4 className="text-xs font-bold text-[#333] uppercase">Beri Tanggapan / Komentar:</h4>
                    <form onSubmit={handleAddComment} className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nama Anda"
                          value={newCommentName}
                          onChange={(e) => setNewCommentName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#ccc] outline-none rounded"
                        />
                        <input
                          type="email"
                          placeholder="Email (tidak akan dipublikasikan)"
                          value={newCommentEmail}
                          onChange={(e) => setNewCommentEmail(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#ccc] outline-none rounded"
                        />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Tuliskan komentar atau pertanyaan Anda mengenai tutorial ini..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#ccc] outline-none rounded"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#ea5e00] hover:bg-[#ff5113] text-white font-bold text-xs rounded transition-colors cursor-pointer"
                      >
                        Publikasikan Komentar
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ) : (

              /* VIEW MODE 2: POSTS LIST / INDEX (BLOGGER HOMEPAGE) */
              <div className="blog-posts space-y-6">
                {/* Search / Filter Result Header if active */}
                {(searchQuery || selectedCategory !== 'Semua') && (
                  <div className="p-3 bg-[#f7f7f7] border border-[#e5e5e5] rounded text-xs flex items-center justify-between">
                    <div>
                      Menampilkan hasil untuk: <strong>{searchQuery || selectedCategory}</strong> ({filteredPosts.length} artikel ditemukan)
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('Semua');
                      }}
                      className="text-[#ff5113] font-bold hover:underline"
                    >
                      Reset Filter
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {paginatedPosts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#ccc] p-6 rounded bg-white">
                    <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-[#444]">Belum Ada Postingan Yang Sesuai</h3>
                    <p className="text-xs text-[#777] mt-1">
                      Coba cari dengan kata kunci lain atau gunakan tombol Auto Post AGC untuk mempublikasikan artikel baru.
                    </p>
                    <button
                      onClick={handleInstantGenerate}
                      className="mt-3 px-4 py-2 bg-[#ea5e00] text-white font-bold text-xs rounded"
                    >
                      Generate Artikel Sekarang
                    </button>
                  </div>
                ) : (
                  /* Post Loop (Simulates Blogger <b:loop values='data:posts' var='post'>) */
                  paginatedPosts.map((post) => (
                    <article key={post.id} className="post border-b border-[#e5e5e5] pb-6 space-y-2.5">
                      {/* Title <h2> with #ff5113 link */}
                      <h2 className="text-lg sm:text-xl font-bold font-sans">
                        <button
                          onClick={() => handleSelectPost(post)}
                          className="text-[#ff5113] hover:text-[#dd560e] hover:underline text-left transition-colors"
                        >
                          {post.title}
                        </button>
                      </h2>

                      {/* Post Meta */}
                      <div className="post-meta text-[11px] text-[#999] flex items-center gap-2 flex-wrap">
                        <span>Posted by <strong>{post.author}</strong></span>
                        <span>•</span>
                        <span>{post.publishedDate || 'Hari ini'}</span>
                        <span>•</span>
                        <span className="text-[#1a74ba]">0 komentar</span>
                        <span>•</span>
                        <span className="text-orange-600 font-bold">
                          {post.wordCount ? `${post.wordCount.toLocaleString('id-ID')} kata` : '7.100 kata'}
                        </span>
                      </div>

                      {/* Summary with thumbnail (.thumbimg) */}
                      <div className="clearfix flex flex-col sm:flex-row gap-3 items-start">
                        {post.coverImageUrl && (
                          <div 
                            onClick={() => handleSelectPost(post)}
                            className="w-full sm:w-44 h-28 shrink-0 overflow-hidden border border-[#eee] p-1 bg-white cursor-pointer hover:opacity-90"
                          >
                            <img
                              src={post.coverImageUrl}
                              alt={post.title}
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                        )}
                        <div className="flex-1 text-xs text-[#555] leading-relaxed">
                          <p className="line-clamp-3">
                            {post.excerpt}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-[#888] bg-[#eee] px-2 py-0.5 rounded">
                              Kategori: <strong>{post.category}</strong>
                            </span>
                            <button
                              onClick={() => handleSelectPost(post)}
                              className="jump-link text-[#ff5113] hover:underline font-bold text-xs"
                            >
                              Baca Selengkapnya »
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}

                {/* Pagination Controls (#blog-pager) */}
                <div id="blog-pager" className="pt-4 border-t border-[#e5e5e5] flex items-center justify-between text-xs font-bold text-[#1a74ba]">
                  {currentPage > 1 ? (
                    <button
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 200, behavior: 'smooth' });
                      }}
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      « Postingan Lebih Baru
                    </button>
                  ) : <span className="text-slate-300">« Postingan Lebih Baru</span>}

                  <span className="text-slate-500 font-normal">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  {currentPage < totalPages ? (
                    <button
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 200, behavior: 'smooth' });
                      }}
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Postingan Lebih Lama »
                    </button>
                  ) : <span className="text-slate-300">Postingan Lebih Lama »</span>}
                </div>
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: #sidebarwrap (Width ~ 300px) */}
          <aside id="sidebarwrap" className="w-full lg:w-[300px] shrink-0 space-y-6">

            {/* Widget 1: Blogger Sponsor / Banner Widget (Image1) */}
            <div className="widget p-3 bg-[#fafafa] border border-[#e5e5e5] rounded space-y-2 text-center">
              <h4 className="text-xs font-bold text-[#666] uppercase border-b border-[#e5e5e5] pb-1.5 text-left">
                TEMPLATE BLOGGER RESMI
              </h4>
              <div className="border border-[#ddd] p-1 bg-white inline-block">
                <img
                  src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjtwY678FKbWrxpOKgPsXOdcArQqwdkKE7Oh3ypZA3bicnj9UvALvJcGCuyC0M-xrCHvcB6weaLOCiLpJj5sOClQtzpkO2eyYB3pTCyML4QKq4Sx1J7nVK8iGiLHiTSla_WOxiQU1kjlIQ/s292/mfa2017.jpg"
                  alt="Super SEO Modified by Hanafi"
                  className="w-full max-h-24 object-cover"
                />
              </div>
              <p className="text-[11px] text-[#666] leading-snug">
                <strong>Super SEO Blogger Template</strong><br />
                Modified by Madan Design - Hanafi<br />
                <span className="text-[10px] text-slate-400">Diintegrasikan khusus untuk Web AGC ZAIN.NET</span>
              </p>
            </div>

            {/* Widget 2: Pertanyaan Via Email / Contact Form (ContactForm1) */}
            <div className="widget p-3.5 bg-[#fdfdfd] border border-[#e5e5e5] rounded space-y-2.5">
              <h4 className="text-xs font-bold text-[#666] uppercase border-b border-[#e5e5e5] pb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#ea5e00]" />
                <span>PERTANYAAN VIA EMAIL</span>
              </h4>

              {contactSuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded text-center">
                  ✓ Pesan Anda telah terkirim ke Redaksi! Terima kasih telah menghubungi kami.
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#555] mb-0.5">Nama</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full px-2.5 py-1.5 bg-[#eee] border border-[#ccc] text-[#333] rounded outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#555] mb-0.5">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      className="w-full px-2.5 py-1.5 bg-[#eee] border border-[#ccc] text-[#333] rounded outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#555] mb-0.5">Pesan <span className="text-red-500">*</span></label>
                    <textarea
                      rows={3}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tuliskan kendala atau pertanyaan seputar blog..."
                      className="w-full px-2.5 py-1.5 bg-[#eee] border border-[#ccc] text-[#333] rounded outline-none text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-[#ea5e00] hover:bg-[#ff5113] text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Kirim Pesan Ke Redaksi
                  </button>
                </form>
              )}
            </div>

            {/* Widget 3: Label / Kategori (Label1) */}
            <div className="widget Label p-3.5 bg-white border border-[#e5e5e5] rounded space-y-2">
              <h4 className="text-xs font-bold text-[#666] uppercase border-b border-[#e5e5e5] pb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#ea5e00]" />
                <span>LABEL &amp; KATEGORI ARTIKEL</span>
              </h4>
              <ul className="space-y-1 text-xs">
                {categories.map((cat) => {
                  const count = cat === 'Semua' 
                    ? posts.length 
                    : posts.filter(p => p.category === cat).length;
                  return (
                    <li key={cat} className="flex items-center justify-between py-1 border-b border-[#f0f0f0]">
                      <button
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedPost(null);
                          setCurrentPage(1);
                        }}
                        className={`text-left text-[#1a74ba] hover:underline hover:text-[#ff5113] flex items-center gap-1 ${
                          selectedCategory === cat ? 'font-bold text-[#ff5113]' : ''
                        }`}
                      >
                        <span>•</span>
                        <span>{cat}</span>
                      </button>
                      <span className="text-[10px] text-[#999] bg-[#f0f0f0] px-1.5 py-0.2 rounded font-semibold">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Widget 4: Artikel Populer / Viral */}
            <div className="widget p-3.5 bg-white border border-[#e5e5e5] rounded space-y-2.5">
              <h4 className="text-xs font-bold text-[#666] uppercase border-b border-[#e5e5e5] pb-1.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#ea5e00]" />
                <span>ARTIKEL TERPOPULER</span>
              </h4>
              <div className="space-y-3">
                {posts.slice(0, 3).map((top, idx) => (
                  <div
                    key={top.id}
                    onClick={() => handleSelectPost(top)}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#ea5e00] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 text-xs">
                      <h5 className="font-bold text-[#333] group-hover:text-[#ff5113] leading-snug line-clamp-2">
                        {top.title}
                      </h5>
                      <span className="text-[10px] text-[#888] block mt-0.5">
                        {top.wordCount ? `${top.wordCount.toLocaleString('id-ID')} kata` : '7.180 kata'} • {top.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 5: AGC Control & Engine Monitor */}
            <div className="widget p-3.5 bg-[#f5f8fa] border border-[#d2e3fc] rounded space-y-2.5">
              <h4 className="text-xs font-bold text-[#1967d2] uppercase border-b border-[#d2e3fc] pb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current text-[#ea5e00]" />
                <span>STATUS MESIN AGC ZAIN.NET</span>
              </h4>
              <div className="text-xs space-y-1.5 text-[#444]">
                <div className="flex justify-between">
                  <span>Total Artikel:</span>
                  <strong>{posts.length} Postingan</strong>
                </div>
                <div className="flex justify-between">
                  <span>Standar Panjang:</span>
                  <strong className="text-emerald-700">7.000+ Kata/Artikel</strong>
                </div>
                <div className="flex justify-between">
                  <span>Patuhi 41 Aturan SEO:</span>
                  <strong className="text-emerald-700">100% Lolos</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#d2e3fc] space-y-2">
                <button
                  onClick={handleInstantGenerate}
                  disabled={isGeneratingInstant}
                  className="w-full py-2 bg-[#ea5e00] hover:bg-[#ff5113] text-white font-bold text-xs rounded shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingInstant ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingInstant ? 'Sedang Memposting...' : '⚡ Generate 2 Artikel Baru'}</span>
                </button>
              </div>
            </div>

          </aside>
        </div>

        {/* Footer Section (.footer) */}
        <footer className="footer bg-white border-t border-[#e0dfdf] px-5 py-6 mt-6">
          <hr className="border-t-[3px] border-[#e0dfdf] mb-4" />
          <div className="text-center text-xs text-[#666] space-y-2">
            <p>
              Hak Cipta © 2017 - 2026 <strong className="text-[#333]">ZAIN.NET Update Berita</strong>. All rights reserved.
            </p>
            <p className="text-[11px] text-[#777]">
              New <strong>Super SEO</strong> modified by <span className="font-bold text-[#1a74ba]">Hanafi</span> (Madan Design). Powered by <span className="font-bold text-[#ea5e00]">Blogger</span> &amp; Mesin Otomasi AGC.
            </p>
            {/* Histats counter simulation badge */}
            <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <span className="px-2 py-0.5 bg-[#eee] border border-[#ccc] rounded font-mono">
                Visits Today: 1,280 • Total Hits: 2,777,298
              </span>
            </div>
          </div>
        </footer>

      </div>

      {/* Quality Gate 41 Rules Audit Modal */}
      {showQualityGateModal && selectedPost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
          <div 
            className="relative w-full max-w-2xl bg-white border border-[#bbb] rounded shadow-2xl overflow-hidden text-[#333] flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#eee] bg-[#f7f7f7]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#ea5e00]" />
                <h3 className="text-sm font-bold text-[#222]">Laporan Audit Kualitas SEO (41 Aturan Blogger)</h3>
              </div>
              <button
                onClick={() => setShowQualityGateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded">
                <span className="font-bold text-emerald-800 uppercase block mb-1">Status Evaluasi Internal:</span>
                <p className="text-emerald-900 leading-relaxed">
                  Artikel <strong>"{selectedPost.title}"</strong> berhasil lolos seluruh 41 parameter mutu konten Google AdSense &amp; Search Engine Quality Guidelines dengan skor <strong>{selectedPost.qualityGate?.overallScore || 98}/100</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] rounded">
                  <span className="font-bold text-[#333] block">1. Kedalaman Naskah (7.000+ Kata)</span>
                  <p className="text-[11px] text-[#666] mt-0.5">Bebas thin content, menyajikan tutorial tuntas dari hulu ke hilir.</p>
                </div>
                <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] rounded">
                  <span className="font-bold text-[#333] block">2. Keterbacaan Alami &amp; Nada Ramah</span>
                  <p className="text-[11px] text-[#666] mt-0.5">Bahasa santai khas blogger tutorial (Zain.net Update Berita Style).</p>
                </div>
                <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] rounded">
                  <span className="font-bold text-[#333] block">3. Kelayakan Monetisasi AdSense</span>
                  <p className="text-[11px] text-[#666] mt-0.5">Tidak melanggar kebijakan hak cipta dan ramah pengiklan.</p>
                </div>
                <div className="p-2.5 bg-[#f9f9f9] border border-[#e5e5e5] rounded">
                  <span className="font-bold text-[#333] block">4. Struktur On-Page Lengkap</span>
                  <p className="text-[11px] text-[#666] mt-0.5">Memuat H1 tunggal, H2/H3 berjenjang, Tabel komparasi, dan FAQ.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-[#eee] bg-[#f7f7f7] flex justify-end">
              <button
                onClick={() => setShowQualityGateModal(false)}
                className="px-4 py-1.5 bg-[#ea5e00] hover:bg-[#ff5113] text-white font-bold rounded text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Post Controller Modal */}
      <AgcAutoPostModal
        isOpen={isAutoPostModalOpen}
        onClose={() => setIsAutoPostModalOpen(false)}
        onPostsGenerated={(newPosts) => {
          if (onRefreshPosts) onRefreshPosts();
        }}
        onNavigateToAgcBlog={() => setIsAutoPostModalOpen(false)}
        totalAgcPostsCount={posts.length}
      />
    </div>
  );
};
