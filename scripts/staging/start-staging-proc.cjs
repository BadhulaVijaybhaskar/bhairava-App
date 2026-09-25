const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const envFile = path.join(root, '.env.staging.local');
const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
const env = { ...process.env };
for (const line of lines) {
  if (!line || line.trim().startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 1) continue;
  env[line.slice(0, i)] = line.slice(i + 1);
}
// Aliases some code paths may still read
if (env.JWT_ACCESS_SECRET && !env.JWT_ACCESS_SECRET) env.JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;
if (env.COOKIE_SECURE && !env.COOKIE_SECURE) env.COOKIE_SECURE = env.COOKIE_SECURE;
if (env.PII_ENCRYPTION_KEY && !env.PII_ENCRYPTION_KEY) env.PII_ENCRYPTION_KEY = env.PII_ENCRYPTION_KEY;
if (env.REDIS_URL && !env.REDIS_URL) env.REDIS_URL = env.REDIS_URL;
env.NODE_ENV = 'staging';

const kind = process.argv[2];
let cmd, args, cwd;
if (kind === 'api') {
  cmd = 'node';
  args = ['dist/main.js'];
  cwd = path.join(root, 'services', 'api');
} else if (kind === 'worker') {
  cmd = 'node';
  args = ['dist/main.js'];
  cwd = path.join(root, 'services', 'worker');
} else {
  console.error('usage: node start-staging-proc.cjs api|worker');
  process.exit(2);
}

const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
const logDir = path.join(root, 'artifacts', 'staging');
fs.mkdirSync(logDir, { recursive: true });
const out = fs.createWriteStream(path.join(logDir, `${kind}.log`), { flags: 'a' });
child.stdout.pipe(out);
child.stderr.pipe(out);
child.stdout.on('data', (d) => process.stdout.write(`[${kind}] ${d}`));
child.stderr.on('data', (d) => process.stderr.write(`[${kind}] ${d}`));
fs.writeFileSync(path.join(logDir, `${kind}.pid`), String(child.pid));
console.log(`started ${kind} pid=${child.pid}`);
child.on('exit', (code) => {
  console.log(`${kind} exited ${code}`);
  process.exit(code || 0);
});