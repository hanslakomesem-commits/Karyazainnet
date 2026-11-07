export interface PageLayoutConfig {
  paperSize: 'A4' | 'Letter' | 'Custom';
  orientation: 'portrait' | 'landscape';
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  columns: 1 | 2;
  columnSpacingMm: number;
}

export interface TypographyStyle {
  fontFamily: string;
  fontSizePt: number;
  lineSpacing: number;
  spaceBeforePt: number;
  spaceAfterPt: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  allCaps?: boolean;
  indentFirstLineMm?: number;
  hangingIndentMm?: number;
}

export interface PageNumberConfig {
  location: 'footer' | 'header' | 'none';
  alignment: 'left' | 'center' | 'right' | 'alternate';
  firstPageAlignment?: 'left' | 'center' | 'right';
  showOnFirstPage: boolean;
  hasOddEven: boolean;
  displayText: string;
}

export interface JournalTemplateConfig {
  id: string;
  name: string;
  publisher: string;
  fieldOfStudy: string;
  language?: string;
  issn?: string;
  eIssn?: string;
  journalUrl?: string;
  year?: string | number;
  volumeNo?: string;
  doi?: string;
  headerLogoUrl?: string;
  headerTitle?: string;
  headerLines?: string[];
  hasHeaderBanner?: boolean;
  pageNumberConfig?: PageNumberConfig;
  expectedStructure?: any;
  headingNumbering?: any;
  referenceCitationStyle?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
  templateBlobKey?: string;
  templateArrayBuffer?: ArrayBuffer;
  pageLayout: PageLayoutConfig;
  titleStyle: TypographyStyle;
  authorStyle: TypographyStyle;
  affiliationStyle: TypographyStyle;
  emailStyle: TypographyStyle;
  abstractTitleStyle: TypographyStyle;
  abstractBodyStyle: TypographyStyle;
  keywordsStyle: TypographyStyle;
  heading1Style: TypographyStyle;
  heading2Style: TypographyStyle;
  heading3Style: TypographyStyle;
  bodyStyle: TypographyStyle;
  tableCaptionStyle: TypographyStyle;
  figureCaptionStyle: TypographyStyle;
  referenceStyle: TypographyStyle;
}

export interface StructureMapping {
  title?: string;
  authors?: string;
  affiliations?: string;
  abstract?: string;
  keywords?: string;
  items?: any[];
  bodySections?: { sourceId: string; targetRole: string }[];
}