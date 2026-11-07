export interface GeminiModelOption {
  id: string;
  name: string;
  tier: 'hemat' | 'ekonomis' | 'standar' | 'premium';
  costLevel: number; // 1 to 4
  costLabel: string;
  costEstimate: string;
  speed: 'Super Cepat' | 'Cepat' | 'Sedang' | 'Mendalam';
  speedRating: number; // 1 to 5
  tag: string;
  tagColor: string;
  description: string;
  recommendedFor: string;
  badge?: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Zainnet 3.1 Flash Lite',
    tier: 'hemat',
    costLevel: 1,
    costLabel: 'Paling Hemat ($)',
    costEstimate: 'Biaya Terendah (~Rp. 85/artikel) / Efisiensi Token Maksimal',
    speed: 'Super Cepat',
    speedRating: 5,
    tag: 'Default • Standar Wajib 18 Halaman',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Model utama berkecepatan ultra tinggi dengan konsumsi token terhemat (~Rp. 85/artikel), dikalibrasi khusus menghasilkan naskah artikel ilmiah tepat 18 halaman.',
    recommendedFor: 'Konversi skripsi lengkap standar wajib 18 halaman dengan kecepatan maksimal dan biaya terhemat.',
    badge: '⭐ Pilihan Default (18 Halaman)',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Zainnet 3.6 Flash',
    tier: 'ekonomis',
    costLevel: 2,
    costLabel: 'Ekonomis & Cepat ($$)',
    costEstimate: 'Biaya Sangat Ringan (~Rp. 110/artikel) & Ketersediaan Sangat Tinggi',
    speed: 'Super Cepat',
    speedRating: 5,
    tag: 'Paling Stabil & Handal',
    tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Generasi Flash terbaru dengan performa stabil, tanpa hambatan antrean, dan efisiensi biaya token yang luar biasa.',
    recommendedFor: 'Konversi skripsi umum dengan efisiensi biaya dan kehandalan maksimal.',
    badge: '⚡ Cepat & Stabil',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Zainnet 3.7 Flash',
    tier: 'standar',
    costLevel: 3,
    costLabel: 'Seimbang ($$$)',
    costEstimate: 'Keseimbangan Terbaik (Harga vs Kualitas)',
    speed: 'Cepat',
    speedRating: 4,
    tag: 'Penalaran Riset Mutakhir',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Model generasi mutakhir dengan sintesis akademik cerdas, penalaran riset komprehensif, dan gaya penulisan ilmiah mendalam.',
    recommendedFor: 'Standar jurnal ilmiah terakreditasi SINTA 2-4, analisis komprehensif.',
    badge: '✨ Penalaran Cerdas',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Zainnet 3.1 Pro Preview',
    tier: 'premium',
    costLevel: 4,
    costLabel: 'Paling Mahal / Flagship ($$$$)',
    costEstimate: 'Kualitas Akademik Puncak (Scopus / SINTA 1)',
    speed: 'Mendalam',
    speedRating: 2,
    tag: 'Kualitas Tertinggi / Flagship',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'Model flagship Zainnet tercanggih untuk penalaran akademis tingkat tinggi, sintesis literatur mendalam, dan kualitas narasi akademik tanpa kompromi.',
    recommendedFor: 'Target jurnal internasional bereputasi (Scopus) & SINTA 1, artikel komprehensif.',
    badge: '💎 Flagship',
  },
];

export function getZainnetModelById(id?: string): GeminiModelOption {
  if (!id) return GEMINI_MODEL_OPTIONS[0];
  return GEMINI_MODEL_OPTIONS.find((m) => m.id === id) || GEMINI_MODEL_OPTIONS[0];
}
