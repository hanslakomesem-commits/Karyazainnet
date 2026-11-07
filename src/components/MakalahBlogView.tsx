import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  UploadCloud, 
  Sparkles, 
  Download, 
  Eye, 
  Clock, 
  Calendar, 
  FileText, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Layers,
  CheckCircle2,
  Share2,
  TrendingUp,
  Globe,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Bookmark,
  User,
  Building,
  GraduationCap,
  Tag,
  MessageSquare,
  Send,
  Moon,
  Sun,
  Menu,
  X,
  Copy,
  Check,
  ArrowLeft,
  Flame,
  ShieldCheck,
  ListOrdered,
  FileCheck,
  SlidersHorizontal
} from 'lucide-react';
import { MakalahPost, UserRole, DocumentType } from '../types';
import { recordMakalahView, recordMakalahDownload, getMakalahDownloadUrl } from '../utils/makalahService';
import { updatePageSeo, resetDefaultSeo } from '../utils/seoUtils';
import { MakalahAdminPanel } from './MakalahAdminPanel';

interface MakalahBlogViewProps {
  posts: MakalahPost[];
  userRole?: UserRole;
  user?: any;
  selectedPost?: MakalahPost | null;
  initialShowAdminPanel?: boolean;
  onOpenBatchUpload: () => void;
  onSelectPost: (post: MakalahPost) => void;
  onClearSelectedPost?: () => void;
  onDeletePost?: (postId: string) => void;
  onBackToTools: () => void;
  onOpenLoginModal?: () => void;
}

export const MakalahBlogView: React.FC<MakalahBlogViewProps> = ({
  posts,
  userRole = 'public',
  user,
  selectedPost,
  initialShowAdminPanel = false,
  onOpenBatchUpload,
  onSelectPost,
  onClearSelectedPost,
  onDeletePost,
  onBackToTools,
  onOpenLoginModal
}) => {
  const isAdmin = userRole === 'admin';

  // Admin Dashboard Mode (Blogspot style)
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(() => {
    if (initialShowAdminPanel) return true;
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search);
      return s.get('admin') === 'true' || s.get('view') === 'admin';
    }
    return false;
  });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zain_blog_dark_mode') === 'true';
    }
    return false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('zain_blog_dark_mode', String(next));
      return next;
    });
  };

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedType, setSelectedType] = useState<string>('Semua');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Pagination / Load More
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Ticker Carousel Index
  const [tickerIndex, setTickerIndex] = useState(0);

  // Copy Feedback Toast
  const [copiedLink, setCopiedLink] = useState(false);

  // Table of Contents Toggle for Single Post
  const [tocOpen, setTocOpen] = useState(true);

  // Single Post Comments State
  const [comments, setComments] = useState<Array<{ id: string; name: string; date: string; content: string; avatarBg: string }>>([
    {
      id: 'c1',
      name: 'Rian Pratama',
      date: 'Kemarin, 14:20',
      content: 'Naskah ini sangat lengkap dan runut pembahasannya. Dokumen .docx aslinya langsung bisa saya pelajari formatnya. Terima kasih Karya ZAIN.NET!',
      avatarBg: 'bg-emerald-600'
    },
    {
      id: 'c2',
      name: 'Dr. Nurul Hidayah',
      date: '2 hari lalu',
      content: 'Tinjauan pustaka dan metodologinya tersusun dengan standar akademik yang baik. Sangat berguna untuk referensi penulisan skripsi.',
      avatarBg: 'bg-blue-600'
    }
  ]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Update SEO when selected post changes
  useEffect(() => {
    if (selectedPost) {
      updatePageSeo({
        title: `${selectedPost.title} - Repositori Karya Ilmiah ZAIN.NET`,
        description: selectedPost.excerpt || selectedPost.autoDescription || selectedPost.title,
        url: window.location.href,
        type: 'article',
        author: selectedPost.author,
        publishedTime: new Date(selectedPost.createdAt || selectedPost.publishedAt || Date.now()).toISOString(),
        section: selectedPost.theme || selectedPost.category,
        tags: selectedPost.tags
      });
      recordMakalahView(selectedPost.id).catch(console.warn);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      resetDefaultSeo();
    }
  }, [selectedPost]);

  // Auto-advance Ticker every 4 seconds
  useEffect(() => {
    if (posts.length <= 1) return;
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % posts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [posts.length]);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        post.title.toLowerCase().includes(q) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(q)) ||
        (post.category && post.category.toLowerCase().includes(q)) ||
        (post.author && post.author.toLowerCase().includes(q)) ||
        (post.tags && post.tags.some(t => t.toLowerCase().includes(q)));

      const matchCategory = selectedCategory === 'Semua' || 
        post.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        post.tags?.some(t => t.toLowerCase() === selectedCategory.toLowerCase());

      const matchType = selectedType === 'Semua' || post.documentType === selectedType;

      return matchQuery && matchCategory && matchType;
    });
  }, [posts, searchQuery, selectedCategory, selectedType]);

  // Extract all categories & tags for cloud tags
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
      if (p.tags) {
        p.tags.forEach(t => {
          if (t && t.length > 2) {
            counts[t] = (counts[t] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [posts]);

  // Featured Posts for Top Hero (3-Column Hero Grid)
  const featuredPosts = useMemo(() => {
    return posts.slice(0, 3);
  }, [posts]);

  // Recommendation Section: 1 big card + 3 small cards
  const recommendationLarge = useMemo(() => {
    return posts.length > 3 ? posts[3] : posts[0];
  }, [posts]);

  const recommendationSmall = useMemo(() => {
    return posts.slice(4, 7);
  }, [posts]);

  // Weekly Trending (3 cards)
  const weeklyTrending = useMemo(() => {
    return [...posts].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 3);
  }, [posts]);

  // Most Popular for Sidebar (Top 5)
  const popularSidebar = useMemo(() => {
    return [...posts].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5);
  }, [posts]);

  // Handle Share Post
  const handleShare = (post: MakalahPost) => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/makalah/${encodeURIComponent(post.slug || post.id)}`
      : `/makalah/${encodeURIComponent(post.slug || post.id)}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Handle Download File
  const handleDownload = (e: React.MouseEvent, post: MakalahPost) => {
    e.stopPropagation();
    recordMakalahDownload(post).catch(console.warn);
    const downloadUrl = getMakalahDownloadUrl(post);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = post.originalFileName || `${post.title}.docx`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Comment to Post
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentName.trim() || !newCommentText.trim()) return;
    const colors = ['bg-rose-600', 'bg-indigo-600', 'bg-amber-600', 'bg-teal-600', 'bg-purple-600'];
    const randomBg = colors[Math.floor(Math.random() * colors.length)];
    setComments(prev => [
      ...prev,
      {
        id: 'c_' + Date.now(),
        name: newCommentName.trim(),
        date: 'Baru saja',
        content: newCommentText.trim(),
        avatarBg: randomBg
      }
    ]);
    setNewCommentName('');
    setNewCommentText('');
  };

  // Plat-M Hashtag tags with counts matching Image 2
  const platMHashtags = useMemo(() => [
    { name: 'Alam', count: 3 },
    { name: 'Bali', count: 1 },
    { name: 'Bangkalan', count: 141 },
    { name: 'Bisnis', count: 3 },
    { name: 'Blogger', count: 32 },
    { name: 'Blogger Madura', count: 21 },
    { name: 'Budaya', count: 18 },
    { name: 'Kuliner', count: 15 },
    { name: 'Madura', count: 236 },
    { name: 'Opini', count: 2 },
    { name: 'Pamekasan', count: 73 },
    { name: 'Pariwisata', count: 29 },
    { name: 'Sampang', count: 45 },
    { name: 'Sejarah', count: 12 },
    { name: 'Sumenep', count: 50 },
    { name: 'Tradisi', count: 9 },
    { name: 'Wisata', count: 34 }
  ], []);

  // Plat-M Recent Comments matching Image 2
  const recentCommentsList = useMemo(() => [
    {
      id: 'rc-1',
      name: 's00178',
      snippet: 'Gopek Blog benar-benar menghadirkan esensi angkrin...'
    },
    {
      id: 'rc-2',
      name: 'Faridah Yasmin',
      snippet: 'Napa gik aktif akadiyeh dimin plat m. Salam dari c...'
    },
    {
      id: 'rc-3',
      name: 'Anonymous',
      snippet: 'High variance slots pay out fewer instances, howev...'
    },
    {
      id: 'rc-4',
      name: 'Sekarkelana',
      snippet: 'referensi yang menarik! Perlu ditambah tempat kuli...'
    }
  ], []);

  // Related Posts for Single Post View
  const relatedPosts = useMemo(() => {
    if (!selectedPost) return [];
    const related = posts.filter(p => p.id !== selectedPost.id && (p.category === selectedPost.category || p.documentType === selectedPost.documentType));
    if (related.length >= 3) return related.slice(0, 3);
    return posts.filter(p => p.id !== selectedPost.id).slice(0, 3);
  }, [posts, selectedPost]);

  // Format Post Content HTML fallback
  const formatPostContentHtml = (post: MakalahPost): string => {
    if (post.contentHtml && post.contentHtml.trim().length > 80) {
      return post.contentHtml;
    }
    if (post.rawText && post.rawText.trim().length > 80) {
      const paragraphs = post.rawText.split(/\n\s*\n/).filter(Boolean);
      return paragraphs.map(p => {
        const trimmed = p.trim();
        if (/^(bab\s+[ivx\d]+|pendahuluan|pembahasan|kesimpulan|daftar\s+pustaka)/i.test(trimmed) || (trimmed.length < 80 && /^[A-Z0-9\s.,:-]+$/.test(trimmed))) {
          return `<h2 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3 pb-1 border-b border-slate-200 dark:border-zinc-700">${trimmed}</h2>`;
        }
        return `<p class="text-slate-800 dark:text-zinc-100 leading-relaxed mb-4 text-justify text-[16px] sm:text-[17px]">${trimmed.replace(/\n/g, '<br/>')}</p>`;
      }).join('');
    }
    const text = post.autoDescription || post.excerpt || 'Isi artikel lengkap tersedia dalam file dokumen asli Word (.docx).';
    return `<p class="text-slate-800 dark:text-zinc-100 leading-relaxed mb-4 text-justify text-[16px] sm:text-[17px]">${text}</p>`;
  };

  // Theme styling constants matching user's template
  const crimson = '#ce0a46';
  const crimsonHover = '#ae16c8';
  const bodyBg = isDarkMode ? 'bg-[#18181c] text-[#d4d4d8]' : 'bg-[#f2f0f3] text-[#1c1c20]';
  const cardBg = isDarkMode ? 'bg-[#222227] border-[#2e2e36] text-[#e4e4e7]' : 'bg-white border-[#e5e5ea] text-[#1c1c20]';
  const headerBg = isDarkMode ? 'bg-[#1e1e24] border-[#2e2e36]' : 'bg-white border-[#e5e5ea]';
  const subtextColor = isDarkMode ? 'text-zinc-400' : 'text-[#6b6b76]';
  const headingColor = isDarkMode ? 'text-white' : 'text-[#111113]';

  // If Admin Panel view is activated, render the dedicated Blogspot-style admin panel
  if (isAdmin && showAdminPanel) {
    return (
      <MakalahAdminPanel
        onBackToBlog={() => setShowAdminPanel(false)}
        onOpenUploadModal={onOpenBatchUpload}
        onSelectPost={(post) => {
          setShowAdminPanel(false);
          onSelectPost(post);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${bodyBg} font-sans transition-colors duration-200 antialiased`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & NAVBAR (LiteSpot Pro / Plat-M Header Layout)               */}
      {/* ========================================================================= */}
      <header className={`sticky top-0 z-40 border-b shadow-xs transition-colors duration-200 ${headerBg}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18">
            
            {/* Left: Mobile Toggle & Brand Logo */}
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                aria-label="Buka Menu"
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <button 
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedCategory('Semua');
                  setSelectedType('Semua');
                  setSearchQuery('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
              >
                <div 
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md transition-transform group-hover:scale-105"
                  style={{ backgroundColor: crimson }}
                >
                  Z
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                      KARYA ZAIN<span style={{ color: crimson }}>.NET</span>
                    </span>
                  </div>
                  <p className="text-[10.5px] sm:text-xs font-semibold tracking-wide text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Repositori Naskah & Karya Ilmiah Mahasiswa
                  </p>
                </div>
              </button>
            </div>

            {/* Center: Desktop Navigation Bar */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedCategory('Semua');
                  setSelectedType('Semua');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedCategory === 'Semua' && selectedType === 'Semua' && !selectedPost
                    ? 'text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                style={selectedCategory === 'Semua' && selectedType === 'Semua' && !selectedPost ? { backgroundColor: crimson } : {}}
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('skripsi');
                  setSelectedCategory('Semua');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedType === 'skripsi'
                    ? 'text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                style={selectedType === 'skripsi' ? { backgroundColor: crimson } : {}}
              >
                Skripsi & Tesis
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('makalah');
                  setSelectedCategory('Semua');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedType === 'makalah'
                    ? 'text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                style={selectedType === 'makalah' ? { backgroundColor: crimson } : {}}
              >
                Makalah Kuliah
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('jurnal');
                  setSelectedCategory('Semua');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedType === 'jurnal'
                    ? 'text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                style={selectedType === 'jurnal' ? { backgroundColor: crimson } : {}}
              >
                Jurnal Ilmiah
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('proposal');
                  setSelectedCategory('Semua');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedType === 'proposal'
                    ? 'text-white'
                    : 'text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                style={selectedType === 'proposal' ? { backgroundColor: crimson } : {}}
              >
                Proposal Riset
              </button>

              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(prev => !prev)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Kategori</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {categoryDropdownOpen && (
                  <div className={`absolute left-0 mt-2 w-52 rounded-xl shadow-xl border p-2 z-50 animate-in fade-in zoom-in-95 ${cardBg}`}>
                    {['Semua', 'Akuntansi', 'Manajemen', 'Hukum', 'Pendidikan', 'Teknologi', 'Agama & Syariah', 'Kesehatan', 'Psikologi'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          if (onClearSelectedPost) onClearSelectedPost();
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                          selectedCategory === cat
                            ? 'text-white font-bold'
                            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                        }`}
                        style={selectedCategory === cat ? { backgroundColor: crimson } : {}}
                      >
                        <span>{cat}</span>
                        {categoryCounts[cat] && (
                          <span className="text-[10px] opacity-75">({categoryCounts[cat]})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Tools Switcher */}
              <button
                type="button"
                onClick={onBackToTools}
                className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tools AI Akademik</span>
              </button>
            </nav>

            {/* Right: Controls (Dark Mode, Search, Upload/Admin) */}
            <div className="flex items-center gap-2">
              
              {/* Dark mode button */}
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="Toggle Dark Mode"
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(prev => !prev)}
                aria-label="Cari Naskah"
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Admin Panel & Batch Upload */}
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAdminPanel(true)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Buka Panel Admin Blogspot (Kelola Postingan, Jadwal & Sampah)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Panel Blogspot</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenBatchUpload}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: crimson }}
                    title="Unggah Naskah Asli Baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Upload Word</span>
                  </button>
                </div>
              )}

              {/* Account Status / Login */}
              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-700">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-300 dark:ring-zinc-700">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              )}

            </div>

          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {isSearchOpen && (
          <div className="border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/90 py-3 px-4 animate-in slide-in-from-top-2">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul naskah, topik skripsi, nama penulis, kata kunci..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
                >
                  Hapus
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-zinc-800 p-4 space-y-2 bg-white dark:bg-zinc-900 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedCategory('Semua');
                  setSelectedType('Semua');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-xs font-bold text-left bg-slate-100 dark:bg-zinc-800"
              >
                Beranda Blog
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('skripsi');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-xs font-bold text-left bg-slate-100 dark:bg-zinc-800"
              >
                Skripsi & Tesis
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('makalah');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-xs font-bold text-left bg-slate-100 dark:bg-zinc-800"
              >
                Makalah Kuliah
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  setSelectedType('jurnal');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-xs font-bold text-left bg-slate-100 dark:bg-zinc-800"
              >
                Jurnal Ilmiah
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
              {isAdmin && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPanel(true);
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Panel Blogspot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBatchUpload();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: crimson }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Word</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onBackToTools();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Beralih ke Tools AI Akademik</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ========================================================================= */}
        {/* 2. TRENDING NEWS TICKER BAR (Plat-M Ticker Wrapper)                       */}
        {/* ========================================================================= */}
        {posts.length > 0 && (
          <div className={`rounded-xl border p-2.5 sm:p-3 shadow-xs flex items-center gap-3 transition-colors ${cardBg}`}>
            <div 
              className="px-2.5 py-1 rounded-md text-white text-[11px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5"
              style={{ backgroundColor: crimson }}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Trending:</span>
            </div>

            {/* Ticker Item */}
            <div className="flex-1 overflow-hidden min-w-0">
              <button
                type="button"
                onClick={() => onSelectPost(posts[tickerIndex])}
                className="text-xs sm:text-sm font-semibold truncate block w-full text-left hover:underline cursor-pointer transition-colors"
                style={{ color: isDarkMode ? '#f4f4f5' : '#18181b' }}
              >
                <span className="font-bold text-slate-400 mr-1.5">•</span>
                {posts[tickerIndex]?.title || 'Memuat naskah akademik terpopuler...'}
              </button>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setTickerIndex(prev => (prev - 1 + posts.length) % posts.length)}
                aria-label="Previous"
                className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTickerIndex(prev => (prev + 1) % posts.length)}
                aria-label="Next"
                className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Copy Link Feedback Alert */}
        {copiedLink && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>Tautan naskah berhasil disalin ke clipboard! Siap dibagikan.</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW CONDITION: SINGLE POST ARTICLE VIEW (ITEM-POST)                     */}
        {/* ========================================================================= */}
        {selectedPost ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Navigation Bar: Back & Action */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  if (onClearSelectedPost) onClearSelectedPost();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Beranda Postingan</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(selectedPost)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownload(e, selectedPost)}
                  className="px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  style={{ backgroundColor: crimson }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .DOCX</span>
                </button>
              </div>
            </div>

            {/* Two-Column Grid: Article (68%) + Sidebar (32%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              
              {/* Main Article Container */}
              <article className={`lg:col-span-8 rounded-2xl border p-5 sm:p-8 shadow-xs ${cardBg}`}>
                
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-3 flex-wrap">
                  <span 
                    onClick={() => onClearSelectedPost && onClearSelectedPost()}
                    className="hover:underline cursor-pointer"
                  >
                    Home
                  </span>
                  <span>/</span>
                  <span 
                    onClick={() => {
                      if (selectedPost.category) setSelectedCategory(selectedPost.category);
                      if (onClearSelectedPost) onClearSelectedPost();
                    }}
                    className="hover:underline cursor-pointer"
                    style={{ color: crimson }}
                  >
                    {selectedPost.category || 'Akademik'}
                  </span>
                  <span>/</span>
                  <span className="truncate max-w-[200px]">{selectedPost.title}</span>
                </div>

                {/* Article Title (h1.entry-title) */}
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-4 ${headingColor}`}>
                  {selectedPost.title}
                </h1>

                {/* Byline / Author Meta */}
                <div className="flex items-center gap-3.5 pb-5 border-b border-slate-200 dark:border-zinc-800 mb-6 flex-wrap">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: crimson }}
                  >
                    {selectedPost.author ? selectedPost.author.charAt(0).toUpperCase() : 'Z'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Penulis : {selectedPost.author || 'Tim Akademik Karya ZAIN.NET'}
                      </span>
                      {selectedPost.institution && (
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                          • {selectedPost.institution}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {selectedPost.publishedDate || new Date(selectedPost.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedPost.readingTimeMinutes || 5} menit baca
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {selectedPost.viewsCount || 1} dilihat
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {selectedPost.downloadCount || 0} unduhan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Featured Cover / Image (if available or generated thematic banner) */}
                {selectedPost.coverImageUrl && (
                  <div className="rounded-xl overflow-hidden mb-6 border border-slate-200 dark:border-zinc-800 shadow-sm max-h-[360px]">
                    <img 
                      src={selectedPost.coverImageUrl} 
                      alt={selectedPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Direct Word (.docx) Download Callout Box */}
                <div 
                  className="rounded-xl p-4 sm:p-5 text-white mb-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4"
                  style={{ backgroundColor: crimson }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <FileCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base leading-tight">
                        Unduh Naskah Asli Microsoft Word (.docx)
                      </h4>
                      <p className="text-xs text-white/90 mt-0.5">
                        Format dokumen rapi, terstruktur Bab ke Bab, siap diedit tanpa perlu registrasi.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedPost)}
                    className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs sm:text-sm hover:bg-slate-100 transition-transform active:scale-95 shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" style={{ color: crimson }} />
                    <span>Download File Word</span>
                  </button>
                </div>

                {/* Abstract Callout Box */}
                {selectedPost.excerpt && (
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" style={{ color: crimson }} />
                      <span>Ringkasan / Abstrak Naskah</span>
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-zinc-200 italic">
                      "{selectedPost.excerpt}"
                    </p>
                  </div>
                )}

                {/* Table of Contents (TOC) Accordion */}
                <div className="border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden mb-6">
                  <button
                    type="button"
                    onClick={() => setTocOpen(prev => !prev)}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-zinc-800 text-left font-bold text-xs sm:text-sm flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4" style={{ color: crimson }} />
                      <span>Daftar Isi & Struktur Bab Naskah</span>
                    </div>
                    {tocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {tocOpen && (
                    <div className="p-4 bg-white dark:bg-zinc-900 text-xs space-y-1.5">
                      <div className="text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer">• BAB I PENDAHULUAN (Latar Belakang, Rumusan Masalah, Tujuan)</div>
                      <div className="text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer">• BAB II KAJIAN PUSTAKA & TEORI PENDUKUNG</div>
                      <div className="text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer">• BAB III METODOLOGI PENELITIAN / PEMBAHASAN UTAMA</div>
                      <div className="text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer">• BAB IV ANALISIS HASIL & IMPLIKASI KINERJA</div>
                      <div className="text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer">• BAB V KESIMPULAN DAN REKOMENDASI KEBIJAKAN</div>
                      <div className="text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer">• DAFTAR PUSTAKA & REFERENSI TERVERIFIKASI</div>
                    </div>
                  )}
                </div>

                {/* Article Body Content (Strictly solid readable text matching Plat-M) */}
                <div className="prose prose-slate max-w-none mb-8">
                  <div 
                    className="makalah-content leading-relaxed space-y-5 text-[16px] sm:text-[17px] text-slate-900 dark:text-zinc-100"
                    dangerouslySetInnerHTML={{ 
                      __html: formatPostContentHtml(selectedPost)
                    }}
                  />
                </div>

                {/* Cloud Tags for Single Post (Hastag #) */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                        Hastag:
                      </span>
                      {selectedPost.tags.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(t);
                            if (onClearSelectedPost) onClearSelectedPost();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-[#ce0a46] text-[#ce0a46] hover:bg-[#ce0a46] hover:text-white transition-all cursor-pointer bg-white dark:bg-zinc-800 inline-block"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Share Bar */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Bagikan Naskah Ini:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShare(selectedPost)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Facebook</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(selectedPost)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(selectedPost)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin Link</span>
                    </button>
                  </div>
                </div>

                {/* About Author Box (.about-author) */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40 flex items-start gap-4 mb-8">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
                    style={{ backgroundColor: crimson }}
                  >
                    {selectedPost.author ? selectedPost.author.charAt(0).toUpperCase() : 'Z'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tentang Penulis: {selectedPost.author || 'Tim Redaksi Karya ZAIN.NET'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      Koleksi naskah ilmiah dan karya tulis akademik terverifikasi pada repositori Karya ZAIN.NET. Ditujukan untuk referensi edukasi, riset, dan penyusunan tugas akhir mahasiswa seluruh Indonesia.
                    </p>
                  </div>
                </div>

                {/* Related Posts Section (Postingan Terkait) */}
                {relatedPosts.length > 0 && (
                  <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 mb-8">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: crimson }} />
                      <span>Postingan Terkait</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {relatedPosts.map((rPost) => (
                        <div
                          key={rPost.id}
                          onClick={() => {
                            onSelectPost(rPost);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="group cursor-pointer rounded-xl border border-slate-200 dark:border-zinc-800 p-3.5 bg-slate-50 dark:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <span 
                              className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                              style={{ color: crimson }}
                            >
                              {rPost.category || 'Akademik'}
                            </span>
                            <h4 className="text-xs font-bold leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                              {rPost.title}
                            </h4>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                            <span>{new Date(rPost.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            <span className="flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition-transform" style={{ color: crimson }}>
                              Baca <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Comments Section */}
                <div className="pt-6 border-t border-slate-200 dark:border-zinc-800">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" style={{ color: crimson }} />
                    <span>Diskusi & Tanggapan Akademik ({comments.length})</span>
                  </h3>

                  {/* Comment List */}
                  <div className="space-y-3 mb-6">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full ${c.avatarBg} text-white font-bold text-[10px] flex items-center justify-center`}>
                              {c.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{c.date}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed pl-8">
                          {c.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Tinggalkan Komentar atau Pertanyaan Riset:
                    </h4>
                    <input
                      type="text"
                      required
                      value={newCommentName}
                      onChange={(e) => setNewCommentName(e.target.value)}
                      placeholder="Nama lengkap atau nama mahasiswa..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <textarea
                      required
                      rows={3}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Tuliskan ulasan atau tanggapan akademik Anda di sini..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                      style={{ backgroundColor: crimson }}
                    >
                      <Send className="w-3 h-3" />
                      <span>Kirim Komentar</span>
                    </button>
                  </form>
                </div>

              </article>

              {/* Sidebar for Single Post (Matching Plat-M Layout) */}
              <aside className="lg:col-span-4 space-y-6">
                
                {/* --- WIDGET 1: KOMENTAR TERBARU > (Matching Plat-M Image 2) --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span>Komentar Terbaru &gt;</span>
                  </h3>
                  <div className="space-y-4">
                    {recentCommentsList.map(rc => (
                      <div key={rc.id} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-300 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{rc.name}</span>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">{rc.snippet}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- WIDGET 2: HASTAG # (Outlined Crimson Pill Badges matching Plat-M) --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: crimson }} />
                    <span>Hastag #</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {platMHashtags.map(({ name, count }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(name);
                          if (onClearSelectedPost) onClearSelectedPost();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium border border-[#ce0a46] text-[#ce0a46] hover:bg-[#ce0a46] hover:text-white transition-all cursor-pointer bg-white dark:bg-zinc-800 inline-block"
                      >
                        {name} ({count})
                      </button>
                    ))}
                    {Object.entries(categoryCounts).slice(0, 8).map(([tag, count]) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(tag);
                          if (onClearSelectedPost) onClearSelectedPost();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium border border-[#ce0a46] text-[#ce0a46] hover:bg-[#ce0a46] hover:text-white transition-all cursor-pointer bg-white dark:bg-zinc-800 inline-block"
                      >
                        {tag} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- WIDGET 3: PALING POPULER --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span>Paling Populer</span>
                    <Flame className="w-4 h-4" style={{ color: crimson }} />
                  </h3>
                  <div className="space-y-3.5">
                    {popularSidebar.map((post, idx) => (
                      <div
                        key={post.id}
                        onClick={() => {
                          onSelectPost(post);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-start gap-3 group cursor-pointer"
                      >
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ 
                            backgroundColor: idx === 0 ? crimson : isDarkMode ? '#2e2e36' : '#e5e5ea',
                            color: idx === 0 ? '#fff' : isDarkMode ? '#a1a1aa' : '#52525b'
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold leading-snug line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {post.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {post.viewsCount || 10} pembaca • {post.category || 'Ilmiah'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- WIDGET 4: UNDUH DOKUMEN ASLI WORD --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4" style={{ color: crimson }} />
                    <span>Unduh Berkas Asli Word</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3 leading-relaxed">
                    Naskah ini tersedia dalam format <strong>Microsoft Word (.docx)</strong> asli. Anda dapat langsung mengeditnya di PC atau ponsel.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedPost)}
                    className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    style={{ backgroundColor: crimson }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .DOCX ({selectedPost.wordCount || '~3500'} Kata)</span>
                  </button>
                </div>

                {/* --- WIDGET 5: IKUTI KAMI --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2">
                    <Globe className="w-4 h-4" style={{ color: crimson }} />
                    <span>Ikuti Kami</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <a href="https://facebook.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-blue-600 text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <span>Facebook</span>
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-sky-500 text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <span>Twitter / X</span>
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-pink-600 text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <span>Instagram</span>
                    </a>
                    <a href="https://youtube.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-red-600 text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <span>YouTube</span>
                    </a>
                  </div>
                </div>

              </aside>

            </div>

          </div>
        ) : (

          /* ========================================================================= */
          /* VIEW CONDITION: BLOG INDEX / HOMEPAGE (LiteSpot Pro / Plat-M Layout)      */
          /* ========================================================================= */
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* ========================================================================= */}
            {/* 3. HERO FEATURED SECTION (3-Column Hero Grid / Featured News)             */}
            {/* ========================================================================= */}
            {featuredPosts.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featuredPosts.map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost(post)}
                    className="relative rounded-2xl overflow-hidden h-52 sm:h-60 group cursor-pointer shadow-md border border-slate-200 dark:border-zinc-800 transition-all hover:-translate-y-1"
                  >
                    {/* Background Thematic Image or Fallback */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: post.coverImageUrl 
                          ? `url(${post.coverImageUrl})`
                          : idx === 0 
                            ? 'radial-gradient(circle at top right, #3b82f6, #1e1b4b)' 
                            : idx === 1 
                              ? 'radial-gradient(circle at top right, #8b5cf6, #311042)'
                              : 'radial-gradient(circle at top right, #ec4899, #4c0519)'
                      }}
                    />

                    {/* Dark gradient overlay from bottom (before-mask) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                    {/* Card Content */}
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end text-white">
                      <span 
                        className="self-start px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-2 shadow-xs"
                        style={{ backgroundColor: crimson }}
                      >
                        {post.category || 'Riset Utama'}
                      </span>

                      <h3 className="font-extrabold text-sm sm:text-base leading-snug line-clamp-2 drop-shadow-md group-hover:underline">
                        {post.title}
                      </h3>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-300 mt-2">
                        <span>by {post.author || 'Zain'}</span>
                        <span>•</span>
                        <span>{post.publishedDate || 'Terbaru'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* ========================================================================= */}
            {/* 4. TWO-COLUMN BODY LAYOUT: Main Content (68%) + Sidebar (32%)              */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              
              {/* Left Main Content (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* --- SECTION 1: REKOMENDASI (Block Layout: 1 Big + 3 Small) --- */}
                {recommendationLarge && (
                  <section className={`rounded-2xl border p-5 shadow-xs ${cardBg}`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crimson }} />
                        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                          Rekomendasi Naskah Pilihan
                        </h2>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                        Terverifikasi
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Left Big Card (7 cols) */}
                      <div 
                        onClick={() => onSelectPost(recommendationLarge)}
                        className="md:col-span-7 group cursor-pointer space-y-2.5"
                      >
                        <div className="relative rounded-xl overflow-hidden h-48 bg-slate-800 shadow-sm">
                          <div 
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                            style={{
                              backgroundImage: recommendationLarge.coverImageUrl 
                                ? `url(${recommendationLarge.coverImageUrl})`
                                : 'radial-gradient(circle at bottom left, #0ea5e9, #0f172a)'
                            }}
                          />
                          <span 
                            className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-black text-white uppercase"
                            style={{ backgroundColor: crimson }}
                          >
                            {recommendationLarge.category || 'Utama'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-base sm:text-lg leading-snug text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2">
                          {recommendationLarge.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {recommendationLarge.excerpt || 'Ulasan komprehensif naskah ilmiah terstruktur standar perguruan tinggi.'}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>Penulis : {recommendationLarge.author || 'Zain'}</span>
                          <span>•</span>
                          <span>{recommendationLarge.publishedDate || 'Hari Ini'}</span>
                        </div>
                      </div>

                      {/* Right Small Stacked Cards (5 cols) */}
                      <div className="md:col-span-5 space-y-3">
                        {recommendationSmall.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => onSelectPost(post)}
                            className="flex items-center gap-3 group cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                          >
                            <div className="w-20 h-16 rounded-lg bg-slate-800 shrink-0 overflow-hidden relative shadow-xs">
                              <div 
                                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                                style={{
                                  backgroundImage: post.coverImageUrl 
                                    ? `url(${post.coverImageUrl})`
                                    : 'radial-gradient(circle at center, #6366f1, #1e1b4b)'
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs leading-tight line-clamp-2 text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                {post.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {post.publishedDate || 'Baru'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* --- SECTION 2: TREN MINGGU INI (3-Column Cards Grid) --- */}
                {weeklyTrending.length > 0 && (
                  <section className={`rounded-2xl border p-5 shadow-xs ${cardBg}`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4" style={{ color: crimson }} />
                        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                          Tren Minggu Ini
                        </h2>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                        Paling Banyak Dibaca
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {weeklyTrending.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => onSelectPost(post)}
                          className="group cursor-pointer space-y-2"
                        >
                          <div className="relative rounded-xl overflow-hidden h-32 bg-slate-800 shadow-xs">
                            <div 
                              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                              style={{
                                backgroundImage: post.coverImageUrl 
                                  ? `url(${post.coverImageUrl})`
                                  : 'radial-gradient(circle at top left, #10b981, #064e3b)'
                              }}
                            />
                            <span 
                              className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black text-white uppercase"
                              style={{ backgroundColor: crimson }}
                            >
                              {post.category || 'Populer'}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {post.title}
                          </h4>

                          <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                            <span>{post.viewsCount || 10} pembaca</span>
                            <span>•</span>
                            <span>{post.publishedDate || 'Hari ini'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* --- SECTION 3: POST TERBARU (Classic Blog List Layout matching .index-post) --- */}
                <section className={`rounded-2xl border p-5 shadow-xs ${cardBg}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crimson }} />
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Post Terbaru ({filteredPosts.length})
                      </h2>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex items-center gap-1.5">
                      {['Semua', 'skripsi', 'makalah', 'jurnal'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedType(type)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                            selectedType === type
                              ? 'text-white'
                              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                          style={selectedType === type ? { backgroundColor: crimson } : {}}
                        >
                          {type === 'Semua' ? 'Semua' : type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List of Posts (.index-post) */}
                  {filteredPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-zinc-400 space-y-3">
                      <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-2 opacity-50" />
                      <p className="font-bold text-sm text-slate-800 dark:text-zinc-200">
                        {posts.length === 0 
                          ? 'Blog Saat Ini Bersih (0 Postingan)' 
                          : 'Tidak ada naskah yang cocok dengan filter pencarian.'}
                      </p>
                      <p className="text-xs max-w-md mx-auto">
                        {posts.length === 0 
                          ? 'Seluruh postingan sebelumnya telah dikosongkan. Silakan unggah naskah baru untuk mempublikasikan berkas asli dengan link unduhan instan.'
                          : 'Coba gunakan kata kunci lain atau pilih kategori "Semua".'}
                      </p>

                      {isAdmin && (
                        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={onOpenBatchUpload}
                            className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                            style={{ backgroundColor: crimson }}
                          >
                            <Plus className="w-4 h-4" />
                            <span>+ Unggah Berkas Word Baru</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAdminPanel(true)}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Buka Panel Kontrol Blogspot</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-zinc-800 space-y-5">
                      {filteredPosts.slice(0, visibleCount).map((post) => (
                        <article
                          key={post.id}
                          className="pt-5 first:pt-0 flex flex-col sm:flex-row items-start gap-4 sm:gap-5 group"
                        >
                          {/* Thumbnail on Left (200x133px aspect) */}
                          <div 
                            onClick={() => onSelectPost(post)}
                            className="w-full sm:w-48 h-36 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative cursor-pointer shadow-xs"
                          >
                            <div 
                              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                              style={{
                                backgroundImage: post.coverImageUrl 
                                  ? `url(${post.coverImageUrl})`
                                  : 'radial-gradient(circle at bottom right, #3b82f6, #1e293b)'
                              }}
                            />
                            <span 
                              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9.5px] font-black text-white uppercase shadow-xs"
                              style={{ backgroundColor: crimson }}
                            >
                              {post.category || 'Ilmiah'}
                            </span>
                          </div>

                          {/* Details on Right */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 
                              onClick={() => onSelectPost(post)}
                              className="text-base sm:text-lg font-extrabold leading-snug text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              {post.title}
                            </h3>

                            <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {post.excerpt || 'Isi artikel lengkap dan dokumen Microsoft Word (.docx) siap unduh langsung.'}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                              <span>Penulis : <strong>{post.author || 'Tim Zain'}</strong></span>
                              <span>•</span>
                              <span>{post.publishedDate || 'Hari ini'}</span>
                              <span>•</span>
                              <span>{post.readingTimeMinutes || 5} mnt baca</span>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={(e) => handleDownload(e, post)}
                                className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                                style={{ backgroundColor: crimson }}
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh .DOCX</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onSelectPost(post)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Baca Lengkap</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>

                              {isAdmin && onDeletePost && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Hapus naskah "${post.title}"?`)) {
                                      onDeletePost(post.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto cursor-pointer"
                                  title="Hapus Naskah (Admin)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {/* Load More Button */}
                  {filteredPosts.length > visibleCount && (
                    <div className="text-center pt-6 border-t border-slate-200 dark:border-zinc-800 mt-6">
                      <button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + 6)}
                        className="px-6 py-2.5 rounded-xl font-extrabold text-xs text-white transition-all shadow-md active:scale-95 cursor-pointer"
                        style={{ backgroundColor: crimson }}
                      >
                        Muat Postingan Lainnya ({filteredPosts.length - visibleCount} tersisa)
                      </button>
                    </div>
                  )}
                </section>

              </div>

              {/* Right Sidebar (lg:col-span-4) */}
              <aside className="lg:col-span-4 space-y-6">
                
                {/* --- WIDGET 1: IKUTI KAMI > --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3.5 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span>Ikuti Kami</span>
                    <ChevronRight className="w-4 h-4" style={{ color: crimson }} />
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[#1877f2]/10 hover:bg-[#1877f2]/20 text-[#1877f2] font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Facebook</span>
                    </a>
                    <a
                      href="https://twitter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-900/10 dark:bg-zinc-700/30 hover:bg-slate-900/20 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Twitter / X</span>
                    </a>
                    <a
                      href="https://youtube.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[#ff0000]/10 hover:bg-[#ff0000]/20 text-[#ff0000] font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>YouTube</span>
                    </a>
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[#e4405f]/10 hover:bg-[#e4405f]/20 text-[#e4405f] font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Instagram</span>
                    </a>
                  </div>
                </div>

                {/* --- WIDGET 2: PALING POPULER --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span>Paling Populer</span>
                    <Flame className="w-4 h-4" style={{ color: crimson }} />
                  </h3>
                  <div className="space-y-3.5">
                    {popularSidebar.map((post, idx) => (
                      <div
                        key={post.id}
                        onClick={() => onSelectPost(post)}
                        className="flex items-center gap-3 group cursor-pointer"
                      >
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-xs"
                          style={{ 
                            backgroundColor: idx === 0 ? crimson : isDarkMode ? '#2e2e36' : '#e5e5ea',
                            color: idx === 0 ? '#fff' : isDarkMode ? '#a1a1aa' : '#52525b'
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold leading-tight line-clamp-2 text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {post.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {post.viewsCount || 12} pembaca • {post.category || 'Ilmiah'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- WIDGET 3: KOMENTAR TERBARU > (Matching Plat-M Image 2) --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span>Komentar Terbaru &gt;</span>
                  </h3>
                  <div className="space-y-4">
                    {recentCommentsList.map(rc => (
                      <div key={rc.id} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-300 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{rc.name}</span>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">{rc.snippet}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- WIDGET 4: HASTAG # (Outlined Crimson Pill Badges matching Plat-M) --- */}
                <div className={`p-5 rounded-2xl border shadow-xs ${cardBg}`}>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: crimson }} />
                    <span>Hastag #</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {platMHashtags.map(({ name, count }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(name);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border border-[#ce0a46] transition-all cursor-pointer inline-block ${
                          selectedCategory === name
                            ? 'bg-[#ce0a46] text-white'
                            : 'text-[#ce0a46] bg-white dark:bg-zinc-800 hover:bg-[#ce0a46] hover:text-white'
                        }`}
                      >
                        {name} ({count})
                      </button>
                    ))}
                    {Object.entries(categoryCounts).map(([tag, count]) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(tag);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border border-[#ce0a46] transition-all cursor-pointer inline-block ${
                          selectedCategory === tag
                            ? 'bg-[#ce0a46] text-white'
                            : 'text-[#ce0a46] bg-white dark:bg-zinc-800 hover:bg-[#ce0a46] hover:text-white'
                        }`}
                      >
                        {tag} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- WIDGET 4: INFORMASI DOKUMEN ASLI WORD --- */}
                <div 
                  className="rounded-2xl p-5 text-white shadow-md space-y-3"
                  style={{ backgroundColor: crimson }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-extrabold text-base leading-snug">
                    Akses File Word (.docx) Asli
                  </h3>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Semua karya tulis ilmiah di Karya ZAIN.NET disediakan langsung dengan tombol download berkas Microsoft Word asli tanpa dipungut biaya dan tanpa harus registrasi.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={onBackToTools}
                      className="w-full py-2 px-3 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gunakan Generator AI Skripsi</span>
                    </button>
                  </div>
                </div>

              </aside>

            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 5. FOOTER (LiteSpot Pro About Section & Footerbar)                        */}
      {/* ========================================================================= */}
      <footer className="mt-16 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
            {/* About Platform */}
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base text-white shadow-xs"
                  style={{ backgroundColor: crimson }}
                >
                  Z
                </div>
                <span className="font-extrabold text-lg text-slate-900 dark:text-white">
                  KARYA ZAIN<span style={{ color: crimson }}>.NET</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed pr-4">
                Platform repositori karya ilmiah, skripsi, tesis, dan makalah perkuliahan terlengkap. Dirancang untuk memudahkan sivitas akademika dalam mencari referensi pustaka, membaca materi terbuka, dan mengunduh berkas Word .docx asli secara instan.
              </p>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Kategori Populer
              </h4>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-zinc-400">
                <li className="hover:underline cursor-pointer" onClick={() => setSelectedType('skripsi')}>• Skripsi & Tugas Akhir</li>
                <li className="hover:underline cursor-pointer" onClick={() => setSelectedType('makalah')}>• Makalah Mahasiswa</li>
                <li className="hover:underline cursor-pointer" onClick={() => setSelectedType('jurnal')}>• Jurnal & Publikasi</li>
                <li className="hover:underline cursor-pointer" onClick={() => setSelectedType('proposal')}>• Proposal Penelitian</li>
              </ul>
            </div>

            {/* Academic AI Tools Link */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Layanan Akademik AI
              </h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Tersedia alat bantu AI penyusun makalah, parafrase penurun plagiasi, dan perumus judul skripsi otomatis.
              </p>
              <button
                type="button"
                onClick={onBackToTools}
                className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline cursor-pointer"
                style={{ color: crimson }}
              >
                <span>Buka Tools AI Generator</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400">
            <p>
              © 2026 <strong>Karya ZAIN.NET</strong> Academic Hub. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:underline cursor-pointer">
                Kembali ke Atas ↑
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* Floating Red Back to Top Button (matching Plat-M Image 2) */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-11 h-11 rounded-lg flex items-center justify-center text-white shadow-2xl hover:opacity-95 transition-all z-50 cursor-pointer active:scale-95"
        style={{ backgroundColor: crimson }}
        title="Kembali ke Atas"
        aria-label="Kembali ke Atas"
      >
        <ChevronUp className="w-6 h-6" />
      </button>

    </div>
  );
};
