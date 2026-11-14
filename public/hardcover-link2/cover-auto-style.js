/**
 * ZAIN.NET — aturan otomatis memilih jenis cover khusus UIN Madura.
 * Return null untuk kampus lain. Jangan pernah mengubah template kampus lain.
 * 'polos' = Polos V1 (217 mm/sisi); 'merah'/'maroon' = warna lama.
 */
function normalise(value) {
  return String(value ?? '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/SYARI\s*['‘’ʼ`]?\s*AH\b/g, 'SYARIAH')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function recommendUinMaduraCoverStyle(data = {}) {
  const uni = normalise(data.universitas);
  const belongsToUin = uni === 'UNIVERSITAS ISLAM NEGERI MADURA'
    || uni.startsWith('UNIVERSITAS ISLAM NEGERI MADURA ')
    || /^(?:UIN|U I N) MADURA(?: PAMEKASAN)?$/.test(uni);
  if (!belongsToUin) return null;

  const faculty = normalise(data.fakultas);
  const program = normalise(data.prodi);
  if (!faculty) return {style:null, reason:'Fakultas belum terbaca. Pilih atau perbaiki fakultas sebelum jenis cover otomatis ditentukan.'};

  // Jangan keliru memilih polos jika hasil OCR fakultas mirip "Syariah" tetapi belum pasti.
  const isSyariah = /(?:^| )SYARIAH(?: |$)/.test(faculty);
  if (!isSyariah && /(?:^| )SYAR[A-Z]*(?: |$)/.test(faculty)) {
    return {style:null, reason:'Nama fakultas mirip Syariah tetapi belum jelas. Koreksi tulisan fakultas sebelum melanjutkan.'};
  }
  if (!isSyariah) return {style:'polos',reason:'UIN Madura: fakultas selain Syariah → Polos V1 217 mm.'};

  if (!program) return {style:null, reason:'Fakultas Syariah terdeteksi, tetapi prodi belum terbaca. Isi prodi agar HKI tidak salah dipilih.'};
  const hki = /(?:^| )HKI(?: |$)/.test(program) || /(?:^| )HUKUM KELUARGA ISLAM(?: |$)/.test(program);
  return hki
    ? {style:'merah',reason:'UIN Madura: Fakultas Syariah, HKI / Hukum Keluarga Islam → Merah.'}
    : {style:'maroon',reason:'UIN Madura: Fakultas Syariah, prodi selain HKI → Maroon #8B0000.'};
}
