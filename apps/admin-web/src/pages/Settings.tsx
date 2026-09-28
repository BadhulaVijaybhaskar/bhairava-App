import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Archive, Braces, ChevronDown, CreditCard, RotateCcw, Save, UserCog } from 'lucide-react';
import {
  Btn,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LinkBtn,
  LoadingState,
  NumberInput,
  PageHeader,
  Panel,
  SectionTitle,
  SwitchControl,
  TextareaInput,
  TextInput,
} from '@bhairava/ui-web';
import { api } from '../api';
import type { AgentOnboardingHandoff } from './OnboardingWizards';
import { FormActions, Mono, Muted, NativeSelect, NativeTextarea, Notice } from '../components/common';
import { errMsg, formatDate, humanize, shortId, type AnyRow } from '../lib/data';
import { ResourceTable } from './ResourceList';

function AgentProvisioningPanel({ agent }: { agent: AgentOnboardingHandoff }) {
  const contact = [agent.email, agent.phone, agent.region].filter(Boolean).join(' · ');
  return (
    <Panel className="mb-4" data-testid="agent-provisioning-notice">
      <SectionTitle aside={<LinkBtn to="/agents">View agents</LinkBtn>}>
        <UserCog className="mr-1 inline h-4 w-4" /> Provision {agent.name || 'the agent'} as a Member
      </SectionTitle>
      <p className="text-sm text-muted-foreground">
        Agent roster entries are provisioned via Members with the <span className="font-semibold text-foreground">AGENT</span> role by a
        Founder. Nothing was saved from the agent form — once a Founder adds this person as a member with role AGENT, their profile
        appears under Agents and can be assigned customers, visits and bookings.
      </p>
      {contact && <p className="pt-2 text-sm font-medium">{contact}</p>}
    </Panel>
  );
}

export function MembersPage() {
  const { state } = useLocation();
  const agent = (state as { agentOnboarding?: AgentOnboardingHandoff } | null)?.agentOnboarding;
  return (
    <ResourceTable
      eyebrow="Management"
      title="Members"
      description="Organization users and their RBAC roles, enforced server-side."
      banner={agent ? <AgentProvisioningPanel agent={agent} /> : undefined}
      loader={() => api.users.list() as Promise<AnyRow[]>}
      statusKey="roleCode"
      searchKeys={['displayName', 'email', 'roleCode', 'status']}
      columns={[
        {
          key: 'displayName',
          label: 'Member',
          render: (u) => (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{u.displayName || u.email || '—'}</p>
              <Muted className="block truncate">{u.email || '—'}</Muted>
            </div>
          ),
        },
        { key: 'roleCode', label: 'Role', kind: 'status' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'lastLoginAt', label: 'Last login', kind: 'datetime' },
      ]}
    />
  );
}

export function AuditPage() {
  return (
    <ResourceTable
      eyebrow="Management"
      title="Audit log"
      description="Append-only trail of every mutation recorded by the production API."
      loader={async () => {
        const res = await api.audit.list({ take: 100 });
        return Array.isArray(res) ? res : ((res as AnyRow)?.items ?? []);
      }}
      statusKey="entityType"
      searchKeys={['action', 'entityType', 'entityId', 'actorId']}
      columns={[
        { key: 'createdAt', label: 'When', kind: 'datetime' },
        { key: 'action', label: 'Action', kind: 'strong' },
        {
          key: 'entity',
          label: 'Entity',
          render: (r) => (
            <span className="text-sm">
              {r.entityType || '—'} <Mono className="text-muted-foreground">{shortId(r.entityId)}</Mono>
            </span>
          ),
        },
        { key: 'actorId', label: 'Actor', kind: 'id' },
      ]}
    />
  );
}

/* ------------------------------ shared helpers ------------------------------ */

function isRecord(v: unknown): v is AnyRow {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** `settingsJson` out of the `company_settings` row returned by the API. */
function readSettingsJson(row: unknown): AnyRow {
  if (!isRecord(row)) return {};
  if (isRecord(row.settingsJson)) return row.settingsJson;
  if (isRecord(row.settings)) return row.settings;
  return {};
}

/** Re-reads the live row right before the PUT so keys written elsewhere since page load survive. */
async function mergeCompanySettings(patch: (current: AnyRow) => AnyRow): Promise<AnyRow> {
  const current = readSettingsJson(await api.companySettings.get());
  const next = patch(current);
  const saved = await api.companySettings.update(next);
  return isRecord(saved) && isRecord(saved.settingsJson) ? saved.settingsJson : next;
}

type Viewer = { loading: boolean; roleCode: string; email: string; err: string };

function useViewer(): Viewer {
  const [viewer, setViewer] = useState<Viewer>({ loading: true, roleCode: '', email: '', err: '' });
  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((r: unknown) => {
        const u: AnyRow = isRecord(r) && isRecord(r.user) ? r.user : isRecord(r) ? r : {};
        if (!cancelled) {
          setViewer({ loading: false, roleCode: String(u.roleCode ?? u.role ?? '').toUpperCase(), email: String(u.email ?? ''), err: '' });
        }
      })
      .catch((e) => {
        if (!cancelled) setViewer({ loading: false, roleCode: '', email: '', err: errMsg(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return viewer;
}

function isFounder(roleCode: string) {
  return roleCode.includes('FOUNDER');
}

/** Mirrors the API's `settings.manage` check on PUT /api/company-settings. */
function canManageSettings(roleCode: string) {
  return isFounder(roleCode) || roleCode === 'ADMINISTRATOR';
}

function FounderGate({ viewer, testId, denied, children }: { viewer: Viewer; testId: string; denied: string; children: ReactNode }) {
  if (viewer.loading) return <LoadingState variant="rows" rows={3} />;
  if (viewer.err) return <ErrorState title="Couldn't verify your role" error={viewer.err} />;
  if (!isFounder(viewer.roleCode)) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground" data-testid={testId}>
          {denied}
        </p>
      </Panel>
    );
  }
  return <>{children}</>;
}

type Msg = { tone: 'ok' | 'err'; text: string } | null;

/* ----------------------------- company settings ----------------------------- */

type NotificationPref = { category: string; inApp: boolean; email: boolean };

const DEFAULT_NOTIFICATION_PREFS: NotificationPref[] = [
  { category: 'bookings', inApp: true, email: true },
  { category: 'payments', inApp: true, email: true },
  { category: 'documents', inApp: true, email: false },
  { category: 'registrations', inApp: true, email: true },
  { category: 'system', inApp: true, email: false },
];

const COMPANY_TEXT_KEYS = [
  'legalName',
  'tradeName',
  'address',
  'city',
  'state',
  'pincode',
  'phone',
  'email',
  'gstin',
  'pan',
  'rera',
  'logoRef',
  'receiptPrefix',
  'website',
  'receiptFooter',
] as const;

type CompanyTextKey = (typeof COMPANY_TEXT_KEYS)[number];

type CompanyForm = Record<CompanyTextKey, string> & {
  defaultReservationDays: number;
  notificationPrefs: NotificationPref[];
};

const PROFILE_FIELDS: { key: CompanyTextKey; label: string; testId?: string; type?: string }[] = [
  { key: 'legalName', label: 'Legal name', testId: 'company-legal-name' },
  { key: 'tradeName', label: 'Trade name', testId: 'company-trade-name' },
  { key: 'address', label: 'Address', testId: 'company-address' },
  { key: 'city', label: 'City', testId: 'company-city' },
  { key: 'state', label: 'State', testId: 'company-state' },
  { key: 'pincode', label: 'Pincode', testId: 'company-pincode' },
  { key: 'phone', label: 'Phone', testId: 'company-phone', type: 'tel' },
  { key: 'email', label: 'Email', testId: 'company-email', type: 'email' },
  { key: 'gstin', label: 'GSTIN', testId: 'company-gstin' },
  { key: 'pan', label: 'PAN', testId: 'company-pan' },
  { key: 'rera', label: 'RERA / company ref', testId: 'company-rera' },
  { key: 'logoRef', label: 'Logo ref', testId: 'company-logo-ref' },
];

function mergeNotificationPrefs(incoming: unknown): NotificationPref[] {
  const map = new Map<string, NotificationPref>(DEFAULT_NOTIFICATION_PREFS.map((p) => [p.category, { ...p }]));
  if (Array.isArray(incoming)) {
    for (const raw of incoming) {
      if (!isRecord(raw) || typeof raw.category !== 'string' || !raw.category) continue;
      const base = map.get(raw.category) ?? { category: raw.category, inApp: false, email: false };
      map.set(raw.category, {
        category: raw.category,
        inApp: typeof raw.inApp === 'boolean' ? raw.inApp : base.inApp,
        email: typeof raw.email === 'boolean' ? raw.email : base.email,
      });
    }
  }
  return [...map.values()];
}

/** Reads MAIN's flat company keys, falling back to a nested `company` object if an older writer used one. */
function companyFormFromSettings(s: AnyRow): CompanyForm {
  const nested: AnyRow = isRecord(s.company) ? s.company : {};
  const text = {} as Record<CompanyTextKey, string>;
  for (const k of COMPANY_TEXT_KEYS) {
    const v = s[k] ?? nested[k];
    text[k] = v === null || v === undefined ? '' : String(v);
  }
  const days = Number(s.defaultReservationDays ?? nested.defaultReservationDays);
  return {
    ...text,
    defaultReservationDays: Number.isFinite(days) && days > 0 ? Math.min(90, Math.floor(days)) : 7,
    notificationPrefs: mergeNotificationPrefs(s.notificationPrefs ?? nested.notificationPrefs),
  };
}

function settingsWithCompanyForm(current: AnyRow, form: CompanyForm): AnyRow {
  const next: AnyRow = { ...current };
  for (const k of COMPANY_TEXT_KEYS) next[k] = form[k].trim();
  next.defaultReservationDays = form.defaultReservationDays;
  next.notificationPrefs = form.notificationPrefs;
  return next;
}

function TextField({
  label,
  value,
  onChange,
  type,
  testId,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <TextInput value={value} onChange={onChange} type={type} data-testid={testId} disabled={disabled} />
    </Field>
  );
}

export function CompanySettingsPage() {
  const viewer = useViewer();
  const [base, setBase] = useState<AnyRow | null>(null);
  const [form, setForm] = useState<CompanyForm>(() => companyFormFromSettings({}));
  const [rawJson, setRawJson] = useState('{}');
  const [loadErr, setLoadErr] = useState('');
  const [nonce, setNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  function sync(settings: AnyRow) {
    setBase(settings);
    setForm(companyFormFromSettings(settings));
    setRawJson(JSON.stringify(settings, null, 2));
  }

  useEffect(() => {
    setLoadErr('');
    api.companySettings
      .get()
      .then((r) => sync(readSettingsJson(r)))
      .catch((e) => setLoadErr(errMsg(e)));
  }, [nonce]);

  const canMutate = !viewer.loading && canManageSettings(viewer.roleCode);
  const dirty = useMemo(
    () => (base ? JSON.stringify(form) !== JSON.stringify(companyFormFromSettings(base)) : false),
    [base, form],
  );

  function patch<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setMsg(null);
  }

  function setPref(category: string, channel: 'inApp' | 'email', on: boolean) {
    patch(
      'notificationPrefs',
      form.notificationPrefs.map((p) => (p.category === category ? { ...p, [channel]: on } : p)),
    );
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      sync(await mergeCompanySettings((current) => settingsWithCompanyForm(current, form)));
      setMsg({ tone: 'ok', text: 'Company settings saved.' });
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setSaving(false);
    }
  }

  async function saveRaw() {
    setMsg(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setMsg({ tone: 'err', text: 'Advanced JSON is not valid JSON.' });
      return;
    }
    if (!isRecord(parsed)) {
      setMsg({ tone: 'err', text: 'Advanced JSON must be an object.' });
      return;
    }
    setSaving(true);
    try {
      const saved = await api.companySettings.update(parsed);
      sync(isRecord(saved) && isRecord(saved.settingsJson) ? saved.settingsJson : parsed);
      setMsg({ tone: 'ok', text: 'Settings JSON saved.' });
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Company"
        description="Workspace identity, receipt defaults and notification preferences, saved to the organization's company settings."
      />
      {loadErr ? (
        <ErrorState title="Couldn't load company settings" error={loadErr} onRetry={() => setNonce((n) => n + 1)} />
      ) : !base ? (
        <LoadingState variant="rows" rows={6} />
      ) : (
        <form className="space-y-6" onSubmit={save}>
          <Panel data-testid="company-profile">
            <SectionTitle>Company profile</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {PROFILE_FIELDS.map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  value={form[f.key]}
                  onChange={(v) => patch(f.key, v)}
                  type={f.type}
                  testId={f.testId}
                  disabled={!canMutate}
                />
              ))}
            </div>
          </Panel>

          <Panel data-testid="company-receipts">
            <SectionTitle>Receipt & reservation defaults</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Receipt prefix"
                value={form.receiptPrefix}
                onChange={(v) => patch('receiptPrefix', v)}
                testId="company-receipt-prefix"
                disabled={!canMutate}
              />
              <Field label="Default reservation (days)" hint="1–90 days">
                <NumberInput
                  value={form.defaultReservationDays}
                  onChange={(v) => patch('defaultReservationDays', Math.min(90, Math.max(1, Math.floor(v) || 7)))}
                  min={1}
                  max={90}
                  step={1}
                  data-testid="company-reservation-days"
                  disabled={!canMutate}
                />
              </Field>
              <TextField
                label="Website"
                value={form.website}
                onChange={(v) => patch('website', v)}
                type="url"
                testId="company-website"
                disabled={!canMutate}
              />
            </div>
            <Field label="Receipt footer" className="mt-4">
              <TextareaInput
                value={form.receiptFooter}
                onChange={(v) => patch('receiptFooter', v)}
                rows={3}
                data-testid="company-receipt-footer"
                disabled={!canMutate}
              />
            </Field>
          </Panel>

          <Panel tonal data-testid="company-notif-prefs">
            <SectionTitle>Notification preferences</SectionTitle>
            <div className="space-y-2">
              {form.notificationPrefs.map((p) => (
                <div
                  key={p.category}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 rounded-lg bg-surface-low px-4 py-2.5"
                >
                  <p className="text-sm font-medium capitalize">{p.category}</p>
                  <label className="flex items-center gap-2 text-xs">
                    In-app
                    <SwitchControl
                      checked={p.inApp}
                      onCheckedChange={(on) => setPref(p.category, 'inApp', on)}
                      label={`${p.category} in-app`}
                      disabled={!canMutate}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    Email
                    <SwitchControl
                      checked={p.email}
                      onCheckedChange={(on) => setPref(p.category, 'email', on)}
                      label={`${p.category} email`}
                      disabled={!canMutate}
                    />
                  </label>
                </div>
              ))}
            </div>
          </Panel>

          <div className="flex flex-col-reverse items-stretch gap-3 lg:flex-row lg:items-center lg:justify-end">
            {msg ? (
              <div className="lg:mr-auto" data-testid="company-msg">
                <Notice tone={msg.tone}>{msg.text}</Notice>
              </div>
            ) : !viewer.loading && !canMutate ? (
              <Muted className="lg:mr-auto">Only Founders and Administrators can change company settings.</Muted>
            ) : dirty ? (
              <Muted className="lg:mr-auto">Unsaved changes</Muted>
            ) : null}
            <Btn
              type="submit"
              variant="primary"
              className="min-h-12 w-full justify-center lg:w-auto"
              data-testid="company-save"
              disabled={!canMutate || saving}
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
            </Btn>
          </div>

          <details className="panel group p-4 sm:p-6" data-testid="company-advanced-json">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Braces className="h-4 w-4" /> Advanced JSON
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="pt-3 text-xs text-muted-foreground">
              The full <Mono>settingsJson</Mono> row, including keys this form doesn't manage. Saving here replaces the whole object.
            </p>
            <NativeTextarea
              rows={14}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              spellCheck={false}
              className="mt-3 font-mono text-xs"
              disabled={!canMutate}
            />
            <FormActions>
              <Btn variant="tonal" onClick={saveRaw} disabled={!canMutate || saving}>
                Save JSON
              </Btn>
              <Btn onClick={() => setRawJson(JSON.stringify(base, null, 2))} disabled={saving}>
                Reset
              </Btn>
            </FormActions>
          </details>
        </form>
      )}
    </>
  );
}

/* --------------------------------- billing --------------------------------- */

type BillingMeta = {
  planName: string;
  status: string;
  seatsIncluded: string;
  notes: string;
  renewsOn: string;
  billingEmail: string;
};

const DEFAULT_BILLING: BillingMeta = {
  planName: 'Bhairava Production',
  status: 'Active',
  seatsIncluded: '—',
  notes: 'Plan metadata only. Seat counts come from Members. No live charge actions until billing integration is connected.',
  renewsOn: '',
  billingEmail: '',
};

function billingFromSettings(s: AnyRow): BillingMeta {
  const raw: AnyRow = isRecord(s.billing) ? s.billing : {};
  const out = { ...DEFAULT_BILLING };
  for (const k of Object.keys(DEFAULT_BILLING) as (keyof BillingMeta)[]) {
    const v = raw[k];
    if (v !== null && v !== undefined && String(v).trim() !== '') out[k] = String(v);
  }
  return out;
}

export function BillingPage() {
  const viewer = useViewer();
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Founder billing"
        description="Plan metadata only. Seat counts come from Members. No live charge actions until billing integration is connected."
      />
      <FounderGate viewer={viewer} testId="billing-denied" denied="Founder-only. Your role cannot view billing.">
        <BillingSurface />
      </FounderGate>
    </>
  );
}

function BillingSurface() {
  const [settings, setSettings] = useState<AnyRow | null>(null);
  const [members, setMembers] = useState<AnyRow[] | null>(null);
  const [email, setEmail] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [nonce, setNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    setLoadErr('');
    Promise.all([api.companySettings.get(), api.users.list().catch(() => null)])
      .then(([row, users]) => {
        const s = readSettingsJson(row);
        setSettings(s);
        setEmail(billingFromSettings(s).billingEmail);
        setMembers(Array.isArray(users) ? (users as AnyRow[]) : null);
      })
      .catch((e) => setLoadErr(errMsg(e)));
  }, [nonce]);

  if (loadErr) return <ErrorState title="Couldn't load billing" error={loadErr} onRetry={() => setNonce((n) => n + 1)} />;
  if (!settings) return <LoadingState variant="rows" rows={4} />;

  const billing = billingFromSettings(settings);
  const activeMembers = members?.filter((m) => String(m.status ?? '').toUpperCase() === 'ACTIVE').length;
  const statusTone = billing.status.toLowerCase() === 'active' ? 'positive' : 'warning';

  async function saveContact() {
    const next = email.trim();
    if (next && !/^\S+@\S+\.\S+$/.test(next)) {
      setMsg({ tone: 'err', text: 'Enter a valid billing email.' });
      return;
    }
    setMsg(null);
    setSaving(true);
    try {
      const saved = await mergeCompanySettings((current) => ({
        ...current,
        billing: { ...(isRecord(current.billing) ? current.billing : {}), billingEmail: next },
      }));
      setSettings(saved);
      setEmail(billingFromSettings(saved).billingEmail);
      setMsg({ tone: 'ok', text: 'Billing contact saved.' });
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel data-testid="billing-surface">
        <SectionTitle aside={<Chip tone={statusTone}>{billing.status}</Chip>}>
          <span className="inline-flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            {billing.planName}
          </span>
        </SectionTitle>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Billing contact</dt>
            <dd className="mt-1">
              <TextInput
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setMsg(null);
                }}
                placeholder={typeof settings.email === 'string' && settings.email ? settings.email : 'billing@company.com'}
                data-testid="billing-email"
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Renews on</dt>
            <dd className="font-medium">{billing.renewsOn || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Seats included</dt>
            <dd className="font-medium">{billing.seatsIncluded}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Active members</dt>
            <dd className="font-medium" data-testid="billing-active-members">
              {activeMembers ?? '—'}
              {members && <Muted className="ml-1.5">of {members.length}</Muted>}
            </dd>
          </div>
        </dl>
        <p className="mt-4 rounded-lg bg-surface-c p-3 text-xs text-muted-foreground">{billing.notes}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="primary" onClick={saveContact} disabled={saving} data-testid="billing-save-contact">
            {saving ? 'Saving…' : 'Save billing contact'}
          </Btn>
          <Btn variant="tonal" disabled data-testid="billing-portal-soon">
            Open billing portal (pending)
          </Btn>
        </div>
        {msg && (
          <Notice tone={msg.tone} className="mt-3">
            {msg.text}
          </Notice>
        )}
      </Panel>
      <Panel data-testid="billing-invoices">
        <SectionTitle>Invoices</SectionTitle>
        <p className="text-sm text-muted-foreground">
          No invoices yet — billing integration pending. Charge buttons stay disabled until a provider is connected.
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------- danger zone ------------------------------- */

const RESTORABLE_LIFECYCLES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];

type ArchiveRecord = {
  reason?: string;
  previousLifecycleStatus?: string;
  archivedAt?: string;
  archivedBy?: string;
};

function archiveRecordOf(project: AnyRow): ArchiveRecord {
  const s: AnyRow = isRecord(project.settingsJson) ? project.settingsJson : {};
  return isRecord(s.archive) ? (s.archive as ArchiveRecord) : {};
}

function restoreTarget(record: ArchiveRecord): string {
  const prev = String(record.previousLifecycleStatus ?? '');
  return RESTORABLE_LIFECYCLES.includes(prev) ? prev : 'DRAFT';
}

export function DangerZonePage() {
  const viewer = useViewer();
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Danger zone"
        description="Founder-only. Archive/restore keeps history. Permanent hard-delete of operational history is not offered."
      />
      <FounderGate viewer={viewer} testId="danger-denied" denied="Founder-only. Your role cannot access the danger zone.">
        <DangerSurface actor={viewer.email} />
      </FounderGate>
    </>
  );
}

function DangerSurface({ actor }: { actor: string }) {
  const [projects, setProjects] = useState<AnyRow[] | null>(null);
  const [archives, setArchives] = useState<Record<string, ArchiveRecord>>({});
  const [loadErr, setLoadErr] = useState('');
  const [nonce, setNonce] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadErr('');
    (async () => {
      const list = ((await api.projects.list()) as AnyRow[]) ?? [];
      const archived = list.filter((p) => p.lifecycleStatus === 'ARCHIVED');
      const details = await Promise.all(
        archived.map((p) =>
          api.projects
            .get(String(p.id))
            .then((full) => [String(p.id), archiveRecordOf(full as AnyRow)] as const)
            .catch(() => [String(p.id), {} as ArchiveRecord] as const),
        ),
      );
      if (cancelled) return;
      setProjects(list);
      setArchives(Object.fromEntries(details));
    })().catch((e) => {
      if (!cancelled) setLoadErr(errMsg(e));
    });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const active = useMemo(() => (projects ?? []).filter((p) => p.lifecycleStatus !== 'ARCHIVED'), [projects]);
  const archived = useMemo(() => (projects ?? []).filter((p) => p.lifecycleStatus === 'ARCHIVED'), [projects]);

  useEffect(() => {
    if (!active.some((p) => String(p.id) === projectId)) setProjectId(active[0] ? String(active[0].id) : '');
  }, [active, projectId]);

  const target = active.find((p) => String(p.id) === projectId);

  function requestArchive() {
    setMsg(null);
    if (!target) {
      setMsg({ tone: 'err', text: 'Select a project.' });
      return;
    }
    if (reason.trim().length < 3) {
      setMsg({ tone: 'err', text: 'Reason required (at least 3 characters).' });
      return;
    }
    setConfirmOpen(true);
  }

  async function archive() {
    if (!target) return;
    const id = String(target.id);
    setBusyId(id);
    try {
      const full = (await api.projects.get(id)) as AnyRow;
      const settingsJson: AnyRow = isRecord(full.settingsJson) ? full.settingsJson : {};
      const record: ArchiveRecord = {
        reason: reason.trim(),
        previousLifecycleStatus: String(full.lifecycleStatus ?? target.lifecycleStatus ?? 'DRAFT'),
        archivedAt: new Date().toISOString(),
        ...(actor ? { archivedBy: actor } : {}),
      };
      await api.projects.update(id, { lifecycleStatus: 'ARCHIVED', settingsJson: { ...settingsJson, archive: record } });
      setMsg({ tone: 'ok', text: `Archived ${target.name || target.code}.` });
      setReason('');
      setNonce((n) => n + 1);
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setBusyId(null);
      setConfirmOpen(false);
    }
  }

  async function restore(project: AnyRow) {
    const id = String(project.id);
    setMsg(null);
    setBusyId(id);
    try {
      const full = (await api.projects.get(id)) as AnyRow;
      const settingsJson: AnyRow = isRecord(full.settingsJson) ? full.settingsJson : {};
      const record = archiveRecordOf(full);
      const to = restoreTarget(record);
      await api.projects.update(id, {
        lifecycleStatus: to,
        settingsJson: {
          ...settingsJson,
          archive: { ...record, restoredAt: new Date().toISOString(), restoredTo: to, ...(actor ? { restoredBy: actor } : {}) },
        },
      });
      setMsg({ tone: 'ok', text: `Restored ${project.name || project.code} to ${humanize(to)}.` });
      setNonce((n) => n + 1);
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setBusyId(null);
    }
  }

  if (loadErr) return <ErrorState title="Couldn't load projects" error={loadErr} onRetry={() => setNonce((n) => n + 1)} />;
  if (!projects) return <LoadingState variant="rows" rows={4} />;

  return (
    <div className="space-y-6">
      <Panel data-testid="danger-archive" className="ring-1 ring-destructive/25">
        <SectionTitle>
          <span className="inline-flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Archive project
          </span>
        </SectionTitle>
        <p className="text-sm text-muted-foreground">
          Soft-archive with a typed reason. The project's lifecycle moves to Archived; plots, bookings and payments are kept and
          restore remains available.
        </p>
        {active.length === 0 ? (
          <EmptyState compact title="Nothing to archive" description="Every project is already archived." />
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Project">
                <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} data-testid="danger-archive-project">
                  {active.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {p.code} — {p.name} ({humanize(p.lifecycleStatus)})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Reason">
                <TextInput
                  value={reason}
                  onChange={(v) => {
                    setReason(v);
                    setMsg(null);
                  }}
                  placeholder="Why is this project being archived?"
                  data-testid="danger-archive-reason"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Btn variant="danger" onClick={requestArchive} disabled={busyId !== null} data-testid="danger-archive-submit">
                <Archive className="h-4 w-4" /> Archive project
              </Btn>
            </div>
          </>
        )}

        <div className="mt-6">
          <p className="pb-2 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Archived projects · {archived.length}
          </p>
          {archived.length === 0 ? (
            <Muted>No archived projects.</Muted>
          ) : (
            <ul className="space-y-2" data-testid="danger-archived-list">
              {archived.map((p) => {
                const id = String(p.id);
                const record = archives[id] ?? {};
                return (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-low px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {p.code} — {p.name}
                      </p>
                      <Muted className="block truncate">
                        {[
                          record.reason,
                          record.archivedAt ? `archived ${formatDate(record.archivedAt)}` : null,
                          record.archivedBy ? `by ${record.archivedBy}` : null,
                          `restores to ${humanize(restoreTarget(record))}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Muted>
                    </div>
                    <Btn variant="tonal" onClick={() => restore(p)} disabled={busyId !== null} data-testid={`danger-restore-${id}`}>
                      <RotateCcw className="h-4 w-4" /> {busyId === id ? 'Restoring…' : 'Restore'}
                    </Btn>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      <Panel data-testid="danger-surface">
        <SectionTitle>
          <span className="inline-flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Organization data
          </span>
        </SectionTitle>
        <div className="divide-y divide-outline-variant/30 rounded-xl bg-surface-low">
          {[
            {
              label: 'Export organization data',
              hint: 'Full export of projects, customers, bookings and payments is not yet available from the production API.',
              action: 'Export org data',
              testId: 'danger-export',
            },
            {
              label: 'Permanently delete data',
              hint: 'Not offered. Archive keeps history; hard-delete of operational history is not supported.',
              action: 'Delete permanently',
              testId: 'danger-hard-delete',
            },
          ].map((row) => (
            <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0 max-w-prose">
                <p className="text-sm font-medium">{row.label}</p>
                <Muted>{row.hint}</Muted>
              </div>
              <Btn variant="danger" disabled data-testid={row.testId}>
                {row.action}
              </Btn>
            </div>
          ))}
        </div>
      </Panel>

      {msg && (
        <div data-testid="danger-msg">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Archive ${target?.name || target?.code || 'project'}?`}
        description={`Lifecycle moves from ${humanize(target?.lifecycleStatus)} to Archived. Reason: “${reason.trim()}”. You can restore it from this page.`}
        confirmLabel="Archive project"
        cancelLabel="Cancel"
        tone="danger"
        busy={busyId !== null}
        onConfirm={archive}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
