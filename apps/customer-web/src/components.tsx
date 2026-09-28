import type { ReactNode } from 'react';
import { cn, ErrorState, LoadingState } from '@bhairava/ui-web';
import type { ApiState } from './lib/use-api';

/** Renders loading / error chrome for an `useApi` result, then `children(data)`. */
export function AsyncSection<T>({
  state,
  loading = 'rows',
  errorTitle = 'We couldn’t load this right now',
  children,
}: {
  state: ApiState<T>;
  loading?: 'rows' | 'metrics' | 'spinner';
  errorTitle?: string;
  children: (data: T) => ReactNode;
}) {
  if (state.error) {
    return <ErrorState title={errorTitle} error={state.error} onRetry={state.reload} />;
  }
  if (state.loading && state.data === undefined) {
    return <LoadingState variant={loading} rows={loading === 'metrics' ? 3 : 4} />;
  }
  if (state.data === undefined) return null;
  return <>{children(state.data)}</>;
}

export function FactGrid({
  facts,
  className,
}: {
  facts: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2', className)}>
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{f.label}</dt>
          <dd className="numeric min-w-0 pt-1.5 text-base font-medium break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
