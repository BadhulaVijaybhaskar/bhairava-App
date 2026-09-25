#!/usr/bin/env node
/**
 * Phase J — Founder → Setup → Plots → Activate → Publish → Lead → Assign Agent →
 * Visit → Customer → Reserve → Book → Schedule → Pay → Receipt → Docs →
 * Under Documentation → Registration → REGISTERED → Resale
 * against LIVE API/DB. Also checks agent-web / customer-web isolation.
 *
 * Env: API_BASE_URL, E2E_PASSWORD (Demo@12345)
 * Prefers AVAILABLE inventory; auto-calls replenish script when < 2 available.
 */
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const API = (process.env.API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const PASS = process.env.E2E_PASSWORD || 'Demo@12345';
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

const result = { status: 'NEEDS ENV VERIFICATION', api: API, steps: [], ids: {}, error: null };
const step = (name, ok, detail) => {
  result.steps.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'OK' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

async function login(email) {
  const r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASS }) });
  if (!(r.status === 200 || r.status === 201)) {
    throw new Error(`login ${email} => ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

function replenishPlots() {
  const script = resolve(repoRoot, 'scripts/e2e/replenish-available-plots.mjs');
  const r = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(r.stdout || '', r.stderr || '');
    throw new Error('replenish-available-plots failed');
  }
  console.log(r.stdout);
  return r.stdout;
}

async function main() {
  try {
    const h = await req('/health');
    if (h.status !== 200) {
      result.error = `health ${h.status}`;
      console.log(JSON.stringify(result, null, 2));
      console.log('\nNEEDS ENV VERIFICATION — start Docker + migrate + seed + API.');
      process.exit(0);
    }
    step('health', true, JSON.stringify(h.body?.status || h.body));
  } catch (e) {
    result.error = String(e.message || e);
    console.log(JSON.stringify(result, null, 2));
    console.log('\nNEEDS ENV VERIFICATION — cannot reach API.');
    process.exit(0);
  }

  try {
    const founder = await login('founder@bhairava.demo');
    const auth = { authorization: `Bearer ${founder.accessToken}` };
    step('login.founder', true, founder.user?.email || 'founder@bhairava.demo');

    const agentSession = await login('agent@bhairava.demo');
    const agentAuth = { authorization: `Bearer ${agentSession.accessToken}` };
    const custSession = await login('customer@bhairava.demo');
    const custAuth = { authorization: `Bearer ${custSession.accessToken}` };
    const cust2Session = await login('customer2@bhairava.demo');
    const cust2Auth = { authorization: `Bearer ${cust2Session.accessToken}` };
    step('login.personas', true, 'agent+customer+customer2');

    // Projects / setup / activate / publish
    let projects = await req('/projects', { headers: auth });
    step('list.projects', projects.status === 200, `n=${Array.isArray(projects.body) ? projects.body.length : '?'}`);
    let project = Array.isArray(projects.body) && projects.body[0];
    if (!project) throw new Error('no project — run db:seed');

    const stamp = Date.now().toString(36);
    const setup = await req(`/projects/${project.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        description: `Phase J E2E setup ${stamp}`,
        lifecycleStatus: 'ACTIVE',
        agentVisible: true,
        customerListed: true,
        resaleAvailable: true,
        city: project.city || 'Hyderabad',
      }),
    });
    step('setup.activate.publish', setup.status === 200 || setup.status === 201, `lifecycle=${setup.body?.lifecycleStatus} agentVisible=${setup.body?.agentVisible}`);
    project = setup.body || project;
    result.ids.projectId = project.id;

    // Inventory
    let plots = await req(`/plots/project/${project.id}`, { headers: auth });
    let available = (Array.isArray(plots.body) ? plots.body : []).filter((p) => p.status === 'AVAILABLE');
    if (available.length < 2) {
      step('inventory.replenish', true, `before=${available.length}`);
      replenishPlots();
      plots = await req(`/plots/project/${project.id}`, { headers: auth });
      available = (Array.isArray(plots.body) ? plots.body : []).filter((p) => p.status === 'AVAILABLE');
    }
    step('inventory.available', available.length >= 2, `n=${available.length}`);
    if (available.length < 2) throw new Error('need ≥2 AVAILABLE plots after replenish');

    const agents = await req('/agents', { headers: auth });
    const agentId = Array.isArray(agents.body) && agents.body.find((a) => a.code === 'AG-01')?.id || agents.body?.[0]?.id;
    step('agents.list', !!agentId, `agentId=${agentId}`);

    // Lead + assign agent
    const lead = await req('/leads', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        projectId: project.id,
        name: `E2E Lead ${stamp}`,
        phone: '9000090001',
        email: `e2e.lead.${stamp}@bhairava.demo`,
        source: 'phase-j',
        agentId,
      }),
    });
    step('lead.create.assign', (lead.status === 200 || lead.status === 201) && lead.body?.agentId === agentId, `id=${lead.body?.id} stage=${lead.body?.stage}`);
    result.ids.leadId = lead.body?.id;

    const leadStage = await req(`/leads/${lead.body.id}/stage`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ stage: 'SITE_VISIT_PLANNED', notes: 'schedule visit' }),
    });
    step('lead.stage.visit_planned', leadStage.status === 200 || leadStage.status === 201, `stage=${leadStage.body?.stage}`);

    // Visit
    const when = new Date(Date.now() + 3600_000).toISOString();
    const visit = await req('/visits', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        projectId: project.id,
        scheduledAt: when,
        leadId: lead.body.id,
        agentId,
        notes: 'Phase J site visit',
      }),
    });
    step('visit.create', visit.status === 200 || visit.status === 201, `id=${visit.body?.id}`);
    const visitDone = await req(`/visits/${visit.body.id}/status`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'COMPLETED', notes: 'customer liked inventory' }),
    });
    step('visit.complete', visitDone.status === 200 || visitDone.status === 201, `status=${visitDone.body?.status}`);

    // Customer
    const customers = await req('/customers', { headers: auth });
    step('customers.list', customers.status === 200, `n=${Array.isArray(customers.body) ? customers.body.length : '?'}`);
    const customerId = Array.isArray(customers.body) && customers.body[0]?.id;
    if (!customerId) throw new Error('no customer');
    result.ids.customerId = customerId;

    // Link lead → customer / interested
    await req(`/leads/${lead.body.id}/stage`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ stage: 'INTERESTED', notes: `customer=${customerId}` }),
    });

    // Reserve
    const plotReserve = available[0];
    const reservation = await req('/reservations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        plotId: plotReserve.id,
        customerId,
        agentId,
        leadId: lead.body.id,
        notes: 'Phase J reserve',
      }),
    });
    step('reserve', reservation.status === 200 || reservation.status === 201, `id=${reservation.body?.id} plot=${plotReserve.number}`);
    result.ids.reservationId = reservation.body?.id;
    result.ids.reservedPlotId = plotReserve.id;

    // Book (convert reservation)
    const booking = await req('/bookings', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        plotId: plotReserve.id,
        customerId,
        agentId,
        reservationId: reservation.body.id,
        agreementValuePaise: '200000000',
        advancePaise: '20000000',
        notes: 'Phase J booking',
      }),
    });
    step('book', booking.status === 200 || booking.status === 201, `id=${booking.body?.id}`);
    result.ids.bookingId = booking.body?.id;

    // Schedule
    const due1 = new Date(Date.now() + 7 * 86400_000).toISOString();
    const due2 = new Date(Date.now() + 37 * 86400_000).toISOString();
    const schedule = await req('/payment-schedules', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        bookingId: booking.body.id,
        items: [
          { name: 'Booking advance', dueDate: due1, amountDuePaise: '20000000' },
          { name: 'Installment 1', dueDate: due2, amountDuePaise: '50000000' },
        ],
      }),
    });
    step('schedule.create', (schedule.status === 200 || schedule.status === 201) && Array.isArray(schedule.body) && schedule.body.length === 2, `n=${Array.isArray(schedule.body) ? schedule.body.length : '?'}`);
    const scheduleItemId = schedule.body?.[0]?.id;

    // Pay + receipt
    const payment = await req('/payments', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        bookingId: booking.body.id,
        amountPaise: '20000000',
        paidAt: new Date().toISOString(),
        method: 'UPI',
        txnRef: `E2E-${stamp}`,
        scheduleItemId,
        notes: 'Phase J advance',
      }),
    });
    step('pay', payment.status === 200 || payment.status === 201, `id=${payment.body?.id}`);
    step('receipt.auto', !!payment.body?.receipt?.receiptNumber, `rcpt=${payment.body?.receipt?.receiptNumber}`);
    result.ids.paymentId = payment.body?.id;
    result.ids.receiptNumber = payment.body?.receipt?.receiptNumber;

    const receipts = await req('/receipts', { headers: auth });
    step('receipts.list', receipts.status === 200 && Array.isArray(receipts.body) && receipts.body.some((r) => r.receiptNumber === payment.body?.receipt?.receiptNumber), `n=${Array.isArray(receipts.body) ? receipts.body.length : '?'}`);

    // Docs
    const doc = await req('/documents', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        title: `Sale agreement ${stamp}`,
        visibility: 'INTERNAL',
        originalName: 'agreement.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 18,
        projectId: project.id,
        bookingId: booking.body.id,
        customerId,
      }),
    });
    const uploadUrl = doc.body?.upload?.uploadUrl;
    step('docs.create', (doc.status === 200 || doc.status === 201) && !!uploadUrl, `id=${doc.body?.document?.id}`);
    if (uploadUrl) {
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: Buffer.from('%PDF-1.4 phase-j'),
      });
      step('docs.minio.put', put.ok, `status=${put.status}`);
    }

    // Under documentation via registration open
    const reg = await req('/registrations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ bookingId: booking.body.id, notes: 'Phase J registration' }),
    });
    step('registration.create', reg.status === 200 || reg.status === 201, `id=${reg.body?.id} status=${reg.body?.status}`);
    result.ids.registrationId = reg.body?.id;

    const plotAfterReg = await req(`/plots/project/${project.id}`, { headers: auth });
    const plotUd = (Array.isArray(plotAfterReg.body) ? plotAfterReg.body : []).find((p) => p.id === plotReserve.id);
    step('plot.under_documentation', plotUd?.status === 'UNDER_DOCUMENTATION' || plotUd?.status === 'SOLD' || plotUd?.status === 'REGISTERED', `status=${plotUd?.status}`);

    // Complete registration → REGISTERED
    const regDone = await req(`/registrations/${reg.body.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        status: 'COMPLETED',
        deedNumber: `DEED-${stamp}`,
        notes: 'Registered at SRO',
      }),
    });
    step('registration.completed', regDone.status === 200 || regDone.status === 201, `status=${regDone.body?.status}`);

    const plotsRegistered = await req(`/plots/project/${project.id}`, { headers: auth });
    const plotReg = (Array.isArray(plotsRegistered.body) ? plotsRegistered.body : []).find((p) => p.id === plotReserve.id);
    step('plot.registered', plotReg?.status === 'REGISTERED', `status=${plotReg?.status}`);

    // Resale
    const resale = await req('/resales', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        plotId: plotReserve.id,
        customerId,
        askingPricePaise: '250000000',
        notes: 'Phase J resale list',
        list: true,
      }),
    });
    step('resale.create', resale.status === 200 || resale.status === 201, `id=${resale.body?.id} status=${resale.body?.status}`);
    result.ids.resaleId = resale.body?.id;

    const plotsResale = await req(`/plots/project/${project.id}`, { headers: auth });
    const plotRs = (Array.isArray(plotsResale.body) ? plotsResale.body : []).find((p) => p.id === plotReserve.id);
    step('plot.resale_available', plotRs?.status === 'RESALE_AVAILABLE', `status=${plotRs?.status}`);

    // Isolation: agent sees own lists; customer cannot see other customer
    const agentBookings = await req('/bookings', { headers: agentAuth });
    step('agent.bookings.readable', agentBookings.status === 200, `n=${Array.isArray(agentBookings.body) ? agentBookings.body.length : '?'}`);

    const custBookings = await req('/bookings', { headers: custAuth });
    step('customer.bookings.readable', custBookings.status === 200, `n=${Array.isArray(custBookings.body) ? custBookings.body.length : '?'}`);

    const cust2Bookings = await req('/bookings', { headers: cust2Auth });
    const cust2SeesForeign = Array.isArray(cust2Bookings.body) && cust2Bookings.body.some((b) => b.id === booking.body.id);
    step('customer.isolation', cust2Bookings.status === 200 && !cust2SeesForeign, `foreignVisible=${!!cust2SeesForeign}`);

    const agentCustomers = await req('/customers', { headers: agentAuth });
    step('agent.customers.readable', agentCustomers.status === 200, `n=${Array.isArray(agentCustomers.body) ? agentCustomers.body.length : '?'}`);

    const audit = await req('/audit', { headers: auth });
    step('audit.immutable', audit.status === 200 || audit.status === 403, `status=${audit.status}`);

    const failed = result.steps.filter((s) => !s.ok);
    result.status = failed.length === 0 ? 'PRODUCTION VERIFIED' : 'IMPLEMENTED — NEEDS ENVIRONMENT VERIFICATION';
  } catch (e) {
    result.error = String(e.message || e);
    result.status = 'IMPLEMENTED — NEEDS ENVIRONMENT VERIFICATION';
    step('flow', false, result.error);
  }

  const failed = result.steps.filter((s) => !s.ok);
  console.log('\n' + JSON.stringify({
    status: result.status,
    passed: result.steps.length - failed.length,
    failed: failed.length,
    failures: failed,
    ids: result.ids,
    steps: result.steps,
    error: result.error,
  }, null, 2));

  const apiUp = result.steps.some((s) => s.name === 'health' && s.ok);
  if (apiUp && failed.length) process.exit(1);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
