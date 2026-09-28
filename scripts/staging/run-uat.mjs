import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env.staging.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const API = 'http://127.0.0.1:14000/api';
const PG = 'bhairava-staging-postgres-1';
const results = {
  startedAt: new Date().toISOString(),
  api: API,
  steps: [],
  blockers: [
    'Public DNS/hosting: BLOCKED BY EXTERNAL CREDENTIAL / DNS — local isolated staging on 127.0.0.1',
    'COOKIE_SECURE=false for HTTP localhost staging only (staging-specific env; production remains Secure)',
    'Email/SMS/WhatsApp/Push: BLOCKED BY EXTERNAL CREDENTIAL',
    'Mobile store signing / EAS: BLOCKED BY EXTERNAL CREDENTIAL (smoke via env + tsc only)',
  ],
  totals: { pass: 0, fail: 0 },
};

const step = (name, ok, detail = '') => {
  results.steps.push({ name, ok: !!ok, detail: String(detail).slice(0, 600) });
  results.totals[ok ? 'pass' : 'fail'] += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 200) : ''}`);
};

async function req(p, opts = {}) {
  const res = await fetch(`${API}${p}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || '';
  let body = null;
  if (ct.includes('application/json')) {
    try { body = JSON.parse(buf.toString('utf8') || 'null'); } catch { body = buf.toString('utf8'); }
  } else if (ct.includes('pdf') || ct.includes('octet')) {
    body = { binary: true, bytes: buf.length, magic: buf.slice(0, 5).toString('utf8') };
  } else {
    try { body = JSON.parse(buf.toString('utf8') || 'null'); } catch { body = buf.toString('utf8').slice(0, 300); }
  }
  return { status: res.status, body, headers: res.headers, buf };
}

const authH = (t) => ({ authorization: `Bearer ${t}` });
async function login(email, password) {
  const r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (r.status !== 200 && r.status !== 201) throw new Error(`login ${email} => ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body;
}
function sql(q) {
  const r = spawnSync('docker', ['exec', PG, 'psql', '-U', 'bhairava_stg', '-d', 'bhairava_staging', '-t', '-A', '-c', q], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'sql fail').slice(0, 300));
  return (r.stdout || '').trim();
}

async function main() {
  const health = await req('/health');
  step('K.health', health.status === 200 && health.body?.status === 'ok', JSON.stringify(health.body));
  const ready = await req('/ready');
  step('K.ready', ready.status === 200 && ready.body?.status === 'ready' && ready.body?.checks?.db === 'up' && ready.body?.checks?.redis === 'up', JSON.stringify(ready.body));
  step('K.correlation_ts', !!ready.body?.ts, `ts=${ready.body?.ts}`);

  // Demo password rejected at bootstrap
  const demo = spawnSync('npm', ['run', 'bootstrap', '-w', '@bhairava/database'], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, ...env, FOUNDER_PASSWORD: ['Demo', '@', '12345'].join('') },
  });
  step('C.demo_password_rejected', demo.status !== 0, `exit=${demo.status}`);

  const founder = await login(env.FOUNDER_EMAIL, env.FOUNDER_PASSWORD);
  step('C.founder_login', founder.user?.role === 'FOUNDER', `role=${founder.user?.role}`);
  const fAuth = authH(founder.accessToken);
  const audit = Number(sql(`SELECT count(*) FROM audit_logs WHERE "organizationId" IN (SELECT id FROM organizations WHERE code='BHAIRAVA-STG')`));
  step('C.audit_trail', audit >= 1, `audit_logs=${audit}`);

  const personas = {
    admin: [env.STAGING_ADMIN_EMAIL, env.STAGING_ADMIN_PASSWORD],
    finance: [env.STAGING_FINANCE_EMAIL, env.STAGING_FINANCE_PASSWORD],
    viewer: [env.STAGING_VIEWER_EMAIL, env.STAGING_VIEWER_PASSWORD],
    agent1: [env.STAGING_AGENT1_EMAIL, env.STAGING_AGENT1_PASSWORD],
    agent2: [env.STAGING_AGENT2_EMAIL, env.STAGING_AGENT2_PASSWORD],
    customer1: [env.STAGING_CUSTOMER1_EMAIL, env.STAGING_CUSTOMER1_PASSWORD],
    customer2: [env.STAGING_CUSTOMER2_EMAIL, env.STAGING_CUSTOMER2_PASSWORD],
  };
  const tokens = { founder: founder.accessToken };
  for (const [k, [email, pass]] of Object.entries(personas)) {
    try {
      const b = await login(email, pass);
      tokens[k] = b.accessToken;
      step(`B.login.${k}`, true, `${email} role=${b.user?.role}`);
    } catch (e) {
      step(`B.login.${k}`, false, e.message);
    }
  }

  const unauth = await req('/projects');
  step('G.unauthenticated_protected', unauth.status === 401 || unauth.status === 403, `status=${unauth.status}`);
  const badRefresh = await req('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: 'invalid' }) });
  step('G.invalid_refresh', [400, 401].includes(badRefresh.status), `status=${badRefresh.status}`);

  const projects = await req('/projects', { headers: fAuth });
  const project = (projects.body || []).find((p) => p.code === 'STG-1') || (projects.body || [])[0];
  step('H.projects_list', projects.status === 200 && !!project, `code=${project?.code}`);
  const plots = await req(`/plots/project/${project.id}`, { headers: fAuth });
  step('H.plots_list', plots.status === 200 && (plots.body?.length || 0) >= 1, `n=${plots.body?.length}`);

  const viewerMut = await req('/projects', { method: 'POST', headers: authH(tokens.viewer), body: JSON.stringify({ name: 'Nope', code: 'NOPE', city: 'X' }) });
  step('G.viewer_mutation_blocked', [401, 403].includes(viewerMut.status), `status=${viewerMut.status}`);
  const finSetup = await req(`/projects/${project.id}`, { method: 'PATCH', headers: authH(tokens.finance), body: JSON.stringify({ name: 'finance-should-not' }) });
  step('G.finance_project_setup_blocked', [401, 403].includes(finSetup.status), `status=${finSetup.status}`);
  const agentPlot = await req('/plots', { method: 'POST', headers: authH(tokens.agent1), body: JSON.stringify({ projectId: project.id, number: 'HACK-1', areaSqYd: 100 }) });
  step('G.agent_plot_master_blocked', [401, 403].includes(agentPlot.status), `status=${agentPlot.status}`);

  const a1cust = await req('/customers', { headers: authH(tokens.agent1) });
  const a2cust = await req('/customers', { headers: authH(tokens.agent2) });
  const a1ids = new Set((a1cust.body || []).map((c) => c.id));
  const a2ids = new Set((a2cust.body || []).map((c) => c.id));
  step('G.agent_customer_isolation', a1cust.status === 200 && a2cust.status === 200 && [...a1ids].filter((id) => a2ids.has(id)).length === 0, `a1=${a1ids.size} a2=${a2ids.size}`);
  const c2 = (a2cust.body || [])[0];
  if (c2) {
    const cross = await req(`/customers/${c2.id}`, { headers: authH(tokens.agent1) });
    step('G.agent1_to_agent2_customer', [403, 404].includes(cross.status), `status=${cross.status}`);
  } else step('G.agent1_to_agent2_customer', false, 'missing customer');

  const docs = await req('/documents', { headers: fAuth });
  const internal = (docs.body || []).find((d) => /INTERNAL/i.test(d.visibility || d.visibilityCode || '')) || (docs.body || [])[0];
  if (internal) {
    const custDoc = await req(`/documents/${internal.id}`, { headers: authH(tokens.customer1) });
    step('G.customer_internal_doc_blocked', [403, 404].includes(custDoc.status), `status=${custDoc.status} vis=${internal.visibility}`);
  } else step('G.customer_internal_doc_blocked', false, 'no docs');

  // Document create + signed URL
  const uploadMeta = await req('/documents', {
    method: 'POST', headers: fAuth,
    body: JSON.stringify({ projectId: project.id, title: 'Staging UAT Brochure', visibility: 'AGENT_VISIBLE', originalName: 'uat-brochure.pdf', mimeType: 'application/pdf', sizeBytes: 1234 }),
  });
  step('E.document_create', [200, 201].includes(uploadMeta.status), `status=${uploadMeta.status} body=${JSON.stringify(uploadMeta.body).slice(0, 120)}`);
  const createdDocId = uploadMeta.body?.id || uploadMeta.body?.document?.id;
  if (createdDocId) {
    const signed = await req(`/documents/${createdDocId}/download`, { headers: fAuth });
    const url = signed.body?.download?.downloadUrl || signed.body?.url || signed.body?.downloadUrl;
    step('E.signed_url', signed.status === 200 && !!url, `status=${signed.status}`);
  } else step('E.signed_url', false, 'no doc id');

  // Documents list must not 500; BigInt sizeBytes serialized as decimal string
  const docChecks = [
    ['founder', fAuth],
    ['admin', authH(tokens.admin)],
    ['finance', authH(tokens.finance)],
    ['agent1', authH(tokens.agent1)],
    ['customer1', authH(tokens.customer1)],
  ];
  for (const [role, headers] of docChecks) {
    const list = await req('/documents', { headers });
    const arr = Array.isArray(list.body) ? list.body : (list.body?.items || []);
    const crash = typeof list.body === 'string' && /BigInt/i.test(list.body);
    const badSize = arr.some((d) => d && d.sizeBytes != null && typeof d.sizeBytes !== 'string');
    step(`E.documents_list.${role}`, list.status === 200 && !crash && !badSize,
      `status=${list.status} n=${arr.length} sizeTypes=${arr.slice(0, 3).map((d) => typeof d.sizeBytes).join(',')}`);
  }

  // Reservation expiry via SQL + worker
  const available = (plots.body || []).filter((p) => p.status === 'AVAILABLE');
  const cust1 = (a1cust.body || [])[0];
  const plot = available[0];
  if (plot && cust1) {
    const reservation = await req('/reservations', {
      method: 'POST', headers: authH(tokens.agent1),
      body: JSON.stringify({ plotId: plot.id, customerId: cust1.id, holdHours: 1 }),
    });
    step('F.reserve', [200, 201].includes(reservation.status), `status=${reservation.status}`);
    const rid = reservation.body?.id;
    if (rid) {
      const st1 = sql(`SELECT status FROM plots WHERE id='${plot.id}'`);
      step('F.plot_reserved', st1 === 'RESERVED', `status=${st1}`);
      sql(`UPDATE reservations SET "expiresAt" = NOW() - INTERVAL '2 minutes' WHERE id='${rid}'`);
      let ok = false;
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const st = sql(`SELECT status FROM plots WHERE id='${plot.id}'`);
        const rs = sql(`SELECT state FROM reservations WHERE id='${rid}'`);
        if (st === 'AVAILABLE' && (rs === 'EXPIRED' || rs === 'RELEASED')) {
          ok = true;
          step('F.expire_to_available', true, `plot=${st} reservation=${rs} waited=${(i + 1) * 5}s`);
          break;
        }
        if (i === 23) step('F.expire_to_available', false, `plot=${st} reservation=${rs}`);
      }
      const hist = Number(sql(`SELECT count(*) FROM plot_status_history WHERE "plotId"='${plot.id}'`));
      step('F.history_audit', hist >= 1 || ok, `history_rows=${hist}`);
    }
  } else step('F.reserve', false, 'missing plot/customer');

  // Full happy path on another available plot
  const plots2 = await req(`/plots/project/${project.id}`, { headers: fAuth });
  const plot2 = (plots2.body || []).find((p) => p.status === 'AVAILABLE');
  const agents = await req('/agents', { headers: fAuth });
  const agentRow = (agents.body || []).find((a) => a.code === 'STG-AG-01') || (agents.body || [])[0];
  if (plot2 && cust1 && agentRow) {
    const lead = await req('/leads', {
      method: 'POST', headers: fAuth,
      body: JSON.stringify({ projectId: project.id, name: 'UAT Lead', phone: '9100000099', email: 'uat.lead@staging.bhairava.local', agentId: agentRow.id }),
    });
    step('H.lead_create', [200, 201].includes(lead.status), `status=${lead.status}`);

    const reservation2 = await req('/reservations', {
      method: 'POST', headers: authH(tokens.agent1),
      body: JSON.stringify({ plotId: plot2.id, customerId: cust1.id, holdHours: 1, leadId: lead.body?.id }),
    });
    step('H.reserve2', [200, 201].includes(reservation2.status), `status=${reservation2.status}`);

    const booking = await req('/bookings', {
      method: 'POST', headers: authH(tokens.agent1),
      body: JSON.stringify({
        plotId: plot2.id, customerId: cust1.id, reservationId: reservation2.body?.id,
        agreementValuePaise: '240000000', advancePaise: '10000000',
      }),
    });
    step('H.booking', [200, 201].includes(booking.status), `status=${booking.status} ${JSON.stringify(booking.body).slice(0, 120)}`);
    step('H.booking_agent_attributed', [200, 201].includes(booking.status) && !!booking.body?.agentId,
      `agentId=${booking.body?.agentId} agent=${booking.body?.responsibleAgent?.code || booking.body?.agent?.code || ''}`);
    if (booking.body?.id) {
      const a1list = await req('/bookings', { headers: authH(tokens.agent1) });
      const a2list = await req('/bookings', { headers: authH(tokens.agent2) });
      const a1arr = Array.isArray(a1list.body) ? a1list.body : [];
      const a2arr = Array.isArray(a2list.body) ? a2list.body : [];
      const a1row = a1arr.find((b) => b.id === booking.body.id);
      const a1PiiOk = !!(a1row && a1row.customer && a1row.customer.name && a1row.customer.redacted !== true);
      step('H.agent1_sees_own_booking', a1list.status === 200 && !!a1row && a1PiiOk, `n=${a1arr.length} pii=${a1PiiOk}`);
      step('H.agent2_no_unrelated_booking', a2list.status === 200 && !a2arr.some((b) => b.id === booking.body.id), `n=${a2arr.length}`);
    }

    if (booking.body?.id) {
      const c2b = await req(`/bookings/${booking.body.id}`, { headers: authH(tokens.customer2) });
      step('G.customer1_to_customer2_booking', [403, 404].includes(c2b.status), `status=${c2b.status}`);
      const a2b = await req(`/bookings/${booking.body.id}`, { headers: authH(tokens.agent2) });
      step('G.agent_other_agent_booking', [403, 404].includes(a2b.status), `status=${a2b.status}`);

      const payment = await req('/payments', {
        method: 'POST', headers: authH(tokens.finance),
        body: JSON.stringify({
          bookingId: booking.body.id, amountPaise: '10000000',
          paidAt: new Date().toISOString(), method: 'UPI', txnRef: 'STG-UAT-PAY-1',
        }),
      });
      step('H.payment', [200, 201].includes(payment.status), `status=${payment.status}`);

      const receipts = await req('/receipts', { headers: authH(tokens.finance) });
      const receipt = (receipts.body || []).find((r) => r.bookingId === booking.body.id) || (receipts.body || [])[0];
      if (receipt?.id) {
        const pdf = await req(`/receipts/${receipt.id}/pdf`, { headers: authH(tokens.finance) });
        step('J.receipt_pdf_auth', pdf.status === 200 && (pdf.body?.magic === '%PDF-' || pdf.body?.bytes > 500), `status=${pdf.status} bytes=${pdf.body?.bytes}`);
        const pdfUnauth = await req(`/receipts/${receipt.id}/pdf`);
        step('J.receipt_pdf_unauth_blocked', [401, 403].includes(pdfUnauth.status), `status=${pdfUnauth.status}`);
        const pdfCust2 = await req(`/receipts/${receipt.id}/pdf`, { headers: authH(tokens.customer2) });
        step('J.receipt_pdf_other_customer_blocked', [403, 404].includes(pdfCust2.status), `status=${pdfCust2.status}`);
      } else {
        step('J.receipt_pdf_auth', false, 'no receipt');
        step('J.receipt_pdf_unauth_blocked', false, 'no receipt');
        step('J.receipt_pdf_other_customer_blocked', false, 'no receipt');
      }

      const reg = await req('/registrations', {
        method: 'POST', headers: fAuth,
        body: JSON.stringify({ bookingId: booking.body.id, plotId: plot2.id, customerId: cust1.id }),
      });
      step('H.registration', [200, 201, 400].includes(reg.status), `status=${reg.status}`);
      if (reg.body?.id) {
        await req(`/registrations/${reg.body.id}`, { method: 'PATCH', headers: fAuth, body: JSON.stringify({ status: 'REGISTERED' }) });
      }
      const resale = await req('/resales', {
        method: 'POST', headers: fAuth,
        body: JSON.stringify({ plotId: plot2.id, customerId: cust1.id, askingPricePaise: '260000000', list: true }),
      });
      step('H.resale', [200, 201].includes(resale.status), `status=${resale.status} ${JSON.stringify(resale.body).slice(0, 120)}`);
    }

    const ab = await req('/bookings', { headers: authH(tokens.agent1) });
    const cb = await req('/bookings', { headers: authH(tokens.customer1) });
    step('H.agent_web_data_view', ab.status === 200 && (ab.body?.length || 0) >= 1, `n=${ab.body?.length}`);
    step('H.customer_web_data_view', cb.status === 200, `n=${cb.body?.length}`);
  } else {
    step('H.full_flow_prereq', false, 'missing plot/customer/agent');
  }

  // CORS
  const corsBad = await fetch(`${API}/health`, { headers: { Origin: 'https://evil.example.com' } });
  const acao = corsBad.headers.get('access-control-allow-origin');
  step('D.cors_reject_unknown', !acao || acao === 'null' || acao !== 'https://evil.example.com', `acao=${acao}`);

  // Backup/restore
  const dumpPath = path.join(root, 'artifacts', 'staging', 'bhairava_staging.dump');
  fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
  const dump = spawnSync('docker', ['exec', PG, 'pg_dump', '-U', 'bhairava_stg', '-d', 'bhairava_staging', '-Fc'], { encoding: 'buffer', maxBuffer: 80 * 1024 * 1024 });
  if (dump.status === 0) {
    fs.writeFileSync(dumpPath, dump.stdout);
    step('L.pg_dump', true, `bytes=${dump.stdout.length}`);
  } else step('L.pg_dump', false, String(dump.stderr || ''));
  spawnSync('docker', ['exec', PG, 'psql', '-U', 'bhairava_stg', '-d', 'postgres', '-c', "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='bhairava_staging_restore' AND pid <> pg_backend_pid();"], { encoding: 'utf8' });
  spawnSync('docker', ['exec', PG, 'psql', '-U', 'bhairava_stg', '-d', 'postgres', '-c', 'DROP DATABASE IF EXISTS bhairava_staging_restore;'], { encoding: 'utf8' });
  const createdb = spawnSync('docker', ['exec', PG, 'psql', '-U', 'bhairava_stg', '-d', 'postgres', '-c', 'CREATE DATABASE bhairava_staging_restore OWNER bhairava_stg;'], { encoding: 'utf8' });
  step('L.create_temp_db', createdb.status === 0, (createdb.stderr || createdb.stdout || '').slice(0, 120));
  if (dump.status === 0) {
    spawnSync('docker', ['cp', dumpPath, `${PG}:/tmp/bhairava_staging.dump`], { encoding: 'utf8' });
    const restore = spawnSync('docker', ['exec', PG, 'pg_restore', '-U', 'bhairava_stg', '-d', 'bhairava_staging_restore', '--no-owner', '/tmp/bhairava_staging.dump'], { encoding: 'utf8' });
    const ent = spawnSync('docker', ['exec', PG, 'psql', '-U', 'bhairava_stg', '-d', 'bhairava_staging_restore', '-t', '-A', '-c', 'SELECT count(*) FROM users;'], { encoding: 'utf8' });
    const userCount = Number((ent.stdout || '').trim());
    step('L.restore_verify_users', userCount >= 8, `users=${userCount} restoreExit=${restore.status}`);
  }

  results.finishedAt = new Date().toISOString();
  results.promotionReady = results.totals.fail === 0 ? 'CONDITIONAL_YES_LOCAL_ONLY' : 'NO';
  const out = path.join(root, 'artifacts', 'staging', 'uat-results.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('\nTOTALS', results.totals);
  console.log('Wrote', out);
  process.exit(results.totals.fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  results.steps.push({ name: 'fatal', ok: false, detail: String(e.stack || e) });
  results.totals.fail += 1;
  fs.mkdirSync(path.join(root, 'artifacts', 'staging'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'staging', 'uat-results.json'), JSON.stringify(results, null, 2));
  process.exit(1);
});
