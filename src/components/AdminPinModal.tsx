import React,{useState} from 'react';
import type {RolesConfig,AppUser} from '../types';
import {database} from '../storage/client';
import {mapAuthUser,auth} from '../firebase';
interface AdminPinModalProps {isOpen?:boolean;onClose:()=>void;onSuccess?:()=>void;rolesConfig?:RolesConfig;onSuccessLogin?:(userOrEmail:string|AppUser,displayName?:string)=>Promise<void>|void}
export const ADMIN_DEFAULT_PIN='';
export const AdminPinModal:React.FC<AdminPinModalProps>=({isOpen=true,onClose,onSuccess,onSuccessLogin})=>{
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(!isOpen)return null;
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{
   const {data,error}=await database().auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
   if(data.user.app_metadata?.academic_role!=='admin')throw new Error('Akun ini bukan admin.');
   const user=mapAuthUser(data.user) as unknown as AppUser;auth.currentUser=user;
   await onSuccessLogin?.(user);onSuccess?.();onClose();
 }catch(e:any){setError(e.message);}finally{setBusy(false);}};
 return <div className="fixed inset-0 z-[100] bg-slate-950/90 flex items-center justify-center p-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-slate-900 p-6 space-y-4 text-white"><h2 className="text-xl font-bold">Masuk Admin</h2><p className="text-sm text-slate-300">Gunakan akun admin yang terdaftar.</p><input aria-label="Email admin" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email admin" className="w-full bg-slate-800 p-3 rounded"/><input aria-label="Kata sandi" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Kata sandi" className="w-full bg-slate-800 p-3 rounded"/>{error&&<p role="alert" className="text-red-300">{error}</p>}<button disabled={busy} className="bg-blue-600 rounded p-3 w-full">{busy?'Memeriksa…':'Masuk'}</button><button type="button" onClick={onClose}>Kembali</button></form></div>;
};
