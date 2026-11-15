import type { State } from './model';

export type ToolLocation = {
 key:string; itemId:string; name:string; category:string; quantity:number; unit:string;
 status:'available'|'borrowed'|'return_pending'|'reserved'|'repair'|'unknown';
 location:string; holder:string; due:string; orderId:string;
};
export type OverviewLoan = {
 id:string; borrower:string; location:string; due:string;
 lines:{itemId:string;name:string;quantity:number;unit:string;due:string}[];
};
export type WarehouseOverview = {
 counts:{total:number;available:number;borrowed:number;repair:number;reserved:number};
 tools:ToolLocation[]; loans:OverviewLoan[];
};

// Shared read-only view. Never include employee emails, order ownership keys,
// private notes, purpose, history, return requests or notification recipients.
export function warehouseOverview(state:State):WarehouseOverview {
 const items=state.items.filter(item=>!item.deleted);
 const byId=new Map(state.items.map(item=>[item.id,item]));
 const tools:ToolLocation[]=[];
 const loans:OverviewLoan[]=[];
 let borrowed=0,reserved=0;
 const held=new Map<string,number>();
 for(const order of state.orders){
  if(!['borrowed','return_pending','approved'].includes(order.status))continue;
  const lines=order.lines.filter(line=>line.qty>line.returned).map(line=>({itemId:line.itemId,name:byId.get(line.itemId)?.name||line.name,quantity:line.qty-line.returned,unit:byId.get(line.itemId)?.unit||'cái',due:line.due}));
  if(!lines.length)continue;
  for(const line of lines){
   const item=byId.get(line.itemId);
   const isReserved=order.status==='approved';
   if(isReserved)reserved+=line.quantity;else borrowed+=line.quantity;
   held.set(line.itemId,(held.get(line.itemId)||0)+line.quantity);
   tools.push({key:order.id+':'+line.itemId,itemId:line.itemId,name:line.name,category:item?.category||'',quantity:line.quantity,unit:line.unit,status:isReserved?'reserved':order.status==='return_pending'?'return_pending':'borrowed',location:isReserved?(item?.location||'Kho HCM'):(order.customer||'Chưa cập nhật nơi sử dụng'),holder:order.name||'Chưa cập nhật',due:line.due,orderId:order.id});
  }
  if(order.status!=='approved')loans.push({id:order.id,borrower:order.name||'Chưa cập nhật',location:order.customer||'Chưa cập nhật nơi sử dụng',due:lines.map(line=>line.due).filter(Boolean).sort()[0]||'',lines});
 }
 for(const item of items){
  const base={itemId:item.id,name:item.name,category:item.category,unit:item.unit,holder:'—',due:'',orderId:''};
  if(item.available>0)tools.push({...base,key:item.id+':stock',quantity:item.available,status:'available',location:item.location||'Kho HCM'});
  if(item.repair>0)tools.push({...base,key:item.id+':repair',quantity:item.repair,status:'repair',location:'Chờ kiểm tra · '+(item.location||'Kho HCM')});
  const unknown=item.total-item.available-item.repair-(held.get(item.id)||0);
  if(unknown>0)tools.push({...base,key:item.id+':unknown',quantity:unknown,status:'unknown',location:'Cần Admin xác minh vị trí'});
 }
 tools.sort((a,b)=>Number(!a.orderId)-Number(!b.orderId)||(a.due||'9999').localeCompare(b.due||'9999')||a.itemId.localeCompare(b.itemId));
 loans.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id));
 return {counts:{total:items.reduce((n,item)=>n+item.total,0),available:items.reduce((n,item)=>n+item.available,0),borrowed,repair:items.reduce((n,item)=>n+item.repair,0),reserved},tools,loans};
}
