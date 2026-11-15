'use client';
import {useState} from 'react';
export default function PasswordForm({required=false,admin=false,onSuccess}:{required?:boolean;admin?:boolean;onSuccess:()=>Promise<void>}){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const form=<section className={required?'loginbox':'panel'}>
  {required&&<><img src="/makino-logo.png" alt="MAKINO"/><div className="eyebrow">HCM SERVICE TOOL</div></>}
  <h2>{required?'Đổi mật khẩu lần đầu':admin?'Đổi mật khẩu Admin':'Đổi mật khẩu'}</h2>
  <p className="hint">{required?'Bạn cần đặt mật khẩu riêng trước khi sử dụng kho.':'Đổi mật khẩu sẽ đăng xuất các thiết bị khác.'}</p>
  <form onSubmit={async e=>{e.preventDefault();setError('');setMessage('');if(next!==confirm){setError('Hai lần nhập mật khẩu mới không trùng nhau.');return;}if(current===next){setError('Mật khẩu mới phải khác mật khẩu hiện tại.');return;}setBusy(true);try{const r=await fetch('/api/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current,newPassword:next})});const j:any=await r.json();if(!r.ok)throw new Error(j.error);setCurrent('');setNext('');setConfirm('');setMessage('Đã đổi mật khẩu.');await onSuccess();}catch(e){setError(e instanceof Error?e.message:'Chưa đổi được mật khẩu.');}finally{setBusy(false);}}}>
   <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" required maxLength={200} value={current} onChange={e=>setCurrent(e.target.value)}/></label>
   <label>Mật khẩu mới<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={next} onChange={e=>setNext(e.target.value)}/></label>
   <label>Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   {error&&<div className="error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}
   <button className="primary full" disabled={busy}>{busy?'Đang lưu…':required?'Đổi mật khẩu và vào kho':'Lưu mật khẩu mới'}</button>
  </form>
  {required&&<button className="textbutton full" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw new Error('Chưa đăng xuất được.');await onSuccess();}catch{setError('Chưa đăng xuất được. Vui lòng thử lại.');}finally{setBusy(false);}}}>Đăng xuất</button>}
 </section>;
 return required?<div className="loginpage">{form}</div>:form;
}
