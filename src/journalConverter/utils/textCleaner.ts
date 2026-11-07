/**
 * Text Cleaner Utilities for Academic Articles
 * Removes repetitive section headers and unwanted English parentheses clarifications
 */

// Helper: Remove English explanatory phrases in parentheses or asterisks added after Indonesian words (e.g. *good corporate governance*, (*good corporate governance*), (research gap), etc.)
export function cleanEnglishParentheses(text: string): string {
  if (!text) return '';
  let cleaned = text;

  const commonExplanations = [
    'good corporate governance',
    'corporate governance',
    'corporate social responsibility',
    'return on assets',
    'return on equity',
    'earning per share',
    'earnings per share',
    'capital adequacy ratio',
    'net interest margin',
    'non performing loan',
    'non performing financing',
    'price to book value',
    'price earning ratio',
    'current ratio',
    'quick ratio',
    'debt to equity ratio',
    'debt to asset ratio',
    'total asset turnover',
    'firm value',
    'firm size',
    'financial performance',
    'financial distress',
    'tax avoidance',
    'tax aggressiveness',
    'capital structure',
    'audit quality',
    'audit tenure',
    'earnings management',
    'intellectual capital',
    'human capital',
    'structural capital',
    'customer capital',
    'relational capital',
    'job satisfaction',
    'organizational commitment',
    'work engagement',
    'employee performance',
    'turnover intention',
    'organizational citizenship behavior',
    'brand awareness',
    'brand image',
    'brand loyalty',
    'customer satisfaction',
    'purchase decision',
    'repurchase intention',
    'service quality',
    'word of mouth',
    'digital marketing',
    'social media marketing',
    'supply chain management',
    'total quality management',
    'competitive advantage',
    'resource-based view',
    'resource based view',
    'agency theory',
    'stewardship theory',
    'signaling theory',
    'stakeholder theory',
    'legitimacy theory',
    'technology acceptance model',
    'theory of planned behavior',
    'theory of reasoned action',
    'research gap',
    'research gaps',
    'novelty',
    'state of the art',
    'sampling technique',
    'sampling techniques',
    'sampling method',
    'purposive sampling',
    'simple random sampling',
    'stratified random sampling',
    'convenience sampling',
    'snowball sampling',
    'cluster sampling',
    'conceptual framework',
    'research framework',
    'theoretical framework',
    'research limitations',
    'research limitation',
    'limitations',
    'future research',
    'reliability test',
    'validity test',
    'grand theory',
    'middle-range theory',
    'middle range theory',
    'applied theory',
    'data analysis',
    'background',
    'discussion',
    'conclusion',
    'hypothesis',
    'hypotheses',
    'findings',
    'literature review',
    'variable',
    'variables',
    'indicators',
    'sample size',
    'population',
    'goodness of fit',
    'path analysis',
    'outer model',
    'inner model',
    'convergent validity',
    'discriminant validity',
    'composite reliability',
    'average variance extracted',
    'previous research',
    'prior studies',
    'empirical study',
    'case study',
    'adjusted r square',
    'r square',
    'f count',
    't count',
    'p-value',
    'significance value',
    'coefficient of determination',
    'practical implications',
    'managerial implications',
    'theoretical implications',
  ];

  for (const term of commonExplanations) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Matches: (term), (*term*), *(term)*, *term* (when immediately following Indonesian term or inside parentheses)
    const regexParensWithAsterisks = new RegExp(`\\s*\\(\\s*\\*?\\s*${escaped}\\s*\\*?\\s*\\)`, 'gi');
    cleaned = cleaned.replace(regexParensWithAsterisks, '');

    const regexLeadingAsterisks = new RegExp(`\\s*\\*+\\s*${escaped}\\s*\\*+`, 'gi');
    cleaned = cleaned.replace(regexLeadingAsterisks, '');
  }

  // Remove any leftover pattern like (*english words*) or (english words) with asterisk
  cleaned = cleaned.replace(/\s*\(\s*\*+[a-zA-Z\s\-]{3,60}\*+\s*\)/g, '');

  return cleaned;
}

// Helper: Strip leading duplicate section headers (e.g., "C. HASIL PENELITIAN", "D. PEMBAHASAN", "C. Hasil Penelitian", etc.)
export function cleanSectionContent(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Heading patterns at the start of section content
  const headingPatterns = [
    /^\s*(?:#+\s*)?(?:\*{1,3})?\s*(?:(?:BAGIAN|BAB|[A-E])[\.\:]\s*)?(?:HASIL(?:\s+DAN)?\s+PEMBAHASAN|HASIL\s+PENELITIAN|HASIL|PEMBAHASAN|METODE(?:\s+PENELITIAN)?|PENDAHULUAN|KESIMPULAN(?:\s+DAN\s+SARAN)?|RINGKASAN|ABSTRAK|ABSTRACT)\s*(?:\*{1,3})?\s*[:\.\-–—]?\s*(?:\r?\n+|$)/i,
    /^\s*(?:#+\s*)?(?:\*{1,3})?\s*[A-E]\.\s+[A-Za-z\s]{3,40}(?:\*{1,3})?\s*[:\.\-–—]?\s*(?:\r?\n+|$)/i,
    /^\s*(?:C\.?\s*(?:Hasil\s+Penelitian|Hasil\s+dan\s+Pembahasan|Hasil)|D\.?\s*(?:Hasil\s+Pembahasan|Pembahasan|Pembahasan\s+Hasil\s+Penelitian)|A\.?\s*Pendahuluan|B\.?\s*Metode\s*Penelitian|E\.?\s*(?:Kesimpulan\s*dan\s*Saran|Kesimpulan))\s*[:\.\-–—]?\s*(?:\r?\n+|$)/i,
  ];

  let matched = true;
  let iterations = 0;
  while (matched && iterations < 5) {
    matched = false;
    iterations++;
    for (const pattern of headingPatterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        matched = true;
      }
    }
  }

  // Remove any remaining prefix matching "C. Hasil penelitian:" or similar inline at the very beginning
  cleaned = cleaned.replace(/^(?:[A-E]\.\s*(?:Hasil\s+Penelitian|Pembahasan|Metode\s+Penelitian|Pendahuluan|Kesimpulan(?:\s+dan\s+Saran)?)\s*[:\.\-–—]\s*)/i, '').trim();

  return cleanEnglishParentheses(cleaned);
}

export interface MethodologyDetectionResult {
  methodType: 'kualitatif' | 'kuantitatif' | 'pustaka' | 'rnd' | 'campuran';
  displayName: string;
  badgeLabel: string;
  explanation: string;
  keyIndicators: string[];
}

/**
 * Extracts Bab III (Metode Penelitian) specifically from full skripsi text
 */
export function extractBab3FromThesis(rawText: string): string {
  if (!rawText) return '';

  // Find Bab 3 start
  const bab3Regex = /(?:\n|^)\s*(?:BAB\s+(?:III|3)\b[^\n]*|(?:METODE|METODOLOGI)\s+PENELITIAN\s*(?:\r?\n|$)|METODE\s+PENELITIAN\s+HUKUM)/i;
  const bab4Regex = /(?:\n|^)\s*(?:BAB\s+(?:IV|4)\b[^\n]*|(?:HASIL\s+DAN\s+PEMBAHASAN|HASIL\s+PENELITIAN)\s*(?:\r?\n|$))/i;

  const bab3Match = rawText.match(bab3Regex);
  if (!bab3Match || bab3Match.index === undefined) {
    return '';
  }

  const bab3StartIndex = bab3Match.index;
  const subsequentText = rawText.slice(bab3StartIndex + 100);
  const bab4Match = subsequentText.match(bab4Regex);

  if (bab4Match && bab4Match.index !== undefined) {
    return rawText.slice(bab3StartIndex, bab3StartIndex + 100 + bab4Match.index).trim();
  }

  // Fallback: take up to 25,000 characters from Bab 3 start
  return rawText.slice(bab3StartIndex, bab3StartIndex + 25000).trim();
}

/**
 * Automatically inspects the uploaded thesis text (specifically Bab III if present)
 * to accurately identify if the research is:
 * - Kualitatif (Qualitative)
 * - Kuantitatif (Quantitative)
 * - Studi Pustaka / Yuridis Normatif (Library Research)
 * - Penelitian dan Pengembangan / R&D
 * - Campuran (Mixed Methods)
 */
export function detectResearchMethodology(
  fullText: string,
  bab3Text?: string,
  userPreference?: string
): MethodologyDetectionResult {
  if (userPreference && userPreference !== 'auto') {
    switch (userPreference) {
      case 'kualitatif':
        return {
          methodType: 'kualitatif',
          displayName: 'Kualitatif (Studi Kasus / Fenomenologi / Lapangan)',
          badgeLabel: 'Kualitatif',
          explanation: 'Metode diselaraskan ke penelitian kualitatif: wawancara mendalam, observasi partisipatif, triangulasi data, dan analisis Miles & Huberman tanpa uji statistik kuantitatif.',
          keyIndicators: ['Pilihan Manual: Kualitatif'],
        };
      case 'pustaka':
        return {
          methodType: 'pustaka',
          displayName: 'Studi Pustaka / Yuridis Normatif (Library Research)',
          badgeLabel: 'Studi Pustaka',
          explanation: 'Metode diselaraskan ke studi kepustakaan / yuridis normatif: bahan hukum primer/sekunder, telaah regulasi/naskah, dan analisis isi tanpa responden kuesioner.',
          keyIndicators: ['Pilihan Manual: Studi Pustaka / Yuridis Normatif'],
        };
      case 'rnd':
        return {
          methodType: 'rnd',
          displayName: 'Penelitian dan Pengembangan (R&D)',
          badgeLabel: 'Pengembangan (R&D)',
          explanation: 'Metode diselaraskan ke R&D: model pengembangan produk/media (ADDIE/4D), validasi instrumen ahli materi/media, dan uji kepraktisan produk.',
          keyIndicators: ['Pilihan Manual: R&D'],
        };
      case 'kuantitatif':
        return {
          methodType: 'kuantitatif',
          displayName: 'Kuantitatif (Survei / Regresi / Hipotesis)',
          badgeLabel: 'Kuantitatif',
          explanation: 'Metode diselaraskan ke penelitian kuantitatif: populasi & sampel, instrumen kuesioner, uji validitas & reliabilitas, regresi/SEM, dan pengujian hipotesis.',
          keyIndicators: ['Pilihan Manual: Kuantitatif'],
        };
      case 'campuran':
        return {
          methodType: 'campuran',
          displayName: 'Metode Campuran (Mixed Methods)',
          badgeLabel: 'Mixed Methods',
          explanation: 'Metode diselaraskan ke mixed methods: kombinasi pengumpulan data kuantitatif empiris dan pendalaman kualitatif lapangan.',
          keyIndicators: ['Pilihan Manual: Mixed Methods'],
        };
    }
  }

  const sampleBab3 = bab3Text || extractBab3FromThesis(fullText);
  const textToAnalyze = (sampleBab3 ? sampleBab3 + '\n\n' + sampleBab3 + '\n\n' : '') + fullText.slice(0, 35000);
  const lower = textToAnalyze.toLowerCase();

  // Pattern detection lists with associated scores
  const kualitatifPatterns = [
    { pattern: /penelitian\s+kualitatif|pendekatan\s+kualitatif|metode\s+kualitatif|deskriptif\s+kualitatif/g, weight: 12, label: 'Kualitatif' },
    { pattern: /studi\s+kasus|fenomenologi|etnografi|grounded\s+theory|naratif/g, weight: 8, label: 'Studi Kasus / Fenomenologi' },
    { pattern: /informan\s+penelitian|informan\s+kunci|key\s+informant|narasumber\s+penelitian|subjek\s+penelitian/g, weight: 7, label: 'Informan / Narasumber' },
    { pattern: /wawancara\s+mendalam|in-depth\s+interview|observasi\s+partisipatif|pedoman\s+wawancara/g, weight: 8, label: 'Wawancara Mendalam / Observasi' },
    { pattern: /keabsahan\s+data|triangulasi\s+sumber|triangulasi\s+teknik|triangulasi\s+waktu|member\s+check/g, weight: 8, label: 'Triangulasi Data' },
    { pattern: /reduksi\s+data|kondensasi\s+data|penyajian\s+data|miles\s+dan\s+huberman|miles\s*&\s*huberman/g, weight: 8, label: 'Analisis Miles & Huberman' },
    { pattern: /analisis\s+tematik|thematic\s+analysis|saturasi\s+data/g, weight: 6, label: 'Analisis Tematik' },
  ];

  const pustakaPatterns = [
    { pattern: /studi\s+kepustakaan|penelitian\s+kepustakaan|studi\s+pustaka|library\s+research/g, weight: 14, label: 'Studi Kepustakaan / Library Research' },
    { pattern: /yuridis\s+normatif|penelitian\s+hukum\s+normatif|normatif\s+yuridis/g, weight: 14, label: 'Yuridis Normatif' },
    { pattern: /bahan\s+hukum\s+primer|bahan\s+hukum\s+sekunder|bahan\s+hukum\s+tersier/g, weight: 12, label: 'Bahan Hukum Primer & Sekunder' },
    { pattern: /pendekatan\s+perundang-undangan|statute\s+approach|pendekatan\s+konseptual|conceptual\s+approach/g, weight: 10, label: 'Pendekatan Perundang-undangan' },
    { pattern: /analisis\s+isi\s+kualitatif|content\s+analysis|telaah\s+literatur|literature\s+review/g, weight: 8, label: 'Analisis Isi / Kajian Literatur' },
    { pattern: /hermeneutika|penafsiran\s+gramatikal|penafsiran\s+sistematis|penafsiran\s+teleologis/g, weight: 9, label: 'Penafsiran Hermeneutika / Hukum' },
  ];

  const rndPatterns = [
    { pattern: /penelitian\s+dan\s+pengembangan|research\s+and\s+development|\br\s*&\s*d\b/g, weight: 14, label: 'Penelitian dan Pengembangan (R&D)' },
    { pattern: /model\s+addie|model\s+4d|model\s+4-d|thiagarajan|borg\s+and\s+gall|borg\s*&\s*gall/g, weight: 12, label: 'Model ADDIE / 4D / Borg & Gall' },
    { pattern: /validasi\s+ahli|ahli\s+materi|ahli\s+media|uji\s+kepraktisan|kelayakan\s+media|uji\s+coba\s+produk/g, weight: 10, label: 'Validasi Ahli Produk / Media' },
  ];

  const kuantitatifPatterns = [
    { pattern: /penelitian\s+kuantitatif|pendekatan\s+kuantitatif|metode\s+kuantitatif|asosiatif\s+kausal/g, weight: 12, label: 'Kuantitatif' },
    { pattern: /populasi\s+dan\s+sampel|teknik\s+sampling|rumus\s+slovin|purposive\s+sampling|sampel\s+jenuh/g, weight: 8, label: 'Populasi & Sampel' },
    { pattern: /kuesioner|angket\s+penelitian|skala\s+likert/g, weight: 8, label: 'Kuesioner / Skala Likert' },
    { pattern: /uji\s+validitas\s+dan\s+reliabilitas|cronbach['’]?s\s+alpha|alpha\s+cronbach/g, weight: 8, label: 'Uji Validitas & Reliabilitas' },
    { pattern: /uji\s+asumsi\s+klasik|uji\s+normalitas|uji\s+multikolinearitas|uji\s+heteroskedastisitas/g, weight: 9, label: 'Uji Asumsi Klasik' },
    { pattern: /regresi\s+linear\s+berganda|regresi\s+linier\s+berganda|analisis\s+regresi|sem-pls|smartpls|path\s+analysis/g, weight: 9, label: 'Regresi / SEM-PLS' },
    { pattern: /uji\s+t\b|uji\s+f\b|koefisien\s+determinasi|r\s+square|adjusted\s+r\s+square/g, weight: 8, label: 'Uji Hipotesis (t / F / R²)' },
  ];

  let kualScore = 0;
  let kuantScore = 0;
  let pustakaScore = 0;
  let rndScore = 0;
  const detectedFeatures: string[] = [];

  for (const item of kualitatifPatterns) {
    const matches = lower.match(item.pattern);
    if (matches) {
      kualScore += matches.length * item.weight;
      if (!detectedFeatures.includes(item.label)) detectedFeatures.push(item.label);
    }
  }

  for (const item of pustakaPatterns) {
    const matches = lower.match(item.pattern);
    if (matches) {
      pustakaScore += matches.length * item.weight;
      if (!detectedFeatures.includes(item.label)) detectedFeatures.push(item.label);
    }
  }

  for (const item of rndPatterns) {
    const matches = lower.match(item.pattern);
    if (matches) {
      rndScore += matches.length * item.weight;
      if (!detectedFeatures.includes(item.label)) detectedFeatures.push(item.label);
    }
  }

  for (const item of kuantitatifPatterns) {
    const matches = lower.match(item.pattern);
    if (matches) {
      kuantScore += matches.length * item.weight;
      if (!detectedFeatures.includes(item.label)) detectedFeatures.push(item.label);
    }
  }

  // Check for explicit mixed methods
  if (/mixed\s+methods|metode\s+campuran|convergent\s+parallel|explanatory\s+sequential/i.test(lower)) {
    return {
      methodType: 'campuran',
      displayName: 'Metode Campuran (Mixed Methods)',
      badgeLabel: 'Mixed Methods',
      explanation: 'Skripsi terdeteksi menggabungkan pendekatan kuantitatif empiris dan pendalaman kualitatif lapangan secara simultan.',
      keyIndicators: detectedFeatures.slice(0, 5),
    };
  }

  // Priority evaluation based on highest accumulated score
  if (pustakaScore > 20 && pustakaScore >= kualScore && pustakaScore >= kuantScore) {
    return {
      methodType: 'pustaka',
      displayName: 'Studi Pustaka / Yuridis Normatif (Library Research)',
      badgeLabel: 'Studi Pustaka / Yuridis Normatif',
      explanation: 'Terdeteksi dari Bab III skripsi: Menggunakan studi kepustakaan / yuridis normatif, penelusuran regulasi/dokumen, dan analisis isi tanpa responden kuesioner.',
      keyIndicators: detectedFeatures.slice(0, 5),
    };
  }

  if (rndScore > 25 && rndScore > kuantScore && rndScore > kualScore) {
    return {
      methodType: 'rnd',
      displayName: 'Penelitian dan Pengembangan (R&D)',
      badgeLabel: 'Pengembangan (R&D)',
      explanation: 'Terdeteksi dari Bab III skripsi: Menggunakan model pengembangan (ADDIE/4D), validasi instrumen oleh ahli, dan uji kepraktisan produk.',
      keyIndicators: detectedFeatures.slice(0, 5),
    };
  }

  if (kualScore > kuantScore && kualScore > 15) {
    return {
      methodType: 'kualitatif',
      displayName: 'Kualitatif (Studi Kasus / Fenomenologi / Lapangan)',
      badgeLabel: 'Kualitatif',
      explanation: 'Terdeteksi dari Bab III skripsi: Menggunakan pendekatan kualitatif, wawancara mendalam, observasi partisipatif, triangulasi data, dan analisis Miles & Huberman tanpa uji statistik.',
      keyIndicators: detectedFeatures.slice(0, 5),
    };
  }

  // Default to kuantitatif if kuantScore dominates or as standard empirical thesis
  return {
    methodType: 'kuantitatif',
    displayName: 'Kuantitatif (Survei / Regresi / Hipotesis)',
    badgeLabel: 'Kuantitatif',
    explanation: 'Terdeteksi dari Bab III skripsi: Menggunakan pendekatan kuantitatif, kuesioner terstruktur, sampel empiris, uji validitas & reliabilitas, regresi/SEM, dan pengujian hipotesis.',
    keyIndicators: detectedFeatures.slice(0, 5),
  };
}
