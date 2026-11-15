import assert from 'node:assert/strict';
import fs from 'node:fs';
// Type-only model import is erased by Node's TypeScript loader.
const {warehouseOverview}=await import('../lib/overview.ts');
const item={id:'A-001',name:'Tool A',category:'Tools',unit:'cái',total:4,available:1,repair:1,location:'Rack A',notes:[],aliases:'',image:''};
const order={id:'M-1',name:'Engineer B',customer:'Company C',purpose:'private purpose',userId:'private-owner',userEmail:'private@example.test',key:'private-key',status:'borrowed',lines:[{itemId:item.id,name:item.name,qty:3,returned:1,due:'2026-11-13',condition:'Private condition'}],history:[{text:'Private history'}]};
const state={items:[item],orders:[order],audit:[],members:[],recipients:[],outbox:[],counter:1};
let overview=warehouseOverview(state);
assert.deepEqual(overview.counts,{total:4,available:1,borrowed:2,repair:1,reserved:0});
assert.equal(overview.tools.filter(row=>row.status==='borrowed')[0].quantity,2);
assert.equal(overview.tools.find(row=>row.status==='borrowed').location,'Company C');
assert.equal(overview.tools.find(row=>row.status==='borrowed').holder,'Engineer B');
assert.equal(overview.tools.reduce((n,row)=>n+row.quantity,0),4);
assert.equal(overview.loans.length,1);
assert.equal(overview.loans[0].lines[0].quantity,2);
for(const secret of ['private@example.test','private-owner','private-key','private purpose','Private condition','Private history'])assert.ok(!JSON.stringify(overview).includes(secret));
console.log('PASS quantities, partial returns, location, holder, one row per loan, sanitized shared view');

const second={...item,id:'A-002',total:1,available:0,repair:0};
const mixed={...state,items:[item,second],orders:[{...order,lines:[...order.lines,{itemId:'A-002',name:'Tool B',qty:1,returned:0,due:'2026-11-12'}]}]};
overview=warehouseOverview(mixed);assert.equal(overview.loans.length,1);assert.equal(overview.loans[0].lines.length,2);assert.equal(overview.loans[0].due,'2026-11-12');
mixed.orders[0].lines[1].returned=1;mixed.items[1].available=1;
overview=warehouseOverview(mixed);assert.equal(overview.loans[0].due,'2026-11-13');assert.equal(overview.loans[0].lines.length,1);
console.log('PASS multiple tools produce one reminder; fully returned lines cannot make the slip overdue');

for(const status of ['completed','cancelled','pending','approved','return_pending']){
 overview=warehouseOverview({...state,orders:[{...order,status}]});
 assert.equal(overview.loans.length,status==='return_pending'?1:0);
 assert.equal(overview.counts.borrowed,status==='return_pending'?2:0);
 assert.equal(overview.counts.reserved,status==='approved'?2:0);
 if(status==='approved')assert.equal(overview.tools.find(row=>row.status==='reserved').location,'Rack A');
}
overview=warehouseOverview({...state,orders:[{...order,lines:[{...order.lines[0],returned:3}]}]});assert.equal(overview.loans.length,0);
assert.deepEqual(warehouseOverview({...state,items:[],orders:[]}).counts,{total:0,available:0,borrowed:0,repair:0,reserved:0});
console.log('PASS completed/cancelled/pending excluded, reserved stays in warehouse, awaiting returns stays borrowed, empty states');

const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
assert.match(page,/\[tab,setTab\]=useState\('overview'\)/);
assert.match(page,/\.\.\.\(admin\?\[\{id:'manage'/);
assert.ok(!page.includes("id:admin?'manage':'inventory'"));
assert.ok(page.includes("(tab==='inventory'&&admin)"));
console.log('PASS Overview is first/default; warehouse navigation and inventory require Admin');
