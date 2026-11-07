import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Gift, 
  Users, 
  Download, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  ShieldCheck,
  Search,
  Filter,
  CreditCard,
  Trophy,
  Medal,
  Crown,
  Mail,
  ArrowUpDown,
  UserCheck,
  Award,
  ChevronRight,
  ExternalLink,
  Flame,
  BadgePercent,
  Percent,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { UserPurchase, ToolCategory, RolesConfig } from '../types';

interface AdminAnalyticsModalProps {
  purchases?: UserPurchase[];
  categories?: ToolCategory[];
  rolesConfig?: RolesConfig;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type AnalyticsTab = 'overview' | 'resellers' | 'customers' | 'transactions';
type TimeframeFilter = 'all' | '30days' | '7days' | 'today';
type CustomerSortBy = 'transactions' | 'spent' | 'latest';
type ResellerSortBy = 'transactions' | 'spent' | 'email';

export const AdminAnalyticsModal: React.FC<AdminAnalyticsModalProps> = ({
  purchases = [],
  categories = [],
  rolesConfig,
  isOpen,
  onClose,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Customer sub-filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerRoleFilter, setCustomerRoleFilter] = useState<'all' | 'reseller' | 'public'>('all');
  const [customerSortBy, setCustomerSortBy] = useState<CustomerSortBy>('transactions');

  // Reseller sub-filters
  const [resellerSearch, setResellerSearch] = useState('');
  const [resellerSortBy, setResellerSortBy] = useState<ResellerSortBy>('transactions');

  const resellerEmailsSet = useMemo(() => {
    return new Set((rolesConfig?.resellerEmails || []).map(e => e.toLowerCase()));
  }, [rolesConfig]);

  const adminEmailsSet = useMemo(() => {
    return new Set((rolesConfig?.adminEmails || []).map(e => e.toLowerCase()));
  }, [rolesConfig]);

  // Filter purchases by timeframe and search for transaction log
  const filteredPurchases = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    return (purchases || []).filter((p) => {
      // Timeframe check
      if (timeframe === 'today' && p.purchasedAt < startOfToday) return false;
      if (timeframe === '7days' && p.purchasedAt < now - 7 * oneDay) return false;
      if (timeframe === '30days' && p.purchasedAt < now - 30 * oneDay) return false;

      // Method check
      if (methodFilter !== 'all') {
        if (methodFilter === 'loyalty' && p.method !== 'loyalty_reward_3x') return false;
        if (methodFilter === 'paid' && p.method === 'loyalty_reward_3x') return false;
        if (methodFilter === 'qris' && p.paymentType !== 'qris_manual' && (p.paymentType as string) !== 'qris') return false;
        if (methodFilter === 'va' && p.paymentType !== 'bank_transfer') return false;
        if (methodFilter === 'reseller') {
          const email = (p.userEmail || '').toLowerCase();
          if (!resellerEmailsSet.has(email)) return false;
        }
      }

      // Search query
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesTitle = p.itemTitle?.toLowerCase().includes(query);
        const matchesEmail = (p.userEmail || '').toLowerCase().includes(query);
        const matchesId = (p.id || '').toLowerCase().includes(query) || (p.orderId || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesEmail && !matchesId) return false;
      }

      return true;
    });
  }, [purchases, timeframe, methodFilter, searchFilter, resellerEmailsSet]);

  // 1. Core Analytics Metrics
  const metrics = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;
    let totalPaidTransactions = 0;
    let totalLoyaltyClaims = 0;
    let resellerTotalRevenue = 0;
    let resellerTotalTransactions = 0;

    const toolPopularity: { [title: string]: { count: number; revenue: number; itemId: string } } = {};
    const paymentMethodsCount: { [key: string]: number } = {
      QRIS: 0,
      'Virtual Account': 0,
      'E-Wallet': 0,
      'Promo Beli 3x Gratis 1x': 0,
      Lainnya: 0
    };

    // Initialize all tools in map
    (categories || []).forEach(c => {
      (c?.tools || []).forEach(t => {
        if (t?.title) {
          toolPopularity[t.title] = { count: 0, revenue: 0, itemId: `tool:${t.id}` };
        }
      });
    });

    (purchases || []).forEach((p) => {
      const isLoyalty = p.method === 'loyalty_reward_3x' || p.paymentType === 'loyalty_reward';
      const amount = Number(p.amountPaid) || 0;
      const userEmail = (p.userEmail || '').toLowerCase();
      const isReseller = resellerEmailsSet.has(userEmail);

      if (isReseller) {
        resellerTotalTransactions += 1;
        resellerTotalRevenue += amount;
      }

      if (isLoyalty) {
        totalLoyaltyClaims += 1;
        paymentMethodsCount['Promo Beli 3x Gratis 1x'] += 1;
      } else {
        totalPaidTransactions += 1;
        totalRevenue += amount;

        if (p.purchasedAt >= startOfToday) {
          todayRevenue += amount;
        }
        if (p.purchasedAt >= startOfMonth) {
          monthRevenue += amount;
        }

        if (p.paymentType === 'qris_manual' || (p.paymentType as string) === 'qris') {
          paymentMethodsCount['QRIS'] += 1;
        } else if (p.paymentType === 'bank_transfer') {
          paymentMethodsCount['Virtual Account'] += 1;
        } else if (p.paymentType === 'wallet_balance' || (p.paymentType as string) === 'gopay' || (p.paymentType as string) === 'shopeepay') {
          paymentMethodsCount['E-Wallet'] += 1;
        } else {
          paymentMethodsCount['Lainnya'] += 1;
        }
      }

      // Track popularity
      const title = p.itemTitle.replace('Klaim Promo Beli 3x Gratis 1x: ', '');
      if (!toolPopularity[title]) {
        toolPopularity[title] = { count: 0, revenue: 0, itemId: p.itemId };
      }
      toolPopularity[title].count += 1;
      toolPopularity[title].revenue += amount;
    });

    // Sort popular tools descending
    const sortedTools = Object.entries(toolPopularity)
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    const maxToolCount = sortedTools.length > 0 ? Math.max(1, sortedTools[0].count) : 1;

    // Build last 7 days chart data
    const last7Days: { dateStr: string; label: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });

      let dayRev = 0;
      let dayCnt = 0;
      (purchases || []).forEach(p => {
        if (p.purchasedAt >= dayStart && p.purchasedAt < dayEnd) {
          dayRev += (Number(p.amountPaid) || 0);
          dayCnt += 1;
        }
      });
      last7Days.push({ dateStr, label: dayLabel, revenue: dayRev, count: dayCnt });
    }

    const maxDailyRevenue = Math.max(1, ...last7Days.map(d => d.revenue));

    // Build last 6 months chart data
    const last6Months: { monthLabel: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const monthLabel = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

      let mRev = 0;
      let mCnt = 0;
      (purchases || []).forEach(p => {
        if (p.purchasedAt >= mStart && p.purchasedAt < mEnd) {
          mRev += (Number(p.amountPaid) || 0);
          mCnt += 1;
        }
      });
      last6Months.push({ monthLabel, revenue: mRev, count: mCnt });
    }

    const maxMonthlyRevenue = Math.max(1, ...last6Months.map(m => m.revenue));

    return {
      totalRevenue,
      todayRevenue,
      monthRevenue,
      totalPaidTransactions,
      totalLoyaltyClaims,
      totalAllTransactions: purchases.length,
      resellerTotalRevenue,
      resellerTotalTransactions,
      sortedTools,
      maxToolCount,
      paymentMethodsCount,
      last7Days,
      maxDailyRevenue,
      last6Months,
      maxMonthlyRevenue
    };
  }, [purchases, categories, resellerEmailsSet]);

  // 2. Reseller Leaderboard Analytics (Penjualan / Transaksi Reseller Terbanyak)
  const resellerLeaderboard = useMemo(() => {
    const discountRate = (rolesConfig?.resellerDiscountPercentage || 50) / 100;
    const map: { [email: string]: {
      email: string;
      totalTransactions: number;
      paidTransactions: number;
      freeTrialOrLoyaltyCount: number;
      totalRevenue: number;
      estimatedSavings: number;
      toolUsage: { [toolTitle: string]: number };
      lastPurchasedAt: number;
      lastItemTitle: string;
      methods: { [method: string]: number };
      purchases: UserPurchase[];
    } } = {};

    // First seed with all registered reseller emails from config
    (rolesConfig?.resellerEmails || []).forEach(rawEmail => {
      const email = rawEmail.toLowerCase().trim();
      if (!map[email]) {
        map[email] = {
          email,
          totalTransactions: 0,
          paidTransactions: 0,
          freeTrialOrLoyaltyCount: 0,
          totalRevenue: 0,
          estimatedSavings: 0,
          toolUsage: {},
          lastPurchasedAt: 0,
          lastItemTitle: '-',
          methods: {},
          purchases: []
        };
      }
    });

    // Aggregate transactions for all reseller emails
    (purchases || []).forEach(p => {
      const email = (p.userEmail || '').toLowerCase().trim();
      if (!email) return;

      if (resellerEmailsSet.has(email) || email.includes('reseller')) {
        if (!map[email]) {
          map[email] = {
            email,
            totalTransactions: 0,
            paidTransactions: 0,
            freeTrialOrLoyaltyCount: 0,
            totalRevenue: 0,
            estimatedSavings: 0,
            toolUsage: {},
            lastPurchasedAt: 0,
            lastItemTitle: '-',
            methods: {},
            purchases: []
          };
        }

        const data = map[email];
        data.totalTransactions += 1;
        const amount = Number(p.amountPaid) || 0;
        data.totalRevenue += amount;
        data.purchases.push(p);

        if (p.method === 'loyalty_reward_3x') {
          data.freeTrialOrLoyaltyCount += 1;
        } else {
          data.paidTransactions += 1;
          // Approximate savings gained by reseller discount
          if (discountRate < 1 && amount > 0) {
            const originalVal = amount / (1 - discountRate);
            data.estimatedSavings += Math.max(0, originalVal - amount);
          }
        }

        if (p.purchasedAt > data.lastPurchasedAt) {
          data.lastPurchasedAt = p.purchasedAt;
          data.lastItemTitle = p.itemTitle;
        }

        const title = p.itemTitle.replace('Klaim Promo Beli 3x Gratis 1x: ', '');
        data.toolUsage[title] = (data.toolUsage[title] || 0) + 1;

        const methodKey = p.paymentType || p.method;
        data.methods[methodKey] = (data.methods[methodKey] || 0) + 1;
      }
    });

    // Convert map to array and compute top favorite tool per reseller
    let list = Object.values(map).map(r => {
      let topTool = '-';
      let topToolCount = 0;
      Object.entries(r.toolUsage).forEach(([tool, count]) => {
        if (count > topToolCount) {
          topToolCount = count;
          topTool = tool;
        }
      });

      return {
        ...r,
        topFavoriteTool: topTool,
        topFavoriteToolCount: topToolCount
      };
    });

    // Filter by reseller search
    if (resellerSearch.trim()) {
      const q = resellerSearch.toLowerCase();
      list = list.filter(r => r.email.includes(q) || r.topFavoriteTool.toLowerCase().includes(q));
    }

    // Sort leaderboard
    list.sort((a, b) => {
      if (resellerSortBy === 'transactions') {
        return b.totalTransactions - a.totalTransactions || b.totalRevenue - a.totalRevenue;
      }
      if (resellerSortBy === 'spent') {
        return b.totalRevenue - a.totalRevenue || b.totalTransactions - a.totalTransactions;
      }
      return a.email.localeCompare(b.email);
    });

    const activeResellersCount = list.filter(r => r.totalTransactions > 0).length;
    const maxResellerTrx = list.length > 0 ? Math.max(1, list[0].totalTransactions) : 1;

    return {
      list,
      totalRegistered: list.length,
      activeResellersCount,
      maxResellerTrx
    };
  }, [purchases, rolesConfig, resellerEmailsSet, resellerSearch, resellerSortBy]);

  // 3. Customer Email Intelligence (Siapa saja yang melakukan pembelian)
  const customerAnalytics = useMemo(() => {
    const map: { [email: string]: {
      email: string;
      role: 'admin' | 'reseller' | 'public';
      totalTransactions: number;
      paidTransactions: number;
      loyaltyClaims: number;
      totalSpent: number;
      lastPurchasedAt: number;
      lastItemTitle: string;
      toolCounts: { [toolTitle: string]: number };
      paymentMethods: { [method: string]: number };
      purchases: UserPurchase[];
    } } = {};

    (purchases || []).forEach(p => {
      const rawEmail = (p.userEmail || p.userId || 'guest@zain.net').toLowerCase().trim();
      const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@user.zain.net`;

      if (!map[email]) {
        let role: 'admin' | 'reseller' | 'public' = 'public';
        if (adminEmailsSet.has(email)) role = 'admin';
        else if (resellerEmailsSet.has(email)) role = 'reseller';

        map[email] = {
          email,
          role,
          totalTransactions: 0,
          paidTransactions: 0,
          loyaltyClaims: 0,
          totalSpent: 0,
          lastPurchasedAt: 0,
          lastItemTitle: '-',
          toolCounts: {},
          paymentMethods: {},
          purchases: []
        };
      }

      const c = map[email];
      c.totalTransactions += 1;
      const amount = Number(p.amountPaid) || 0;
      c.totalSpent += amount;
      c.purchases.push(p);

      if (p.method === 'loyalty_reward_3x') {
        c.loyaltyClaims += 1;
      } else {
        c.paidTransactions += 1;
      }

      if (p.purchasedAt > c.lastPurchasedAt) {
        c.lastPurchasedAt = p.purchasedAt;
        c.lastItemTitle = p.itemTitle;
      }

      const title = p.itemTitle.replace('Klaim Promo Beli 3x Gratis 1x: ', '');
      c.toolCounts[title] = (c.toolCounts[title] || 0) + 1;

      const methodKey = p.paymentType || p.method;
      c.paymentMethods[methodKey] = (c.paymentMethods[methodKey] || 0) + 1;
    });

    let list = Object.values(map).map(c => {
      let favoriteTool = '-';
      let favoriteToolCount = 0;
      Object.entries(c.toolCounts).forEach(([tool, count]) => {
        if (count > favoriteToolCount) {
          favoriteToolCount = count;
          favoriteTool = tool;
        }
      });

      let preferredMethod = 'QRIS';
      let maxMethodCount = 0;
      Object.entries(c.paymentMethods).forEach(([method, count]) => {
        if (count > maxMethodCount) {
          maxMethodCount = count;
          preferredMethod = method;
        }
      });

      return {
        ...c,
        favoriteTool,
        favoriteToolCount,
        preferredMethod
      };
    });

    // Filter by search
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      list = list.filter(c => c.email.includes(q) || c.lastItemTitle.toLowerCase().includes(q) || c.favoriteTool.toLowerCase().includes(q));
    }

    // Filter by role
    if (customerRoleFilter !== 'all') {
      list = list.filter(c => c.role === customerRoleFilter);
    }

    // Sort customers
    list.sort((a, b) => {
      if (customerSortBy === 'transactions') {
        return b.totalTransactions - a.totalTransactions || b.totalSpent - a.totalSpent;
      }
      if (customerSortBy === 'spent') {
        return b.totalSpent - a.totalSpent || b.totalTransactions - a.totalTransactions;
      }
      return b.lastPurchasedAt - a.lastPurchasedAt;
    });

    const uniqueBuyersCount = list.length;
    const totalRepeatBuyers = list.filter(c => c.totalTransactions > 1).length;
    const repeatBuyerRate = uniqueBuyersCount > 0 ? Math.round((totalRepeatBuyers / uniqueBuyersCount) * 100) : 0;
    const avgSpendPerCustomer = uniqueBuyersCount > 0 ? Math.round(metrics.totalRevenue / uniqueBuyersCount) : 0;

    return {
      list,
      uniqueBuyersCount,
      totalRepeatBuyers,
      repeatBuyerRate,
      avgSpendPerCustomer
    };
  }, [purchases, adminEmailsSet, resellerEmailsSet, customerSearch, customerRoleFilter, customerSortBy, metrics.totalRevenue]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (purchases.length === 0) {
      alert('Belum ada data transaksi untuk diexport.');
      return;
    }

    const headers = ['ID Transaksi', 'Order ID', 'Email Pembeli', 'Role Pengguna', 'Modul / Item', 'Harga (Rp)', 'Metode', 'Status', 'Tanggal'];
    const rows = filteredPurchases.map(p => {
      const email = (p.userEmail || 'guest@zain.net').toLowerCase();
      const roleStr = resellerEmailsSet.has(email) ? 'Reseller' : adminEmailsSet.has(email) ? 'Admin' : 'Mahasiswa/Umum';
      return [
        p.id,
        p.orderId || '-',
        email,
        roleStr,
        `"${p.itemTitle.replace(/"/g, '""')}"`,
        p.amountPaid,
        p.method === 'loyalty_reward_3x' ? 'Promo Beli 3x Gratis 1x' : (p.paymentType || p.method),
        p.status || 'settlement',
        new Date(p.purchasedAt).toLocaleString('id-ID')
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Transaksi_ZAIN_NET_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleFilterBySpecificEmail = (targetEmail: string) => {
    setSearchFilter(targetEmail);
    setActiveTab('transactions');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/80 my-auto text-slate-100 max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Dashboard Analitik Penjualan & Transaksi
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Admin Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Laporan omzet, peringkat penjualan reseller terbanyak, dan daftar lengkap email pembeli.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerRefresh}
              title="Segarkan Data Transaksi"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              title="Download Rekap CSV"
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-1 pt-3 pb-1 border-b border-slate-800/80 overflow-x-auto no-scrollbar shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ikhtisar & Omzet</span>
          </button>

          <button
            onClick={() => setActiveTab('resellers')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'resellers'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Peringkat Reseller (Top Seller)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
              {resellerLeaderboard.activeResellersCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Daftar Email Pembeli</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              {customerAnalytics.uniqueBuyersCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Log Transaksi</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">
              {filteredPurchases.length}
            </span>
          </button>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-6 pr-1 custom-scrollbar">

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW & GENERAL REVENUE STATS                 */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 1. Main KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Gross Revenue */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950/40 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Omzet All-Time</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
                    Rp {metrics.totalRevenue.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{metrics.totalPaidTransactions} Transaksi Terbayar</span>
                  </p>
                </div>

                {/* Month Revenue */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950/40 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Omzet Bulan Ini</span>
                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-blue-400 tracking-tight">
                    Rp {metrics.monthRevenue.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Bulan {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Reseller Contribution */}
                <div 
                  onClick={() => setActiveTab('resellers')}
                  className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-amber-950/40 border border-amber-500/30 cursor-pointer hover:border-amber-400/60 transition-all group"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Omzet Reseller</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight">
                    Rp {metrics.resellerTotalRevenue.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {metrics.resellerTotalTransactions} Transaksi Mitra Reseller
                  </p>
                </div>

                {/* Free Loyalty Claims */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-purple-950/40 border border-purple-500/30">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Klaim Promo Beli 3x</span>
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                      <Gift className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-purple-300 tracking-tight">
                    {metrics.totalLoyaltyClaims} <span className="text-xs font-normal text-slate-400">Klaim</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Reward Mahasiswa Beli 3x Gratis 1x
                  </p>
                </div>
              </div>

              {/* 2. Visual Charts: Daily Trend & Monthly Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Daily Trend (Last 7 Days) */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Tren Omzet 7 Hari Terakhir
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Harian (Rp)</span>
                  </div>

                  <div className="h-36 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-800">
                    {metrics.last7Days.map((d, idx) => {
                      const heightPercent = metrics.maxDailyRevenue > 0 ? (d.revenue / metrics.maxDailyRevenue) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 bg-slate-800 border border-slate-700 text-[10px] text-white px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-mono">
                            Rp {d.revenue.toLocaleString('id-ID')} ({d.count} trx)
                          </div>
                          <div className="w-full max-w-[28px] bg-slate-800/80 rounded-t-lg relative flex items-end h-28 overflow-hidden">
                            <div 
                              style={{ height: `${Math.max(8, heightPercent)}%` }}
                              className={`w-full transition-all duration-300 rounded-t-md ${
                                d.revenue > 0 
                                  ? 'bg-gradient-to-t from-blue-600 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300' 
                                  : 'bg-slate-700/30'
                              }`}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold text-center truncate max-w-full">
                            {d.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Trend (Last 6 Months) */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Performa Omzet Bulanan
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">6 Bulan Terakhir</span>
                  </div>

                  <div className="h-36 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-800">
                    {metrics.last6Months.map((m, idx) => {
                      const heightPercent = metrics.maxMonthlyRevenue > 0 ? (m.revenue / metrics.maxMonthlyRevenue) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 bg-slate-800 border border-slate-700 text-[10px] text-white px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-mono">
                            Rp {m.revenue.toLocaleString('id-ID')} ({m.count} trx)
                          </div>
                          <div className="w-full max-w-[32px] bg-slate-800/80 rounded-t-lg relative flex items-end h-28 overflow-hidden">
                            <div 
                              style={{ height: `${Math.max(8, heightPercent)}%` }}
                              className={`w-full transition-all duration-300 rounded-t-md ${
                                m.revenue > 0 
                                  ? 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300' 
                                  : 'bg-slate-700/30'
                              }`}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold text-center truncate max-w-full">
                            {m.monthLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Top Best-Selling Modules & Payment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Best-Selling Tools (2 cols) */}
                <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Modul Paling Laris & Diminati Mahasiswa
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Berdasarkan Minat & Omzet</span>
                  </div>

                  <div className="space-y-2.5">
                    {metrics.sortedTools.slice(0, 6).map((tool, idx) => {
                      const percentOfMax = (tool.count / metrics.maxToolCount) * 100;
                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              idx === 0 
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20' 
                                : idx === 1 
                                ? 'bg-slate-300 text-slate-950' 
                                : idx === 2 
                                ? 'bg-amber-700 text-amber-100' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold text-white truncate">
                                  {tool.title}
                                </span>
                                <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                  Rp {tool.revenue.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  style={{ width: `${Math.max(4, percentOfMax)}%` }} 
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-slate-200 block">
                              {tool.count} <span className="text-[10px] text-slate-400 font-normal">order</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Methods Breakdown (1 col) */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Metode Pembayaran
                      </h3>
                    </div>

                    <div className="space-y-3 pt-1">
                      {Object.entries(metrics.paymentMethodsCount).map(([method, countVal], idx) => {
                        const count = Number(countVal) || 0;
                        const totalAll = Math.max(1, metrics.totalAllTransactions);
                        const percent = Math.round((count / totalAll) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-300">{method}</span>
                              <span className="font-mono text-slate-400 font-bold">{count} trx ({percent}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${percent}%` }}
                                className={`h-full rounded-full ${
                                  method === 'QRIS'
                                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                    : method === 'Virtual Account'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    : method === 'Promo Beli 3x Gratis 1x'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                                    : 'bg-purple-500'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="font-bold text-slate-200">Tips Konversi:</p>
                    <p>Integrasi Midtrans QRIS dan diskon Reseller {rolesConfig?.resellerDiscountPercentage || 50}% mendorong volume transaksi harian.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: RESELLER LEADERBOARD & TOP SALES BREAKDOWN       */}
          {/* ======================================================== */}
          {activeTab === 'resellers' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Peringkat Mitra Reseller Transaksi Terbanyak
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Diskon {rolesConfig?.resellerDiscountPercentage || 50}% Aktif
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Analisis performa reseller berdasarkan kuantitas transaksi sukses dan total omzet modul akademik.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Reseller Aktif</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {resellerLeaderboard.activeResellersCount} / {resellerLeaderboard.totalRegistered}
                    </span>
                  </div>
                  <div className="w-px h-7 bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Omzet Reseller</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      Rp {metrics.resellerTotalRevenue.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 3 Podium Cards */}
              {resellerLeaderboard.list.filter(r => r.totalTransactions > 0).length >= 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {resellerLeaderboard.list.slice(0, 3).map((reseller, idx) => {
                    const isFirst = idx === 0;
                    const isSecond = idx === 1;
                    const isThird = idx === 2;

                    return (
                      <div 
                        key={reseller.email}
                        className={`p-4 rounded-2xl relative overflow-hidden transition-all border ${
                          isFirst 
                            ? 'bg-gradient-to-b from-amber-950/60 to-slate-950 border-amber-500/60 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/30' 
                            : isSecond
                            ? 'bg-gradient-to-b from-slate-800/40 to-slate-950 border-slate-500/50'
                            : 'bg-gradient-to-b from-orange-950/40 to-slate-950 border-amber-700/50'
                        }`}
                      >
                        {/* Top Rank Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            {isFirst && <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />}
                            {isSecond && <Medal className="w-5 h-5 text-slate-300" />}
                            {isThird && <Award className="w-5 h-5 text-amber-600" />}
                            <span className={`text-xs font-black uppercase tracking-wider ${
                              isFirst ? 'text-amber-400' : isSecond ? 'text-slate-300' : 'text-amber-600'
                            }`}>
                              Juara #{idx + 1}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                            isFirst ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {reseller.totalTransactions} Transaksi
                          </span>
                        </div>

                        {/* Reseller Info */}
                        <div className="space-y-2">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Email Reseller</span>
                            <span className="text-xs sm:text-sm font-bold text-white block truncate" title={reseller.email}>
                              {reseller.email}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                              <span className="text-[9px] text-slate-400 block font-semibold">Total Omzet</span>
                              <span className="text-xs font-black text-emerald-400 font-mono">
                                Rp {reseller.totalRevenue.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                              <span className="text-[9px] text-slate-400 block font-semibold">Hemat Diskon</span>
                              <span className="text-xs font-black text-blue-400 font-mono">
                                Rp {Math.round(reseller.estimatedSavings).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1 text-[11px]">
                            <span className="text-slate-400 text-[10px] block">Modul Paling Sering Diorder:</span>
                            <span className="text-slate-200 font-semibold truncate block">
                              {reseller.topFavoriteTool} ({reseller.topFavoriteToolCount}x)
                            </span>
                          </div>

                          <button
                            onClick={() => handleFilterBySpecificEmail(reseller.email)}
                            className="w-full mt-2 py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Lihat Riwayat Transaksi</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reseller Search & Sort Controls */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Tabel Peringkat Lengkap Reseller ({resellerLeaderboard.list.length} Akun)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={resellerSearch}
                        onChange={(e) => setResellerSearch(e.target.value)}
                        placeholder="Cari email reseller..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <select
                      value={resellerSortBy}
                      onChange={(e) => setResellerSortBy(e.target.value as ResellerSortBy)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="transactions">Urut: Transaksi Terbanyak</option>
                      <option value="spent">Urut: Omzet Terbesar (Rp)</option>
                      <option value="email">Urut: Abjad Email</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 uppercase text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 text-center w-12">Rank</th>
                        <th className="p-2.5">Email Reseller</th>
                        <th className="p-2.5 text-center">Total Transaksi</th>
                        <th className="p-2.5 text-right">Total Belanja (Rp)</th>
                        <th className="p-2.5">Modul Favorit</th>
                        <th className="p-2.5">Terakhir Aktif</th>
                        <th className="p-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {resellerLeaderboard.list.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                            Tidak ada akun reseller yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        resellerLeaderboard.list.map((r, idx) => {
                          const percentOfTop = (r.totalTransactions / resellerLeaderboard.maxResellerTrx) * 100;
                          return (
                            <tr key={r.email} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs ${
                                  idx === 0
                                    ? 'bg-amber-400 text-slate-950 font-bold'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-950'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="font-bold text-white text-xs block">{r.email}</span>
                                <span className="text-[10px] text-blue-400 font-sans flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Partner Reseller</span>
                                </span>
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-black text-amber-300 text-xs">{r.totalTransactions} trx</span>
                                <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mt-1 overflow-hidden">
                                  <div 
                                    style={{ width: `${Math.max(5, percentOfTop)}%` }} 
                                    className="h-full bg-amber-400 rounded-full"
                                  />
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-bold whitespace-nowrap text-emerald-400">
                                Rp {r.totalRevenue.toLocaleString('id-ID')}
                              </td>
                              <td className="p-2.5 font-sans text-slate-300 max-w-[200px] truncate">
                                {r.topFavoriteTool !== '-' ? (
                                  <span>{r.topFavoriteTool} <span className="text-slate-500 font-mono">({r.topFavoriteToolCount}x)</span></span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="p-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                                {r.lastPurchasedAt > 0 ? (
                                  new Date(r.lastPurchasedAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                ) : (
                                  <span className="text-slate-600">Belum ada</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleFilterBySpecificEmail(r.email)}
                                  title="Filter log transaksi reseller ini"
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                                >
                                  Detail Log
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CUSTOMER EMAIL INTELLIGENCE (SEMUA PEMBELI)      */}
          {/* ======================================================== */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Customer KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-emerald-950/40 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Akun Pembeli Unik</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight font-mono">
                    {customerAnalytics.uniqueBuyersCount}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Email terverifikasi pernah transaksi
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-950/40 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Rasio Pembeli Berulang</span>
                    <RepeatIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-cyan-400 tracking-tight font-mono">
                    {customerAnalytics.repeatBuyerRate}%
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {customerAnalytics.totalRepeatBuyers} Pengguna Order &gt;1 Kali
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950/40 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata Belanja (AOV)</span>
                    <DollarSign className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-indigo-300 tracking-tight font-mono">
                    Rp {customerAnalytics.avgSpendPerCustomer.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Per akun pembeli
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-amber-950/40 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Transaksi Selesai</span>
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight font-mono">
                    {metrics.totalAllTransactions}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Termasuk berbayar & klaim promo
                  </p>
                </div>
              </div>

              {/* Customer Table Section with Filter & Search */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <span>Daftar Email yang Melakukan Pembelian ({customerAnalytics.list.length} Akun)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Lihat siapa saja pelanggan ZAIN.NET, total nominal transaksi, dan modul yang dibeli.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Cari email pembeli..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <select
                      value={customerRoleFilter}
                      onChange={(e) => setCustomerRoleFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">Semua Tipe Akun</option>
                      <option value="reseller">Hanya Reseller</option>
                      <option value="public">Mahasiswa / Umum</option>
                    </select>

                    <select
                      value={customerSortBy}
                      onChange={(e) => setCustomerSortBy(e.target.value as CustomerSortBy)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="transactions">Transaksi Terbanyak</option>
                      <option value="spent">Belanja Terbesar (Rp)</option>
                      <option value="latest">Transaksi Terbaru</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 uppercase text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Email Pembeli</th>
                        <th className="p-2.5">Tipe Akun</th>
                        <th className="p-2.5 text-center">Total Order</th>
                        <th className="p-2.5 text-right">Total Belanja</th>
                        <th className="p-2.5">Modul Terakhir / Favorit</th>
                        <th className="p-2.5">Waktu Transaksi Terakhir</th>
                        <th className="p-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {customerAnalytics.list.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                            Tidak ada data email pembeli yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        customerAnalytics.list.map((c) => {
                          const initial = (c.email.charAt(0) || 'U').toUpperCase();
                          return (
                            <tr key={c.email} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    c.role === 'reseller'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                      : c.role === 'admin'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  }`}>
                                    {initial}
                                  </div>
                                  <span className="font-bold text-white text-xs">{c.email}</span>
                                </div>
                              </td>
                              <td className="p-2.5 whitespace-nowrap font-sans">
                                {c.role === 'reseller' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                                    Reseller
                                  </span>
                                ) : c.role === 'admin' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                                    Mahasiswa / Publik
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-black text-slate-200 text-xs">{c.totalTransactions}x</span>
                                {c.loyaltyClaims > 0 && (
                                  <span className="text-[10px] text-amber-400 block font-sans">
                                    ({c.loyaltyClaims} free reward)
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold whitespace-nowrap text-emerald-400">
                                Rp {c.totalSpent.toLocaleString('id-ID')}
                              </td>
                              <td className="p-2.5 font-sans text-slate-300 max-w-[220px]">
                                <span className="font-medium text-slate-200 block truncate" title={c.lastItemTitle}>
                                  {c.lastItemTitle}
                                </span>
                                {c.favoriteTool !== '-' && c.favoriteTool !== c.lastItemTitle && (
                                  <span className="text-[10px] text-slate-400 block truncate" title={`Favorit: ${c.favoriteTool}`}>
                                    Sering: {c.favoriteTool}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                                {new Date(c.lastPurchasedAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleFilterBySpecificEmail(c.email)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                                >
                                  Lihat Riwayat
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: REAL-TIME TRANSACTION LOG LEDGER                 */}
          {/* ======================================================== */}
          {activeTab === 'transactions' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Log Riwayat Transaksi Real-Time</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Menampilkan {filteredPurchases.length} dari total {purchases.length} transaksi
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Cari email / modul..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                      {searchFilter && (
                        <button 
                          onClick={() => setSearchFilter('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value as TimeframeFilter)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">Semua Waktu</option>
                      <option value="today">Hari Ini</option>
                      <option value="7days">7 Hari Terakhir</option>
                      <option value="30days">30 Hari Terakhir</option>
                    </select>

                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">Semua Metode</option>
                      <option value="paid">Hanya Berbayar</option>
                      <option value="reseller">Transaksi Reseller</option>
                      <option value="loyalty">Klaim Promo 3x</option>
                      <option value="qris">QRIS</option>
                      <option value="va">Virtual Account</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 uppercase text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Waktu</th>
                        <th className="p-2.5">Order ID / User</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Item Modul</th>
                        <th className="p-2.5">Metode</th>
                        <th className="p-2.5 text-right">Nominal</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                            Tidak ada riwayat transaksi yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPurchases.map((p) => {
                          const isLoyalty = p.method === 'loyalty_reward_3x';
                          const email = (p.userEmail || 'guest@zain.net').toLowerCase();
                          const isReseller = resellerEmailsSet.has(email);
                          return (
                            <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-2.5 text-slate-400 whitespace-nowrap text-[11px]">
                                {new Date(p.purchasedAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="font-bold text-slate-200 block text-[11px]">{p.orderId || p.id}</span>
                                <span className="text-[10px] text-slate-400 font-sans">{email}</span>
                              </td>
                              <td className="p-2.5 whitespace-nowrap font-sans">
                                {isReseller ? (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                                    Reseller
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                                    Publik
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-sans font-medium text-slate-200 max-w-[200px] truncate" title={p.itemTitle}>
                                {p.itemTitle}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {isLoyalty ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    Promo Beli 3x
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase">
                                    {p.paymentType || p.method}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold whitespace-nowrap">
                                {isLoyalty ? (
                                  <span className="text-amber-300">Rp 0 (Gratis)</span>
                                ) : (
                                  <span className="text-emerald-400">Rp {p.amountPaid.toLocaleString('id-ID')}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Settled</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sistem Pembukuan & Analitik ZAIN.NET Terverifikasi</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Tutup Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

// Helper Icon for Repeat Orders
const RepeatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);
