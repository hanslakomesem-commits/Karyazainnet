import { appPathname } from './utils/deploymentBridge';
import { database } from './storage/client';
import { hydrateUserSessions, getSessionForTool } from './utils/sessionTracker';
import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  onAuthStateChanged, 
  logoutUser, 
  auth, 
  db, 
  signInWithCredential,
  GoogleAuthProvider,
  type User 
} from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  increment
} from './storage/documents';
import { 
  categoriesData, 
  defaultPaymentConfig, 
  defaultRolesConfig, 
  resolveUserRole, 
  defaultCustomPrices, 
  applyCustomPricesToCategories,
  isIframeTool
} from './data/toolsData';
import { initialSampleDocuments } from './data/sampleDocuments';
import { 
  ToolCategory, 
  ToolItem, 
  UserPurchase, 
  UserQuotas, 
  PaymentConfig, 
  UserRole, 
  RolesConfig, 
  UserLoyalty, 
  defaultLoyalty,
  CustomPricesConfig,
  UserDocumentItem,
  ResellerTrials,
  RESELLER_MAX_FREE_TRIALS,
  AppUser,
  DeviceTrialRecord,
  FreeTrialStatus,
  DailyTrafficStat
} from './types';
import { recordWebTrafficVisit, subscribeToTodayTraffic } from './utils/trafficTracker';
import { playSuccessChime } from './utils/audioAlert';
const TrafficStatsModal = lazy(() => import('./components/TrafficStatsModal').then(m => ({ default: m.TrafficStatsModal })));
import { collectDeviceFingerprint } from './utils/deviceFingerprint';
const FreeTrialClaimModal = lazy(() => import('./components/FreeTrialClaimModal').then(m => ({ default: m.FreeTrialClaimModal })));
import { FreeTrialHomeBanner } from './components/FreeTrialHomeBanner';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { CategorySection } from './components/CategorySection';
const ToolViewerModal = lazy(() => import('./components/ToolViewerModal').then(m => ({ default: m.ToolViewerModal })));
const UserProfileModal = lazy(() => import('./components/UserProfileModal').then(m => ({ default: m.UserProfileModal })));
const RoleManagementModal = lazy(() => import('./components/RoleManagementModal').then(m => ({ default: m.RoleManagementModal })));
import type { CheckoutTarget } from './components/ManualQrisPaymentModal';
const ManualQrisPaymentModal = lazy(() => import('./components/ManualQrisPaymentModal').then(m => ({ default: m.ManualQrisPaymentModal })));
const ManualQrisSettingsModal = lazy(() => import('./components/ManualQrisSettingsModal').then(m => ({ default: m.ManualQrisSettingsModal })));
const AdminVerificationModal = lazy(() => import('./components/AdminVerificationModal').then(m => ({ default: m.AdminVerificationModal })));
const AdminPinModal = lazy(() => import('./components/AdminPinModal').then(m => ({ default: m.AdminPinModal })));
import { WhatsAppSupportWidget } from './components/WhatsAppSupportWidget';
import { LoyaltyBanner } from './components/LoyaltyBanner';
import { HeroSection } from './components/HeroSection';
import { TrustBadges } from './components/TrustBadges';
import { Footer } from './components/Footer';
const RewardCelebrationModal = lazy(() => import('./components/RewardCelebrationModal').then(m => ({ default: m.RewardCelebrationModal })));
const AdminAnalyticsModal = lazy(() => import('./components/AdminAnalyticsModal').then(m => ({ default: m.AdminAnalyticsModal })));
const PriceManagementModal = lazy(() => import('./components/PriceManagementModal').then(m => ({ default: m.PriceManagementModal })));
const DocumentArchiveModal = lazy(() => import('./components/DocumentArchiveModal').then(m => ({ default: m.DocumentArchiveModal })));
const TopUpModal = lazy(() => import('./components/TopUpModal').then(m => ({ default: m.TopUpModal })));
import { WalletHomeBanner } from './components/WalletHomeBanner';
import { AuthBridgeView } from './components/AuthBridgeView';
const NotaJilidView = lazy(() => import('./components/NotaJilidView').then(m => ({ default: m.NotaJilidView })));
const SewaTogaView = lazy(() => import('./components/SewaTogaView').then(m => ({ default: m.SewaTogaView })));
const GabungFileApp = lazy(() => import('./gabungFile/App'));
const ArtikelGeminiView = lazy(() => import('./components/ArtikelGeminiView').then(m => ({ default: m.ArtikelGeminiView })));
const HardCoverView = lazy(() => import('./components/HardCoverView').then(m => ({ default: m.HardCoverView })));
const JournalConverterApp = lazy(() => import('./journalConverter/App'));
const PisahSkripsiApp = lazy(() => import('./pisahSkripsi/App'));
import { IframeLockedModal } from './components/IframeLockedModal';
import { IframeLockedPageView } from './components/IframeLockedPageView';
import { MakalahPost, AgcPost } from './types';
const MakalahBlogView = lazy(() => import('./components/MakalahBlogView').then(m => ({ default: m.MakalahBlogView })));
const AgcBlogView = lazy(() => import('./components/AgcBlogView').then(m => ({ default: m.AgcBlogView })));
const TemplateJurnalManager = lazy(() => import('./components/TemplateJurnalManager').then(m => ({ default: m.TemplateJurnalManager })));
const MakalahBatchUploadModal = lazy(() => import('./components/MakalahBatchUploadModal').then(m => ({ default: m.MakalahBatchUploadModal })));
const AgcAutoPostModal = lazy(() => import('./components/AgcAutoPostModal').then(m => ({ default: m.AgcAutoPostModal })));
const fetchMakalahPosts = () => import('./utils/makalahService').then(m => m.fetchMakalahPosts());
const fetchMakalahBySlug = (slug: string) => import('./utils/makalahService').then(m => m.fetchMakalahBySlug(slug));
const deleteMakalahPost = (id: string) => import('./utils/makalahService').then(m => m.deleteMakalahPost(id));
const fetchAgcPosts = () => import('./utils/agcService').then(m => m.fetchAgcPosts());
import { SESSION_SECURITY_EPOCH, migrateLegacyLocalAccountsToSupabase } from './utils/authService';
import { 
  Sparkles, 
  FileText, 
  Scissors, 
  Hash, 
  BookOpen, 
  Star,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
  Unlock,
  QrCode,
  Flame,
  Zap,
  CheckCircle2,
  Building2,
  MessageCircle,
  HelpCircle,
  Clock,
  Crown,
  Users,
  Gift,
  BarChart3,
  Tag,
  FolderArchive,
  Wallet,
  AlertTriangle,
  KeyRound,
  LogOut,
  UserCheck,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';

function AcademicHubMainApp({ onNavigateToPath, initialToolId }: { onNavigateToPath?: (path: string) => void; initialToolId?: string }) {
  // Security epoch enforcement: Automatically log out all accounts that were logged in before password reset
  if (typeof window !== 'undefined') {
    const epoch = localStorage.getItem('zain_auth_epoch');
    if (epoch !== SESSION_SECURITY_EPOCH) {
      localStorage.removeItem('zain_custom_auth_user');
      localStorage.removeItem('zain_guest_session');
      localStorage.removeItem('zain_last_active_role');
      localStorage.removeItem('zain_role_impersonate');
      localStorage.setItem('zain_auth_epoch', SESSION_SECURITY_EPOCH);
    }
  }

  const [user, setUser] = useState<User | AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zain_guest_session') === 'true';
    }
    return false;
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showPinLoginModal, setShowPinLoginModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState<boolean>(false);
  const [showRewardCelebration, setShowRewardCelebration] = useState<boolean>(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showPriceManagementModal, setShowPriceManagementModal] = useState<boolean>(false);
  const [showDocumentArchiveModal, setShowDocumentArchiveModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showTopUpModal, setShowTopUpModal] = useState<boolean>(false);
  const [topUpPresetAmount, setTopUpPresetAmount] = useState<number | undefined>(undefined);
  const [showTrafficStatsModal, setShowTrafficStatsModal] = useState<boolean>(false);
  const [todayTraffic, setTodayTraffic] = useState<DailyTrafficStat | null>(null);

  // Makalah, AGC Blog & Template Jurnal State
  const [currentView, setCurrentView] = useState<'tools' | 'blog' | 'agc_blog' | 'template_jurnal'>(() => {
    if (typeof window !== 'undefined') {
      const p = appPathname();
      const s = new URLSearchParams(window.location.search);
      if (p.startsWith('/template') || s.get('view') === 'template' || s.get('view') === 'template_jurnal') {
        return 'template_jurnal';
      }
      if (p.startsWith('/agc') || s.get('view') === 'agc' || s.get('view') === 'agc_blog') {
        return 'agc_blog';
      }
      if (
        p.startsWith('/makalah') || 
        p.startsWith('/blog') || 
        s.get('view') === 'blog' || 
        s.has('makalah') || 
        s.has('post')
      ) {
        return 'blog';
      }
    }
    return 'tools';
  });
  const [makalahPosts, setMakalahPosts] = useState<MakalahPost[]>([]);
  const [agcPosts, setAgcPosts] = useState<AgcPost[]>([]);
  const [showAgcAutoPostModal, setShowAgcAutoPostModal] = useState<boolean>(false);
  const [selectedMakalah, setSelectedMakalah] = useState<MakalahPost | null>(null);
  const [showBatchUploadModal, setShowBatchUploadModal] = useState<boolean>(false);
  const [showMakalahAdmin, setShowMakalahAdmin] = useState<boolean>(false);

  // 1x Free Trial Anti-Abuse (Hardware, Windows & IP Lock) State
  const [freeTrialStatus, setFreeTrialStatus] = useState<FreeTrialStatus | null>(null);
  const [isCheckingTrialEligibility, setIsCheckingTrialEligibility] = useState<boolean>(true);
  const [freeTrialTargetTool, setFreeTrialTargetTool] = useState<ToolItem | null>(null);
  const [showFreeTrialModal, setShowFreeTrialModal] = useState<boolean>(false);

  // User Wallet Balance (Saldo Akun)
  const [userWalletBalance, setUserWalletBalance] = useState<number>(0);

  // Loyalty Program State: Buy 3 get 1 free
  const [loyalty, setLoyalty] = useState<UserLoyalty>(defaultLoyalty);

  // Dynamic Custom Prices state (Admin editable)
  const [customPrices, setCustomPrices] = useState<CustomPricesConfig>(() => {
    const saved = localStorage.getItem('zain_custom_prices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { 
          ...defaultCustomPrices, 
          ...parsed,
          itemPrices: {
            ...defaultCustomPrices.itemPrices,
            ...(parsed.itemPrices || {}),
            'ref-1': (parsed.itemPrices?.['ref-1'] === 20000 || !parsed.itemPrices?.['ref-1']) ? 2000 : parsed.itemPrices['ref-1']
          },
          categoryPrices: {
            ...defaultCustomPrices.categoryPrices,
            ...(parsed.categoryPrices || {}),
            7: (parsed.categoryPrices?.[7] === 20000 || !parsed.categoryPrices?.[7]) ? 2000 : parsed.categoryPrices[7]
          }
        };
        return merged;
      } catch (e) {}
    }
    return defaultCustomPrices;
  });

  // User Document Archive state
  const [documents, setDocuments] = useState<UserDocumentItem[]>(() => {
    const saved = localStorage.getItem('zain_user_documents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialSampleDocuments;
  });

  // Payment & Config state (Manual QRIS & Bank Transfer)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(() => {
    const saved = localStorage.getItem('zain_manual_qris_config') || localStorage.getItem('zain_midtrans_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...defaultPaymentConfig, 
          ...parsed,
          bankAccounts: (parsed.bankAccounts && parsed.bankAccounts.length > 0) ? parsed.bankAccounts : defaultPaymentConfig.bankAccounts,
          // Always lock the official merchant, NMID and QRIS payload string
          merchantName: defaultPaymentConfig.merchantName,
          nmid: defaultPaymentConfig.nmid,
          terminalId: defaultPaymentConfig.terminalId,
          printedBy: defaultPaymentConfig.printedBy,
          qrisString: defaultPaymentConfig.qrisString
        };
      } catch (e) {}
    }
    return defaultPaymentConfig;
  });

  // 3-Tier Roles Configuration (Admin, Reseller, Public)
  const [rolesConfig, setRolesConfig] = useState<RolesConfig>(() => {
    const saved = localStorage.getItem('zain_roles_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mergedAdmin = Array.from(new Set([...defaultRolesConfig.adminEmails, ...(parsed.adminEmails || [])]));
        const mergedReseller = Array.from(new Set([...defaultRolesConfig.resellerEmails, ...(parsed.resellerEmails || [])]));
        return { 
          ...defaultRolesConfig, 
          ...parsed,
          adminEmails: mergedAdmin,
          resellerEmails: mergedReseller
        };
      } catch (e) {}
    }
    return defaultRolesConfig;
  });

  // ZAINNET_SUPABASE_ADMIN_AUTH_V1: admin must come from an authenticated Supabase event.
  const [verifiedAdminUid, setVerifiedAdminUid] = useState<string | null>(null);
  const userRole: UserRole = (user?.uid && user.uid === verifiedAdminUid) 
    ? 'admin' 
    : (user?.uid && (user as any)?.role === 'reseller' && (user as any)?.isCustomAuth === false)
    ? 'reseller'
    : 'public';

  // Apply custom prices dynamically to categories
  const categories: ToolCategory[] = useMemo(() => {
    return applyCustomPricesToCategories(categoriesData, customPrices);
  }, [customPrices]);

  // Pay-per-use quotas state: { [toolId: string]: number of available creation sessions }
  const [userQuotas, setUserQuotas] = useState<UserQuotas>({});
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [allPurchasesForAdmin, setAllPurchasesForAdmin] = useState<UserPurchase[]>([]);
  const processedPurchaseIdsRef = useRef<Set<string>>(new Set());

  // Reseller Free Trial state: { [toolId: string]: number of used trial sessions (0-3) }
  const [resellerTrials, setResellerTrials] = useState<ResellerTrials>({});

  // Checkout modal target
  const [checkoutTarget, setCheckoutTarget] = useState<CheckoutTarget | null>(null);

  // Accordion open state (id of open section, or null — default null so all menus 1-8 start closed)
  const [openSectionId, setOpenSectionId] = useState<number | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<number | 'all' | 'favorites'>('all');
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState<boolean>(false);

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Active tool opened in iframe modal
  const [activeTool, setActiveTool] = useState<ToolItem | null>(null);

  // Modal peringatan modul berbasis link iframe khusus admin
  const [selectedIframeLockedTool, setSelectedIframeLockedTool] = useState<ToolItem | null>(null);
  const [showIframeLockedModal, setShowIframeLockedModal] = useState<boolean>(false);

  // Blog data is needed on demand; opening those views triggers their first fetch.
  useEffect(() => {
    if (currentView === 'blog' && makalahPosts.length === 0) {
      fetchMakalahPosts().then(setMakalahPosts).catch(console.warn);
    }
    if (currentView === 'agc_blog' && agcPosts.length === 0) {
      fetchAgcPosts().then(setAgcPosts).catch(console.warn);
    }
  }, [currentView]);

  // Handle bridge redirect sign-in callback if redirected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authIdToken = params.get('auth_id_token');
    const authAccessToken = params.get('auth_access_token');

    if (authIdToken) {
      params.delete('auth_id_token');
      params.delete('auth_access_token');
      const cleanSearch = params.toString();
      const cleanUrl = appPathname() + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);

      const credential = GoogleAuthProvider.credential(authIdToken, authAccessToken || undefined);
      signInWithCredential(auth, credential).catch((err) => {
        console.error('Failed to sign in from bridge redirect token:', err);
      });
    }
  }, []);

  // Realtime subscription for global transactions (for Admin verification & real-time badge count)
  useEffect(() => {
    if (userRole !== 'admin') return;
    try {
      const trxCol = collection(db, 'transactions');
      const unsubscribeTrx = onSnapshot(trxCol, (snapshot) => {
        const globalPurchList: UserPurchase[] = [];
        snapshot.forEach((d: any) => {
          globalPurchList.push(d.data() as UserPurchase);
        });
        globalPurchList.sort((a, b) => b.purchasedAt - a.purchasedAt);
        setAllPurchasesForAdmin(globalPurchList);
      }, (err) => {
        console.warn('Realtime transactions snapshot listener error:', err);
      });

      return () => unsubscribeTrx();
    } catch (e) {
      console.warn('Error establishing transactions snapshot:', e);
    }
  }, [userRole]);

  // Web Traffic Tracking & Live Today's Traffic Listener (Page Views & User Views per Day)
  useEffect(() => {
    recordWebTrafficVisit(user).catch((err) => {
      console.warn('Traffic visit record warning:', err);
    });

    if (userRole !== 'admin') return;
    const unsubscribeTraffic = subscribeToTodayTraffic((stat) => {
      setTodayTraffic(stat);
    });

    return () => unsubscribeTraffic();
  }, [user?.uid, userRole]);

  // Realtime subscription for current user's wallet balance
  useEffect(() => {
    if (!user) return;
    try {
      const walletRef = doc(db, 'users', user.uid, 'data', 'wallet');
      const unsubscribeWallet = onSnapshot(walletRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let incomingBal: number | null = null;
          if (typeof data?.balance === 'number') {
            incomingBal = data.balance;
          } else if (data?.balance && typeof data.balance.__academic_increment === 'number') {
            incomingBal = data.balance.__academic_increment;
          } else if (typeof data?.walletBalance === 'number') {
            incomingBal = data.walletBalance;
          }
          if (incomingBal !== null) {
            setUserWalletBalance((prev) => {
              if (incomingBal === 0 && prev > 0) return prev;
              return incomingBal;
            });
            if (incomingBal > 0) {
              localStorage.setItem(`zain_wallet_${user.uid}`, incomingBal.toString());
              if (user.email) {
                localStorage.setItem(`zain_wallet_${user.email}`, incomingBal.toString());
              }
            }
          }
        }
      }, (err) => {
        console.warn('Realtime wallet subscription warning:', err);
      });

      return () => unsubscribeWallet();
    } catch (err) {
      console.warn('Error subscribing to wallet:', err);
    }
  }, [user?.uid]);

  // Realtime subscription for current user's quotas
  useEffect(() => {
    if (!user) return;
    try {
      const quotaRef = doc(db, 'users', user.uid, 'data', 'quotas');
      const unsubscribeQuota = onSnapshot(quotaRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserQuotas;
          if (data && typeof data === 'object') {
            setUserQuotas(data);
            localStorage.setItem(`zain_quotas_${user.uid}`, JSON.stringify(data));
          }
        }
      }, (err) => {
        console.warn('Realtime quota subscription warning:', err);
      });

      return () => unsubscribeQuota();
    } catch (err) {
      console.warn('Error subscribing to quotas:', err);
    }
  }, [user?.uid]);

  // Auto-reconcile wallet balance: Ensure user never loses credited top-up balance
  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    const completedTopups = purchases.filter(p => p.itemType === 'topup' && (p.status === 'completed' || p.status === 'settlement'));
    if (completedTopups.length === 0) return;

    const totalTopup = completedTopups.reduce((sum, p) => sum + (p.amountPaid || p.originalAmount || 0), 0);
    const walletSpent = purchases
      .filter(p => p.itemType !== 'topup' && (p.paymentType === 'wallet_balance' || p.method === 'wallet' || p.method === 'wallet_balance'))
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const netCredit = Math.max(0, totalTopup - walletSpent);
    if (netCredit > 0 && userWalletBalance < netCredit) {
      setUserWalletBalance(netCredit);
      localStorage.setItem(`zain_wallet_${user.uid}`, netCredit.toString());
      if (user.email) localStorage.setItem(`zain_wallet_${user.email}`, netCredit.toString());

      // Persist restored balance to Supabase
      setDoc(doc(db, 'users', user.uid, 'data', 'wallet'), {
        userId: user.uid,
        userEmail: user.email || '',
        balance: netCredit,
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});

      setDoc(doc(db, 'users', user.uid), {
        walletBalance: netCredit,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});

      if (user.email) {
        const emailDocId = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        setDoc(doc(db, 'wallets_by_email', emailDocId), {
          userId: user.uid,
          userEmail: user.email,
          balance: netCredit,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    }
  }, [user?.uid, user?.email, purchases, userWalletBalance]);

  // Load global roles config, dynamic prices, QRIS config & listen to Auth state
  useEffect(() => {
    // Load remote roles, prices, and QRIS config from Firestore & bootstrap defaults if fresh
    const loadRemoteConfigs = async () => {
      try {
        const [rolesSnap, pricesSnap, qrisSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'roles_config')),
          getDoc(doc(db, 'settings', 'prices')),
          getDoc(doc(db, 'settings', 'qris_config'))
        ]);
        if (rolesSnap.exists()) {
          const remoteRoles = rolesSnap.data() as RolesConfig;
          const mergedConfig: RolesConfig = {
            ...defaultRolesConfig,
            ...remoteRoles,
            adminEmails: Array.from(new Set([...defaultRolesConfig.adminEmails, ...(remoteRoles.adminEmails || [])])),
            resellerEmails: Array.from(new Set([...defaultRolesConfig.resellerEmails, ...(remoteRoles.resellerEmails || [])])),
          };
          setRolesConfig(mergedConfig);
          localStorage.setItem('zain_roles_config', JSON.stringify(mergedConfig));
        } else {
          // Initialize remote roles in Firestore
          await setDoc(doc(db, 'settings', 'roles_config'), defaultRolesConfig, { merge: true });
        }


        if (pricesSnap.exists()) {
          const remotePrices = pricesSnap.data() as CustomPricesConfig;
          const mergedPrices = { 
            ...defaultCustomPrices, 
            ...remotePrices,
            itemPrices: {
              ...defaultCustomPrices.itemPrices,
              ...(remotePrices.itemPrices || {}),
              'ref-1': (remotePrices.itemPrices?.['ref-1'] === 20000 || !remotePrices.itemPrices?.['ref-1']) ? 2000 : remotePrices.itemPrices['ref-1']
            },
            categoryPrices: {
              ...defaultCustomPrices.categoryPrices,
              ...(remotePrices.categoryPrices || {}),
              7: (remotePrices.categoryPrices?.[7] === 20000 || !remotePrices.categoryPrices?.[7]) ? 2000 : remotePrices.categoryPrices[7]
            }
          };
          setCustomPrices(mergedPrices);
          localStorage.setItem('zain_custom_prices', JSON.stringify(mergedPrices));
          // If remote had outdated 20000 price for ref-1 or category 7, sync new 2000 price to Firestore
          if (remotePrices.itemPrices?.['ref-1'] === 20000 || remotePrices.categoryPrices?.[7] === 20000) {
            await setDoc(doc(db, 'settings', 'prices'), mergedPrices, { merge: true });
          }
        } else {
          // Initialize remote prices in Firestore
          await setDoc(doc(db, 'settings', 'prices'), defaultCustomPrices, { merge: true });
        }


        if (qrisSnap.exists()) {
          const remoteQris = qrisSnap.data() as PaymentConfig;
          const mergedQris = { 
            ...defaultPaymentConfig, 
            ...remoteQris,
            enableUniqueCode: false,
            bankAccounts: (remoteQris.bankAccounts && remoteQris.bankAccounts.length > 0) ? remoteQris.bankAccounts : defaultPaymentConfig.bankAccounts,
            merchantName: defaultPaymentConfig.merchantName,
            nmid: defaultPaymentConfig.nmid,
            terminalId: defaultPaymentConfig.terminalId,
            printedBy: defaultPaymentConfig.printedBy,
            qrisString: defaultPaymentConfig.qrisString
          };
          setPaymentConfig(mergedQris);
          localStorage.setItem('zain_manual_qris_config', JSON.stringify(mergedQris));
          // Ensure enableUniqueCode is disabled in Firestore as requested
          if (remoteQris.enableUniqueCode !== false) {
            await setDoc(doc(db, 'settings', 'qris_config'), { enableUniqueCode: false }, { merge: true });
          }
        } else {
          // Initialize remote QRIS config in Firestore
          await setDoc(doc(db, 'settings', 'qris_config'), defaultPaymentConfig, { merge: true });
        }
      } catch (err) {
        console.warn('Could not load remote settings config:', err);
      }
    };
    loadRemoteConfigs();
    migrateLegacyLocalAccountsToSupabase().catch(console.warn);

    // Fetch Makalah posts on mount & handle direct URL paths (/makalah/slug, /blog/slug, ?view=blog, ?makalah=slug)
    const pathname = typeof window !== 'undefined' ? appPathname() : '';
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const viewParam = params.get('view');
    
    let targetMakalahSlug = params.get('makalah') || params.get('post');
    if (!targetMakalahSlug) {
      if (pathname.startsWith('/makalah/')) {
        targetMakalahSlug = decodeURIComponent(pathname.replace('/makalah/', '').replace(/\/$/, ''));
      } else if (pathname.startsWith('/blog/')) {
        targetMakalahSlug = decodeURIComponent(pathname.replace('/blog/', '').replace(/\/$/, ''));
      }
    }

    if (viewParam === 'blog' || targetMakalahSlug || pathname === '/blog' || pathname.startsWith('/makalah')) {
      setCurrentView('blog');
    }

    if (targetMakalahSlug) {
      fetchMakalahBySlug(targetMakalahSlug).then(found => {
        if (found) {
          setSelectedMakalah(found);
        }
      }).catch(console.warn);
    }

    if (viewParam === 'blog' || targetMakalahSlug || pathname === '/blog' || pathname.startsWith('/makalah')) fetchMakalahPosts().then(posts => {
      if (posts && posts.length > 0) {
        setMakalahPosts(posts);

        if (targetMakalahSlug) {
          const cleanTarget = targetMakalahSlug.trim().toLowerCase();
          const found = posts.find(p => 
            (p.slug && p.slug.toLowerCase() === cleanTarget) || 
            (p.id && p.id.toLowerCase() === cleanTarget) ||
            (p.slug && p.slug.toLowerCase().includes(cleanTarget)) ||
            (cleanTarget.includes((p.slug || '').toLowerCase()) && (p.slug || '').length > 5) ||
            p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(cleanTarget)
          );
          if (found) {
            setSelectedMakalah(found);
          }
        }
      }
    }).catch(console.warn);

    // Fetch AGC posts automatically
    if (viewParam === 'agc' || viewParam === 'agc_blog' || pathname.startsWith('/agc')) fetchAgcPosts().then(posts => {
      if (posts && posts.length > 0) {
        setAgcPosts(posts);
      }
    }).catch(console.warn);

    // Browser navigation (Back / Forward buttons) support for Blog & Makalah posts
    const handlePopState = () => {
      const p = appPathname();
      const s = new URLSearchParams(window.location.search);

      if (p.startsWith('/agc') || s.get('view') === 'agc' || s.get('view') === 'agc_blog') {
        setCurrentView('agc_blog');
        return;
      }

      let slug = s.get('makalah') || s.get('post');
      if (!slug) {
        if (p.startsWith('/makalah/')) {
          slug = decodeURIComponent(p.replace('/makalah/', '').replace(/\/$/, ''));
        } else if (p.startsWith('/blog/')) {
          slug = decodeURIComponent(p.replace('/blog/', '').replace(/\/$/, ''));
        }
      }

      if (p.startsWith('/makalah') || p.startsWith('/blog') || s.get('view') === 'blog' || slug) {
        setCurrentView('blog');
        if (slug) {
          fetchMakalahBySlug(slug).then(post => {
            if (post) setSelectedMakalah(post);
          }).catch(console.warn);
        } else {
          setSelectedMakalah(null);
        }
      } else if (p === '/' && !s.get('view')) {
        setCurrentView('tools');
        setSelectedMakalah(null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // ZAINNET_SUPABASE_ADMIN_AUTH_V1: trust only Supabase Auth's app_metadata claim.
      const validAdmin = !!currentUser && !!currentUser.uid &&
        currentUser.email?.trim().toLowerCase() === 'hanslakomesem@gmail.com' &&
        (currentUser as any).role === 'admin' && !(currentUser as any).isCustomAuth;
      setVerifiedAdminUid(validAdmin ? currentUser.uid : null);
      setUser(currentUser);
      if (currentUser) {
        void hydrateUserSessions(currentUser.uid).catch(console.warn);
        setIsGuest(false);
        setShowLoginModal(false);
        
        // Sync user profile to Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            lastLoginAt: new Date().toISOString()
          }, { merge: true });

          // Load user favorites from Firestore
          const favsCol = collection(db, 'users', currentUser.uid, 'favorites');
          const favsSnap = await getDocs(favsCol);
          const favSet = new Set<string>();
          favsSnap.forEach((d) => favSet.add(d.id));
          setFavorites(favSet);

          // Load user documents from Firestore & migrate guest documents if any
          const docsCol = collection(db, 'users', currentUser.uid, 'documents');
          const docsSnap = await getDocs(docsCol);
          const userDocsList: UserDocumentItem[] = [];
          docsSnap.forEach((d) => {
            userDocsList.push(d.data() as UserDocumentItem);
          });

          // Check if user had drafted documents as guest
          const guestDocsRaw = localStorage.getItem('zain_user_documents');
          if (guestDocsRaw) {
            try {
              const guestDocs: UserDocumentItem[] = JSON.parse(guestDocsRaw);
              for (const gDoc of guestDocs) {
                if (!userDocsList.some((d) => d.id === gDoc.id)) {
                  const syncedDoc = { ...gDoc, userId: currentUser.uid };
                  userDocsList.push(syncedDoc);
                  await setDoc(doc(db, 'users', currentUser.uid, 'documents', syncedDoc.id), syncedDoc, { merge: true });
                }
              }
              localStorage.removeItem('zain_user_documents');
            } catch (e) {}
          }

          if (userDocsList.length > 0) {
            setDocuments(userDocsList);
            localStorage.setItem(`zain_docs_${currentUser.uid}`, JSON.stringify(userDocsList));
          }

          // Load user quotas from Firestore & sync local state if fresh
          const quotaDocRef = doc(db, 'users', currentUser.uid, 'data', 'quotas');
          const quotaSnap = await getDoc(quotaDocRef);
          let loadedQuotas: UserQuotas = {};

          if (quotaSnap.exists()) {
            loadedQuotas = (quotaSnap.data() as UserQuotas) || {};
          } else {
            // Fallback from localStorage
            const localQuotas = localStorage.getItem(`zain_quotas_${currentUser.uid}`);
            const guestQuotas = localStorage.getItem('zain_guest_quotas');
            const quotasToUse = localQuotas || guestQuotas;
            if (quotasToUse) {
              try {
                loadedQuotas = JSON.parse(quotasToUse);
                // Sync to Firestore immediately
                await setDoc(quotaDocRef, loadedQuotas, { merge: true });
                localStorage.removeItem('zain_guest_quotas');
              } catch (e) {}
            }
          }
          setUserQuotas(loadedQuotas);

          // Load user loyalty from Firestore
          const loyaltyDocRef = doc(db, 'users', currentUser.uid, 'data', 'loyalty');
          const loyaltySnap = await getDoc(loyaltyDocRef);
          let loadedLoyalty: UserLoyalty = defaultLoyalty;

          if (loyaltySnap.exists()) {
            loadedLoyalty = { ...defaultLoyalty, ...(loyaltySnap.data() as UserLoyalty) };
          } else {
            const localLoyalty = localStorage.getItem(`zain_loyalty_${currentUser.uid}`) || localStorage.getItem('zain_guest_loyalty');
            if (localLoyalty) {
              try {
                loadedLoyalty = { ...defaultLoyalty, ...JSON.parse(localLoyalty) };
                await setDoc(loyaltyDocRef, loadedLoyalty, { merge: true });
                localStorage.removeItem('zain_guest_loyalty');
              } catch (e) {}
            }
          }
          setLoyalty(loadedLoyalty);

          // Load reseller trials from Firestore
          const trialsDocRef = doc(db, 'users', currentUser.uid, 'data', 'reseller_trials');
          const trialsSnap = await getDoc(trialsDocRef);
          let loadedTrials: ResellerTrials = {};

          if (trialsSnap.exists()) {
            loadedTrials = (trialsSnap.data() as ResellerTrials) || {};
          } else {
            const localTrials = localStorage.getItem(`zain_reseller_trials_${currentUser.uid}`) || localStorage.getItem('zain_guest_reseller_trials');
            if (localTrials) {
              try {
                loadedTrials = JSON.parse(localTrials);
                await setDoc(trialsDocRef, loadedTrials, { merge: true });
                localStorage.removeItem('zain_guest_reseller_trials');
              } catch (e) {}
            }
          }
          setResellerTrials(loadedTrials);

          // Load user wallet balance from Firestore/Supabase
          try {
            let loadedBal: number | null = null;
            const walletDocRef = doc(db, 'users', currentUser.uid, 'data', 'wallet');
            const walletSnap = await getDoc(walletDocRef);
            if (walletSnap.exists()) {
              const wData = walletSnap.data();
              if (typeof wData?.balance === 'number') loadedBal = wData.balance;
              else if (wData?.balance && typeof wData.balance.__academic_increment === 'number') loadedBal = wData.balance.__academic_increment;
            }
            if (loadedBal === null) {
              const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
              if (userSnap.exists() && typeof userSnap.data()?.walletBalance === 'number') {
                loadedBal = userSnap.data().walletBalance;
              }
            }
            if (loadedBal === null && currentUser.email) {
              const emailDocId = currentUser.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
              const eSnap = await getDoc(doc(db, 'wallets_by_email', emailDocId));
              if (eSnap.exists() && typeof eSnap.data()?.balance === 'number') {
                loadedBal = eSnap.data().balance;
              }
            }
            if (loadedBal === null) {
              const localWallet = localStorage.getItem(`zain_wallet_${currentUser.uid}`) || (currentUser.email ? localStorage.getItem(`zain_wallet_${currentUser.email}`) : null);
              if (localWallet) loadedBal = Number(localWallet) || 0;
            }
            if (loadedBal !== null) {
              setUserWalletBalance(loadedBal);
              localStorage.setItem(`zain_wallet_${currentUser.uid}`, loadedBal.toString());
              if (currentUser.email) localStorage.setItem(`zain_wallet_${currentUser.email}`, loadedBal.toString());
            }
          } catch (wErr) {
            console.warn('Could not load wallet from Firestore:', wErr);
          }

          // Load user purchases
          const purchCol = collection(db, 'users', currentUser.uid, 'purchases');
          const purchSnap = await getDocs(purchCol);
          const purchList: UserPurchase[] = [];

          purchSnap.forEach((d) => {
            const data = d.data() as UserPurchase;
            purchList.push(data);
          });

          // Sort latest first
          purchList.sort((a, b) => b.purchasedAt - a.purchasedAt);
          setPurchases(purchList);

          // Load all global transactions if admin
          try {
            const allTrxCol = collection(db, 'transactions');
            const allTrxSnap = await getDocs(allTrxCol);
            const globalPurchList: UserPurchase[] = [];
            allTrxSnap.forEach((d) => {
              globalPurchList.push(d.data() as UserPurchase);
            });
            if (globalPurchList.length > 0) {
              globalPurchList.sort((a, b) => b.purchasedAt - a.purchasedAt);
              setAllPurchasesForAdmin(globalPurchList);
            }
          } catch (e) {
            console.warn('Could not load global transactions:', e);
          }
        } catch (err) {
          console.warn('Could not sync data from Firestore:', err);
          // Fallback to local storage
          const localPurch = localStorage.getItem(`zain_purch_${currentUser.uid}`);
          if (localPurch) {
            try {
              setPurchases(JSON.parse(localPurch));
            } catch (e) {}
          }
          const localQuotas = localStorage.getItem(`zain_quotas_${currentUser.uid}`);
          if (localQuotas) {
            try {
              setUserQuotas(JSON.parse(localQuotas));
            } catch (e) {}
          }
          const localLoyalty = localStorage.getItem(`zain_loyalty_${currentUser.uid}`);
          if (localLoyalty) {
            try {
              setLoyalty({ ...defaultLoyalty, ...JSON.parse(localLoyalty) });
            } catch (e) {}
          }
          const localTrials = localStorage.getItem(`zain_reseller_trials_${currentUser.uid}`);
          if (localTrials) {
            try {
              setResellerTrials(JSON.parse(localTrials));
            } catch (e) {}
          }
        }
        setAuthLoading(false);
      } else {
        setAuthLoading(false);
        // Legacy browser-only sessions can never sign anyone in.
        localStorage.removeItem('zain_custom_auth_user');
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('zain_admin_logged_in');

        // Guest mode fallback
        const guestPurch = localStorage.getItem('zain_guest_purch');
        if (guestPurch) {
          try {
            setPurchases(JSON.parse(guestPurch));
          } catch (e) {}
        }
        const guestQuotas = localStorage.getItem('zain_guest_quotas');
        if (guestQuotas) {
          try {
            setUserQuotas(JSON.parse(guestQuotas));
          } catch (e) {}
        }
        const guestLoyalty = localStorage.getItem('zain_guest_loyalty');
        if (guestLoyalty) {
          try {
            setLoyalty({ ...defaultLoyalty, ...JSON.parse(guestLoyalty) });
          } catch (e) {}
        }
        const guestTrials = localStorage.getItem('zain_guest_reseller_trials');
        if (guestTrials) {
          try {
            setResellerTrials(JSON.parse(guestTrials));
          } catch (e) {}
        }
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Check Free Trial Eligibility (Exclusively for Reseller accounts; removed for general/public accounts)
  const checkFreeTrialEligibility = async () => {
    setIsCheckingTrialEligibility(true);
    try {
      // Fingerprinting (WebGL, audio and IP lookup) is only needed by eligible resellers.
      if (userRole !== 'reseller') {
        setFreeTrialStatus({
          isEligible: false,
          deviceFingerprint: '',
          ipAddress: '',
          osName: '',
          browserName: '',
          gpuRenderer: '',
          screenSpec: '',
          cpuCores: 0,
          rejectionReason: 'Fasilitas Free Trial khusus untuk akun berstatus Mitra Reseller ZAIN.NET. Untuk akun umum, silakan lakukan pembelian sewa/kuota modul.'
        });
        return;
      }
      const deviceInfo = await collectDeviceFingerprint();

      // 1. Check LocalStorage Hardware Marker
      const localClaimedRaw = localStorage.getItem('zain_device_trial_claimed');
      let localClaimed: DeviceTrialRecord | null = null;
      if (localClaimedRaw) {
        try {
          localClaimed = JSON.parse(localClaimedRaw);
        } catch (e) {}
      }

      // 2. Check Firestore device_trials collection by deviceFingerprint
      let firestoreClaimed: DeviceTrialRecord | null = null;
      try {
        const deviceDocRef = doc(db, 'device_trials', deviceInfo.deviceFingerprint);
        const deviceDocSnap = await getDoc(deviceDocRef);
        if (deviceDocSnap.exists()) {
          firestoreClaimed = { id: deviceDocSnap.id, ...(deviceDocSnap.data() as any) };
        }
      } catch (e) {
        console.warn('Firestore device_trials check notice:', e);
      }

      // 3. Check Firestore ip_trials collection by IP
      let ipClaimed: DeviceTrialRecord | null = null;
      if (deviceInfo.ipAddress && deviceInfo.ipAddress !== '127.0.0.1') {
        try {
          const safeIpKey = deviceInfo.ipAddress.replace(/[^a-zA-Z0-9]/g, '_');
          const ipDocRef = doc(db, 'ip_trials', safeIpKey);
          const ipDocSnap = await getDoc(ipDocRef);
          if (ipDocSnap.exists()) {
            ipClaimed = { id: ipDocSnap.id, ...(ipDocSnap.data() as any) };
          }
        } catch (e) {
          console.warn('Firestore ip_trials check notice:', e);
        }
      }

      // 4. Check Current User Account if logged in
      let accountClaimed: DeviceTrialRecord | null = null;
      if (user?.uid) {
        try {
          const userTrialSnap = await getDoc(doc(db, 'users', user.uid, 'data', 'free_trial'));
          if (userTrialSnap.exists()) {
            accountClaimed = { id: userTrialSnap.id, ...(userTrialSnap.data() as any) };
          }
        } catch (e) {}
      }

      const activeClaim = firestoreClaimed || ipClaimed || localClaimed || accountClaimed;

      if (activeClaim) {
        let reason = 'Batas 1x Free Trial telah digunakan pada perangkat atau jaringan ini.';
        if (firestoreClaimed) {
          reason = `Perangkat (${deviceInfo.osName}) ini telah menggunakan jatah 1x Free Trial pada akun (${firestoreClaimed.claimedByEmail}). Sesuai aturan anti-abuse ZAIN.NET, setiap unit laptop/perangkat fisik hanya berhak atas 1x uji coba meskipun membuat akun baru.`;
        } else if (ipClaimed) {
          reason = `Jaringan IP internet (${deviceInfo.ipAddress}) telah mencapai batas 1x Free Trial.`;
        } else if (accountClaimed) {
          reason = `Akun Anda (${user?.email}) telah mengklaim 1x Free Trial sebelumnya.`;
        } else if (localClaimed) {
          reason = `Perangkat ini telah tercatat menggunakan 1x Free Trial untuk modul (${localClaimed.toolTitle || 'Akademik'}).`;
        }

        setFreeTrialStatus({
          isEligible: false,
          deviceFingerprint: deviceInfo.deviceFingerprint,
          ipAddress: deviceInfo.ipAddress,
          osName: deviceInfo.osName,
          browserName: deviceInfo.browserName,
          gpuRenderer: deviceInfo.gpuRenderer,
          screenSpec: deviceInfo.screenSpec,
          cpuCores: deviceInfo.cpuCores,
          claimedRecord: activeClaim,
          rejectionReason: reason
        });
      } else {
        setFreeTrialStatus({
          isEligible: true,
          deviceFingerprint: deviceInfo.deviceFingerprint,
          ipAddress: deviceInfo.ipAddress,
          osName: deviceInfo.osName,
          browserName: deviceInfo.browserName,
          gpuRenderer: deviceInfo.gpuRenderer,
          screenSpec: deviceInfo.screenSpec,
          cpuCores: deviceInfo.cpuCores
        });
      }
    } catch (err) {
      console.error('Error checking free trial eligibility:', err);
      setFreeTrialStatus({
        isEligible: false,
        deviceFingerprint: 'fallback-seed',
        ipAddress: 'Unknown',
        osName: navigator.platform || 'Unknown OS',
        browserName: 'Web Browser',
        gpuRenderer: 'Standard GPU',
        screenSpec: `${window.innerWidth}x${window.innerHeight}`,
        cpuCores: navigator.hardwareConcurrency || 4,
        rejectionReason: 'Tidak dapat memverifikasi integritas sensor perangkat'
      });
    } finally {
      setIsCheckingTrialEligibility(false);
    }
  };

  // Run eligibility check on initial mount and when user / guest / role changes
  useEffect(() => {
    checkFreeTrialEligibility();
  }, [user?.uid, isGuest, userRole]);

  // Handle claiming Free Trial for a tool (Reseller only)
  const handleClaimFreeTrial = async (tool: ToolItem) => {
    if (userRole !== 'reseller') {
      alert('Penggunaan trial gratis hanya berlaku khusus untuk akun berstatus Reseller ZAIN.NET. Akun umum tidak memiliki akses trial gratis.');
      return;
    }

    if (!freeTrialStatus?.isEligible) {
      alert('Perangkat atau akun ini tidak memenuhi syarat untuk klaim Free Trial tambahan.');
      return;
    }

    const trialRecord: DeviceTrialRecord = {
      id: freeTrialStatus.deviceFingerprint,
      deviceFingerprint: freeTrialStatus.deviceFingerprint,
      osName: freeTrialStatus.osName,
      browserName: freeTrialStatus.browserName,
      gpuRenderer: freeTrialStatus.gpuRenderer,
      screenSpec: freeTrialStatus.screenSpec,
      cpuCores: freeTrialStatus.cpuCores,
      ipAddress: freeTrialStatus.ipAddress,
      claimedAt: Date.now(),
      claimedByUid: user?.uid || 'guest',
      claimedByEmail: user?.email || (isGuest ? 'Mode Tamu / Mahasiswa' : 'Pengguna Mahasiswa'),
      claimedByName: user?.displayName || (isGuest ? 'Mahasiswa Tamu' : 'Mahasiswa Penguji'),
      toolId: tool.id,
      toolTitle: tool.title,
      status: 'active'
    };

    try {
      if (!user) { setShowLoginModal(true); return; }
      const {data,error}=await database().rpc('academic_claim_trial',{p_tool:tool.id,p_device:freeTrialStatus.deviceFingerprint});
      if(error) throw error;
      setUserQuotas(data.quotas);
      localStorage.setItem('zain_device_trial_claimed',JSON.stringify({...trialRecord,...data.record}));

      // 6. Update local status so UI immediately locks further claims
      setFreeTrialStatus({
        ...freeTrialStatus,
        isEligible: false,
        claimedRecord: trialRecord,
        rejectionReason: `Free Trial 1x telah aktif dan dialokasikan untuk ${tool.title}.`
      });

      setShowFreeTrialModal(false);

      // 7. Directly open tool viewer modal
      setActiveTool(tool);
    } catch (err: any) {
      console.error('Error claiming free trial:', err);
      alert('Gagal mengklaim Free Trial: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  // Helper to calculate remaining free trial for reseller (3x per item)
  const getResellerTrialRemaining = (toolId: string): number => {
    if (userRole !== 'reseller') return 0;
    const used = resellerTrials[toolId] || 0;
    return Math.max(0, RESELLER_MAX_FREE_TRIALS - used);
  };

  // Helper to get remaining quota for a tool (includes reseller trial)
  const getToolQuota = (tool: ToolItem): number => {
    if (userRole === 'admin') return 999;
    const paidQuota = userQuotas[tool.id] || 0;
    if (userRole === 'reseller') {
      const trialRemaining = getResellerTrialRemaining(tool.id);
      return paidQuota + trialRemaining;
    }
    return paidQuota;
  };

  // Total active quotas across all tools
  const totalQuotaCount = useMemo(() => {
    return Object.values(userQuotas).reduce<number>((acc, q) => acc + (typeof q === 'number' ? q : 0), 0);
  }, [userQuotas]);

  // Pending verification count for Admin
  const pendingVerificationCount = useMemo(() => {
    return (allPurchasesForAdmin || []).filter(p => p.status === 'pending').length;
  }, [allPurchasesForAdmin]);

  const prevPendingCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (userRole === 'admin') {
      if (prevPendingCountRef.current !== null && pendingVerificationCount > prevPendingCountRef.current) {
        playSuccessChime();
      }
      prevPendingCountRef.current = pendingVerificationCount;
    }
  }, [pendingVerificationCount, userRole]);

  // Save updated manual QRIS payment config
  const handleSavePaymentConfig = async (newConfig: PaymentConfig) => {
    setPaymentConfig(newConfig);
    localStorage.setItem('zain_manual_qris_config', JSON.stringify(newConfig));
    if (user) {
      try {
        await setDoc(doc(db, 'settings', 'qris_config'), newConfig, { merge: true });
      } catch (err) {
        console.warn('Error saving config to Firestore:', err);
      }
    }
  };

  // Save dynamic custom prices (Item & Category overrides)
  const handleSaveCustomPrices = async (newPrices: CustomPricesConfig) => {
    setCustomPrices(newPrices);
    localStorage.setItem('zain_custom_prices', JSON.stringify(newPrices));
    if (user) {
      try {
        await setDoc(doc(db, 'settings', 'prices'), newPrices, { merge: true });
      } catch (err) {
        console.warn('Error saving prices to Firestore:', err);
      }
    }
  };

  // Save / Update document in User Archive
  const handleSaveDocument = async (docItem: UserDocumentItem) => {
    const updatedDocs = [docItem, ...documents.filter((d) => d.id !== docItem.id)];
    setDocuments(updatedDocs);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'documents', docItem.id);
        await setDoc(docRef, docItem, { merge: true });
        localStorage.setItem(`zain_docs_${user.uid}`, JSON.stringify(updatedDocs));
      } catch (err) {
        console.warn('Error saving document to Firestore:', err);
        localStorage.setItem(`zain_docs_${user.uid}`, JSON.stringify(updatedDocs));
      }
    } else {
      localStorage.setItem('zain_user_documents', JSON.stringify(updatedDocs));
    }
  };

  // Delete document from User Archive
  const handleDeleteDocument = async (docId: string) => {
    const updatedDocs = documents.filter((d) => d.id !== docId);
    setDocuments(updatedDocs);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'documents', docId);
        await deleteDoc(docRef);
        localStorage.setItem(`zain_docs_${user.uid}`, JSON.stringify(updatedDocs));
      } catch (err) {
        console.warn('Error deleting document from Firestore:', err);
        localStorage.setItem(`zain_docs_${user.uid}`, JSON.stringify(updatedDocs));
      }
    } else {
      localStorage.setItem('zain_user_documents', JSON.stringify(updatedDocs));
    }
  };

  // Save updated roles config (Admin, Resellers, Discount %)
  const handleSaveRolesConfig = async (newConfig: RolesConfig) => {
    setRolesConfig(newConfig);
    localStorage.setItem('zain_roles_config', JSON.stringify(newConfig));
    try {
      await setDoc(doc(db, 'settings', 'roles_config'), newConfig, { merge: true });
    } catch (err) {
      console.warn('Error saving roles config to Firestore:', err);
    }
  };

  // Only the live Supabase Auth session may open a user dashboard.
  const handleCustomLogin = async (candidate: string | AppUser) => {
    const {data:{user:verified},error}=await database().auth.getUser();
    if(error||!verified||typeof candidate==='string'||candidate.uid!==verified.id){
      console.warn('Login lokal ditolak: sesi Supabase Auth tidak cocok.');
      setUser(null);setShowLoginModal(true);return;
    }
    const role=verified.app_metadata?.academic_role==='admin'?'admin':
      verified.app_metadata?.academic_role==='reseller'?'reseller':'public';
    setUser({uid:verified.id,email:verified.email||candidate.email,
      displayName:verified.user_metadata?.full_name||verified.email,
      role,photoURL:null,isCustomAuth:false,createdAt:Date.now()} as AppUser);
    setIsGuest(false);setShowLoginModal(false);setShowPinLoginModal(false);
    localStorage.removeItem('zain_custom_auth_user');
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('zain_admin_logged_in');
  };

  // Quick correction for abnormal quota (e.g. if previous loop inflated quota to 384x)
  const handleCorrectToolQuota = async (toolId: string, targetQuota: number = 1) => {
    const updated = {
      ...userQuotas,
      [toolId]: Math.max(0, targetQuota)
    };
    setUserQuotas(updated);

    // Normalize loyalty to 1 purchase if it was inflated
    const normalizedLoyalty = {
      ...loyalty,
      purchaseCount: 1,
      freeRewardsAvailable: 0,
      totalFreeEarned: 0,
      totalFreeClaimed: 0
    };
    setLoyalty(normalizedLoyalty);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', 'quotas'), updated);
        await setDoc(doc(db, 'users', user.uid, 'data', 'loyalty'), normalizedLoyalty, { merge: true });
        localStorage.setItem(`zain_quotas_${user.uid}`, JSON.stringify(updated));
        localStorage.setItem(`zain_loyalty_${user.uid}`, JSON.stringify(normalizedLoyalty));
      } catch (e) {
        console.warn('Error saving corrected quota to Firestore:', e);
      }
    } else {
      localStorage.setItem('zain_guest_quotas', JSON.stringify(updated));
      localStorage.setItem('zain_guest_loyalty', JSON.stringify(normalizedLoyalty));
    }
  };

  // Handle successful purchase: Grant +1 quota for tool or all tools in category
  const handlePaymentSuccess = async (purchase: UserPurchase) => {
    if (!user) return;
    // Quotas and loyalty are credited atomically by the server, never by this callback.
    const [q,l,p] = await Promise.all([
      getDoc(doc(db,'users',user.uid,'data','quotas')),
      getDoc(doc(db,'users',user.uid,'data','loyalty')),
      getDocs(collection(db,'users',user.uid,'purchases'))
    ]);
    setUserQuotas(q.data() || {});
    setLoyalty({...defaultLoyalty,...(l.data() || {})});
    setPurchases(p.docs.map(d => d.data() as UserPurchase));
    setAllPurchasesForAdmin((prev) => [purchase, ...prev.filter((p) => p.id !== purchase.id)]);

    setCheckoutTarget(null);

    // If purchase was for a single tool, auto-open it immediately
    if (purchase.itemType === 'tool') {
      const toolId = purchase.itemId.replace('tool:', '');
      for (const cat of categoriesData) {
        const found = cat.tools.find((t) => t.id === toolId);
        if (found) {
          setActiveTool(found);
          break;
        }
      }
    }
  };

  // Claim 1 Free Creation Quota using Loyalty Reward (Beli 3x Gratis 1x)
  const handleClaimLoyaltyReward = async (tool: ToolItem) => {
    if (!user) { setShowLoginModal(true); return; }
    const {data,error} = await database().rpc('academic_claim_reward',{p_tool:tool.id});
    if (error) { alert(error.message); return; }
    setUserQuotas(data.quotas); setLoyalty({...defaultLoyalty,...data.loyalty}); setActiveTool(tool);
  };

  // Redeem free reward directly from the checkout modal
  const handleUseFreeRewardFromCheckout = async (target: CheckoutTarget) => {
    if (loyalty.freeRewardsAvailable <= 0) return;

    if (target.type === 'tool') {
      for (const cat of categoriesData) {
        const found = cat.tools.find((t) => t.id === target.id);
        if (found) {
          setCheckoutTarget(null);
          await handleClaimLoyaltyReward(found);
          return;
        }
      }
    } else if (target.type === 'category') {
      const categoryId = Number(target.id);
      const foundCategory = categoriesData.find((c) => c.id === categoryId);
      if (foundCategory && foundCategory.tools.length > 0) {
        setCheckoutTarget(null);
        // Claim the first tool in this category
        await handleClaimLoyaltyReward(foundCategory.tools[0]);
        return;
      }
    }
  };

  // Launch tool directly using Reseller Free Trial from checkout modal
  const handleUseResellerTrialFromCheckout = (target: CheckoutTarget) => {
    if (userRole !== 'reseller') return;
    if (target.type === 'tool') {
      for (const cat of categoriesData) {
        const found = cat.tools.find((t) => t.id === target.id);
        if (found) {
          setCheckoutTarget(null);
          setActiveTool(found);
          return;
        }
      }
    }
  };

  const directOpened = useRef(false);
  useEffect(() => {
    if (!initialToolId || authLoading || !user || directOpened.current) return;
    const tool = categoriesData.flatMap(c => c.tools).find(t => t.id === initialToolId);
    if (!tool) return;
    directOpened.current = true;
    if (userRole === 'admin' || (userQuotas[tool.id] || 0) > 0 || getResellerTrialRemaining(tool.id) > 0) setActiveTool(tool);
    else setCheckoutTarget({ type: 'tool', id: tool.id, title: tool.title, priceRp: tool.priceRp || 0 } as CheckoutTarget);
  }, [initialToolId, authLoading, user?.uid, userRole, userQuotas]);

  // Consume 1 creation quota when session finishes (Admin has unlimited free sessions)
  const handleConsumeQuota = async (tool: ToolItem, details?: string) => {
    if (userRole === 'admin') {
      return; // Admins have unlimited free access
    }

    // Always immediately deduct 1 quota locally and in storage to prevent re-use
    const currentQ = userQuotas[tool.id] || 0;
    const newQ = Math.max(0, currentQ - 1);
    const updatedQuotas = { ...userQuotas, [tool.id]: newQ };
    setUserQuotas(updatedQuotas);

    if (user?.uid) {
      localStorage.setItem(`zain_quotas_${user.uid}`, JSON.stringify(updatedQuotas));
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', 'quotas'), {
          [tool.id]: newQ,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {}
    } else {
      localStorage.setItem('zain_guest_quotas', JSON.stringify(updatedQuotas));
    }

    // Also deduct reseller trial if tool was using a reseller trial
    if (userRole === 'reseller' && (resellerTrials[tool.id] || 0) < RESELLER_MAX_FREE_TRIALS) {
      const currentTrial = resellerTrials[tool.id] || 0;
      const updatedTrials = { ...resellerTrials, [tool.id]: currentTrial + 1 };
      setResellerTrials(updatedTrials);
      if (user?.uid) {
        localStorage.setItem(`zain_reseller_trials_${user.uid}`, JSON.stringify(updatedTrials));
      }
    }

    if (user) {
      try {
        const session = getSessionForTool(tool.id, user.uid);
        if (session) {
          const { data } = await database().rpc('academic_complete_session', {
            p_session: session,
            p_details: details || 'Hasil berhasil dibuat & transaksi selesai'
          });
          if (data?.quotas) setUserQuotas(data.quotas);
          if (data?.trials) setResellerTrials(data.trials);
        }
      } catch (rpcErr) {
        console.warn('academic_complete_session notice:', rpcErr);
      }
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (toolId: string) => {
    const newFavorites = new Set(favorites);
    const isAdding = !newFavorites.has(toolId);

    if (isAdding) {
      newFavorites.add(toolId);
    } else {
      newFavorites.delete(toolId);
    }
    setFavorites(newFavorites);

    if (user) {
      try {
        const favDocRef = doc(db, 'users', user.uid, 'favorites', toolId);
        if (isAdding) {
          await setDoc(favDocRef, { toolId, addedAt: Date.now() });
        } else {
          await deleteDoc(favDocRef);
        }
        localStorage.setItem(`zain_favs_${user.uid}`, JSON.stringify(Array.from(newFavorites)));
      } catch (err) {
        console.warn('Error updating favorite in Firestore:', err);
        localStorage.setItem(`zain_favs_${user.uid}`, JSON.stringify(Array.from(newFavorites)));
      }
    } else {
      localStorage.setItem('zain_guest_favs', JSON.stringify(Array.from(newFavorites)));
    }
  };

  // Pay directly with dashboard balance / wallet
  const handlePayWithWallet = async (target: CheckoutTarget, quantity: number, totalCost: number) => {
    if (!user) { setShowLoginModal(true); return; }
    if (userWalletBalance < totalCost) {
      alert(`Saldo tidak mencukupi. Saldo Anda: Rp ${userWalletBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${totalCost.toLocaleString('id-ID')}. Silakan isi saldo akun terlebih dahulu.`);
      setShowTopUpModal(true);
      return;
    }

    const orderId = `WALLET-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const purchase: UserPurchase = {
      id: orderId,
      userId: user.uid,
      userEmail: user.email || 'user@zain.net',
      itemId: target.type === 'tool' ? `tool:${target.id}` : target.type === 'category' ? `category:${target.id}` : 'all_access',
      itemType: target.type,
      itemTitle: quantity > 1 ? `${target.title} (${quantity}x)` : target.title,
      amountPaid: totalCost,
      originalAmount: (target.priceRp || 0) * quantity,
      uniqueCode: 0,
      orderId: orderId,
      purchasedAt: Date.now(),
      quotaGranted: quantity,
      paymentType: 'wallet_balance',
      method: 'wallet',
      status: 'completed',
      senderName: user.displayName || user.email?.split('@')[0] || 'Pengguna',
      senderBank: 'Saldo Akun',
      userEnteredAmount: totalCost,
      paymentProofUrl: '',
      transferNotes: `Pembayaran instan via Saldo Akun: Rp ${totalCost.toLocaleString('id-ID')}`
    };

    try {
      // 1. Deduct wallet balance
      const newBal = Math.max(0, userWalletBalance - totalCost);
      setUserWalletBalance(newBal);
      localStorage.setItem(`zain_wallet_${user.uid}`, newBal.toString());
      if (user.email) {
        localStorage.setItem(`zain_wallet_${user.email}`, newBal.toString());
        const emailDocId = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        setDoc(doc(db, 'wallets_by_email', emailDocId), {
          userId: user.uid,
          userEmail: user.email,
          balance: newBal,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
      await setDoc(doc(db, 'users', user.uid, 'data', 'wallet'), {
        userId: user.uid,
        balance: newBal,
        updatedAt: Date.now()
      }, { merge: true });
      await setDoc(doc(db, 'users', user.uid), {
        walletBalance: newBal,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});

      // 2. Grant quota
      if (target.type === 'tool') {
        const toolId = target.id;
        const currentQ = userQuotas[toolId] || 0;
        const newQuotas = { ...userQuotas, [toolId]: currentQ + quantity };
        setUserQuotas(newQuotas);
        localStorage.setItem(`zain_quotas_${user.uid}`, JSON.stringify(newQuotas));
        await setDoc(doc(db, 'users', user.uid, 'data', 'quotas'), {
          [toolId]: increment(quantity),
          updatedAt: Date.now()
        }, { merge: true });
      }

      // 3. Save transactions
      await setDoc(doc(db, 'transactions', orderId), purchase);
      await setDoc(doc(db, 'users', user.uid, 'purchases', orderId), purchase);

      await handlePaymentSuccess(purchase);
    } catch (err: any) {
      console.error('Error processing wallet purchase:', err);
      alert('Gagal memproses pembayaran via saldo: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  const handleToggleSection = (id: number) => {
    setOpenSectionId((prev) => (prev === id ? null : id));
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('zain_custom_auth_user');
      localStorage.removeItem('zain_guest_session');
      localStorage.removeItem('admin_logged_in');
      localStorage.removeItem('zain_admin_logged_in');
      await logoutUser();
      setUser(null);
      setUserWalletBalance(0);
      setIsGuest(false);
      setShowProfileModal(false);
      setShowPinLoginModal(false);
      setShowRoleManagementModal(false);
      setShowSettingsModal(false);
      setShowTopUpModal(false);
      setActiveTool(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Re-fetch all global transactions for admin analytics
  const handleRefreshAdminAnalytics = async () => {
    try {
      const allTrxCol = collection(db, 'transactions');
      const allTrxSnap = await getDocs(allTrxCol);
      const globalPurchList: UserPurchase[] = [];
      allTrxSnap.forEach((d) => {
        globalPurchList.push(d.data() as UserPurchase);
      });
      if (globalPurchList.length > 0) {
        globalPurchList.sort((a, b) => b.purchasedAt - a.purchasedAt);
        setAllPurchasesForAdmin(globalPurchList);
      }
    } catch (e) {
      console.warn('Could not refresh global transactions:', e);
    }
  };

  const totalToolsCount = useMemo(() => {
    return categories.reduce((acc, cat) => acc + cat.tools.length, 0);
  }, [categories]);

  // Filtered categories and tools
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories
      .map((category) => {
        let tools = category.tools;

        if (filterFavoritesOnly || selectedCategoryTab === 'favorites') {
          tools = tools.filter((t) => favorites.has(t.id));
        }

        if (query) {
          tools = tools.filter(
            (t) =>
              t.title.toLowerCase().includes(query) ||
              t.domain.toLowerCase().includes(query) ||
              category.title.toLowerCase().includes(query) ||
              (t.description && t.description.toLowerCase().includes(query)) ||
              (t.badge && t.badge.toLowerCase().includes(query))
          );
        }

        return {
          ...category,
          tools
        };
      })
      .filter((category) => {
        if (selectedCategoryTab !== 'all' && selectedCategoryTab !== 'favorites') {
          if (category.id !== selectedCategoryTab) return false;
        }
        if (query || filterFavoritesOnly || selectedCategoryTab === 'favorites') {
          return category.tools.length > 0;
        }
        return true;
      });
  }, [categories, searchQuery, filterFavoritesOnly, selectedCategoryTab, favorites]);

  // Check if visitor is accessing the blog or a specific post
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isBlogOrPostRoute = 
    currentView === 'blog' || 
    (typeof window !== 'undefined' && (
      appPathname().startsWith('/makalah') || 
      appPathname().startsWith('/blog') || 
      searchParams.get('view') === 'blog' || 
      searchParams.has('makalah') || 
      searchParams.has('post')
    ));

  // Optimasi: jangan blokir halaman awal hanya untuk menunggu Firebase Auth.
  // LoginView dapat dirender langsung; sesi Firebase yang valid akan masuk
  // otomatis begitu onAuthStateChanged selesai, tanpa splash 1,2 detik.

  // Not logged in and not in guest preview -> only show login screen if trying to use AI tools
  if (!user && !isGuest && !isBlogOrPostRoute) {
    return (
      <>
        <LoginView 
          rolesConfig={rolesConfig}
          onLoginSuccess={handleCustomLogin}
          onGuestLogin={() => {
            setIsGuest(true);
            setUser(null);
            localStorage.setItem('zain_guest_session', 'true');
            localStorage.removeItem('admin_logged_in');
            localStorage.removeItem('zain_admin_logged_in');
            localStorage.removeItem('zain_custom_auth_user');
          }} 
          onNavigateToBlog={() => {
            setCurrentView('blog');
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', '/blog');
            }
          }}
        />
        {showPinLoginModal && (
          <Suspense fallback={null}>
          <AdminPinModal
            rolesConfig={rolesConfig}
            onClose={() => setShowPinLoginModal(false)}
            onSuccessLogin={handleCustomLogin}
          />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <div className="charitize-shell min-h-screen flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        isGuest={isGuest}
        userRole={userRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterFavorites={filterFavoritesOnly}
        onToggleFilterFavorites={() => setFilterFavoritesOnly((prev) => !prev)}
        favoritesCount={favorites.size}
        documentsCount={documents.length}
        totalQuota={totalQuotaCount}
        totalToolsCount={totalToolsCount}
        pendingVerificationCount={pendingVerificationCount}
        walletBalance={userWalletBalance}
        todayTraffic={userRole === 'admin' ? todayTraffic : null}
        currentView={currentView}
        onNavigateView={(v) => {
          setCurrentView(v);
          if (typeof window !== 'undefined' && window.history.pushState) {
            if (v === 'template_jurnal') window.history.pushState({}, '', '/template');
            else if (v === 'agc_blog') window.history.pushState({}, '', '/agc');
            else if (v === 'blog') window.history.pushState({}, '', '/blog');
            else window.history.pushState({}, '', '/');
          }
        }}
        onOpenBatchUpload={() => {
          if (userRole === 'admin') setShowBatchUploadModal(true);
        }}
        makalahCount={makalahPosts.length}
        agcPostsCount={agcPosts.length}
        onOpenAgcAutoPost={() => setShowAgcAutoPostModal(true)}
        onOpenTopUp={() => setShowTopUpModal(true)}
        onSignOut={handleSignOut}
        onOpenLogin={() => setIsGuest(false)}
        onOpenPinLogin={() => setShowPinLoginModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenRoleManagement={() => setShowRoleManagementModal(true)}
        onOpenAnalytics={() => setShowAnalyticsModal(true)}
        onOpenPriceManagement={() => setShowPriceManagementModal(true)}
        onOpenDocumentArchive={() => setShowDocumentArchiveModal(true)}
        onOpenVerification={() => setShowVerificationModal(true)}
        onOpenTrafficStats={userRole === 'admin' ? () => setShowTrafficStatsModal(true) : undefined}
      />

      {/* Guest Mode Banner */}
      {isGuest && !user && (
        <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border-b border-blue-500/30 px-4 py-2 text-center text-xs text-blue-200 flex flex-wrap items-center justify-center gap-2">
          <span>Anda sedang dalam <strong>Mode Tamu</strong>. Masuk atau daftarkan akun Mahasiswa untuk menyimpan kuota & riwayat naskah Anda.</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPinLoginModal(true)}
              className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg font-black hover:bg-amber-400 transition-colors cursor-pointer text-[11px] flex items-center gap-1 shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Login Admin Supabase</span>
            </button>
            <button
              onClick={() => setIsGuest(false)}
              className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-white rounded-lg font-bold transition-all cursor-pointer text-[11px] shadow-sm"
            >
              Masuk / Daftar Akun
            </button>
          </div>
        </div>
      )}

      {/* Role Tier Status Banner (For Admin & Reseller) */}
      {user && userRole === 'admin' && (
        <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-yellow-950/90 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-200 flex flex-wrap items-center justify-center gap-2">
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Selamat Datang, <strong>Administrator ({user.email})</strong>. Akses <strong>100% Bebas</strong> untuk seluruh modul.
          </span>
          {pendingVerificationCount > 0 && (
            <button
              onClick={() => setShowVerificationModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-[11px] flex items-center gap-1.5 animate-bounce cursor-pointer shadow-md shadow-red-600/40"
            >
              <span>🔔 {pendingVerificationCount} Menunggu Verifikasi</span>
            </button>
          )}
          <button
            onClick={() => setShowVerificationModal(true)}
            className="px-2 py-0.5 rounded bg-blue-500/30 hover:bg-blue-500/45 text-blue-200 font-bold border border-blue-500/50 cursor-pointer text-[11px]"
          >
            Verifikasi Pembayaran
          </button>
          <button
            onClick={() => setShowRoleManagementModal(true)}
            className="px-2 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 font-bold border border-amber-500/50 cursor-pointer text-[11px]"
          >
            Kelola Role Email
          </button>
          <button
            onClick={handleSignOut}
            title="Keluar dari Akun"
            className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/35 text-red-300 font-semibold border border-red-500/40 cursor-pointer text-[11px]"
          >
            Keluar Akun
          </button>
        </div>
      )}

      {user && userRole === 'reseller' && (
        <div className="bg-gradient-to-r from-blue-950/90 via-indigo-900/80 to-purple-950/90 border-b border-blue-500/40 px-4 py-2 text-center text-xs text-blue-200 flex flex-wrap items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Selamat Datang, Partner <strong>Reseller ({user.email})</strong>. Anda mendapatkan Tarif Khusus <strong>Diskon 50% Setiap Menu</strong>.
          </span>
          <button
            onClick={() => setShowProfileModal(true)}
            className="px-2 py-0.5 rounded bg-blue-500/30 hover:bg-blue-500/45 text-cyan-200 font-bold border border-blue-500/50 cursor-pointer text-[11px]"
          >
            Info Akun Reseller
          </button>
          <button
            onClick={handleSignOut}
            title="Keluar dari Akun"
            className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/35 text-red-300 font-semibold border border-red-500/40 cursor-pointer text-[11px]"
          >
            Keluar Akun
          </button>
        </div>
      )}

      {/* Role Tier Status Banner (For Regular / Public Users) */}
      {user && userRole !== 'admin' && userRole !== 'reseller' && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-indigo-500/30 px-4 py-2 text-center text-xs text-slate-300 flex flex-wrap items-center justify-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Masuk sebagai: <strong className="text-white font-semibold">{user.email}</strong>
          </span>
          {userWalletBalance > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-[11px]">
              Saldo: Rp {userWalletBalance.toLocaleString('id-ID')}
            </span>
          )}
          <button
            onClick={() => setShowProfileModal(true)}
            className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/40 cursor-pointer text-[11px] transition-colors"
          >
            Status & Kuota
          </button>
          <button
            onClick={handleSignOut}
            title="Keluar dari Akun"
            className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/35 text-red-300 hover:text-red-100 font-bold border border-red-500/40 cursor-pointer text-[11px] flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-3 h-3 text-red-400" />
            <span>Keluar Akun</span>
          </button>
        </div>
      )}

      {/* Abnormal Quota Detection & 1-Click Fix Banner */}
      {((userQuotas['art-1'] && userQuotas['art-1'] > 10) || Object.values(userQuotas).some((q) => typeof q === 'number' && q > 10)) && (
        <div className="bg-gradient-to-r from-amber-950 via-red-950 to-amber-950 border-b border-amber-500/50 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>
              <strong>Perhatian Kuota:</strong> Terdeteksi kuota Generator Artikel berlebih ({userQuotas['art-1'] || Object.values(userQuotas).find(q => typeof q === 'number' && q > 10)}x Buat) akibat verifikasi berulang.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCorrectToolQuota('art-1', 1)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow active:scale-95 whitespace-nowrap"
            >
              Koreksi Langsung Menjadi 1x Buat
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setShowVerificationModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Panel Kuota Admin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Template Jurnal Manager OR Blog AGC View OR Blog Makalah View OR Tools Hub */}
      {currentView === 'template_jurnal' ? (
        <TemplateJurnalManager
          userRole={userRole}
          userEmail={user?.email || undefined}
          onBackToHome={() => {
            setCurrentView('tools');
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', '/');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : currentView === 'agc_blog' ? (
        <AgcBlogView
          posts={agcPosts}
          userRole={userRole}
          user={user}
          onRefreshPosts={async () => {
            const fresh = await fetchAgcPosts();
            setAgcPosts(fresh);
          }}
          onBackToTools={() => {
            setCurrentView('tools');
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', '/');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToMakalahBlog={() => {
            setCurrentView('blog');
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', '/blog');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : currentView === 'blog' ? (
        <MakalahBlogView
          posts={makalahPosts}
          userRole={userRole}
          user={user}
          selectedPost={selectedMakalah}
          initialShowAdminPanel={showMakalahAdmin}
          onOpenBatchUpload={() => {
            if (userRole === 'admin') setShowBatchUploadModal(true);
          }}
          onSelectPost={(post) => {
            setSelectedMakalah(post);
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', `/makalah/${encodeURIComponent(post.slug || post.id)}`);
            }
          }}
          onClearSelectedPost={() => {
            setSelectedMakalah(null);
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', '/blog');
            }
          }}
          onOpenLoginModal={() => {
            setIsGuest(false);
          }}
          onDeletePost={async (postId) => {
            await deleteMakalahPost(postId);
            setMakalahPosts(prev => prev.filter(p => p.id !== postId));
          }}
          onBackToTools={() => {
            setCurrentView('tools');
            if (typeof window !== 'undefined' && window.history.pushState) {
              window.history.pushState({}, '', '/');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <main className="charitize-main max-w-6xl mx-auto px-4 py-6 space-y-6 w-full flex-1">

          {/* Hero Section */}
          <HeroSection 
            onExploreModules={() => {
              const el = document.getElementById('semua-modul');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            totalToolsCount={totalToolsCount}
          />

        {/* Live Web Traffic Stats Bar (Page Views & User Views per Day + 30-Day Recap) - Khusus Admin */}
        {userRole === 'admin' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-blue-950/40 to-slate-900/90 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Statistik Kunjungan & Pengunjung Web
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Hari Ini (Khusus Admin)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  <strong className="text-blue-300 font-bold">{todayTraffic?.pageViews || 0}x Dibuka</strong> (Page Views) • <strong className="text-emerald-300 font-bold">{todayTraffic?.uniqueUsersCount || 0} Pengunjung</strong> (User Views)
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowTrafficStatsModal(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md shadow-blue-600/20 active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Lihat Rekap 1 Bulan</span>
            </button>
          </div>
        )}

        {/* Fitur Isi Saldo Akun di Halaman Utama */}
        <WalletHomeBanner
          user={user}
          walletBalance={userWalletBalance}
          onOpenTopUp={(preset) => {
            setTopUpPresetAmount(preset);
            setShowTopUpModal(true);
          }}
          onOpenLogin={() => setIsGuest(false)}
        />

        {/* Loyalty Program Stamp Banner (Beli 3x Gratis 1x) */}
        {userRole === 'public' && (
          <LoyaltyBanner
            loyalty={loyalty}
            isLoggedIn={!!user}
            onOpenLogin={() => setIsGuest(false)}
            onOpenProfile={() => setShowProfileModal(true)}
          />
        )}

        {/* Tampilan menu 2 kolom rapi persis seperti di foto referensi */}
        <section id="semua-modul" className="charitize-services space-y-4">
          <div className="charitize-section-heading"><span>LAYANAN ZAIN.NET</span><h2>Pilih layanan sesuai kebutuhan</h2><p>Seluruh menu 1–12 tersedia di bawah ini. Buka menu untuk melihat pilihan dan harga.</p></div>
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" aria-label="Pilihan menu ZAIN.NET">
            {filteredCategories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                isOpen={openSectionId === category.id}
                onToggle={handleToggleSection}
                favorites={favorites}
                getToolQuota={getToolQuota}
                getResellerTrialRemaining={getResellerTrialRemaining}
                userRole={userRole}
                discountPercentage={rolesConfig.resellerDiscountPercentage}
                freeRewardsAvailable={userRole === 'public' ? loyalty.freeRewardsAvailable : 0}
                isFreeTrialEligible={false}
                userId={user?.uid}
                onOpenTool={(tool) => {
                  if (isIframeTool(tool) && userRole !== 'admin') {
                    setSelectedIframeLockedTool(tool);
                    setShowIframeLockedModal(true);
                    return;
                  }
                  if (tool.url === '/notajilid' || tool.id === 'nota-1') {
                    if (onNavigateToPath) {
                      onNavigateToPath('/notajilid');
                    } else {
                      window.history.pushState(null, '', '/notajilid');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                    return;
                  }
                  if (tool.url === '/sewatoga' || tool.id === 'toga-1') {
                    if (onNavigateToPath) {
                      onNavigateToPath('/sewatoga');
                    } else {
                      window.history.pushState(null, '', '/sewatoga');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                    return;
                  }
                  if (tool.id === 'art-6' || tool.url === '/artikel-gemini' || tool.url === 'internal://artikel-gemini') {
                    if (onNavigateToPath) {
                      onNavigateToPath('/artikel-gemini');
                    } else {
                      window.history.pushState(null, '', '/artikel-gemini');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                    return;
                  }
                  if (tool.id === 'cover-1' || tool.url === 'https://hanslakomesem-commits.github.io/Edit-Hard-Cover/' || tool.url === '/edit-hard-cover' || tool.url === 'internal://edit-hard-cover') {
                    // Tetap dalam sesi aplikasi utama; route terpisah meminta login ulang.
                    // Hanya role admin yang boleh membuka modul iframe ini.
                    if (userRole !== 'admin') {
                      setSelectedIframeLockedTool(tool);
                      setShowIframeLockedModal(true);
                      return;
                    }
                    setActiveTool(tool);
                    return;
                  }
                  setActiveTool(tool);
                }}
                onOpenIframeLockedNotice={(tool) => {
                  setSelectedIframeLockedTool(tool);
                  setShowIframeLockedModal(true);
                }}
                onToggleFavorite={handleToggleFavorite}
                onCheckoutRequest={(target) => setCheckoutTarget(target)}
                onClaimReward={handleClaimLoyaltyReward}
              />
            ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-3xl bg-[#141c2e] border border-gray-800 text-gray-400">
              <p className="font-semibold text-white">Tidak ada modul yang cocok dengan pencarian</p>
              <p className="text-xs mt-1">Coba gunakan kata kunci lain</p>
            </div>
          )}
        </section>

        {/* Trust Badges */}
        <TrustBadges />
      </main>
      )}

      {/* Footer & Hub Publikasi Konten (Blog, AGC, Blogspot, Batch Post) */}
      <Footer 
        onNavigateView={(v) => {
          setCurrentView(v);
          if (typeof window !== 'undefined' && window.history.pushState) {
            if (v === 'template_jurnal') window.history.pushState({}, '', '/template');
            else if (v === 'agc_blog') window.history.pushState({}, '', '/agc');
            else if (v === 'blog') window.history.pushState({}, '', '/blog');
            else window.history.pushState({}, '', '/');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenBatchUpload={() => setShowBatchUploadModal(true)}
        onOpenAgcAutoPost={() => setShowAgcAutoPostModal(true)}
        onOpenMakalahAdmin={() => {
          setShowMakalahAdmin(true);
          setCurrentView('blog');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isAdmin={userRole === 'admin'}
        makalahCount={makalahPosts.length}
        agcPostsCount={agcPosts.length}
      />


      {/* Floating WhatsApp Support Widget */}
      <WhatsAppSupportWidget user={user} />

      {/* Fullscreen In-App Viewer Modal */}
      {activeTool && <Suspense fallback={null}><ToolViewerModal
        tool={activeTool}
        quota={activeTool ? getToolQuota(activeTool) : 0}
        userRole={userRole}
        resellerTrialRemaining={activeTool ? getResellerTrialRemaining(activeTool.id) : 0}
        userId={user?.uid}
        onClose={() => {
          setActiveTool(null);
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }}
        onFinishCreation={handleConsumeQuota}
      /></Suspense>}

      {/* 1x Free Trial Anti-Abuse Claim & Diagnostics Modal */}
      {(showFreeTrialModal) && <Suspense fallback={null}>
      <FreeTrialClaimModal
        isOpen={showFreeTrialModal}
        tool={freeTrialTargetTool}
        status={freeTrialStatus}
        freeTrialStatus={freeTrialStatus}
        user={user}
        isChecking={isCheckingTrialEligibility}
        onClose={() => setShowFreeTrialModal(false)}
        onClaimTrial={handleClaimFreeTrial}
        onClaim={handleClaimFreeTrial}
        onRefreshStatus={checkFreeTrialEligibility}
        onOpenCheckout={(tool) => {
          setCheckoutTarget({
            type: 'tool',
            id: tool.id,
            title: `1x Pembuatan: ${tool.title}`,
            subtitle: `Pembayaran & kuota khusus untuk link ini (${tool.title}) — Dihitung per tiap link`,
            priceRp: tool.priceRp,
            badge: tool.badge
          });
        }}
      />
      </Suspense>}

      {/* Manual QRIS & Bank Transfer Checkout Modal */}
      {(checkoutTarget !== null) && <Suspense fallback={null}>
      <ManualQrisPaymentModal
        target={checkoutTarget}
        user={user}
        userRole={userRole}
        discountPercentage={rolesConfig.resellerDiscountPercentage}
        paymentConfig={paymentConfig}
        loyalty={loyalty}
        resellerTrialRemaining={checkoutTarget && checkoutTarget.type === 'tool' ? getResellerTrialRemaining(checkoutTarget.id) : 0}
        userWalletBalance={userWalletBalance}
        onOpenTopUp={() => setShowTopUpModal(true)}
        onPayWithWallet={handlePayWithWallet}
        onClose={() => setCheckoutTarget(null)}
        onPaymentSuccess={handlePaymentSuccess}
        onUseFreeReward={handleUseFreeRewardFromCheckout}
        onUseResellerTrial={handleUseResellerTrialFromCheckout}
      />
      </Suspense>}

      {/* User Profile Modal */}
      {showProfileModal && (
        <Suspense fallback={null}>
        <UserProfileModal
          user={user}
          userRole={userRole}
          discountPercentage={rolesConfig.resellerDiscountPercentage}
          favoritesCount={favorites.size}
          documentsCount={documents.length}
          quotas={userQuotas}
          purchases={purchases}
          loyalty={loyalty}
          resellerTrials={resellerTrials}
          walletBalance={userWalletBalance}
          onOpenTopUp={() => setShowTopUpModal(true)}
          onClose={() => setShowProfileModal(false)}
          onSignOut={handleSignOut}
          onOpenDocumentArchive={() => {
            setShowProfileModal(false);
            setShowDocumentArchiveModal(true);
          }}
        />
        </Suspense>
      )}

      {/* Admin Analytics Dashboard Modal */}
      {showAnalyticsModal && <Suspense fallback={null}>
      <AdminAnalyticsModal
        purchases={allPurchasesForAdmin.length > 0 ? allPurchasesForAdmin : purchases}
        categories={categories}
        rolesConfig={rolesConfig}
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        onRefresh={handleRefreshAdminAnalytics}
      />
      </Suspense>}

      {/* Admin Manual Transfer & QRIS Verification Modal */}
      {showVerificationModal && <Suspense fallback={null}>
      <AdminVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        purchases={allPurchasesForAdmin}
        categories={categories}
        rolesConfig={rolesConfig}
        currentUserEmail={user?.email}
        currentUserId={user?.uid}
        currentQuotas={userQuotas}
        onUpdateCurrentQuotas={(newQuotas) => {
          setUserQuotas(newQuotas);
          if (user?.uid) {
            localStorage.setItem(`zain_quotas_${user.uid}`, JSON.stringify(newQuotas));
          } else {
            localStorage.setItem('zain_guest_quotas', JSON.stringify(newQuotas));
          }
        }}
        onRefresh={handleRefreshAdminAnalytics}
        onApproveSuccess={() => {
          handleRefreshAdminAnalytics();
        }}
        onSaveRolesConfig={handleSaveRolesConfig}
        onOpenTrafficStats={() => setShowTrafficStatsModal(true)}
      />
      </Suspense>}

      {/* 30-Day Web Traffic & Visitor Analytics Modal (Khusus Admin) */}
      {(showTrafficStatsModal && userRole === 'admin') && <Suspense fallback={null}>
      <TrafficStatsModal
        isOpen={showTrafficStatsModal && userRole === 'admin'}
        onClose={() => setShowTrafficStatsModal(false)}
        currentUser={user}
        isAdmin={userRole === 'admin'}
        userRole={userRole}
      />
      </Suspense>}

      {/* Dynamic Price Management Modal (Admin) */}
      {(showPriceManagementModal) && <Suspense fallback={null}>
      <PriceManagementModal
        categories={categories}
        currentPrices={customPrices}
        isOpen={showPriceManagementModal}
        onClose={() => setShowPriceManagementModal(false)}
        onSavePrices={handleSaveCustomPrices}
      />
      </Suspense>}

      {/* User Document & Work History Archive Modal */}
      {(showDocumentArchiveModal) && <Suspense fallback={null}>
      <DocumentArchiveModal
        documents={documents}
        isOpen={showDocumentArchiveModal}
        onClose={() => setShowDocumentArchiveModal(false)}
        onSaveDocument={handleSaveDocument}
        onDeleteDocument={handleDeleteDocument}
      />
      </Suspense>}

      {/* Reward Celebration Modal (When 3rd purchase completed) */}
      {(showRewardCelebration) && <Suspense fallback={null}>
      <RewardCelebrationModal
        isOpen={showRewardCelebration}
        totalFreeEarned={loyalty.totalFreeEarned}
        onClose={() => setShowRewardCelebration(false)}
      />
      </Suspense>}

      {/* Manual QRIS & Bank Account Settings Modal */}
      {showSettingsModal && (
        <Suspense fallback={null}>
        <ManualQrisSettingsModal
          config={paymentConfig}
          onClose={() => setShowSettingsModal(false)}
          onSaveConfig={handleSavePaymentConfig}
        />
        </Suspense>
      )}

      {/* Admin Role Management Modal */}
      {showRoleManagementModal && (
        <Suspense fallback={null}>
        <RoleManagementModal
          currentConfig={rolesConfig}
          currentUserEmail={user?.email}
          onClose={() => setShowRoleManagementModal(false)}
          onSaveConfig={handleSaveRolesConfig}
        />
        </Suspense>
      )}

      {/* Top Up Saldo Akun Modal */}
      {(showTopUpModal) && <Suspense fallback={null}>
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => {
          setShowTopUpModal(false);
          setTopUpPresetAmount(undefined);
        }}
        user={user}
        currentBalance={userWalletBalance}
        paymentConfig={paymentConfig}
        initialAmount={topUpPresetAmount}
        onTopUpSuccess={(newBal) => {
          setUserWalletBalance(newBal);
          if (user?.uid) {
            localStorage.setItem(`zain_wallet_${user.uid}`, newBal.toString());
          }
          if (user?.email) {
            localStorage.setItem(`zain_wallet_${user.email}`, newBal.toString());
          }
        }}
        onOpenLogin={() => setIsGuest(false)}
      />
      </Suspense>}

      {/* Admin PIN & Custom Auth Modal */}
      {showPinLoginModal && (
        <Suspense fallback={null}>
        <AdminPinModal
          rolesConfig={rolesConfig}
          onClose={() => setShowPinLoginModal(false)}
          onSuccessLogin={handleCustomLogin}
        />
        </Suspense>
      )}

      {/* Makalah Batch Word Upload Modal (AI Auto-Extraction & Generation) - Admin Only */}
      {userRole === 'admin' && showBatchUploadModal && (
        <MakalahBatchUploadModal
          isOpen={showBatchUploadModal}
          userRole={userRole}
          existingPosts={makalahPosts}
          onClose={() => setShowBatchUploadModal(false)}
          onSuccessPublished={async () => {
            const fresh = await fetchMakalahPosts();
            setMakalahPosts(fresh);
            setCurrentView('blog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Auto Post AGC Controller Modal */}
      {showAgcAutoPostModal && <Suspense fallback={null}>
      <AgcAutoPostModal
        isOpen={showAgcAutoPostModal}
        onClose={() => setShowAgcAutoPostModal(false)}
        onPostsGenerated={(newPosts) => {
          setAgcPosts(prev => [...newPosts, ...prev.filter(p => !newPosts.some(n => n.id === p.id))]);
        }}
        onNavigateToAgcBlog={() => {
          setShowAgcAutoPostModal(false);
          setCurrentView('agc_blog');
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState({}, '', '/agc');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        totalAgcPostsCount={agcPosts.length}
      />
      </Suspense>}

      {/* Peringatan Akses Modul Berbasis Link Iframe (Khusus Admin) */}
      <IframeLockedModal
        isOpen={showIframeLockedModal}
        tool={selectedIframeLockedTool}
        userRole={userRole}
        onClose={() => {
          setShowIframeLockedModal(false);
          setSelectedIframeLockedTool(null);
        }}
        onOpenAdminLogin={() => {
          setShowIframeLockedModal(false);
          setShowPinLoginModal(true);
        }}
        onAdminAuthorized={(unlockedTool) => {
          setShowIframeLockedModal(false);
          setSelectedIframeLockedTool(null);
          setActiveTool(unlockedTool);
        }}
        onSelectAlternativeTool={(toolId) => {
          setShowIframeLockedModal(false);
          setSelectedIframeLockedTool(null);
          for (const cat of categories) {
            const found = cat.tools.find(t => t.id === toolId);
            if (found) {
              if (found.id === 'art-6' || found.url === '/artikel-gemini' || found.url === 'internal://artikel-gemini') {
                if (onNavigateToPath) {
                  onNavigateToPath('/artikel-gemini');
                } else {
                  window.history.pushState(null, '', '/artikel-gemini');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
                return;
              }
              setActiveTool(found);
              return;
            }
          }
        }}
      />

    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return appPathname().toLowerCase().replace(/\/$/, '');
    }
    return '';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const customUser = null;
        if (customUser) return JSON.parse(customUser);
      } catch (e) {}
    }
    return auth.currentUser;
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(appPathname().toLowerCase().replace(/\/$/, ''));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        try {
          const customUser = null;
          if (customUser) setCurrentUser(JSON.parse(customUser));
          else setCurrentUser(null);
        } catch (e) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsub();
  }, []);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  const isAdmin = (currentUser as any)?.role === 'admin';

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isAuthBridge = currentPath === '/auth-bridge' || searchParams.get('auth_bridge') === '1' || searchParams.has('auth_bridge');
  if (isAuthBridge) {
    return <AuthBridgeView />;
  }

  const isNotaJilid = currentPath === '/notajilid' || currentPath === '/notahardcover' || searchParams.get('view') === 'notajilid' || searchParams.get('view') === 'notahardcover';
  if (isNotaJilid) {
    if (!isAdmin) {
      return (
        <IframeLockedPageView 
          title="Nota Jilid & Kasir Digital"
          onBackToHome={() => {
            window.history.pushState(null, '', '/');
            setCurrentPath('');
          }}
          onUnlockSuccess={() => setIsAdminUnlocked(true)}
        />
      );
    }
    return (
      <NotaJilidView 
        onBackToHome={() => {
          window.history.pushState(null, '', '/');
          setCurrentPath('');
        }} 
      />
    );
  }

  const isSewaToga = currentPath === '/sewatoga' || currentPath === '/sewa-toga' || searchParams.get('view') === 'sewatoga' || searchParams.get('view') === 'sewa-toga';
  if (isSewaToga) {
    if (!isAdmin) {
      return (
        <IframeLockedPageView 
          title="Sewa Toga & Inventaris Wisuda"
          onBackToHome={() => {
            window.history.pushState(null, '', '/');
            setCurrentPath('');
          }}
          onUnlockSuccess={() => setIsAdminUnlocked(true)}
        />
      );
    }
    return (
      <SewaTogaView 
        onBackToHome={() => {
          window.history.pushState(null, '', '/');
          setCurrentPath('');
        }} 
      />
    );
  }

  const directPublicTool = ({
    '/gabung-file': 'gabung-1', '/gabung': 'gabung-1',
    '/artikel-gemini': 'art-6', '/artikel6': 'art-6', '/journal-converter': 'art-7',
    '/artikel7': 'art-7', '/artikel-jurnal': 'art-7', '/pisah-skripsi': 'split-3',
    '/split-pdf': 'split-3', '/pemisah-skripsi': 'split-3'
  } as Record<string, string>)[currentPath || '/' ] || ({
    'artikel-gemini': 'art-6', artikel6: 'art-6', 'journal-converter': 'art-7',
    artikel7: 'art-7', 'pisah-skripsi': 'split-3'
  } as Record<string, string>)[searchParams.get('view') || ''];
  if (directPublicTool) {
    return <AcademicHubMainApp key={directPublicTool} initialToolId={directPublicTool} />;
  }

  const isHardCover = currentPath === '/edit-hard-cover' || currentPath === '/hardcover' || currentPath === '/cover' || searchParams.get('view') === 'edit-hard-cover' || searchParams.get('view') === 'hardcover' || searchParams.get('view') === 'cover';
  if (isHardCover) {
    if (!isAdmin) {
      return (
        <IframeLockedPageView 
          title="Editor Hard Cover Skripsi V4.10"
          onBackToHome={() => {
            window.history.pushState(null, '', '/');
            setCurrentPath('');
          }}
          onUnlockSuccess={() => setIsAdminUnlocked(true)}
        />
      );
    }
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#07111f] flex items-center justify-center text-amber-400 font-semibold">Memuat ZAIN.NET Cover V4.10...</div>}>
        <HardCoverView
          onBackToHome={() => {
            window.history.pushState(null, '', '/');
            setCurrentPath('');
          }}
          isStandalone={true}
        />
      </Suspense>
    );
  }

  return (
    <AcademicHubMainApp 
      onNavigateToPath={(path) => {
        window.history.pushState(null, '', path);
        setCurrentPath(path.toLowerCase().replace(/\/$/, ''));
      }} 
    />
  );
}


// ZAINNET_SUPABASE_AUTH_ONLY_20261112
