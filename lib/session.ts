import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { signingSecret } from './runtime-auth';
import { readSession,sessionName,temporaryAdminDeadline } from './auth-core';
import { findEmployee,employeeUser } from './employees';
export async function currentUser(){
 const e=env as Cloudflare.Env,secret=await signingSecret(e);
 if(!secret||(!e.ADMIN_PASSWORD_HASH&&!temporaryAdminDeadline(e.TEMP_ADMIN_NO_PASSWORD_UNTIL)))return null;
 const jar=await cookies(),token=jar.get(sessionName)?.value;if(!token)return null;
 const u=await readSession(token,secret,e.ADMIN_PASSWORD_HASH||'',e.TEMP_ADMIN_NO_PASSWORD_UNTIL);if(!u)return null;
 if(u.role==='admin')return {...u,displayName:'Admin'};
 // Email-only cookies from the previous login flow are intentionally no longer accepted.
 if(!e.DB||!u.employeeId)return null;
 const employee=await findEmployee(e.DB,u.employeeId);
 if(!employee||!employee.active||u.version!=='employee:'+employee.session_version)return null;
 return {...u,...employeeUser(employee)};
}
