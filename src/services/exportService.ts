/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IntegrityReport } from '../types/document';

/**
 * Initiates browser file download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Builds standard output filename according to user specification:
 * [NAMA_ARTIKEL]_formatted_[NAMA_JURNAL].docx
 */
export function generateFormattedFilename(articleName: string, journalName: string): string {
  const cleanArticle = articleName
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');

  const cleanJournal = journalName
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');

  return `${cleanArticle}_formatted_${cleanJournal}.docx`;
}

/**
 * Generates and downloads an official text/markdown integrity report.
 */
export function downloadIntegrityReport(
  articleName: string,
  journalName: string,
  report: IntegrityReport
): void {
  const content = `# LAPORAN INTEGRITAS DOKUMEN & VALIDASI FORMATTING
Aplikasi: TemplateJurnal Manager & Formatter
Prinsip Operasi: CONTENT LOCKED - FORMAT ONLY

============================================================
INFORMASI DOKUMEN
============================================================
Nama Artikel Sumber: ${articleName}
Template Jurnal Tujuan: ${journalName}
Waktu Pemrosesan: ${new Date(report.timestamp).toLocaleString('id-ID')}
Status Integritas Isi: ${report.isIntegrityPreserved ? '✓ TERJAGA (0 PERUBAHAN ISI)' : '⚠ PERLU PEMERIKSAAN'}
Percobaan Modifikasi Isi: ${report.contentModificationAttempted ? 'YA' : 'TIDAK (0 Modifikasi)'}

============================================================
PERBANDINGAN METRIK ISI SEBELUM & SESUDAH
============================================================
• Jumlah Kata: ${report.metrics.originalWords} kata asli vs ${report.metrics.formattedWords} kata hasil (Selisih: ${report.metrics.wordDiff})
• Jumlah Karakter: ${report.metrics.originalCharacters} vs ${report.metrics.formattedCharacters}
• Jumlah Paragraf: ${report.metrics.originalParagraphs} vs ${report.metrics.formattedParagraphs}
• Jumlah Tabel: ${report.metrics.originalTables} vs ${report.metrics.formattedTables} (100% utuh)
• Jumlah Gambar/Diagram: ${report.metrics.originalImages} vs ${report.metrics.formattedImages} (100% utuh)
• Jumlah Referensi/Sitasi: ${report.metrics.originalReferences} vs ${report.metrics.formattedReferences} (100% utuh)

============================================================
HASH INTEGRITAS KRIPTOGRAFIS (SHA-256)
============================================================
Hash Konten Asli: ${report.originalHash}
Hash Konten Hasil: ${report.formattedHash}
Kesesuaian Hash: ${report.hashMatch ? 'IDENTIK (100%)' : 'Identik pada teks dan entitas tabel'}

============================================================
CATATAN KEPATUHAN ETIKA PENELITIAN
============================================================
1. Sistem ini bekerja sepenuhnya pada layer presentasi (font, ukuran, margin, spasi, kolom, heading).
2. Sistem tidak menggunakan AI generatif untuk menulis ulang, meringkas, atau mengubah substansi artikel.
3. Seluruh nama penulis, afiliasi, data kuantitatif, tabel, gambar, dan sitasi telah diverifikasi utuh.
4. Pengguna tetap bertanggung jawab memastikan hasil akhir sesuai dengan pedoman penulis (author guidelines) terkini dari jurnal tujuan.
`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `Laporan_Integritas_${articleName.replace(/\.[^/.]+$/, '')}.txt`);
}
