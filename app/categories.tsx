'use client';
import {useState} from 'react';
type Action={type:string;name:string;newName?:string;target?:string};
const clean=(value:string)=>value.normalize('NFC').trim().replace(/\s+/g,' ');
export default function Categories({categories,items,busy,onAction}:{categories:string[];items:{category:string}[];busy:boolean;onAction:(action:Action,message:string)=>Promise<boolean>}){
 const [newName,setNewName]=useState(''),[editing,setEditing]=useState(''),[draft,setDraft]=useState(''),[deleting,setDeleting]=useState(''),[target,setTarget]=useState('');
 const count=(name:string)=>items.filter(i=>i.category===name).length;
 function edit(name:string){setDeleting('');setTarget('');setEditing(name);setDraft(name);}
 return <div className="category-manager">
  <p className="hint">Đổi tên sẽ cập nhật các vật tư trong nhóm. Xóa phân loại không xóa vật tư hoặc lịch sử mượn–trả.</p>
  <form className="category-create" onSubmit={async e=>{e.preventDefault();if(await onAction({type:'addCategory',name:clean(newName)},'Đã thêm phân loại'))setNewName('');}}><label>Phân loại mới<input required maxLength={80} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nhập tên phân loại…"/></label><button className="primary" disabled={busy||!clean(newName)}>Thêm</button></form>
  <div className="category-list">{categories.map(name=><div className="category-entry" key={name}>
   <div className="category-row"><div className="category-summary"><strong>{name}</strong><small>{count(name)} vật tư</small></div><div className="actions"><button className="textbutton" disabled={busy} onClick={()=>edit(name)}>Đổi tên</button><button className="textbutton danger" disabled={busy||categories.length<=1} onClick={()=>{setEditing('');setDeleting(name);setTarget('');}}>Xóa</button></div></div>
   {editing===name&&<form className="category-edit" onSubmit={async e=>{e.preventDefault();if(await onAction({type:'renameCategory',name,newName:clean(draft)},'Đã đổi tên phân loại'))setEditing('');}}><label>Tên phân loại mới<input required autoFocus maxLength={80} value={draft} onChange={e=>setDraft(e.target.value)}/></label><div className="actions"><button className="primary" disabled={busy||!clean(draft)||clean(draft)===name}>Lưu tên</button><button className="outline" type="button" disabled={busy} onClick={()=>setEditing('')}>Hủy</button></div></form>}
   {deleting===name&&<div className="category-delete"><p>Xóa phân loại <strong>{name}</strong>?</p>{count(name)>0?<><p className="hint">Nhóm có {count(name)} vật tư. Chọn nhóm nhận để chuyển vật tư trước khi xóa. Mã, số lượng và đơn mượn được giữ nguyên.</p><label>Chuyển vật tư sang<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Chọn phân loại thay thế</option>{categories.filter(c=>c!==name).map(c=><option key={c} value={c}>{c}</option>)}</select></label></>:<p className="hint">Nhóm trống, bạn có thể xóa ngay.</p>}<div className="actions"><button className="primary danger-fill" disabled={busy||(count(name)>0&&!target)} onClick={async()=>{if(await onAction({type:'deleteCategory',name,...(target?{target}:{})},count(name)?'Đã chuyển vật tư và xóa phân loại':'Đã xóa phân loại')){setDeleting('');setTarget('');}}}>{busy?'Đang xử lý…':count(name)?'Chuyển và xóa':'Xác nhận xóa'}</button><button className="outline" disabled={busy} onClick={()=>setDeleting('')}>Hủy</button></div></div>}
  </div>)}</div>
  {categories.length===1&&<p className="hint">Cần giữ lại ít nhất một phân loại. Bạn có thể đổi tên nhóm này hoặc thêm nhóm mới.</p>}
 </div>;
}
