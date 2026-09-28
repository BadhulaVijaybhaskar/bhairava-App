import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Checkbox, ChoiceGrid, Field, SelectInput, TextInput, TextareaInput } from '@bhairava/ui-web';
import { api } from '../api';
import { Notice } from '../components/common';
import { OnboardingShell, ReviewList, useWizardForm, type WizardStep } from '../components/Wizard';
import { formatDate, formatDateTime, formatPaise, formatRupees, humanize, useAsyncList, type AnyRow } from '../lib/data';

/* --------------------------------- helpers -------------------------------- */

const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
const isPhone = (v: string) => /^\d{10}$/.test(v);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPositive = (v: string) => Number(v) > 0 && Number.isFinite(Number(v));

/** `"12,50,000.5"` → `125000050n`; `null` when not a non-negative rupee amount with ≤ 2 decimals. */
function rupeesToPaise(v: string): bigint | null {
  const m = v.replace(/[,\s]/g, '').match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!m) return null;
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}

function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function addMonths(date: string, months: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return isoDate(d);
}

const asRows = (p: Promise<unknown>) => p.then((r) => (Array.isArray(r) ? (r as AnyRow[]) : []));

function useProjects() {
  return useAsyncList(() => asRows(api.projects.list())).rows;
}
function useCustomers() {
  return useAsyncList(() => asRows(api.customers.list())).rows;
}
function useAgents() {
  return useAsyncList(() => asRows(api.agents.list())).rows;
}
function usePlots(projectId: string) {
  return useAsyncList(() => (projectId ? asRows(api.plots.listByProject(projectId)) : Promise.resolve([])), [projectId]);
}

const nameOf = (rows: AnyRow[], id: string) => {
  const r = rows.find((x) => String(x.id) === id);
  return r ? String(r.name ?? r.number ?? id) : '';
};

const projectOptions = (rows: AnyRow[]) => rows.map((p) => ({ value: String(p.id), label: p.code ? `${p.name} · ${p.code}` : String(p.name) }));
const customerOptions = (rows: AnyRow[]) => rows.map((c) => ({ value: String(c.id), label: c.phone ? `${c.name} · ${c.phone}` : String(c.name) }));
const agentOptions = (rows: AnyRow[]) => [
  { value: '', label: 'Unassigned' },
  ...rows.map((a) => ({ value: String(a.id), label: a.code ? `${a.name} (${a.code})` : String(a.name) })),
];
const plotLabel = (p: AnyRow) =>
  [`Plot ${p.number}`, p.areaSqYd ? `${p.areaSqYd} sq yd` : '', p.totalPrice ? formatRupees(p.totalPrice) : '', humanize(p.status)]
    .filter(Boolean)
    .join(' · ');

const FACINGS = [
  { value: 'EAST', label: 'East' },
  { value: 'WEST', label: 'West' },
  { value: 'NORTH', label: 'North' },
  { value: 'SOUTH', label: 'South' },
] as const;

/* --------------------------------- project -------------------------------- */

const PROJECT_TYPES = [
  { value: 'Open plots', label: 'Open plots', hint: 'Residential layout, HMDA / DTCP' },
  { value: 'Villa plots', label: 'Villa plots', hint: 'Gated community with villas' },
  { value: 'Farm land', label: 'Farm land', hint: 'Agricultural / farm plots' },
  { value: 'Commercial', label: 'Commercial', hint: 'Commercial or mixed-use parcels' },
];

export function ProjectOnboardingPage() {
  const nav = useNavigate();
  const createdId = useRef<string | null>(null);
  const { form: f, set, errors: err, check, dirty } = useWizardForm({
    name: '',
    code: '',
    projectType: 'Open plots',
    city: '',
    state: 'Telangana',
    location: '',
    address: '',
    pincode: '',
    reraNumber: '',
    description: '',
  });

  const steps: WizardStep[] = [
    {
      title: 'Project identity',
      summary: 'Name, code, type and city.',
      validate: () =>
        check({
          name: f.name.trim() ? undefined : 'Project name is required.',
          code: f.code.trim() ? undefined : 'Project code is required.',
          city: f.city.trim() ? undefined : 'City / district is required.',
        }),
      content: (
        <>
          <Field label="Project name" required error={err.name}>
            <TextInput value={f.name} onChange={(v) => set('name', v)} placeholder="Bhairava Green Meadows" invalid={!!err.name} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project code" required error={err.code} hint="Unique short code, e.g. BGM">
              <TextInput value={f.code} onChange={(v) => set('code', v.toUpperCase().replace(/\s+/g, '-'))} placeholder="BGM" invalid={!!err.code} />
            </Field>
            <Field label="City / district" required error={err.city}>
              <TextInput value={f.city} onChange={(v) => set('city', v)} placeholder="Hyderabad" invalid={!!err.city} />
            </Field>
          </div>
          <Field label="Project type">
            <ChoiceGrid value={f.projectType} onChange={(v) => set('projectType', v)} options={PROJECT_TYPES} />
          </Field>
        </>
      ),
    },
    {
      title: 'Location & approvals',
      summary: 'Where the parcel sits and how it is approved.',
      validate: () => check({ pincode: !f.pincode || /^\d{6}$/.test(f.pincode) ? undefined : 'Pincode must be 6 digits.' }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="State">
              <TextInput value={f.state} onChange={(v) => set('state', v)} />
            </Field>
            <Field label="Location" hint="Locality / village">
              <TextInput value={f.location} onChange={(v) => set('location', v)} placeholder="Shankarpally" />
            </Field>
          </div>
          <Field label="Address">
            <TextareaInput rows={2} value={f.address} onChange={(v) => set('address', v)} placeholder="Survey no., road, landmark" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pincode" error={err.pincode}>
              <TextInput inputMode="numeric" value={f.pincode} onChange={(v) => set('pincode', digits(v, 6))} placeholder="501203" invalid={!!err.pincode} />
            </Field>
            <Field label="RERA registration">
              <TextInput value={f.reraNumber} onChange={(v) => set('reraNumber', v.toUpperCase())} placeholder="P02400000000" />
            </Field>
          </div>
          <Field label="Description">
            <TextareaInput rows={3} value={f.description} onChange={(v) => set('description', v)} placeholder="Highlights, approvals, amenities" />
          </Field>
        </>
      ),
    },
    {
      title: 'Review',
      summary: 'Confirm the project before it is created.',
      content: (
        <>
          <ReviewList
            rows={[
              { label: 'Name', value: f.name, step: 0 },
              { label: 'Code', value: f.code, step: 0 },
              { label: 'Type', value: f.projectType, step: 0 },
              { label: 'City', value: f.city, step: 0 },
              { label: 'Location', value: [f.location, f.state].filter(Boolean).join(', '), step: 1 },
              { label: 'Address', value: [f.address, f.pincode].filter(Boolean).join(' — '), step: 1 },
              { label: 'RERA', value: f.reraNumber || 'Not registered yet', step: 1 },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Plot types, pricing, phases and layouts are configured in the project workspace after creation.
          </p>
        </>
      ),
    },
  ];

  async function complete() {
    if (!createdId.current) {
      const created = await api.projects.create({
        name: f.name.trim(),
        code: f.code.trim(),
        city: f.city.trim() || undefined,
        state: f.state.trim() || undefined,
        location: f.location.trim() || undefined,
        description: f.description.trim() || undefined,
      });
      createdId.current = String(created.id);
    }
    const extra = Object.fromEntries(
      Object.entries({ projectType: f.projectType, address: f.address.trim(), pincode: f.pincode, reraNumber: f.reraNumber.trim() }).filter(([, v]) => v),
    );
    if (Object.keys(extra).length) {
      try {
        await api.projects.update(createdId.current, extra);
      } catch (ex) {
        throw new Error(`Project created, but saving address/approval details failed — retry to save them. ${(ex as Error).message ?? ''}`);
      }
    }
    nav(`/projects/${createdId.current}`);
  }

  return (
    <OnboardingShell
      eyebrow="Portfolio"
      title="Add a project"
      description="Register a new land parcel on the production API, then configure inventory in its workspace."
      cancelTo="/projects"
      steps={steps}
      onComplete={complete}
      submitLabel="Create project"
      submitTestId="project-onboard-save"
      dirty={dirty}
    />
  );
}

/* ---------------------------------- plot ---------------------------------- */

export function PlotOnboardingPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const projects = useProjects();
  const { form: f, set, errors: err, check, dirty } = useWizardForm({
    projectId: params.get('projectId') ?? '',
    number: '',
    areaSqYd: '',
    facing: '',
    ratePerSqYd: '',
    notes: '',
  });
  const total = isPositive(f.areaSqYd) && isPositive(f.ratePerSqYd) ? Number(f.areaSqYd) * Number(f.ratePerSqYd) : null;

  const steps: WizardStep[] = [
    {
      title: 'Plot identity',
      summary: 'Which project this plot belongs to, and its number.',
      validate: () =>
        check({
          projectId: f.projectId ? undefined : 'Select a project.',
          number: f.number.trim() ? undefined : 'Plot number is required.',
        }),
      content: (
        <>
          <Field label="Project" required error={err.projectId}>
            <SelectInput
              value={f.projectId}
              onChange={(v) => set('projectId', v)}
              placeholder={projects.length ? 'Select a project' : 'No projects yet'}
              options={projectOptions(projects)}
              invalid={!!err.projectId}
            />
          </Field>
          <Field label="Plot number" required error={err.number} hint="Must be unique within the project">
            <TextInput value={f.number} onChange={(v) => set('number', v.toUpperCase())} placeholder="A-101" invalid={!!err.number} />
          </Field>
        </>
      ),
    },
    {
      title: 'Dimensions & pricing',
      summary: 'Area, facing and the base rate.',
      validate: () =>
        check({
          areaSqYd: isPositive(f.areaSqYd) ? undefined : 'Enter the plot area in sq yd.',
          ratePerSqYd: !f.ratePerSqYd || isPositive(f.ratePerSqYd) ? undefined : 'Rate must be a positive number.',
        }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Area (sq yd)" required error={err.areaSqYd}>
              <TextInput inputMode="decimal" value={f.areaSqYd} onChange={(v) => set('areaSqYd', v)} placeholder="200" invalid={!!err.areaSqYd} />
            </Field>
            <Field label="Rate / sq yd (₹)" error={err.ratePerSqYd} hint={total != null ? `Total ${formatRupees(total)}` : 'Optional'}>
              <TextInput inputMode="decimal" value={f.ratePerSqYd} onChange={(v) => set('ratePerSqYd', v)} placeholder="18000" invalid={!!err.ratePerSqYd} />
            </Field>
          </div>
          <Field label="Facing">
            <SelectInput value={f.facing} onChange={(v) => set('facing', v)} options={[{ value: '', label: 'Not specified' }, ...FACINGS]} />
          </Field>
        </>
      ),
    },
    {
      title: 'Review',
      summary: 'New plots are created as Available inventory.',
      content: (
        <>
          <Field label="Notes">
            <TextareaInput rows={2} value={f.notes} onChange={(v) => set('notes', v)} placeholder="Corner plot, park facing, …" />
          </Field>
          <ReviewList
            rows={[
              { label: 'Project', value: nameOf(projects, f.projectId), step: 0 },
              { label: 'Plot number', value: f.number, step: 0 },
              { label: 'Area', value: f.areaSqYd ? `${f.areaSqYd} sq yd` : '', step: 1 },
              { label: 'Facing', value: f.facing ? humanize(f.facing) : 'Not specified', step: 1 },
              { label: 'Rate / sq yd', value: f.ratePerSqYd ? formatRupees(f.ratePerSqYd) : 'Not set', step: 1 },
              { label: 'Total price', value: total != null ? formatRupees(total) : 'Not set' },
            ]}
          />
        </>
      ),
    },
  ];

  async function complete() {
    await api.plots.create({
      projectId: f.projectId,
      number: f.number.trim(),
      areaSqYd: Number(f.areaSqYd),
      ...(f.ratePerSqYd ? { ratePerSqYd: Number(f.ratePerSqYd) } : {}),
      ...(f.facing ? { facing: f.facing } : {}),
      ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
    });
    nav(`/projects/${f.projectId}/plots`);
  }

  return (
    <OnboardingShell
      eyebrow="Portfolio"
      title="Add a plot"
      description="Add a single plot to a project's inventory. Draw its boundary later in the layout editor."
      cancelTo={f.projectId ? `/projects/${f.projectId}/plots` : '/plots'}
      steps={steps}
      onComplete={complete}
      submitLabel="Create plot"
      submitTestId="plot-onboard-save"
      dirty={dirty}
    />
  );
}

/* ---------------------------------- visit --------------------------------- */

export function VisitOnboardingPage() {
  const nav = useNavigate();
  const projects = useProjects();
  const customers = useCustomers();
  const agents = useAgents();
  const { form: f, set, errors: err, check, dirty } = useWizardForm({
    customerId: '',
    projectId: '',
    date: addDays(1),
    time: '11:00',
    agentId: '',
    notes: '',
  });
  const when = new Date(`${f.date}T${f.time || '00:00'}`);

  const steps: WizardStep[] = [
    {
      title: 'Customer & project',
      summary: 'Who is visiting, and which project they want to see.',
      validate: () =>
        check({
          customerId: f.customerId ? undefined : 'Select a customer.',
          projectId: f.projectId ? undefined : 'Select a project.',
        }),
      content: (
        <>
          <Field label="Customer" required error={err.customerId}>
            <SelectInput
              value={f.customerId}
              onChange={(v) => set('customerId', v)}
              placeholder={customers.length ? 'Select a customer' : 'No customers yet'}
              options={customerOptions(customers)}
              invalid={!!err.customerId}
            />
          </Field>
          <Field label="Project" required error={err.projectId}>
            <SelectInput
              value={f.projectId}
              onChange={(v) => set('projectId', v)}
              placeholder={projects.length ? 'Select a project' : 'No projects yet'}
              options={projectOptions(projects)}
              invalid={!!err.projectId}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            New visitor? <Link to="/onboarding/customer" className="font-medium text-primary">Onboard the customer</Link> first.
          </p>
        </>
      ),
    },
    {
      title: 'Schedule',
      summary: 'When they come and who hosts.',
      validate: () =>
        check({
          date: f.date ? undefined : 'Pick a date.',
          time: f.time && !Number.isNaN(when.getTime()) ? undefined : 'Pick a time.',
        }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" required error={err.date}>
              <TextInput type="date" value={f.date} onChange={(v) => set('date', v)} invalid={!!err.date} />
            </Field>
            <Field label="Time" required error={err.time}>
              <TextInput type="time" value={f.time} onChange={(v) => set('time', v)} invalid={!!err.time} />
            </Field>
          </div>
          <Field label="Hosting agent">
            <SelectInput value={f.agentId} onChange={(v) => set('agentId', v)} options={agentOptions(agents)} />
          </Field>
        </>
      ),
    },
    {
      title: 'Confirm visit',
      summary: 'Notes and a last look before the visit is booked.',
      content: (
        <>
          <Field label="Notes">
            <TextareaInput rows={3} value={f.notes} onChange={(v) => set('notes', v)} placeholder="Pickup needed, number of visitors, plots of interest…" />
          </Field>
          <ReviewList
            rows={[
              { label: 'Customer', value: nameOf(customers, f.customerId), step: 0 },
              { label: 'Project', value: nameOf(projects, f.projectId), step: 0 },
              { label: 'When', value: formatDateTime(when.toISOString()), step: 1 },
              { label: 'Agent', value: nameOf(agents, f.agentId) || 'Unassigned', step: 1 },
            ]}
          />
        </>
      ),
    },
  ];

  async function complete() {
    await api.visits.create({
      projectId: f.projectId,
      customerId: f.customerId,
      scheduledAt: when.toISOString(),
      ...(f.agentId ? { agentId: f.agentId } : {}),
      ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
    });
    nav('/visits');
  }

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Book a site visit"
      description="Schedule a project walkthrough for a customer."
      cancelTo="/visits"
      steps={steps}
      onComplete={complete}
      submitLabel="Book visit"
      submitTestId="visit-onboard-save"
      dirty={dirty}
    />
  );
}

/* ------------------------------- reservation ------------------------------ */

export function ReservationOnboardingPage() {
  const nav = useNavigate();
  const projects = useProjects();
  const customers = useCustomers();
  const agents = useAgents();
  const { form: f, set, errors: err, check, dirty } = useWizardForm({
    customerId: '',
    projectId: '',
    plotId: '',
    holdHours: '48',
    agentId: '',
    notes: '',
  });
  const plots = usePlots(f.projectId);
  const available = plots.rows.filter((p) => p.status === 'AVAILABLE');
  const plot = available.find((p) => String(p.id) === f.plotId);
  const hours = Number(f.holdHours);
  const expires = Number.isInteger(hours) && hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : '';

  const steps: WizardStep[] = [
    {
      title: 'Customer & plot',
      summary: 'Who is holding the plot, and which one.',
      validate: () =>
        check({
          customerId: f.customerId ? undefined : 'Select a customer.',
          projectId: f.projectId ? undefined : 'Select a project.',
          plotId: f.plotId ? undefined : 'Select an available plot.',
        }),
      content: (
        <>
          <Field label="Customer" required error={err.customerId}>
            <SelectInput
              value={f.customerId}
              onChange={(v) => set('customerId', v)}
              placeholder={customers.length ? 'Select a customer' : 'No customers yet'}
              options={customerOptions(customers)}
              invalid={!!err.customerId}
            />
          </Field>
          <Field label="Project" required error={err.projectId}>
            <SelectInput
              value={f.projectId}
              onChange={(v) => {
                set('projectId', v);
                set('plotId', '');
              }}
              placeholder={projects.length ? 'Select a project' : 'No projects yet'}
              options={projectOptions(projects)}
              invalid={!!err.projectId}
            />
          </Field>
          <Field
            label="Plot"
            required
            error={err.plotId}
            hint={f.projectId && !plots.loading ? `${available.length} of ${plots.rows.length} plots available` : undefined}
          >
            <SelectInput
              value={f.plotId}
              onChange={(v) => set('plotId', v)}
              disabled={!f.projectId}
              placeholder={!f.projectId ? 'Select a project first' : available.length ? 'Select a plot' : 'No available plots'}
              options={available.map((p) => ({ value: String(p.id), label: plotLabel(p) }))}
              invalid={!!err.plotId}
            />
          </Field>
        </>
      ),
    },
    {
      title: 'Hold terms',
      summary: 'How long the plot is held and who owns the reservation.',
      validate: () =>
        check({ holdHours: Number.isInteger(hours) && hours >= 1 && hours <= 168 ? undefined : 'Hold must be 1–168 hours.' }),
      content: (
        <>
          <Field label="Hold (hours)" required error={err.holdHours} hint={expires ? `Expires ${formatDateTime(expires)}` : 'Up to 7 days (168 h)'}>
            <TextInput inputMode="numeric" value={f.holdHours} onChange={(v) => set('holdHours', digits(v, 3))} invalid={!!err.holdHours} />
          </Field>
          <Field label="Assigned agent">
            <SelectInput value={f.agentId} onChange={(v) => set('agentId', v)} options={agentOptions(agents)} />
          </Field>
        </>
      ),
    },
    {
      title: 'Review',
      summary: 'Confirm the hold before it goes live on inventory.',
      content: (
        <>
          <Field label="Notes">
            <TextareaInput rows={2} value={f.notes} onChange={(v) => set('notes', v)} />
          </Field>
          <ReviewList
            rows={[
              { label: 'Customer', value: nameOf(customers, f.customerId), step: 0 },
              { label: 'Project', value: nameOf(projects, f.projectId), step: 0 },
              { label: 'Plot', value: plot ? plotLabel(plot) : '', step: 0 },
              { label: 'Hold', value: `${f.holdHours} hours`, step: 1 },
              { label: 'Expires (approx.)', value: expires ? formatDateTime(expires) : '' },
              { label: 'Agent', value: nameOf(agents, f.agentId) || 'Unassigned', step: 1 },
            ]}
          />
        </>
      ),
    },
  ];

  async function complete() {
    await api.reservations.create({
      plotId: f.plotId,
      customerId: f.customerId,
      holdHours: hours,
      ...(f.agentId ? { agentId: f.agentId } : {}),
      ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
    });
    nav('/reservations');
  }

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Create a reservation"
      description="Place a time-boxed hold on an available plot. Expired holds release inventory automatically."
      cancelTo="/reservations"
      steps={steps}
      onComplete={complete}
      submitLabel="Reserve plot"
      submitTestId="reservation-onboard-save"
      dirty={dirty}
    />
  );
}

/* --------------------------------- booking -------------------------------- */

const BOOKABLE = new Set(['AVAILABLE', 'RESERVED', 'RESALE_AVAILABLE']);
const LIVE_RESERVATION = new Set(['ACTIVE', 'EXPIRING_TODAY']);

function equalInstalments(balance: bigint, count: number, firstDue: string, everyMonths: number) {
  if (balance <= 0n || count < 1) return [];
  const n = BigInt(count);
  const base = balance / n;
  const remainder = balance - base * n;
  return Array.from({ length: count }, (_, idx) => ({
    installmentNumber: idx + 1,
    name: `Instalment ${idx + 1}`,
    dueDate: addMonths(firstDue, idx * everyMonths),
    amountDuePaise: (idx === count - 1 ? base + remainder : base).toString(),
  }));
}

export function BookingOnboardingPage() {
  const nav = useNavigate();
  const createdBookingId = useRef<string | null>(null);
  const projects = useProjects();
  const customers = useCustomers();
  const agents = useAgents();
  const { form: f, set, errors: err, check, dirty } = useWizardForm({
    customerId: '',
    projectId: '',
    plotId: '',
    reservationId: '',
    agentId: '',
    agreementValue: '',
    advance: '',
    notes: '',
    createSchedule: false,
    instalments: '3',
    firstDueDate: addDays(30),
    everyMonths: '1',
  });
  const plots = usePlots(f.projectId);
  const bookable = plots.rows.filter((p) => BOOKABLE.has(String(p.status)));
  const plot = bookable.find((p) => String(p.id) === f.plotId);
  const reservations = useAsyncList(
    () => (f.projectId ? asRows(api.reservations.list({ projectId: f.projectId })) : Promise.resolve([])),
    [f.projectId],
  );
  const liveReservations = reservations.rows.filter(
    (r) => String(r.plotId) === f.plotId && String(r.customerId) === f.customerId && LIVE_RESERVATION.has(String(r.state)),
  );

  useEffect(() => {
    if (f.reservationId && !liveReservations.some((r) => String(r.id) === f.reservationId)) set('reservationId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.plotId, f.customerId, reservations.rows]);

  const agreementPaise = rupeesToPaise(f.agreementValue);
  const advancePaise = f.advance ? rupeesToPaise(f.advance) : 0n;
  const balancePaise = agreementPaise != null && advancePaise != null ? agreementPaise - advancePaise : null;
  const instalmentCount = Number(f.instalments);
  const everyMonths = Number(f.everyMonths);
  const schedule = useMemo(
    () =>
      f.createSchedule && balancePaise != null && Number.isInteger(instalmentCount) && Number.isInteger(everyMonths) && f.firstDueDate
        ? equalInstalments(balancePaise, instalmentCount, f.firstDueDate, everyMonths)
        : [],
    [f.createSchedule, balancePaise, instalmentCount, everyMonths, f.firstDueDate],
  );

  const steps: WizardStep[] = [
    {
      title: 'Customer & plot',
      summary: 'The buyer and the inventory being booked.',
      validate: () =>
        check({
          customerId: f.customerId ? undefined : 'Select a customer.',
          projectId: f.projectId ? undefined : 'Select a project.',
          plotId: f.plotId ? undefined : 'Select a plot.',
        }),
      content: (
        <>
          <Field label="Customer" required error={err.customerId}>
            <SelectInput
              value={f.customerId}
              onChange={(v) => set('customerId', v)}
              placeholder={customers.length ? 'Select a customer' : 'No customers yet'}
              options={customerOptions(customers)}
              invalid={!!err.customerId}
            />
          </Field>
          <Field label="Project" required error={err.projectId}>
            <SelectInput
              value={f.projectId}
              onChange={(v) => {
                set('projectId', v);
                set('plotId', '');
              }}
              placeholder={projects.length ? 'Select a project' : 'No projects yet'}
              options={projectOptions(projects)}
              invalid={!!err.projectId}
            />
          </Field>
          <Field label="Plot" required error={err.plotId} hint="Available, reserved or resale-available plots">
            <SelectInput
              value={f.plotId}
              onChange={(v) => {
                set('plotId', v);
                const picked = bookable.find((p) => String(p.id) === v);
                if (picked?.totalPrice && !f.agreementValue) set('agreementValue', String(Number(picked.totalPrice)));
              }}
              disabled={!f.projectId}
              placeholder={!f.projectId ? 'Select a project first' : bookable.length ? 'Select a plot' : 'No bookable plots'}
              options={bookable.map((p) => ({ value: String(p.id), label: plotLabel(p) }))}
              invalid={!!err.plotId}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Reservation" hint={liveReservations.length ? 'Converts the hold into this booking' : 'No live hold for this customer & plot'}>
              <SelectInput
                value={f.reservationId}
                onChange={(v) => set('reservationId', v)}
                disabled={!liveReservations.length}
                options={[
                  { value: '', label: 'None' },
                  ...liveReservations.map((r) => ({ value: String(r.id), label: `Hold until ${formatDateTime(r.expiresAt)}` })),
                ]}
              />
            </Field>
            <Field label="Assigned agent" hint="Defaults to the reservation or customer's agent">
              <SelectInput value={f.agentId} onChange={(v) => set('agentId', v)} options={agentOptions(agents)} />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: 'Pricing',
      summary: 'The agreement value this booking will lock.',
      validate: () =>
        check({ agreementValue: agreementPaise != null && agreementPaise > 0n ? undefined : 'Enter the agreement value in rupees.' }),
      content: (
        <>
          {plot && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-low p-3.5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Plot</p>
                <p className="pt-0.5 font-medium">{String(plot.number)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Area</p>
                <p className="numeric pt-0.5 font-medium">{plot.areaSqYd ? `${plot.areaSqYd} sq yd` : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">List price</p>
                <p className="numeric pt-0.5 font-medium">{formatRupees(plot.totalPrice)}</p>
              </div>
            </div>
          )}
          <Field
            label="Agreement value (₹)"
            required
            error={err.agreementValue}
            hint={agreementPaise ? formatPaise(agreementPaise.toString()) : 'Final sale consideration'}
          >
            <TextInput inputMode="decimal" value={f.agreementValue} onChange={(v) => set('agreementValue', v)} placeholder="3600000" invalid={!!err.agreementValue} />
          </Field>
        </>
      ),
    },
    {
      title: 'Advance',
      summary: 'Advance collected against this booking.',
      validate: () =>
        check({
          advance:
            advancePaise == null
              ? 'Enter the advance in rupees.'
              : agreementPaise != null && advancePaise > agreementPaise
                ? 'Advance cannot exceed the agreement value.'
                : undefined,
        }),
      content: (
        <>
          <Field
            label="Advance (₹)"
            error={err.advance}
            hint={advancePaise && balancePaise != null ? `Balance ${formatPaise(balancePaise.toString())}` : 'Optional — record receipts under Payments'}
          >
            <TextInput inputMode="decimal" value={f.advance} onChange={(v) => set('advance', v)} placeholder="100000" invalid={!!err.advance} />
          </Field>
          <Field label="Notes">
            <TextareaInput rows={3} value={f.notes} onChange={(v) => set('notes', v)} />
          </Field>
        </>
      ),
    },
    {
      title: 'Review & confirm',
      summary: 'A last look before the booking is created.',
      validate: () =>
        f.createSchedule
          ? check({
              instalments: Number.isInteger(instalmentCount) && instalmentCount >= 1 && instalmentCount <= 60 ? undefined : '1–60 instalments.',
              everyMonths: Number.isInteger(everyMonths) && everyMonths >= 1 && everyMonths <= 12 ? undefined : '1–12 months.',
              firstDueDate: f.firstDueDate ? undefined : 'Pick the first due date.',
              createSchedule: balancePaise != null && balancePaise > 0n ? undefined : 'Nothing left to schedule after the advance.',
            })
          : undefined,
      content: (
        <>
          <ReviewList
            rows={[
              { label: 'Customer', value: nameOf(customers, f.customerId), step: 0 },
              { label: 'Plot', value: plot ? `${nameOf(projects, f.projectId)} · ${plotLabel(plot)}` : '', step: 0 },
              { label: 'Reservation', value: f.reservationId ? 'Converting live hold' : 'None', step: 0 },
              { label: 'Agent', value: nameOf(agents, f.agentId) || 'Default', step: 0 },
              { label: 'Agreement value', value: agreementPaise ? formatPaise(agreementPaise.toString()) : '', step: 1 },
              { label: 'Advance', value: advancePaise ? formatPaise(advancePaise.toString()) : 'None', step: 2 },
              { label: 'Balance', value: balancePaise != null ? formatPaise(balancePaise.toString()) : '' },
            ]}
          />
          <Field label="Payment schedule" error={err.createSchedule}>
            <Checkbox
              checked={f.createSchedule}
              onChange={(v) => set('createSchedule', v)}
              label="Also create a payment schedule"
              hint="Splits the balance into equal instalments on the new booking."
            />
          </Field>
          {f.createSchedule && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Instalments" required error={err.instalments}>
                  <TextInput inputMode="numeric" value={f.instalments} onChange={(v) => set('instalments', digits(v, 2))} invalid={!!err.instalments} />
                </Field>
                <Field label="First due" required error={err.firstDueDate}>
                  <TextInput type="date" value={f.firstDueDate} onChange={(v) => set('firstDueDate', v)} invalid={!!err.firstDueDate} />
                </Field>
                <Field label="Every (months)" required error={err.everyMonths}>
                  <TextInput inputMode="numeric" value={f.everyMonths} onChange={(v) => set('everyMonths', digits(v, 2))} invalid={!!err.everyMonths} />
                </Field>
              </div>
              {schedule.length > 0 && (
                <ol className="divide-y divide-outline-variant/40 overflow-hidden rounded-xl bg-surface-low text-sm">
                  {schedule.map((s) => (
                    <li key={s.installmentNumber} className="flex items-center justify-between gap-3 px-3.5 py-2">
                      <span className="font-medium">{s.name}</span>
                      <span className="numeric text-xs text-muted-foreground">{formatDate(s.dueDate)}</span>
                      <span className="numeric font-medium">{formatPaise(s.amountDuePaise)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      ),
    },
  ];

  async function complete() {
    if (!createdBookingId.current) {
      const booking = await api.bookings.create({
        plotId: f.plotId,
        customerId: f.customerId,
        agreementValuePaise: agreementPaise!.toString(),
        ...(advancePaise ? { advancePaise: advancePaise.toString() } : {}),
        ...(f.reservationId ? { reservationId: f.reservationId } : {}),
        ...(f.agentId ? { agentId: f.agentId } : {}),
        ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
      });
      createdBookingId.current = String(booking.id);
    }
    if (f.createSchedule && schedule.length) {
      try {
        await api.paymentSchedules.create({ bookingId: createdBookingId.current, items: schedule });
      } catch (ex) {
        throw new Error(`Booking created, but the payment schedule failed — retry, or untick it to finish. ${(ex as Error).message ?? ''}`);
      }
    }
    nav(`/bookings/${createdBookingId.current}`);
  }

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Create a booking"
      description="Book a plot for a customer, optionally converting a live reservation and scheduling instalments."
      cancelTo="/bookings"
      steps={steps}
      onComplete={complete}
      submitLabel="Create booking"
      submitTestId="booking-onboard-save"
      dirty={dirty}
    />
  );
}

/* ---------------------------------- agent --------------------------------- */

export type AgentOnboardingHandoff = { name: string; phone: string; email: string; region: string };

export function AgentOnboardingPage() {
  const nav = useNavigate();
  const projects = useProjects();
  const { form: f, set, errors: err, check, dirty } = useWizardForm({
    name: '',
    phone: '',
    email: '',
    employeeCode: '',
    region: '',
    projectId: '',
  });

  const steps: WizardStep[] = [
    {
      title: 'Identity & contact',
      summary: 'Agent name, mobile and internal code.',
      validate: () =>
        check({
          name: f.name.trim() ? undefined : 'Full name is required.',
          phone: isPhone(f.phone) ? undefined : 'Enter a 10-digit mobile number.',
          email: !f.email || isEmail(f.email) ? undefined : 'Enter a valid email address.',
        }),
      content: (
        <>
          <Field label="Full name" required error={err.name}>
            <TextInput value={f.name} onChange={(v) => set('name', v)} placeholder="Anitha Rao" invalid={!!err.name} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mobile" required error={err.phone} hint="10-digit number">
              <TextInput type="tel" value={f.phone} onChange={(v) => set('phone', digits(v, 10))} placeholder="9000000000" invalid={!!err.phone} />
            </Field>
            <Field label="Email" error={err.email} hint="Used for the Members invite">
              <TextInput type="email" value={f.email} onChange={(v) => set('email', v)} placeholder="agent@example.com" invalid={!!err.email} />
            </Field>
          </div>
          <Field label="Employee code" hint="Internal code, e.g. AG-001">
            <TextInput value={f.employeeCode} onChange={(v) => set('employeeCode', v.toUpperCase())} placeholder="AG-001" />
          </Field>
        </>
      ),
    },
    {
      title: 'Region & assignment',
      summary: 'Territory and the project they will sell.',
      content: (
        <>
          <Field label="Region / territory">
            <TextInput value={f.region} onChange={(v) => set('region', v)} placeholder="West Hyderabad" />
          </Field>
          <Field label="Assigned project">
            <SelectInput
              value={f.projectId}
              onChange={(v) => set('projectId', v)}
              options={[{ value: '', label: 'None yet' }, ...projectOptions(projects)]}
            />
          </Field>
        </>
      ),
    },
    {
      title: 'Review',
      summary: 'Confirm the details, then provision the agent under Members.',
      content: (
        <>
          <ReviewList
            rows={[
              { label: 'Name', value: f.name, step: 0 },
              { label: 'Mobile', value: f.phone, step: 0 },
              { label: 'Email', value: f.email || 'Not provided', step: 0 },
              { label: 'Code', value: f.employeeCode || 'Not set', step: 0 },
              { label: 'Region', value: f.region || 'Not set', step: 1 },
              { label: 'Project', value: nameOf(projects, f.projectId) || 'None yet', step: 1 },
            ]}
          />
          <Notice tone="info">
            Agent roster entries are created when a Founder adds a member with the AGENT role. Continuing takes you to Members —
            nothing is saved from this form.
          </Notice>
        </>
      ),
    },
  ];

  function complete() {
    const agentOnboarding: AgentOnboardingHandoff = { name: f.name.trim(), phone: f.phone, email: f.email.trim(), region: f.region.trim() };
    nav('/settings/users', { state: { agentOnboarding } });
  }

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Onboard an agent"
      description="Capture a sales agent's identity and territory, then provision them as a Member with the AGENT role."
      cancelTo="/agents"
      steps={steps}
      onComplete={complete}
      submitLabel="Continue to Members"
      submitTestId="agent-onboard-continue"
      dirty={dirty}
    />
  );
}
