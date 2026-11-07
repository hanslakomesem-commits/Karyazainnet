export type UserRole = 'admin' | 'reseller' | 'public';

export interface RolesConfig {
  adminEmails: string[];
  resellerEmails: string[];
  resellerDiscountPercentage: number; // e.g. 50
  adminPinCode?: string; // Master PIN for direct admin access without Google
  updatedAt?: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isCustomAuth?: boolean;
  university?: string;
  major?: string;
  whatsapp?: string;
  role?: UserRole;
  createdAt?: string | number;
}

export interface RegisteredUserAccount {
  uid: string;
  name: string;
  email: string;
  passwordHash: string; // Stored securely
  rawPassword?: string; // Kata sandi tersimpan untuk admin review
  university?: string;
  major?: string;
  whatsapp?: string;
  role: UserRole;
  createdAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
}

export type AuthUser = AppUser;

export interface ToolItem {
  id: string;
  categoryId: number;
  number: number;
  title: string;
  domain: string;
  url: string;
  description?: string;
  badge?: string;
  priceRp: number;
  originalPriceRp?: number;
  mayarPaymentUrl?: string;
}

export interface ToolCategory {
  id: number;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  packagePriceRp: number;
  originalPriceRp?: number;
  mayarPaymentUrl?: string;
  tools: ToolItem[];
}

export interface UserFavorite {
  toolId: string;
  addedAt: number;
}

export interface UserPurchase {
  id: string;
  userId?: string;
  userEmail?: string;
  itemId: string; // e.g. 'tool:art-1', 'category:1', 'wallet:topup'
  itemType: 'tool' | 'category' | 'all_access' | 'topup';
  itemTitle: string;
  amountPaid: number;
  originalAmount?: number;
  uniqueCode?: number; // 3-digit transfer code
  orderId?: string;
  purchasedAt: number;
  quotaGranted?: number; // default 1 for single generation or topup amount
  quotaRemaining?: number;
  paymentType?: 'qris_manual' | 'bank_transfer' | 'wallet_balance' | 'loyalty_reward' | 'bayar_di_tempat' | 'demo';
  method: 'qris_manual' | 'bank_transfer' | 'wallet_balance' | 'loyalty_reward_3x' | 'bayar_di_tempat' | 'demo' | string;
  status: 'pending' | 'completed' | 'rejected' | 'settlement';
  // Manual Verification & Transfer Proof details
  senderName?: string;
  senderBank?: string; // BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay, etc.
  paymentProofUrl?: string; // image base64 or URL
  transferNotes?: string;
  userEnteredAmount?: number;
  verifiedAt?: number;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface UserWallet {
  balance: number;
  lastUpdated?: number;
}

export interface UserQuotas {
  [itemId: string]: number; // itemId -> remaining generations count (e.g. 'tool:art-1': 1)
}

export const RESELLER_MAX_FREE_TRIALS = 0; // Free trial dinonaktifkan (tidak ada free trial lagi)

export interface ResellerTrials {
  [toolId: string]: number; // count of used trials for each tool (0, 1, 2, 3)
}

export interface UserLoyalty {
  purchaseCount: number; // Current stamp count towards next reward (0, 1, 2)
  totalPurchases?: number; // Total all-time paid purchases
  freeRewardsAvailable: number; // Number of free 1x item claim rewards available to redeem
  totalFreeEarned: number; // Total all-time free rewards earned
  totalFreeClaimed: number; // Total all-time free rewards redeemed
  lastRewardedAt?: number;
}

export const defaultLoyalty: UserLoyalty = {
  purchaseCount: 0,
  totalPurchases: 0,
  freeRewardsAvailable: 0,
  totalFreeEarned: 0,
  totalFreeClaimed: 0
};

export interface CustomPricesConfig {
  itemPrices: { [toolId: string]: number }; // toolId -> priceRp
  categoryPrices: { [categoryId: number]: number }; // categoryId -> priceRp
  allAccessPriceRp: number;
  resellerDiscountPercentage: number;
  updatedAt?: number;
  updatedBy?: string;
}

export interface UserDocumentItem {
  id: string;
  userId: string;
  userEmail?: string;
  toolId: string;
  toolTitle: string;
  categoryTitle: string;
  title: string;
  abstractSnippet?: string;
  content: string;
  wordCount?: number;
  fileType: 'docx' | 'pdf' | 'txt' | 'latex';
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface ManualQrisConfig {
  merchantName: string;
  nmid?: string;
  terminalId?: string;
  printedBy?: string;
  qrisString?: string;
  qrisImageUrl: string;
  adminWhatsApp: string;
  enableUniqueCode: boolean;
  bankAccounts: BankAccountInfo[];
  allAccessPriceRp: number;
  paymentInstructions?: string;
  updatedAt?: number;
}

// Backwards compatibility alias
export type PaymentConfig = ManualQrisConfig;

export type ToolMaintenanceStatus = 'active' | 'maintenance' | 'token_exhausted' | 'error';

export interface ToolMaintenanceItem {
  toolId: string;
  status: ToolMaintenanceStatus;
  reason?: string; // e.g. "Masih dalam perbaikan", "Kuota token AI habis terpakai", "Server sedang gangguan"
  estimatedRestoration?: string; // e.g. "Estimasi selesai pukul 18:00 WIB"
  updatedAt?: number;
  updatedBy?: string;
}

export interface MaintenanceConfig {
  items: { [toolId: string]: ToolMaintenanceItem };
  globalNotice?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export const defaultMaintenanceConfig: MaintenanceConfig = {
  items: {},
  globalNotice: '',
  updatedAt: Date.now()
};

export type UserSessionStatus = 'in_progress' | 'ready' | 'downloaded' | 'completed' | 'expired';

export interface UserActivityLogEntry {
  id: string;
  time: string;
  type: 'info' | 'action' | 'download' | 'complete' | 'alert' | 'status';
  message: string;
}

export interface UserSessionRecord {
  id: string;
  toolId: string;
  toolTitle: string;
  categoryId: number;
  userId?: string;
  status: UserSessionStatus; // 'in_progress' (Belum Selesai) or 'completed' (Selesai Transaksi)
  startedAt: number;
  lastActiveAt: number;
  activeSeconds: number;
  interactionCount: number;
  completedAt?: number;
  downloadInfo?: {
    fileName: string;
    downloadedAt: number;
    reason: string;
  };
  notes?: string;
  logs: UserActivityLogEntry[];
}

export interface DeviceTrialRecord {
  id: string; // usually deviceFingerprint
  deviceFingerprint: string;
  osName: string;
  browserName: string;
  gpuRenderer: string;
  screenSpec: string;
  cpuCores: number;
  ipAddress: string;
  claimedAt: number;
  claimedByUid: string;
  claimedByEmail: string;
  claimedByName?: string;
  toolId: string;
  toolTitle: string;
  status: 'active' | 'used';
  completedAt?: number;
}

export interface FreeTrialStatus {
  isEligible: boolean;
  hasClaimedOnAccount?: boolean;
  hasClaimedOnDevice?: boolean;
  hasClaimedOnIp?: boolean;
  deviceFingerprint: string;
  osName: string;
  browserName: string;
  gpuRenderer: string;
  screenSpec: string;
  cpuCores: number;
  ipAddress: string;
  summary?: string;
  claimedRecord?: DeviceTrialRecord;
  rejectionReason?: string;
}

export interface TrafficVisitorInfo {
  id: string; // visitor ID
  views: number;
  firstSeen: number;
  lastSeen: number;
  isLoggedIn: boolean;
  userEmail?: string;
  userName?: string;
  osName?: string;
  browserName?: string;
  ipAddress?: string;
}

export interface DailyTrafficStat {
  id: string; // Date string 'YYYY-MM-DD'
  date: string; // 'YYYY-MM-DD'
  formattedDate: string; // e.g. '10 Sep 2026'
  timestamp: number;
  pageViews: number; // Jumlah page view per day
  uniqueUsersCount: number; // Jumlah user view per day
  visitors?: Record<string, TrafficVisitorInfo>;
  recentVisitors?: TrafficVisitorInfo[];
  updatedAt: number;
}

export interface TrafficSummary {
  todayPageViews: number;
  todayUniqueUsers: number;
  totalPageViewsMonth: number;
  totalUniqueUsersMonth: number;
  totalAllTimePageViews: number;
  totalAllTimeUniqueUsers: number;
  averageViewsPerUser: number;
  trackingStartedAt: number;
}

export type DocumentType = 
  | 'makalah' 
  | 'skripsi' 
  | 'tesis' 
  | 'proposal' 
  | 'jurnal' 
  | 'laporan_pkl' 
  | 'laporan_praktikum' 
  | 'modul_ajar' 
  | 'esai' 
  | 'review_buku' 
  | 'dokumen_umum'
  | 'lainnya';

export interface MakalahPost {
  id: string;
  title: string;
  slug: string;
  theme: string; // e.g. "Pendidikan", "Hukum", "Ekonomi", "Teknologi", "Kesehatan", "Sains", dll.
  category?: string; // alias for theme/category
  documentType?: DocumentType | string; // e.g. 'makalah', 'skripsi', 'proposal', 'jurnal', etc.
  documentTypeLabel?: string; // e.g. "Skripsi S1", "Artikel Jurnal Ilmiah", "Makalah Kuliah", "Proposal Penelitian"
  autoDescription?: string; // Keterangan otomatis isi dan fokus dokumen
  detectedChapters?: string[]; // e.g. ["BAB I PENDAHULUAN", "BAB II TINJAUAN PUSTAKA", ...]
  pageEstimate?: number; // Estimasi jumlah halaman
  wordCount?: number; // Jumlah kata naskah
  academicLevel?: string; // e.g. "Sarjana (S1)", "Magister (S2)", "Diploma", "Umum"
  advisor?: string; // Nama Dosen Pembimbing jika terdeteksi
  excerpt: string;
  contentHtml: string;
  rawText?: string;
  author: string;
  institution?: string;
  tags: string[];
  readingTimeMinutes: number;
  createdAt: number;
  updatedAt?: number;
  views: number;
  viewsCount?: number; // alias for views
  coverImageUrl?: string;
  downloadCount: number;
  originalFileName: string;
  originalFileSize: number;
  fileHash?: string; // SHA-256 binary digest for automatic duplicate prevention
  originalFileDataUrl?: string; // base64 data URL for direct docx download
  fileId?: string;
  downloadUrl?: string; // direct download URL for the original uploaded file (e.g. /api/makalah/download/...)
  isFeatured?: boolean;
  status?: 'published' | 'scheduled' | 'draft' | 'trash';
  scheduledAt?: number;
  publishedAt?: number;
  publishedDate?: string | number; // alias for publishedAt
  deletedAt?: number;
}

export interface MakalahDuplicateInfo {
  existingPostId: string;
  existingTitle: string;
  existingSlug?: string;
  existingFileName?: string;
  matchedBy: 'hash' | 'filename_and_size' | 'filename' | 'title' | 'slug';
  reason: string;
}

export interface MakalahBatchItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileHash?: string;
  status: 'pending' | 'extracting' | 'ai_processing' | 'ready' | 'error' | 'duplicate_rejected';
  progressMessage: string;
  errorMessage?: string;
  duplicateInfo?: MakalahDuplicateInfo;
  result?: Partial<MakalahPost>;
  dataUrl?: string;
  detectedType?: string;
  detectedTypeLabel?: string;
  autoDescription?: string;
  scheduledAt?: number;
}

export type AgcSearchIntent = 
  | 'Informational' 
  | 'Tutorial / How-to' 
  | 'Problem Solving' 
  | 'Comparison' 
  | 'Commercial Investigation';

export interface AgcTableOfContentsItem {
  id: string;
  title: string;
  level: 2 | 3;
}

export interface AgcFaqItem {
  question: string;
  answer: string;
}

export interface AgcQualityGate {
  contentDepthScore: number; // 0 - 100
  searchIntentScore: number; // 0 - 100
  readabilityScore: number; // 0 - 100
  originalityScore: number; // 0 - 100
  topicCoverageScore: number; // 0 - 100
  overallQuality: 'EXEMPLARY' | 'PASSED_HIGH_STANDARD' | 'OPTIMIZED';
  overallScore?: number; // 0 - 100
  verifiedHumanReadable: boolean;
  passedRulesCount: number; // e.g. 41 of 41
}

export interface AgcPost {
  id: string;
  title: string;
  slug: string;
  category: string; // e.g., "Teknologi & AI", "Bisnis & Finansial", "Edukasi & Sains", "Gaya Hidup & Hiburan", "Viral Hari Ini"
  theme?: string;
  metaTitle?: string;
  metaDescription?: string;
  searchIntent?: AgcSearchIntent;
  excerpt: string;
  contentHtml: string;
  rawText?: string;
  author: string;
  tags: string[];
  readingTimeMinutes: number;
  wordCount?: number;
  tableOfContents?: AgcTableOfContentsItem[];
  faqList?: AgcFaqItem[];
  keyTakeaways?: string[];
  actionChecklist?: string[];
  qualityGate?: AgcQualityGate;
  deepArticleMode?: boolean;
  relatedPostSlugs?: string[];
  createdAt: number;
  updatedAt?: number;
  publishedAt: number;
  publishedDate?: string;
  views: number;
  viewsCount?: number;
  coverImageUrl?: string;
  imageAltText?: string;
  sourceReference?: string;
  isTrendingToday?: boolean;
  trendScore?: number;
  status?: 'published' | 'scheduled' | 'draft';
}



