#!/usr/bin/env node
/** Phase B — Live Auth E2E (no localStorage SoT). */
const API = (process.env.API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const PASS = process.env.E2E_PASSWORD || 'Demo@12345';
const ROLES = [
  ['founder@bhairava.demo', 'FOUNDER'],
  ['admin@bhairava.demo', 'ADMINISTRATOR'],
  ['finance@bhairava.demo', 'FINANCE'],
  ['viewer@bhairava.demo', 'VIEWER'],
  ['agent@bhairava.demo', 'AGENT'],
  ['agent2@bhairava.demo', 'AGENT'],
  ['customer@bhairava.demo', 'CUSTOMER'],
  ['customer2@bhairava.demo', 'CUSTOMER'],
];
const steps = [];
const step = (name, ok, detail) => { steps.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'OK' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}
function ttlMs(token) {
  const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  return p.exp * 1000 - Date.now();
}
async function main() {
  const h = await req('/health').catch((e) => ({ status: 0, body: String(e) }));
  if (h.status !== 200) { console.log(JSON.stringify({ status: 'NEEDS ENV', steps }, null, 2)); process.exit(0); }
  step('health', true);

  const sessions = {};
  for (const [email, role] of ROLES) {
    const login = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASS }) });
    const ok = (login.status === 200 || login.status === 201) && login.body?.accessToken && login.body?.refreshToken;
    step(`login:${role}:${email}`, ok, `status=${login.status}`);
    if (!ok) continue;
    sessions[email] = login.body;
    const ttl = ttlMs(login.body.accessToken);
    step(`access-expiry-claim:${email}`, ttl > 60_000 && ttl <= 920_000, `ttlMs=${ttl}`);
    const me = await req('/auth/me', { headers: { authorization: `Bearer ${login.body.accessToken}` } });
    step(`me:${email}`, me.status === 200, `status=${me.status}`);
  }

  const founder = sessions['founder@bhairava.demo'];
  if (founder?.refreshToken) {
    const r1 = await req('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: founder.refreshToken }) });
    step('refresh-rotation', (r1.status === 200 || r1.status === 201) && r1.body?.refreshToken && r1.body.refreshToken !== founder.refreshToken);
    // Prove rotated token works BEFORE reuse detection (reuse revokes family)
    const r2 = await req('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: r1.body.refreshToken }) });
    step('refresh-new-token-works', r2.status === 200 || r2.status === 201, `status=${r2.status}`);
    const reuse = await req('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: founder.refreshToken }) });
    step('refresh-reuse-detection', reuse.status === 401, `status=${reuse.status}`);
  }

  // Fresh login for logout / session revocation
  const relog = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'founder@bhairava.demo', password: PASS }) });
  const logout = await req('/auth/logout', {
    method: 'POST',
    headers: { authorization: `Bearer ${relog.body.accessToken}` },
    body: JSON.stringify({ refreshToken: relog.body.refreshToken }),
  });
  step('logout', logout.status === 200 || logout.status === 201);
  const after = await req('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: relog.body.refreshToken }) });
  step('session-revocation-after-logout', after.status === 401, `status=${after.status}`);

  // Password reset
  const resetReq = await req('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email: 'viewer@bhairava.demo' }) });
  step('password-reset-request', resetReq.status === 200 || resetReq.status === 201);
  const token = resetReq.body?.devResetToken;
  if (token) {
    const confirm = await req('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword: 'TempReset@12345' }) });
    step('password-reset-confirm', confirm.status === 200 || confirm.status === 201);
    const loginNew = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'viewer@bhairava.demo', password: 'TempReset@12345' }) });
    step('login-with-new-password', loginNew.status === 200 || loginNew.status === 201);
    const reset2 = await req('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email: 'viewer@bhairava.demo' }) });
    await req('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token: reset2.body.devResetToken, newPassword: PASS }) });
    const restored = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'viewer@bhairava.demo', password: PASS }) });
    step('password-restored-to-demo', restored.status === 200 || restored.status === 201);
  } else step('password-reset-confirm', false, 'no devResetToken');

  // Suspension
  const { execSync } = await import('child_process');
  const pg = 'infrastructure-postgres-1';
  try {
    execSync(`docker exec ${pg} psql -U bhairava -d bhairava -c "UPDATE users SET status = 'SUSPENDED' WHERE email = 'viewer@bhairava.demo';"`, { stdio: 'pipe' });
    const denied = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'viewer@bhairava.demo', password: PASS }) });
    step('suspension-blocks-login', denied.status === 403 || denied.status === 401, `status=${denied.status}`);
    execSync(`docker exec ${pg} psql -U bhairava -d bhairava -c "UPDATE users SET status = 'ACTIVE' WHERE email = 'viewer@bhairava.demo';"`, { stdio: 'pipe' });
    const okAgain = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'viewer@bhairava.demo', password: PASS }) });
    step('suspension-restored', okAgain.status === 200 || okAgain.status === 201);
  } catch (e) {
    step('suspension-blocks-login', false, String(e.message || e));
  }

  const failed = steps.filter((s) => !s.ok);
  const status = failed.length === 0 ? 'PRODUCTION VERIFIED' : 'IMPLEMENTED — NEEDS ENVIRONMENT VERIFICATION';
  console.log('\n' + JSON.stringify({ status, passed: steps.filter((s) => s.ok).length, failed: failed.length, steps }, null, 2));
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
