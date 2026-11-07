export interface LabelItem {
  id: string;
  name: string;
  prefix: string; // e.g. "Di"
  destination: string; // e.g. "Tempat"
  isEmpty: boolean;
  globalIndex: number; // 1-based index
  sheetNumber: number;
  rowNumber: number; // 1 to 4
  colNumber: number; // 1 to 3
}

export interface LabelSheet {
  sheetNumber: number;
  rows: LabelItem[][]; // 4 rows, each has 3 cols
  activeItemCount: number;
  emptyItemCount: number;
}

export type TextCasing = 'original' | 'title' | 'upper';
export type InputSeparator = 'comma' | 'newline' | 'auto';
export type TextAlignment = 'center' | 'left';

export interface FormatSettings {
  prefixLine: string;       // Default: "Di"
  destinationLine: string;  // Default: "Tempat"
  casing: TextCasing;
  separator: InputSeparator;
  removeDuplicates: boolean;
  fontFamily: string;
  fontSize: number;          // in pt or px (e.g. 11pt, 12pt)
  isBoldName: boolean;
  alignment: TextAlignment;
}
