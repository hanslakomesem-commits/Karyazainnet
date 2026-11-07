export type JournalCategory = 
  | 'Semua Bidang'
  | 'Teknologi & Komputer' 
  | 'Kesehatan & Kedokteran' 
  | 'Ekonomi & Manajemen' 
  | 'Pendidikan & Sosial' 
  | 'Sains & Teknik' 
  | 'Hukum & Humaniora';

export type CitationStyle = 'APA 7th' | 'IEEE (Numbered)' | 'Harvard' | 'Vancouver' | 'Chicago 17th';

export type JournalIndexTier = 'Sinta 1' | 'Sinta 2' | 'Sinta 3' | 'Sinta 4' | 'Sinta 5' | 'Scopus Q1/Q2' | 'Nasional Terakreditasi';

export interface AuthorProfile {
  name: string;
  affiliation: string;
  email: string;
  role: 'student' | 'advisor1' | 'advisor2' | 'author';
}

export interface JournalTemplateGuidelines {
  fontFamily: 'Times New Roman' | 'Arial' | 'Calibri' | 'Garamond' | 'Georgia';
  fontSizeTitle: number; // e.g. 14 or 16 pt
  fontSizeHeading: number; // e.g. 12 pt bold
  fontSizeBody: number; // e.g. 10 or 11 pt
  lineSpacing: '1.0' | '1.15' | '1.5' | '2.0';
  margins: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  columnCount: 1 | 2;
  citationStyle: CitationStyle;
  abstractMaxWords: number;
  keywordsMinMax: string; // e.g. "3 - 5 kata"
  sectionsRequired: string[];
  paperSize: 'A4';
  headerFooterText?: string;
  specialRules?: string[];
  minAuthors?: number; // e.g. 3 for Karsa
  authorRuleDescription?: string;
  requiresHistoryDates?: boolean;
}

export interface JournalTemplate {
  id: string;
  name: string;
  shortName: string;
  publisher: string;
  category: JournalCategory;
  indexTier: JournalIndexTier;
  issn?: string;
  description: string;
  fileType: 'DOCX' | 'PDF' | 'LATEX' | 'ZIP';
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  downloadUrl?: string;
  guidelines: JournalTemplateGuidelines;
  isPredefined?: boolean;
}

export interface RawDraftArticle {
  title: string;
  authors: string;
  affiliation: string;
  email: string;
  abstract: string;
  keywords: string;
  introduction: string;
  methods: string;
  resultsAndDiscussion: string;
  conclusion: string;
  acknowledgments?: string;
  references: string;
  // Multi-author breakdown (e.g. Mahasiswa + 2 Dosen Pembimbing untuk Karsa)
  authorsList?: AuthorProfile[];
  receivedDate?: string;
  acceptedDate?: string;
  publishedDate?: string;
  doi?: string;
  volumeIssue?: string;
  fullRawContent?: string; // Menyimpan 100% naskah utuh tanpa terpotong
}

export interface FormattedHistoryItem {
  id: string;
  templateId: string;
  templateName: string;
  articleTitle: string;
  authorName: string;
  formattedAt: string;
  wordCount: number;
  complianceScore: number;
  citationStyle: string;
  columnCount: number;
  content: RawDraftArticle;
}
