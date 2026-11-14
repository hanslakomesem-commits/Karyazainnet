/**
 * V4.5: Load public open-source Tinos Bold / Bold Italic over HTTPS.
 * No API key or paid tokens. Fonts are fetched by the visitor's browser when
 * producing a PDF, cached in memory and by normal browser HTTP cache.
 * Font files are not included in this source distribution.
 *
 * The user may instead upload their own legally usable Unicode fonts.
 */
export const FAMILY = 'Tinos (font Unicode, serif kompatibel Times)';
const FONT_SOURCES = Object.freeze({
 bold:[
  'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/tinos/Tinos-Bold.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/apache/tinos/Tinos-Bold.ttf',
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Bold.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/tinos/Tinos-Bold.ttf',
  'https://cdn.jsdelivr.net/gh/googlefonts/tinos@main/fonts/ttf/Tinos-Bold.ttf'
 ],
 regular:[
  'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/tinos/Tinos-Regular.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/apache/tinos/Tinos-Regular.ttf',
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Regular.ttf'
 ],
 italic:[
  'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/tinos/Tinos-BoldItalic.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/apache/tinos/Tinos-BoldItalic.ttf',
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-BoldItalic.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/tinos/Tinos-BoldItalic.ttf',
  'https://cdn.jsdelivr.net/gh/googlefonts/tinos@main/fonts/ttf/Tinos-BoldItalic.ttf'
 ]
});
const promises = new Map();
function isFont(bytes){
 if(bytes.byteLength<12000)return false;
 const v=new DataView(bytes.buffer,bytes.byteOffset,4).getUint32(0,false);
 return v===0x00010000||v===0x4f54544f||v===0x74727565||v===0x74797031;
}
async function loadFont(style, notify){
 let last='';
 for(const url of FONT_SOURCES[style]){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),9000);
  try{
   notify?.(`Menyiapkan font Unicode ${style==='bold'?'tebal':'tebal miring'}...`);
   const response=await fetch(url,{signal:controller.signal,mode:'cors',cache:'force-cache'});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(!isFont(bytes))throw Error('File unduhan bukan font TTF/OTF yang valid');
   return bytes;
  }catch(e){last=String(e?.message||e);}
  finally{clearTimeout(timeout);}
 }
 throw Error(`Font Unicode ${style} belum berhasil diunduh (${last||'jaringan gagal'}). Hubungkan internet, periksa akses jsDelivr/GitHub, atau unggah font TTF/OTF Anda pada bagian Font Unicode.`);
}
/** Successful loads remain memoized for all PDF jobs. Failures can be retried. */
function single(style,notify){
 if(!promises.has(style))promises.set(style,loadFont(style,notify).catch(e=>{promises.delete(style);throw e;}));
 return promises.get(style);
}
export async function getAutomaticUnicodeFonts(notify){
 const [bold,italic]=await Promise.all([single('bold',notify),single('italic',notify)]);
 return {bold,italic};
}
export function unicodeFontIsReady(){return promises.has('bold')&&promises.has('italic');}
export const __test={isFont,sourceCount:style=>FONT_SOURCES[style].length};

export async function getAutomaticUnicodeRegular(notify){return single('regular',notify);}
