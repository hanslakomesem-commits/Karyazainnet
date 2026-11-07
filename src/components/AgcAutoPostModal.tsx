import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  X, 
  Flame, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Radio
} from 'lucide-react';
import { AgcPost } from '../types';
import { generateDailyAgcPosts } from '../utils/agcService';

interface AgcAutoPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostsGenerated?: (newPosts: AgcPost[]) => void;
  onNavigateToAgcBlog?: () => void;
  totalAgcPostsCount?: number;
}

export const AgcAutoPostModal: React.FC<AgcAutoPostModalProps> = ({
  isOpen,
  onClose,
  onPostsGenerated,
  onNavigateToAgcBlog,
  totalAgcPostsCount = 0
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [postCount, setPostCount] = useState(3);
  const [deepArticleMode, setDeepArticleMode] = useState(true);
  const [generatedResult, setGeneratedResult] = useState<{ count: number; titles: string[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateNow = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedResult(null);

    try {
      const res = await generateDailyAgcPosts(postCount);
      if (res.success && res.newPosts.length > 0) {
        setGeneratedResult({
          count: res.newPosts.length,
          titles: res.newPosts.map(p => p.title)
        });
        if (onPostsGenerated) {
          onPostsGenerated(res.newPosts);
        }
      } else {
        setErrorMessage('Gagal memproses auto post. Silakan coba sesaat lagi.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi gangguan saat menghubungkan ke mesin AGC.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Auto Post Blog AGC</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Auto Aktif
                </span>
              </div>
              <p className="text-xs text-slate-400">Portal Berita Viral &amp; Trending Harian Otomatis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-amber-500/30 text-sm leading-relaxed space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Flame className="w-4 h-4" />
              <span>Konsep Alur Blog AGC (Auto Generated Content)</span>
            </div>
            <p className="text-slate-300">
              Sesuai kebutuhan Anda, <strong>bukan Anda yang membuat artikel secara manual</strong>. Mesin AI AGC ZAIN.NET otomatis memindai topik viral dan trending terkini setiap hari, menyusun format berita jurnalistik lengkap beserta foto, poin kunci, dan tagar, lalu langsung menerbitkannya ke <strong>Blog AGC</strong>.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col items-center text-center">
              <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Total Berita AGC</span>
              </div>
              <span className="text-xl font-bold text-white">{totalAgcPostsCount || 4}</span>
              <span className="text-[10px] text-blue-300">Tersimpan di Blog</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col items-center text-center">
              <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jadwal Terbit</span>
              </div>
              <span className="text-sm font-bold text-emerald-300 mt-1">Setiap Hari</span>
              <span className="text-[10px] text-slate-400">Otomatis Background</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col items-center text-center">
              <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Status Mesin</span>
              </div>
              <span className="text-sm font-bold text-amber-300 mt-1">Standby &amp; Auto</span>
              <span className="text-[10px] text-slate-400">Cron 4 Jam Sekali</span>
            </div>
          </div>

          {/* Manual Trigger Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Trigger Auto Post Hari Ini Sekarang
                </h4>
                <p className="text-xs text-slate-400">
                  Ingin langsung menerbitkan paket berita viral hari ini tanpa menunggu jadwal jam berikutnya?
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Jumlah:</span>
                <select
                  value={postCount}
                  onChange={(e) => setPostCount(Number(e.target.value))}
                  disabled={isGenerating}
                  className="bg-transparent text-xs font-semibold text-amber-300 outline-none cursor-pointer"
                >
                  <option value={1} className="bg-slate-900 text-white">1 Berita</option>
                  <option value={3} className="bg-slate-900 text-white">3 Berita</option>
                  <option value={5} className="bg-slate-900 text-white">5 Berita</option>
                </select>
              </div>
            </div>

            {/* Deep Article Mode Toggle & SEO 41 Rules Indicator */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    41 ATURAN SEO
                  </span>
                  <span className="text-xs font-bold text-white">Mode Deep Article (3.000–6.000+ Kata)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={deepArticleMode} 
                    onChange={(e) => setDeepArticleMode(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Menerapkan 41 aturan SEO mutlak: <strong>Nol thin content</strong>, analisis search intent (H1, TOC, H2/H3, FAQ, Kesimpulan), gaya bahasa mengalir alami seperti jurnalis profesional, E-E-A-T, dan lolos Quality Gate 100%.
              </p>
            </div>

            <button
              onClick={handleGenerateNow}
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isGenerating
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-amber-500/20 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Mesin AGC sedang meriset &amp; menyusun artikel SEO 41 aturan...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Posting Otomatis {postCount} Artikel SEO Berkualitas Tinggi</span>
                </>
              )}
            </button>
          </div>

          {/* Success Box */}
          {generatedResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Berhasil! {generatedResult.count} Berita Viral Baru Telah Terbit</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 pl-6 list-disc">
                {generatedResult.titles.map((t, idx) => (
                  <li key={idx} className="line-clamp-1">{t}</li>
                ))}
              </ul>
              {onNavigateToAgcBlog && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAgcBlog();
                  }}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-4"
                >
                  Buka Blog AGC untuk membaca berita sekarang <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Error Box */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Algoritma AGC ZAIN.NET terintegrasi Google Trends</span>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToAgcBlog && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAgcBlog();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <span>Lihat Blog AGC</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
