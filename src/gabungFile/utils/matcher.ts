/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScanFile, TargetDocument } from '../types/skripsi';

interface MatchRule {
  targetId: string;
  namePatterns: RegExp[];
  ocrPatterns: RegExp[];
}

const MATCH_RULES: MatchRule[] = [
  {
    targetId: 'persetujuan',
    namePatterns: [
      /persetujuan/i,
      /setuju/i,
      /lembar.*persetujuan/i,
      /halaman.*persetujuan/i,
      /persetujuan.*pembimbing/i,
    ],
    ocrPatterns: [
      /halaman\s*persetujuan/i,
      /lembar\s*persetujuan/i,
      /disetujui\s*untuk/i,
      /dosen\s*pembimbing/i,
    ],
  },
  {
    targetId: 'pengesahan',
    namePatterns: [
      /pengesahan/i,
      /sah/i,
      /lembar.*pengesahan/i,
      /halaman.*pengesahan/i,
      /dewan.*penguji/i,
      /tim.*penguji/i,
    ],
    ocrPatterns: [
      /halaman\s*pengesahan/i,
      /lembar\s*pengesahan/i,
      /dewan\s*penguji/i,
      /telah\s*dipertahankan\s*di\s*depan/i,
      /tim\s*penguji/i,
    ],
  },
  {
    targetId: 'keaslian',
    namePatterns: [
      /keaslian/i,
      /pernyataan.*keaslian/i,
      /surat.*keaslian/i,
      /bukan.*plagiat/i,
      /orisinalitas/i,
      /lampiran.*1/i,
    ],
    ocrPatterns: [
      /pernyataan\s*keaslian\s*tulisan/i,
      /surat\s*pernyataan\s*keaslian/i,
      /bukan\s*merupakan\s*plagiasi/i,
      /menyatakan\s*dengan\s*sesungguhnya/i,
    ],
  },
  {
    targetId: 'surat_tugas',
    namePatterns: [
      /surat.*tugas/i,
      /surattugas/i,
      /tugas.*pembimbing/i,
      /sk.*pembimbing/i,
      /tugas.*bimbingan/i,
      /surat.*bimbingan/i,
      /surat.*pembimbing/i,
      /penugasan/i,
      /sk.*tugas/i,
      /sk.*dosen/i,
      /st.*pembimbing/i,
      /lampiran.*4/i,
      /lampiran4/i,
      /04.*surat/i,
      /4\..*surat/i,
      /tugas/i,
      /pembimbing/i,
    ],
    ocrPatterns: [
      /surat\s*tugas/i,
      /surat\s*tugas\s*pembimbing/i,
      /menugaskan\s*kepada/i,
      /tugas\s*bimbingan/i,
      /pembimbing\s*skripsi/i,
      /dekan\s*fakultas/i,
      /penetapan\s*dosen\s*pembimbing/i,
      /penugasan\s*dosen/i,
    ],
  },
  {
    targetId: 'kartu_bimbingan_depan',
    namePatterns: [
      /kartu.*bimbingan.*depan/i,
      /bimbingan.*depan/i,
      /kartu.*depan/i,
      /kartu.*bimbingan.*1/i,
      /bimbingan.*1/i,
      /bimbingan.*hal.*1/i,
      /nama.*nim/i,
      /identitas/i,
      /kb.*depan/i,
      /lampiran.*5/i,
      /kartu.*bimbingan/i,
      /kartubimbingan/i,
    ],
    ocrPatterns: [
      /kartu\s*bimbingan/i,
      /kartu\s*konsultasi/i,
      /nama/i,
      /nim/i,
      /fakultas/i,
      /prodi/i,
      /program\s*studi/i,
      /jurusan/i,
      /judul\s*skripsi/i,
    ],
  },
  {
    targetId: 'kartu_bimbingan_belakang',
    namePatterns: [
      /kartu.*bimbingan.*belakang/i,
      /bimbingan.*belakang/i,
      /kartu.*belakang/i,
      /kartu.*bimbingan.*2/i,
      /bimbingan.*2/i,
      /bimbingan.*hal.*2/i,
      /catatan/i,
      /konsultasi/i,
      /paraf/i,
      /kb.*belakang/i,
    ],
    ocrPatterns: [
      /catatan\s*konsultasi/i,
      /halaman\s*belakang/i,
      /bimbingan\s*lanjutan/i,
      /paraf/i,
      /materi\s*konsultasi/i,
    ],
  },
  {
    targetId: 'izin_penelitian',
    namePatterns: [
      /izin.*penelitian/i,
      /permohonan.*izin/i,
      /surat.*izin/i,
      /ijin.*penelitian/i,
      /lampiran.*6/i,
      /lampiran6/i,
    ],
    ocrPatterns: [
      /permohonan\s*izin\s*penelitian/i,
      /surat\s*izin\s*penelitian/i,
      /mohon\s*diberikan\s*izin/i,
      /izin\s*riset/i,
    ],
  },
  {
    targetId: 'telah_meneliti',
    namePatterns: [
      /telah.*meneliti/i,
      /keterangan.*telah.*meneliti/i,
      /selesai.*meneliti/i,
      /surat.*telah.*meneliti/i,
      /lampiran.*7/i,
      /lampiran7/i,
    ],
    ocrPatterns: [
      /surat\s*keterangan\s*telah\s*meneliti/i,
      /telah\s*melakukan\s*penelitian/i,
      /keterangan\s*penelitian/i,
      /telah\s*selesai\s*melaksanakan/i,
    ],
  },
  {
    targetId: 'bebas_plagiasi',
    namePatterns: [
      /bebas.*plagiasi/i,
      /bebas.*plagiat/i,
      /turnitin/i,
      /plagiarisme/i,
      /cek.*plagiasi/i,
      /similarity/i,
      /lampiran.*8/i,
      /lampiran8/i,
    ],
    ocrPatterns: [
      /bebas\s*plagiasi/i,
      /bebas\s*plagiarisme/i,
      /turnitin/i,
      /similarity\s*index/i,
      /keterangan\s*bebas\s*plagiasi/i,
    ],
  },
];

export function autoMatchScan(
  scan: ScanFile,
  availableTargets: TargetDocument[]
): {
  matchedTargetId?: string;
  source: 'filename' | 'ocr' | 'manual';
  confidence: 'high' | 'medium' | 'low';
} {
  const fileName = scan.name.toLowerCase();
  const ocrText = (scan.ocrSnippet || '').toLowerCase();

  // 1. Special dedicated check for Kartu Bimbingan:
  // Catches "kartu bimbingan_rot90.jpeg", "kartu bimbingan.jpg", "kartu bimbingan belakang_rot90.jpeg", etc.
  const isKartu = /kartu.*bimbingan|kartubimbingan|bimbingan.*kartu/i.test(fileName) ||
    (/kartu/i.test(fileName) && /bimbingan|konsultasi/i.test(fileName));

  if (isKartu) {
    if (/belakang|2|back|catatan|paraf/i.test(fileName)) {
      return {
        matchedTargetId: 'kartu_bimbingan_belakang',
        source: 'filename',
        confidence: 'high',
      };
    } else {
      // Anything named "kartu bimbingan" without "belakang" is DEPAN (Halaman Depan / Bagian Atas)!
      return {
        matchedTargetId: 'kartu_bimbingan_depan',
        source: 'filename',
        confidence: 'high',
      };
    }
  }

  // 2. Check other filename rules
  for (const rule of MATCH_RULES) {
    if (rule.targetId === 'surat_tugas' && /kartu/i.test(fileName)) {
      continue;
    }

    for (const pattern of rule.namePatterns) {
      if (pattern.test(fileName)) {
        return {
          matchedTargetId: rule.targetId,
          source: 'filename',
          confidence: 'high',
        };
      }
    }
  }

  // 3. Check OCR text if available
  if (ocrText.length > 5) {
    if (/kartu\s*bimbingan|kartu\s*konsultasi/i.test(ocrText)) {
      if (/nama|nim|fakultas|prodi|jurusan|program\s*studi/i.test(ocrText)) {
        return {
          matchedTargetId: 'kartu_bimbingan_depan',
          source: 'ocr',
          confidence: 'high',
        };
      }
      if (/catatan|konsultasi|paraf|lanjutan/i.test(ocrText)) {
        return {
          matchedTargetId: 'kartu_bimbingan_belakang',
          source: 'ocr',
          confidence: 'high',
        };
      }
    }

    for (const rule of MATCH_RULES) {
      for (const pattern of rule.ocrPatterns) {
        if (pattern.test(ocrText)) {
          return {
            matchedTargetId: rule.targetId,
            source: 'ocr',
            confidence: 'high',
          };
        }
      }
    }
  }

  return {
    matchedTargetId: undefined,
    source: 'manual',
    confidence: 'low',
  };
}

export function autoMapScansToTargets(
  targets: TargetDocument[],
  scans: ScanFile[]
): { updatedTargets: TargetDocument[]; updatedScans: ScanFile[] } {
  const updatedTargets = targets.map((t) => ({ ...t }));
  const updatedScans = scans.map((s) => ({ ...s }));

  const claimedScanIds = new Set<string>();

  // Pass 1: high confidence matches
  for (const scan of updatedScans) {
    const match = autoMatchScan(scan, updatedTargets);
    if (match.matchedTargetId && match.confidence === 'high') {
      const target = updatedTargets.find((t) => t.id === match.matchedTargetId);
      if (target && !target.assignedScanId) {
        target.assignedScanId = scan.id;
        target.status = 'ready';
        scan.matchedTargetId = target.id;
        scan.detectionSource = match.source;
        scan.confidence = 'high';
        claimedScanIds.add(scan.id);
      }
    }
  }

  // Pass 2: check Kartu bimbingan pair
  const bimbinganScans = updatedScans.filter(
    (s) => !claimedScanIds.has(s.id) && (/bimbingan/i.test(s.name) || /kartu/i.test(s.name))
  );
  if (bimbinganScans.length >= 2) {
    const targetDepan = updatedTargets.find((t) => t.id === 'kartu_bimbingan_depan');
    const targetBelakang = updatedTargets.find((t) => t.id === 'kartu_bimbingan_belakang');

    let scanDepan = bimbinganScans[0];
    let scanBelakang = bimbinganScans[1];

    const isFirstBelakang = /belakang|2|back|catatan/i.test(scanDepan.name);
    const isSecondDepan = /depan|1|front|nama|nim/i.test(scanBelakang.name);

    if (isFirstBelakang || isSecondDepan) {
      scanDepan = bimbinganScans[1];
      scanBelakang = bimbinganScans[0];
    }

    if (targetDepan && !targetDepan.assignedScanId) {
      targetDepan.assignedScanId = scanDepan.id;
      targetDepan.status = 'ready';
      scanDepan.matchedTargetId = targetDepan.id;
      scanDepan.confidence = 'medium';
      claimedScanIds.add(scanDepan.id);
    }
    if (targetBelakang && !targetBelakang.assignedScanId) {
      targetBelakang.assignedScanId = scanBelakang.id;
      targetBelakang.status = 'ready';
      scanBelakang.matchedTargetId = targetBelakang.id;
      scanBelakang.confidence = 'medium';
      claimedScanIds.add(scanBelakang.id);
    }
  }

  // Pass 3: Verification of Kartu Bimbingan Atas (Depan) vs Bawah (Belakang)
  // Ensure that the one containing Nama/NIM/Fakultas/Prodi is ALWAYS on top!
  const targetDepan = updatedTargets.find((t) => t.id === 'kartu_bimbingan_depan');
  const targetBelakang = updatedTargets.find((t) => t.id === 'kartu_bimbingan_belakang');

  if (targetDepan?.assignedScanId && targetBelakang?.assignedScanId) {
    const sDepan = updatedScans.find((s) => s.id === targetDepan.assignedScanId);
    const sBelakang = updatedScans.find((s) => s.id === targetBelakang.assignedScanId);

    if (sDepan && sBelakang) {
      const sDepanText = (sDepan.name + ' ' + (sDepan.ocrSnippet || '')).toLowerCase();
      const sBelakangText = (sBelakang.name + ' ' + (sBelakang.ocrSnippet || '')).toLowerCase();

      const belakangHasIdentity =
        /nama|nim|fakultas|prodi|jurusan|depan|front|hal 1/i.test(sBelakangText) &&
        !/belakang|catatan|konsultasi/i.test(sBelakang.name);
      const depanIsActuallyBack =
        /belakang|catatan|konsultasi|paraf|hal 2/i.test(sDepanText) &&
        !/depan|nama|nim/i.test(sDepan.name);

      if (belakangHasIdentity || depanIsActuallyBack) {
        targetDepan.assignedScanId = sBelakang.id;
        targetBelakang.assignedScanId = sDepan.id;
        sDepan.matchedTargetId = 'kartu_bimbingan_belakang';
        sBelakang.matchedTargetId = 'kartu_bimbingan_depan';
      }
    }
  }

  return { updatedTargets, updatedScans };
}
