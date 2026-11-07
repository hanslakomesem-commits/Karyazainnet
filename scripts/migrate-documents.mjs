// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-documents.mjs export.json uid-map.json [--apply]
// export.json = [{"path":"users/OLD_UID/data/quotas","data":{"art-7":2}}, ...]
// uid-map.json = {"OLD_UID":"NEW_SUPABASE_UUID"}. Create/reset Auth accounts before importing.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const [source,mapFile,flag]=process.argv.slice(2);
if(!source || !mapFile) throw new Error('Berikan export.json dan uid-map.json; default hanya dry-run.');
const rows=JSON.parse(fs.readFileSync(source,'utf8'));
const mapping=JSON.parse(fs.readFileSync(mapFile,'utf8'));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const output=[];let skipped=0;
for(const row of rows){
 if(typeof row.path!=='string'||!row.data) throw new Error('Format export salah');
 if(row.path.startsWith('auth_accounts/')) {skipped++;continue;} // Password hashes must never be uploaded.
 let path=row.path;const payload=structuredClone(row.data);
 if(path.startsWith('users/')){
  const parts=path.split('/');const uid=mapping[parts[1]];
  if(!uid||!uuid.test(uid)) throw new Error(`UID mapping belum tersedia untuk ${parts[1]}`);
  parts[1]=uid;path=parts.join('/');
 }
 for(const field of ['uid','userId','claimedByUid']) if(payload[field] && payload[field]!=='guest') {
  if(!mapping[payload[field]]) throw new Error(`UID mapping belum tersedia: ${payload[field]}`);
  payload[field]=mapping[payload[field]];
 }
 delete payload.passwordHash;delete payload.adminPinCode;
 output.push({path,parent_path:path.slice(0,path.lastIndexOf('/')),payload});
}
console.log(`${output.length} dokumen siap, ${skipped} akun/hash dilewati. File asal tidak diubah.`);
if(flag!=='--apply'){console.log('DRY RUN: tidak ada data dikirim. Tambahkan --apply setelah backup dan review mapping.');process.exit(0);}
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Isi environment server Supabase.');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
for(let n=0;n<output.length;n+=100){
 const {error}=await db.from('academic_documents').upsert(output.slice(n,n+100),{onConflict:'path',ignoreDuplicates:true});
 if(error) throw error;
}
console.log('Import selesai. Dokumen yang sudah ada tidak ditimpa.');
