import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  Btn,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  LinkBtn,
  LoadingState,
  PageHeader,
  Panel,
  SectionTitle,
  TextInput,
} from '@bhairava/ui-web';
import { api } from '../api';
import { FormActions, FormGrid, Mono, Muted, Notice, StatusChip } from '../components/common';
import { display, errMsg, humanize, matchesQuery, useAsyncList, withIds, type AnyRow } from '../lib/data';

type Row = AnyRow & { id: string | number };

export function ProjectsPage() {
  const [search] = useSearchParams();
  const { rows, err, loading, reload } = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [form, setForm] = useState({ name: '', code: '', city: '' });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('All');
  const [query, setQuery] = useState('');

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await api.projects.create({ name: form.name, code: form.code, city: form.city || undefined });
      setForm({ name: '', code: '', city: '' });
      setMsg({ tone: 'ok', text: 'Created as DRAFT — open Workspace to complete setup.' });
      reload();
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setSaving(false);
    }
  }

  const views = useMemo(() => {
    const set = new Set<string>();
    for (const p of rows) set.add(humanize(p.lifecycleStatus || p.status));
    return set.size > 1 ? ['All', ...Array.from(set).sort()] : undefined;
  }, [rows]);

  const filtered = useMemo(
    () =>
      withIds(rows).filter(
        (p) =>
          (view === 'All' || humanize(p.lifecycleStatus || p.status) === view) &&
          matchesQuery(p, query, ['name', 'code', 'city', 'state']),
      ),
    [rows, view, query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Create a project as DRAFT, then complete phases, plot types, pricing, media and publishing in its workspace."
      />

      <Panel className="mb-6" id="create-project">
        <SectionTitle aside="Saved as DRAFT">Create project</SectionTitle>
        <form onSubmit={create}>
          <FormGrid>
            <Field label="Name" required>
              <TextInput
                required
                autoFocus={search.get('new') === '1'}
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Bhairava Green Acres"
              />
            </Field>
            <Field label="Code" required>
              <TextInput required value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="BGA" />
            </Field>
            <Field label="City">
              <TextInput value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Hyderabad" />
            </Field>
          </FormGrid>
          <FormActions>
            <Btn type="submit" variant="primary" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? 'Creating…' : 'Create project'}
            </Btn>
            {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          </FormActions>
        </form>
      </Panel>

      {err ? (
        <ErrorState title="Couldn't load projects" error={err} onRetry={reload} />
      ) : loading ? (
        <LoadingState variant="rows" />
      ) : (
        <>
          <FilterBar
            views={views}
            active={view}
            onSelect={setView}
            query={query}
            onQuery={setQuery}
            placeholder="Search projects…"
            right={
              <span className="numeric px-2 text-xs text-muted-foreground">
                {filtered.length} of {rows.length}
              </span>
            }
          />
          <div data-testid="admin-projects">
            <DataTable<Row>
              rows={filtered}
              emptyMessage={rows.length ? 'Nothing matches these filters.' : 'No projects yet.'}
              columns={[
                {
                  key: 'name',
                  header: 'Project',
                  cell: (p) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{display(p.name)}</p>
                      <Muted>{[p.location, p.state].filter(Boolean).join(', ') || 'Location pending'}</Muted>
                    </div>
                  ),
                },
                { key: 'code', header: 'Code', cell: (p) => <Mono>{display(p.code)}</Mono> },
                { key: 'city', header: 'City', cell: (p) => <Muted>{display(p.city)}</Muted> },
                { key: 'status', header: 'Lifecycle', cell: (p) => <StatusChip value={p.lifecycleStatus || p.status} /> },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  cell: (p) => (
                    <div className="flex justify-end gap-1">
                      <LinkBtn to={`/projects/${p.id}`} variant="tonal" className="min-h-9 px-3 text-xs">
                        Workspace
                      </LinkBtn>
                      <LinkBtn to={`/projects/${p.id}/plots`} className="min-h-9 px-3 text-xs">
                        Plots
                      </LinkBtn>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}
    </>
  );
}
