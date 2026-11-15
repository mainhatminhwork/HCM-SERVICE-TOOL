'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, X, Bell, MapPin, Package, ClipboardList } from 'lucide-react';
import type { OverviewLoan, WarehouseOverview } from '../lib/overview';
import { today } from '../lib/model';

const statuses={available:'Tại kho',borrowed:'Đang mượn',return_pending:'Chờ nhận trả',reserved:'Đã giữ chỗ',repair:'Cần kiểm tra',unknown:'Cần xác minh'};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const date=(value:string)=>value?value.split('-').reverse().join('/'):'—';
export function dueLabel(value:string,now=today()){
 if(!value)return {text:'Chưa có hạn trả',level:'neutral'};
 const days=Math.round((Date.parse(value+'T00:00:00Z')-Date.parse(now+'T00:00:00Z'))/86400000);
 return days<0?{text:`Quá ${-days} ngày`,level:'late'}:days===0?{text:'Hôm nay',level:'today'}:{text:`Còn ${days} ngày`,level:'future'};
}

export default function Overview({data}:{data:WarehouseOverview}){
 const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[loanId,setLoanId]=useState('');
 const scroll=useRef<HTMLDivElement>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const loan=data.loans.find(row=>row.id===loanId);
 const now=today();
 const late=data.loans.filter(row=>row.due&&row.due<now).length;
 const dueToday=data.loans.filter(row=>row.due===now).length;
 const rows=data.tools.filter(row=>(status==='all'||row.status===status)&&normalize([row.itemId,row.name,row.holder,row.location,row.orderId].join(' ')).includes(normalize(query.trim())));
 useEffect(()=>{if(scroll.current)scroll.current.scrollTop=0;},[query,status]);
 useEffect(()=>{const element=dialog.current;if(loan){if(element&&!element.open)element.showModal();}else if(element?.open)element.close();},[loan]);
 function openLoan(row:OverviewLoan){setLoanId(row.id);}
 return <div className="overview">
  <div className="overview-stats">
   <div><span>Tổng đồ nghề</span><strong>{data.counts.total}</strong><small>{new Set(data.tools.map(row=>row.itemId)).size} mã vật tư</small></div>
   <div><span>Tại kho</span><strong>{data.counts.available}</strong><small>Sẵn sàng cho mượn</small></div>
   <div><span>Đang mượn</span><strong>{data.counts.borrowed}</strong><small>{late} phiếu quá hạn</small></div>
   <div><span>Cần kiểm tra</span><strong>{data.counts.repair}</strong><small>{data.counts.reserved?`${data.counts.reserved} đồ khác đã giữ chỗ`:'Tạm ngừng cho mượn'}</small></div>
  </div>
  <section className="panel overview-panel" aria-labelledby="overview-reminders">
   <div className="overview-heading"><h2 id="overview-reminders"><Bell size={18}/>Nhắc hạn trả</h2><span className={'overview-reminder-count'+(late?' has-late':'')}>{late} phiếu quá hạn · {dueToday} đến hạn hôm nay</span></div>
   {data.loans.length?<div className="overview-tablewrap overview-reminder-scroll"><table className="overview-table reminder-table"><thead><tr><th>Phiếu mượn</th><th>Người mượn</th><th>Hạn trả</th><th>Nhắc hạn</th></tr></thead><tbody>{data.loans.map(row=>{const due=dueLabel(row.due,now);return <tr key={row.id}><td><button className="overview-link" onClick={()=>openLoan(row)} aria-haspopup="dialog">{row.id}</button></td><td>{row.borrower}</td><td>{date(row.due)}</td><td><span className={'overview-badge '+due.level}>{due.text}</span></td></tr>;})}</tbody></table></div>:<div className="overview-empty"><ClipboardList size={25}/><span>Không có phiếu mượn cần nhắc hạn.</span></div>}
  </section>
  <section className="panel overview-panel" aria-labelledby="overview-tools">
   <div className="overview-heading"><div><h2 id="overview-tools"><MapPin size={18}/>Đồ nghề đang ở đâu? <span className="overview-count">{rows.length} mục</span></h2><p>Theo dõi mã dụng cụ, vị trí và người đang sử dụng.</p></div></div>
   <div className="overview-toolbar"><div className="search"><Search size={19}/><input aria-label="Tìm mã, tên, người giữ hoặc công ty" placeholder="Tìm mã, tên, người giữ hoặc công ty…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button aria-label="Xóa tìm kiếm" onClick={()=>setQuery('')}><X size={16}/></button>}</div><select aria-label="Lọc trạng thái đồ nghề" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
   <div className="overview-tablewrap overview-tool-scroll" ref={scroll} role="region" aria-label="Danh sách đồ nghề, cuộn hoặc vuốt để xem thêm"><table className="overview-table tool-table"><thead><tr><th>Mã / Dụng cụ</th><th>Trạng thái</th><th>Vị trí hiện tại</th><th>Người giữ</th><th>Hạn trả</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><td><strong>{row.itemId}</strong><small>{row.name}</small><small className="overview-quantity">{row.quantity} {row.unit}</small></td><td><span className={'overview-badge '+row.status}>{statuses[row.status]}</span></td><td><span className="overview-celltext">{row.location}</span></td><td>{row.holder}{row.orderId&&<small><button className="overview-link" onClick={()=>{const found=data.loans.find(loan=>loan.id===row.orderId);if(found)openLoan(found);}} disabled={!data.loans.some(loan=>loan.id===row.orderId)}>{row.orderId}</button></small>}</td><td>{date(row.due)}{row.due&&row.due<now&&row.status!=='reserved'&&<small className="overview-late">Quá hạn</small>}</td></tr>)}</tbody></table>{!rows.length&&<div className="overview-empty"><Package size={25}/><span>{data.tools.length?'Không tìm thấy dụng cụ phù hợp.':'Chưa có đồ nghề trong kho.'}</span></div>}</div>
   <div className="overview-tablefoot">Hiển thị tối đa 5 mục mỗi khung. Cuộn chuột hoặc vuốt trong bảng để xem thêm.</div>
  </section>
  <dialog ref={dialog} className="overview-dialog" onCancel={()=>setLoanId('')} onClose={()=>setLoanId('')} onClick={event=>{if(event.target===event.currentTarget)setLoanId('');}} aria-labelledby="overview-loan-title">
   {loan&&<><div className="sheethead"><div><small>CHI TIẾT PHIẾU MƯỢN</small><h2 id="overview-loan-title">{loan.id}</h2></div><button aria-label="Đóng phiếu mượn" onClick={()=>setLoanId('')}><X size={20}/></button></div><div className="review-info"><span>Người mượn<strong>{loan.borrower}</strong></span><span>Nơi sử dụng<strong>{loan.location}</strong></span><span>Hạn trả gần nhất<strong>{date(loan.due)} · {dueLabel(loan.due,now).text}</strong></span></div><h3 className="overview-loan-heading">Đồ nghề chưa trả</h3><div className="overview-tablewrap"><table className="overview-table"><thead><tr><th>Mã / Dụng cụ</th><th>Còn mượn</th><th>Hạn trả</th></tr></thead><tbody>{loan.lines.map(line=><tr key={line.itemId}><td><strong>{line.itemId}</strong><small>{line.name}</small></td><td>{line.quantity} {line.unit}</td><td>{date(line.due)}</td></tr>)}</tbody></table></div><p className="hint">Vị trí là nơi sử dụng được khai báo trong phiếu mượn.</p></>}
  </dialog>
 </div>;
}
