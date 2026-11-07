/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Strict stack-based XML tag sanitizer for Microsoft Word OOXML documents.
 * Ensures all tags (<w:txbxContent>, <mc:AlternateContent>, <w:p>, etc.)
 * are 100% strictly nested and closed within their parent tag boundaries.
 */
export function sanitizeXmlTags(xml: string): string {
  const tagRegex = /<(\/)?([a-zA-Z0-9_:-]+)(?:\s+[^>]*?)?(\/)?>/g;
  let match;
  const stack: { tagName: string; index: number }[] = [];
  let result = '';

  while ((match = tagRegex.exec(xml)) !== null) {
    const isClose = !!match[1];
    const tagName = match[2];
    const isSelfClose = !!match[3] || match[0].endsWith('/>');

    if (tagName.startsWith('?') || tagName.startsWith('!')) continue;
    if (isSelfClose) continue;

    if (!isClose) {
      stack.push({ tagName, index: match.index });
    } else {
      if (stack.length > 0 && stack[stack.length - 1].tagName === tagName) {
        stack.pop();
      } else {
        // Tag mismatch found!
        const idx = stack.map((s) => s.tagName).lastIndexOf(tagName);
        if (idx !== -1) {
          // Unclosed tags between idx and top of stack!
          const unclosed = stack.splice(idx);
          unclosed.shift(); // remove matching tagName
          // insert closing tags for all unclosed tags before this closing tag
          const closingXml = unclosed
            .reverse()
            .map((u) => `</${u.tagName}>`)
            .join('');
          result = xml.substring(0, match.index) + closingXml + xml.substring(match.index);
          return sanitizeXmlTags(result); // Recursively re-check
        } else {
          // Extra orphan closing tag! Remove it
          result = xml.substring(0, match.index) + xml.substring(match.index + match[0].length);
          return sanitizeXmlTags(result); // Recursively re-check
        }
      }
    }
  }

  if (stack.length > 0) {
    // Unclosed tags remaining at the end of the document
    const closingXml = stack
      .reverse()
      .map((u) => `</${u.tagName}>`)
      .join('');
    const endBody = xml.lastIndexOf('</w:body>');
    if (endBody !== -1) {
      return xml.substring(0, endBody) + closingXml + xml.substring(endBody);
    }
    return xml + closingXml;
  }

  return xml;
}
