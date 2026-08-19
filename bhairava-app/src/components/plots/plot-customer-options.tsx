"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlotStatus } from "@prisma/client";
import {
  BellRing,
  CalendarCheck2,
  Eye,
  Handshake,
  ListPlus,
  Phone,
} from "lucide-react";
import { CUSTOMER_ACTIONS_BY_STATUS } from "@/lib/customer-plot-actions";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ActionKey = "VIEWED" | "INTERESTED" | "CALLBACK_REQUEST" | "WAITLIST" | "OFFER";

export function PlotCustomerOptions({
  plotId,
  plotNumber,
  status,
}: {
  plotId: string;
  plotNumber: string;
  status: PlotStatus;
}) {
  const router = useRouter();
  const caps = CUSTOMER_ACTIONS_BY_STATUS[status];
  const meta = PLOT_STATUS_COLORS[status];
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(type: ActionKey) {
    setLoading(type);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId,
          type,
          guestName: "Demo Customer",
          guestMobile: "9000000001",
          source: "ADMIN_PREVIEW",
          message: `Demo ${type} on plot ${plotNumber}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Action failed");
        return;
      }
      setMessage(data.data?.message || "Done — admin notified.");
      router.refresh();
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(null);
    }
  }

  const buttons: {
    key: ActionKey;
    label: string;
    icon: ReactNode;
    enabled: boolean;
    primary?: boolean;
  }[] = [
    {
      key: "INTERESTED",
      label: "Express interest",
      icon: <BellRing className="h-4 w-4" />,
      enabled: caps.canExpressInterest,
      primary: true,
    },
    {
      key: "CALLBACK_REQUEST",
      label: "Request callback",
      icon: <Phone className="h-4 w-4" />,
      enabled: caps.canExpressInterest || caps.canRequestBooking,
    },
    {
      key: "WAITLIST",
      label: "Join waitlist",
      icon: <ListPlus className="h-4 w-4" />,
      enabled: caps.canJoinWaitlist,
    },
    {
      key: "OFFER",
      label: "Submit an offer",
      icon: <Handshake className="h-4 w-4" />,
      enabled: caps.canMakeOffer,
    },
    {
      key: "VIEWED",
      label: "Mark as viewed",
      icon: <Eye className="h-4 w-4" />,
      enabled: caps.canView || caps.visibleInApp,
    },
  ];

  const enabledButtons = buttons.filter((b) => b.enabled);

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-border/80 bg-white shadow-[0_12px_32px_-20px_rgba(11,61,145,0.35)]">
      <div className="border-b border-border/70 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Customer actions by availability
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          When a customer opens this plot in the app, allowed actions depend on status. Interest /
          view events notify admin.
        </p>
      </div>

      <div
        className="border-b border-border/70 px-5 py-4"
        style={{ borderLeftWidth: 5, borderLeftColor: meta.hex }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-dot h-2.5 w-2.5" style={{ background: meta.hex }} />
          <h3 className="text-base font-bold text-foreground sm:text-xl">{meta.label}</h3>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
            style={{ background: meta.hex }}
          >
            This plot
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{caps.summary}</p>
        <ul className="mt-3 space-y-2">
          {caps.actions.map((action) => (
            <li
              key={action}
              className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm font-medium text-foreground"
            >
              <span className="text-muted-foreground">·</span>
              {action}
            </li>
          ))}
        </ul>

        {caps.canRequestBooking ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
            <CalendarCheck2 className="h-4 w-4" />
            Request booking / reserve is allowed
          </div>
        ) : null}

        {!caps.visibleInApp ? (
          <div className="mt-3 rounded-xl border border-border bg-[var(--surface-low)] px-3 py-2.5 text-sm font-semibold text-muted-foreground">
            Not shown in customer app
          </div>
        ) : null}
      </div>

      {enabledButtons.length > 0 ? (
        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customer action buttons (demo — notifies admin)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {enabledButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                disabled={loading === btn.key}
                onClick={() => run(btn.key)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  btn.primary
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-border bg-white text-foreground hover:border-primary/40 hover:bg-[var(--surface-low)]/40",
                )}
              >
                {btn.icon}
                {loading === btn.key ? "Sending..." : btn.label}
              </button>
            ))}
          </div>
          {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      ) : (
        <div className="p-5 text-sm text-muted-foreground">No customer actions for this availability.</div>
      )}
    </section>
  );
}
