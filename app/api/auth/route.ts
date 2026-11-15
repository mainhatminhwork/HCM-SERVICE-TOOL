import { env } from 'cloudflare:workers';
import { signingSecret } from '../../../lib/runtime-auth';
import { adminPasswordHash } from '../../../lib/admin-password';
import { cookie,verifyPassword,passwordVersion,signSession,sameOrigin,validPasswordHash,temporaryAdminDeadline } from '../../../lib/auth-core';
import { employeeCode,ensureEmployees,employeeUser } from '../../../lib/employees';
import type { Employee } from '../../../lib/employees';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(){const until=temporaryAdminDeadline((env as Cloudflare.Env).TEMP_ADMIN_NO_PASSWORD_UNTIL);return json({temporaryAdminUntil:until?new Date(until).toISOString():null});}
async function limited(db:D1Database,key:string,max:number){
 const window=Math.floor(Date.now()/900000);
 await db.prepare('INSERT INTO login_limits(id,window,count) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window').bind(key,window).run();
 return ((await db.prepare('SELECT count FROM login_limits WHERE id=?').bind(key).first<{count:number}>())?.count||0)>max;
}
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nguồn yêu cầu không hợp lệ'},403);
 const e=env as Cloudflare.Env;
 try{
  const raw=await req.text();if(raw.length>3000)return json({error:'Yêu cầu không hợp lệ'},400);
  const body=JSON.parse(raw),secure=new URL(req.url).protocol==='https:';
  if(body.action==='logout')return json({ok:true},200,{'Set-Cookie':cookie('',secure,0)});
  if(!['admin','borrower'].includes(body.role))return json({error:'Vai trò không hợp lệ'},400);
  const deadline=temporaryAdminDeadline(e.TEMP_ADMIN_NO_PASSWORD_UNTIL),temporaryAdmin=body.role==='admin'&&deadline>0,passwordHash=await adminPasswordHash(e);
  if(!e.DB)return json({error:'Chưa kết nối database. Admin cần hoàn tất thiết lập.'},503);
  const secret=await signingSecret(e);
  if(!secret||(!e.ADMIN_PASSWORD_HASH&&!deadline))return json({error:'Chưa cấu hình đăng nhập. Admin cần kiểm tra cấu hình.'},503);
  if(body.role==='admin'&&!temporaryAdmin&&!validPasswordHash(passwordHash))return json({error:'ADMIN_PASSWORD_HASH chưa đúng định dạng.'},503);
  const ip=req.headers.get('CF-Connecting-IP')||'local';
  if(await limited(e.DB,(body.role==='admin'?'admin:':'user:')+await digest(ip),body.role==='admin'?10:40))return json({error:'Thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút.'},429);
  let user;
  if(body.role==='admin'){
   if(!temporaryAdmin&&!await verifyPassword(String(body.password||''),passwordHash))return json({error:'Mật khẩu Admin không đúng'},401);
   user={userId:'admin',email:'admin@makino.local',displayName:'Admin',role:'admin' as const,version:await passwordVersion(passwordHash)};
  }else{
   const code=employeeCode(body.employeeCode);
   if(!code||code.length>40)return json({error:'Nhập mã nhân viên và mật khẩu hợp lệ.'},401);
   if(await limited(e.DB,'employee:'+await digest(code),10))return json({error:'Thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút.'},429);
   await ensureEmployees(e.DB);
   const employee=await e.DB.prepare('SELECT * FROM employees WHERE code=?').bind(code).first<Employee>();
   const dummy='pbkdf2:100000:'+'0'.repeat(32)+':'+'0'.repeat(64);
   const valid=await verifyPassword(String(body.password||''),employee?.password_hash||dummy);
   if(!employee||!valid)return json({error:'Mã nhân viên hoặc mật khẩu không đúng.'},401);
   if(!employee.active)return json({error:'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.'},403);
   user=employeeUser(employee);
  }
  const exp=temporaryAdmin?deadline:Date.now()+30*86400000;
  const token=await signSession({...user,exp,temporaryAdmin},secret);
  return json({ok:true,mustChangePassword:user.role==='borrower'&&!!user.mustChangePassword},200,{'Set-Cookie':cookie(token,secure,temporaryAdmin?Math.max(1,Math.floor((deadline-Date.now())/1000)):2592000)});
 }catch(error){console.error('Authentication failed',error instanceof Error?error.name:'Unknown');return json({error:'Chưa thể đăng nhập. Vui lòng thử lại.'},503);}
}
