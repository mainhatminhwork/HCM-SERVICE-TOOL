import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const dir=new URL('../.sites-runtime/admin-password-tests/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
for(const name of ['auth-core','profiles','employees','admin-password']){
 let code=fs.readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 for(const dependency of ['auth-core','profiles','employees'])code=code.replaceAll("'./"+dependency+"'","'./"+dependency+".ts'");
 fs.writeFileSync(new URL(name+'.ts',dir),code);
}
const {adminPasswordHash,changeAdminPassword}=await import(new URL('admin-password.ts',dir));
const {hashPassword}=await import(new URL('employees.ts',dir));
const {passwordVersion,verifyPassword}=await import(new URL('auth-core.ts',dir));
const sql=new DatabaseSync(':memory:');
const DB={prepare(query){let args=[];return {bind(...v){args=v;return this;},async first(){return sql.prepare(query).get(...args)||null;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}}}};
const env={DB,ADMIN_PASSWORD_HASH:await hashPassword('admin-unit-initial')};
assert.equal(await adminPasswordHash(env),env.ADMIN_PASSWORD_HASH);
const originalVersion=await passwordVersion(env.ADMIN_PASSWORD_HASH);
await assert.rejects(changeAdminPassword(env,originalVersion,'wrong','admin-unit-next'));
await assert.rejects(changeAdminPassword(env,originalVersion,'admin-unit-initial','admin-unit-initial'));
await assert.rejects(changeAdminPassword(env,originalVersion,'admin-unit-initial','123'));
const changed=await changeAdminPassword(env,originalVersion,'admin-unit-initial','admin-unit-next');
assert.equal(await adminPasswordHash(env),changed);
assert.ok(await verifyPassword('admin-unit-next',changed));assert.equal(await verifyPassword('admin-unit-initial',changed),false);
await assert.rejects(changeAdminPassword(env,originalVersion,'admin-unit-next','admin-unit-third'));
const version=await passwordVersion(changed);
const races=await Promise.allSettled(['admin-race-one','admin-race-two'].map(next=>changeAdminPassword(env,version,'admin-unit-next',next)));
assert.equal(races.filter(r=>r.status==='fulfilled').length,1);assert.equal(races.filter(r=>r.status==='rejected').length,1);
// A newly configured Cloudflare secret overrides a previous database password for recovery.
env.ADMIN_PASSWORD_HASH=await hashPassword('admin-recovery-pass');assert.equal(await adminPasswordHash(env),env.ADMIN_PASSWORD_HASH);
const recovered=await changeAdminPassword(env,await passwordVersion(env.ADMIN_PASSWORD_HASH),'admin-recovery-pass','admin-after-recovery');
assert.equal(await adminPasswordHash(env),recovered);
sql.prepare('UPDATE admin_credentials SET password_hash=?').run('corrupt');await assert.rejects(adminPasswordHash(env));
console.log('PASS Admin password bootstrap, hashed changes, wrong/short/same password rejection, stale versions, concurrent CAS, secret recovery and corrupt-hash fail-closed');
