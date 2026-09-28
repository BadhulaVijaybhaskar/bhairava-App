/**
 * Staging reservation concurrency: two parallel reserves on same AVAILABLE plot.
 * Expect exactly one 201/200 and one 409 (no 500).
 * Env loaded from .env.staging.local (FOUNDER_*).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env.staging.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const API = 'http://127.0.0.1:14000/api';

async function req(p, opts = {}) {
  const res = await fetch(`${API}${p}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

async function main() {
  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: env.FOUNDER_EMAIL, password: env.FOUNDER_PASSWORD }),
  });
  if (![200, 201].includes(login.status)) throw new Error('login ' + login.status);
  const auth = { authorization: `Bearer ${login.body.accessToken}` };
  const projects = await req('/projects', { headers: auth });
  const project = (projects.body || []).find((p) => p.code === 'STG-1') || (projects.body || [])[0];
  const plots = await req(`/plots/project/${project.id}`, { headers: auth });
  const available = (plots.body || []).filter((p) => p.status === 'AVAILABLE');
  if (!available.length) throw new Error('no AVAILABLE plots');
  const customers = await req('/customers', { headers: auth });
  const customerId = (customers.body || [])[0]?.id;
  if (!customerId) throw new Error('no customer');
  const plotId = available[0].id;
  const payload = JSON.stringify({ plotId, customerId, holdHours: 1 });
  const [a, b] = await Promise.all([
    req('/reservations', { method: 'POST', headers: auth, body: payload }),
    req('/reservations', { method: 'POST', headers: auth, body: payload }),
  ]);
  const statuses = [a.status, b.status].sort((x, y) => x - y);
  const winners = statuses.filter((s) => s === 200 || s === 201).length;
  const has409 = statuses.includes(409);
  const has500 = statuses.includes(500);
  const ok = winners === 1 && has409 && !has500;
  const out = { ok, statuses, winners, has409, has500, plotId };
  fs.mkdirSync(path.join(root, 'artifacts', 'staging'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'staging', 'concurrency-results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
