import { env } from 'cloudflare:workers';
import { currentUser } from '../../../lib/session';
import { sameOrigin,cookie,signSession,passwordVersion } from '../../../lib/auth-core';
import { signingSecret } from '../../../lib/runtime-auth';
import { findEmployee,employeeUser,changeEmployeePassword } from '../../../lib/employees';
import { changeAdminPassword } from '../../../lib/admin-password';
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function POST(req:Request) {
 if(!sameOrigin(req))return json({error:'Nguồn yêu cầu không hợp lệ.'},403);
 const u=await currentUser(),e=env as Cloudflare.Env;
 if(!u||!e.DB)return json({error:'Vui lòng đăng nhập lại.'},401);
 try {
  const raw=await req.text();if(raw.length>2000)return json({error:'Thông tin quá dài.'},400);
  const body=JSON.parse(raw),secret=await signingSecret(e);
  if(!secret)return json({error:'Chưa cấu hình đăng nhập.'},503);
  const key='password:'+(u.role==='admin'?'admin':u.employeeId),window=Math.floor(Date.now()/900000);
  await e.DB.prepare('INSERT INTO login_limits(id,window,count) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window').bind(key,window).run();
  const attempts=await e.DB.prepare('SELECT count FROM login_limits WHERE id=?').bind(key).first<{count:number}>();
  if((attempts?.count||0)>10)return json({error:'Thử quá nhiều lần. Vui lòng chờ 15 phút.'},429);
  let user;
  if(u.role==='admin'){
   const hash=await changeAdminPassword(e,u.version,body.currentPassword,body.newPassword);
   user={userId:'admin',email:'admin@makino.local',displayName:'Admin',role:'admin' as const,version:await passwordVersion(hash),temporaryAdmin:false};
  }else{
   if(!u.employeeId)return json({error:'Vui lòng đăng nhập User.'},401);
   const employee=await findEmployee(e.DB,u.employeeId);
   if(!employee||!employee.active)return json({error:'Tài khoản đã bị khóa.'},403);
   if(u.version!=='employee:'+employee.session_version)return json({error:'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.'},401);
   const updated=await changeEmployeePassword(e.DB,employee,body.currentPassword,body.newPassword);
   user=employeeUser(updated);
  }
  const token=await signSession({...user,exp:Date.now()+30*86400000},secret);
  return json({ok:true},200,{'Set-Cookie':cookie(token,new URL(req.url).protocol==='https:')});
 }catch(error){return json({error:error instanceof Error&&!/D1|SQL/.test(error.message)?error.message:'Chưa đổi được mật khẩu. Vui lòng thử lại.'},400);}
}
