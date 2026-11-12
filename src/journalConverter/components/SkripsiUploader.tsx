import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Sparkles, User, Mail, GraduationCap, Building2, AlertCircle, ArrowRight, BookCheck, HelpCircle, Compass, Microscope, Hash, Calendar } from 'lucide-react';
import mammoth from 'mammoth';
import { SkripsiInput, JournalMetadata } from '../types/journal';
import { SAMPLE_SKRIPSI } from '../data/sampleSkripsi';
import { extractTextFromPdfArrayBuffer, PdfExtractionProgress } from '../utils/pdfExtractor';
import { detectResearchMethodology, MethodologyDetectionResult } from '../utils/textCleaner';

interface SkripsiUploaderProps {
  onSubmit: (input: SkripsiInput) => void;
  isLoading: boolean;
  generationStatus?: {
    stage: number;
    message: string;
    percent: number;
  };
  thesisPdfStatus?: { status: 'idle' | 'running' | 'ready' | 'error' | 'skipped'; message: string };
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

// Helper function to generate author student email: [nama][4digitacak]@gmail.com
export function generateStudentEmail(name?: string, currentEmail?: string): string {
  if (currentEmail && currentEmail.trim() && currentEmail !== '-' && currentEmail.includes('@gmail.com')) {
    const userPart = currentEmail.split('@')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/\d{4}$/.test(userPart)) {
      return `${userPart}@gmail.com`;
    }
  }

  const rawName = (name || '').trim();
  const cleanName = rawName
    .replace(/(S\.[A-Za-z.]+|M\.[A-Za-z.]+|Dr\.|Prof\.|Ph\.D|M\.Sc|S\.Pd|S\.H|S\.Sos|S\.Si|S\.T|S\.Ked|S\.Psi|M\.M|M\.Si)/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();

  const random4Digits = Math.floor(1000 + Math.random() * 9000);
  const baseUser = cleanName && cleanName.length >= 3 ? cleanName : 'mahasiswa';
  return `${baseUser}${random4Digits}@gmail.com`;
}

export function isSuspiciousFilenameTitle(title?: string): boolean {
  if (!title) return true;
  const clean = title.trim();
  if (clean.length < 18) return true;
  const lower = clean.toLowerCase();

  // 1. Any mention of skripsi, tesis, tugas akhir, draft, revisi, etc. (Real thesis titles never contain these words as the title itself)
  if (/\b(?:skripsi{1,3}|tugas\s*akhir|tesis|disertasi|makalah|revisi|draft|fix|final|file|dokumen|naskah|print|cetak|cover|proposal|bab\s*\d)\b/i.test(lower)) {
    return true;
  }
  // 2. Trailing single numbers, version numbers, or draft suffixes (e.g. " 2", "_2", " v2", "-rev1", " part 2")
  if (/[\s_\-\.](?:\d{1,2}|v\d+|rev\d+|acc|ok)$/i.test(clean)) {
    return true;
  }
  // 3. Repeated identical letters (3 or more, like "aaaa", "iiii", "llll")
  if (/(.)\1{2,}/i.test(lower)) {
    return true;
  }
  // 4. File extensions (.pdf, .docx, .doc, .txt, .rtf)
  if (/\.(pdf|docx?|txt|rtf)$/i.test(clean)) {
    return true;
  }
  // 5. Filename-like string (underscores/hyphens without proper word spaces)
  if (/^[a-z0-9_\-\.]+$/i.test(clean) && !clean.includes(' ')) {
    return true;
  }
  // 6. Fewer than 4 words (a real thesis title has at least 4-5 substantive words)
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return true;
  }
  // 7. Check if title starts with administrative or institutional keywords
  if (/^(?:oleh|disusun|nama|kementerian|universitas|institut|fakultas|program\s+studi|jurusan|halaman|kata\s+pengantar)/i.test(lower)) {
    return true;
  }
  // 8. Academic preposition / connector check: Indonesian thesis titles always contain relational or topical words
  const hasAcademicStructure = /\b(?:dalam|terhadap|pada|di|untuk|tentang|berbasis|melalui|sebagai|dengan|studi|pengaruh|implementasi|analisis|peran|efektivitas|peningkatan|evaluasi|hubungan|model|konsep|perbandingan|faktor|penerapan|strategi|upaya|tinjauan|korelasi|pengembangan|manajemen|kebijakan)\b/i.test(lower);
  if (!hasAcademicStructure && words.length < 6) {
    return true;
  }

  return false;
}

export function isValidThesisTitle(str: string): boolean {
  if (!str) return false;
  const cleaned = str.trim();
  if (cleaned.length < 18 || cleaned.length > 350) return false;
  if (isSuspiciousFilenameTitle(cleaned)) return false;
  const lower = cleaned.toLowerCase();
  const invalidStarters = [
    'halaman', 'kata pengantar', 'daftar isi', 'daftar tabel', 'lembar pengesahan',
    'kementerian', 'fakultas', 'universitas', 'institut', 'sekolah tinggi',
    'bab i', 'bab ii', 'bab iii', 'bab iv', 'bab v', 'pendahuluan',
    'diajukan', 'disusun', 'oleh', 'skripsi', 'tesis', 'tugas akhir', 'laporan'
  ];
  if (invalidStarters.some(s => lower.startsWith(s))) return false;
  return true;
}

// Helper function to extract author metadata (nama, prodi, instansi, email, judul) automatically from extracted text
export const extractMetadataFromSkripsiText = (text: string, fileName?: string) => {
  if (!text) return {};

  const cleanTitleCandidate = (raw: string): string => {
    const rawClean = raw
      .replace(/^[\s\-–—]*HALAMAN\s*\d+[\s\-–—]*/gi, '')
      .replace(/---+\s*HALAMAN\s*\d+\s*---+/gi, '')
      .replace(/---+\s*PAGE\s*\d+\s*---+/gi, '')
      .replace(/^[\s\-–—:.]+/g, '')
      .trim();

    // Filter out university/faculty header lines, submission lines, and author preamble
    const lines = rawClean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const cleanLines = lines.filter((l) => {
      const low = l.toLowerCase();
      return !/\b(?:kementerian|departemen|universitas|institut|sekolah\s+tinggi|politeknik|akademi|fakultas|jurusan|program\s+studi|prodi|halaman|kata\s+pengantar|daftar\s+isi|daftar\s+tabel|lembar\s+pengesahan|lembar\s+persetujuan|nota\s+dinas|diajukan|disusun|oleh|skripsi{1,3}|tesis|tugas\s+akhir|laporan\s+penelitian|revisi|draft|fix|naskah|cetak|print)\b/i.test(low);
    });

    return cleanLines.join(' ').replace(/\s{2,}/g, ' ').trim();
  };

  // Pre-clean initial chunk (up to 20,000 characters to cover Cover, Lembar Pengesahan, and Abstrak)
  const rawFirstChunk = text.slice(0, 20000);
  const firstChunk = rawFirstChunk
    .replace(/^[\s\-–—]*HALAMAN\s*\d+[\s\-–—]*/gi, '')
    .replace(/---+\s*HALAMAN\s*\d+\s*---+/gi, '');

  let detectedJudul = '';
  let detectedNama = '';
  let detectedProdi = '';
  let detectedInstansi = '';
  let detectedEmail = '';

  // Priority 1: Lembar Pengesahan / Lembar Persetujuan / Nota Dinas Pembimbing
  // E.g. "Skripsi yang berjudul : IMPLEMENTASI MODEL PEMBELAJARAN ... yang disusun oleh"
  // E.g. "berjudul : \"IMPLEMENTASI MODEL PEMBELAJARAN ...\""
  const pengesahanMatch = firstChunk.match(/(?:skripsi\s+(?:yang\s+)?berjudul|dengan\s+judul|berjudul)\s*[:\s"“]\s*([A-Za-z0-9\s,:\-–—\(\)\/]{20,350}?)(?=["”\n\r]*(?:yang\s+disusun|disusun\s+oleh|telah\s+(?:diuji|disetujui|disahkan)|oleh\s*:|nama\s*:|untuk\s+diujikan|\.\s|\n\s*\n))/i);
  if (pengesahanMatch && pengesahanMatch[1]) {
    const candidate = cleanTitleCandidate(pengesahanMatch[1]);
    if (isValidThesisTitle(candidate)) {
      detectedJudul = candidate;
    }
  }

  // Priority 2: Explicit "JUDUL :" or "Judul Skripsi :"
  if (!detectedJudul) {
    const explicitJudulMatch = firstChunk.match(/(?:judul\s+skripsi|judul\s+penelitian|judul\s+tesis|judul\s+tugas\s+akhir|judul)\s*[:\n]\s*([A-Za-z0-9\s,:\-–—\(\)\/]{20,350})/i);
    if (explicitJudulMatch && explicitJudulMatch[1]) {
      const rawJudul = cleanTitleCandidate(
        explicitJudulMatch[1].split(/\n\s*(?:Oleh|Disusun|Nama|NIM|Program|Fakultas)/i)[0]
      );
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul;
      }
    }
  }

  // Priority 3: In ABSTRAK header: [Nama], [Tahun], [Judul], Skripsi...
  if (!detectedJudul) {
    const abstrakHeaderMatch = firstChunk.match(/ABSTRAK\s*\n+([A-Za-z\s'\.\,]{3,60})[,\.]\s*(\d{4})[,\.]\s*([^,\n\r]{20,350})[,\.]\s*(?:Skripsi|Tesis|Program|Fakultas)/i);
    if (abstrakHeaderMatch && abstrakHeaderMatch[3]) {
      const rawJudul = cleanTitleCandidate(abstrakHeaderMatch[3]);
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul;
      }
    }
  }

  // Priority 4: Cover Page: Text between Faculty/Institution and "SKRIPSI"
  if (!detectedJudul) {
    const headerTitleMatch = firstChunk.match(/(?:KEMENTERIAN\s+AGAMA|UNIVERSITAS|INSTITUT|SEKOLAH\s+TINGGI|FAKULTAS)[^\n]*\n+([A-Z0-9\s,:\-–—\(\)\/]{20,350})\s*\n+\s*(?:SKRIPSI|TUGAS\s+AKHIR|TESIS|DISERTASI|PROPOSAL|DIAJUKAN)/i);
    if (headerTitleMatch && headerTitleMatch[1]) {
      const rawJudul = cleanTitleCandidate(headerTitleMatch[1]);
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul;
      }
    }
  }

  // Priority 5: Cover Page: Text immediately after "SKRIPSI" and before "Diajukan" / "Oleh" / "Disusun"
  if (!detectedJudul) {
    const afterSkripsiMatch = firstChunk.match(/(?:SKRIPSI|TUGAS\s+AKHIR|TESIS|DISERTASI)\s*\n+([A-Z0-9\s,:\-–—\(\)\/]{20,350})\s*\n+(?:Diajukan\s+(?:untuk|kepada)|Disusun\s+oleh|Oleh\s*:|NIM|Program|Fakultas)/i);
    if (afterSkripsiMatch && afterSkripsiMatch[1]) {
      const rawJudul = cleanTitleCandidate(afterSkripsiMatch[1]);
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul;
      }
    }
  }

  // Priority 6: Direct academic research title keyword scan (IMPLEMENTASI / PENGARUH / ANALISIS / HUBUNGAN / dsb.)
  if (!detectedJudul) {
    const keywordTitleMatch = firstChunk.match(/(?:\n|^)\s*([A-Z0-9\s,:\-–—\(\)\/]{10,350}\b(?:IMPLEMENTASI|PENGARUH|ANALISIS|HUBUNGAN|PERAN|UPAYA|STRATEGI|EFEKTIVITAS|PENINGKATAN|MODEL\s+PEMBELAJARAN|PENERAPAN|FAKTOR-FAKTOR|TINJAUAN|STUDI|PENGEMBANGAN|KORELASI|EVALUASI|DAMPAK|NILAI-NILAI|KONSEP|MANAJEMEN)\b[A-Z0-9\s,:\-–—\(\)\/]{15,300})\s*(?:\r?\n|$)/);
    if (keywordTitleMatch && keywordTitleMatch[1]) {
      const rawJudul = cleanTitleCandidate(keywordTitleMatch[1]);
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul;
      }
    }
  }

  // Priority 7: In ABSTRAK body: "Penelitian ini bertujuan untuk mendeskripsikan / menguji / menganalisis [JUDUL]..."
  if (!detectedJudul) {
    const abstrakTujuanMatch = firstChunk.match(/(?:penelitian|riset|studi)\s+ini\s+bertujuan\s+(?:untuk\s+)?(?:mendeskripsikan|mengetahui|menganalisis|menguji|mengembangkan|mengevaluasi)\s+([^.\n\r]{25,250})/i);
    if (abstrakTujuanMatch && abstrakTujuanMatch[1]) {
      const rawJudul = cleanTitleCandidate(abstrakTujuanMatch[1]);
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul.toUpperCase();
      }
    }
  }

  // Priority 8: Text right before "DIAJUKAN UNTUK MEMENUHI..." or "DIAJUKAN KEPADA..." or "DISUSUN OLEH:"
  if (!detectedJudul) {
    const beforeDiajukanMatch = firstChunk.match(/\n\s*([A-Z0-9\s,:\-–—\(\)\/]{20,350})\s*\n+\s*(?:DIAJUKAN\s+(?:UNTUK|KEPADA)|DISUSUN\s+OLEH|OLEH\s*:)/i);
    if (beforeDiajukanMatch && beforeDiajukanMatch[1]) {
      const rawJudul = cleanTitleCandidate(beforeDiajukanMatch[1]);
      if (isValidThesisTitle(rawJudul)) {
        detectedJudul = rawJudul;
      }
    }
  }

  // 1. Extract Author Name
  // Pattern A: "Disusun Oleh:", "Oleh:", "Penulis:", "Oleh :"
  const olehMatch = firstChunk.match(/(?:disusun\s+oleh|oleh|penulis)\s*[:\n]\s*([A-Za-z\s'\.\,]{3,60})/i);
  if (olehMatch && olehMatch[1]) {
    const rawName = olehMatch[1].split('\n')[0].trim();
    if (isValidAuthorName(rawName)) {
      detectedNama = cleanAndFormatAuthorName(rawName);
    }
  }

  // Pattern B: "NAMA :" or "Nama Lengkap :"
  if (!detectedNama) {
    const namaMatch = firstChunk.match(/(?:nama\s+lengkap|nama)\s*[:\n]\s*([A-Za-z\s'\.\,]{3,60})/i);
    if (namaMatch && namaMatch[1]) {
      const rawName = namaMatch[1].split('\n')[0].trim();
      if (isValidAuthorName(rawName)) {
        detectedNama = cleanAndFormatAuthorName(rawName);
      }
    }
  }

  // Pattern C: Name line right before NIM/NPM/NIP
  if (!detectedNama) {
    const nimMatch = firstChunk.match(/([A-Z\s'\.\,]{3,60})\s*\n\s*(?:NIM|NPM|NIP|NRM)\s*[:\.]/i);
    if (nimMatch && nimMatch[1]) {
      const rawName = nimMatch[1].trim();
      if (isValidAuthorName(rawName)) {
        detectedNama = cleanAndFormatAuthorName(rawName);
      }
    }
  }

  // 2. Extract Program Studi
  const prodiMatch = firstChunk.match(/(?:program\s+studi|prodi|jurusan)\s*[:\n\s]*([A-Za-z\s]{4,60})/i);
  if (prodiMatch && prodiMatch[1]) {
    const candidate = prodiMatch[1].split('\n')[0].trim();
    if (candidate && candidate.length > 3 && !/^(universitas|fakultas|skripsi|lembar|tahun)/i.test(candidate)) {
      const formatted = candidate.toLowerCase().replace(/\b[a-z]/g, (l) => l.toUpperCase());
      detectedProdi = formatted.toLowerCase().startsWith('program studi') ? formatted : 'Program Studi ' + formatted;
    }
  }

  // 3. Extract Instansi / Universitas
  const univMatch = firstChunk.match(/(universitas|institut|sekolah\ttinggi|politeknik|akademi)\s+[A-Za-z\s]{3,60}/i);
  if (univMatch && univMatch[0]) {
    const candidate = univMatch[0].split('\n')[0].trim();
    detectedInstansi = candidate.toLowerCase().replace(/\b[a-z]/g, (l) => l.toUpperCase());
  }

  // 4. Generate/Extract Email (Format: [namamahasiswa][4digitacak]@gmail.com)
  const emailMatch = firstChunk.match(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && emailMatch[1]) {
    detectedEmail = generateStudentEmail(detectedNama, emailMatch[0]);
  } else if (detectedNama) {
    detectedEmail = generateStudentEmail(detectedNama);
  }

  // 5. Extract NIM (Nomor Induk Mahasiswa)
  let detectedNim = '';
  const nimMatch = firstChunk.match(/(?:nim|nomor\s+induk\s+mahasiswa|n\.i\.m)\s*[:\.]?\s*(\d{7,15})/i);
  if (nimMatch && nimMatch[1]) {
    detectedNim = nimMatch[1].trim();
  }

  // 6. Extract Bulan & Tahun Cover CD
  let detectedBulanTahun = '';
  const bulanTahunMatch = firstChunk.match(/(?:JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER)\s+\d{4}/i);
  if (bulanTahunMatch) {
    detectedBulanTahun = bulanTahunMatch[0].toLocaleUpperCase('id-ID');
  }

  return {
    judul: detectedJudul,
    nama: detectedNama,
    nim: detectedNim,
    bulanTahun: detectedBulanTahun,
    prodi: detectedProdi,
    instansi: detectedInstansi,
    email: detectedEmail,
  };
};

function isValidAuthorName(str: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase().trim();
  const invalidKeywords = [
    'skripsi', 'program', 'studi', 'jurusan', 'universitas', 'fakultas',
    'halaman', 'bab', 'daftar', 'lembar', 'pengesahan', 'nim', 'npm',
    'kata', 'pengantar', 'diajukan', 'untuk', 'memenuhi', 'syarat', 'gelar'
  ];
  if (invalidKeywords.some(kw => lower === kw || lower.startsWith(kw) || lower.includes('universitas') || lower.includes('fakultas'))) {
    return false;
  }
  return str.length >= 3 && str.length <= 60;
}

function cleanAndFormatAuthorName(str: string): string {
  let cleaned = str
    .replace(/(?:NIM|NPM|NIP|NRM).*$/i, '')
    .replace(/^[:\-\s]+/, '')
    .trim();

  // If uppercase (e.g. AHMAD FAUZI SIREGAR), capitalize title case
  if (cleaned === cleaned.toUpperCase()) {
    cleaned = cleaned.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
  return cleaned;
}

export const SkripsiUploader: React.FC<SkripsiUploaderProps> = ({
  onSubmit,
  isLoading,
  generationStatus,
  thesisPdfStatus,
  selectedModel,
  onSelectModel,
}) => {
  const [activeInputMode, setActiveInputMode] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfExtractionProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAutoExtractedName, setIsAutoExtractedName] = useState(false);

  const [rawText, setRawText] = useState<string>('');
  const defaultBulanTahun = () => {
    try {
      return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toLocaleUpperCase('id-ID');
    } catch {
      return 'OKTOBER 2026';
    }
  };

  const [metadata, setMetadata] = useState<JournalMetadata>({
    judul: '',
    judulEnglish: '',
    nama: '',
    nim: '',
    bulanTahun: defaultBulanTahun(),
    prodi: 'Program Studi Pendidikan Agama Islam',
    email: '',
    instansi: 'IAIN Madura',
  });

  const [footnoteStyle, setFootnoteStyle] = useState<'custom_footnote' | 'chicago' | 'apa'>('custom_footnote');
  const [targetLengthPages, setTargetLengthPages] = useState<number>(18);
  const [detectedMethod, setDetectedMethod] = useState<MethodologyDetectionResult | null>(null);
  const [methodologyPreference, setMethodologyPreference] = useState<'auto' | 'kualitatif' | 'kuantitatif' | 'pustaka' | 'rnd'>('auto');

  // Load sample skripsi
  const handleLoadSample = () => {
    setRawText(SAMPLE_SKRIPSI.rawText);
    setMetadata(SAMPLE_SKRIPSI.metadata);
    setSelectedFile(null);
    setUploadError(null);
    setIsAutoExtractedName(true);
    const sampleDetected = detectResearchMethodology(SAMPLE_SKRIPSI.rawText);
    setDetectedMethod(sampleDetected);
  };

  const [uploadStageMessage, setUploadStageMessage] = useState<string>('');

  // Helper to extract file text reliably via server
  const extractViaServer = async (fileToUpload: File): Promise<{ extractedText: string; detectedMetadata?: any }> => {
    let lastUploadError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const formData = new FormData();
        formData.append('file', fileToUpload);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout safeguard for 150+ page thesis

        let res = await fetch('/api/journal7/upload-skripsi', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        if (!res.ok && res.status === 404) {
          res = await fetch('/api/upload-skripsi', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
        }
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const rawResponse = await res.text();
          console.warn(`Server non-JSON response on upload (attempt ${attempt}):`, rawResponse.slice(0, 200));
          if (rawResponse.includes('Starting Server') && attempt < 3) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw new Error('Gagal membaca file. Server sedang bersiap, silakan coba lagi.');
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal mengunggah file skripsi.');
        }

        return {
          extractedText: data.extractedText || '',
          detectedMetadata: data.detectedMetadata,
        };
      } catch (err: any) {
        lastUploadError = err;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
      }
    }
    throw lastUploadError || new Error('Gagal membaca file skripsi di server.');
  };

  // File Upload to server or client extraction
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadingFile(true);
    setPdfProgress(null);
    setUploadError(null);
    setUploadStageMessage('Mempersiapkan dokumen skripsi...');

    try {
      let extractedText = '';
      let serverMetadata: any = null;
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const isDocx = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc');
      const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain';
      const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

      // 1. PDF Handling: On mobile or large files (>2.5MB), directly use server to prevent mobile phone freeze/hang
      if (isPdf) {
        if (isMobile || file.size > 2.5 * 1024 * 1024) {
          setUploadStageMessage('Memproses naskah di server berkecepatan tinggi...');
          setPdfProgress({
            currentPage: 1,
            totalPages: 1,
            percent: 50,
          });
          const serverRes = await extractViaServer(file);
          extractedText = serverRes.extractedText;
          serverMetadata = serverRes.detectedMetadata;
        } else {
          setUploadStageMessage('Membaca naskah PDF di browser...');
          try {
            const arrayBuffer = await file.arrayBuffer();
            extractedText = await extractTextFromPdfArrayBuffer(arrayBuffer, (prog) => {
              setPdfProgress(prog);
            });
          } catch (pdfClientErr: any) {
            console.warn('Client-side PDF extraction failed or timed out, switching to server processor:', pdfClientErr);
            setUploadStageMessage('Mengalihkan ke server agar pemrosesan lancar dan cepat...');
            setPdfProgress({
              currentPage: 1,
              totalPages: 1,
              percent: 75,
            });
            const serverRes = await extractViaServer(file);
            extractedText = serverRes.extractedText;
            serverMetadata = serverRes.detectedMetadata;
          }
        }
      } else if (isDocx) {
        try {
          const mammothLib: any = (mammoth as any)?.default || mammoth;
          const arrayBuffer = await file.arrayBuffer();
          const docxResult = await mammothLib.extractRawText({ arrayBuffer });
          if (docxResult && docxResult.value && docxResult.value.trim().length > 0) {
            extractedText = docxResult.value;
          }
        } catch (clientErr) {
          console.warn('Client-side docx parsing failed, falling back to server:', clientErr);
        }
      } else if (isTxt) {
        try {
          extractedText = await file.text();
        } catch (txtErr) {
          console.warn('Client-side txt reading failed, falling back to server:', txtErr);
        }
      }

      // 2. If client-side didn't extract text, fallback to server upload endpoint
      if (!extractedText || extractedText.trim().length === 0) {
        setUploadStageMessage('Membaca naskah via server...');
        const serverRes = await extractViaServer(file);
        extractedText = serverRes.extractedText;
        serverMetadata = serverRes.detectedMetadata;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Teks skripsi tidak dapat diekstrak dari file ini. Pastikan file PDF/Word berisi teks asli dan bukan scan gambar murni tanpa teks.');
      }

      setRawText(extractedText);

      // Auto detect methodology from extracted text
      const methodResult = detectResearchMethodology(extractedText);
      setDetectedMethod(methodResult);

      // Auto extract author name, prodi, instansi, email & title from text
      const extractedClient = extractMetadataFromSkripsiText(extractedText, file.name);
      const mergedJudul = (serverMetadata?.judul && isValidThesisTitle(serverMetadata.judul))
        ? serverMetadata.judul
        : (extractedClient.judul && isValidThesisTitle(extractedClient.judul))
        ? extractedClient.judul
        : '';

      const extracted = {
        ...extractedClient,
        ...(serverMetadata || {}),
        judul: mergedJudul,
      };

      if (extracted.nama) {
        setIsAutoExtractedName(true);
      }

      // Valid thesis title check: NEVER use file names like "SKRIPSII LIPAAAAAAA 2"
      const validDetectedJudul = (extracted.judul && isValidThesisTitle(extracted.judul))
        ? extracted.judul
        : '';

      setMetadata((prev) => ({
        ...prev,
        nama: extracted.nama || prev.nama,
        nim: extracted.nim || prev.nim,
        bulanTahun: extracted.bulanTahun || prev.bulanTahun,
        prodi: extracted.prodi || prev.prodi,
        instansi: extracted.instansi || prev.instansi,
        email: extracted.email || prev.email,
        judul: validDetectedJudul || (isValidThesisTitle(prev.judul) ? prev.judul : ''),
      }));
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat memproses file skripsi.');
    } finally {
      setUploadingFile(false);
      setPdfProgress(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawText || rawText.trim().length < 50) {
      setUploadError('Teks skripsi belum berhasil terbaca atau kosong. Harap unggah file skripsi Anda.');
      return;
    }

    const finalNama = metadata.nama?.trim() || 'Mahasiswa Peneliti';
    const finalNim = metadata.nim?.trim() || '20210001';
    const finalProdi = metadata.prodi?.trim() || 'Pendidikan Agama Islam';
    const finalInstansi = metadata.instansi?.trim() || 'IAIN Madura';
    
    // Only pass finalJudul if it is a valid, real thesis title (NOT a filename or draft string)
    const finalJudul = (metadata.judul && isValidThesisTitle(metadata.judul))
      ? metadata.judul.trim()
      : '';

    // Format email mahasiswa: nama + 4 digit acak + @gmail.com
    const formattedEmail = generateStudentEmail(finalNama, metadata.email);
    const finalBulanTahun = metadata.bulanTahun?.trim() || defaultBulanTahun();

    onSubmit({
      rawText,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      originalFile: selectedFile || undefined,
      metadata: {
        ...metadata,
        nama: finalNama,
        nim: finalNim,
        prodi: finalProdi,
        instansi: finalInstansi,
        judul: finalJudul,
        bulanTahun: finalBulanTahun,
        email: formattedEmail,
      },
      targetLengthPages,
      footnoteStyle,
      selectedModel,
      methodologyType: methodologyPreference,
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Hero Welcome Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/20 text-blue-300 text-xs px-3 py-1 rounded-full font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Sistem Konversi Skripsi ke Artikel Jurnal Terakreditasi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Ubah Skripsi Menjadi Artikel Ilmiah (Standar Wajib Tepat 18 Halaman)
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sistem akan mengekstrak dan menyusun naskah skripsi Anda secara komprehensif menjadi artikel ilmiah dengan format presisi **TEPAT 18 Halaman** (Judul, Nama, Prodi, Email, Abstrak Dwibahasa, Pendahuluan 4 Hlm, Metode 2 Hlm, Hasil 5 Hlm, Pembahasan 4 Hlm, Kesimpulan 1 Hlm, Daftar Pustaka 1 Hlm, dan Footnotes Kiri Bawah) berformat Microsoft Word (.docx) dengan font **Times New Roman 12** & **Spasi 1.5**.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleLoadSample}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center space-x-2 border border-blue-400/30 transform hover:-translate-y-0.5"
            >
              <BookCheck className="w-4 h-4 text-blue-200" />
              <span>Gunakan Dokumen Contoh (~20 Hal)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Upload / Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        
        {/* Step 1: Source File / Text Selection */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-100">1</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Unggah File Skripsi atau Tempel Teks</h3>
                <p className="text-xs text-slate-500">Pilih dokumen skripsi berformat PDF, Word (.docx), atau teks</p>
              </div>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs font-medium self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveInputMode('upload')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
                  activeInputMode === 'upload' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unggah File (PDF/DOCX)
              </button>
              <button
                type="button"
                onClick={() => setActiveInputMode('text')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
                  activeInputMode === 'text' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tempel Teks Skripsi
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/80 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {activeInputMode === 'upload' ? (
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 sm:p-10 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer relative group">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800">
                    Klik atau seret file Skripsi ke sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Mendukung file PDF, Microsoft Word (.docx), atau Plain Text (.txt) hingga 130+ halaman skripsi
                  </p>
                </div>

                {uploadingFile && (
                  <div className="w-full max-w-md mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col space-y-2">
                    <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
                      <span className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                        <span>
                          {uploadStageMessage
                            ? uploadStageMessage
                            : pdfProgress
                            ? `Mengekstrak PDF: Halaman ${pdfProgress.currentPage} dari ${pdfProgress.totalPages}`
                            : 'Membaca dan memproses struktur skripsi...'}
                        </span>
                      </span>
                      <span>{pdfProgress ? `${pdfProgress.percent}%` : 'Memproses...'}</span>
                    </div>

                    {pdfProgress && (
                      <div className="w-full bg-blue-200/70 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-150"
                          style={{ width: `${pdfProgress.percent}%` }}
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-blue-700/80 text-left">
                      💡 Tip: Skripsi tebal (&gt;50 halaman) otomatis diproses di server agar ponsel tidak terbebani.
                    </p>
                  </div>
                )}

                {selectedFile && !uploadingFile && (
                  <div className="mt-2 inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>File Terunggah: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  const val = e.target.value;
                  setRawText(val);
                  if (val.length > 80) {
                    const detected = detectResearchMethodology(val);
                    setDetectedMethod(detected);
                  }
                }}
                placeholder="Tempelkan draf isi skripsi Anda di sini (Bab I sampai Bab V, Tinjauan Pustaka, Hasil, Pembahasan, Kesimpulan)..."
                rows={10}
                className="w-full text-xs font-mono p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 bg-slate-50/50 transition-all"
              />
              <p className="text-xs text-slate-500 mt-1 text-right font-medium">
                Jumlah Karakter: {rawText.length.toLocaleString('id-ID')}
              </p>
            </div>
          )}
        </div>

        {/* Step: Research Methodology Alignment (Matches Uploaded Skripsi 100%) */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-blue-50/40 via-white to-white border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-100">
                <Microscope className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Penyelarasan Metodologi Penelitian Skripsi</span>
                  <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                    Wajib Selaras 100%
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Memastikan metode artikel persis sama dengan file skripsi: kualitatif tetap kualitatif, kuantitatif tetap kuantitatif, atau studi pustaka
                </p>
              </div>
            </div>

            {/* Live Methodology Detection Badge */}
            {detectedMethod && (
              <div className="inline-flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border border-indigo-200 shadow-sm text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 font-medium">Terdeteksi di Dokumen:</span>
                <span className="font-extrabold text-indigo-700">{detectedMethod.badgeLabel}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Kesesuaian Metodologi Artikel Jurnal</span>
                </label>
                <select
                  value={methodologyPreference}
                  onChange={(e: any) => setMethodologyPreference(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 font-bold shadow-sm transition-all"
                >
                  <option value="auto">
                    Otomatis Sesuai File Skripsi {detectedMethod ? `(${detectedMethod.badgeLabel})` : '(Rekomendasi Utama)'}
                  </option>
                  <option value="kualitatif">Kualitatif (Studi Kasus, Wawancara Mendalam, Triangulasi, Miles & Huberman)</option>
                  <option value="kuantitatif">Kuantitatif (Survei, Kuesioner, Populasi/Sampel, Regresi/SEM, Uji Hipotesis)</option>
                  <option value="pustaka">Studi Pustaka / Yuridis Normatif (Library Research, Bahan Hukum, Dokumen)</option>
                  <option value="rnd">Penelitian & Pengembangan (R&D / Model ADDIE / Validasi Ahli)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Secara default sistem mengekstrak Bab III skripsi dan menyesuaikan instrumen serta analisis secara otomatis.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-indigo-100 flex items-start space-x-3 text-xs text-slate-700 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">
                    Jaminan Kesesuaian Metodologi Skripsi:
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {methodologyPreference === 'auto'
                      ? (detectedMethod?.explanation || 'Jika file skripsi kualitatif, artikel akan murni kualitatif (wawancara mendalam, observasi, triangulasi data, dan analisis Miles & Huberman tanpa statistik). Jika kuantitatif atau studi pustaka, naskah artikel akan disamakan secara presisi.')
                      : methodologyPreference === 'kualitatif'
                      ? 'Naskah artikel B. Metode Penelitian akan 100% kualitatif (pendekatan, informan kunci, wawancara mendalam, observasi partisipatif, triangulasi sumber/teknik, analisis Miles & Huberman) dan bebas dari uji statistik atau kuesioner angka.'
                      : methodologyPreference === 'pustaka'
                      ? 'Naskah artikel B. Metode Penelitian akan 100% studi pustaka / yuridis normatif (pendekatan perundang-undangan/konseptual, bahan hukum primer/sekunder, studi dokumen, analisis isi kualitatif) tanpa responden kuesioner.'
                      : methodologyPreference === 'rnd'
                      ? 'Naskah artikel B. Metode Penelitian akan 100% R&D (model pengembangan ADDIE/4D, validasi ahli materi/media, uji coba kepraktisan produk).'
                      : 'Naskah artikel B. Metode Penelitian akan 100% kuantitatif (desain asosiatif, populasi & sampel, kuesioner skala Likert, uji validitas & reliabilitas, regresi/SEM, uji hipotesis).'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Author Metadata */}
        <div className="p-6 sm:p-8 bg-slate-50/40">
          <div className="flex items-center space-x-3 mb-6">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-100">2</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Metadata & Informasi Penulis Jurnal</h3>
              <p className="text-xs text-slate-500">Akan dicantumkan pada bagian paling atas artikel ilmiah sesuai standar jurnal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Judul Artikel (Sama Persis dengan Skripsi) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Judul Skripsi Asli (Disamakan Persis ke Judul Artikel Jurnal)</span>
                </div>
                {metadata.judul && isValidThesisTitle(metadata.judul) ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Terdeteksi dari Naskah</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Judul Dibaca Otomatis dari Naskah</span>
                  </span>
                )}
              </label>
              <input
                type="text"
                value={metadata.judul}
                onChange={(e) => setMetadata({ ...metadata, judul: e.target.value })}
                placeholder="Dibaca otomatis dari halaman judul skripsi (atau ketik/edit langsung judul skripsi asli di sini)..."
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                💡 Judul artikel jurnal wajib disamakan persis dengan judul skripsi asli tanpa parafrase. Jika dikosongkan, sistem akan membaca judul asli dari halaman depan skripsi.
              </p>
            </div>

            {/* Nama Penulis */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nama Lengkap Penulis</span>
                </div>
                {isAutoExtractedName && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-200/80">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Otomatis dari File</span>
                  </span>
                )}
              </label>
              <input
                type="text"
                value={metadata.nama}
                onChange={(e) => {
                  setMetadata({ ...metadata, nama: e.target.value });
                  setIsAutoExtractedName(false);
                }}
                placeholder="Terisi otomatis dari file skripsi... (Contoh: Ahmad Fauzi Siregar)"
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm"
                required
              />
            </div>

            {/* NIM Mahasiswa (Sinkron Cover CD Word) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600" />
                  <span>NIM Mahasiswa (Sinkron Cover CD)</span>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                  Wajib Cover CD
                </span>
              </label>
              <input
                type="text"
                value={metadata.nim || ''}
                onChange={(e) => setMetadata({ ...metadata, nim: e.target.value })}
                placeholder="Contoh: 210810201045"
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm font-mono"
                required
              />
            </div>

            {/* Program Studi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Program Studi (Prodi)</span>
              </label>
              <input
                type="text"
                value={metadata.prodi}
                onChange={(e) => setMetadata({ ...metadata, prodi: e.target.value })}
                placeholder="Contoh: Program Studi Manajemen Bisnis Digital"
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm"
                required
              />
            </div>

            {/* Bulan dan Tahun Cover CD */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bulan & Tahun Cover CD</span>
                </div>
                <span className="text-[10px] text-slate-500">Contoh: OKTOBER 2026</span>
              </label>
              <input
                type="text"
                value={metadata.bulanTahun || ''}
                onChange={(e) => setMetadata({ ...metadata, bulanTahun: e.target.value.toLocaleUpperCase('id-ID') })}
                placeholder="OKTOBER 2026"
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm font-mono uppercase"
                required
              />
            </div>

            {/* Email Mahasiswa (Format: namamahasiswa1234@gmail.com) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email Mahasiswa (Otomatis nama + 4 digit acak)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const generated = generateStudentEmail(metadata.nama);
                    setMetadata({ ...metadata, email: generated });
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Acak 4 Digit Baru
                </button>
              </label>
              <input
                type="email"
                value={metadata.email}
                onChange={(e) => setMetadata({ ...metadata, email: e.target.value })}
                placeholder="Contoh: imamhanafi9282@gmail.com (Terisi otomatis dari nama penulis)"
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm font-mono text-xs sm:text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Format resmi: nama mahasiswa tanpa spasi + 4 nomor acak + @gmail.com
              </p>
            </div>

            {/* Instansi / Perguruan Tinggi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Nama Instansi / Universitas</span>
              </label>
              <input
                type="text"
                value={metadata.instansi}
                onChange={(e) => setMetadata({ ...metadata, instansi: e.target.value })}
                placeholder="Contoh: Universitas Negeri Indonesia"
                className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white transition-all shadow-sm"
              />
            </div>

          </div>
        </div>

        {/* Step 3: Journal Formatting Preferences */}
        <div className="p-6 sm:p-8 bg-white">
          <div className="flex items-center space-x-3 mb-6">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-100">3</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Format Penulisan & Catatan Kaki (Footnote)</h3>
              <p className="text-xs text-slate-500">Standar otomatis Times New Roman 12pt, Spasi 1.5, dan Footnote di bawah halaman</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/60 p-5 rounded-2xl border border-slate-200/60">
            
            {/* Footnote Option */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Gaya Catatan Kaki (Footnote)
              </label>
              <select
                value={footnoteStyle}
                onChange={(e: any) => setFootnoteStyle(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 font-medium transition-all shadow-sm"
              >
                <option value="custom_footnote">Footnote Spesifik di Bawah Halaman (Rekomendasi Jurnal)</option>
                <option value="chicago">Chicago/Turabian Footnotes (Gaya Humaniora & Sosial)</option>
                <option value="apa">In-text Parenthetical Citation (Gaya APA 7th)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Catatan kaki akan ditempatkan secara otomatis di bagian bawah halaman pada hasil ekspor file Word (.docx).
              </p>
            </div>

            {/* Target Length */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Target Panjang Naskah Artikel
              </label>
              <select
                value={targetLengthPages}
                onChange={(e) => setTargetLengthPages(Number(e.target.value))}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 font-medium transition-all shadow-sm"
              >
                <option value={18}>Standar Wajib: Tepat 18 Halaman (Word TNR 12, Spasi 1.5)</option>
                <option value={15}>Artikel 15 Halaman</option>
                <option value={20}>Artikel 20 Halaman</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Sistem dikalibrasi secara otomatis untuk menghasilkan naskah artikel berbobot ilmiah yang pas memenuhi **tepat 18 halaman** (Word Times New Roman 12pt, Spasi 1.5, Margin 3cm).
              </p>
            </div>

          </div>

          {/* Multi-stage Progress Bar Indicator (Active during generation) */}
          {isLoading && (
            <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-white shadow-lg border border-slate-800 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="font-bold text-sm tracking-wide">
                    Proses Sintesis Artikel Bertahap (Tahap {generationStatus?.stage || 1}/3)
                  </span>
                </div>
                <span className="font-extrabold text-sm text-blue-300 font-mono">
                  {generationStatus?.percent || 25}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${generationStatus?.percent || 25}%` }}
                />
              </div>

              {/* Status Message */}
              <p className="text-xs text-blue-100 font-medium mb-4 flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                <span>{generationStatus?.message || 'Sedang mengekstrak dan menyusun bagian artikel ilmiah...'}</span>
              </p>

              {/* Stages Checklist Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium pt-3 border-t border-slate-800">
                <div
                  className={`px-3 py-2 rounded-xl flex items-center space-x-2 border transition-all ${
                    (generationStatus?.stage || 1) >= 1
                      ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                      : 'bg-slate-800/50 text-slate-500 border-slate-800'
                  }`}
                >
                  <span className="font-bold">1.</span>
                  <span>Pendahuluan & Metode</span>
                </div>

                <div
                  className={`px-3 py-2 rounded-xl flex items-center space-x-2 border transition-all ${
                    (generationStatus?.stage || 1) >= 2
                      ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                      : 'bg-slate-800/50 text-slate-500 border-slate-800'
                  }`}
                >
                  <span className="font-bold">2.</span>
                  <span>Hasil & Pembahasan</span>
                </div>

                <div
                  className={`px-3 py-2 rounded-xl flex items-center space-x-2 border transition-all ${
                    (generationStatus?.stage || 1) >= 3
                      ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                      : 'bg-slate-800/50 text-slate-500 border-slate-800'
                  }`}
                >
                  <span className="font-bold">3.</span>
                  <span>Kesimpulan & Footnote</span>
                </div>
              </div>
            </div>
          )}

          {/* ZAINNET_LINK7_AUTO_ZIP_V2: visible beside the AI job; no fake percentages. */}
          {isLoading && thesisPdfStatus && (
            <div role="status" aria-live="polite" className="mt-3 rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-4 text-cyan-950 shadow-sm" data-testid="link7-thesis-pdf-status">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span aria-hidden="true" className={thesisPdfStatus.status === 'running' ? 'animate-pulse' : ''}>📄</span>
                Konversi PDF Skripsi — Proses Paralel
              </div>
              <p className="text-xs mt-2 leading-relaxed">{thesisPdfStatus.message}</p>
              <p className="text-[11px] mt-1 text-cyan-800">
                {thesisPdfStatus.status === 'running' ? 'Sedang diproses selagi artikel disusun…' :
                 thesisPdfStatus.status === 'ready' ? 'Selesai ✓ PDF akan dimasukkan ke ZIP otomatis.' :
                 thesisPdfStatus.status === 'error' ? 'Akan dicoba kembali saat ZIP dibuat.' :
                 'Menunggu file Word skripsi.'}
              </p>
            </div>
          )}

          {/* Submit Action */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || uploadingFile}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all duration-200 flex items-center justify-center space-x-2.5 ${
                isLoading || uploadingFile
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/25 hover:shadow-blue-800/30 transform hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin text-blue-200" />
                  <span>Proses Sintesis Naskah Sedang Berjalan (Tahap {generationStatus?.stage || 1}/3)...</span>
                </>
              ) : (
                <>
                  <span>Sintesis Artikel Ilmiah</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </div>

      </form>
    </div>
  );
};
