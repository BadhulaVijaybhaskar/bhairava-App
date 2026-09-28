import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Map as MapIcon } from 'lucide-react';
import {
  Btn,
  DataTable,
  Field,
  FilterBar,
  LinkBtn,
  LoadingState,
  PageHeader,
  Panel,
  PlotStatusChip,
  SelectInput,
  TextInput,
  plotStatusLabel,
} from '@bhairava/ui-web';
import { api } from '../api';
import { FormGrid, Mono, Muted, Notice } from '../components/common';
import { display, errMsg, formatRupees, matchesQuery, useAsyncList, withIds, type AnyRow } from '../lib/data';

type Row = AnyRow & { id: string | number };

export function PlotsPage() {
  const params = useParams();
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [selected, setSelected] = useState(params.projectId || '');
  const [customerId, setCustomerId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [plots, setPlots] = useState<AnyRow[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!selected && projects.rows[0]?.id) setSelected(projects.rows[0].id);
  }, [projects.rows, selected]);

  useEffect(() => {
    if (!selected) return;
    setLoadingPlots(true);
    api.plots
      .listByProject(selected)
      .then(setPlots)
      .catch((e) => setErr(errMsg(e)))
      .finally(() => setLoadingPlots(false));
  }, [selected]);

  async function reserve(plotId: string) {
    setMsg(''); setErr(''); setBusyId(plotId);
    try {
      await api.reservations.create({ plotId, customerId });
      setMsg('Reserved');
      setPlots(await api.plots.listByProject(selected));
    } catch (e) { setErr(errMsg(e)); } finally { setBusyId(null); }
  }

  async function book(plotId: string) {
    setMsg(''); setErr(''); setBusyId(plotId);
    try {
      await api.bookings.create({
        plotId,
        customerId,
        agreementValuePaise: '200000000',
        advancePaise: '1000000',
      });
      setMsg('Booked');
      setPlots(await api.plots.listByProject(selected));
    } catch (e) { setErr(errMsg(e)); } finally { setBusyId(null); }
  }

  const views = useMemo(() => {
    const set = new Set<string>();
    for (const p of plots) set.add(plotStatusLabel(p.status));
    return set.size > 1 ? ['All', ...Array.from(set)] : undefined;
  }, [plots]);

  const filtered = useMemo(
    () =>
      withIds(plots).filter(
        (p) => (view === 'All' || plotStatusLabel(p.status) === view) && matchesQuery(p, query, ['number', 'plotNumber', 'facing', 'status']),
      ),
    [plots, view, query],
  );

  const projectOptions = projects.rows.map((p) => ({ value: String(p.id), label: String(p.name) }));

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Plots"
        description="Live inventory per project. Enter a customer id to reserve or book directly against the API."
        actions={
          <LinkBtn to="/layouts" variant="tonal">
            <MapIcon className="h-4 w-4" /> Layout editor
          </LinkBtn>
        }
      />

      <Panel tonal className="mb-4">
        <FormGrid className="lg:grid-cols-2">
          <Field label="Project">
            <SelectInput
              value={selected}
              onChange={(v) => { setSelected(v); setView('All'); }}
              options={projectOptions}
              placeholder={projects.loading ? 'Loading projects…' : 'Select project'}
            />
          </Field>
          <Field label="Customer id" hint="Required for Reserve / Book">
            <TextInput value={customerId} onChange={setCustomerId} placeholder="cus_…" data-testid="reserve-customer-id" />
          </Field>
        </FormGrid>
      </Panel>

      <div className="space-y-2 pb-4">
        <Notice tone="ok">{msg}</Notice>
        <Notice tone="err">{err}</Notice>
      </div>

      {loadingPlots ? (
        <LoadingState variant="rows" />
      ) : (
        <>
          <FilterBar
            views={views}
            active={view}
            onSelect={setView}
            query={query}
            onQuery={setQuery}
            placeholder="Search plots…"
            right={<span className="numeric px-2 text-xs text-muted-foreground">{filtered.length} of {plots.length}</span>}
          />
          <div data-testid="admin-plots">
            <DataTable<Row>
              rows={filtered}
              emptyMessage={plots.length ? 'Nothing matches these filters.' : 'No plots for this project yet.'}
              columns={[
                { key: 'number', header: 'Plot', cell: (p) => <span className="numeric text-sm font-medium">{display(p.number || p.plotNumber)}</span> },
                { key: 'status', header: 'Status', cell: (p) => <PlotStatusChip status={p.status} /> },
                { key: 'area', header: 'Area (sq yd)', align: 'right', cell: (p) => <Mono>{display(p.areaSqYd ?? p.area)}</Mono> },
                { key: 'facing', header: 'Facing', cell: (p) => <Muted>{display(p.facing)}</Muted> },
                { key: 'price', header: 'Price', align: 'right', cell: (p) => <Mono>{formatRupees(p.totalPrice)}</Mono> },
                {
                  key: 'actions',
                  header: 'Actions',
                  align: 'right',
                  cell: (p) => (
                    <div className="flex justify-end gap-1">
                      <Btn variant="tonal" className="min-h-9 px-3 text-xs" disabled={!customerId || busyId === p.id} onClick={() => void reserve(String(p.id))}>
                        Reserve
                      </Btn>
                      <Btn variant="primary" className="min-h-9 px-3 text-xs" disabled={!customerId || busyId === p.id} onClick={() => void book(String(p.id))}>
                        Book
                      </Btn>
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
