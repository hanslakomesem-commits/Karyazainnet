export type DimensionUnit = 'cm' | 'mm';

export type ResizeMode = 'smart_crop' | 'stretch' | 'fit_pad';

export type AutoRotateMode = 'keep' | 'auto_rotate_to_target';

export type SizeLayoutMode = 'uniform' | 'per_row' | 'multi_size_mix';

export type PaperType = 'A4' | 'F4' | 'Letter' | 'Custom';

export type Orientation = 'portrait' | 'landscape';

export type MultiSizePackingMode = 'compact_side_by_side' | 'grouped_rows';

export interface MultiSizeCopies {
  size2x3?: number; // 2x3 cm
  size3x4?: number; // 3x4 cm
  size4x6?: number; // 4x6 cm
}

export interface RowSizeConfig {
  id: string;
  widthCm: number;
  heightCm: number;
  columnsMode: 'auto' | 'custom';
  customColumns: number;
}

export interface RowCellLayout {
  cellIndex: number;
  widthCm: number;
  heightCm: number;
  sizeKey: string;
  emuWidth: number;
  emuHeight: number;
  twipWidth: number;
  twipHeight: number;
}

export interface ResolvedRowLayout {
  rowIndex: number;
  widthCm: number;
  heightCm: number;
  columns: number;
  emuWidth: number;
  emuHeight: number;
  twipWidth: number;
  twipHeight: number;
  cells?: RowCellLayout[];
  maxHeightCm?: number;
}

export interface PhotoItem {
  id: string;
  file: File;
  name: string;
  size: number;
  originalWidth: number;
  originalHeight: number;
  dataUrl: string;
  copies: number;
  multiSizeCopies?: MultiSizeCopies;
  rotation?: number; // Rotasi manual dalam derajat: 0, 90, 180, 270
  isFromPdf?: boolean; // Hasil auto-compress dari PDF (KTP/STNK)
  pdfOriginalName?: string;
  pdfPageNumber?: number;
  isStnk?: boolean; // Terdeteksi sebagai dokumen STNK / TBPKP
  isKtp?: boolean; // Terdeteksi sebagai dokumen KTP
  // Processed preview cache
  processedDataUrl?: string;
  processedBlob?: Blob;
}

export interface SizePreset {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  description: string;
  badge?: string;
}

export interface PaperSize {
  name: string;
  widthCm: number;
  heightCm: number;
  description: string;
}

export interface MarginsConfig {
  topCm: number;
  bottomCm: number;
  leftCm: number;
  rightCm: number;
}

export interface GridConfig {
  unit: DimensionUnit;
  targetWidthCm: number;
  targetHeightCm: number;
  resizeMode: ResizeMode;
  autoRotateMode: AutoRotateMode;
  sizeLayoutMode: SizeLayoutMode;
  multiSizePackingMode?: MultiSizePackingMode;
  rowConfigs: RowSizeConfig[];
  paperType: PaperType;
  customPaperWidthCm: number;
  customPaperHeightCm: number;
  orientation: Orientation;
  margins: MarginsConfig;
  gutterCm: number; // space between columns
  rowSpacingCm: number; // space between rows
  columnsMode: 'auto' | 'custom';
  customColumns: number;
  customRows?: number; // Exact rows per page for A4 photo layouts (isi 2, 3, 4, 6, 8, 10, 12 foto)
  showCutGuides: boolean; // thin cutting border around photos
  showLabels: boolean; // caption below photo
  labelType: 'filename' | 'counter' | 'blank';
  backgroundColor: string; // for padding if fit_pad
  dpi: number; // 300 DPI for high print quality
}

export interface CalculatedLayout {
  pageWidthCm: number;
  pageHeightCm: number;
  printableWidthCm: number;
  printableHeightCm: number;
  columns: number;
  rowsPerPage: number;
  photosPerPage: number;
  totalPages: number;
  totalPhotosWithCopies: number;
  photoWidthCm: number;
  photoHeightCm: number;
  gutterCm: number;
  rowSpacingCm: number;
  emuWidth: number;
  emuHeight: number;
  twipWidth: number;
  twipHeight: number;
  twipPageWidth: number;
  twipPageHeight: number;
  twipMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  resolvedRows: ResolvedRowLayout[];
}
