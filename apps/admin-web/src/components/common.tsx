import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Chip, cn, fieldBase, type ChipTone } from '@bhairava/ui-web';
import { DASH, humanize } from '../lib/data';

/** Inline success / error banner for mutation feedback. */
export function Notice({ tone = 'ok', children, className }: { tone?: 'ok' | 'err' | 'info'; children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role={tone === 'err' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl px-3.5 py-2.5 text-sm break-words',
        tone === 'err' && 'bg-destructive/10 text-destructive',
        tone === 'ok' && 'bg-success/10 text-success',
        tone === 'info' && 'bg-surface-low text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Status pill for raw API enum values (`ON_HOLD`, `AVAILABLE`, …). */
export function StatusChip({ value, tone }: { value: unknown; tone?: ChipTone }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">{DASH}</span>;
  return <Chip tone={tone}>{humanize(value)}</Chip>;
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('numeric text-xs', className)}>{children}</span>;
}

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-xs text-muted-foreground', className)}>{children}</span>;
}

/** Uncontrolled inputs styled like form-kit fields (for FormData-driven forms). */
export function NativeInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        fieldBase,
        rest.type === 'file' &&
          'h-auto py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-c file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground',
        className,
      )}
    />
  );
}

export function NativeSelect({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select {...rest} className={cn(fieldBase, 'appearance-none pr-9')}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export function NativeTextarea({ className, rows = 3, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} rows={rows} className={cn(fieldBase, 'h-auto resize-y py-3 leading-relaxed', className)} />;
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</div>;
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2 pt-5', className)}>{children}</div>;
}

/** Label / value pair for record detail panels. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <div className="pt-1.5 text-sm font-medium break-words">{children}</div>
    </div>
  );
}
