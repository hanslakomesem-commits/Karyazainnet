import type { EYDAuditResult, EYDIssue } from '../types';

/**
 * Standard KBBI & EYD V Indonesian Academic Dictionary:
 * Maps common informal / obsolete / misspelling to valid academic Indonesian.
 */
export const KBBI_DICTIONARY: Record<string, { baku: string; reason: string }> = {
  // Common academic words
  merubah: { baku: 'mengubah', reason: 'Berasal dari kata dasar "ubah" + meN- -> mengubah' },
  praktek: { baku: 'praktik', reason: 'Sesuai KBBI dan serapan baku bahasa Indonesia' },
  analisa: { baku: 'analisis', reason: 'Serapan baku berakhiran -is (analysis -> analisis)' },
  respon: { baku: 'respons', reason: 'Baku KBBI mempertahankan konsonan ganda akhir -ns' },
  aktifitas: { baku: 'aktivitas', reason: 'Baku berakhiran -itas dari sifat aktif' },
  efektifitas: { baku: 'efektivitas', reason: 'Baku berakhiran -itas dari sifat efektif' },
  kreatifitas: { baku: 'kreativitas', reason: 'Baku berakhiran -itas dari sifat kreatif' },
  produktifitas: { baku: 'produktivitas', reason: 'Baku berakhiran -itas dari sifat produktif' },
  kualitas: { baku: 'kualitas', reason: 'Baku KBBI (bukan kwalitas)' },
  kwalitas: { baku: 'kualitas', reason: 'Baku menggunakan huruf k (kualitas)' },
  kuantitas: { baku: 'kuantitas', reason: 'Baku KBBI (bukan kwantitas)' },
  kwantitas: { baku: 'kuantitas', reason: 'Baku menggunakan k (kuantitas)' },
  resiko: { baku: 'risiko', reason: 'Baku KBBI berasal dari bahasa serapan risiko' },
  antrian: { baku: 'antrean', reason: 'Baku KBBI dengan vokal e (antre -> antrean)' },
  atlit: { baku: 'atlet', reason: 'Baku KBBI dengan vokal e' },
  cidera: { baku: 'cedera', reason: 'Baku KBBI dengan vokal e' },
  debet: { baku: 'debit', reason: 'Baku KBBI untuk bidang akuntansi & perbankan' },
  faham: { baku: 'paham', reason: 'Baku KBBI dengan konsonan p' },
  hakekat: { baku: 'hakikat', reason: 'Baku KBBI dengan vokal i' },
  himbau: { baku: 'imbau', reason: 'Baku KBBI tanpa huruf awal h' },
  menghimbau: { baku: 'mengimbau', reason: 'Baku KBBI: mengimbau' },
  himbauan: { baku: 'imbauan', reason: 'Baku KBBI: imbauan' },
  ijazah: { baku: 'ijazah', reason: 'Baku KBBI dengan huruf z' },
  ijasah: { baku: 'ijazah', reason: 'Baku KBBI menggunakan z' },
  ijin: { baku: 'izin', reason: 'Baku KBBI dengan huruf z' },
  jadual: { baku: 'jadwal', reason: 'Baku KBBI: jadwal' },
  karir: { baku: 'karier', reason: 'Baku KBBI: karier' },
  komplit: { baku: 'komplet', reason: 'Baku KBBI dengan huruf e' },
  konkrit: { baku: 'konkret', reason: 'Baku KBBI dengan huruf e' },
  kordinasi: { baku: 'koordinasi', reason: 'Baku KBBI mempertahankan huruf vokal ganda oo' },
  kordinir: { baku: 'koordinasi', reason: 'Gunakan bentuk koordinasi / mengoordinasikan' },
  kuitansi: { baku: 'kuitansi', reason: 'Baku KBBI: kuitansi' },
  kwitansi: { baku: 'kuitansi', reason: 'Baku menggunakan ku- (kuitansi)' },
  metoda: { baku: 'metode', reason: 'Baku KBBI berakhiran -e (metode)' },
  obyek: { baku: 'objek', reason: 'Baku KBBI menggunakan huruf j (objek)' },
  obyektif: { baku: 'objektif', reason: 'Baku KBBI menggunakan huruf j (objektif)' },
  subyek: { baku: 'subjek', reason: 'Baku KBBI menggunakan huruf j (subjek)' },
  subyektif: { baku: 'subjektif', reason: 'Baku KBBI menggunakan huruf j (subjektif)' },
  prosentase: { baku: 'persentase', reason: 'Baku KBBI dengan per- (persentase)' },
  presentase: { baku: 'persentase', reason: 'Baku KBBI: persentase' },
  sistim: { baku: 'sistem', reason: 'Baku KBBI dengan huruf e (sistem)' },
  standarisasi: { baku: 'standardisasi', reason: 'Baku KBBI: standardisasi (dari standard)' },
  tehnik: { baku: 'teknik', reason: 'Baku KBBI menggunakan k tanpa h' },
  tehnologi: { baku: 'teknologi', reason: 'Baku KBBI tanpa h (teknologi)' },
  teori: { baku: 'teori', reason: 'Baku KBBI' },
  terimakasih: { baku: 'terima kasih', reason: 'Penulisan baku dipisah dua kata' },
  narasumber: { baku: 'narasumber', reason: 'Baku disambung satu kata' },
  kasubag: { baku: 'Kepala Subbagian', reason: 'Hindari singkatan informal dalam naskah formal' },
  sekedar: { baku: 'sekadar', reason: 'Baku KBBI berasal dari kata dasar kadar (sekadar)' },
  silahkan: { baku: 'silakan', reason: 'Baku KBBI tanpa huruf h (silakan)' },
  mensosialisasikan: { baku: 'menyosialisasikan', reason: 'Huruf s luluh menjadi meny- pada imbuhan meN-' },
  menterjemahkan: { baku: 'menerjemahkan', reason: 'Huruf t luluh menjadi men- pada imbuhan meN-' },
  mensukseskan: { baku: 'menyukseskan', reason: 'Huruf s luluh menjadi meny- pada imbuhan meN-' },
  mentaati: { baku: 'menaati', reason: 'Huruf t luluh menjadi men- pada imbuhan meN-' },
  merapikan: { baku: 'merapikan', reason: 'Baku KBBI (bukan merapihkan)' },
  merapihkan: { baku: 'merapikan', reason: 'Baku KBBI: merapikan' },
  kolektifitas: { baku: 'kolektivitas', reason: 'Baku menggunakan v (kolektivitas)' },
  kompleksitas: { baku: 'kompleksitas', reason: 'Baku KBBI: kompleksitas' },
  legalitas: { baku: 'legalitas', reason: 'Baku KBBI: legalitas' },
  akomodir: { baku: 'mengakomodasi', reason: 'Serapan verba baku: mengakomodasi' },
  mengakomodir: { baku: 'mengakomodasi', reason: 'Baku KBBI: mengakomodasi' },
  meminimalisir: { baku: 'meminimalkan', reason: 'Serapan verba baku: meminimalkan / meminimalisasi' },
  memaksimalisir: { baku: 'memaksimalkan', reason: 'Serapan verba baku: memaksimalkan / memaksimalisasi' },
  optimalisasi: { baku: 'pengoptimalan', reason: 'Dapat digunakan pengoptimalan atau optimalisasi' },
  mengeliminir: { baku: 'mengeliminasi', reason: 'Baku KBBI: mengeliminasi' },
  legalisir: { baku: 'legalisasi', reason: 'Baku KBBI: legalisasi' },
  hirarki: { baku: 'hierarki', reason: 'Baku KBBI menggunakan ie (hierarki)' },
  otentik: { baku: 'autentik', reason: 'Baku KBBI menggunakan au (autentik)' },
  azas: { baku: 'asas', reason: 'Baku KBBI menggunakan s (asas)' },
  azasi: { baku: 'asasi', reason: 'Baku KBBI menggunakan s (asasi)' },
  jaman: { baku: 'zaman', reason: 'Baku KBBI menggunakan z (zaman)' },
  konsekwensi: { baku: 'konsekuensi', reason: 'Baku KBBI menggunakan u (konsekuensi)' },
  frekwensi: { baku: 'frekuensi', reason: 'Baku KBBI menggunakan u (frekuensi)' },
  relevansi: { baku: 'relevansi', reason: 'Baku KBBI' },
  relevan: { baku: 'relevan', reason: 'Baku KBBI' },
};

/**
 * Prepositions & Conjunctions spacing rules (EYD V)
 */
export const PREPOSITION_RULES = [
  { pattern: /\bdimana\b/gi, replacement: 'di mana', reason: 'Kata depan "di" penunjuk tempat wajib dipisah' },
  { pattern: /\bdisana\b/gi, replacement: 'di sana', reason: 'Kata depan "di" penunjuk tempat wajib dipisah' },
  { pattern: /\bdisini\b/gi, replacement: 'di sini', reason: 'Kata depan "di" penunjuk tempat wajib dipisah' },
  { pattern: /\bdiatas\b/gi, replacement: 'di atas', reason: 'Kata depan "di" penunjuk arah/posisi wajib dipisah' },
  { pattern: /\bdibawah\b/gi, replacement: 'di bawah', reason: 'Kata depan "di" penunjuk arah/posisi wajib dipisah' },
  { pattern: /\bdisamping\s+itu\b/gi, replacement: 'di samping itu', reason: 'Frasa penghubung "di samping itu" ditulis terpisah' },
  { pattern: /\bdiantara\b/gi, replacement: 'di antara', reason: 'Kata depan "di" penunjuk hubungan ditulis terpisah' },
  { pattern: /\bdidalam\b/gi, replacement: 'di dalam', reason: 'Kata depan "di" penunjuk posisi ruang ditulis terpisah' },
  { pattern: /\bkeluar\s+negeri\b/gi, replacement: 'ke luar negeri', reason: 'Kata depan "ke" penunjuk arah ditulis terpisah' },
  { pattern: /\bpasca\s+([a-z]+)\b/gi, replacement: 'pasca$1', reason: 'Bentuk terikat "pasca-" ditulis serangkai dengan kata dasar' },
  { pattern: /\bantar\s+([a-z]+)\b/gi, replacement: 'antar$1', reason: 'Bentuk terikat "antar-" ditulis serangkai dengan kata dasar' },
  { pattern: /\bmulti\s+([a-z]+)\b/gi, replacement: 'multi$1', reason: 'Bentuk terikat "multi-" ditulis serangkai dengan kata dasar' },
  { pattern: /\bnon\s+([a-z]+)\b/gi, replacement: 'non$1', reason: 'Bentuk terikat "non-" ditulis serangkai dengan kata dasar' },
];

/**
 * Audits text according to EYD V and KBBI standards
 */
export function auditEYDAndKBBI(text: string): EYDAuditResult {
  if (!text) {
    return { totalIssues: 0, score: 100, issues: [], correctedText: '' };
  }

  const issues: EYDIssue[] = [];
  let correctedText = text;
  let issueCount = 0;

  // 1. Spacing & Punctuation from PDF Extraction artifacts
  // Missing space after comma (e.g. "kata,kata" -> "kata, kata")
  const missingSpaceCommaRegex = /([a-zA-Z0-9\)])\,([a-zA-Z0-9\(])/g;
  let commaMatch: RegExpExecArray | null;
  while ((commaMatch = missingSpaceCommaRegex.exec(text)) !== null) {
    // Avoid decimal numbers like 3,14
    if (!(/^\d+$/.test(commaMatch[1]) && /^\d+$/.test(commaMatch[2]))) {
      issues.push({
        id: `spacing-comma-${++issueCount}`,
        originalWord: `${commaMatch[1]},${commaMatch[2]}`,
        suggestedWord: `${commaMatch[1]}, ${commaMatch[2]}`,
        category: 'spacing_pdf',
        explanation: 'Spasi hilang setelah tanda koma (artefak pindaian PDF).',
        position: commaMatch.index,
      });
    }
  }

  // Spacing before dot or comma (e.g. "kata ." -> "kata.")
  const spaceBeforePunctRegex = /\s+([.,;:!?])/g;
  let punctMatch: RegExpExecArray | null;
  while ((punctMatch = spaceBeforePunctRegex.exec(text)) !== null) {
    issues.push({
      id: `punct-${++issueCount}`,
      originalWord: ` [spasi]${punctMatch[1]}`,
      suggestedWord: punctMatch[1],
      category: 'punctuation',
      explanation: 'Tanda baca tidak boleh diawali spasi.',
      position: punctMatch.index,
    });
  }

  // 2. KBBI Dictionary Check
  const words = text.match(/\b[a-zA-ZÀ-ÿ\-]+\b/g) || [];
  const checkedWords = new Set<string>();

  for (const word of words) {
    const lower = word.toLowerCase();
    if (checkedWords.has(lower)) continue;
    checkedWords.add(lower);

    if (KBBI_DICTIONARY[lower]) {
      const entry = KBBI_DICTIONARY[lower];
      // Preserve original casing
      let corrected = entry.baku;
      if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
        corrected = entry.baku.charAt(0).toUpperCase() + entry.baku.slice(1);
      } else if (word === word.toUpperCase()) {
        corrected = entry.baku.toUpperCase();
      }

      issues.push({
        id: `kbbi-${++issueCount}`,
        originalWord: word,
        suggestedWord: corrected,
        category: 'non_baku',
        explanation: `${entry.reason} (KBBI / EYD V)`,
      });
    }
  }

  // 3. Preposition / EYD V Rules
  for (const rule of PREPOSITION_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        id: `rule-${++issueCount}`,
        originalWord: match[0],
        suggestedWord: match[0].replace(regex, rule.replacement),
        category: 'affix',
        explanation: rule.reason,
        position: match.index,
      });
    }
  }

  // Perform complete auto-correction
  correctedText = fixAllEYDIssues(text);

  // Compute EYD Compliance score (0-100)
  const totalWords = words.length || 1;
  const errorRate = (issues.length / totalWords) * 100;
  const score = Math.max(50, Math.min(100, Math.round(100 - errorRate * 4)));

  return {
    totalIssues: issues.length,
    score,
    issues,
    correctedText,
  };
}

/**
 * Automatically applies all EYD V & KBBI fixes to a text
 */
export function fixAllEYDIssues(text: string): string {
  if (!text) return text;

  let fixed = text;

  // 1. Fix line break hyphenation from PDF scans e.g. "pem- bahasan" -> "pembahasan"
  fixed = fixed.replace(/([a-zA-Z]{2,})-\s+([a-zA-Z]{2,})/g, '$1$2');

  // 2. Fix spaces before punctuation e.g. "teks ." -> "teks."
  fixed = fixed.replace(/\s+([.,;:!?])/g, '$1');

  // 3. Fix missing space after comma e.g. "kata,kata" -> "kata, kata" (ignoring digits like 3,14)
  fixed = fixed.replace(/([a-zA-Z\)])\,([a-zA-Z\(])/g, '$1, $2');

  // 4. Fix double spaces
  fixed = fixed.replace(/[ \t]{2,}/g, ' ');

  // 5. Apply KBBI dictionary replacements
  for (const [nonBaku, { baku }] of Object.entries(KBBI_DICTIONARY)) {
    const regexLower = new RegExp(`\\b${nonBaku}\\b`, 'g');
    fixed = fixed.replace(regexLower, baku);

    const titleNonBaku = nonBaku.charAt(0).toUpperCase() + nonBaku.slice(1);
    const titleBaku = baku.charAt(0).toUpperCase() + baku.slice(1);
    const regexTitle = new RegExp(`\\b${titleNonBaku}\\b`, 'g');
    fixed = fixed.replace(regexTitle, titleBaku);

    const upperNonBaku = nonBaku.toUpperCase();
    const upperBaku = baku.toUpperCase();
    const regexUpper = new RegExp(`\\b${upperNonBaku}\\b`, 'g');
    fixed = fixed.replace(regexUpper, upperBaku);
  }

  // 6. Apply Preposition and Affix rules
  for (const rule of PREPOSITION_RULES) {
    fixed = fixed.replace(rule.pattern, rule.replacement);
  }

  return fixed.trim();
}
