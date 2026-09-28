import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, ErrorState, FilterBar, LoadingState, PageHeader, type DataTableColumn, type RowLink } from '@bhairava/ui-web';
import { Mono, Muted, StatusChip } from '../components/common';
import {
  display,
  formatDate,
  formatDateTime,
  formatPaise,
  humanize,
  matchesQuery,
  shortId,
  useAsyncList,
  withIds,
  type AnyRow,
} from '../lib/data';

export type ColumnKind = 'text' | 'strong' | 'status' | 'money' | 'date' | 'datetime' | 'id' | 'mono' | 'muted';

export type ResourceColumn = {
  key: string;
  label: string;
  kind?: ColumnKind;
  align?: 'right';
  /** Custom cell renderer; overrides `kind`. */
  render?: (row: AnyRow) => ReactNode;
};

type Row = AnyRow & { id: string | number };

function renderCell(row: AnyRow, c: ResourceColumn): ReactNode {
  if (c.render) return c.render(row);
  const v = row[c.key];
  switch (c.kind) {
    case 'status':
      return <StatusChip value={v} />;
    case 'money':
      return <Mono>{formatPaise(v)}</Mono>;
    case 'date':
      return <Mono>{formatDate(v)}</Mono>;
    case 'datetime':
      return <Mono>{formatDateTime(v)}</Mono>;
    case 'id':
      return <Mono className="text-muted-foreground">{shortId(v)}</Mono>;
    case 'mono':
      return <Mono>{display(v)}</Mono>;
    case 'muted':
      return <Muted>{display(v)}</Muted>;
    case 'strong':
      return <span className="text-sm font-medium">{display(v)}</span>;
    default:
      return <span className="text-sm">{display(v)}</span>;
  }
}

export function toDataColumns(columns: ResourceColumn[]): DataTableColumn<Row>[] {
  return columns.map((c) => ({
    key: c.key,
    header: c.label,
    align: c.align ?? (c.kind === 'money' ? 'right' : undefined),
    cell: (row) => renderCell(row, c),
  }));
}

export function ResourceTable({
  title,
  eyebrow,
  description,
  loader,
  columns,
  statusKey,
  searchKeys,
  linkTo,
  actions,
  emptyMessage = 'No records from the API yet.',
  testId,
  banner,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  loader: () => Promise<AnyRow[]>;
  columns: ResourceColumn[];
  /** Field used to build the segmented status filter. */
  statusKey?: string;
  searchKeys?: string[];
  linkTo?: RowLink<Row>;
  actions?: ReactNode;
  emptyMessage?: string;
  testId?: string;
  /** Rendered between the page header and the table. */
  banner?: ReactNode;
}) {
  const { rows, err, loading, reload } = useAsyncList(loader);
  const [view, setView] = useState('All');
  const [query, setQuery] = useState('');

  const views = useMemo(() => {
    if (!statusKey) return undefined;
    const set = new Set<string>();
    for (const r of rows) if (r[statusKey]) set.add(humanize(r[statusKey]));
    return set.size > 1 ? ['All', ...Array.from(set).sort()] : undefined;
  }, [rows, statusKey]);

  const keys = searchKeys ?? columns.map((c) => c.key);
  const filtered = useMemo(
    () =>
      withIds(rows).filter(
        (r) => (view === 'All' || !statusKey || humanize(r[statusKey]) === view) && matchesQuery(r, query, keys),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, view, query, statusKey, keys.join('|')],
  );

  const dataColumns = useMemo(() => toDataColumns(columns), [columns]);

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {banner}
      {err ? (
        <ErrorState title={`Couldn't load ${title.toLowerCase()}`} error={err} onRetry={reload} />
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
            placeholder={`Search ${title.toLowerCase()}…`}
            right={
              <span className="numeric px-2 text-xs text-muted-foreground">
                {filtered.length} of {rows.length}
              </span>
            }
          />
          <div data-testid={testId}>
            <DataTable<Row>
              rows={filtered}
              columns={dataColumns}
              linkTo={linkTo}
              emptyMessage={rows.length ? 'Nothing matches these filters.' : emptyMessage}
            />
          </div>
        </>
      )}
    </>
  );
}
