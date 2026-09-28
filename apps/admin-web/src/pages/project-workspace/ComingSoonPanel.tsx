import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Panel } from '@bhairava/ui-web';

export function ComingSoonPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="flex flex-col items-center gap-3 py-12 text-center sm:py-14">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-low text-primary shadow-ambient">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="flex items-center gap-2.5 font-display text-base font-semibold tracking-tight">
        <span aria-hidden className="gradient-gold h-3.5 w-[3px] shrink-0 rounded-full" />
        {title}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="pt-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Coming soon</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </Panel>
  );
}
