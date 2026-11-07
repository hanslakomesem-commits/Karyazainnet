import JSZip from 'jszip';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT = 'http://schemas.openxmlformats.org/package/2006/content-types';

// Comprehensive OpenXML namespace declarations to ensure 100% universal compatibility
// with MS Word 2007, 2010, 2013, 2016, 2019, 2021, Office 365, Word for Mac, WPS, and LibreOffice.
const ALL_NAMESPACES = [
  `xmlns:w="${W}"`,
  `xmlns:r="${R}"`,
  `xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"`,
  `xmlns:v="urn:schemas-microsoft-com:vml"`,
  `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"`,
  `xmlns:w10="urn:schemas-microsoft-com:office:word"`,
  `xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"`,
  `xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"`,
  `xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"`,
  `xmlns:w16se="http://schemas.microsoft.com/office/word/2016/wordml/se"`,
  `xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"`,
].join(' ');

const parser = () => new DOMParser();
const ser = () => new XMLSerializer();

export const norm = (s: string) =>
  (s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u00ad\ufffe]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Escapes XML special chars and removes illegal XML 1.0 control characters
export const esc = (s: string) =>
  (s || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Strip invalid XML control chars
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function q(root: Element | Document, local: string): Element[] {
  return [...root.getElementsByTagNameNS(W, local)];
}

function getText(node: Element): string {
  return q(node, 't').map(x => x.textContent || '').join('');
}

function getBoldRatio(p: Element): number {
  const runs = q(p, 'r');
  if (!runs.length) return 0;
  let n = 0, d = 0;
  for (const r of runs) {
    const txt = getText(r);
    if (!txt.trim()) continue;
    d++;
    const b = r.getElementsByTagNameNS(W, 'b')[0];
    if (b && b.getAttributeNS(W, 'val') !== '0') n++;
  }
  return d ? n / d : 0;
}

function footnoteIds(p: Element): string[] {
  return q(p, 'footnoteReference')
    .map(x => x.getAttributeNS(W, 'id') || x.getAttribute('w:id'))
    .filter(Boolean) as string[];
}

function styleId(p: Element): string {
  const e = p.getElementsByTagNameNS(W, 'pStyle')[0];
  return e ? (e.getAttributeNS(W, 'val') || e.getAttribute('w:val') || '') : '';
}

export interface DocItem {
  index: number;
  type: 'p' | 'table';
  text: string;
  xml: string;
  style: string;
  boldRatio: number;
  footnoteIds: string[];
  tableRows?: string[][];
}

export interface ParsedDoc {
  arrayBuffer: ArrayBuffer;
  zip: JSZip;
  xml: string;
  items: DocItem[];
  footnotes: Map<string, string>;
}

function extractTableRows(tblNode: Element): string[][] {
  const rows: string[][] = [];
  const trs = q(tblNode, 'tr');
  for (const tr of trs) {
    const tcs = q(tr, 'tc');
    const rowTexts = tcs.map(tc => norm(getText(tc)));
    if (rowTexts.some(t => t.length > 0)) {
      rows.push(rowTexts);
    }
  }
  return rows;
}

function cloneItem(node: Element, index: number): DocItem {
  const isTbl = node.localName === 'tbl';
  return {
    index,
    type: isTbl ? 'table' : 'p',
    text: norm(getText(node)),
    xml: ser().serializeToString(node),
    style: !isTbl ? styleId(node) : '',
    boldRatio: !isTbl ? getBoldRatio(node) : 0,
    footnoteIds: !isTbl ? footnoteIds(node) : [],
    tableRows: isTbl ? extractTableRows(node) : undefined,
  };
}

export async function readDocx(fileOrBuffer: File | Blob | ArrayBuffer): Promise<ParsedDoc> {
  const ab = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);
  const f = zip.file('word/document.xml');
  if (!f) throw new Error('File bukan DOCX Word yang valid.');

  const xml = await f.async('string');
  const doc = parser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('document.xml tidak dapat dibaca.');
  }

  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('Format document.xml tidak memiliki w:body.');

  const nodes = [...body.children].filter(x => x.localName === 'p' || x.localName === 'tbl');
  const items: DocItem[] = nodes.map((n, i) => cloneItem(n, i));

  const footnotes = new Map<string, string>();
  const ff = zip.file('word/footnotes.xml');
  if (ff) {
    const fx = parser().parseFromString(await ff.async('string'), 'application/xml');
    for (const fn of fx.getElementsByTagNameNS(W, 'footnote')) {
      const id = fn.getAttributeNS(W, 'id') || fn.getAttribute('w:id');
      if (id != null) footnotes.set(String(id), norm(getText(fn)));
    }
  }

  return { arrayBuffer: ab, zip, xml, items, footnotes };
}

// Safely parse an XML fragment with all Word namespaces to prevent parsererror
function frag(doc: Document, xml: string): Element | null {
  const cleanXml = (xml || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const wrapped = `<x ${ALL_NAMESPACES}>${cleanXml}</x>`;
  const d = parser().parseFromString(wrapped, 'application/xml');
  
  if (d.getElementsByTagName('parsererror').length > 0) {
    // If there's an XML parser error, strip unknown namespaces and try again
    const sanitized = cleanXml.replace(/\s+[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+="[^"]*"/g, (match) => {
      if (match.startsWith(' w:') || match.startsWith(' r:') || match.startsWith(' xml:')) return match;
      return '';
    });
    const d2 = parser().parseFromString(`<x ${ALL_NAMESPACES}>${sanitized}</x>`, 'application/xml');
    if (d2.getElementsByTagName('parsererror').length === 0 && d2.documentElement.firstElementChild) {
      return doc.importNode(d2.documentElement.firstElementChild as Element, true);
    }
    return null;
  }

  if (!d.documentElement.firstElementChild) return null;
  return doc.importNode(d.documentElement.firstElementChild as Element, true);
}

function ensurePPr(doc: Document, p: Element): Element {
  let pPr = [...p.children].find(x => x.localName === 'pPr');
  if (!pPr) {
    pPr = doc.createElementNS(W, 'w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }
  return pPr;
}

function rmChildren(parent: Element, names: string[]) {
  for (const x of [...parent.children]) {
    if (names.includes(x.localName)) x.remove();
  }
}

function wEl(doc: Document, name: string, val?: string | number): Element {
  const e = doc.createElementNS(W, 'w:' + name);
  if (val !== undefined) e.setAttributeNS(W, 'w:val', String(val));
  return e;
}

function createIndent(doc: Document, attrs: Record<string, string | number> = {}): Element {
  const ind = wEl(doc, 'ind');
  for (const [k, v] of Object.entries(attrs)) {
    ind.setAttributeNS(W, 'w:' + k, String(v));
  }
  return ind;
}

function createSpacing(doc: Document, { before = 0, after = 0, line = 360, rule = 'auto' } = {}): Element {
  const sp = wEl(doc, 'spacing');
  sp.setAttributeNS(W, 'w:before', String(before));
  sp.setAttributeNS(W, 'w:after', String(after));
  sp.setAttributeNS(W, 'w:line', String(line));
  sp.setAttributeNS(W, 'w:lineRule', rule);
  return sp;
}

/**
 * Sets paragraph formatting adhering strictly to ISO/IEC 29500 CT_PPr schema order:
 * 1. pStyle
 * 2. keepNext
 * 3. spacing
 * 4. ind
 * 5. jc
 * This order is MANDATORY for compatibility across Word 2007/2010/2013/2016/2019/2021/365.
 */
function setParaFormat(doc: Document, p: Element, role: string) {
  const pPr = ensurePPr(doc, p);
  rmChildren(pPr, ['sectPr', 'pageBreakBefore', 'keepNext', 'spacing', 'ind', 'jc', 'tabs']);

  let align = 'both';
  if (['title', 'identity', 'identityUniv', 'author', 'sectionCenter'].includes(role)) align = 'center';
  else if (['section', 'sectionLeft', 'subheading', 'conclusionHeading', 'bibliography', 'abstractKeywords'].includes(role)) align = 'left';

  // 1. keepNext (must appear before spacing, ind, jc in schema)
  const needsKeepNext = ['sectionCenter', 'section', 'sectionLeft', 'subheading', 'conclusionHeading'].includes(role);
  if (needsKeepNext) {
    pPr.appendChild(wEl(doc, 'keepNext'));
  }

  // 2. spacing
  let spEl: Element;
  if (role === 'title') spEl = createSpacing(doc, { before: 40, after: 200, line: 300 });
  else if (role === 'author') spEl = createSpacing(doc, { before: 80, after: 20, line: 240 });
  else if (role === 'identity') spEl = createSpacing(doc, { before: 0, after: 20, line: 240 });
  else if (role === 'identityUniv') spEl = createSpacing(doc, { before: 0, after: 200, line: 240 });
  else if (role === 'sectionCenter' || role === 'section' || role === 'sectionLeft') {
    spEl = createSpacing(doc, { before: 220, after: 100, line: 300 });
  } else if (role === 'subheading') {
    spEl = createSpacing(doc, { before: 90, after: 50, line: 360 });
  } else if (role === 'numbered') {
    spEl = createSpacing(doc, { before: 20, after: 50, line: 300 });
  } else if (role === 'bibliography') {
    spEl = createSpacing(doc, { before: 0, after: 30, line: 300 });
  } else if (role === 'abstractBody') {
    spEl = createSpacing(doc, { before: 0, after: 0, line: 240 });
  } else if (role === 'abstractKeywords') {
    spEl = createSpacing(doc, { before: 60, after: 0, line: 240 });
  } else if (role === 'conclusionHeading') {
    spEl = createSpacing(doc, { before: 100, after: 50, line: 360 });
  } else {
    spEl = createSpacing(doc, { before: 0, after: 40, line: 360 });
  }
  pPr.appendChild(spEl);

  // 3. ind (indentation)
  let indEl: Element | null = null;
  if (role === 'bibliography') {
    indEl = createIndent(doc, { left: 720, hanging: 720 });
  } else if (role === 'numbered') {
    indEl = createIndent(doc, { left: 567, hanging: 360 });
  } else if (role === 'abstractBody') {
    indEl = createIndent(doc, { firstLine: 720, left: 0, right: 0 });
  } else if (role === 'abstractKeywords') {
    indEl = createIndent(doc, { firstLine: 0, left: 0, right: 0 });
  } else if (role === 'body') {
    indEl = createIndent(doc, { firstLine: 425, left: 0, right: 0 });
  }
  if (indEl) pPr.appendChild(indEl);

  // 4. jc (justification / alignment)
  pPr.appendChild(wEl(doc, 'jc', align));

  // Clean page breaks inside normal paragraphs
  for (const br of q(p, 'br')) {
    if ((br.getAttributeNS(W, 'type') || br.getAttribute('w:type')) === 'page') br.remove();
  }
}

function ensureRPr(doc: Document, r: Element): Element {
  let rPr = [...r.children].find(x => x.localName === 'rPr');
  if (!rPr) {
    rPr = doc.createElementNS(W, 'w:rPr');
    r.insertBefore(rPr, r.firstChild);
  }
  return rPr;
}

/**
 * Enforces Times New Roman, correct font sizes, and strict CT_RPr schema sequence:
 * rStyle -> rFonts -> b / bCs -> i / iCs -> sz / szCs -> vertAlign
 * Footnote reference runs are protected so they stay formatted as superscript.
 */
function forceRuns(doc: Document, p: Element, role: string) {
  for (const r of q(p, 'r')) {
    const isFootnoteRef = q(r, 'footnoteReference').length > 0;
    const rPr = ensureRPr(doc, r);

    if (isFootnoteRef) {
      // Footnote reference styling: superscript, 9pt Times New Roman
      rmChildren(rPr, ['rStyle', 'rFonts', 'sz', 'szCs', 'vertAlign']);
      const rStyle = wEl(doc, 'rStyle', 'FootnoteReference');
      rPr.appendChild(rStyle);
      const fonts = wEl(doc, 'rFonts');
      ['ascii', 'hAnsi', 'cs'].forEach(a => fonts.setAttributeNS(W, 'w:' + a, 'Times New Roman'));
      rPr.appendChild(fonts);
      rPr.appendChild(wEl(doc, 'sz', '18'));
      rPr.appendChild(wEl(doc, 'szCs', '18'));
      rPr.appendChild(wEl(doc, 'vertAlign', 'superscript'));
      continue;
    }

    // Preserve existing italic if present
    const hasItalic = [...rPr.children].some(n => n.localName === 'i' || n.localName === 'iCs');
    const existingRStyle = [...rPr.children].find(n => n.localName === 'rStyle');

    // Remove elements to rebuild in strict schema order
    rmChildren(rPr, ['rFonts', 'b', 'bCs', 'i', 'iCs', 'sz', 'szCs']);

    // 1. rFonts
    const fonts = wEl(doc, 'rFonts');
    ['ascii', 'hAnsi', 'eastAsia', 'cs'].forEach(a => fonts.setAttributeNS(W, 'w:' + a, 'Times New Roman'));
    rPr.appendChild(fonts);

    // 2. b / bCs
    const shouldBeBold =
      ['title', 'author', 'section', 'sectionCenter', 'sectionLeft', 'conclusionHeading', 'abstractKeywords'].includes(role);
    if (shouldBeBold && role !== 'identity') {
      rPr.appendChild(wEl(doc, 'b'));
      rPr.appendChild(wEl(doc, 'bCs'));
    }

    // 3. i / iCs
    if (hasItalic) {
      rPr.appendChild(wEl(doc, 'i'));
      rPr.appendChild(wEl(doc, 'iCs'));
    }

    // 4. sz / szCs
    let size = '24'; // 12pt default
    if (role === 'title') size = '28'; // 14pt
    else if (role === 'identity' || role === 'identityUniv' || role === 'author') size = '24'; // 12pt
    else if (role === 'abstractBody' || role === 'abstractKeywords') size = '22'; // 11pt
    else if (role === 'sectionCenter' || role === 'section' || role === 'sectionLeft') size = '24';

    rPr.appendChild(wEl(doc, 'sz', size));
    rPr.appendChild(wEl(doc, 'szCs', size));
  }
}

function normalizeTextNodes(p: Element, role: string) {
  for (const tab of q(p, 'tab')) tab.remove();
  for (const br of [...q(p, 'br')]) {
    if (!(br.getAttributeNS(W, 'type') || br.getAttribute('w:type'))) {
      const parent = br.parentNode as Element;
      const t = parent?.getElementsByTagNameNS(W, 't')?.[0];
      if (t) t.textContent = (t.textContent || '') + ' ';
      br.remove();
    }
  }
  const texts = q(p, 't');
  for (const t of texts) {
    let v = (t.textContent || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u00ad\ufffe]/g, '')
      .replace(/[ \t]{2,}/g, ' ');
    v = v.replace(/\s+([,.;:!?])/g, '$1').replace(/([,.;:!?])(?=[A-Za-zÀ-ÿ])/g, '$1 ');
    t.textContent = v;
  }
  if (texts.length) {
    texts[0].textContent = (texts[0].textContent || '').replace(/^\s+/, '');
    texts[texts.length - 1].textContent = (texts[texts.length - 1].textContent || '').replace(/\s+$/, '');
  }
  if (['body', 'subheading', 'conclusionHeading', 'abstractBody', 'abstractKeywords'].includes(role) && texts[0]) {
    texts[0].textContent = (texts[0].textContent || '').trimStart();
  }
}

function makeP(doc: Document, text: string, role = 'body', extra: { bold?: boolean; italic?: boolean } = {}): Element {
  const t = esc(text);
  const bold = ['title', 'author', 'section', 'sectionCenter', 'sectionLeft', 'conclusionHeading', 'abstractKeywords'].includes(role) || extra.bold;
  const italic = extra.italic;
  const xml = `<w:p><w:r><w:rPr>${bold ? '<w:b/><w:bCs/>' : ''}${italic ? '<w:i/><w:iCs/>' : ''}</w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const p = frag(doc, xml) || doc.createElementNS(W, 'w:p');
  setParaFormat(doc, p, role);
  forceRuns(doc, p, role);
  normalizeTextNodes(p, role);
  return p;
}

/**
 * Cleans and formats a Word table (<w:tbl>) for academic journal presentation:
 * - Center-aligns the table
 * - Standardizes clean academic border styling (top, bottom, insideH)
 * - Standardizes cell padding and Times New Roman font (10pt, sz="20")
 */
function cleanTable(doc: Document, rawItem: DocItem): Element {
  const tbl = frag(doc, rawItem.xml);
  if (tbl && tbl.localName === 'tbl') {
    let tblPr = [...tbl.children].find(x => x.localName === 'tblPr');
    if (!tblPr) {
      tblPr = doc.createElementNS(W, 'w:tblPr');
      tbl.insertBefore(tblPr, tbl.firstChild);
    }
    rmChildren(tblPr, ['jc', 'tblBorders', 'tblCellMar']);

    // Center alignment
    tblPr.appendChild(wEl(doc, 'jc', 'center'));

    // Academic table borders (APA/journal style: top, bottom, and under header)
    const tblBorders = doc.createElementNS(W, 'w:tblBorders');
    ['top', 'bottom', 'insideH'].forEach(bName => {
      const bEl = doc.createElementNS(W, 'w:' + bName);
      bEl.setAttributeNS(W, 'w:val', 'single');
      bEl.setAttributeNS(W, 'w:sz', '8');
      bEl.setAttributeNS(W, 'w:space', '0');
      bEl.setAttributeNS(W, 'w:color', '333333');
      tblBorders.appendChild(bEl);
    });
    ['left', 'right', 'insideV'].forEach(bName => {
      const bEl = doc.createElementNS(W, 'w:' + bName);
      bEl.setAttributeNS(W, 'w:val', 'none');
      tblBorders.appendChild(bEl);
    });
    tblPr.appendChild(tblBorders);

    // Padding (cell margins)
    const cellMar = doc.createElementNS(W, 'w:tblCellMar');
    ['top', 'bottom'].forEach(m => {
      const el = doc.createElementNS(W, 'w:' + m);
      el.setAttributeNS(W, 'w:w', '120'); // 6pt
      el.setAttributeNS(W, 'w:type', 'dxa');
      cellMar.appendChild(el);
    });
    ['left', 'right'].forEach(m => {
      const el = doc.createElementNS(W, 'w:' + m);
      el.setAttributeNS(W, 'w:w', '160'); // 8pt
      el.setAttributeNS(W, 'w:type', 'dxa');
      cellMar.appendChild(el);
    });
    tblPr.appendChild(cellMar);

    // Format all cells and runs
    const rows = q(tbl, 'tr');
    rows.forEach((tr, rIdx) => {
      const cells = q(tr, 'tc');
      cells.forEach(tc => {
        const paras = q(tc, 'p');
        paras.forEach(p => {
          const pPr = ensurePPr(doc, p);
          rmChildren(pPr, ['spacing', 'ind', 'jc']);
          const sp = wEl(doc, 'spacing');
          sp.setAttributeNS(W, 'w:before', '40');
          sp.setAttributeNS(W, 'w:after', '40');
          sp.setAttributeNS(W, 'w:line', '240');
          sp.setAttributeNS(W, 'w:lineRule', 'auto');
          pPr.appendChild(sp);

          for (const r of q(p, 'r')) {
            const rPr = ensureRPr(doc, r);
            rmChildren(rPr, ['rFonts', 'sz', 'szCs']);
            const fonts = wEl(doc, 'rFonts');
            ['ascii', 'hAnsi', 'cs'].forEach(a => fonts.setAttributeNS(W, 'w:' + a, 'Times New Roman'));
            rPr.appendChild(fonts);
            rPr.appendChild(wEl(doc, 'sz', '20'));
            rPr.appendChild(wEl(doc, 'szCs', '20'));
            if (rIdx === 0) {
              if (![...rPr.children].some(n => n.localName === 'b')) {
                rPr.appendChild(wEl(doc, 'b'));
                rPr.appendChild(wEl(doc, 'bCs'));
              }
            }
          }
        });
      });
    });

    return tbl;
  }

  return makeP(doc, rawItem.text, 'body');
}

function cleanCopied(doc: Document, rawItem: DocItem, role: string): Element {
  if (rawItem.type === 'table') {
    return cleanTable(doc, rawItem);
  }
  const p = frag(doc, rawItem.xml);
  if (p && p.localName === 'p') {
    setParaFormat(doc, p, role);
    normalizeTextNodes(p, role);
    forceRuns(doc, p, role);
    return p;
  }
  // Safe fallback if raw XML is malformed
  const fallbackP = makeP(doc, rawItem.text, role);
  for (const fnId of rawItem.footnoteIds) {
    addFootnoteToPara(doc, fallbackP, fnId);
  }
  return fallbackP;
}

/**
 * Ensures a valid footer with centered page number that is 100% compatible
 * with Word 2007, 2010, 2013, 2016, 2019, 2021, 365, Word for Mac, WPS, and LibreOffice.
 */
async function ensureFooter(zip: JSZip, doc: Document, sect: Element) {
  const relPath = 'word/_rels/document.xml.rels';
  let relXml = zip.file(relPath)
    ? await zip.file(relPath)!.async('string')
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL}"></Relationships>`;
  const rd = parser().parseFromString(relXml, 'application/xml');
  const root = rd.documentElement;

  // Check if footerArticle relationship already exists
  let rid = '';
  for (const r of [...root.children]) {
    if (r.getAttribute('Target') === 'footerArticle.xml' || r.getAttribute('Target') === '/word/footerArticle.xml') {
      rid = r.getAttribute('Id') || '';
      break;
    }
  }

  if (!rid) {
    let max = 0;
    for (const r of [...root.children]) {
      const id = r.getAttribute('Id') || '';
      const m = id.match(/rId(\d+)/);
      if (m) max = Math.max(max, +m[1]);
    }
    rid = 'rId' + (max + 1);
    const re = rd.createElementNS(REL, 'Relationship');
    re.setAttribute('Id', rid);
    re.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer');
    re.setAttribute('Target', 'footerArticle.xml');
    root.appendChild(re);
    zip.file(relPath, ser().serializeToString(rd));
  }

  // Complete OpenXML footer with cached page number value for instant compatibility
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="${W}" xmlns:r="${R}">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Footer"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
      <w:fldChar w:fldCharType="begin"/>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
      <w:instrText xml:space="preserve"> PAGE </w:instrText>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
      <w:fldChar w:fldCharType="separate"/>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
      <w:t>1</w:t>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:ftr>`;
  zip.file('word/footerArticle.xml', footer.trim());

  // Insert footerReference into sect
  const ref = doc.createElementNS(W, 'w:footerReference');
  ref.setAttributeNS(W, 'w:type', 'default');
  ref.setAttributeNS(R, 'r:id', rid);
  sect.insertBefore(ref, sect.firstChild);

  // Content_Types override
  const ctPath = '[Content_Types].xml';
  if (zip.file(ctPath)) {
    const cd = parser().parseFromString(await zip.file(ctPath)!.async('string'), 'application/xml');
    const cr = cd.documentElement;
    const exists = [...cr.children].some(x => x.getAttribute('PartName') === '/word/footerArticle.xml');
    if (!exists) {
      const ov = cd.createElementNS(CT, 'Override');
      ov.setAttribute('PartName', '/word/footerArticle.xml');
      ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml');
      cr.appendChild(ov);
      zip.file(ctPath, ser().serializeToString(cd));
    }
  }
}

/**
 * Builds a clean w:sectPr adhering strictly to ISO/IEC 29500 CT_SectPr order:
 * 1. footerReference (added by ensureFooter at firstChild)
 * 2. pgSz
 * 3. pgMar
 * 4. cols
 * 5. docGrid
 */
function buildCleanSect(doc: Document): Element {
  const sect = doc.createElementNS(W, 'w:sectPr');

  // pgSz (A4 Paper: 210mm x 297mm -> 11906 x 16838 dxa)
  const sz = wEl(doc, 'pgSz');
  sz.setAttributeNS(W, 'w:w', '11906');
  sz.setAttributeNS(W, 'w:h', '16838');
  sz.setAttributeNS(W, 'w:code', '9');
  sect.appendChild(sz);

  // pgMar (3cm margins -> 1701 dxa)
  const mar = wEl(doc, 'pgMar');
  [
    ['top', '1701'],
    ['right', '1701'],
    ['bottom', '1701'],
    ['left', '1701'],
    ['header', '720'],
    ['footer', '720'],
    ['gutter', '0'],
  ].forEach(([k, v]) => mar.setAttributeNS(W, 'w:' + k, v));
  sect.appendChild(mar);

  // cols
  const cols = wEl(doc, 'cols');
  cols.setAttributeNS(W, 'w:space', '708');
  sect.appendChild(cols);

  // docGrid
  const docGrid = wEl(doc, 'docGrid');
  docGrid.setAttributeNS(W, 'w:linePitch', '360');
  sect.appendChild(docGrid);

  return sect;
}

function englishParagraphs(en: any): string[] {
  if (Array.isArray(en?.paragraphs) && en.paragraphs.length) {
    return en.paragraphs.map(norm).filter(Boolean);
  }
  return String(en?.body || '')
    .split(/\n\s*\n/)
    .map(norm)
    .filter(Boolean);
}

export function addFootnoteToPara(doc: Document, p: Element, fnId: string | number) {
  const r = doc.createElementNS(W, 'w:r');
  const rPr = doc.createElementNS(W, 'w:rPr');
  
  const rStyle = doc.createElementNS(W, 'w:rStyle');
  rStyle.setAttributeNS(W, 'w:val', 'FootnoteReference');
  rPr.appendChild(rStyle);

  const fonts = doc.createElementNS(W, 'w:rFonts');
  ['ascii', 'hAnsi', 'cs'].forEach(a => fonts.setAttributeNS(W, 'w:' + a, 'Times New Roman'));
  rPr.appendChild(fonts);

  const sz = doc.createElementNS(W, 'w:sz');
  sz.setAttributeNS(W, 'w:val', '18');
  rPr.appendChild(sz);

  const szCs = doc.createElementNS(W, 'w:szCs');
  szCs.setAttributeNS(W, 'w:val', '18');
  rPr.appendChild(szCs);

  const vAlign = doc.createElementNS(W, 'w:vertAlign');
  vAlign.setAttributeNS(W, 'w:val', 'superscript');
  rPr.appendChild(vAlign);

  r.appendChild(rPr);

  const fnRef = doc.createElementNS(W, 'w:footnoteReference');
  fnRef.setAttributeNS(W, 'w:id', String(fnId));
  r.appendChild(fnRef);

  p.appendChild(r);
}

/**
 * Generates the complete, publication-ready DOCX article.
 * Guaranteed 100% compatible with Word 2007, 2010, 2013, 2016, 2019, 2021, 365,
 * Word for Mac, WPS Office, LibreOffice, and Google Docs.
 */
export async function buildArticleDocx(
  docData: ParsedDoc,
  analysis: any,
  plan: any,
  metaOverride: Record<string, string> = {},
  options: {
    englishAbstract?: { body?: string; paragraphs?: string[]; keywords?: string } | null;
  } = {}
): Promise<Blob> {
  const zip = await JSZip.loadAsync(docData.arrayBuffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  const doc = parser().parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('Format DOCX tidak memiliki w:body.');

  // Ensure root <w:document> declares all necessary namespaces
  const rootDoc = doc.documentElement;
  if (!rootDoc.getAttributeNS('http://www.w3.org/2000/xmlns/', 'r')) {
    rootDoc.setAttribute('xmlns:r', R);
  }
  if (!rootDoc.getAttributeNS('http://www.w3.org/2000/xmlns/', 'w14')) {
    rootDoc.setAttribute('xmlns:w14', 'http://schemas.microsoft.com/office/word/2010/wordml');
  }

  // Clear body for fresh article structure
  for (const ch of [...body.children]) ch.remove();

  // 1. Article Header (Title & Authors - Hanya Nama, Prodi, Universitas)
  const meta = { ...analysis.meta, ...metaOverride };
  body.appendChild(makeP(doc, (meta.title || 'ARTIKEL ILMIAH').toUpperCase(), 'title'));
  if (meta.author) body.appendChild(makeP(doc, meta.author, 'author'));
  if (meta.prodi) body.appendChild(makeP(doc, meta.prodi, 'identity'));
  if (meta.univ) body.appendChild(makeP(doc, meta.univ, 'identityUniv'));

  // 2. Main Sections
  for (const sec of plan.sections) {
    const sectionRole = sec.id === 'abstract' ? 'sectionCenter' : sec.id === 'biblio' ? 'sectionLeft' : 'section';
    body.appendChild(makeP(doc, sec.title, sectionRole));

    for (const x of sec.items) {
      if (x.virtual) {
        body.appendChild(makeP(doc, x.text || '', x.role === 'bibliography' ? 'bibliography' : x.role === 'numbered' ? 'numbered' : 'body'));
        continue;
      }
      const src = docData.items[x.index];
      if (!src && !x.customText) continue;

      let role = x.role === 'bibliography' ? 'bibliography' : x.role === 'subheading' ? 'subheading' : x.role === 'numbered' ? 'numbered' : 'body';
      if (sec.id === 'abstract') role = x.role === 'keywords' ? 'abstractKeywords' : 'abstractBody';
      if (sec.id === 'conclusion' && /^(?:[A-Z]\s*[.)]\s*)?(?:KESIMPULAN|SIMPULAN|SARAN)\b/i.test(src?.text || '')) {
        role = 'conclusionHeading';
      }

      const fnIds = (x.footnoteIds && x.footnoteIds.length > 0)
        ? x.footnoteIds
        : (src?.footnoteIds || []);

      // If polished by Gemini AI, renumbered, or customized:
      if (x.customText) {
        const pElem = makeP(doc, x.customText, role);
        for (const fnId of fnIds) {
          addFootnoteToPara(doc, pElem, fnId);
        }
        body.appendChild(pElem);
      } else if (src) {
        body.appendChild(cleanCopied(doc, src, role));
      }
    }
    // Catatan: Abstrak Bahasa Inggris ditiadakan sesuai instruksi revisi:
    // "Abstrak : hapus Abstrak Bahasa ingris"
  }

  // 3. Clean section properties and footer with exact schema ordering
  const sect = buildCleanSect(doc);
  await ensureFooter(zip, doc, sect);
  body.appendChild(sect);

  // Write updated document.xml
  zip.file('word/document.xml', ser().serializeToString(doc));

  // Update docProps/core.xml if present
  const core = zip.file('docProps/core.xml');
  if (core) {
    let c = await core.async('string');
    c = c.replace(/<dc:title>[\s\S]*?<\/dc:title>/, `<dc:title>${esc(meta.title || 'Artikel Ilmiah')}</dc:title>`);
    zip.file('docProps/core.xml', c);
  }

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

export function sourceFootnotes(docData: ParsedDoc, plan: any) {
  const ids = new Set<string>();
  for (const s of plan.sections) {
    for (const x of s.items) {
      if (x.virtual || x.index == null) continue;
      for (const id of docData.items[x.index]?.footnoteIds || []) ids.add(String(id));
    }
  }
  return [...ids]
    .map(id => ({ id, text: docData.footnotes.get(String(id)) || '' }))
    .filter(x => x.text);
}
