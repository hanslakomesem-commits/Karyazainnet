/** V4.31 — title formatting recovered only from explicit font/run evidence.
 * Never infer italics from transliteration, quotes or ordinary OCR confidence.
 */
const clean=s=>String(s??'').replace(/[\u00a0\u2000-\u200b]/gu,' ').replace(/\s+/gu,' ').trim();
const normalized=s=>clean(s).normalize('NFC').toLocaleUpperCase('id-ID');
export const TRANSLITERATION_CHARS=/[\u0100-\u024f\u1e00-\u1eff\u02bb-\u02bf\u0300-\u036f\u2018\u2019\u201c\u201d]/u;
export function titleHasTransliteration(title){return TRANSLITERATION_CHARS.test(String(title??''));}
export function pdfFontLooksItalic(fontName='',style={}){
  // PDF.js fontName can be an opaque identifier; only mark if the name
  // or a provided family explicitly signals italic/oblique.
  return /(?:italic|oblique|kursiv)/iu.test(String(fontName))||
         /(?:italic|oblique|kursiv)/iu.test(String(style?.fontFamily||''));
}
export function mergeTitleSegments(segs){
 const out=[];for(const seg of segs||[]){const text=String(seg.text??'');if(!text)continue;
  const italic=!!seg.italic;
  if(out.length&&out.at(-1).italic===italic)out.at(-1).text+=text;
  else out.push({text,italic});
 }return out;
}
/** Match original title against explicit-format source tokens, preserving the
 * exact title characters (including Unicode diacritics), punctuation and case.
 * `source` may include surrounding document paragraphs. Missing/ambiguous
 * matches return no inferred italics.
 */
export function alignTitleFormatting(title, source){
 const raw=String(title??'');
 if(!raw.trim())return [];
 const spans=mergeTitleSegments(source);
 const sourceText=spans.map(s=>s.text).join('');
 if(normalized(sourceText)===normalized(raw))return projectFormatting(raw,spans);
 const wordRE=/\S+/gu;
 const targetWords=[...raw.matchAll(wordRE)],srcWords=[...sourceText.matchAll(wordRE)];
 if(!targetWords.length)return [];
 // The title may be surrounded by other paragraphs. Compare whole-token
 // signatures to avoid accidental matching of repeated ordinary words.
 const target=targetWords.map(m=>normalized(m[0])),src=srcWords.map(m=>normalized(m[0]));
 const candidates=[];
 for(let start=0;start<=src.length-target.length;start++){
  if(target.every((w,i)=>w===src[start+i]))candidates.push(start);
 }
 if(candidates.length!==1)return [];
 const start=srcWords[candidates[0]].index;
 const last=srcWords[candidates[0]+targetWords.length-1];
 const end=last.index+last[0].length;
 let off=0;const cropped=[];
 for(const span of spans){const a=off,b=a+span.text.length;off=b;
  if(b<=start||a>=end)continue;
  cropped.push({text:span.text.slice(Math.max(0,start-a),Math.min(span.text.length,end-a)),italic:span.italic});
 }
 return projectFormatting(raw,cropped);
}
function projectFormatting(target,sourceSpans){
 const source=sourceSpans.map(s=>s.text).join('');
 const segs=[];let ti=0,si=0,spanI=0,spanEnd=sourceSpans[0]?.text.length||0;
 const push=(char,ital)=>{if(segs.at(-1)?.italic===ital)segs.at(-1).text+=char;else segs.push({text:char,italic:ital});};
 while(ti<target.length){
  const t=target[ti];
  if(/\s/u.test(t)){
   // whitespace introduced by visual line splitting is non-italic
   // unless the adjacent explicit source run says otherwise.
   while(si<source.length&&/\s/u.test(source[si]))si++;
   while(si>=spanEnd&&spanI+1<sourceSpans.length)spanEnd+=sourceSpans[++spanI].text.length;
   push(t,false);ti++;continue;
  }
  while(si<source.length&&/\s/u.test(source[si]))si++;
  if(si>=source.length||normalized(source[si])!==normalized(t))return [];
  while(si>=spanEnd&&spanI+1<sourceSpans.length)spanEnd+=sourceSpans[++spanI].text.length;
  push(t,!!sourceSpans[spanI]?.italic);si++;ti++;
 }
 if(si<source.length&&source.slice(si).trim())return [];
 return mergeTitleSegments(segs);
}
