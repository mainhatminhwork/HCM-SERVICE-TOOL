'use client';
import {useEffect,useState} from 'react';
type Employee={id:string;code:string;name:string;email:string;active:boolean;mustChangePassword:boolean};
type Legacy={email:string;name:string};
const blank={id:'',code:'',name:'',email:'',password:'',legacyEmail:''};
export default function Employees(){
 const [employees,setEmployees]=useState<Employee[]>([]),[legacy,setLegacy]=useState<Legacy[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[mode,setMode]=useState(''),[form,setForm]=useState({...blank});
 const [search,setSearch]=useState('');
 async function request(body?:unknown){
  const r=await fetch('/api/employees',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
  const j:any=await r.json();if(!r.ok)throw new Error(j.error||'Không thể tải danh sách nhân viên.');
  setEmployees(j.employees);setLegacy(j.legacyAccounts);
 }
 useEffect(()=>{request().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function save(body:unknown,success:string){setBusy(true);setError('');setMessage('');try{await request(body);setMode('');setForm({...blank});setMessage(success);}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được thay đổi.');}finally{setBusy(false);}}
 function open(kind:string,e?:Employee,l?:Legacy){setError('');setMessage('');setMode(kind);setForm(e?{...blank,...e}:l?{...blank,name:l.name,email:l.email,legacyEmail:l.email}:{...blank});}
 const found=employees.filter(e=>(e.code+' '+e.name+' '+e.email).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
 return <section className="panel employee-panel">
  <div className="employee-heading"><div><h2>Quản lý nhân viên</h2><p className="muted">Tạo mã nhân viên để cấp quyền đăng nhập User.</p></div><button className="primary" disabled={busy} onClick={()=>open('create')}>Thêm nhân viên</button></div>
  {error&&<div className="error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}
  {mode&&<form className="employee-form" onSubmit={e=>{e.preventDefault();save(mode==='reset'?{action:'resetPassword',id:form.id,password:form.password}:{...form,action:mode},mode==='reset'?'Đã đặt lại mật khẩu. Nhân viên cần đổi mật khẩu khi đăng nhập.':mode==='create'?'Đã tạo nhân viên. Hãy gửi mã và mật khẩu ban đầu trực tiếp cho nhân viên.':'Đã lưu thông tin nhân viên.');}}>
   <h3>{mode==='reset'?'Đặt lại mật khẩu · '+form.code:mode==='update'?'Sửa nhân viên':'Thêm nhân viên'}</h3>
   {form.legacyEmail&&<p className="hint">Liên kết tài khoản cũ {form.legacyEmail}; giữ nguyên lịch sử mượn–trả.</p>}
   {mode!=='reset'&&<><div className="formrow"><label>Mã nhân viên<input required autoComplete="off" maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,39}" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="VD: NV001"/></label><label>Họ và tên<input required autoComplete="off" minLength={2} maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nguyễn Văn An"/></label></div><label>Email nhận thông báo <span className="muted">(không bắt buộc)</span><input type="email" autoComplete="off" maxLength={254} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="ten@congty.com"/></label></>}
   {mode!=='update'&&<><label>{mode==='reset'?'Mật khẩu tạm thời mới':'Mật khẩu ban đầu'}<input type="password" required autoComplete="new-password" minLength={8} maxLength={200} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><p className="hint">Tối thiểu 8 ký tự. Nhân viên bắt buộc đổi mật khẩu sau khi đăng nhập. Các phiên cũ sẽ hết hiệu lực khi đặt lại mật khẩu.</p></>}
   <div className="actions"><button className="primary" type="submit" disabled={busy}>{busy?'Đang lưu…':'Lưu'}</button><button className="outline" type="button" disabled={busy} onClick={()=>{setMode('');setForm({...blank});setError('');}}>Hủy</button></div>
  </form>}
  {legacy.length>0&&<div className="legacy-accounts"><h3>Tài khoản Gmail cũ</h3><p className="hint">Cấp mã nhân viên cho từng tài khoản để họ đăng nhập bằng mật khẩu và tiếp tục xem lịch sử cũ.</p>{legacy.map(l=><div className="member" key={l.email}><span>{l.name||l.email}{l.name&&<small className="muted"> · {l.email}</small>}</span><button className="textbutton" disabled={busy} onClick={()=>open('create',undefined,l)}>Cấp mã nhân viên</button></div>)}</div>}
  <label className="employee-search">Tìm nhân viên<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mã nhân viên, họ tên hoặc email…"/></label>
  {loading?<p role="status">Đang tải nhân viên…</p>:employees.length===0?<p className="hint">Chưa có nhân viên. Chọn “Thêm nhân viên” để bắt đầu.</p>:<div className="employee-table-wrap"><table className="employee-table"><thead><tr><th>Mã nhân viên</th><th>Họ tên</th><th>Email</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{found.map(e=><tr key={e.id}><td><strong>{e.code}</strong></td><td>{e.name}</td><td>{e.email||'Chưa có email'}</td><td><span className={'employee-status '+(e.active?'enabled':'disabled')}>{e.active?'Hoạt động':'Đã khóa'}</span>{e.active&&e.mustChangePassword&&<small className="employee-password-hint">Cần đổi mật khẩu</small>}</td><td><div className="actions"><button className="textbutton" disabled={busy} onClick={()=>open('update',e)}>Sửa</button><button className="textbutton" disabled={busy} onClick={()=>open('reset',e)}>Đặt lại mật khẩu</button><button className={'textbutton '+(e.active?'danger':'')} disabled={busy} onClick={()=>save({action:'setActive',id:e.id,active:!e.active},e.active?'Đã khóa tài khoản và thu hồi các phiên đăng nhập.':'Đã mở khóa tài khoản. Nhân viên có thể đăng nhập lại.')}>{e.active?'Khóa':'Mở khóa'}</button></div></td></tr>)}</tbody></table>{!found.length&&<p className="hint">Không tìm thấy nhân viên phù hợp.</p>}</div>}
 </section>;
}
