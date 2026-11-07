/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IntegrityReport } from './document';

export interface FormattingHistoryItem {
  id: string;
  articleName: string;
  templateId: string;
  templateName: string;
  processedAt: string;
  durationMs: number;
  status: 'BERHASIL' | 'GAGAL' | 'DIBATALKAN' | 'PERLU_PEMERIKSAAN';
  originalFileSize: number;
  formattedFileSize?: number;
  originalStats: {
    words: number;
    paragraphs: number;
    tables: number;
    images: number;
    references: number;
  };
  integrityReport: IntegrityReport;
  outputDocxBlobKey?: string; // Stored in IndexedDB
}
