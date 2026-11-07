/**
 * Exact conversions for Microsoft Word / Office OpenXML standards:
 * - EMU (English Metric Units): 1 cm = 360,000 EMU (1 inch = 914,400 EMU)
 * - Twips (twentieth of an imperial point): 1 inch = 1440 twips => 1 cm = 1440 / 2.54 = ~566.929134 twips (approx 567)
 * - Point: 1 pt = 20 twips = 12700 EMU
 */

import type { RowSizeConfig, GridConfig } from '../types';

export const EMU_PER_CM = 360000;
export const EMU_PER_MM = 36000;
export const TWIPS_PER_CM = 566.929133858; // Standard 567 twips per cm

export function cmToEmu(cm: number): number {
  return Math.round(cm * EMU_PER_CM);
}

export function mmToEmu(mm: number): number {
  return Math.round((mm / 10) * EMU_PER_CM);
}

export function emuToCm(emu: number): number {
  return Number((emu / EMU_PER_CM).toFixed(3));
}

export function cmToTwips(cm: number): number {
  return Math.round(cm * TWIPS_PER_CM);
}

export function mmToTwips(mm: number): number {
  return Math.round((mm / 10) * TWIPS_PER_CM);
}

export function twipsToCm(twips: number): number {
  return Number((twips / TWIPS_PER_CM).toFixed(3));
}

export function cmToMm(cm: number): number {
  return Number((cm * 10).toFixed(2));
}

export function mmToCm(mm: number): number {
  return Number((mm / 10).toFixed(3));
}

/**
 * Calculates canvas pixel dimensions for printing at target DPI (default 300 DPI)
 */
export function cmToPixels(cm: number, dpi = 300): number {
  const inches = cm / 2.54;
  return Math.round(inches * dpi);
}

export const SIZE_PRESETS = [
  {
    id: '2x3',
    label: '2 × 3 cm',
    widthCm: 2.0,
    heightCm: 3.0,
    description: 'Pas Foto Standar / Syarat KTP & Kartu',
  },
  {
    id: '3x4',
    label: '3 × 4 cm (6 Foto/Baris)',
    widthCm: 3.0,
    heightCm: 4.0,
    description: 'Pas Foto Ijazah & CPNS (Muat 6 Foto per Baris di A4, Margin Atas 0.3 cm)',
    badge: '1 Baris 6 Foto (Atas 0.3cm)',
  },
  {
    id: '4x6',
    label: '4 × 6 cm (5 Foto/Baris)',
    widthCm: 4.0,
    heightCm: 6.0,
    description: 'Pas Foto SKCK & Kedinasan (Muat 5 Foto per Baris di A4, Margin Atas 0.3 cm)',
    badge: '1 Baris 5 Foto (Atas 0.3cm)',
  },
  {
    id: 'ktp',
    label: 'Ukuran KTP (8.56 × 5.4 cm)',
    widthCm: 8.56,
    heightCm: 5.4,
    description: 'Standar Kartu KTP / SIM / ID Card (85.6 × 54 mm)',
    badge: 'Ukuran KTP',
  },
  {
    id: 'ktp_portrait',
    label: 'Ukuran KTP Tegak (5.4 × 8.56 cm)',
    widthCm: 5.4,
    heightCm: 8.56,
    description: 'Kartu KTP / ID Card Posisi Tegak (Potret)',
    badge: 'KTP Tegak',
  },
  {
    id: 'pas_foto_ktp',
    label: 'Pas Foto e-KTP (2.5 × 3.5 cm)',
    widthCm: 2.5,
    heightCm: 3.5,
    description: 'Ukuran Pas Foto Dalam Kartu e-KTP (25 × 35 mm)',
    badge: 'Foto KTP',
  },
  {
    id: '4x4',
    label: '4 × 4 cm',
    widthCm: 4.0,
    heightCm: 4.0,
    description: 'Format Persegi / ID Khusus',
  },
  {
    id: '3x3',
    label: '3 × 3 cm',
    widthCm: 3.0,
    heightCm: 3.0,
    description: 'Format Persegi Kecil',
  },
  {
    id: '3.5x4.5',
    label: '3.5 × 4.5 cm',
    widthCm: 3.5,
    heightCm: 4.5,
    description: 'Standar Visa Schengen & Paspor',
  },
  {
    id: '5x5',
    label: '5 × 5 cm (2x2")',
    widthCm: 5.08,
    heightCm: 5.08,
    description: 'Standar Visa AS & Umrah',
  },
  {
    id: 'stnk',
    label: 'Ukuran STNK (23 × 7.5 cm)',
    widthCm: 23.0,
    heightCm: 7.5,
    description: 'Ukuran STNK Otomatis Kertas A4 Lanskap',
    badge: 'A4 Lanskap',
  },
  {
    id: 'stnk_portrait',
    label: 'Ukuran STNK Tegak (7.5 × 23 cm)',
    widthCm: 7.5,
    heightCm: 23.0,
    description: 'Ukuran STNK Tegak (untuk dicetak di A4)',
    badge: 'STNK Tegak',
  },
];

export const PAPER_PRESETS: Record<string, { widthCm: number; heightCm: number; label: string }> = {
  A4: {
    widthCm: 21.0,
    heightCm: 29.7,
    label: 'A4 (21.0 × 29.7 cm)',
  },
  F4: {
    widthCm: 21.5,
    heightCm: 33.0,
    label: 'F4 / Folio (21.5 × 33.0 cm)',
  },
  Letter: {
    widthCm: 21.59,
    heightCm: 27.94,
    label: 'Letter (21.6 × 27.9 cm)',
  },
};

export interface A4LayoutDetail {
  columns: number;
  rows: number;
  widthCm: number;
  heightCm: number;
  gutterCm: number;
  rowSpacingCm: number;
  margins: { topCm: number; bottomCm: number; leftCm: number; rightCm: number };
  layoutMode: 'uniform' | 'per_row';
  rowConfigs?: RowSizeConfig[];
  summary: string;
}

export interface FullA4PhotoPlan {
  photoCount: number;
  title: string;
  recommendedOrientation: 'portrait' | 'landscape';
  aiReason: string;
  portrait: A4LayoutDetail;
  landscape: A4LayoutDetail;
}

export const A4_FULL_PLANS: FullA4PhotoPlan[] = [
  {
    photoCount: 1,
    title: '1 Foto Penuh A4',
    recommendedOrientation: 'portrait',
    aiReason: '1 Foto dicetak ukuran poster penuh (19.0 × 27.7 cm) mengisi 100% halaman A4.',
    portrait: {
      columns: 1,
      rows: 1,
      widthCm: 19.0,
      heightCm: 27.7,
      gutterCm: 0,
      rowSpacingCm: 0,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '19.0 × 27.7 cm (Poster A4 Penuh)',
    },
    landscape: {
      columns: 1,
      rows: 1,
      widthCm: 27.7,
      heightCm: 19.0,
      gutterCm: 0,
      rowSpacingCm: 0,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '27.7 × 19.0 cm (Poster Lanskap Penuh)',
    },
  },
  {
    photoCount: 2,
    title: '2 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (2 kolom × 1 baris) menghasilkan 2 foto tegak proporsional 13.6 × 19.0 cm yang mengisi penuh lembar A4.',
    portrait: {
      columns: 1,
      rows: 2,
      widthCm: 19.0,
      heightCm: 13.6,
      gutterCm: 0,
      rowSpacingCm: 0.5,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '19.0 × 13.6 cm (2 Foto Mendatar)',
    },
    landscape: {
      columns: 2,
      rows: 1,
      widthCm: 13.6,
      heightCm: 19.0,
      gutterCm: 0.5,
      rowSpacingCm: 0,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '13.6 × 19.0 cm (2 Foto Tegak)',
    },
  },
  {
    photoCount: 3,
    title: '3 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (3 kolom × 1 baris) menghasilkan 3 foto 8.9 × 19.0 cm mengisi penuh tinggi dan lebar kertas A4.',
    portrait: {
      columns: 1,
      rows: 3,
      widthCm: 19.0,
      heightCm: 8.9,
      gutterCm: 0,
      rowSpacingCm: 0.5,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '19.0 × 8.9 cm (3 Foto Bertumpuk)',
    },
    landscape: {
      columns: 3,
      rows: 1,
      widthCm: 8.9,
      heightCm: 19.0,
      gutterCm: 0.5,
      rowSpacingCm: 0,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '8.9 × 19.0 cm (3 Foto Berjejer)',
    },
  },
  {
    photoCount: 4,
    title: '4 Foto Penuh A4',
    recommendedOrientation: 'portrait',
    aiReason: 'Grid 2 × 2 di Potret menghasilkan ukuran standar 4R Jumbo (9.3 × 13.6 cm) mengisi 96.5% kertas A4 tanpa ruang tersisa.',
    portrait: {
      columns: 2,
      rows: 2,
      widthCm: 9.3,
      heightCm: 13.6,
      gutterCm: 0.4,
      rowSpacingCm: 0.5,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '9.3 × 13.6 cm (4R Jumbo Standar)',
    },
    landscape: {
      columns: 2,
      rows: 2,
      widthCm: 13.6,
      heightCm: 9.3,
      gutterCm: 0.5,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '13.6 × 9.3 cm (4R Lanskap)',
    },
  },
  {
    photoCount: 5,
    title: '5 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: '5 Foto ditata bertingkat penuh (Baris 1 isi 2 foto besar, Baris 2 isi 3 foto) sehingga 100% tinggi dan lebar kertas A4 terisi penuh tanpa ada bagian bawah yang kosong.',
    portrait: {
      columns: 2,
      rows: 2,
      widthCm: 9.3,
      heightCm: 13.5,
      gutterCm: 0.4,
      rowSpacingCm: 0.5,
      margins: { topCm: 0.3, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'per_row',
      rowConfigs: [
        { id: 'r1', widthCm: 9.3, heightCm: 13.5, columnsMode: 'custom', customColumns: 2 },
        { id: 'r2', widthCm: 6.1, heightCm: 13.5, columnsMode: 'custom', customColumns: 3 },
      ],
      summary: 'Baris 1: 2 foto (9.3×13.5 cm), Baris 2: 3 foto (6.1×13.5 cm)',
    },
    landscape: {
      columns: 3,
      rows: 2,
      widthCm: 13.6,
      heightCm: 9.2,
      gutterCm: 0.5,
      rowSpacingCm: 0.5,
      margins: { topCm: 0.3, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'per_row',
      rowConfigs: [
        { id: 'r1', widthCm: 13.6, heightCm: 9.2, columnsMode: 'custom', customColumns: 2 },
        { id: 'r2', widthCm: 8.9, heightCm: 9.2, columnsMode: 'custom', customColumns: 3 },
      ],
      summary: 'Baris 1: 2 foto (13.6×9.2 cm), Baris 2: 3 foto (8.9×9.2 cm)',
    },
  },
  {
    photoCount: 6,
    title: '6 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (3 kolom × 2 baris) menghasilkan proporsi foto 8.9 × 9.3 cm yang sangat pas dan mengisi 95% kertas A4.',
    portrait: {
      columns: 2,
      rows: 3,
      widthCm: 9.3,
      heightCm: 8.9,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 0.3, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '9.3 × 8.9 cm (2 Kolom × 3 Baris)',
    },
    landscape: {
      columns: 3,
      rows: 2,
      widthCm: 8.9,
      heightCm: 9.3,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 0.3, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '8.9 × 9.3 cm (3 Kolom × 2 Baris)',
    },
  },
  {
    photoCount: 7,
    title: '7 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: '7 Foto ditata bertingkat (Baris 1 isi 3 foto, Baris 2 isi 4 foto) mengisi 100% kertas A4 secara penuh tanpa sisa ruang.',
    portrait: {
      columns: 3,
      rows: 2,
      widthCm: 6.1,
      heightCm: 13.5,
      gutterCm: 0.4,
      rowSpacingCm: 0.5,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'per_row',
      rowConfigs: [
        { id: 'r1', widthCm: 6.1, heightCm: 13.5, columnsMode: 'custom', customColumns: 3 },
        { id: 'r2', widthCm: 4.5, heightCm: 13.5, columnsMode: 'custom', customColumns: 4 },
      ],
      summary: 'Baris 1: 3 foto (6.1×13.5 cm), Baris 2: 4 foto (4.5×13.5 cm)',
    },
    landscape: {
      columns: 4,
      rows: 2,
      widthCm: 8.9,
      heightCm: 9.2,
      gutterCm: 0.4,
      rowSpacingCm: 0.5,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'per_row',
      rowConfigs: [
        { id: 'r1', widthCm: 8.9, heightCm: 9.2, columnsMode: 'custom', customColumns: 3 },
        { id: 'r2', widthCm: 6.6, heightCm: 9.2, columnsMode: 'custom', customColumns: 4 },
      ],
      summary: 'Baris 1: 3 foto (8.9×9.2 cm), Baris 2: 4 foto (6.6×9.2 cm)',
    },
  },
  {
    photoCount: 8,
    title: '8 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (4 kolom × 2 baris) menghasilkan foto tegak 6.6 × 9.3 cm (rasio pas foto 2:3) mengisi 94% kertas A4.',
    portrait: {
      columns: 2,
      rows: 4,
      widthCm: 9.3,
      heightCm: 6.6,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '9.3 × 6.6 cm (2 Kolom × 4 Baris)',
    },
    landscape: {
      columns: 4,
      rows: 2,
      widthCm: 6.6,
      heightCm: 9.3,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.6 × 9.3 cm (4 Kolom × 2 Baris)',
    },
  },
  {
    photoCount: 9,
    title: '9 Foto Penuh A4',
    recommendedOrientation: 'portrait',
    aiReason: 'Grid 3 × 3 di Potret menghasilkan foto 6.0 × 8.9 cm (rasio potret 2:3 ideal); di Lanskap menghasilkan foto 8.9 × 6.0 cm (rasio mendatar 3:2 ideal).',
    portrait: {
      columns: 3,
      rows: 3,
      widthCm: 6.0,
      heightCm: 8.9,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 8.9 cm (Grid 3 × 3 Potret)',
    },
    landscape: {
      columns: 3,
      rows: 3,
      widthCm: 8.9,
      heightCm: 6.0,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '8.9 × 6.0 cm (Grid 3 × 3 Lanskap)',
    },
  },
  {
    photoCount: 10,
    title: '10 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (5 kolom × 2 baris) menghasilkan 10 pas foto 5.3 × 9.3 cm mengisi penuh kertas A4.',
    portrait: {
      columns: 2,
      rows: 5,
      widthCm: 9.3,
      heightCm: 5.2,
      gutterCm: 0.4,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '9.3 × 5.2 cm (2 Kolom × 5 Baris)',
    },
    landscape: {
      columns: 5,
      rows: 2,
      widthCm: 5.3,
      heightCm: 9.3,
      gutterCm: 0.3,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '5.3 × 9.3 cm (5 Kolom × 2 Baris)',
    },
  },
  {
    photoCount: 11,
    title: '11 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (4 kolom × 3 baris) menghasilkan foto 6.6 × 6.0 cm mengisi 92% kertas A4.',
    portrait: {
      columns: 3,
      rows: 4,
      widthCm: 6.0,
      heightCm: 6.6,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 6.6 cm (3 Kolom × 4 Baris)',
    },
    landscape: {
      columns: 4,
      rows: 3,
      widthCm: 6.6,
      heightCm: 6.0,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.6 × 6.0 cm (4 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 12,
    title: '12 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (4 kolom × 3 baris) menghasilkan 12 foto 6.6 × 6.0 cm mengisi 92% kertas A4 tanpa sisa.',
    portrait: {
      columns: 3,
      rows: 4,
      widthCm: 6.0,
      heightCm: 6.6,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 6.6 cm (3 Kolom × 4 Baris)',
    },
    landscape: {
      columns: 4,
      rows: 3,
      widthCm: 6.6,
      heightCm: 6.0,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.6 × 6.0 cm (4 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 13,
    title: '13 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (5 kolom × 3 baris) menghasilkan foto 5.2 × 6.0 cm mengisi lembar A4 secara rapi.',
    portrait: {
      columns: 3,
      rows: 5,
      widthCm: 6.0,
      heightCm: 5.2,
      gutterCm: 0.4,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 5.2 cm (3 Kolom × 5 Baris)',
    },
    landscape: {
      columns: 5,
      rows: 3,
      widthCm: 5.2,
      heightCm: 6.0,
      gutterCm: 0.3,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '5.2 × 6.0 cm (5 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 14,
    title: '14 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (5 kolom × 3 baris) menghasilkan foto 5.2 × 6.0 cm mengisi 85% lembar A4.',
    portrait: {
      columns: 3,
      rows: 5,
      widthCm: 6.0,
      heightCm: 5.2,
      gutterCm: 0.4,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 5.2 cm (3 Kolom × 5 Baris)',
    },
    landscape: {
      columns: 5,
      rows: 3,
      widthCm: 5.2,
      heightCm: 6.0,
      gutterCm: 0.3,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '5.2 × 6.0 cm (5 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 15,
    title: '15 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (5 kolom × 3 baris) pas mengisi 15 slot foto 5.2 × 6.0 cm (90% kertas A4 terisi penuh!).',
    portrait: {
      columns: 3,
      rows: 5,
      widthCm: 6.0,
      heightCm: 5.2,
      gutterCm: 0.4,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 5.2 cm (3 Kolom × 5 Baris)',
    },
    landscape: {
      columns: 5,
      rows: 3,
      widthCm: 5.2,
      heightCm: 6.0,
      gutterCm: 0.3,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '5.2 × 6.0 cm (5 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 16,
    title: '16 Foto Penuh A4',
    recommendedOrientation: 'portrait',
    aiReason: 'Grid 4 × 4 di Potret menghasilkan 16 pas foto ukuran 4.4 × 6.6 cm (proporsi pas foto 4×6 cm standar!) mengisi 90% kertas A4.',
    portrait: {
      columns: 4,
      rows: 4,
      widthCm: 4.4,
      heightCm: 6.6,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '4.4 × 6.6 cm (Grid 4 × 4 Pas Foto)',
    },
    landscape: {
      columns: 4,
      rows: 4,
      widthCm: 6.6,
      heightCm: 4.4,
      gutterCm: 0.4,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.6 × 4.4 cm (Grid 4 × 4 Lanskap)',
    },
  },
  {
    photoCount: 17,
    title: '17 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (6 kolom × 3 baris) menghasilkan foto 4.3 × 6.0 cm.',
    portrait: {
      columns: 3,
      rows: 6,
      widthCm: 6.0,
      heightCm: 4.3,
      gutterCm: 0.4,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 4.3 cm (3 Kolom × 6 Baris)',
    },
    landscape: {
      columns: 6,
      rows: 3,
      widthCm: 4.3,
      heightCm: 6.0,
      gutterCm: 0.3,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '4.3 × 6.0 cm (6 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 18,
    title: '18 Foto Penuh A4',
    recommendedOrientation: 'landscape',
    aiReason: 'Lanskap (6 kolom × 3 baris) pas mengisi tepat 18 foto 4.3 × 6.0 cm mengisi 89% kertas A4.',
    portrait: {
      columns: 3,
      rows: 6,
      widthCm: 6.0,
      heightCm: 4.3,
      gutterCm: 0.4,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '6.0 × 4.3 cm (3 Kolom × 6 Baris)',
    },
    landscape: {
      columns: 6,
      rows: 3,
      widthCm: 4.3,
      heightCm: 6.0,
      gutterCm: 0.3,
      rowSpacingCm: 0.4,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '4.3 × 6.0 cm (6 Kolom × 3 Baris)',
    },
  },
  {
    photoCount: 19,
    title: '19 Foto Penuh A4',
    recommendedOrientation: 'portrait',
    aiReason: 'Potret (4 kolom × 5 baris) menghasilkan foto 4.4 × 5.2 cm.',
    portrait: {
      columns: 4,
      rows: 5,
      widthCm: 4.4,
      heightCm: 5.2,
      gutterCm: 0.3,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '4.4 × 5.2 cm (4 Kolom × 5 Baris)',
    },
    landscape: {
      columns: 5,
      rows: 4,
      widthCm: 5.2,
      heightCm: 4.4,
      gutterCm: 0.3,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '5.2 × 4.4 cm (5 Kolom × 4 Baris)',
    },
  },
  {
    photoCount: 20,
    title: '20 Foto Penuh A4',
    recommendedOrientation: 'portrait',
    aiReason: 'Potret (4 kolom × 5 baris) menghasilkan 20 pas foto 4.4 × 5.2 cm mengisi 88% kertas A4 secara simetris.',
    portrait: {
      columns: 4,
      rows: 5,
      widthCm: 4.4,
      heightCm: 5.2,
      gutterCm: 0.3,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '4.4 × 5.2 cm (4 Kolom × 5 Baris)',
    },
    landscape: {
      columns: 5,
      rows: 4,
      widthCm: 5.2,
      heightCm: 4.4,
      gutterCm: 0.3,
      rowSpacingCm: 0.3,
      margins: { topCm: 1.0, bottomCm: 1.0, leftCm: 1.0, rightCm: 1.0 },
      layoutMode: 'uniform',
      summary: '5.2 × 4.4 cm (5 Kolom × 4 Baris)',
    },
  },
];

export function getFullA4Plan(count: number): FullA4PhotoPlan | undefined {
  return A4_FULL_PLANS.find((p) => p.photoCount === count);
}

export function applyFullA4Plan(
  plan: FullA4PhotoPlan,
  forcedOrientation?: 'portrait' | 'landscape'
): Partial<GridConfig> {
  const chosenOrientation = forcedOrientation || plan.recommendedOrientation;
  const detail = chosenOrientation === 'landscape' ? plan.landscape : plan.portrait;

  if (detail.layoutMode === 'per_row' && detail.rowConfigs) {
    return {
      paperType: 'A4',
      orientation: chosenOrientation,
      sizeLayoutMode: 'per_row',
      rowConfigs: detail.rowConfigs,
      gutterCm: detail.gutterCm,
      rowSpacingCm: detail.rowSpacingCm,
      margins: {
        topCm: detail.margins.topCm,
        bottomCm: detail.margins.bottomCm,
        leftCm: detail.margins.leftCm,
        rightCm: detail.margins.rightCm,
      },
    };
  }

  return {
    paperType: 'A4',
    orientation: chosenOrientation,
    sizeLayoutMode: 'uniform',
    columnsMode: 'custom',
    customColumns: detail.columns,
    customRows: detail.rows,
    targetWidthCm: detail.widthCm,
    targetHeightCm: detail.heightCm,
    gutterCm: detail.gutterCm,
    rowSpacingCm: detail.rowSpacingCm,
    margins: {
      topCm: detail.margins.topCm,
      bottomCm: detail.margins.bottomCm,
      leftCm: detail.margins.leftCm,
      rightCm: detail.margins.rightCm,
    },
  };
}

// Kompatibilitas untuk preset lama
export const A4_LAYOUT_PRESETS = A4_FULL_PLANS.map((plan) => {
  const def = plan.recommendedOrientation === 'landscape' ? plan.landscape : plan.portrait;
  return {
    id: `a4_isi_${plan.photoCount}`,
    name: `A4 Isi ${plan.photoCount} Foto`,
    photoCount: plan.photoCount,
    columns: def.columns,
    rows: def.rows,
    widthCm: def.widthCm,
    heightCm: def.heightCm,
    gutterCm: def.gutterCm,
    rowSpacingCm: def.rowSpacingCm,
    margins: def.margins,
    description: plan.aiReason,
    badge: `1 A4 Isi ${plan.photoCount} Foto`,
  };
});

export type A4LayoutPreset = (typeof A4_LAYOUT_PRESETS)[number];
