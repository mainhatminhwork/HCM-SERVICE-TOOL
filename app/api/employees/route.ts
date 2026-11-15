import { env } from 'cloudflare:workers';
import { currentUser } from '../../../lib/session';
import { sameOrigin } from '../../../lib/auth-core';
import { ensureEmployees,findEmployee,publicEmployee,legacyAccounts,saveEmployee,hashPassword } from '../../../lib/employees';
import type { Employee } from '../../../lib/employees';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){return handle();}
export async function POST(req:Request){return handle(req);}
async function handle(req?:Request) {
 const u=await currentUser();
 if(u?.role!=='admin')return json({error:'Chỉ Admin được quản lý nhân viên.'},403);
 const db=(env as Cloudflare.Env).DB;if(!db)return json({error:'Chưa kết nối dữ liệu.'},503);
 try {
  await ensureEmployees(db);
  if(req) {
   if(!sameOrigin(req))return json({error:'Nguồn yêu cầu không hợp lệ.'},403);
   const raw=await req.text();if(raw.length>5000)return json({error:'Thông tin quá dài.'},400);
   const a=JSON.parse(raw);
   if(a.action==='create'||a.action==='update')await saveEmployee(db,a);
   else {
    const e=typeof a.id==='string'?await findEmployee(db,a.id):null;
    if(!e)return json({error:'Không tìm thấy nhân viên.'},404);
    if(a.action==='resetPassword') {
     const hash=await hashPassword(a.password);
     await db.prepare('UPDATE employees SET password_hash=?,must_change=1,session_version=session_version+1 WHERE id=?').bind(hash,e.id).run();
    } else if(a.action==='setActive'&&typeof a.active==='boolean') {
     await db.prepare('UPDATE employees SET active=?,session_version=session_version+1 WHERE id=?').bind(a.active?1:0,e.id).run();
    } else return json({error:'Thao tác không hợp lệ.'},400);
   }
  }
  const rows=await db.prepare('SELECT * FROM employees ORDER BY code').all<Employee>();
  return json({employees:rows.results.map(publicEmployee),legacyAccounts:await legacyAccounts(db)});
 } catch(error) {
  const message=error instanceof Error?error.message:'';
  return json({error:message.includes('UNIQUE')?'Mã nhân viên hoặc tài khoản cũ đã được sử dụng.':/D1|SQL|constraint/i.test(message)?'Chưa lưu được nhân viên. Vui lòng thử lại.':message||'Thông tin không hợp lệ.'},400);
 }
}
