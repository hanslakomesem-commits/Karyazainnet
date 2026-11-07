import React, {useEffect,useState} from 'react';
export function SyncStatusBanner() {
 const [message,setMessage]=useState('');
 useEffect(()=>{
   const handler=(e:Event)=>{const d=(e as CustomEvent).detail;setMessage(d?.ok?'':`Hasil sudah dibuat, tetapi sinkronisasi akun tertunda: ${d?.message||'Periksa koneksi. Sistem mencoba lagi otomatis.'}`);};
   window.addEventListener('zain_sync_status',handler);return()=>window.removeEventListener('zain_sync_status',handler);
 },[]);
 return message?<div role="alert" className="fixed bottom-3 left-3 right-3 z-[100] bg-amber-100 text-amber-950 p-3 rounded-xl shadow-lg text-sm">{message}</div>:null;
}
