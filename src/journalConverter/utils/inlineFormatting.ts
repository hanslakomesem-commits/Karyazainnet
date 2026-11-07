/**
 * Convert simple Gemini/Markdown inline emphasis into real Word/web formatting.
 * Preserves footnote markers like [^1], plain asterisks in calculations and
 * unmatched delimiters instead of deleting potentially meaningful text.
 */
export interface InlinePart {
  text: string;
  bold: boolean;
  italic: boolean;
}

export function parseInlineFormatting(source: string | null | undefined): InlinePart[] {
  const text = String(source ?? '');
  const matches = /\*\*\*([^*\n]+)\*\*\*|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|__([^_\n]+)__|_([^_\n]+)_|<em>([^\n]*?)<\/em>|<i>([^\n]*?)<\/i>|<strong>([^\n]*?)<\/strong>|<b>([^\n]*?)<\/b>/gi;
  const output: InlinePart[] = [];
  let start = 0;
  let match: RegExpExecArray | null;
  const push = (str: string, bold: boolean, italic: boolean) => {
    if (!str) return;
    const last = output[output.length - 1];
    if (last && last.bold === bold && last.italic === italic) last.text += str;
    else output.push({ text: str, bold, italic });
  };
  while ((match = matches.exec(text))) {
    const openIdx = match.index;
    const raw = match[0];
    // Avoid treating 4*5*2 or foo_bar_baz as formatting.
    const isTag = raw.startsWith('<');
    const leading = openIdx > 0 ? text[openIdx - 1] : '';
    const trailing = text[openIdx + raw.length] || '';
    if (!isTag && ((/\w/.test(leading)) || (/\w/.test(trailing)))) continue;
    const inner = match.slice(1).find(v => v !== undefined);
    if (!inner || !inner.trim()) continue;
    push(text.slice(start, openIdx), false, false);
    const bold = !!(match[1] || match[2] || match[4] || match[9]);
    const italic = !!(match[1] || match[3] || match[5] || match[6] || match[7]);
    push(inner, bold, italic);
    start = openIdx + raw.length;
  }
  push(text.slice(start), false, false);
  return output.length ? output : [{ text, bold: false, italic: false }];
}

export function stripInlineFormatting(source: string | null | undefined): string {
  return parseInlineFormatting(source).map(part => part.text).join('');
}
