"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock, Timer, X } from "lucide-react";
import {
  deleteCustomerFollowUp,
  scheduleCustomerFollowUp,
} from "@/app/admin/customers/actions";
import { cn } from "@/lib/utils";

type DayEvent = {
  dateKey: string;
  label: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatDisplayDate(key: string) {
  return parseKey(key).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calendarCells(viewMonth: Date) {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    cells.push({ key: toKey(d), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function parseEventLabel(label: string) {
  const isSaved = label.startsWith("Follow-up ·");
  const followId = isSaved ? label.split("::")[1] : null;
  const display = isSaved ? label.split("::")[0] : label;
  return { followId, display };
}

export function FollowUpSchedulePopup({
  customerId,
  events,
}: {
  customerId: string;
  events: DayEvent[];
}) {
  const now = new Date();
  const todayKey = toKey(now);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dateKey, setDateKey] = useState(todayKey);
  const [calOpen, setCalOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [hour, setHour] = useState(() => {
    const h = now.getHours() % 12;
    return h === 0 ? 12 : h;
  });
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">(() => (now.getHours() >= 12 ? "PM" : "AM"));
  const [note, setNote] = useState("");
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !calOpen) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, calOpen]);

  const categorized = useMemo(() => {
    const missed: DayEvent[] = [];
    const today: DayEvent[] = [];
    const upcoming: DayEvent[] = [];
    const sorted = [...events].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    for (const e of sorted) {
      if (e.dateKey < todayKey) missed.push(e);
      else if (e.dateKey === todayKey) today.push(e);
      else upcoming.push(e);
    }
    return { missed, today, upcoming };
  }, [events, todayKey]);

  const eventMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of events) {
      const list = map.get(e.dateKey) ?? [];
      list.push(e.label);
      map.set(e.dateKey, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);
  const pendingCount = categorized.missed.length + categorized.today.length;

  function placePopup() {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = 300;
    const height = 320;
    let top = r.bottom + 8;
    let left = r.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, r.top - height - 8);
    }
    setPopPos({ top, left });
  }

  function openCalendar() {
    placePopup();
    setViewMonth(parseKey(dateKey));
    setCalOpen(true);
  }

  useEffect(() => {
    if (!calOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCalOpen(false);
    }
    function onReposition() {
      placePopup();
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
    };
  }, [calOpen, dateKey]);

  function EventGroup({
    title,
    items,
    tone,
  }: {
    title: string;
    items: DayEvent[];
    tone: "missed" | "today" | "upcoming";
  }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p
          className={cn(
            "mb-1.5 text-[10px] font-bold uppercase tracking-wide",
            tone === "missed" && "text-red-600",
            tone === "today" && "text-amber-700",
            tone === "upcoming" && "text-emerald-700",
          )}
        >
          {title} ({items.length})
        </p>
        <ul className="space-y-1.5">
          {items.map((e, idx) => {
            const { followId, display } = parseEventLabel(e.label);
            return (
              <li
                key={`${e.dateKey}-${idx}-${e.label}`}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium",
                  tone === "missed" && "bg-red-50 text-red-800",
                  tone === "today" && "bg-amber-50 text-amber-900",
                  tone === "upcoming" && "bg-emerald-50 text-emerald-900",
                )}
              >
                <span className="min-w-0">
                  <span className="font-semibold">{formatDisplayDate(e.dateKey)}</span>
                  <span className="mt-0.5 block">{display}</span>
                </span>
                {followId ? (
                  <form action={deleteCustomerFollowUp}>
                    <input type="hidden" name="customerId" value={customerId} />
                    <input type="hidden" name="followUpId" value={followId} />
                    <button
                      type="submit"
                      className="shrink-0 text-[10px] font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const calendarPortal =
    mounted &&
    calOpen &&
    createPortal(
      <div className="fixed inset-0 z-[220]" role="presentation">
        <button
          type="button"
          aria-label="Close calendar"
          className="absolute inset-0 cursor-default bg-[var(--bhairava-deep)]/20"
          onClick={() => setCalOpen(false)}
        />
        <div
          className="absolute w-[300px] rounded-2xl border border-border bg-white p-3 shadow-2xl"
          style={{ top: popPos.top, left: popPos.left }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose date"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-[var(--surface-low)]"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <span className="text-xs font-bold text-primary">{monthLabel(viewMonth)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-[var(--surface-low)]"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                ›
              </button>
              <button
                type="button"
                className="rounded-lg p-1 text-muted-foreground hover:bg-canvas"
                onClick={() => setCalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1 text-[10px] font-bold uppercase text-muted-foreground">
                {d}
              </span>
            ))}
            {cells.map((cell, idx) => {
              if (!cell) return <span key={`e-${idx}`} />;
              const selected = cell.key === dateKey;
              const isToday = cell.key === todayKey;
              const hasEvents = (eventMap.get(cell.key)?.length ?? 0) > 0;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    setDateKey(cell.key);
                    setCalOpen(false);
                  }}
                  className={cn(
                    "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition",
                    selected
                      ? "bg-primary text-white"
                      : isToday
                        ? "bg-[var(--surface-low)] text-primary"
                        : "text-foreground hover:bg-canvas",
                  )}
                >
                  {cell.day}
                  {hasEvents && !selected ? (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-border/70 pt-2">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Or type date
              <input
                type="date"
                value={dateKey}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDateKey(e.target.value);
                  setViewMonth(parseKey(e.target.value));
                  setCalOpen(false);
                }}
                className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm font-semibold text-foreground"
              />
            </label>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-canvas hover:text-primary"
        title="Schedule follow-up"
        aria-label="Open schedule"
      >
        <Timer className="h-5 w-5" strokeWidth={2.2} />
        {pendingCount > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        ) : null}
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-end justify-center bg-[var(--bhairava-deep)]/40 p-3 sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={() => setOpen(false)}
            >
              <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 id={titleId} className="text-base font-semibold text-foreground">
                      Follow-up &amp; Bookings Schedule
                    </h3>
                    <p className="text-xs text-muted-foreground">Pick a date, set time, then save</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-canvas"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[9rem] flex-1">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Date
                    </span>
                    <button
                      ref={triggerRef}
                      type="button"
                      onClick={() => {
                        if (calOpen) setCalOpen(false);
                        else openCalendar();
                      }}
                      className="flex w-full items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:border-primary/40"
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 truncate">{formatDisplayDate(dateKey)}</span>
                    </button>
                  </div>

                  <label className="block shrink-0">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Hr
                    </span>
                    <select
                      value={hour}
                      onChange={(e) => setHour(Number(e.target.value))}
                      className="w-[3.75rem] rounded-xl border border-border bg-white px-1.5 py-2 text-center text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block shrink-0">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Min
                    </span>
                    <select
                      value={minute}
                      onChange={(e) => setMinute(Number(e.target.value))}
                      className="w-[3.75rem] rounded-xl border border-border bg-white px-1.5 py-2 text-center text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block shrink-0">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      AM/PM
                    </span>
                    <select
                      value={ampm}
                      onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
                      className="w-[4.25rem] rounded-xl border border-border bg-white px-1.5 py-2 text-center text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </label>
                </div>

                <form action={scheduleCustomerFollowUp} className="mt-2.5 flex items-center gap-2">
                  <input type="hidden" name="customerId" value={customerId} />
                  <input type="hidden" name="date" value={dateKey} />
                  <input type="hidden" name="hour" value={hour} />
                  <input type="hidden" name="minute" value={minute} />
                  <input type="hidden" name="ampm" value={ampm} />
                  <input
                    name="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
                  />
                  <button
                    type="submit"
                    className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Schedule
                  </button>
                </form>

                <div className="mt-4 space-y-3 border-t border-border/70 pt-3">
                  <EventGroup title="Missed" items={categorized.missed} tone="missed" />
                  <EventGroup title="Today" items={categorized.today} tone="today" />
                  <EventGroup title="Upcoming" items={categorized.upcoming} tone="upcoming" />
                  {categorized.missed.length === 0 &&
                  categorized.today.length === 0 &&
                  categorized.upcoming.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No follow-ups or bookings scheduled.</p>
                  ) : null}
                </div>
              </div>
              {calendarPortal}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** @deprecated Use FollowUpSchedulePopup */
export function FollowUpSchedule(props: { customerId: string; events: DayEvent[] }) {
  return <FollowUpSchedulePopup {...props} />;
}
