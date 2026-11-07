import JSZip from 'jszip';
import {
  ParsedDocument,
  DocumentParagraph,
  DocumentRun,
  DocumentTable,
  TableRow,
  TableCell,
  DocumentImage,
  DocumentStats,
  DocumentBodyElement,
  DocumentStructure,
} from '../types/document';

export async function computeContentHash(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return 'simple_' + Math.abs(hash).toString(16);
}

export async function readDocxFile(file: File | Blob, customName?: string): Promise<ParsedDocument> {
  const fileName = customName || (file instanceof File ? file.name : 'artikel.docx');
  const fileSizeBytes = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const images: DocumentImage[] = [];
  const mediaFiles = Object.keys(zip.files).filter((path) => path.startsWith('word/media/'));
  for (const mediaPath of mediaFiles) {
    const zipEntry = zip.file(mediaPath);
    if (zipEntry) {
      const imgBuffer = await zipEntry.async('uint8array');
      const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
      let mimeType = 'image/png';
      if (ext === 'jpeg' || ext === 'jpg') mimeType = 'image/jpeg';
      const blob = new Blob([imgBuffer as unknown as BlobPart], { type: mimeType });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      images.push({
        id: `img-${mediaPath.replace('word/media/', '')}`,
        name: mediaPath.replace('word/media/', ''),
        dataUrl,
        extension: ext,
      });
    }
  }

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('File DOCX tidak valid: Berkas word/document.xml tidak ditemukan.');
  }

  const docXmlText = await docFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlText, 'application/xml');
  const body = xmlDoc.getElementsByTagName('w:body')[0];
  if (!body) {
    throw new Error('Struktur dokumen Word tidak memiliki elemen w:body.');
  }

  const paragraphs: DocumentParagraph[] = [];
  const tables: DocumentTable[] = [];
  const bodyElements: DocumentBodyElement[] = [];

  const children = Array.from(body.childNodes);
  let pIndex = 0;
  let tIndex = 0;

  for (const node of children) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tagName = el.tagName || el.nodeName;
    if (tagName === 'w:p') {
      const p = parseXmlParagraph(el, `p-${pIndex++}`);
      paragraphs.push(p);
      bodyElements.push({ type: 'paragraph', paragraph: p });
    } else if (tagName === 'w:tbl') {
      const t = parseXmlTable(el, `tbl-${tIndex++}`);
      tables.push(t);
      bodyElements.push({ type: 'table', table: t });
    }
  }

  const rawTextParts: string[] = [];
  paragraphs.forEach((p) => rawTextParts.push(p.text));
  tables.forEach((t) => {
    t.rows.forEach((r) => {
      r.cells.forEach((c) => rawTextParts.push(c.text));
    });
  });
  const rawText = rawTextParts.join('\n');
  const contentHash = await computeContentHash(rawText);

  const words = rawText.trim().length > 0 ? rawText.trim().split(/\s+/).length : 0;
  const chars = rawText.length;
  const charsNoSpaces = rawText.replace(/\s/g, '').length;

  const structure: DocumentStructure = {
    title: paragraphs[0]?.text || '',
    authors: [],
    affiliations: [],
    emails: [],
    sections: [],
    references: [],
  };

  const stats: DocumentStats = {
    characterCount: chars,
    characterCountNoSpaces: charsNoSpaces,
    wordCount: words,
    paragraphCount: paragraphs.length,
    headingCount: structure.sections.length,
    tableCount: tables.length,
    imageCount: images.length,
    referenceCount: 0,
  };

  return {
    fileName,
    fileSizeBytes,
    rawText,
    contentHash,
    paragraphs,
    tables,
    images,
    bodyElements,
    originalArrayBuffer: arrayBuffer,
    stats,
    structure,
  };
}

function parseXmlParagraph(pEl: Element, id: string): DocumentParagraph {
  const runs: DocumentRun[] = [];
  let fullText = '';
  let alignment: 'left' | 'center' | 'right' | 'justify' | undefined;

  const pPr = pEl.getElementsByTagName('w:pPr')[0];
  if (pPr) {
    const jc = pPr.getElementsByTagName('w:jc')[0];
    if (jc) {
      const val = jc.getAttribute('w:val');
      if (val === 'center') alignment = 'center';
      else if (val === 'right') alignment = 'right';
      else if (val === 'both') alignment = 'justify';
      else alignment = 'left';
    }
  }

  const runElements = Array.from(pEl.getElementsByTagName('w:r'));
  for (const rEl of runElements) {
    let t = '';
    const tElements = rEl.getElementsByTagName('w:t');
    for (let i = 0; i < tElements.length; i++) {
      t += tElements[i].textContent || '';
    }
    if (t) {
      runs.push({ text: t });
      fullText += t;
    }
  }

  if (fullText.length === 0 && pEl.textContent) {
    fullText = pEl.textContent.trim();
    runs.push({ text: fullText });
  }

  return {
    id,
    text: fullText,
    runs,
    alignment,
  };
}

function parseXmlTable(tblEl: Element, id: string): DocumentTable {
  const rows: TableRow[] = [];
  const trElements = Array.from(tblEl.getElementsByTagName('w:tr'));
  let maxCols = 0;

  for (let rIdx = 0; rIdx < trElements.length; rIdx++) {
    const tr = trElements[rIdx];
    const cells: TableCell[] = [];
    const tcElements = Array.from(tr.getElementsByTagName('w:tc'));
    for (let cIdx = 0; cIdx < tcElements.length; cIdx++) {
      const tc = tcElements[cIdx];
      const pElements = Array.from(tc.getElementsByTagName('w:p'));
      const cellParagraphs: DocumentParagraph[] = [];
      const cellTextParts: string[] = [];
      for (let pIdx = 0; pIdx < pElements.length; pIdx++) {
        const p = parseXmlParagraph(pElements[pIdx], `${id}-r${rIdx}-c${cIdx}-p${pIdx}`);
        cellParagraphs.push(p);
        if (p.text.trim()) cellTextParts.push(p.text);
      }
      cells.push({
        text: cellTextParts.join('\n'),
        paragraphs: cellParagraphs,
        isHeader: rIdx === 0,
      });
    }
    if (cells.length > maxCols) maxCols = cells.length;
    rows.push({ cells, isHeader: rIdx === 0 });
  }

  return {
    id,
    rows,
    columnCount: maxCols,
    rowCount: rows.length,
  };
}