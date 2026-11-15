import { normalizeEmail, validEmail, verifyPassword } from './auth-core';
import { fullName, profileName } from './profiles';

export type Employee = { id:string; code:string; full_name:string; email:string; password_hash:string; active:number; must_change:number; session_version:number; legacy_user_id:string|null; created:string };
export const employeeCode = (value:unknown) => typeof value==='string'?value.trim().toUpperCase():'';
export function validateCode(value:unknown) {
 const code=employeeCode(value);
 if(!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code))throw new Error('Mã nhân viên cần 1–40 ký tự: chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.');
 return code;
}
export function validatePassword(value:unknown) {
 if(typeof value!=='string'||value.length<8||value.length>200)throw new Error('Mật khẩu cần từ 8–200 ký tự.');
 return value;
}
export async function hashPassword(value:unknown) {
 const password=validatePassword(value),salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return 'pbkdf2:100000:'+salt+':'+Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function ensureEmployees(db:D1Database) {
 await db.prepare(`CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  must_change INTEGER NOT NULL DEFAULT 1, session_version INTEGER NOT NULL DEFAULT 1,
  legacy_user_id TEXT UNIQUE, created TEXT NOT NULL
 )`).run();
}
export async function findEmployee(db:D1Database, id:string) {
 await ensureEmployees(db);
 return db.prepare('SELECT * FROM employees WHERE id=?').bind(id).first<Employee>();
}
export function employeeUser(e:Employee) {
 return {userId:e.legacy_user_id||'employee:'+e.id,employeeId:e.id,employeeCode:e.code,email:e.email,displayName:e.full_name,
  role:'borrower' as const,mustChangePassword:!!e.must_change,version:'employee:'+e.session_version};
}
export function publicEmployee(e:Employee) {
 return {id:e.id,code:e.code,name:e.full_name,email:e.email,active:!!e.active,mustChangePassword:!!e.must_change};
}
export async function legacyAccounts(db:D1Database) {
 await ensureEmployees(db);
 const row=await db.prepare('SELECT data FROM warehouse WHERE id=?').bind('main').first<{data:string}>();
 const claimed=await db.prepare('SELECT legacy_user_id FROM employees WHERE legacy_user_id IS NOT NULL').all<{legacy_user_id:string}>();
 const used=new Set(claimed.results.map(e=>e.legacy_user_id));
 const emails:string[]=[...new Set<string>((row?JSON.parse(row.data).members||[]:[]).map((m:{email:string})=>normalizeEmail(m.email)))];
 return Promise.all(emails.filter(email=>validEmail(email)&&!used.has('email:'+email)).map(async email=>({email,name:await profileName(db,email)})));
}
export async function saveEmployee(db:D1Database, body:Record<string,unknown>) {
 await ensureEmployees(db);
 const code=validateCode(body.code),name=fullName(body.name),email=normalizeEmail(body.email);
 if(email&&!validEmail(email))throw new Error('Địa chỉ email nhận thông báo không hợp lệ.');
 const duplicate=await db.prepare('SELECT id FROM employees WHERE code=?').bind(code).first<{id:string}>();
 if(duplicate&&duplicate.id!==body.id)throw new Error('Mã nhân viên đã tồn tại.');
 if(body.action==='update') {
  if(typeof body.id!=='string'||!await findEmployee(db,body.id))throw new Error('Không tìm thấy nhân viên.');
  await db.prepare('UPDATE employees SET code=?,full_name=?,email=? WHERE id=?').bind(code,name,email,body.id).run();
 } else {
  let legacy:string|null=null;
  if(body.legacyEmail) {
   const legacyEmail=normalizeEmail(body.legacyEmail);
   if(!(await legacyAccounts(db)).some(e=>e.email===legacyEmail))throw new Error('Tài khoản cũ đã được liên kết hoặc không tồn tại.');
   legacy='email:'+legacyEmail;
  }
  const hash=await hashPassword(body.password);
  await db.prepare('INSERT INTO employees(id,code,full_name,email,password_hash,legacy_user_id,created) VALUES(?,?,?,?,?,?,?)')
   .bind(crypto.randomUUID(),code,name,email,hash,legacy,new Date().toISOString()).run();
 }
}
export async function changeEmployeePassword(db:D1Database,e:Employee,current:unknown,next:unknown) {
 const password=validatePassword(next);
 if(typeof current!=='string'||!await verifyPassword(current,e.password_hash))throw new Error('Mật khẩu hiện tại không đúng.');
 if(password===current)throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
 const hash=await hashPassword(password);
 const result=await db.prepare('UPDATE employees SET password_hash=?,must_change=0,session_version=session_version+1 WHERE id=? AND session_version=? AND active=1')
  .bind(hash,e.id,e.session_version).run();
 if(!result.meta.changes)throw new Error('Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.');
 return (await findEmployee(db,e.id))!;
}
