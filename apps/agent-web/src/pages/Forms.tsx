import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Field, LinkBtn, PageHeader, Panel, SectionTitle, SelectInput, TextInput, TextareaInput } from '@bhairava/ui-web';
import { api } from '../api';
import { Notice } from '../components/RecordList';
import { useRows } from '../lib/data';
import { errorMessage, toLocalDateTimeInput } from '../lib/format';

function FormFooter({ cancelTo, busy, label, err }: { cancelTo: string; busy: boolean; label: string; err: string }) {
  return (
    <div className="mt-6 space-y-4">
      {err ? <Notice tone="error">{err}</Notice> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <LinkBtn to={cancelTo} variant="ghost">Cancel</LinkBtn>
        <Btn type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : label}</Btn>
      </div>
    </div>
  );
}

function FormLayout({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
    </div>
  );
}

function useSubmit(action: () => Promise<unknown>, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await action();
      onDone();
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }
  return { busy, err, submit };
}

export function CreateLeadPage() {
  const nav = useNavigate();
  const projects = useRows(() => api.projects.list());
  const [form, setForm] = useState({ name: '', phone: '', email: '', projectId: '', notes: '' });
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const { busy, err, submit } = useSubmit(
    () =>
      api.leads.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        projectId: form.projectId || undefined,
        notes: form.notes || undefined,
      }),
    () => nav('/leads'),
  );
  const projectOptions = [
    { value: '', label: projects.loading ? 'Loading projects…' : 'No specific project' },
    ...projects.rows.map((p) => ({ value: String(p.id), label: String(p.name) })),
  ];

  return (
    <FormLayout eyebrow="Sales" title="New lead" description="Capture a prospect. The lead is assigned to you.">
      <form onSubmit={submit}>
        <Panel>
          <SectionTitle>Contact</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <TextInput value={form.name} onChange={set('name')} required autoComplete="off" />
            </Field>
            <Field label="Phone" required>
              <TextInput type="tel" value={form.phone} onChange={set('phone')} required inputMode="tel" autoComplete="off" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={set('email')} autoComplete="off" />
            </Field>
            <Field label="Project of interest">
              <SelectInput value={form.projectId} onChange={set('projectId')} options={projectOptions} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextareaInput value={form.notes} onChange={set('notes')} placeholder="Budget, preferred plot size, timeline…" />
            </Field>
          </div>
          <FormFooter cancelTo="/leads" busy={busy} err={err} label="Create lead" />
        </Panel>
      </form>
    </FormLayout>
  );
}

export function CustomerOnboardingPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', address: '', notes: '', pan: '', aadhaar: '' });
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const { busy, err, submit } = useSubmit(
    () =>
      api.customers.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        ...(form.pan ? { pan: form.pan } : {}),
        ...(form.aadhaar ? { aadhaar: form.aadhaar } : {}),
      } as Parameters<typeof api.customers.create>[0]),
    () => nav('/customers'),
  );

  return (
    <FormLayout
      eyebrow="Sales"
      title="Customer onboarding"
      description="Register a CRM buyer linked to you. Phone cannot steal another agent’s customer. Prefer Invite customer for Google portal attribution."
    >
      <form onSubmit={submit} className="space-y-4">
        <Panel>
          <SectionTitle>Contact</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <TextInput value={form.name} onChange={set('name')} required autoComplete="off" />
            </Field>
            <Field label="Phone" required>
              <TextInput type="tel" value={form.phone} onChange={set('phone')} required inputMode="tel" autoComplete="off" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={set('email')} autoComplete="off" />
            </Field>
            <Field label="City">
              <TextInput value={form.city} onChange={set('city')} autoComplete="off" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <TextInput value={form.address} onChange={set('address')} autoComplete="off" />
            </Field>
          </div>
        </Panel>
        <Panel>
          <SectionTitle aside="Optional">KYC</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PAN" hint="Stored encrypted; shown masked afterwards.">
              <TextInput value={form.pan} onChange={(v) => set('pan')(v.toUpperCase())} autoComplete="off" spellCheck={false} maxLength={10} />
            </Field>
            <Field label="Aadhaar" hint="Stored encrypted; shown masked afterwards.">
              <TextInput value={form.aadhaar} onChange={set('aadhaar')} inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={14} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextareaInput value={form.notes} onChange={set('notes')} />
            </Field>
          </div>
          <FormFooter cancelTo="/customers" busy={busy} err={err} label="Save customer" />
        </Panel>
      </form>
    </FormLayout>
  );
}

export function InviteCustomerPage() {
  const [form, setForm] = useState({ nameHint: '', phoneHint: '', emailHint: '' });
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ shareUrl: string; token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setResult(null);
    try {
      const invite = await api.invites.create({
        nameHint: form.nameHint || undefined,
        phoneHint: form.phoneHint || undefined,
        emailHint: form.emailHint || undefined,
      });
      setResult({ shareUrl: invite.shareUrl, token: invite.token, expiresAt: invite.expiresAt });
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!result?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr('Could not copy — select the link manually.');
    }
  }

  async function shareLink() {
    if (!result?.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Bhairava',
          text: 'Complete your Bhairava customer profile with Google.',
          url: result.shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyLink();
    }
  }

  return (
    <FormLayout
      eyebrow="Sales"
      title="Invite customer"
      description="Create a secure invite link. Attribution stays with you — phone alone cannot reassign another agent’s customer."
    >
      <form onSubmit={onSubmit}>
        <Panel>
          <SectionTitle>Invite details</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name hint">
              <TextInput value={form.nameHint} onChange={set('nameHint')} autoComplete="off" />
            </Field>
            <Field label="Mobile hint">
              <TextInput type="tel" value={form.phoneHint} onChange={set('phoneHint')} inputMode="tel" autoComplete="off" />
            </Field>
            <Field label="Email hint" className="sm:col-span-2">
              <TextInput type="email" value={form.emailHint} onChange={set('emailHint')} autoComplete="off" />
            </Field>
          </div>
          <FormFooter cancelTo="/customers" busy={busy} err={err} label="Create invite link" />
        </Panel>
      </form>
      {result ? (
        <Panel className="mt-4">
          <SectionTitle>Share link</SectionTitle>
          <p className="break-all rounded-xl bg-muted/50 px-3 py-2 text-sm" data-testid="invite-share-url">
            {result.shareUrl}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">Expires {new Date(result.expiresAt).toLocaleString()}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn type="button" variant="primary" onClick={() => void copyLink()}>
              {copied ? 'Copied' : 'Copy link'}
            </Btn>
            <Btn type="button" variant="tonal" onClick={() => void shareLink()}>
              Share
            </Btn>
          </div>
        </Panel>
      ) : null}
    </FormLayout>
  );
}

export function ScheduleVisitPage() {
  const nav = useNavigate();
  const projects = useRows(() => api.projects.list());
  const customers = useRows(() => api.customers.list());
  const [form, setForm] = useState({
    projectId: '',
    customerId: '',
    scheduledAt: toLocalDateTimeInput(new Date(Date.now() + 86400000)),
    notes: '',
  });
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const { busy, err, submit } = useSubmit(
    async () => {
      if (!form.projectId) throw new Error('Select a project for the visit.');
      return api.visits.create({
        projectId: form.projectId,
        customerId: form.customerId || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        notes: form.notes || undefined,
      });
    },
    () => nav('/visits'),
  );
  const projectOptions = projects.rows.map((p) => ({ value: String(p.id), label: String(p.name) }));
  const customerOptions = [
    { value: '', label: customers.loading ? 'Loading customers…' : 'No customer yet' },
    ...customers.rows
      .filter((c) => !c.redacted)
      .map((c) => ({ value: String(c.id), label: c.phone ? `${c.name} · ${c.phone}` : String(c.name) })),
  ];

  return (
    <FormLayout eyebrow="Sales" title="Schedule site visit" description="Book a site walk-through for one of your customers.">
      <form onSubmit={submit}>
        <Panel>
          <SectionTitle>Visit</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project" required>
              <SelectInput
                value={form.projectId}
                onChange={set('projectId')}
                options={projectOptions}
                placeholder={projects.loading ? 'Loading projects…' : 'Select a project'}
              />
            </Field>
            <Field label="Customer">
              <SelectInput value={form.customerId} onChange={set('customerId')} options={customerOptions} />
            </Field>
            <Field label="When" required>
              <TextInput type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} required />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <TextareaInput value={form.notes} onChange={set('notes')} placeholder="Pickup point, plots to show…" />
            </Field>
          </div>
          <FormFooter cancelTo="/visits" busy={busy} err={err || (!form.projectId && projects.err ? projects.err : '')} label="Schedule visit" />
        </Panel>
      </form>
    </FormLayout>
  );
}
