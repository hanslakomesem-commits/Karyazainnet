import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { parseInlineFormatting } from './inlineFormatting';

export interface TemplateProfile {
  id: string;
  fileName: string;
  styles: Record<string, { name: string; type: string }>;
  paragraphStyles: string[];
  section: { pageWidth?: string; pageHeight?: string; margin?: Record<string, string>; columns?: string };
  samples: Array<{ text: string; styleId?: string }>;
  detected: { titleStyle?: string; authorStyle?: string; headingStyle?: string; bodyStyle?: string; abstractStyle?: string; referenceStyle?: string };
}

const ROOT = path.join(os.tmpdir(), 'journal-template-engine');
fs.mkdirSync(ROOT, { recursive: true });

function xmlText(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function xmlUnescape(s: string) {
  return String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function extractText(p: string) {
  return [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => xmlUnescape(m[1])).join('');
}
function unzipDir(file: string) {
  const dir = fs.mkdtempSync(path.join(ROOT, 'work-'));
  try {
    execFileSync('unzip', ['-q', file, '-d', dir]);
  } catch {
    execFileSync('python3', ['-m', 'zipfile', '-e', file, dir]);
  }
  return dir;
}
function zipDir(dir: string, out: string) {
  try {
    execFileSync('zip', ['-qr', out, '.'], { cwd: dir });
  } catch {
    execFileSync('python3', ['-c', `
import os, zipfile, sys
out = sys.argv[1]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
`, out], { cwd: dir });
  }
}
function styleId(p: string) {
  return p.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1];
}
function styleInfo(stylesXml: string) {
  const map: Record<string, { name: string; type: string }> = {};
  for (const m of stylesXml.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)) {
    const attrs = m[1]; const body = m[2];
    const id = attrs.match(/w:styleId="([^"]+)"/)?.[1];
    const type = attrs.match(/w:type="([^"]+)"/)?.[1] || 'paragraph';
    const name = body.match(/<w:name\s+w:val="([^"]+)"/)?.[1] || id || '';
    if (id) map[id] = { name, type };
  }
  return map;
}

function profileFromDir(dir: string, fileName: string, id: string): TemplateProfile {
  const doc = fs.readFileSync(path.join(dir, 'word/document.xml'), 'utf8');
  const stylesXml = fs.existsSync(path.join(dir, 'word/styles.xml')) ? fs.readFileSync(path.join(dir, 'word/styles.xml'), 'utf8') : '';
  const styles = styleInfo(stylesXml);
  const paragraphs = [...doc.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(m => m[0]);
  const samples = paragraphs.map(p => ({ text: extractText(p).trim(), styleId: styleId(p) })).filter(x => x.text).slice(0, 80);
  const candidates = samples.map(s => ({ ...s, styleName: s.styleId ? styles[s.styleId]?.name || '' : '' }));
  const heading = candidates.find(x => /heading ?[1-9]?|judul bab|subjudul/i.test(x.styleName)) || candidates.find(x => /^(abstract|abstrak|pendahuluan|metode|metode penelitian|hasil|hasil penelitian|pembahasan|kesimpulan|daftar pustaka|daftar rujukan)$/i.test(x.text));
  const title = candidates.find(x => /title|judul/i.test(x.styleName)) || candidates.find(x => x.text.length > 30 && x.text.length < 300 && candidates.indexOf(x) < 8);
  const author = candidates.find(x => /author|penulis|affiliation/i.test(x.styleName));
  const abstract = candidates.find(x => /abstract|abstrak/i.test(x.styleName));
  const ref = candidates.find(x => /bibliography|reference|daftar/i.test(x.styleName));
  const body = candidates.find(x => /normal|body|paragraph|text/i.test(x.styleName)) || candidates.find(x => x.styleId);
  const sect = doc.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] || '';
  const pgSz = sect.match(/<w:pgSz[^>]*w:w="([^"]+)"[^>]*w:h="([^"]+)"/);
  const pgMar = sect.match(/<w:pgMar[^>]*>/)?.[0];
  const margin: Record<string,string> = {};
  if (pgMar) for (const [k,v] of [['top','top'],['right','right'],['bottom','bottom'],['left','left']]) { const x = pgMar.match(new RegExp(`w:${k}="([^"]+)"`)); if (x) margin[v] = x[1]; }
  const cols = sect.match(/<w:cols[^>]*>/)?.[0];
  return { id, fileName, styles, paragraphStyles: Object.keys(styles).filter(k => styles[k].type === 'paragraph'), section: { pageWidth: pgSz?.[1], pageHeight: pgSz?.[2], margin, columns: cols }, samples,
    detected: { titleStyle: title?.styleId, authorStyle: author?.styleId, headingStyle: heading?.styleId, bodyStyle: body?.styleId, abstractStyle: abstract?.styleId, referenceStyle: ref?.styleId } };
}

export function saveAndAnalyzeTemplate(buffer: Buffer, fileName: string) {
  if (!fileName.toLowerCase().endsWith('.docx')) throw new Error('Template harus berupa file .docx.');
  const id = crypto.randomUUID();
  const file = path.join(ROOT, `${id}.docx`);
  fs.writeFileSync(file, buffer);
  const dir = unzipDir(file);
  try { return profileFromDir(dir, fileName, id); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function findExemplar(docXml: string, style?: string) {
  if (!style) return undefined;
  return [...docXml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(m => m[0]).find(p => styleId(p) === style);
}
// Serialize inline Markdown as real OpenXML runs. Never output literal emphasis delimiters.
function wordRuns(text: string, baseRunProperties = '') {
  return parseInlineFormatting(text).map(part => {
    const emphasis = `${part.bold ? '<w:b/>' : ''}${part.italic ? '<w:i/>' : ''}`;
    const properties = baseRunProperties || emphasis
      ? `<w:rPr>${baseRunProperties.replace(/^<w:rPr>|<\/w:rPr>$/g, '')}${emphasis}</w:rPr>`
      : '';
    return `<w:r>${properties}<w:t xml:space="preserve">${xmlText(part.text)}</w:t></w:r>`;
  }).join('');
}
function cloneParagraphWithText(exemplar: string | undefined, text: string, style?: string) {
  if (!exemplar) return paragraph(text, style);
  const pPr = exemplar.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || (style ? `<w:pPr><w:pStyle w:val=\"${xmlText(style)}\"/></w:pPr>` : '<w:pPr/>');
  const firstRun = exemplar.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/)?.[0];
  const rPr = firstRun?.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || '';
  return `<w:p>${pPr}${wordRuns(text, rPr)}</w:p>`;
}

function paragraph(text: string, style?: string, opts?: { bold?: boolean; center?: boolean; italic?: boolean }) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${xmlText(style)}"/></w:pPr>` : '<w:pPr/>';
  const rPr = [opts?.bold ? '<w:b/>' : '', opts?.italic ? '<w:i/>' : ''].join('');
  const jc = opts?.center ? '<w:jc w:val="center"/>' : '';
  const pPr = style ? `<w:pPr><w:pStyle w:val="${xmlText(style)}"/>${jc}</w:pPr>` : `<w:pPr>${jc}</w:pPr>`;
  const parts = String(text || '').split(/\n/);
  return `<w:p>${pPr}${wordRuns(parts.join(' '), rPr)}</w:p>`;
}
function contentParagraphs(text: string, style?: string) {
  return String(text || '').replace(/\r/g, '').split(/\n{2,}|\n(?=\s*\n)/).map(s => s.trim()).filter(Boolean).flatMap(block => {
    const lines = block.split(/\n/).map(x => x.trim()).filter(Boolean);
    return lines.length === 1 ? [paragraph(lines[0], style)] : [paragraph(lines.join(' '), style)];
  });
}
function headingParagraph(text: string, style?: string) { return paragraph(text, style, { bold: !style }); }

export function applyTemplateToArticle(templateId: string, article: any, outPath: string) {
  const file = path.join(ROOT, `${templateId}.docx`);
  if (!fs.existsSync(file)) throw new Error('Template tidak ditemukan. Silakan upload template lagi.');
  const dir = unzipDir(file);
  try {
    const docPath = path.join(dir, 'word/document.xml');
    let doc = fs.readFileSync(docPath, 'utf8');
    const sectMatch = doc.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
    const sectPr = sectMatch?.[0] || '<w:sectPr/>';
    const stylesXml = fs.existsSync(path.join(dir, 'word/styles.xml')) ? fs.readFileSync(path.join(dir, 'word/styles.xml'), 'utf8') : '';
    const profile = profileFromDir(dir, '', templateId);
    const st = profile.detected;
    const body: string[] = [];
    const exTitle = findExemplar(doc, st.titleStyle);
    const exAuthor = findExemplar(doc, st.authorStyle);
    const exHeading = findExemplar(doc, st.headingStyle);
    const exBody = findExemplar(doc, st.bodyStyle);
    const exAbstract = findExemplar(doc, st.abstractStyle || st.bodyStyle);
    const exRef = findExemplar(doc, st.referenceStyle || st.bodyStyle);
    const p = (text: string, ex?: string, style?: string) => cloneParagraphWithText(ex, text, style);
    body.push(p(article.metadata?.judul || 'ARTIKEL ILMIAH', exTitle, st.titleStyle));
    if (article.metadata?.nama) body.push(p(article.metadata.nama, exAuthor || exBody, st.authorStyle || st.bodyStyle));
    if (article.metadata?.prodi || article.metadata?.instansi || article.metadata?.email) body.push(p([article.metadata.prodi, article.metadata.instansi, article.metadata.email].filter(Boolean).join(' | '), exAuthor || exBody, st.authorStyle || st.bodyStyle));
    body.push(p('ABSTRAK', exHeading, st.headingStyle));
    body.push(...String(article.abstract?.abstrakIndo || '').split(/\n{2,}/).map((x: string) => x.trim()).filter(Boolean).map((x: string) => p(x.replace(/\n+/g, ' '), exAbstract || exBody, st.abstractStyle || st.bodyStyle)));
    if (article.abstract?.keywordsIndo?.length) body.push(p(`Kata kunci: ${article.abstract.keywordsIndo.join('; ')}`, exAbstract || exBody, st.abstractStyle || st.bodyStyle));
    if (article.abstract?.abstrakEnglish) { body.push(p('ABSTRACT', exHeading, st.headingStyle)); body.push(...String(article.abstract.abstrakEnglish).split(/\n{2,}/).map((x: string) => x.trim()).filter(Boolean).map((x: string) => p(x.replace(/\n+/g, ' '), exAbstract || exBody, st.abstractStyle || st.bodyStyle))); if (article.abstract.keywordsEnglish?.length) body.push(p(`Keywords: ${article.abstract.keywordsEnglish.join('; ')}`, exAbstract || exBody, st.abstractStyle || st.bodyStyle)); }
    const sections: Array<[string,string]> = [['PENDAHULUAN', article.pendahuluan],['METODE PENELITIAN', article.metode],['HASIL PENELITIAN', article.hasil],['PEMBAHASAN', article.pembahasan],['KESIMPULAN DAN SARAN', article.kesimpulan]];
    for (const [title, text] of sections) { body.push(p(title, exHeading, st.headingStyle)); body.push(...String(text || '').split(/\n{2,}/).map((x: string) => x.trim()).filter(Boolean).map((x: string) => p(x.replace(/\n+/g, ' '), exBody, st.bodyStyle))); }
    body.push(p('DAFTAR RUJUKAN', exHeading, st.referenceStyle || st.headingStyle));
    for (const ref of (article.daftarPustaka || [])) body.push(p(ref, exRef || exBody, st.referenceStyle || st.bodyStyle));
    // Keep the template's section properties: margins, columns, page size, header/footer references and numbering remain untouched.
    const newBody = `<w:body>${body.join('')}${sectPr}</w:body>`;
    doc = doc.replace(/<w:body>[\s\S]*?<\/w:body>/, newBody);
    fs.writeFileSync(docPath, doc);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    zipDir(dir, outPath);
    return profile;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export function getTemplatePath(id: string) { return path.join(ROOT, `${id}.docx`); }
