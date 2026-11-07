import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Eye, 
  Users, 
  Clock, 
  RefreshCw, 
  X, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Globe, 
  Laptop, 
  ShieldCheck, 
  Smartphone, 
  Sparkles,
  Info,
  CheckCircle2,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { DailyTrafficStat, TrafficSummary, TrafficVisitorInfo, AppUser, UserRole } from '../types';
import { 
  fetchTrafficStatsMonth, 
  subscribeToTodayTraffic, 
  simulateAdminTestPing,
  getJakartaDateString
} from '../utils/trafficTracker';

interface TrafficStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  isAdmin?: boolean;
  userRole?: UserRole;
}

export const TrafficStatsModal: React.FC<TrafficStatsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdmin = false,
  userRole
}) => {
  const effectiveIsAdmin = isAdmin || userRole === 'admin';
  const [dailyStats, setDailyStats] = useState<DailyTrafficStat[]>([]);
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [todayStat, setTodayStat] = useState<DailyTrafficStat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'visitors'>('chart');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailyTrafficStat | null>(null);

  const loadAllData = async () => {
    if (!effectiveIsAdmin) return;
    setIsLoading(true);
    try {
      const res = await fetchTrafficStatsMonth();
      setDailyStats(res.dailyStats);
      setSummary(res.summary);
      
      const todayDateStr = getJakartaDateString();
      const currentToday = res.dailyStats.find(d => d.date === todayDateStr);
      if (currentToday) {
        setTodayStat(currentToday);
        setSelectedDayDetail(currentToday);
      }
    } catch (e) {
      console.error('Failed to load traffic stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !effectiveIsAdmin) return;

    loadAllData();

    // Setup realtime subscription for today's stats
    const unsubscribe = subscribeToTodayTraffic((updatedToday) => {
      if (updatedToday) {
        setTodayStat(updatedToday);
        setDailyStats(prev => {
          const index = prev.findIndex(d => d.date === updatedToday.date);
          if (index >= 0) {
            const copy = [...prev];
            copy[index] = updatedToday;
            return copy;
          } else {
            return [...prev, updatedToday];
          }
        });
        setSummary(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            todayPageViews: updatedToday.pageViews,
            todayUniqueUsers: updatedToday.uniqueUsersCount
          };
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (!effectiveIsAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="bg-[#0b101d] border border-red-500/40 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Akses Khusus Administrator</h3>
          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            Data statistik kunjungan (Page Views & User Views) dan trafik harian ZAIN.NET hanya dapat dilihat dan diakses oleh akun <strong>Administrator</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleSimulatePing = async (type: 'same_user' | 'new_user') => {
    setIsSimulating(true);
    setSimulationMessage(null);
    try {
      const success = await simulateAdminTestPing(type, currentUser);
      if (success) {
        setSimulationMessage(
          type === 'same_user'
            ? 'Berhasil: Simulasi User Sama membuka web kembali (+1 Page View, User View tetap).'
            : 'Berhasil: Simulasi Pengunjung Baru terdeteksi (+1 Page View & +1 User View unik).'
        );
        await loadAllData();
      }
    } catch (e) {
      setSimulationMessage('Gagal melakukan tes ping.');
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationMessage(null), 5000);
    }
  };

  // Find max values for visual chart scaling
  const maxPageViews = Math.max(...dailyStats.map(d => d.pageViews || 0), 10);

  const todayPV = todayStat?.pageViews ?? summary?.todayPageViews ?? 0;
  const todayUsers = todayStat?.uniqueUsersCount ?? summary?.todayUniqueUsers ?? 0;
  const todayAvgRatio = todayUsers > 0 ? (todayPV / todayUsers).toFixed(1) : '0';

  const monthPV = summary?.totalPageViewsMonth ?? 0;
  const monthUsers = summary?.totalUniqueUsersMonth ?? 0;
  const monthAvgRatio = monthUsers > 0 ? (monthPV / monthUsers).toFixed(1) : '0';

  const todayVisitorsList = todayStat?.recentVisitors || 
    (todayStat?.visitors ? Object.values(todayStat.visitors) : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b101d] border border-slate-800/90 rounded-2xl w-full max-w-5xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-[#0e1526] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Statistik & Trafik Kunjungan Web
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Realtime Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemantauan harian Page Views & Pengunjung Unik (Rekapitulasi 1 Bulan Penuh)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              title="Perbarui Data"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-200">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Card 1: Page Views Hari Ini */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-blue-400 text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Page Views Hari Ini
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Hari Ini
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {todayPV.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-400 ml-1.5">kali dibuka</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total halaman diakses/dimuat hari ini
              </p>
            </div>

            {/* Card 2: User Views Hari Ini (Unique Users) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  User Views Hari Ini
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Pengguna Unik
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {todayUsers.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-400 ml-1.5">pengguna</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Pengunjung unik yang datang hari ini
              </p>
            </div>

            {/* Card 3: Rasio Kunjungan / User */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  Rata-rata Buka / User
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Frekuensi
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {todayAvgRatio}x
                <span className="text-xs font-normal text-slate-400 ml-1.5">per orang</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Rata-rata 1 orang membuka web berulang
              </p>
            </div>

            {/* Card 4: Rekapitulasi 1 Bulan (30 Hari) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center justify-between text-purple-400 text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Total Rekap 30 Hari
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  1 Bulan
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {monthPV.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-400 ml-1.5">PV</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Dari <strong className="text-purple-300">{monthUsers}</strong> total pengguna unik 1 bulan
              </p>
            </div>

          </div>

          {/* Explanation Box of the 2 Metrics */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row gap-4 items-start">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>Aturan Perhitungan Statistik ZAIN.NET (Sesuai Permintaan):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                  <div className="font-bold text-blue-400 flex items-center gap-1 mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>1. Jumlah Page View per Day</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Menghitung total frekuensi web dibuka/dimuat. Jika 1 user yang sama membuka atau merefresh web 5 kali dalam sehari, maka sistem menambahkan <strong>5 Page Views</strong>.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                  <div className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>2. Jumlah User View per Day</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Menghitung berapa banyak pengguna fisik/unik yang mengunjungi web per hari. Walaupun 1 orang membuka web berulang kali, dihitung tetap <strong>1 Pengguna Unik</strong> untuk hari tersebut.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Tools for Admin to Verify Live Counting */}
          {isAdmin && (
            <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-300">
                    Uji Coba Langsung (Simulasi Penghitungan Realtime):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulatePing('same_user')}
                    disabled={isSimulating}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Tes User Sama Buka Lagi (+1 PV)</span>
                  </button>
                  <button
                    onClick={() => handleSimulatePing('new_user')}
                    disabled={isSimulating}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Users className="w-3 h-3" />
                    <span>Tes Pengunjung Baru (+1 PV & +1 User)</span>
                  </button>
                </div>
              </div>
              {simulationMessage && (
                <div className="p-2 rounded bg-amber-900/40 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{simulationMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'chart'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Grafik 30 Hari (1 Bulan)</span>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'table'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tabel Rekapitulasi</span>
              </button>
              <button
                onClick={() => setActiveTab('visitors')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'visitors'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pengunjung Hari Ini ({todayVisitorsList.length})</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                Page Views
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                User Views
              </span>
            </div>
          </div>

          {/* TAB 1: Visual Interactive 30-Day Bar Chart */}
          {activeTab === 'chart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Grafik Kunjungan Harian (Rentang 30 Hari Terakhir)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Klik pada salah satu batang tanggal untuk melihat rincian detail kunjungan hari tersebut
                    </p>
                  </div>
                  {selectedDayDetail && (
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-indigo-300">
                        {selectedDayDetail.formattedDate}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-blue-400">{selectedDayDetail.pageViews} PV</strong> • <strong className="text-emerald-400">{selectedDayDetail.uniqueUsersCount} User</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bars Stage */}
                <div className="h-56 flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-1 border-b border-slate-800 overflow-x-auto">
                  {dailyStats.map((day) => {
                    const isToday = day.date === getJakartaDateString();
                    const isSelected = selectedDayDetail?.date === day.date;
                    
                    // Height percentage relative to max
                    const pvHeight = Math.max(Math.round(((day.pageViews || 0) / maxPageViews) * 100), (day.pageViews > 0 ? 6 : 2));
                    const uvHeight = Math.max(Math.round(((day.uniqueUsersCount || 0) / maxPageViews) * 100), (day.uniqueUsersCount > 0 ? 6 : 2));

                    return (
                      <div
                        key={day.date}
                        onClick={() => setSelectedDayDetail(day)}
                        className={`flex-1 min-w-[20px] sm:min-w-[24px] h-full flex flex-col justify-end items-center group cursor-pointer p-0.5 rounded-t transition-all ${
                          isSelected ? 'bg-indigo-950/60 ring-1 ring-indigo-500' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-20 bg-slate-900 border border-slate-700 text-[10px] p-2 rounded-lg shadow-xl pointer-events-none z-20 whitespace-nowrap">
                          <p className="font-bold text-white">{day.formattedDate}</p>
                          <p className="text-blue-400">Page Views: {day.pageViews}</p>
                          <p className="text-emerald-400">Unique Users: {day.uniqueUsersCount}</p>
                        </div>

                        {/* Dual Bars */}
                        <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                          {/* Page View Bar (Blue) */}
                          <div
                            style={{ height: `${pvHeight}%` }}
                            className={`w-1/2 rounded-t transition-all ${
                              day.pageViews > 0
                                ? (isToday ? 'bg-gradient-to-t from-blue-700 to-blue-400' : 'bg-blue-500/80 group-hover:bg-blue-400')
                                : 'bg-slate-800/40'
                            }`}
                          ></div>
                          {/* User View Bar (Emerald) */}
                          <div
                            style={{ height: `${uvHeight}%` }}
                            className={`w-1/2 rounded-t transition-all ${
                              day.uniqueUsersCount > 0
                                ? (isToday ? 'bg-gradient-to-t from-emerald-700 to-emerald-400' : 'bg-emerald-500/80 group-hover:bg-emerald-400')
                                : 'bg-slate-800/40'
                            }`}
                          ></div>
                        </div>

                        {/* Date label */}
                        <span className={`text-[9px] font-mono mt-2 truncate w-full text-center ${
                          isToday ? 'text-amber-400 font-bold' : 'text-slate-500'
                        }`}>
                          {day.date.split('-')[2]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 font-mono">
                  <span>30 Hari Lalu</span>
                  <span>Rentang Tanggal (1 Bulan)</span>
                  <span className="text-amber-400 font-bold">Hari Ini ({getJakartaDateString()})</span>
                </div>
              </div>

              {/* Selected Day Quick Inspector */}
              {selectedDayDetail && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400">Rincian Tanggal Terpilih:</span>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedDayDetail.formattedDate}</span>
                      {selectedDayDetail.date === getJakartaDateString() && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          Hari Ini
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px]">Page Views</span>
                      <p className="font-mono font-bold text-blue-400 text-sm">{selectedDayDetail.pageViews}x</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px]">Pengguna Unik</span>
                      <p className="font-mono font-bold text-emerald-400 text-sm">{selectedDayDetail.uniqueUsersCount} orang</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px]">Frekuensi / User</span>
                      <p className="font-mono font-bold text-amber-400 text-sm">
                        {selectedDayDetail.uniqueUsersCount > 0 
                          ? (selectedDayDetail.pageViews / selectedDayDetail.uniqueUsersCount).toFixed(1) + 'x'
                          : '0x'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Full 30-Day Table Recap */}
          {activeTab === 'table' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#090e1a] text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Page Views (Buka)</th>
                        <th className="p-3 text-right">User Views (Unik)</th>
                        <th className="p-3 text-right">Frekuensi / User</th>
                        <th className="p-3 text-center">Aktivitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {dailyStats.slice().reverse().map((item) => {
                        const isToday = item.date === getJakartaDateString();
                        const avg = item.uniqueUsersCount > 0 ? (item.pageViews / item.uniqueUsersCount).toFixed(1) : '0';
                        return (
                          <tr 
                            key={item.date} 
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isToday ? 'bg-indigo-950/20' : ''
                            }`}
                          >
                            <td className="p-3 font-sans font-medium text-slate-200">
                              {item.formattedDate}
                              <span className="block text-[10px] text-slate-500 font-mono">{item.date}</span>
                            </td>
                            <td className="p-3 text-center font-sans">
                              {isToday ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                  Hari Ini
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-400">
                              {item.pageViews.toLocaleString('id-ID')} PV
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400">
                              {item.uniqueUsersCount.toLocaleString('id-ID')} User
                            </td>
                            <td className="p-3 text-right text-amber-300 font-bold">
                              {avg}x
                            </td>
                            <td className="p-3 text-center">
                              {item.pageViews > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-sans text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Ada Trafik
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[10px] font-sans">
                                  Belum Ada
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Today's Detailed Visitors Stream */}
          {activeTab === 'visitors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Log Pengunjung Hari Ini ({todayVisitorsList.length} Pengguna)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Daftar mahasiswa / tamu yang mengunjungi ZAIN.NET sepanjang hari ini
                  </p>
                </div>
              </div>

              {todayVisitorsList.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Belum ada kunjungan yang tercatat hari ini</p>
                  <p className="text-xs text-slate-500">
                    Buka kembali halaman utama atau klik tombol simulasi di atas untuk melihat pencatatan otomatis.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todayVisitorsList.map((vis, idx) => {
                    const firstTime = new Date(vis.firstSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    const lastTime = new Date(vis.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div 
                        key={vis.id || idx}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center text-white text-xs font-black">
                              {vis.isLoggedIn ? (vis.userName?.[0] || 'U') : 'G'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-white">
                                  {vis.userName || (vis.isLoggedIn ? 'Mahasiswa Terdaftar' : 'Pengunjung Tamu')}
                                </h4>
                                {vis.isLoggedIn ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Login
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                    Tamu
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                                {vis.userEmail || vis.id}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black font-mono">
                              {vis.views}x Buka
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Laptop className="w-3 h-3 text-slate-500" />
                            <span>{vis.osName || 'Windows'} • {vis.browserName || 'Browser'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Jam: {lastTime} WIB</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090e1a] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zona Waktu: Asia/Jakarta (WIB) • Statistik diperbarui otomatis</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer text-xs"
          >
            Tutup Statistik
          </button>
        </div>

      </div>
    </div>
  );
};
