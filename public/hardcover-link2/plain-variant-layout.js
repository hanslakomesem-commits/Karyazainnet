/**
 * ZAIN.NET COVER V4.25 - dua pilihan tata letak Polos TANPA GAMBAR LOGO.
 * Koordinat PDF dihitung dari tepi atas halaman sumber 483 x 330 mm.
 * Polos V1 mengikuti identitas Serli yang sudah digunakan pengguna.
 * Polos V2 mengambil posisi teks depan dari `polos logo atas.pdf` 475 x 320 mm
 * dengan transformasi inset +4mm pada tiap sisi ke master sumber 483 x 330mm.
 * Kedua versi sengaja TIDAK memiliki gambar logo. Sebutan lama hanya nama jenis layout.
 */
export const PLAIN_V1='polos';
export const PLAIN_V2='poloslogoatas';
export const PLAIN_V11='polosv11';
export const PLAIN_V22='polosv22';
export const PLAIN_VARIANTS=Object.freeze([PLAIN_V1,PLAIN_V2,PLAIN_V11,PLAIN_V22]);
export const PLAIN_215_VARIANTS=Object.freeze([PLAIN_V11,PLAIN_V22]);
const MM_PT=72/25.4;
const INSET_X=4*MM_PT;
const INSET_Y=5*MM_PT;
export function plainFrontLayout(variant,calibration){
 if(!PLAIN_VARIANTS.includes(variant))throw Error('Varian Polos tidak dikenal');
 if(!calibration?.front_cx)throw Error('Kalibrasi depan Polos hilang');
 if(variant===PLAIN_V1||variant===PLAIN_V11){
  return {
   variant,frontCX:calibration.front_cx,
   titleY:calibration.front_title_y,titlePitch:calibration.front_title_pitch,
   typeCX:calibration.front_type_cx,typeY:calibration.front_type_y,
   labelY:calibration.front_label_y,nameY:calibration.front_name_y,nimY:calibration.front_nim_y,
   prodiY:calibration.front_prodi_y,fakultasY:calibration.front_fakultas_y,
   universitasY:calibration.front_universitas_y,tahunY:calibration.front_year_y,
   order:['nama'],
  };
 }
 // Exact text anchors measured on the new user-supplied PDF (from page top).
 const source={
  title:108.21269226074219,type:230.54241943359375,
  label:604.7308959960938,name:618.0208740234375,nim:631.3106079101562,
  prodi:752.2724609375,fakultas:765.5625,universitas:778.8521728515625,tahun:792.1422119140625
 };
 return {
  variant,frontCX:calibration.front_cx,
  titleY:source.title+INSET_Y,titlePitch:calibration.front_title_pitch,
  typeCX:calibration.front_type_cx,typeY:source.type+INSET_Y,
  labelY:source.label+INSET_Y,nameY:source.name+INSET_Y,nimY:source.nim+INSET_Y,
  prodiY:source.prodi+INSET_Y,fakultasY:source.fakultas+INSET_Y,
  universitasY:source.universitas+INSET_Y,tahunY:source.tahun+INSET_Y,
  order:['nama'],
  originalReferenceMM:{width:475,height:320},
  sourceInsetPt:{x:INSET_X,y:INSET_Y},
 };
}
/** Verify visual order and safe identity spacing without requiring any logo. */
export function plainFrontFits(layout){
 if(!layout||!Number.isFinite(layout.titleY)||!Number.isFinite(layout.frontCX))return false;
 return layout.titleY+25 < layout.typeY &&
        layout.typeY+30 < layout.labelY &&
        layout.labelY < layout.nameY && layout.nameY < layout.nimY &&
        layout.nimY+35 < layout.prodiY &&
        layout.prodiY < layout.fakultasY &&
        layout.fakultasY < layout.universitasY && layout.universitasY < layout.tahunY;
}
