import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  cn,
  type DataTableColumn,
  type RowLink,
} from '@bhairava/ui-web';
import type { Row, RowsState } from '../lib/data';
import { text } from '../lib/format';

/** Loading → error → empty → table for an ownership-scoped list. */
export function RecordList<T extends Row>({
  state,
  columns,
  linkTo,
  emptyIcon,
  emptyTitle,
  emptyDescription = 'Only records assigned to you are listed here.',
  emptyAction,
  errorTitle = 'Could not load this list',
  testId,
}: {
  state: RowsState<T>;
  columns: DataTableColumn<T>[];
  linkTo?: RowLink<T>;
  emptyIcon?: LucideIcon;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  errorTitle?: string;
  testId?: string;
}) {
  if (state.loading && state.rows.length === 0) return <LoadingState variant="rows" label="Loading…" />;
  if (state.err) return <ErrorState title={errorTitle} error={state.err} onRetry={state.reload} />;
  if (state.rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return (
    <div data-testid={testId}>
      <DataTable rows={state.rows} columns={columns} linkTo={linkTo} />
    </div>
  );
}

/** Placeholder for customer PII the API withheld from this agent. */
export function Restricted({ reason }: { reason?: unknown }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={text(reason, 'Not visible to your account')}
    >
      <Lock className="h-3.5 w-3.5" strokeWidth={2} />
      Restricted
    </span>
  );
}

export function CustomerCell({ customer, fallbackId }: { customer?: Row | null; fallbackId?: unknown }) {
  if (customer?.redacted) return <Restricted reason={customer.reason} />;
  const name = customer?.name;
  if (name) {
    return (
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {customer?.phone ? <span className="block truncate text-xs text-muted-foreground">{customer.phone}</span> : null}
      </span>
    );
  }
  return <span className="text-muted-foreground">{text(fallbackId)}</span>;
}

export function Notice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl px-3.5 py-2.5 text-sm break-words',
        tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
      )}
    >
      {children}
    </p>
  );
}
