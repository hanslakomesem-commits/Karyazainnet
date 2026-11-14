/** ZAIN.NET 4.22. Dummybook only: Arimo is metrically compatible with Arial.
 * To use the genuine Microsoft Arial, upload legally owned TTF/OTF in the app.
 * No bundled fonts. All remote fonts downloaded at runtime into the visitor's browser.
 */
const ROOTS=[
 'https://raw.githubusercontent.com/googlefonts/Arimo/main/fonts/ttf/',
 'https://raw.githubusercontent.com/TypeNetwork/Arimo/master/fonts/ttf/',
 'https://raw.githubusercontent.com/arximboldi/sinusoides/master/resources/static/fonts/'
];
const caches=new Map();
async function fetchFont(name){
 if(!caches.has(name))caches.set(name,(async()=>{
   for(const root of ROOTS){
     try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
       let response;try{response=await fetch(root+name,{signal:controller.signal});}finally{clearTimeout(timer);}
       if(!response.ok)continue;
       const bytes=new Uint8Array(await response.arrayBuffer());
       if(bytes.length>10000 && bytes.length<4000000 &&
          ((bytes[0]===0&&bytes[1]===1&&bytes[2]===0&&bytes[3]===0)||String.fromCharCode(...bytes.slice(0,4))==='OTTO'))return bytes;
     }catch(e){} // Try the next font mirror.
   }
   throw new Error('Font Arial-kompatibel (Arimo) tidak bisa diunduh. Cek jaringan atau unggah font Arial Regular/Bold milik sendiri.');
 })());
 try{return await caches.get(name);}catch(e){caches.delete(name);throw e;}
}
let userRegular=null,userBold=null,userItalic=null;
export function setDummyArialFonts(regular,bold,italic=null){userRegular=regular||null;userBold=bold||null;userItalic=italic||null;}
export async function getDummyArialFontBytes(){
 if(userRegular&&userBold)return {regular:userRegular,bold:userBold,italic:userItalic||userBold,label:'Arial milik pengguna'};
 const [regular,bold]=await Promise.all([fetchFont('Arimo-Regular.ttf'),fetchFont('Arimo-Bold.ttf')]);
 // The main layout needs Bold and Regular. If BoldItalic is temporarily
 // unavailable, do not block all Dummybook orders just for occasional italics.
 const italic=await fetchFont('Arimo-BoldItalic.ttf').catch(()=>bold);
 return {regular,bold,italic,label:'Arimo (metrik kompatibel Arial)'};
}
