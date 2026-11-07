export type SectionKey =
  | 'COVER'
  | 'HALAMAN_PERSETUJUAN'
  | 'HALAMAN_PENGESAHAN'
  | 'ABSTRAK'
  | 'KATA_PENGANTAR'
  | 'DAFTAR_ISI'
  | 'BAB_I'
  | 'BAB_II'
  | 'BAB_III'
  | 'BAB_IV'
  | 'BAB_V'
  | 'DAFTAR_PUSTAKA'
  | 'KEASLIAN_TULISAN'
  | 'LAMPIRAN'
  | 'RIWAYAT_HIDUP';

export interface ThesisMetadata {
  nama: string;
  nim: string;
  prodi: string;
  prodiCode: string; // e.g. IQT, KPI, ILHA, HKI, HES, HTN, ES, PBS, AS, MBS, PAI, PBA, etc.
  judul: string;
  email: string;
}

export interface SectionRange {
  key: SectionKey;
  label: string;
  filename: string;
  startPage: number; // 1-indexed
  endPage: number;   // 1-indexed
  pageCount: number;
  detected: boolean;
  notes?: string;
}

export interface PageTextInfo {
  pageNumber: number; // 1-indexed
  text: string;
  isOcr?: boolean;
}

export interface SplitPdfResult {
  key: SectionKey;
  label: string;
  filename: string;
  startPage: number;
  endPage: number;
  blob: Blob;
  url: string;
  byteSize: number;
}

export interface AnalysisProgress {
  step: 'reading' | 'extracting_text' | 'ocr' | 'splitting' | 'ai_analysis' | 'done' | 'error';
  message: string;
  percentage: number;
}

export type ScanQualityStatus = 'digital_pdf' | 'scanned_pdf' | 'docx_word' | 'image_file';

export interface BatchFileItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'docx' | 'image';
  buffer: ArrayBuffer | null;
  pagesText: PageTextInfo[];
  pdfDoc: any | null;
  metadata: ThesisMetadata | null;
  sections: SectionRange[];
  scanQuality: ScanQualityStatus;
  ocrPageCount: number;
  status: 'pending' | 'processing' | 'ocr_running' | 'completed' | 'error';
  errorMessage?: string;
  progressPercentage: number;
}
