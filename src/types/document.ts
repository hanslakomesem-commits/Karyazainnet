export interface DocumentRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontFamily?: string;
  fontSizePt?: number;
  color?: string;
}

export interface DocumentParagraph {
  id: string;
  text: string;
  runs: DocumentRun[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  headingLevel?: number;
  styleName?: string;
  detectedRole?: DocumentElementRole;
}

export interface TableCell {
  text: string;
  paragraphs: DocumentParagraph[];
  isHeader?: boolean;
}

export interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

export interface DocumentTable {
  id: string;
  caption?: string;
  rows: TableRow[];
  columnCount: number;
  rowCount: number;
}

export interface DocumentImage {
  id: string;
  name: string;
  caption?: string;
  dataUrl: string;
  extension: string;
}

export type DocumentElementRole =
  | 'title'
  | 'author'
  | 'affiliation'
  | 'email'
  | 'abstract_label'
  | 'abstract_body'
  | 'keywords'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'body_paragraph'
  | 'table_caption'
  | 'figure_caption'
  | 'reference_header'
  | 'reference_item'
  | 'unknown';

export type DocumentBodyElement =
  | { type: 'paragraph'; paragraph: DocumentParagraph }
  | { type: 'table'; table: DocumentTable };

export interface ParsedDocument {
  fileName: string;
  fileSizeBytes: number;
  rawText: string;
  contentHash: string;
  paragraphs: DocumentParagraph[];
  tables: DocumentTable[];
  images: DocumentImage[];
  bodyElements: DocumentBodyElement[];
  originalArrayBuffer?: ArrayBuffer;
  stats: DocumentStats;
  structure: DocumentStructure;
}

export interface DocumentStats {
  characterCount: number;
  characterCountNoSpaces: number;
  wordCount: number;
  paragraphCount: number;
  headingCount: number;
  tableCount: number;
  imageCount: number;
  referenceCount: number;
}

export interface DocumentStructure {
  title?: string;
  authors: string[];
  affiliations: string[];
  emails: string[];
  abstractText?: string;
  abstractId?: string;
  keywords?: string[];
  sections: DocumentSection[];
  references: string[];
}

export interface DocumentSection {
  id: string;
  heading: string;
  level: number;
  paragraphs: DocumentParagraph[];
  tables: DocumentTable[];
  images: DocumentImage[];
}

export interface IntegrityReport {
  timestamp: string;
  isIntegrityPreserved: boolean;
  originalHash: string;
  formattedHash: string;
  hashMatch: boolean;
  contentModificationAttempted?: boolean;
  metrics: {
    originalWords: number;
    formattedWords: number;
    wordDiff: number;
    originalCharacters?: number;
    formattedCharacters?: number;
    charDiff?: number;
    originalParagraphs: number;
    formattedParagraphs: number;
    paragraphDiff: number;
    originalTables: number;
    formattedTables: number;
    tableDiff: number;
    originalImages: number;
    formattedImages: number;
    imageDiff: number;
    originalReferences: number;
    formattedReferences: number;
    referenceDiff: number;
  };
  details: string[];
  warnings?: string[];
}