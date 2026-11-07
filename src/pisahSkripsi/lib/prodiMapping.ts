/**
 * Official Study Programs (Program Studi) and their standardized abbreviations.
 */

export interface OfficialProdi {
  name: string;
  code: string;
  aliases?: string[];
}

export const OFFICIAL_PRODI_LIST: OfficialProdi[] = [
  {
    name: "Pendidikan Agama Islam",
    code: "PAI",
    aliases: ["PAI", "Tarbiyah PAI"]
  },
  {
    name: "Pendidikan Bahasa Arab",
    code: "PBA",
    aliases: ["PBA", "Bahasa Arab"]
  },
  {
    name: "Tadris Bahasa Inggris",
    code: "TBI",
    aliases: ["TBI", "Pendidikan Bahasa Inggris", "Bahasa Inggris"]
  },
  {
    name: "Manajemen Pendidikan Islam",
    code: "MPI",
    aliases: ["MPI"]
  },
  {
    name: "Pendidikan Islam Anak Usia Dini",
    code: "PIAUD",
    aliases: ["PIAUD", "PGRA"]
  },
  {
    name: "Pendidikan Guru Madrasah Ibtidaiyah",
    code: "PGMI",
    aliases: ["PGMI", "PGSD Islam"]
  },
  {
    name: "Tadris Bahasa Indonesia",
    code: "TBIN",
    aliases: ["TBIN", "Pendidikan Bahasa Indonesia", "Bahasa Indonesia"]
  },
  {
    name: "Tadris Ilmu Pengetahuan Sosial",
    code: "TIPS",
    aliases: ["TIPS", "Tadris IPS", "Pendidikan IPS"]
  },
  {
    name: "Bimbingan dan Konseling Pendidikan Islam",
    code: "BKPI",
    aliases: ["BKPI", "Bimbingan Konseling Islam", "BKI"]
  },
  {
    name: "Tadris Matematika",
    code: "TM",
    aliases: ["TM", "TMAT", "Pendidikan Matematika", "Matematika"]
  },
  {
    name: "Tadris Ilmu Pengetahuan Alam",
    code: "Tadris IPA",
    aliases: ["TIPA", "Tadris IPA", "Pendidikan IPA", "IPA"]
  },
  {
    name: "Pendidikan Profesi Guru",
    code: "PPG",
    aliases: ["PPG", "Profesi Guru"]
  },
  {
    name: "Ilmu Al-Qur'an dan Tafsir",
    code: "IQT",
    aliases: ["Ilmu Al Quran dan Tafsir", "Ilmu Al-Quran dan Tafsir", "Ilmu Alquran dan Tafsir", "Tafsir Hadis", "Tafsir Hadits", "IAT", "IQT"]
  },
  {
    name: "Komunikasi dan Penyiaran Islam",
    code: "KPI",
    aliases: ["Komunikasi Penyiaran Islam", "KPI"]
  },
  {
    name: "Ilmu Hadis",
    code: "ILHA",
    aliases: ["Ilmu Hadits", "Hadis", "Hadits", "ILHA"]
  },
  {
    name: "Hukum Keluarga Islam",
    code: "HKI",
    aliases: ["Ahwal Al-Syakhsiyyah", "Ahwal Syakhsiyyah", "Ahwalus Syakhsiyyah", "HKI"]
  },
  {
    name: "Hukum Ekonomi Syariah",
    code: "HES",
    aliases: ["Mu'amalah", "Muamalah", "HES"]
  },
  {
    name: "Hukum Tata Negara",
    code: "HTN",
    aliases: ["Siyasah Syar'iyyah", "Siyasah Syariyyah", "Siyasah", "HTN"]
  },
  {
    name: "Ekonomi Syariah",
    code: "ES",
    aliases: ["Ekonomi Islam", "ES"]
  },
  {
    name: "Perbankan Syariah",
    code: "PBS",
    aliases: ["Perbankan Islam", "Bank Syariah", "PBS"]
  },
  {
    name: "Akuntansi Syariah",
    code: "AS",
    aliases: ["Akuntansi Islam", "AKS", "AS"]
  },
  {
    name: "Manajemen Bisnis Syariah",
    code: "MBS",
    aliases: ["Manajemen Syariah", "Bisnis Syariah", "MBS"]
  }
];

export const PRODI_MAPPING: Record<string, string> = {
  // 1. Pendidikan Agama Islam (PAI)
  "pendidikan agama islam": "PAI",
  "agama islam": "PAI",
  "pai": "PAI",

  // 2. Pendidikan Bahasa Arab (PBA)
  "pendidikan bahasa arab": "PBA",
  "bahasa arab": "PBA",
  "pba": "PBA",

  // 3. Tadris Bahasa Inggris (TBI)
  "tadris bahasa inggris": "TBI",
  "pendidikan bahasa inggris": "TBI",
  "bahasa inggris": "TBI",
  "tbi": "TBI",

  // 4. Manajemen Pendidikan Islam (MPI)
  "manajemen pendidikan islam": "MPI",
  "mpi": "MPI",

  // 5. Pendidikan Islam Anak Usia Dini (PIAUD)
  "pendidikan islam anak usia dini": "PIAUD",
  "islam anak usia dini": "PIAUD",
  "anak usia dini": "PIAUD",
  "piaud": "PIAUD",

  // 6. Pendidikan Guru Madrasah Ibtidaiyah (PGMI)
  "pendidikan guru madrasah ibtidaiyah": "PGMI",
  "guru madrasah ibtidaiyah": "PGMI",
  "madrasah ibtidaiyah": "PGMI",
  "pgmi": "PGMI",

  // 7. Tadris Bahasa Indonesia (TBIN)
  "tadris bahasa indonesia": "TBIN",
  "pendidikan bahasa indonesia": "TBIN",
  "bahasa indonesia": "TBIN",
  "tbin": "TBIN",

  // 8. Tadris Ilmu Pengetahuan Sosial (TIPS)
  "tadris ilmu pengetahuan sosial": "TIPS",
  "ilmu pengetahuan sosial": "TIPS",
  "tadris ips": "TIPS",
  "tips": "TIPS",

  // 9. Bimbingan dan Konseling Pendidikan Islam (BKPI)
  "bimbingan dan konseling pendidikan islam": "BKPI",
  "bimbingan konseling pendidikan islam": "BKPI",
  "bimbingan dan konseling islam": "BKPI",
  "bimbingan konseling islam": "BKPI",
  "bkpi": "BKPI",
  "bki": "BKPI",

  // 10. Tadris Matematika (TM)
  "tadris matematika": "TM",
  "pendidikan matematika": "TM",
  "matematika": "TM",
  "tmat": "TM",
  "tm": "TM",

  // 11. Tadris Ilmu Pengetahuan Alam (Tadris IPA)
  "tadris ilmu pengetahuan alam": "Tadris IPA",
  "ilmu pengetahuan alam": "Tadris IPA",
  "tadris ipa": "Tadris IPA",
  "pendidikan ipa": "Tadris IPA",
  "tipa": "Tadris IPA",

  // 12. Pendidikan Profesi Guru (PPG)
  "pendidikan profesi guru": "PPG",
  "profesi guru": "PPG",
  "ppg": "PPG",

  // 13. Ilmu Al-Qur'an dan Tafsir (IQT)
  "ilmu al-qur'an dan tafsir": "IQT",
  "ilmu al quran dan tafsir": "IQT",
  "ilmu al-quran dan tafsir": "IQT",
  "ilmu alquran dan tafsir": "IQT",
  "qur'an dan tafsir": "IQT",
  "quran dan tafsir": "IQT",
  "al-qur'an dan tafsir": "IQT",
  "iqt": "IQT",
  "iat": "IQT",

  // 14. Komunikasi dan Penyiaran Islam (KPI)
  "komunikasi dan penyiaran islam": "KPI",
  "komunikasi penyiaran islam": "KPI",
  "penyiaran islam": "KPI",
  "kpi": "KPI",

  // 15. Ilmu Hadis (ILHA)
  "ilmu hadis": "ILHA",
  "ilmu hadits": "ILHA",
  "hadis": "ILHA",
  "hadits": "ILHA",
  "ilha": "ILHA",

  // 16. Hukum Keluarga Islam (HKI)
  "hukum keluarga islam": "HKI",
  "hukum keluarga": "HKI",
  "ahwal al-syakhsiyyah": "HKI",
  "ahwal syakhsiyyah": "HKI",
  "ahwalus syakhsiyyah": "HKI",
  "hki": "HKI",

  // 17. Hukum Ekonomi Syariah (HES)
  "hukum ekonomi syariah": "HES",
  "hukum ekonomi islam": "HES",
  "mu'amalah": "HES",
  "muamalah": "HES",
  "hes": "HES",

  // 18. Hukum Tata Negara (HTN)
  "hukum tata negara": "HTN",
  "siyasah syar'iyyah": "HTN",
  "siyasah syariyyah": "HTN",
  "siyasah": "HTN",
  "htn": "HTN",

  // 19. Ekonomi Syariah (ES)
  "ekonomi syariah": "ES",
  "ekonomi islam": "ES",
  "es": "ES",

  // 20. Perbankan Syariah (PBS)
  "perbankan syariah": "PBS",
  "perbankan islam": "PBS",
  "bank syariah": "PBS",
  "pbs": "PBS",

  // 21. Akuntansi Syariah (AS)
  "akuntansi syariah": "AS",
  "akuntansi islam": "AS",
  "aks": "AS",
  "as": "AS",

  // 22. Manajemen Bisnis Syariah (MBS)
  "manajemen bisnis syariah": "MBS",
  "manajemen syariah": "MBS",
  "bisnis syariah": "MBS",
  "mbs": "MBS"
};

export function getProdiCode(prodiFull: string): string {
  if (!prodiFull) return 'PRODI';
  const clean = prodiFull.trim().toLowerCase();

  // 1. Direct key match (longer phrases first)
  const sortedKeys = Object.keys(PRODI_MAPPING).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key)) {
      return PRODI_MAPPING[key];
    }
  }

  // 2. Check if string matches an official abbreviation in parentheses e.g. "Pendidikan Agama Islam (PAI)"
  const codeInParen = prodiFull.match(/\(([A-Za-z\s]{2,12})\)/i);
  if (codeInParen) {
    const candidate = codeInParen[1].trim();
    const candidateUpper = candidate.toUpperCase();
    const matchOfficial = OFFICIAL_PRODI_LIST.find(
      p => p.code.toUpperCase() === candidateUpper || p.code.toLowerCase() === candidate.toLowerCase()
    );
    if (matchOfficial) return matchOfficial.code;
    return candidate;
  }

  // 3. If already uppercase abbreviation (e.g. PAI, PBA, TBI, MPI, PIAUD, PGMI, TBIN, TIPS, BKPI, TM, TIPA, PPG, HKI, IQT, ILHA, HES, HTN, ES, PBS, AS, MBS, KPI)
  const directUpper = prodiFull.trim().toUpperCase();
  const directMatch = OFFICIAL_PRODI_LIST.find(
    p => p.code.toUpperCase() === directUpper || p.code.toLowerCase() === prodiFull.trim().toLowerCase()
  );
  if (directMatch) {
    return directMatch.code;
  }

  if (/^[A-Za-z\s]{2,10}$/.test(prodiFull.trim())) {
    return prodiFull.trim().toUpperCase();
  }

  // 4. Fallback: extract initials from words
  const words = clean
    .replace(/program\s+studi|jurusan|prodi|s1|s2|s3/gi, '')
    .trim()
    .split(/\s+/)
    .filter(w => !['dan', 'di', 'ke', 'untuk', 'studi', 'jurusan'].includes(w));

  if (words.length > 0) {
    const initials = words.map(w => w[0]?.toUpperCase()).join('');
    if (initials.length >= 2) return initials;
  }

  return 'PRODI';
}

/**
 * Normalizes any prodi string to the official standard full name if matched
 */
export function getOfficialProdiName(prodiInput: string): string {
  if (!prodiInput) return "Pendidikan Agama Islam";
  const code = getProdiCode(prodiInput);
  const found = OFFICIAL_PRODI_LIST.find(
    p => p.code.toUpperCase() === code.toUpperCase() || p.code.toLowerCase() === code.toLowerCase()
  );
  return found ? found.name : prodiInput;
}

