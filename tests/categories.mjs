import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir=new URL('../.sites-runtime/category-tests/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
for(const name of ['model.ts','mail.ts'])fs.copyFileSync(new URL('../lib/'+name,import.meta.url),new URL(name,dir));
fs.writeFileSync(new URL('operations.ts',dir),fs.readFileSync(new URL('../lib/operations.ts',import.meta.url),'utf8').replace("from './mail'","from './mail.ts'").replace("import { State, emptyState, samples, today } from './model';","import { samples, today } from './model.ts';\nimport type { State } from './model.ts';"));
const {emptyState,samples,today}=await import(new URL('model.ts',dir));
const {mutate}=await import(new URL('operations.ts',dir));
const admin={userId:'admin',email:'admin@example.test',displayName:'Admin'};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const state=()=>({...emptyState(),categories:['Dụng cụ','Thiết bị đo','Phụ kiện'],items:samples()});
const run=(s,a,allowed=true)=>mutate(s,a,admin,allowed);
const rejectsUnchanged=(s,a,allowed=true)=>{const before=JSON.stringify(s);assert.throws(()=>run(s,a,allowed));assert.equal(JSON.stringify(s),before);};
test('Only Admin can add, rename or remove categories',()=>{for(const action of [{type:'addCategory',name:'New'},{type:'renameCategory',name:'Dụng cụ',newName:'New'},{type:'deleteCategory',name:'Dụng cụ',target:'Phụ kiện'}])rejectsUnchanged(state(),action,false);});
test('Names are normalized, bounded, case-insensitively unique and cannot shadow All filter',()=>{
 const s=state();run(s,{type:'addCategory',name:'  Nhóm   mới  '});assert.ok(s.categories.includes('Nhóm mới'));
 for(const name of ['DỤNG CỤ','tẤt cẢ','', 'X'.repeat(81)])rejectsUnchanged(s,{type:'addCategory',name});
 for(const newName of ['THIẾT BỊ ĐO','Tất cả','', 'X'.repeat(81)])rejectsUnchanged(s,{type:'renameCategory',name:'Dụng cụ',newName});
});
test('Rename updates items including archived items and keeps IDs, stock, images and order history',()=>{
 const s=state(),item=s.items.find(i=>i.category==='Dụng cụ');item.available-=1;item.image='/api/files?id=11111111-1111-1111-1111-111111111111';
 s.items.push({...item,id:'archived',deleted:true});
 s.orders=[{id:'M-1',userId:'employee:test',name:'Person',status:'borrowed',lines:[{itemId:item.id,name:item.name,qty:1,returned:0,due:today()}],history:[{text:'Original history'}]}];
 const orders=JSON.stringify(s.orders),original=s.items.map(i=>({...i}));
 run(s,{type:'renameCategory',name:'Dụng cụ',newName:'Dụng cụ bảo trì'});
 assert.ok(!s.categories.includes('Dụng cụ'));assert.ok(s.categories.includes('Dụng cụ bảo trì'));
 for(let n=0;n<s.items.length;n++)assert.deepEqual(s.items[n],{...original[n],category:original[n].category==='Dụng cụ'?'Dụng cụ bảo trì':original[n].category});
 assert.equal(JSON.stringify(s.orders),orders);assert.match(s.audit[0].text,/Đổi tên/);
});
test('Case-only rename is allowed while missing categories are rejected',()=>{
 const s=state();run(s,{type:'renameCategory',name:'Dụng cụ',newName:'DỤNG CỤ'});assert.ok(s.categories.includes('DỤNG CỤ'));
 rejectsUnchanged(s,{type:'renameCategory',name:'Missing',newName:'New'});rejectsUnchanged(s,{type:'deleteCategory',name:'Missing'});
});
test('Empty category can be deleted without changing items',()=>{const s=state();run(s,{type:'addCategory',name:'Nhóm trống'});const items=JSON.stringify(s.items);run(s,{type:'deleteCategory',name:'Nhóm trống'});assert.ok(!s.categories.includes('Nhóm trống'));assert.equal(JSON.stringify(s.items),items);});
test('Occupied category requires an existing distinct replacement before any changes',()=>{
 const s=state();for(const target of [undefined,'Dụng cụ','Missing',{}])rejectsUnchanged(s,{type:'deleteCategory',name:'Dụng cụ',target});
});
test('Transfer and deletion preserve quantities and IDs; removed category stays removed',()=>{
 const s=state(),before=s.items.map(i=>({...i}));run(s,{type:'deleteCategory',name:'Dụng cụ',target:'Phụ kiện'});
 assert.deepEqual(s.categories,['Thiết bị đo','Phụ kiện']);
 for(let n=0;n<s.items.length;n++)assert.deepEqual(s.items[n],{...before[n],category:before[n].category==='Dụng cụ'?'Phụ kiện':before[n].category});
 run(s,{type:'addCategory',name:'Nhóm sau'});assert.ok(!s.categories.includes('Dụng cụ'));
});
test('The final category cannot be removed',()=>{const s={...emptyState(),categories:['Nhóm duy nhất']};rejectsUnchanged(s,{type:'deleteCategory',name:'Nhóm duy nhất'});});
console.log('PASS '+checks+' category management scenarios.');
