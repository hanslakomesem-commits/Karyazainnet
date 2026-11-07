/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TargetCategory = 'signed_page' | 'attachment_5' | 'custom_attachment';

export type TargetStatus = 'ready' | 'already_attached' | 'missing_scan' | 'unassigned' | 'custom_insert';

export interface TargetDocument {
  id: string;
  title: string;
  captionTitle: string; // Title printed above the photo
  category: TargetCategory;
  standardOrder: number;
  // Detected paragraph index in docx (if found)
  elementIndex?: number;
  endElementIndex?: number;
  // Estimated page number in document
  estimatedPage?: number;
  // Has existing signature or drawing
  hasExistingDrawing: boolean;
  status: TargetStatus;
  // The assigned scan file ID
  assignedScanId?: string;
  // If custom placement or missing heading in original docx
  customInsertionMode?: 'replace_page' | 'after_element' | 'at_anchor' | 'at_end';
  customTargetElementIndex?: number;
  notes?: string;
}

export interface ScanFile {
  id: string;
  file: File;
  name: string;
  size: number;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  matchedTargetId?: string;
  detectionSource: 'filename' | 'ocr' | 'manual';
  confidence: 'high' | 'medium' | 'low';
  ocrSnippet?: string;
  rotation?: number; // 0, 90, 180, 270
  isFromPdf?: boolean;
  originalPdfName?: string;
  pdfPageNumber?: number;
  isCropped?: boolean;
  originalDataUrl?: string;
  originalFile?: File;
  deskewAngle?: number;
  cropBounds?: { x: number; y: number; width: number; height: number };
  enhancedContrast?: boolean;
}

export interface DocxElement {
  index: number;
  tag: 'w:p' | 'w:tbl' | 'w:sectPr' | 'w:sdt' | string;
  rawXml: string;
  text: string;
  hasDrawing: boolean;
  hasPageBreak: boolean;
  hasSectPr: boolean;
  isHeading: boolean;
  headingText?: string;
  estimatedPage: number;
}

export interface AnchorKeywordMatch {
  index: number;
  page: number;
  text: string;
  matchedKeyword: string;
}

export interface DocxAnalysis {
  fileName: string;
  fileSize: number;
  totalElements: number;
  totalPagesEstimate: number;
  elements: DocxElement[];
  detectedTargets: TargetDocument[];
  existingMediaCount: number;
  headingsList: { index: number; text: string; page: number }[];
  anchorKeywordMatch?: AnchorKeywordMatch | null;
}

export interface ProcessingLog {
  id: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  details: string;
}

export interface ValidationResult {
  isValid: boolean;
  checks: ValidationCheck[];
  errorMessage?: string;
}

export interface ProcessingOptions {
  anchorKeyword: string; // e.g. "karyazainnet"
  useAnchorFor5Attachments: boolean;
  captionPrefix: 'lampiran' | 'none'; // "Lampiran: Surat Tugas Pembimbing" vs "Surat Tugas Pembimbing"
  kartuBimbinganLayout: 'single_page' | 'separate_pages'; // whether to put page break between depan and belakang
  containMode: 'contain'; // always contain to preserve aspect ratio and avoid cropping signatures/stamps
  insertHeadingIfMissing: boolean; // insert heading if heading doesn't exist at chosen position
  preserveExistingScans: boolean; // do not overwrite already signed/scanned pages
}
