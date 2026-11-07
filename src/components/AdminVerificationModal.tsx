import { database } from '../storage/client';
import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Check, 
  Trash2, 
  ExternalLink, 
  Eye, 
  MessageCircle, 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  User as UserIcon, 
  Building2, 
  Image as ImageIcon,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Download,
  AlertTriangle,
  LockOpen,
  Send,
  Wallet,
  Sliders,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  Coins,
  ChevronDown,
  Laptop,
  Globe,
  Cpu,
  BarChart3,
  UserCheck,
  UserMinus,
  KeyRound,
  Copy,
  Mail,
  Lock,
  EyeOff,
  Users,
  Phone,
  Shield
} from 'lucide-react';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs, increment } from '../storage/documents';
import { db } from '../firebase';
import { UserPurchase, ToolCategory, RolesConfig, DeviceTrialRecord } from '../types';
import { 
  createOrUpdateAccountByAdmin, 
  promoteUserToResellerRole, 
  revokeUserResellerRole, 
  updateAccountPasswordByAdmin 
} from '../utils/authService';


interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: UserPurchase[];
  categories: ToolCategory[];
  rolesConfig: RolesConfig;
  currentUserEmail?: string | null;
  currentUserId?: string;
  currentQuotas?: Record<string, number>;
  onUpdateCurrentQuotas?: (newQuotas: Record<string, number>) => void;
  onRefresh: () => Promise<void>;
  onApproveSuccess?: (purchase: UserPurchase) => void;
  onResetAllTransactions?: () => Promise<void>;
  onOpenTrafficStats?: () => void;
  onSaveRolesConfig?: (newConfig: RolesConfig) => Promise<void> | void;
}

type FilterStatus = 'pending' | 'completed' | 'rejected' | 'all' | 'quotas' | 'wallets' | 'resellers' | 'device_trials';

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({
  isOpen,
  onClose,
  purchases = [],
  categories = [],
  rolesConfig,
  currentUserEmail,
  currentUserId,
  currentQuotas,
  onUpdateCurrentQuotas,
  onRefresh = async () => {},
  onApproveSuccess,
  onResetAllTransactions,
  onOpenTrafficStats,
  onSaveRolesConfig
}) => {
  const [activeTab, setActiveTab] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [isResettingAll, setIsResettingAll] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectingPurchase, setRejectingPurchase] = useState<UserPurchase | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Nominal transfer tidak sesuai atau bukti tidak terbaca.');
  
  // Image Zoom Modal state
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string; orderId: string } | null>(null);
  
  // Action loading state
  const [processingId, setProcessingId] = useState<string | null>(null);

  // User Quotas Manager State
  const [selectedUserForQuota, setSelectedUserForQuota] = useState<{ userId: string; userEmail: string; senderName?: string } | null>(null);
  const [userQuotasEditing, setUserQuotasEditing] = useState<Record<string, number>>({});
  const [userLoyaltyEditing, setUserLoyaltyEditing] = useState<{ purchaseCount: number; freeRewardsAvailable: number }>({ purchaseCount: 1, freeRewardsAvailable: 0 });
  const [isLoadingUserQuota, setIsLoadingUserQuota] = useState<boolean>(false);
  const [quotaSaveSuccessMsg, setQuotaSaveSuccessMsg] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // User Wallets Monitoring State (Sisa Saldo & Penggunaan untuk Produk Apa Saja)
  const [userWallets, setUserWallets] = useState<Array<{
    userId: string;
    email: string;
    displayName: string;
    role: string;
    balance: number;
    totalTopup: number;
    totalSpent: number;
    usedProducts: Array<{
      id: string;
      itemTitle: string;
      amount: number;
      purchasedAt: number;
      notes?: string;
    }>;
  }>>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState<boolean>(false);
  const [walletSearchQuery, setWalletSearchQuery] = useState<string>('');
  const [editingUserBalance, setEditingUserBalance] = useState<{ userId: string; email: string; currentBalance: number; newBalance: number } | null>(null);
  const [isSavingBalance, setIsSavingBalance] = useState<boolean>(false);
  const [balanceSaveSuccess, setBalanceSaveSuccess] = useState<string | null>(null);
  const [expandedWalletUserId, setExpandedWalletUserId] = useState<string | null>(null);

  // Reseller Management States (Diskon 50% Otomatis)
  const [resellerSearchQuery, setResellerSearchQuery] = useState<string>('');
  const [newResellerEmail, setNewResellerEmail] = useState<string>('');
  const [newResellerPassword, setNewResellerPassword] = useState<string>('');
  const [newResellerName, setNewResellerName] = useState<string>('');
  const [newResellerWa, setNewResellerWa] = useState<string>('');
  const [newResellerBalance, setNewResellerBalance] = useState<string>('');
  const [showResellerPass, setShowResellerPass] = useState<boolean>(false);
  const [isCreatingReseller, setIsCreatingReseller] = useState<boolean>(false);
  const [resellerCreatedSuccess, setResellerCreatedSuccess] = useState<{
    email: string;
    password: string;
    name: string;
    balance?: number;
  } | null>(null);
  const [resellerErrorMsg, setResellerErrorMsg] = useState<string | null>(null);
  const [copiedResellerCreds, setCopiedResellerCreds] = useState<boolean>(false);
  const [resellerAccountsList, setResellerAccountsList] = useState<Array<{
    email: string;
    name: string;
    whatsapp?: string;
    role: string;
    balance: number;
    uid?: string;
    updatedAt?: number;
  }>>([]);
  const [isLoadingResellers, setIsLoadingResellers] = useState<boolean>(false);
  const [resetTargetResellerEmail, setResetTargetResellerEmail] = useState<string | null>(null);
  const [newPasswordForReseller, setNewPasswordForReseller] = useState<string>('');
  const [isResettingResellerPassword, setIsResettingResellerPassword] = useState<boolean>(false);
  const [resetResellerFeedback, setResetResellerFeedback] = useState<string | null>(null);

  const loadResellerAccountsData = async () => {
    setIsLoadingResellers(true);
    try {
      const resellersMap = new Map<string, {
        email: string;
        name: string;
        whatsapp?: string;
        role: string;
        balance: number;
        uid?: string;
        updatedAt?: number;
      }>();

      // 1. Configured resellers from rolesConfig
      const configuredResellers = rolesConfig?.resellerEmails || [];
      for (const email of configuredResellers) {
        const clean = email.trim().toLowerCase();
        if (clean) {
          resellersMap.set(clean, {
            email: clean,
            name: 'Mitra Reseller',
            whatsapp: '',
            role: 'reseller',
            balance: 0,
            uid: undefined
          });
        }
      }

      // 2. Query auth_accounts from Firestore
      try {
        const authAccountsSnap = await getDocs(collection(db, 'auth_accounts'));
        authAccountsSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const em = (d.email || '').trim().toLowerCase();
          if (em && (d.role === 'reseller' || resellersMap.has(em))) {
            const existing = resellersMap.get(em);
            resellersMap.set(em, {
              email: em,
              name: d.name || existing?.name || 'Mitra Reseller',
              whatsapp: d.whatsapp || existing?.whatsapp || '',
              role: 'reseller',
              balance: existing?.balance || 0,
              uid: d.uid || existing?.uid,
              updatedAt: d.updatedAt
            });
          }
        });
      } catch (e) {}

      // 3. Query users collection from Firestore
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          const uEmail = (userData.email || '').trim().toLowerCase();
          if (!uEmail) continue;

          if (userData.role === 'reseller' || resellersMap.has(uEmail)) {
            let bal = typeof userData.walletBalance === 'number' ? userData.walletBalance : 0;
            try {
              const wSnap = await getDoc(doc(db, 'users', userDoc.id, 'data', 'wallet'));
              if (wSnap.exists() && typeof wSnap.data().balance === 'number') {
                bal = wSnap.data().balance;
              }
            } catch (errW) {}

            const existing = resellersMap.get(uEmail);
            resellersMap.set(uEmail, {
              email: uEmail,
              name: userData.displayName || existing?.name || 'Mitra Reseller',
              whatsapp: userData.whatsapp || existing?.whatsapp || '',
              role: 'reseller',
              balance: bal,
              uid: userDoc.id,
              updatedAt: userData.updatedAt || existing?.updatedAt
            });
          }
        }
      } catch (e) {}

      setResellerAccountsList(Array.from(resellersMap.values()));
    } catch (err) {
      console.warn('Error loading reseller accounts in admin modal:', err);
    } finally {
      setIsLoadingResellers(false);
    }
  };

  const generateRandomResellerPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let pass = 'Zain';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setNewResellerPassword(pass);
  };

  const handleCopyResellerWhatsApp = (account: { email: string; password?: string; name?: string; balance?: number }) => {
    const balanceText = typeof account.balance === 'number' && account.balance > 0
      ? `\n💰 *Saldo Awal:* Rp ${account.balance.toLocaleString('id-ID')}`
      : '';
    const passText = account.password ? `\n🔑 *Password:* ${account.password}` : '';
    const text = `*AKUN RESELLER RESMI ZAIN.NET ACADEMIC HUB*
Halo ${account.name || 'Mitra Reseller'}, akun kemitraan Anda telah aktif:
📧 *Email:* ${account.email}${passText}${balanceText}
🏷️ *Status:* Reseller Mitra Resmi
✨ *Keuntungan Kemitraan:*
 • Otomatis Diskon 50% untuk Seluruh Modul & Link Pembuatan
 • Gratis 3x Free Trial untuk setiap item modul
 • Akses prioritas layanan akademik ZAIN.NET

🌐 *Link Login:* ${window.location.origin}
(Klik tombol 'Masuk Mahasiswa / Akun' lalu masuk dengan Email & Password di atas)`;

    navigator.clipboard.writeText(text);
    setCopiedResellerCreds(true);
    setTimeout(() => setCopiedResellerCreds(false), 2500);
  };

  const handleAdminCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    setResellerErrorMsg(null);
    setResellerCreatedSuccess(null);

    const cleanEmail = newResellerEmail.trim().toLowerCase();
    const cleanPassword = newResellerPassword.trim();
    const cleanName = newResellerName.trim() || 'Mitra Reseller ZAIN.NET';
    const cleanWa = newResellerWa.trim();
    const initialBal = parseInt(newResellerBalance.replace(/\D/g, ''), 10) || 0;

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setResellerErrorMsg('Format email tidak valid (contoh: mitra@domain.com)');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setResellerErrorMsg('Password reseller minimal 4 karakter.');
      return;
    }

    setIsCreatingReseller(true);
    try {
      const res = await createOrUpdateAccountByAdmin({
        email: cleanEmail,
        password: cleanPassword,
        name: cleanName,
        whatsapp: cleanWa,
        role: 'reseller',
        initialBalance: initialBal
      });

      if (!res.success) {
        setResellerErrorMsg(res.error || 'Gagal membuat akun reseller.');
        return;
      }

      // Update rolesConfig.resellerEmails if callback available
      if (rolesConfig && onSaveRolesConfig) {
        const currentResellers = rolesConfig.resellerEmails || [];
        if (!currentResellers.some(r => r.trim().toLowerCase() === cleanEmail)) {
          await onSaveRolesConfig({
            ...rolesConfig,
            resellerEmails: [...currentResellers, cleanEmail],
            resellerDiscountPercentage: rolesConfig.resellerDiscountPercentage || 50
          });
        }
      }

      setResellerCreatedSuccess({
        email: cleanEmail,
        password: cleanPassword,
        name: cleanName,
        balance: initialBal
      });

      setNewResellerEmail('');
      setNewResellerPassword('');
      setNewResellerName('');
      setNewResellerWa('');
      setNewResellerBalance('');

      await loadResellerAccountsData();
      await loadUserWalletsData();
    } catch (err: any) {
      setResellerErrorMsg(err?.message || 'Terjadi kesalahan sistem saat membuat akun reseller.');
    } finally {
      setIsCreatingReseller(false);
    }
  };

  const handlePromoteToReseller = async (email: string, uid?: string, name?: string) => {
    try {
      const res = await promoteUserToResellerRole(email, uid);
      if (res.success) {
        if (rolesConfig && onSaveRolesConfig) {
          const currentList = rolesConfig.resellerEmails || [];
          if (!currentList.includes(email.toLowerCase())) {
            await onSaveRolesConfig({
              ...rolesConfig,
              resellerEmails: [...currentList, email.toLowerCase()]
            });
          }
        }
        await loadResellerAccountsData();
        await loadUserWalletsData();
      }
    } catch (e) {
      console.warn('Promote error:', e);
    }
  };

  const handleRevokeReseller = async (email: string, uid?: string) => {
    if (!confirm(`Cabut status reseller dari akun ${email}?\nAkun akan kembali menjadi Pengguna Umum (harga normal).`)) {
      return;
    }
    try {
      const res = await revokeUserResellerRole(email, uid);
      if (res.success) {
        if (rolesConfig && onSaveRolesConfig) {
          const currentList = rolesConfig.resellerEmails || [];
          await onSaveRolesConfig({
            ...rolesConfig,
            resellerEmails: currentList.filter(e => e.toLowerCase() !== email.toLowerCase())
          });
        }
        await loadResellerAccountsData();
        await loadUserWalletsData();
      }
    } catch (e) {
      console.warn('Revoke error:', e);
    }
  };

  const handleSaveResellerPasswordReset = async (email: string) => {
    if (!newPasswordForReseller.trim() || newPasswordForReseller.trim().length < 4) {
      setResetResellerFeedback('Password baru minimal 4 karakter.');
      return;
    }
    setIsResettingResellerPassword(true);
    try {
      const res = await updateAccountPasswordByAdmin(email, newPasswordForReseller.trim());
      if (res.success) {
        setResetResellerFeedback(`Password akun ${email} berhasil diubah!`);
        setTimeout(() => {
          setResetTargetResellerEmail(null);
          setNewPasswordForReseller('');
          setResetResellerFeedback(null);
        }, 1500);
      } else {
        setResetResellerFeedback(res.error || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      setResetResellerFeedback(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsResettingResellerPassword(false);
    }
  };

  // Device Trials Tracking State (Anti-Abuse Monitor)
  const [deviceTrialsList, setDeviceTrialsList] = useState<DeviceTrialRecord[]>([]);
  const [isLoadingDeviceTrials, setIsLoadingDeviceTrials] = useState<boolean>(false);
  const [deviceTrialSearchQuery, setDeviceTrialSearchQuery] = useState<string>('');
  const [deviceTrialSuccessMsg, setDeviceTrialSuccessMsg] = useState<string | null>(null);

  const loadDeviceTrialsData = async () => {
    setIsLoadingDeviceTrials(true);
    try {
      const snap = await getDocs(collection(db, 'device_trials'));
      const list: DeviceTrialRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      list.sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0));
      setDeviceTrialsList(list);
    } catch (e) {
      console.warn('Error loading device trials in admin modal:', e);
    } finally {
      setIsLoadingDeviceTrials(false);
    }
  };

  const handleDeleteDeviceTrial = async (record: DeviceTrialRecord) => {
    if (!confirm(`Reset jatah Free Trial untuk perangkat ini (${record.osName} / ${record.ipAddress})?\nPerangkat ini akan diizinkan untuk mengklaim ulang Free Trial.`)) return;
    try {
      await deleteDoc(doc(db, 'device_trials', record.id));
      setDeviceTrialsList((prev) => prev.filter((r) => r.id !== record.id));
      setDeviceTrialSuccessMsg(`Jatah Free Trial perangkat (${record.osName}) berhasil direset!`);
      setTimeout(() => setDeviceTrialSuccessMsg(null), 4000);
    } catch (e: any) {
      alert('Gagal mereset perangkat: ' + e?.message);
    }
  };

  const loadUserWalletsData = async () => {
    setIsLoadingWallets(true);
    try {
      const userMap: Record<string, {
        userId: string;
        email: string;
        displayName: string;
        role: string;
        balance: number;
      }> = {};

      // 1. Fetch from 'users' collection
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach((d) => {
          const data = d.data();
          const uid = d.id;
          const email = data.email || data.userEmail || '';
          const isRes = rolesConfig.resellerEmails?.some((re) => re.trim().toLowerCase() === email.trim().toLowerCase());
          userMap[uid] = {
            userId: uid,
            email: email,
            displayName: data.displayName || data.name || (email ? email.split('@')[0] : 'Pengguna'),
            role: data.role || (isRes ? 'reseller' : 'public'),
            balance: typeof data.walletBalance === 'number' ? data.walletBalance : (typeof data.balance === 'number' ? data.balance : 0)
          };
        });
      } catch (err) {
        console.warn('Error reading users collection:', err);
      }

      // 2. Fetch from 'auth_accounts' collection (accounts created by Admin)
      try {
        const authSnap = await getDocs(collection(db, 'auth_accounts'));
        authSnap.forEach((d) => {
          const data = d.data();
          const uid = data.uid || d.id;
          const email = data.email || '';
          if (!userMap[uid]) {
            userMap[uid] = {
              userId: uid,
              email: email,
              displayName: data.displayName || data.name || (email ? email.split('@')[0] : 'Pengguna'),
              role: data.role || 'public',
              balance: typeof data.walletBalance === 'number' ? data.walletBalance : 0
            };
          }
        });
      } catch (err) {
        console.warn('Error reading auth_accounts collection:', err);
      }

      // 3. Scan purchases to register any users not yet in userMap
      purchases.forEach((p) => {
        if (p.userId && !userMap[p.userId]) {
          const email = p.userEmail || '';
          const isRes = rolesConfig.resellerEmails?.some((re) => re.trim().toLowerCase() === email.trim().toLowerCase());
          userMap[p.userId] = {
            userId: p.userId,
            email: email,
            displayName: p.senderName || (email ? email.split('@')[0] : 'Pengguna'),
            role: isRes ? 'reseller' : 'public',
            balance: 0
          };
        }
      });

      // 4. Fetch users/{uid}/data/wallet for users whose balance is 0
      const userList = Object.values(userMap);
      await Promise.all(
        userList.map(async (u) => {
          if (u.balance === 0) {
            try {
              const wSnap = await getDoc(doc(db, 'users', u.userId, 'data', 'wallet'));
              if (wSnap.exists() && typeof wSnap.data()?.balance === 'number') {
                u.balance = wSnap.data().balance;
              }
            } catch (e) {}
          }
        })
      );

      // 5. Aggregate purchase history for each user
      const compiled = userList.map((u) => {
        const userPurchases = purchases.filter((p) => 
          p.userId === u.userId || 
          (p.userEmail && u.email && p.userEmail.toLowerCase() === u.email.toLowerCase())
        );

        const topups = userPurchases.filter((p) => 
          p.itemType === 'topup' && (p.status === 'completed' || p.status === 'settlement')
        );
        const totalTopup = topups.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        const walletPurchases = userPurchases.filter((p) => 
          p.paymentType === 'wallet_balance' || 
          p.method === 'wallet_balance' || 
          (p.senderBank && p.senderBank.toLowerCase().includes('saldo')) ||
          (p.transferNotes && p.transferNotes.toLowerCase().includes('potong saldo'))
        );

        const totalSpent = walletPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        const usedProducts = walletPurchases.map((p) => ({
          id: p.id,
          itemTitle: p.itemTitle || 'Modul Akademik',
          amount: p.amountPaid,
          purchasedAt: p.purchasedAt,
          notes: p.transferNotes
        })).sort((a, b) => b.purchasedAt - a.purchasedAt);

        return {
          ...u,
          totalTopup,
          totalSpent,
          usedProducts
        };
      });

      // Sort: users with balance > 0 first, then users who spent saldo
      compiled.sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return b.totalSpent - a.totalSpent;
      });

      setUserWallets(compiled);
    } catch (err) {
      console.error('Error loading user wallets data:', err);
    } finally {
      setIsLoadingWallets(false);
    }
  };

  const handleSaveBalance = async (userId: string, newBalance: number) => {
    setIsSavingBalance(true);
    setBalanceSaveSuccess(null);
    try {
      await setDoc(doc(db, 'users', userId), {
        walletBalance: newBalance,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'users', userId, 'data', 'wallet'), {
        balance: newBalance,
        lastUpdated: Date.now()
      }, { merge: true });

      const targetEmail = (editingUserBalance?.email || '').trim().toLowerCase();
      if (targetEmail) {
        const emailDocId = targetEmail.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'wallets_by_email', emailDocId), {
          userId,
          userEmail: targetEmail,
          balance: newBalance,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
        await setDoc(doc(db, 'auth_accounts', emailDocId), {
          walletBalance: newBalance,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }

      setBalanceSaveSuccess('Saldo pengguna berhasil diperbarui!');
      setTimeout(() => {
        setBalanceSaveSuccess(null);
        setEditingUserBalance(null);
      }, 1500);

      setUserWallets((prev) => prev.map((u) => u.userId === userId ? { ...u, balance: newBalance } : u));
    } catch (err: any) {
      alert(`Gagal memperbarui saldo: ${err.message}`);
    } finally {
      setIsSavingBalance(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      if (activeTab === 'wallets') {
        await loadUserWalletsData();
      } else if (activeTab === 'resellers') {
        await loadResellerAccountsData();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check for abnormal quota (e.g. 384x on art-1)
  const abnormalQuotaInfo = useMemo(() => {
    if (currentQuotas) {
      for (const [toolId, val] of Object.entries(currentQuotas)) {
        if (typeof val === 'number' && val > 10) {
          return { userId: currentUserId || 'current', toolId, quota: val, isCurrent: true };
        }
      }
    }
    return null;
  }, [currentQuotas, currentUserId]);

  // Extract unique users from purchases & current session
  const uniqueUsersList = useMemo(() => {
    const map = new Map<string, { userId: string; userEmail: string; senderName?: string; purchaseCount: number }>();
    
    if (currentUserId && currentUserEmail) {
      map.set(currentUserId, {
        userId: currentUserId,
        userEmail: currentUserEmail,
        senderName: 'Akun Anda Saat Ini',
        purchaseCount: 0
      });
    }

    purchases.forEach((p) => {
      if (p.userId && p.userId !== 'guest') {
        const existing = map.get(p.userId);
        if (existing) {
          existing.purchaseCount++;
          if (!existing.senderName && p.senderName) existing.senderName = p.senderName;
        } else {
          map.set(p.userId, {
            userId: p.userId,
            userEmail: p.userEmail || p.userId,
            senderName: p.senderName || '',
            purchaseCount: 1
          });
        }
      }
    });

    return Array.from(map.values());
  }, [purchases, currentUserId, currentUserEmail]);

  // Load quotas for a selected user
  const handleSelectUserForQuota = async (userObj: { userId: string; userEmail: string; senderName?: string }) => {
    setSelectedUserForQuota(userObj);
    setIsLoadingUserQuota(true);
    setQuotaSaveSuccessMsg(null);
    try {
      if (userObj.userId === currentUserId && currentQuotas) {
        setUserQuotasEditing({ ...currentQuotas });
      } else {
        const qSnap = await getDoc(doc(db, 'users', userObj.userId, 'data', 'quotas'));
        if (qSnap.exists()) {
          setUserQuotasEditing(qSnap.data() as Record<string, number>);
        } else {
          setUserQuotasEditing({});
        }
      }

      const lSnap = await getDoc(doc(db, 'users', userObj.userId, 'data', 'loyalty'));
      if (lSnap.exists()) {
        const lData = lSnap.data() as any;
        setUserLoyaltyEditing({
          purchaseCount: lData.purchaseCount || 0,
          freeRewardsAvailable: lData.freeRewardsAvailable || 0
        });
      } else {
        setUserLoyaltyEditing({ purchaseCount: 1, freeRewardsAvailable: 0 });
      }
    } catch (err) {
      console.warn('Error loading user quotas in admin modal:', err);
    } finally {
      setIsLoadingUserQuota(false);
    }
  };

  // Quick fix button for abnormal quota (e.g. 384x -> 1x)
  const handleQuickFixAbnormalQuota = async (userId: string, toolId: string) => {
    try {
      setProcessingId('quickfix');
      const targetUid = userId === 'current' && currentUserId ? currentUserId : userId;
      const updated = {
        ...(currentQuotas || {}),
        [toolId]: 1
      };

      if (targetUid) {
        await setDoc(doc(db, 'users', targetUid, 'data', 'quotas'), updated);
        // Also normalize loyalty stamp
        await setDoc(doc(db, 'users', targetUid, 'data', 'loyalty'), {
          purchaseCount: 1,
          freeRewardsAvailable: 0,
          totalFreeEarned: 0,
          totalFreeClaimed: 0
        }, { merge: true });
      }

      if (onUpdateCurrentQuotas) {
        onUpdateCurrentQuotas(updated);
      }

      alert(`Berhasil! Kuota modul ${toolId} berhasil dinormalkan menjadi 1x Buat.`);
      await onRefresh();
    } catch (e: any) {
      alert('Gagal memperbaiki kuota: ' + e?.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Save modified quotas and loyalty for a user
  const handleSaveUserQuotas = async () => {
    if (!selectedUserForQuota) return;
    setProcessingId('save-user-quotas');
    try {
      const uid = selectedUserForQuota.userId;
      await setDoc(doc(db, 'users', uid, 'data', 'quotas'), userQuotasEditing);
      await setDoc(doc(db, 'users', uid, 'data', 'loyalty'), {
        purchaseCount: userLoyaltyEditing.purchaseCount,
        freeRewardsAvailable: userLoyaltyEditing.freeRewardsAvailable,
        totalFreeEarned: userLoyaltyEditing.freeRewardsAvailable,
        totalFreeClaimed: 0
      }, { merge: true });

      if (uid === currentUserId && onUpdateCurrentQuotas) {
        onUpdateCurrentQuotas(userQuotasEditing);
      }

      setQuotaSaveSuccessMsg(`Data kuota dan stempel akun ${selectedUserForQuota.userEmail} berhasil diperbarui di database!`);
      setTimeout(() => setQuotaSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan kuota: ' + err?.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    purchases.forEach((p) => {
      const isApproved = p.status === 'completed' || p.status === 'settlement';
      if (isApproved) {
        totalRevenue += p.amountPaid || 0;
        approvedCount++;
      } else if (p.status === 'rejected') {
        rejectedCount++;
      } else {
        // Pending or default
        pendingCount++;
      }
    });

    return { totalRevenue, pendingCount, approvedCount, rejectedCount, totalCount: purchases.length };
  }, [purchases]);

  // Filtered List
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const isApproved = p.status === 'completed' || p.status === 'settlement';
      const isPending = !p.status || p.status === 'pending';
      const isRejected = p.status === 'rejected';

      if (activeTab === 'pending' && !isPending) return false;
      if (activeTab === 'completed' && !isApproved) return false;
      if (activeTab === 'rejected' && !isRejected) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesOrder = p.id.toLowerCase().includes(q) || (p.orderId && p.orderId.toLowerCase().includes(q));
        const matchesEmail = p.userEmail?.toLowerCase().includes(q);
        const matchesName = p.senderName?.toLowerCase().includes(q);
        const matchesItem = p.itemTitle.toLowerCase().includes(q);
        const matchesBank = p.senderBank?.toLowerCase().includes(q);
        return matchesOrder || matchesEmail || matchesName || matchesItem || matchesBank;
      }

      return true;
    });
  }, [purchases, activeTab, searchQuery]);

  if (!isOpen) return null;

  // Approve Transaction Action
  const handleApprove = async (purchase: UserPurchase) => {
    if (processingId) return;
    setProcessingId(purchase.id);

    try {
      let updatedPurchase: UserPurchase | null = null;
      try {
        const { data, error } = await database().rpc('academic_approve_transaction', { p_id: purchase.id });
        if (!error && data) {
          updatedPurchase = data as UserPurchase;
        }
      } catch (_e) {}

      if (!updatedPurchase) {
        updatedPurchase = {
          ...purchase,
          status: 'completed',
          verifiedAt: Date.now(),
          verifiedBy: currentUserEmail || 'Admin ZAIN.NET'
        };

        let targetUid = purchase.userId && purchase.userId !== 'guest' ? purchase.userId : null;
        const cleanEmail = (purchase.userEmail || '').trim().toLowerCase();

        // 1. Update global transaction record
        await setDoc(doc(db, 'transactions', purchase.id), updatedPurchase, { merge: true });

        // 2. If it's a top up, credit user wallet balance safely with exact number
        if (purchase.itemType === 'topup') {
          const topupNominal = Number(purchase.amountPaid || purchase.originalAmount || 0);

          if (!targetUid && cleanEmail && !cleanEmail.includes('@guest.')) {
            try {
              const uSnap = await getDocs(collection(db, 'users'));
              for (const u of uSnap.docs) {
                if (u.data()?.email?.toLowerCase() === cleanEmail) {
                  targetUid = u.id;
                  break;
                }
              }
              if (!targetUid) {
                const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
                const aSnap = await getDoc(doc(db, 'auth_accounts', emailDocId));
                if (aSnap.exists() && aSnap.data()?.uid) {
                  targetUid = aSnap.data().uid;
                }
              }
            } catch (_u) {}
          }

          if (targetUid) {
            try {
              // Read current balance from wallet doc, users doc, or email doc
              let currentBalance = 0;
              const wSnap = await getDoc(doc(db, 'users', targetUid, 'data', 'wallet'));
              if (wSnap.exists()) {
                const d = wSnap.data();
                if (typeof d?.balance === 'number') currentBalance = d.balance;
                else if (d?.balance && typeof d.balance.__academic_increment === 'number') currentBalance = d.balance.__academic_increment;
              }
              if (currentBalance === 0) {
                const uSnap = await getDoc(doc(db, 'users', targetUid));
                if (uSnap.exists() && typeof uSnap.data()?.walletBalance === 'number') {
                  currentBalance = uSnap.data().walletBalance;
                }
              }
              if (currentBalance === 0 && cleanEmail) {
                const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
                const eSnap = await getDoc(doc(db, 'wallets_by_email', emailDocId));
                if (eSnap.exists() && typeof eSnap.data()?.balance === 'number') {
                  currentBalance = eSnap.data().balance;
                }
              }

              const newBalance = Math.max(0, currentBalance) + topupNominal;
              const now = Date.now();

              // Write concrete number to users/{targetUid}/data/wallet
              await setDoc(doc(db, 'users', targetUid, 'data', 'wallet'), {
                userId: targetUid,
                userEmail: cleanEmail,
                balance: newBalance,
                updatedAt: now
              }, { merge: true });

              // Write to users/{targetUid}
              await setDoc(doc(db, 'users', targetUid), {
                walletBalance: newBalance,
                updatedAt: new Date().toISOString()
              }, { merge: true });

              // Write to wallets_by_email for cross-lookup resilience
              if (cleanEmail) {
                const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
                await setDoc(doc(db, 'wallets_by_email', emailDocId), {
                  userId: targetUid,
                  userEmail: cleanEmail,
                  balance: newBalance,
                  updatedAt: now
                }, { merge: true });

                // Also sync auth_accounts if exists
                await setDoc(doc(db, 'auth_accounts', emailDocId), {
                  walletBalance: newBalance,
                  updatedAt: now
                }, { merge: true }).catch(() => {});
              }

              // Update local state in AdminVerificationModal
              setUserWallets(prev => prev.map(w => (w.userId === targetUid || (w.email && w.email.toLowerCase() === cleanEmail)) ? { ...w, balance: newBalance } : w));
            } catch (_wErr) {
              console.error('Error crediting wallet on approve:', _wErr);
            }
          }
        }

        // 3. If it's a tool purchase, credit user tool quota atomically
        if (purchase.itemType === 'tool' && purchase.userId && purchase.userId !== 'guest') {
          const toolId = purchase.itemId.replace('tool:', '');
          const quotaToAdd = purchase.quotaGranted || 1;
          try {
            await setDoc(doc(db, 'users', purchase.userId, 'data', 'quotas'), {
              [toolId]: increment(quotaToAdd),
              updatedAt: Date.now()
            }, { merge: true });
          } catch (_qErr) {}
        }

        // 4. Update user's personal purchase history
        const userUidToUpdate = targetUid || (purchase.userId && purchase.userId !== 'guest' ? purchase.userId : null);
        if (userUidToUpdate) {
          try {
            await setDoc(doc(db, 'users', userUidToUpdate, 'purchases', purchase.id), {
              ...updatedPurchase,
              userId: userUidToUpdate
            }, { merge: true });
          } catch (_uErr) {}
        }
      }

      if (onApproveSuccess && updatedPurchase) {
        onApproveSuccess(updatedPurchase);
      }

      await onRefresh();
    } catch (err: any) {
      console.error('Error approving transaction:', err);
      alert('Gagal menyetujui transaksi: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Transaction Action
  const handleConfirmReject = async () => {
    if (!rejectingPurchase || processingId) return;
    setProcessingId(rejectingPurchase.id);

    try {
      const updatedPurchase: UserPurchase = {
        ...rejectingPurchase,
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        verifiedAt: Date.now(),
        verifiedBy: currentUserEmail || 'Admin ZAIN.NET'
      };

      await setDoc(doc(db, 'transactions', rejectingPurchase.id), updatedPurchase, { merge: true });

      if (rejectingPurchase.userId && rejectingPurchase.userId !== 'guest') {
        try {
          await setDoc(doc(db, 'users', rejectingPurchase.userId, 'purchases', rejectingPurchase.id), updatedPurchase, { merge: true });
        } catch (e) {}
      }

      setRejectingPurchase(null);
      await onRefresh();
    } catch (err) {
      console.error('Error rejecting transaction:', err);
      alert('Gagal menolak transaksi: ' + (err as any)?.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Delete Transaction Action
  const handleDeleteTransaction = async (purchaseId: string) => {
    if (!confirm('Yakin ingin menghapus catatan transaksi ini dari database?')) return;
    setProcessingId(purchaseId);

    try {
      const targetPurchase = purchases.find((p) => p.id === purchaseId);
      await deleteDoc(doc(db, 'transactions', purchaseId));
      
      if (targetPurchase?.userId && targetPurchase.userId !== 'guest') {
        try {
          await deleteDoc(doc(db, 'users', targetPurchase.userId, 'purchases', purchaseId));
        } catch (e) {
          console.warn('Could not delete user personal purchase document:', e);
        }
      }
      await onRefresh();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Full Reset: Clear All Transactions & User Purchases
  const handleExecuteResetAll = async () => {
    setIsResettingAll(true);
    try {
      if (onResetAllTransactions) {
        await onResetAllTransactions();
      } else {
        // Fallback direct cleanup
        const trxCol = collection(db, 'transactions');
        const trxSnap = await getDocs(trxCol);
        for (const d of trxSnap.docs) {
          await deleteDoc(doc(db, 'transactions', d.id));
        }
        try { await fetch('/api/academic/clear-transactions', { method: 'POST' }); } catch (_e) {}

        const usersCol = collection(db, 'users');
        const usersSnap = await getDocs(usersCol);
        for (const uDoc of usersSnap.docs) {
          const uid = uDoc.id;
          const uPurchCol = collection(db, 'users', uid, 'purchases');
          const uPurchSnap = await getDocs(uPurchCol);
          for (const pDoc of uPurchSnap.docs) {
            await deleteDoc(doc(db, 'users', uid, 'purchases', pDoc.id));
          }
          await setDoc(doc(db, 'users', uid, 'data', 'quotas'), {});
          await setDoc(doc(db, 'users', uid, 'data', 'loyalty'), {
            purchaseCount: 0,
            freeRewardsAvailable: 0,
            totalFreeEarned: 0,
            totalFreeClaimed: 0
          }, { merge: true });
        }

        // Clear local storage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (
            k.startsWith('zain_purch_') || 
            k.startsWith('zain_quotas_') || 
            k.startsWith('zain_loyalty_') || 
            k === 'zain_guest_purch' || 
            k === 'zain_guest_quotas' || 
            k === 'zain_guest_loyalty' ||
            k === 'zain_pending_qris_order'
          )) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        if (onUpdateCurrentQuotas) {
          onUpdateCurrentQuotas({});
        }
      }

      setResetSuccessMessage('Semua data pembelian & transaksi berhasil di-reset total! Tidak ada transaksi lagi di database.');
      setShowResetConfirmModal(false);
      await onRefresh();
      setTimeout(() => setResetSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error resetting all transactions:', err);
      alert('Gagal mereset transaksi: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsResettingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Panel Verifikasi Pembayaran Admin
                </h3>
                {stats.pendingCount > 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                    {stats.pendingCount} Menunggu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Kelola persetujuan transfer manual & aktivasi otomatis kuota naskah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirmModal(true)}
              title="Reset Semua Pembelian & Transaksi dari Database"
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Reset Semua Transaksi</span>
            </button>

            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              title="Refresh Data Transaksi"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reset Success Message Banner */}
        {resetSuccessMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-200 shadow-md">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{resetSuccessMessage}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="p-4 sm:px-6 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Menunggu Verifikasi</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {stats.pendingCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Disetujui (Lunas)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {stats.approvedCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Pendapatan</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-white font-mono truncate">
              Rp {stats.totalRevenue.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Ditolak</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-red-400 font-mono">
              {stats.rejectedCount}
            </div>
          </div>
        </div>

        {/* Abnormal Quota Detection Alert Banner (e.g. 384x on art-1) */}
        {abnormalQuotaInfo && (
          <div className="mx-4 sm:mx-6 mt-3 p-3.5 bg-amber-500/15 border border-amber-500/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">
                  ⚠️ Peringatan: Terdeteksi Kuota Modul Berlebih ({abnormalQuotaInfo.quota}x Buat pada {abnormalQuotaInfo.toolId})
                </p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Terjadi akumulasi berulang pada verifikasi transaksi sebelumnya. Klik tombol di kanan untuk menormalkan kembali menjadi 1x.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleQuickFixAbnormalQuota(abnormalQuotaInfo.userId, abnormalQuotaInfo.toolId)}
              disabled={processingId === 'quickfix'}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer transition-all shadow-md active:scale-95 shrink-0"
            >
              {processingId === 'quickfix' ? 'Memproses...' : 'Koreksi Langsung Jadi 1x'}
            </button>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 sm:px-6 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 border-b border-slate-800/80">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({stats.pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Disetujui ({stats.approvedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Ditolak ({stats.rejectedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Semua ({stats.totalCount})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('quotas');
                if (uniqueUsersList.length > 0 && !selectedUserForQuota) {
                  handleSelectUserForQuota(uniqueUsersList[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'quotas'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-800 text-purple-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Kelola Kuota Pengguna</span>
              {abnormalQuotaInfo && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('wallets');
                loadUserWalletsData();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'wallets'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800 text-emerald-300 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Monitoring Saldo Akun</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('resellers');
                loadResellerAccountsData();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'resellers'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-extrabold'
                  : 'bg-purple-950/40 text-purple-300 hover:text-white border border-purple-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Akun Reseller (Diskon 50%)</span>
              {resellerAccountsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 text-[10px]">
                  {resellerAccountsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('device_trials');
                loadDeviceTrialsData();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'device_trials'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-800 text-cyan-300 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Free Trial Perangkat & IP</span>
            </button>

            {onOpenTrafficStats && (
              <button
                onClick={onOpenTrafficStats}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 hover:text-white border border-blue-500/40 shadow-sm"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Statistik & Trafik Web (30 Hari)</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          {activeTab !== 'quotas' && activeTab !== 'wallets' && activeTab !== 'device_trials' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Order ID, email, nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* User Quota Manager View */}
        {activeTab === 'quotas' ? (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {quotaSaveSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{quotaSaveSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column: User List */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>Daftar Akun Pengguna ({uniqueUsersList.length})</span>
                  </h4>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari email pengguna..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                  {uniqueUsersList
                    .filter((u) => !userSearchQuery || u.userEmail.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    .map((u) => {
                      const isSelected = selectedUserForQuota?.userId === u.userId;
                      const isCurrent = u.userId === currentUserId;
                      return (
                        <div
                          key={u.userId}
                          onClick={() => handleSelectUserForQuota(u)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-md'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold truncate text-slate-100">{u.userEmail}</p>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold shrink-0">
                                Akun Anda
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span>{u.senderName || 'Pengguna'}</span>
                            <span className="font-mono text-slate-500">{u.purchaseCount} order</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Quota and Loyalty Editor for Selected User */}
              <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4">
                {selectedUserForQuota ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            ID: {selectedUserForQuota.userId.slice(0, 12)}...
                          </span>
                          <h4 className="font-extrabold text-sm sm:text-base text-white">
                            {selectedUserForQuota.userEmail}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Atur jumlah kuota pembuatan naskah per modul dan stempel loyalitas.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveUserQuotas}
                        disabled={processingId === 'save-user-quotas'}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all self-start sm:self-auto"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{processingId === 'save-user-quotas' ? 'Menyimpan...' : 'Simpan ke Database'}</span>
                      </button>
                    </div>

                    {isLoadingUserQuota ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                        <span>Memuat kuota pengguna dari Firestore...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Loyalty Stamps Adjustment */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-200 block">Stempel Loyalitas (Beli 3x Gratis 1x)</span>
                            <span className="text-slate-400 text-[11px]">
                              Status saat ini: {userLoyaltyEditing.purchaseCount % 3}/3 Stempel • {userLoyaltyEditing.freeRewardsAvailable} Voucher Gratis
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setUserLoyaltyEditing({ purchaseCount: 1, freeRewardsAvailable: 0 })}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] border border-slate-700 cursor-pointer"
                            >
                              Reset Stempel ke 1/3
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserLoyaltyEditing({ purchaseCount: 0, freeRewardsAvailable: 0 })}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] border border-slate-700 cursor-pointer"
                            >
                              Reset 0
                            </button>
                          </div>
                        </div>

                        {/* Quotas per Module */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-bold text-slate-300">
                              Rincian Kuota Modul (Khusus Modul Pembuatan Artikel & Akademik):
                            </h5>
                          </div>

                          <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                            {categories.map((cat) => (
                              <div key={cat.id} className="space-y-1.5">
                                <span className="text-[11px] font-bold text-purple-300/80 block uppercase tracking-wider px-1 pt-1">
                                  {cat.title}
                                </span>
                                {cat.tools.map((t) => {
                                  const currentQ = userQuotasEditing[t.id] || 0;
                                  const isAbnormal = currentQ > 10;
                                  return (
                                    <div
                                      key={t.id}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                        isAbnormal
                                          ? 'bg-amber-950/40 border-amber-500/50'
                                          : 'bg-slate-900/60 border-slate-800'
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                            {t.id}
                                          </span>
                                          <p className="font-semibold text-slate-200 truncate">{t.title}</p>
                                        </div>
                                        {isAbnormal && (
                                          <span className="text-[10px] font-bold text-amber-400 mt-0.5 inline-block">
                                            ⚠️ Kuota Terlalu Banyak ({currentQ}x)!
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <input
                                          type="number"
                                          min="0"
                                          value={currentQ}
                                          onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                            setUserQuotasEditing((prev) => ({ ...prev, [t.id]: val }));
                                          }}
                                          className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                          type="button"
                                          title="Set ke 1x Buat"
                                          onClick={() => setUserQuotasEditing((prev) => ({ ...prev, [t.id]: 1 }))}
                                          className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-500/30 text-[11px] font-bold cursor-pointer"
                                        >
                                          1x
                                        </button>
                                        <button
                                          type="button"
                                          title="Reset ke 0x"
                                          onClick={() => setUserQuotasEditing((prev) => ({ ...prev, [t.id]: 0 }))}
                                          className="px-2 py-1 rounded-lg bg-red-950/80 text-red-300 hover:bg-red-900 border border-red-500/30 text-[11px] font-bold cursor-pointer"
                                        >
                                          0x
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    <UserIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Pilih salah satu akun pengguna di panel kiri untuk melihat dan mengelola kuota.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'wallets' ? (
          /* User Wallets Monitoring View: Sisa Saldo & Dipakai Untuk Produk Apa Saja */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {balanceSaveSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{balanceSaveSuccess}</span>
              </div>
            )}

            {/* Top Toolbar: Search & Refresh */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari email akun, nama pemilik, atau UID..."
                  value={walletSearchQuery}
                  onChange={(e) => setWalletSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={loadUserWalletsData}
                disabled={isLoadingWallets}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWallets ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isLoadingWallets ? 'Memuat Saldo...' : 'Perbarui Data Saldo'}</span>
              </button>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Saldo Beredar</span>
                <span className="text-lg font-black text-emerald-400 mt-1 block font-mono">
                  Rp {userWallets.reduce((sum, u) => sum + (u.balance || 0), 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Sisa saldo aktif di seluruh akun pengguna</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Akun Memiliki Saldo</span>
                <span className="text-lg font-black text-indigo-300 mt-1 block font-mono">
                  {userWallets.filter((u) => u.balance > 0).length} / {userWallets.length} Akun
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">User yang saldonya &gt; Rp 0</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Transaksi Pakai Saldo</span>
                <span className="text-lg font-black text-teal-300 mt-1 block font-mono">
                  Rp {userWallets.reduce((sum, u) => sum + (u.totalSpent || 0), 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Akumulasi produk dibeli pakai saldo</span>
              </div>
            </div>

            {/* List of Users and Balance Usage */}
            {isLoadingWallets && userWallets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
                <p>Memuat dan mencocokkan data saldo pengguna...</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {userWallets
                  .filter((u) => {
                    if (!walletSearchQuery.trim()) return true;
                    const q = walletSearchQuery.toLowerCase();
                    return (
                      u.email.toLowerCase().includes(q) ||
                      u.displayName.toLowerCase().includes(q) ||
                      u.userId.toLowerCase().includes(q)
                    );
                  })
                  .map((walletUser) => {
                    const isExpanded = expandedWalletUserId === walletUser.userId;
                    const isEditing = editingUserBalance?.userId === walletUser.userId;

                    return (
                      <div
                        key={walletUser.userId}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          walletUser.balance > 0
                            ? 'bg-slate-950/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        {/* Header: User Info & Balance */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
                              walletUser.balance > 0
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              <UserIcon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-sm text-white truncate">
                                  {walletUser.displayName}
                                </h4>
                                
                                {walletUser.role === 'reseller' && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                    <span>Reseller (Diskon 50%)</span>
                                  </span>
                                )}

                                {walletUser.role === 'admin' && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Admin
                                  </span>
                                )}

                                {walletUser.role !== 'reseller' && walletUser.role !== 'admin' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                    Pengguna Umum
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                                <span>{walletUser.email || '(Tanpa Email)'}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-[11px] text-slate-500 truncate">UID: {walletUser.userId}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Sisa Saldo Badge & Actions */}
                          <div className="flex items-center gap-3 self-end lg:self-auto shrink-0 flex-wrap">
                            <div className="p-2.5 px-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-right">
                              <span className="text-[10px] font-bold text-emerald-300 block uppercase tracking-wider">
                                Sisa Saldo Saat Ini
                              </span>
                              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono block">
                                Rp {walletUser.balance.toLocaleString('id-ID')}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingUserBalance(null);
                                } else {
                                  setEditingUserBalance({
                                    userId: walletUser.userId,
                                    email: walletUser.email,
                                    currentBalance: walletUser.balance,
                                    newBalance: walletUser.balance
                                  });
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-400" />
                              <span>{isEditing ? 'Tutup Edit' : 'Edit Saldo'}</span>
                            </button>

                            {walletUser.email && walletUser.role !== 'admin' && (
                              walletUser.role === 'reseller' ? (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeReseller(walletUser.email, walletUser.userId)}
                                  title="Cabut Status Reseller (Kembalikan ke Pengguna Umum)"
                                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <UserMinus className="w-3.5 h-3.5 text-red-400" />
                                  <span>Cabut 50%</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePromoteToReseller(walletUser.email, walletUser.userId, walletUser.displayName)}
                                  title="Jadikan Akun Reseller (Otomatis Diskon 50% Semua Modul)"
                                  className="px-3 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-500/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-purple-950"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Jadikan Reseller 50%</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Inline Edit Balance Form */}
                        {isEditing && editingUserBalance && (
                          <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3 animate-in fade-in-50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <Coins className="w-4 h-4" />
                                <span>Sesuaikan Saldo Manual untuk {walletUser.displayName}</span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Saldo sekarang: <strong className="text-white">Rp {editingUserBalance.currentBalance.toLocaleString('id-ID')}</strong>
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={editingUserBalance.newBalance}
                                  onChange={(e) => setEditingUserBalance({
                                    ...editingUserBalance,
                                    newBalance: Math.max(0, parseInt(e.target.value) || 0)
                                  })}
                                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                                />
                              </div>

                              {/* Quick Adjustment Buttons */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[10000, 25000, 50000, 100000].map((addVal) => (
                                  <button
                                    key={addVal}
                                    type="button"
                                    onClick={() => setEditingUserBalance({
                                      ...editingUserBalance,
                                      newBalance: editingUserBalance.newBalance + addVal
                                    })}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold border border-slate-700 cursor-pointer"
                                  >
                                    +{addVal / 1000}k
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setEditingUserBalance({
                                    ...editingUserBalance,
                                    newBalance: 0
                                  })}
                                  className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs font-semibold border border-red-800 cursor-pointer"
                                >
                                  Nol-kan
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={isSavingBalance}
                                onClick={() => handleSaveBalance(walletUser.userId, editingUserBalance.newBalance)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                              >
                                {isSavingBalance ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span>Simpan Saldo</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Breakdown: Total Topup vs Total Spent */}
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-4 text-slate-400 flex-wrap">
                            <span>
                              Total Top-up Masuk: <strong className="text-slate-200 font-mono">Rp {walletUser.totalTopup.toLocaleString('id-ID')}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>
                              Total Saldo Terpakai: <strong className="text-amber-400 font-mono">Rp {walletUser.totalSpent.toLocaleString('id-ID')}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>
                              Produk Dibeli Pakai Saldo: <strong className="text-white font-mono">{walletUser.usedProducts.length} transaksi</strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedWalletUserId(isExpanded ? null : walletUser.userId)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{isExpanded ? 'Sembunyikan Rincian Produk' : 'Lihat Produk yang Dibeli'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {/* Products Bought Using Wallet Details */}
                        {isExpanded && (
                          <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 space-y-2.5 animate-in fade-in-50">
                            <span className="text-xs font-extrabold text-slate-300 block">
                              Daftar Produk yang Dibeli Menggunakan Saldo:
                            </span>

                            {walletUser.usedProducts.length > 0 ? (
                              <div className="space-y-2">
                                {walletUser.usedProducts.map((item, idx) => (
                                  <div
                                    key={item.id || idx}
                                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-white">
                                          {item.itemTitle}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                          ID: {item.id}
                                        </span>
                                      </div>
                                      {item.notes && (
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                          Catatan: {item.notes}
                                        </p>
                                      )}
                                      <span className="text-[10px] text-slate-500 block mt-0.5">
                                        Waktu: {new Date(item.purchasedAt).toLocaleString('id-ID', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short'
                                        })}
                                      </span>
                                    </div>

                                    <div className="text-left sm:text-right shrink-0">
                                      <span className="text-[11px] text-slate-400 block font-medium">Potongan Saldo</span>
                                      <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
                                        -Rp {item.amount.toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                                Akun ini belum pernah melakukan pembelian modul atau produk menggunakan saldo akun.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : activeTab === 'resellers' ? (
          /* Reseller Accounts (Diskon 50% Otomatis) Management View */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {/* Header / Info Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2 flex-wrap">
                    <span>Manajemen & Pembuatan Akun Reseller</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-extrabold border border-purple-500/40">
                      Diskon 50% Otomatis
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Admin dapat membuatkan akun untuk mitra/reseller. Akun reseller otomatis mendapatkan 
                    <strong className="text-purple-300"> potongan harga 50% untuk semua modul akademik</strong> dan 
                    <strong className="text-cyan-300"> kuota free trial 3x di setiap modul</strong> tanpa perlu konfirmasi manual.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 justify-end">
                <div className="px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-right">
                  <span className="text-[10px] font-bold text-purple-300 block uppercase tracking-wider">
                    Total Reseller
                  </span>
                  <span className="text-lg font-black text-white font-mono block">
                    {resellerAccountsList.length} Mitra
                  </span>
                </div>
              </div>
            </div>

            {/* Form Buat Akun Reseller Baru */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Buatkan Akun Reseller Baru</h5>
                    <p className="text-[11px] text-slate-400">
                      Reseller dapat langsung login di aplikasi tanpa perlu mendaftar mandiri.
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Diskon 50% Langsung Aktif
                </span>
              </div>

              {resellerErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{resellerErrorMsg}</span>
                </div>
              )}

              {resellerCreatedSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-xs text-emerald-200 space-y-3 shadow-lg animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Akun Reseller Berhasil Dibuat & Aktif!</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-mono">
                      Hak Akses: Reseller 50%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-1 font-mono text-[11px] text-slate-200">
                    <p><span className="text-slate-400 font-sans">Nama:</span> <strong className="text-white">{resellerCreatedSuccess.name}</strong></p>
                    <p><span className="text-slate-400 font-sans">Email:</span> <strong className="text-emerald-300">{resellerCreatedSuccess.email}</strong></p>
                    <p><span className="text-slate-400 font-sans">Password:</span> <strong className="text-amber-300">{resellerCreatedSuccess.password}</strong></p>
                    {resellerCreatedSuccess.balance && resellerCreatedSuccess.balance > 0 ? (
                      <p><span className="text-slate-400 font-sans">Saldo Awal:</span> <strong className="text-cyan-300">Rp {resellerCreatedSuccess.balance.toLocaleString('id-ID')}</strong></p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyResellerWhatsApp(resellerCreatedSuccess)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedResellerCreds ? 'Tersalin ke Clipboard!' : 'Salin Format WhatsApp untuk Mitra'}</span>
                    </button>
                    {newResellerWa && (
                      <a
                        href={`https://wa.me/${newResellerWa.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Halo ${resellerCreatedSuccess.name},\nAkun Reseller resmi ZAIN.NET Anda telah aktif:\nEmail: ${resellerCreatedSuccess.email}\nPassword: ${resellerCreatedSuccess.password}\nKeuntungan: Otomatis Diskon 50% semua modul!\nLink Login: ${window.location.origin}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-500/40"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim WA ke Mitra</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminCreateReseller} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Email Reseller */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Email Reseller / Mitra <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={newResellerEmail}
                        onChange={(e) => setNewResellerEmail(e.target.value)}
                        placeholder="contoh: mitra@domain.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Reseller */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Password Reseller <span className="text-red-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomResellerPassword}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                      >
                        Acak Sandi
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showResellerPass ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={newResellerPassword}
                        onChange={(e) => setNewResellerPassword(e.target.value)}
                        placeholder="Minimal 4 karakter..."
                        className="w-full pl-9 pr-16 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResellerPass(!showResellerPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        {showResellerPass ? 'Sembunyikan' : 'Lihat'}
                      </button>
                    </div>
                  </div>

                  {/* Nama Toko / Reseller (Opsional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nama Mitra / Toko Reseller <span className="text-slate-500 font-normal">(opsional)</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={newResellerName}
                        onChange={(e) => setNewResellerName(e.target.value)}
                        placeholder="Nama mitra reseller..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Reseller (Opsional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      No. WhatsApp Mitra <span className="text-slate-500 font-normal">(opsional, cth: 08123456789)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={newResellerWa}
                        onChange={(e) => setNewResellerWa(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Saldo Awal Dompet (Opsional) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Isi Saldo Awal Dompet Reseller <span className="text-slate-500 font-normal">(opsional, dalam Rupiah)</span>
                    </label>
                    <div className="relative">
                      <span className="text-xs font-bold text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 font-mono">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={newResellerBalance}
                        onChange={(e) => setNewResellerBalance(e.target.value)}
                        placeholder="Contoh: 100000 (dapat digunakan reseller untuk beli langsung tanpa transfer ulang)"
                        className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Otomatis diskon 50% diaktifkan di seluruh modul akademik.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingReseller}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 transition-all shrink-0"
                  >
                    {isCreatingReseller ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Buat Akun Reseller (Diskon 50%)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Daftar Seluruh Mitra Reseller */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Daftar Mitra Reseller Terdaftar ({resellerAccountsList.length})</span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Semua akun di bawah ini secara otomatis memperoleh potongan harga 50% pada sistem checkout dan katalog.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={resellerSearchQuery}
                    onChange={(e) => setResellerSearchQuery(e.target.value)}
                    placeholder="Cari email atau nama mitra..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {isLoadingResellers ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                  Memuat data akun mitra reseller...
                </div>
              ) : resellerAccountsList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
                  <Sparkles className="w-8 h-8 text-purple-500/40 mx-auto" />
                  <p className="font-bold text-slate-300">Belum ada akun reseller yang didaftarkan.</p>
                  <p className="text-[11px] text-slate-500">
                    Gunakan formulir di atas untuk membuatkan akun mitra reseller pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {resellerAccountsList
                    .filter((r) => {
                      if (!resellerSearchQuery.trim()) return true;
                      const q = resellerSearchQuery.toLowerCase();
                      return (
                        r.email.toLowerCase().includes(q) ||
                        r.name.toLowerCase().includes(q) ||
                        (r.whatsapp && r.whatsapp.includes(q))
                      );
                    })
                    .map((reseller) => {
                      const isResettingThis = resetTargetResellerEmail === reseller.email;
                      return (
                        <div
                          key={reseller.email}
                          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Avatar & Info */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                                {reseller.name ? reseller.name.charAt(0).toUpperCase() : 'R'}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h6 className="font-extrabold text-sm text-white truncate">
                                    {reseller.name || 'Mitra Reseller'}
                                  </h6>
                                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/40 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                    Diskon 50% Otomatis
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/40">
                                    Free Trial 3x
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                                  <span className="font-mono text-slate-300">{reseller.email}</span>
                                  {reseller.whatsapp && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <a
                                        href={`https://wa.me/${reseller.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>{reseller.whatsapp}</span>
                                      </a>
                                    </>
                                  )}
                                  {reseller.uid && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                                        UID: {reseller.uid.slice(0, 8)}...
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Saldo & Action buttons */}
                            <div className="flex items-center gap-2.5 self-end lg:self-auto shrink-0 flex-wrap">
                              <div className="p-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-right">
                                <span className="text-[10px] font-bold text-slate-400 block">Sisa Saldo</span>
                                <span className="text-sm font-black text-emerald-400 font-mono block">
                                  Rp {reseller.balance.toLocaleString('id-ID')}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopyResellerWhatsApp(reseller)}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                                title="Salin format teks ucapan & akun WhatsApp"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Salin WA</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isResettingThis) {
                                    setResetTargetResellerEmail(null);
                                    setNewPasswordForReseller('');
                                    setResetResellerFeedback(null);
                                  } else {
                                    setResetTargetResellerEmail(reseller.email);
                                    setNewPasswordForReseller('');
                                    setResetResellerFeedback(null);
                                  }
                                }}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-purple-950/70 text-slate-300 hover:text-purple-300 text-xs font-bold transition-all border border-slate-700 hover:border-purple-500/40 cursor-pointer flex items-center gap-1.5"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                                <span>{isResettingThis ? 'Batal Sandi' : 'Ganti Sandi'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRevokeReseller(reseller.email, reseller.uid)}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 text-xs font-bold transition-all border border-slate-700 hover:border-red-500/40 cursor-pointer flex items-center gap-1.5"
                                title="Kembalikan akun ini ke pengguna biasa (Diskon 50% dicabut)"
                              >
                                <UserMinus className="w-3.5 h-3.5 text-red-400" />
                                <span>Cabut Status</span>
                              </button>
                            </div>
                          </div>

                          {/* Inline Password Reset Form for Reseller */}
                          {isResettingThis && (
                            <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/40 space-y-2.5 animate-in fade-in-50">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Ganti Password untuk {reseller.email}</span>
                                </span>
                                {resetResellerFeedback && (
                                  <span className="text-[11px] text-emerald-300 font-bold">
                                    {resetResellerFeedback}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newPasswordForReseller}
                                  onChange={(e) => setNewPasswordForReseller(e.target.value)}
                                  placeholder="Ketik password baru (min 4 karakter)..."
                                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                                />
                                <button
                                  type="button"
                                  disabled={isResettingResellerPassword}
                                  onClick={() => handleSaveResellerPasswordReset(reseller.email)}
                                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg cursor-pointer transition-all shadow-md shrink-0 flex items-center gap-1.5"
                                >
                                  {isResettingResellerPassword ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Menyimpan...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      <span>Simpan Sandi Baru</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'device_trials' ? (
          /* Device Trials Anti-Abuse Management View */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            
            {/* Header / Info Box */}
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Monitoring Anti-Abuse Free Trial Perangkat & IP</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      Hardware + IP Lock
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                    Log rekaman perangkat & IP. Sesuai kebijakan terbaru, fasilitas Free Trial gratis untuk akun umum telah ditiadakan dan kini hanya eksklusif untuk akun berstatus Mitra Reseller (3x trial per modul).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadDeviceTrialsData}
                disabled={isLoadingDeviceTrials}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDeviceTrials ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Refresh Data Device</span>
              </button>
            </div>

            {/* Notification message */}
            {deviceTrialSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-xs text-emerald-200 animate-in fade-in-50">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{deviceTrialSuccessMsg}</span>
              </div>
            )}

            {/* Filter Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari IP, email, Windows/OS, atau modul..."
                  value={deviceTrialSearchQuery}
                  onChange={(e) => setDeviceTrialSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Total Perangkat Terkunci: <strong className="text-white font-mono">{deviceTrialsList.length}</strong> unit</span>
                <span>•</span>
                <span>Aktif: <strong className="text-emerald-400 font-mono">{deviceTrialsList.filter(d => d.status === 'active').length}</strong></span>
                <span>•</span>
                <span>Digunakan: <strong className="text-cyan-400 font-mono">{deviceTrialsList.filter(d => d.status === 'used').length}</strong></span>
              </div>
            </div>

            {/* List of Device Trial Records */}
            {isLoadingDeviceTrials ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs">Memuat data sensor perangkat...</p>
              </div>
            ) : deviceTrialsList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 space-y-2">
                <Laptop className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-300 text-sm">Belum ada catatan Free Trial</p>
                <p className="text-xs max-w-md mx-auto">
                  Ketika mahasiswa mengklaim 1x Free Trial, identitas perangkat Windows, GPU, dan IP mereka akan otomatis tercatat di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deviceTrialsList
                  .filter((rec) => {
                    if (!deviceTrialSearchQuery) return true;
                    const q = deviceTrialSearchQuery.toLowerCase();
                    return (
                      rec.osName.toLowerCase().includes(q) ||
                      rec.ipAddress.toLowerCase().includes(q) ||
                      rec.claimedByEmail.toLowerCase().includes(q) ||
                      rec.toolTitle.toLowerCase().includes(q) ||
                      rec.deviceFingerprint.toLowerCase().includes(q)
                    );
                  })
                  .map((record) => {
                    const claimedDate = new Date(record.claimedAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    });

                    return (
                      <div
                        key={record.id}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-3 shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Left: Device & User Info */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 flex items-center gap-1">
                                <Laptop className="w-3 h-3" />
                                <span>{record.osName}</span>
                              </span>

                              <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                                <Globe className="w-3 h-3 text-cyan-400" />
                                <span>IP: {record.ipAddress}</span>
                              </span>

                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                record.status === 'used'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              }`}>
                                {record.status === 'used' ? 'Selesai Digunakan' : 'Klaim Aktif (Belum Selesai)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap pt-0.5">
                              <span>Akun Mahasiswa: <strong className="text-white font-semibold">{record.claimedByEmail}</strong></span>
                              <span className="text-slate-600">•</span>
                              <span>Nama: <span className="text-slate-200">{record.claimedByName || '-'}</span></span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 text-[11px]">{claimedDate}</span>
                            </div>
                          </div>

                          {/* Right Action: Reset Device Trial */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeleteDeviceTrial(record)}
                              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                              title="Hapus jejak perangkat ini agar mahasiswa bisa menguji coba ulang"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                              <span>Reset Trial Perangkat Ini</span>
                            </button>
                          </div>
                        </div>

                        {/* Hardware Details & Tool Info */}
                        <div className="pt-2.5 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-400">
                          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Modul yang Dicoba:</span>
                            <span className="text-white font-semibold truncate block" title={record.toolTitle}>
                              {record.toolTitle}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">GPU / WebGL:</span>
                            <span className="text-slate-300 font-mono truncate block" title={record.gpuRenderer}>
                              {record.gpuRenderer || '-'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Layar & Core CPU:</span>
                            <span className="text-slate-300 font-mono block">
                              {record.screenSpec || '-'} • {record.cpuCores ? `${record.cpuCores} Cores` : ''}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Device Fingerprint ID:</span>
                            <span className="text-cyan-400/90 font-mono truncate block text-[10px]" title={record.deviceFingerprint}>
                              {record.deviceFingerprint}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
              </div>
            )}

          </div>
        ) : (
          /* List of Transactions */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
            {filteredPurchases.length > 0 ? (
              filteredPurchases.map((purchase) => {
                const isApproved = purchase.status === 'completed' || purchase.status === 'settlement';
                const isRejected = purchase.status === 'rejected';
                const isPending = !purchase.status || purchase.status === 'pending';
                const dateStr = new Date(purchase.purchasedAt).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                });

                return (
                  <div
                    key={purchase.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isPending
                        ? 'bg-slate-950/90 border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-950/10'
                        : isApproved
                        ? 'bg-slate-950/60 border-emerald-500/30'
                        : 'bg-slate-950/40 border-slate-800 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Info & Customer */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                            {purchase.id}
                          </span>

                          {purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Coins className="w-3 h-3 text-emerald-400" />
                              <span>Bayar di Tempat (Tunai)</span>
                            </span>
                          ) : purchase.paymentType === 'qris_manual' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              QRIS
                            </span>
                          ) : purchase.paymentType === 'bank_transfer' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Transfer Bank
                            </span>
                          ) : null}

                          {isPending && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Menunggu Verifikasi</span>
                            </span>
                          )}

                          {isApproved && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Disetujui</span>
                            </span>
                          )}

                          {isRejected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <span>Ditolak</span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{dateStr}</span>
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {purchase.itemType === 'topup' && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Wallet className="w-3 h-3 text-emerald-400" />
                                <span>TOP UP SALDO</span>
                              </span>
                            )}
                            <h4 className="font-bold text-sm sm:text-base text-white">
                              {purchase.itemTitle}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                            <span>Akun: <strong className="text-slate-300">{purchase.userEmail}</strong></span>
                            <span>Atas Nama: <strong className="text-slate-300">{purchase.senderName || '-'}</strong> ({purchase.senderBank || 'QRIS'})</span>
                          </div>
                        </div>

                        {purchase.transferNotes && (
                          <p className="text-xs text-slate-400 bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                            Catatan Pengirim: <span className="text-slate-300 font-medium">{purchase.transferNotes}</span>
                          </p>
                        )}

                        {isRejected && purchase.rejectionReason && (
                          <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-xl border border-red-500/30">
                            Alasan Ditolak: <span className="text-red-300 font-medium">{purchase.rejectionReason}</span>
                          </p>
                        )}
                      </div>

                      {/* Middle: Nominal & Proof Image */}
                      <div className="flex items-center gap-3 shrink-0">
                        
                        {/* Nominal */}
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">
                            {purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat'
                              ? 'Tagihan Bayar di Tempat'
                              : 'Nominal Ditransfer'}
                          </span>
                          <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                            Rp {(purchase.amountPaid || 0).toLocaleString('id-ID')}
                          </span>
                          {purchase.uniqueCode ? (
                            <span className="text-[10px] text-amber-300/80 block font-mono">
                              (Termasuk Kode Unik: {purchase.uniqueCode})
                            </span>
                          ) : null}
                        </div>

                        {/* Bukti Transfer Thumbnail */}
                        {purchase.paymentProofUrl ? (
                          <button
                            onClick={() => setZoomedImage({
                              url: purchase.paymentProofUrl!,
                              title: purchase.itemTitle,
                              orderId: purchase.id
                            })}
                            className="relative group p-1 bg-slate-900 rounded-xl border border-slate-700 hover:border-blue-500 transition-all cursor-pointer shrink-0"
                            title="Klik untuk memperbesar bukti transfer"
                          >
                            <img
                              src={purchase.paymentProofUrl}
                              alt="Bukti Transfer"
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-5 h-5" />
                            </div>
                          </button>
                        ) : purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat' ? (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col items-center justify-center text-emerald-300 text-[10px] text-center p-1 font-bold">
                            <Coins className="w-5 h-5 mb-0.5 text-emerald-400" />
                            <span>Tunai</span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[10px] text-center p-1">
                            <ImageIcon className="w-4 h-4 mb-0.5" />
                            <span>No Proof</span>
                          </div>
                        )}

                      </div>

                      {/* Right: Actions */}
                      <div className="flex sm:flex-col lg:flex-row items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApprove(purchase)}
                              disabled={processingId === purchase.id}
                              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95 whitespace-nowrap disabled:opacity-50 ${
                                purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat'
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                              }`}
                            >
                              {purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat' ? (
                                <>
                                  <Coins className="w-4 h-4 text-emerald-200" />
                                  <span>Terima Tunai & Buka Akses</span>
                                </>
                              ) : (
                                <>
                                  <LockOpen className="w-4 h-4 text-emerald-200" />
                                  <span>Buka Kunci Akses & Setujui</span>
                                </>
                              )}
                            </button>

                            {(() => {
                              const phoneMatch = purchase.transferNotes?.match(/(?:WA|HP|HP\/WA):\s*([0-9\+\-\s]+)/i);
                              const extractedPhone = phoneMatch ? phoneMatch[1].replace(/[^0-9]/g, '').replace(/^62/, '0') : '';
                              const finalWaNumber = extractedPhone ? extractedPhone.replace(/^0/, '') : '';

                              if (!finalWaNumber) return null;

                              return (
                                <a
                                  href={`https://wa.me/62${finalWaNumber}?text=${encodeURIComponent(
                                    purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat'
                                      ? `Halo ${purchase.senderName || 'Kak'}, pesanan Bayar di Tempat Anda (Order ID: ${purchase.id}) untuk ${purchase.itemTitle} sebesar Rp ${(purchase.amountPaid || 0).toLocaleString('id-ID')} telah DISETUJUI oleh Admin ZAIN.NET. Modul Anda telah aktif dan siap digunakan!`
                                      : `Halo ${purchase.senderName || 'Kak'}, konfirmasi pembayaran Order ID ${purchase.id} untuk ${purchase.itemTitle} telah DITERIMA dan KUNCI AKSES TELAH DIBUKA di website ZAIN.NET. Silakan cek akun Anda sekarang!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                  title="Kirim Konfirmasi Balasan via WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">WA Pembeli</span>
                                </a>
                              );
                            })()}

                            <button
                              onClick={() => {
                                setRejectingPurchase(purchase);
                                setRejectionReason(
                                  purchase.paymentType === 'bayar_di_tempat' || purchase.method === 'bayar_di_tempat'
                                    ? 'Pembayaran tunai belum diterima di loket atau pesanan dibatalkan.'
                                    : 'Nominal transfer tidak cocok atau bukti transfer buram.'
                                );
                              }}
                              disabled={processingId === purchase.id}
                              className="px-3 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs flex items-center justify-center gap-1 border border-red-500/30 cursor-pointer transition-all"
                            >
                              <X className="w-4 h-4" />
                              <span>Tolak</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDeleteTransaction(purchase.id)}
                            disabled={processingId === purchase.id}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Hapus riwayat transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-white text-base">
                  Tidak Ada Transaksi di Kategori Ini
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Semua transaksi telah diproses atau belum ada pembayaran baru yang masuk.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <span>
            Total Tercatat: <strong>{purchases.length}</strong> transaksi di database ZAIN.NET
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
          >
            Tutup Panel
          </button>
        </div>

      </div>

      {/* REJECTION REASON MODAL POP-UP */}
      {rejectingPurchase && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Tolak Pembayaran</h4>
                <p className="text-xs text-slate-400">Order: {rejectingPurchase.id}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alasan Penolakan (Akan ditampilkan kepada pembeli):
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Nominal transfer kurang dari tagihan, silakan transfer kekurangan..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingPurchase(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId === rejectingPurchase.id}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 cursor-pointer"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-RES IMAGE ZOOM MODAL */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{zoomedImage.title}</h4>
                <p className="text-xs text-slate-400 font-mono">Order: {zoomedImage.orderId}</p>
              </div>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-black flex items-center justify-center p-2">
              <img
                src={zoomedImage.url}
                alt="Bukti Transfer Full Size"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="text-center pt-1">
              <a
                href={zoomedImage.url}
                target="_blank"
                rel="noreferrer"
                download={`Bukti-${zoomedImage.orderId}.png`}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Buka / Unduh Gambar Asli</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL TRANSACTIONS CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Reset Semua Transaksi?</h4>
                <p className="text-xs text-red-300 font-semibold">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Anda akan menghapus <strong className="text-white">seluruh riwayat transaksi</strong> di database Firestore (<code className="text-amber-400">/transactions</code> dan subkoleksi pembelian setiap user).
              </p>
              <p className="text-slate-400">
                Setelah proses ini selesai, <strong className="text-emerald-400">tidak akan ada transaksi sama sekali</strong> (0 transaksi) dan seluruh kuota pengujian akan dinormalkan kembali.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingAll}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteResetAll}
                disabled={isResettingAll}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/40 active:scale-95 disabled:opacity-50"
              >
                {isResettingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mereset Transaksi...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Bersihkan & Reset Total</span>
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
