import type JSZip from 'jszip';

export type GeminiModelId =
  | 'auto'
  | 'gemini-3.7-flash'
  | 'gemini-3.6-flash'
  | 'gemini-flash-latest'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview';

export interface GeminiModelOption {
  id: GeminiModelId;
  name: string;
  tier: 'Lite / Ultra Cepat' | 'Lite / Hemat' | 'Standard / Cepat' | 'Menengah / Akurat' | 'Flagship / Tertinggi';
  badge: string;
  speed: string;
  reasoning: string;
  description: string;
  recommendedFor: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Mesin Linguistik Ultra-Fast (Default Presisi)',
    tier: 'Lite / Ultra Cepat',
    badge: 'Default Presisi',
    speed: 'Ultra Cepat (~0.4s)',
    reasoning: 'Cepat & Ringkas',
    description: 'Mesin komputasi linguistik super cepat dan berpresisi tinggi dengan latensi minimal, dirancang khusus untuk restrukturisasi kalimat akademik dan naskah skripsi.',
    recommendedFor: 'Parafrase harian, ekstraksi laporan plagiasi, perombakan kalimat skripsi, dan pemrosesan cepat',
  },
  {
    id: 'auto',
    name: 'Sistem Adaptif Multi-Core (Failover Otomatis)',
    tier: 'Standard / Cepat',
    badge: 'Otomatis',
    speed: 'Sangat Cepat',
    reasoning: 'Adaptif Dinamis',
    description: 'Secara otomatis mengoptimalkan pemilihan modul komputasi linguistik terbaik dengan failover instan jika beban pemrosesan tinggi.',
    recommendedFor: 'Semua jenis naskah skripsi umum & penggunaan multi-model',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Mesin Rekonstruksi Sintaksis Cepat',
    tier: 'Standard / Cepat',
    badge: 'Cepat & Stabil',
    speed: 'Sangat Cepat (~0.8s)',
    reasoning: 'Tinggi',
    description: 'Modul rekonstruksi sintaksis mutakhir yang sangat cepat dan akurat untuk parafrase ilmiah serta ekstraksi teks naskah.',
    recommendedFor: 'Paragraf skripsi, latar belakang, dan pembahasan bab',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Sistem Analisis Akademik Terpadu (EYD V & KBBI)',
    tier: 'Standard / Cepat',
    badge: 'Penalaran Tinggi',
    speed: 'Sangat Cepat (~1s)',
    reasoning: 'Sangat Tinggi (Linguistik 3.7)',
    description: 'Modul komputasi berdaya nalar tinggi dengan pemahaman konteks tata bahasa Indonesia baku (EYD V), leksikografi ilmiah, dan dialektika akademik.',
    recommendedFor: 'Naskah skripsi lengkap, rekonstruksi kalimat Turnitin, dan jurnal ilmiah',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Mesin Restrukturisasi Ilmiah Terkini',
    tier: 'Standard / Cepat',
    badge: 'Selalu Terkini',
    speed: 'Cepat & Stabil (~1.1s)',
    reasoning: 'Tinggi',
    description: 'Modul pemrosesan kalimat ilmiah mutakhir untuk throughput berkecepatan tinggi dan reformulasi klausa aktif-pasif naskah riset.',
    recommendedFor: 'Bab pembahasan, latar belakang skripsi, dan perombakan klausa aktif-pasif',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Sistem Analisis Tingkat Lanjut (Disertasi & Tesis)',
    tier: 'Flagship / Tertinggi',
    badge: 'Kecerdasan Maksimal',
    speed: 'Teliti & Mendalam (~2-3s)',
    reasoning: 'Advanced Academic Reasoning',
    description: 'Tingkat kedalaman analisis struktural tertinggi untuk membedah kalimat paling kompleks, naskah filsafat/hukum tingkat tinggi, dan perombakan total anti-plagiasi.',
    recommendedFor: 'Disertasi S3, Tesis S2, jurnal internasional Scopus, dan kalimat membandel',
  },
];

export type ParaphraseStyle =
  | 'academic_formal'
  | 'active_passive'
  | 'split_sentences'
  | 'synthesize'
  | 'deep_reconstruct'
  | 'synonym_rephrase'
  | 'quote_block';

export interface FootnoteDetail {
  id: string; // XML footnote id (e.g. "1", "2")
  number: number; // sequential footnote display number
  text: string; // text inside footnote
  inDocXmlCount: number; // how many times referenced
  status: 'intact' | 'verified';
}

export interface CitationDetail {
  raw: string;
  format: 'APA' | 'IEEE' | 'Harvard' | 'Chicago' | 'Legal' | 'Peraturan' | 'Umum';
  author?: string;
  year?: string;
  pages?: string;
  sourceContext?: string;
}

export interface SegmentVersionHistory {
  id: string;
  timestamp: number;
  text: string;
  technique: string;
  modelUsed?: string;
  author: 'ai' | 'user' | 'eyd_fix' | 'original';
}

export interface EYDIssue {
  id: string;
  originalWord: string;
  suggestedWord: string;
  category: 'non_baku' | 'spacing_pdf' | 'punctuation' | 'capitalization' | 'affix';
  explanation: string;
  position?: number;
}

export interface EYDAuditResult {
  totalIssues: number;
  score: number; // 0 - 100
  issues: EYDIssue[];
  correctedText: string;
}

export interface PlagiarismSegment {
  id: string;
  originalText: string;
  paraphrasedText: string;
  alternativeText?: string;
  additionalOptions?: {
    label: string;
    text: string;
    technique: string;
    estimatedSimilarity: string;
  }[];
  similarityScore?: number;
  matchedInDoc: boolean;
  targetXml: 'document' | 'footnotes' | 'headers' | 'footers' | 'endnotes';
  paragraphIndex: number;
  locationLabel: string; // e.g. "Bab 1: Pendahuluan (Paragraf 4)"
  chapterId?: string; // e.g. "bab_1", "bab_2", "bab_3", "bab_4", "bab_5", "other"
  chapterName?: string; // e.g. "Bab I: Pendahuluan"
  contextBefore?: string;
  contextAfter?: string;
  footnoteIdsNearby?: string[]; // IDs of footnotes attached or adjacent
  citationsDetected?: CitationDetail[];
  isSpecialContent?: boolean; // e.g. table, formula, caption
  specialContentType?: 'table' | 'formula' | 'caption' | 'quote' | 'bibliography';
  isSelected: boolean;
  isCustomEdited?: boolean;
  status: 'pending' | 'matched' | 'paraphrased' | 'applied';
  explanation?: string;
  protectedTermsDetected?: string[];
  appliedTechnique?: string;
  history?: SegmentVersionHistory[];
  eydIssuesCount?: number;
}

export interface DocxFileInfo {
  fileName: string;
  fileSize: number;
  fileData: ArrayBuffer;
  zip: JSZip;
  documentXml: string;
  footnotesXml?: string;
  endnotesXml?: string;
  headerXmls?: Record<string, string>;
  footerXmls?: Record<string, string>;
  totalParagraphs: number;
  totalWords: number;
  footnotes: FootnoteDetail[];
  chapters: { title: string; paragraphIndex: number }[];
}

export interface PlagiarismFileInfo {
  fileName: string;
  fileSize: number;
  sourceType: 'file' | 'paste' | 'demo';
  rawText: string;
  pageCount?: number;
  extractedSegments: PlagiarismSegment[];
  isChecked?: boolean;
  modelUsed?: string;
  totalWords?: number;
}

export interface ReplacementResult {
  totalMatched: number;
  totalReplaced: number;
  footnotesBeforeCount: number;
  footnotesAfterCount: number;
  footnotesIntact: boolean;
  revisedDocxBlob: Blob;
  downloadFileName: string;
  logs: string[];
}
