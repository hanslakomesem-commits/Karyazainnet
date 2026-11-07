import JSZip from 'jszip';

/** Reads the DOCX body and real OOXML footnote IDs without asking an AI to reconstruct citations. */
export async function extractDocxSource(file: File): Promise<{
  rawText: string;
  sourceFootnotes: Record<string, string>;
}> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentEntry = zip.file('word/document.xml');
  if (!documentEntry) throw new Error('DOCX tidak memiliki word/document.xml');
  const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const parseXml = async (entry: JSZip.JSZipObject) => {
    const xml = parser.parseFromString(await entry.async('string'), 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('XML Word tidak dapat dibaca.');
    return xml;
  };
  const doc = await parseXml(documentEntry);
  const paragraphText = (p: Element, withMarkers: boolean) => {
    const chunks: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.namespaceURI === NS) {
        if (el.localName === 't' || el.localName === 'delText') {
          if (el.localName === 't') chunks.push(el.textContent || '');
          return;
        }
        if (el.localName === 'tab') { chunks.push('\t'); return; }
        if (el.localName === 'br' || el.localName === 'cr') { chunks.push('\n'); return; }
        if (withMarkers && el.localName === 'footnoteReference') {
          const id = el.getAttributeNS(NS, 'id') || el.getAttribute('w:id');
          if (id && Number(id) > 0) chunks.push(`[^${id}]`);
          return;
        }
      }
      Array.from(node.childNodes).forEach(walk);
    };
    walk(p);
    return chunks.join('').trim();
  };
  const body = doc.getElementsByTagNameNS(NS, 'body')[0];
  if (!body) throw new Error('Body dokumen Word tidak ditemukan.');
  const paragraphs = Array.from(body.getElementsByTagNameNS(NS, 'p'))
    .map(p => paragraphText(p, true)).filter(Boolean);
  if (!paragraphs.length) throw new Error('Dokumen Word tidak memuat teks yang bisa dibaca.');

  const sourceFootnotes: Record<string, string> = {};
  const footnotesEntry = zip.file('word/footnotes.xml');
  if (footnotesEntry) {
    const notesDoc = await parseXml(footnotesEntry);
    const notes = Array.from(notesDoc.getElementsByTagNameNS(NS, 'footnote'));
    for (const footnote of notes) {
      const id = footnote.getAttributeNS(NS, 'id') || footnote.getAttribute('w:id');
      if (!id || Number(id) <= 0) continue; // skips separator and continuation notes
      const lines = Array.from(footnote.getElementsByTagNameNS(NS, 'p'))
        .map(p => paragraphText(p, false)).filter(Boolean);
      if (lines.length) sourceFootnotes[id] = lines.join('\n');
    }
  }
  return { rawText: paragraphs.join('\n\n'), sourceFootnotes };
}
