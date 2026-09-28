import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Save, Workflow } from 'lucide-react';
import {
  Btn,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  LinkBtn,
  LoadingState,
  NewRecordButton,
  PageHeader,
  Panel,
  RecordHeader,
  SectionTitle,
  TextInput,
} from '@bhairava/ui-web';
import { api, tokens } from '../api';
import { Fact, FormActions, FormGrid, Mono, Muted, Notice, StatusChip } from '../components/common';
import { DASH, display, errMsg, formatPaise, matchesQuery, shortId, useAsyncList, withIds, type AnyRow } from '../lib/data';

type Row = AnyRow & { id: string | number };

const MASK = '••••';

function initials(name: unknown) {
  return String(name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const EMPTY_FORM = { name: '', phone: '', email: '', city: '', pan: '', aadhaar: '' };

export function CustomersPage() {
  const { rows, err, loading, reload } = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await api.customers.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        ...(form.pan ? { pan: form.pan } : {}),
        ...(form.aadhaar ? { aadhaar: form.aadhaar } : {}),
      } as Parameters<typeof api.customers.create>[0]);
      setForm(EMPTY_FORM);
      setMsg({ tone: 'ok', text: 'Created (PII encrypted at rest)' });
      reload();
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(
    () => withIds(rows).filter((c) => matchesQuery(c, query, ['name', 'phone', 'email', 'city'])),
    [rows, query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="Every buyer across the pipeline. PAN and Aadhaar are masked; reveals are audited."
        actions={
          <>
            <LinkBtn to="/conversion" variant="tonal">
              <Workflow className="h-4 w-4" /> Lead conversion
            </LinkBtn>
            <NewRecordButton to="/customers/onboarding">New customer</NewRecordButton>
          </>
        }
      />

      <Panel className="mb-6">
        <SectionTitle aside="Full KYC wizard under New customer">Quick create</SectionTitle>
        <form onSubmit={create}>
          <FormGrid>
            <Field label="Name" required>
              <TextInput required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </Field>
            <Field label="Phone" required>
              <TextInput required type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            </Field>
            <Field label="City">
              <TextInput value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            </Field>
            <Field label="PAN">
              <TextInput value={form.pan} onChange={(v) => setForm({ ...form, pan: v })} autoComplete="off" />
            </Field>
            <Field label="Aadhaar">
              <TextInput value={form.aadhaar} onChange={(v) => setForm({ ...form, aadhaar: v })} autoComplete="off" />
            </Field>
          </FormGrid>
          <FormActions>
            <Btn type="submit" variant="primary" disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save customer'}
            </Btn>
            {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          </FormActions>
        </form>
      </Panel>

      {err ? (
        <ErrorState title="Couldn't load customers" error={err} onRetry={reload} />
      ) : loading ? (
        <LoadingState variant="rows" />
      ) : (
        <>
          <FilterBar
            query={query}
            onQuery={setQuery}
            placeholder="Search customers…"
            right={<span className="numeric px-2 text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>}
          />
          <DataTable<Row>
            rows={filtered}
            linkTo={(c) => `/customers/${c.id}`}
            emptyMessage={rows.length ? 'Nothing matches this search.' : 'No customers yet.'}
            columns={[
              {
                key: 'name',
                header: 'Customer',
                cell: (c) => (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{display(c.name)}</p>
                      <Muted className="block truncate">{display(c.email)}</Muted>
                    </div>
                  </div>
                ),
              },
              { key: 'phone', header: 'Phone', cell: (c) => <Mono>{display(c.phone)}</Mono> },
              { key: 'city', header: 'City', cell: (c) => <Muted>{display(c.city)}</Muted> },
              { key: 'pan', header: 'PAN', cell: (c) => <Mono>{c.panMasked || (c.hasPan ? MASK : DASH)}</Mono> },
              { key: 'aadhaar', header: 'Aadhaar', cell: (c) => <Mono>{c.aadhaarMasked || (c.hasAadhaar ? MASK : DASH)}</Mono> },
            ]}
          />
        </>
      )}
    </>
  );
}

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const [row, setRow] = useState<AnyRow | null>(null);
  const [revealed, setRevealed] = useState('');
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const bookings = useAsyncList(
    () => (customerId ? (api.bookings.list({ customerId }) as Promise<AnyRow[]>) : Promise.resolve([])),
    [customerId],
  );

  useEffect(() => {
    if (!customerId) return;
    api.customers.get(customerId).then(setRow).catch((e) => setLoadErr(errMsg(e)));
  }, [customerId]);

  async function reveal(field: 'pan' | 'aadhaar') {
    setErr(''); setRevealed('');
    try {
      const access = await tokens.getAccessToken();
      const base = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${base}/api/customers/${customerId}/pii?field=${field}`, {
        headers: { authorization: `Bearer ${access}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || res.statusText);
      setRevealed(`${field.toUpperCase()}: ${body.value}`);
    } catch (e) { setErr(errMsg(e)); }
  }

  if (loadErr) {
    return (
      <ErrorState
        className="mt-6"
        title="Customer not available"
        error={loadErr}
        action={<LinkBtn to="/customers" variant="tonal"><ArrowLeft className="h-4 w-4" /> Back to customers</LinkBtn>}
      />
    );
  }
  if (!row) return <LoadingState label="Loading customer…" />;

  return (
    <>
      <RecordHeader
        eyebrow="Customer"
        title={display(row.name)}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>{[row.city, row.state].filter(Boolean).join(', ') || 'Location not captured'}</span>
            {row.kycStatus ? <StatusChip value={row.kycStatus} /> : null}
            {row.redacted ? <StatusChip value="Redacted" tone="warning" /> : null}
          </div>
        }
        facts={[
          { label: 'Phone', value: display(row.phone) },
          { label: 'Email', value: <span className="break-all">{display(row.email)}</span> },
          { label: 'Source', value: display(row.source) },
          { label: 'Customer id', value: <Mono>{shortId(row.id)}</Mono> },
        ]}
        actions={<LinkBtn to="/customers" variant="tonal"><ArrowLeft className="h-4 w-4" /> Back</LinkBtn>}
      />

      <div className="grid gap-4 pt-6 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <SectionTitle aside="Reveals are audited">Identity (PII)</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="PAN (masked)"><Mono className="text-sm">{row.panMasked || DASH}</Mono></Fact>
            <Fact label="Aadhaar (masked)"><Mono className="text-sm">{row.aadhaarMasked || DASH}</Mono></Fact>
          </div>
          <FormActions>
            <Btn variant="tonal" onClick={() => void reveal('pan')}><Eye className="h-4 w-4" /> Reveal PAN</Btn>
            <Btn variant="tonal" onClick={() => void reveal('aadhaar')}><Eye className="h-4 w-4" /> Reveal Aadhaar</Btn>
          </FormActions>
          <div className="space-y-2 pt-3">
            <Notice tone="ok">{revealed}</Notice>
            <Notice tone="err">{err}</Notice>
          </div>
        </Panel>

        <div className="min-w-0 lg:col-span-2">
          <SectionTitle aside={`${bookings.rows.length} total`}>Bookings</SectionTitle>
          {bookings.err ? (
            <ErrorState compact title="Couldn't load bookings" error={bookings.err} onRetry={bookings.reload} />
          ) : bookings.loading ? (
            <LoadingState variant="rows" rows={3} />
          ) : (
            <DataTable<Row>
              rows={withIds(bookings.rows)}
              linkTo={(b) => `/bookings/${b.id}`}
              emptyMessage="No bookings for this customer yet."
              columns={[
                { key: 'id', header: 'Booking', cell: (b) => <Mono>{shortId(b.id)}</Mono> },
                { key: 'state', header: 'State', cell: (b) => <StatusChip value={b.state} /> },
                { key: 'plot', header: 'Plot', cell: (b) => <Mono>{display(b.plot?.number ?? shortId(b.plotId))}</Mono> },
                { key: 'value', header: 'Agreement', align: 'right', cell: (b) => <Mono>{formatPaise(b.agreementValuePaise)}</Mono> },
              ]}
            />
          )}
        </div>
      </div>
    </>
  );
}
