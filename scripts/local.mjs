import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, pbkdf2Sync } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const runtime = resolve('.sites-runtime/local');
mkdirSync(runtime, { recursive: true });
const env = { ...process.env, WRANGLER_LOG_PATH: resolve(runtime, 'worker.log'),
  WRANGLER_REGISTRY_PATH: resolve(runtime, 'registry'), MINIFLARE_REGISTRY_PATH: resolve(runtime, 'mf-registry'),
  WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_CF_FETCH_ENABLED: 'false' };
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync('node_modules/wrangler/bin/wrangler.js')) {
  console.error('Can cai thu vien truoc. Xem HUONG-DAN.md.');
  process.exit(1);
}
if (!existsSync('dist/server/index.js') || process.argv.includes('--build')) run(['scripts/build.mjs']);
const secretFile = resolve(runtime, 'access.json');
if (!existsSync(secretFile)) {
  const password = randomBytes(12).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  writeFileSync(secretFile, JSON.stringify({ password, SESSION_SECRET: randomBytes(48).toString('hex'),
    ADMIN_PASSWORD_HASH: 'pbkdf2:100000:' + salt + ':' + pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex') }), { mode: 0o600 });
}
const access = JSON.parse(readFileSync(secretFile, 'utf8'));
const config = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
config.name = 'makino-local-copy';
config.main = resolve('dist/server/index.js');
config.assets = { directory: resolve('dist/client') };
config.d1_databases = [{ binding: 'DB', database_name: 'makino-local-db', database_id: '00000000-0000-4000-8000-000000000000' }];
config.r2_buckets = [{ binding: 'BUCKET', bucket_name: 'makino-local-images' }];
config.vars = { APP_AUTH_MODE: 'email' };
// Wrangler treats values in .dev.vars as secrets and masks them in its output.
writeFileSync(resolve(runtime, '.dev.vars'), 'SESSION_SECRET=' + JSON.stringify(access.SESSION_SECRET) + '\nADMIN_PASSWORD_HASH=' + JSON.stringify(access.ADMIN_PASSWORD_HASH) + '\n', { mode: 0o600 });
delete config.triggers;
const configPath = resolve(runtime, 'wrangler.json');
writeFileSync(configPath, JSON.stringify(config, null, 2));
const tool = resolve('node_modules/wrangler/bin/wrangler.js');
const state = resolve(runtime, 'state');
run([tool, 'd1', 'execute', 'DB', '--local', '--config', configPath, '--persist-to', state,
  '--command', 'CREATE TABLE IF NOT EXISTS warehouse (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, revision INTEGER DEFAULT 0 NOT NULL); CREATE TABLE IF NOT EXISTS login_limits (id TEXT PRIMARY KEY NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL);']);
const port = process.env.PORT || '8787';
console.log('\nMAKINO - Ban sao chay rieng tren may');
console.log('Mo trinh duyet: http://127.0.0.1:' + port);
console.log('Chon Admin. Mat khau nam trong tep .sites-runtime/local/DANG-NHAP.txt');
console.log('Du lieu va anh duoc luu trong .sites-runtime/local/state. Nhan Ctrl+C de dung.\n');
writeFileSync(resolve(runtime, 'DANG-NHAP.txt'), 'BẢN SAO MAKINO — CHỈ DÙNG TRÊN MÁY NÀY\n\nĐịa chỉ: http://127.0.0.1:' + port + '\nChọn: Admin\nMật khẩu: ' + access.password + '\n\nKhông gửi tệp này cho người khác. Không dùng mật khẩu này cho bản online.\n', { mode: 0o600 });
const child = spawn(process.execPath, [tool, 'dev', '--local', '--config', configPath, '--persist-to', state,
  '--ip', '127.0.0.1', '--port', port, '--inspector-port', '0'], { cwd: root, env, stdio: 'inherit' });
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
child.on('exit', code => process.exit(code || 0));
