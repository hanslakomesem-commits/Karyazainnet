export interface TranslateAbstractResult {
  success: boolean;
  model: string;
  paragraphs: string[];
  body: string;
  keywords: string;
  paragraphCount: number;
}

export interface TidySectionResult {
  success: boolean;
  sectionId: string;
  model: string;
  paragraphs: string[];
  note: string;
}

export async function translateAbstractWithGemini(
  paragraphs: string[],
  keywords: string
): Promise<TranslateAbstractResult> {
  const res = await fetch('/api/gemini/translate-abstract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paragraphs, keywords }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menerjemahkan abstrak dengan Gemini 3.1 Flash Lite.');
  }
  return data;
}

export async function tidySectionWithGemini(
  sectionId: string,
  sectionTitle: string,
  paragraphs: string[],
  articleTitle: string
): Promise<TidySectionResult> {
  const res = await fetch('/api/gemini/tidy-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sectionId,
      sectionTitle,
      paragraphs,
      articleTitle,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal merapikan bagian dengan Gemini 3.1 Flash Lite.');
  }
  return data;
}

export async function tidyArticleWithGemini(
  title: string,
  sections: { id: string; title: string; paragraphs: string[] }[]
): Promise<{ success: boolean; model: string; sections: any[] }> {
  const res = await fetch('/api/gemini/tidy-article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, sections }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal merapikan draf artikel dengan Gemini 3.1 Flash Lite.');
  }
  return data;
}
