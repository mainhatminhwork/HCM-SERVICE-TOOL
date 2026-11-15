import { env } from 'cloudflare:workers';
import { currentUser } from '../../../lib/session';
import { sameOrigin } from '../../../lib/auth-core';
import { emptyState,State } from '../../../lib/model';
import { emailOverview } from '../../../lib/mail';
import { mutate } from '../../../lib/operations';
import { warehouseOverview } from '../../../lib/overview';
export const dynamic='force-dynamic';
export async function GET(){return handle();}
export async function POST(req:Request){return handle(req);}
async function handle(req?:Request){
 const u=await currentUser();if(!u)return Response.json({error:'Vui lòng đăng nhập'},{status:401,headers:{'Cache-Control':'no-store'}});
 if(u.role==='borrower'&&u.mustChangePassword){if(req)return Response.json({error:'Vui lòng đổi mật khẩu trước khi sử dụng kho.'},{status:403});return Response.json({user:u,items:[],orders:[],members:[],recipients:[],mustChangePassword:true},{headers:{'Cache-Control':'no-store'}});}
 const db=(env as Cloudflare.Env).DB;if(!db)return Response.json({error:'Chưa kết nối database D1'},{status:503});
 try{let row=await db.prepare('SELECT data,revision FROM warehouse WHERE id=?').bind('main').first<{data:string;revision:number}>();
 if(!row){if(u.role!=='admin')return Response.json({error:'Kho chưa được Admin khởi tạo'},{status:403});await db.prepare('INSERT OR IGNORE INTO warehouse(id,data,revision) VALUES(?,?,0)').bind('main',JSON.stringify(emptyState())).run();row=await db.prepare('SELECT data,revision FROM warehouse WHERE id=?').bind('main').first<{data:string;revision:number}>();}
 if(!row)throw new Error('Không thể khởi tạo kho');const s:State=JSON.parse(row.data);const admin=u.role==='admin';
 if(req&&!admin&&!u.displayName)return Response.json({error:'Vui lòng điền họ và tên trước khi mượn/trả.'},{status:403});
 if(req){if(!sameOrigin(req))return Response.json({error:'Nguồn yêu cầu không hợp lệ'},{status:403});const raw=await req.text();if(raw.length>100000)return Response.json({error:'Yêu cầu quá lớn'},{status:413});const a=JSON.parse(raw);
 if(a.type==='note'&&!admin)return Response.json({error:'Chỉ Admin được sửa hiện trạng vật tư'},{status:403});
 if(a.type==='seed')return Response.json({error:'Bản online không nạp dữ liệu mẫu'},{status:403});
 if(['member','removeMember'].includes(a.type))return Response.json({error:'Sử dụng mục Quản lý nhân viên để quản lý tài khoản.'},{status:400});
 mutate(s,a,u,admin);
 const serialized=JSON.stringify(s);if(new TextEncoder().encode(serialized).length>1800000)return Response.json({error:'Dữ liệu bản thử đã gần giới hạn. Cần nâng cấp cấu trúc lưu trữ trước khi tiếp tục.'},{status:413});const result=await db.prepare('UPDATE warehouse SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(serialized,'main',row.revision).run();if(!result.meta.changes)return Response.json({error:'Kho vừa thay đổi. Vui lòng tải lại và thử lại.'},{status:409});}
 const email=admin?await emailOverview(env as Cloudflare.Env,s.outbox):{configured:false,message:'',outbox:[]};
 return Response.json({overview:warehouseOverview(s),items:s.items.filter(i=>!i.deleted),categories:s.categories||[...new Set(['Dụng cụ','Thiết bị đo','Phụ kiện',...s.items.map(i=>i.category)])],orders:admin?s.orders:s.orders.filter(o=>o.userId===u.userId),members:admin?s.members:[],recipients:admin?s.recipients:[],audit:admin?s.audit.slice(0,200):[],outbox:email.outbox,emailConfigured:email.configured,emailSetupMessage:email.message,user:u,revision:row.revision},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Warehouse operation failed',error instanceof Error?error.name:'Unknown');return Response.json({error:error instanceof Error&&!(error.message.includes('D1')||error.message.includes('SQL'))?error.message:'Chưa thiết lập xong database cloud. Kiểm tra migration.'},{status:400});}
}
