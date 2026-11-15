import {passwordVersion,validPasswordHash,verifyPassword} from './auth-core';
import {hashPassword,validatePassword} from './employees';
type AdminEnv={DB?:D1Database;ADMIN_PASSWORD_HASH?:string};
type Stored={password_hash:string;source_version:string};
async function credentials(e:AdminEnv){
 const bootstrap=(e.ADMIN_PASSWORD_HASH||'').trim();
 if(!e.DB||!validPasswordHash(bootstrap))return {hash:bootstrap,source:'',stored:null as Stored|null};
 await e.DB.prepare('CREATE TABLE IF NOT EXISTS admin_credentials (id TEXT PRIMARY KEY NOT NULL, password_hash TEXT NOT NULL, source_version TEXT NOT NULL)').run();
 const source=await passwordVersion(bootstrap);
 const stored=await e.DB.prepare('SELECT password_hash,source_version FROM admin_credentials WHERE id=?').bind('admin').first<Stored>();
 // Changing the Cloudflare bootstrap secret is an explicit recovery/reset path.
 if(stored?.source_version===source&&!validPasswordHash(stored.password_hash))throw new Error('Cấu hình mật khẩu Admin không hợp lệ.');
 const hash=stored?.source_version===source?stored.password_hash:bootstrap;
 return {hash,source,stored};
}
export async function adminPasswordHash(e:AdminEnv){return (await credentials(e)).hash;}
export async function changeAdminPassword(e:AdminEnv,sessionVersion:string,current:unknown,next:unknown){
 if(!e.DB)throw new Error('Chưa kết nối dữ liệu.');
 const snapshot=await credentials(e);
 if(!validPasswordHash(snapshot.hash)||sessionVersion!==await passwordVersion(snapshot.hash))throw new Error('Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.');
 const password=validatePassword(next);
 if(typeof current!=='string'||!await verifyPassword(current,snapshot.hash))throw new Error('Mật khẩu hiện tại không đúng.');
 if(current===password)throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
 const hash=await hashPassword(password);
 const result=snapshot.stored
  ?await e.DB.prepare('UPDATE admin_credentials SET password_hash=?,source_version=? WHERE id=? AND password_hash=? AND source_version=?').bind(hash,snapshot.source,'admin',snapshot.stored.password_hash,snapshot.stored.source_version).run()
  :await e.DB.prepare('INSERT OR IGNORE INTO admin_credentials(id,password_hash,source_version) VALUES(?,?,?)').bind('admin',hash,snapshot.source).run();
 if(!result.meta.changes)throw new Error('Mật khẩu vừa thay đổi ở phiên khác. Vui lòng đăng nhập lại.');
 return hash;
}
