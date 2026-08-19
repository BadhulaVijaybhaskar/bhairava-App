import type { PlotStatus } from "@prisma/client";
import { CUSTOMER_ACTIONS_BY_STATUS } from "@/lib/customer-plot-actions";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CustomerActionsPanel({ status }: { status: PlotStatus }) {
  const cap = CUSTOMER_ACTIONS_BY_STATUS[status];
  const meta = PLOT_STATUS_COLORS[status];

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">What customer can do</h3>
        <span
          className="status-pill text-white"
          style={{ background: meta.hex }}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{cap.summary}</p>
      <ul className="mt-4 space-y-2">
        {cap.actions.map((action) => (
          <li
            key={action}
            className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2 text-sm text-foreground"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: meta.hex }}
            />
            {action}
          </li>
        ))}
      </ul>
      <p className={cn("mt-3 text-xs font-medium", cap.visibleInApp ? "text-emerald-700" : "text-muted-foreground")}>
        {cap.visibleInApp
          ? "Shown in customer app"
          : "Hidden / not offered in customer app"}
      </p>
    </section>
  );
}

export function CustomerStatusGuide() {
  const entries = Object.entries(CUSTOMER_ACTIONS_BY_STATUS) as [
    PlotStatus,
    (typeof CUSTOMER_ACTIONS_BY_STATUS)[PlotStatus],
  ][];

  return (
    <section className="surface p-5">
      <h3 className="font-semibold text-foreground">Customer actions by availability</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        When a customer opens a plot in the app, allowed actions depend on status. Interest / view
        events notify admin.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {entries.map(([status, cap]) => {
          const meta = PLOT_STATUS_COLORS[status];
          return (
            <div
              key={status}
              className="rounded-2xl border border-border/70 bg-white p-3.5"
              style={{ borderLeftWidth: 4, borderLeftColor: meta.hex }}
            >
              <div className="flex items-center gap-2">
                <span className="status-dot" style={{ background: meta.hex }} />
                <p className="text-sm font-bold text-foreground">{meta.label}</p>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{cap.summary}</p>
              <ul className="mt-2 space-y-1">
                {cap.actions.slice(0, 3).map((a) => (
                  <li key={a} className="text-xs font-medium text-foreground">
                    · {a}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
