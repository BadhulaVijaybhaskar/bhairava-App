const API = (process.env.API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const PASS = process.env.E2E_PASSWORD || 'Demo@12345';
async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}
async function main() {
  const login = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'founder@bhairava.demo', password: PASS }) });
  if (!(login.status === 200 || login.status === 201)) throw new Error('login ' + login.status);
  const auth = { authorization: `Bearer ${login.body.accessToken}` };
  const projects = await req('/projects', { headers: auth });
  const projectId = projects.body?.[0]?.id;
  const plots = await req(`/plots/project/${projectId}`, { headers: auth });
  let available = (Array.isArray(plots.body) ? plots.body : []).filter((p) => p.status === 'AVAILABLE' || p.status === 'RESALE_AVAILABLE');
  const customers = await req('/customers', { headers: auth });
  const customerId = customers.body?.[0]?.id;
  if (!customerId) throw new Error('no customer');

  // If none available, force one plot back via SQL so uniqueness test can run
  if (!available.length) {
    const { execSync } = await import('child_process');
    const pick = (Array.isArray(plots.body) ? plots.body : [])[0];
    if (!pick) throw new Error('no plots');
    execSync(`docker exec infrastructure-postgres-1 psql -U bhairava -d bhairava -c "UPDATE plots SET status='AVAILABLE' WHERE id='${pick.id}'; UPDATE reservations SET state='EXPIRED' WHERE \\"plotId\\"='${pick.id}' AND state='ACTIVE';"`, { stdio: 'inherit' });
    const plots2 = await req(`/plots/project/${projectId}`, { headers: auth });
    available = (Array.isArray(plots2.body) ? plots2.body : []).filter((p) => p.status === 'AVAILABLE' || p.status === 'RESALE_AVAILABLE');
  }
  if (!available.length) throw new Error('still no available plots');
  const plotId = available[0].id;
  const [a, b] = await Promise.all([
    req('/reservations', { method: 'POST', headers: auth, body: JSON.stringify({ plotId, customerId }) }),
    req('/reservations', { method: 'POST', headers: auth, body: JSON.stringify({ plotId, customerId }) }),
  ]);
  const statuses = [a.status, b.status].sort((x, y) => x - y);
  const winners = statuses.filter((s) => s === 200 || s === 201).length;
  const has409 = statuses.includes(409);
  const has500 = statuses.includes(500);
  console.log(JSON.stringify({ statuses, winners, has409, has500, a: a.body?.message || a.body, b: b.body?.message || b.body }, null, 2));
  if (!(winners === 1 && has409 && !has500)) {
    console.error('FAIL: expected one 2xx and one 409, no 500');
    process.exit(1);
  }
  console.log('PRODUCTION VERIFIED: double-reserve loser is 409');
}
main().catch((e) => { console.error(e); process.exit(1); });
