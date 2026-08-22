/** Customer journey funnel — one stage at a time (furthest wins). */
export const FUNNEL_ORDER = ["Interest", "Booked", "Registered", "Resale"] as const;
export type FunnelStage = (typeof FUNNEL_ORDER)[number];

export const FUNNEL_PILL: Record<FunnelStage, string> = {
  Interest: "bg-sky-100 text-sky-800",
  Booked: "bg-amber-100 text-amber-800",
  Registered: "bg-emerald-100 text-emerald-800",
  Resale: "bg-violet-100 text-violet-800",
};

const BOUGHT_PLOT = new Set(["SOLD", "REGISTERED"]);
const BOUGHT_BOOKING = new Set(["SOLD", "REGISTERED"]);
const ACTIVE_BOOKING = new Set([
  "RESERVED",
  "BOOKED",
  "AGREEMENT",
  "PENDING_DOCS",
  "UNDER_DOCUMENTATION",
]);
const ACTIVE_INTEREST = new Set(["INTERESTED", "CALLBACK_REQUEST", "WAITLIST", "OFFER"]);

export type FunnelInput = {
  plots: { id: string; status: string; resaleStatus: boolean }[];
  bookings: { bookingStatus: string; plotId: string }[];
  interests: { type: string; plotId: string }[];
};

export type FunnelItem = {
  key: string;
  plotId: string;
  stage: FunnelStage;
};

/** Furthest stage in Interest → Booked → Registered → Resale */
export function resolveFunnelStage(input: FunnelInput): {
  stage: FunnelStage | null;
  count: number;
  plotIds: string[];
} {
  const registeredIds = new Set<string>([
    ...input.plots.filter((p) => BOUGHT_PLOT.has(p.status)).map((p) => p.id),
    ...input.bookings
      .filter((b) => BOUGHT_BOOKING.has(b.bookingStatus))
      .map((b) => b.plotId),
  ]);

  const resaleIds = new Set(
    input.plots
      .filter((p) => p.status === "RESALE_AVAILABLE" || p.resaleStatus)
      .map((p) => p.id),
  );

  const bookedIds = new Set(
    input.bookings
      .filter((b) => ACTIVE_BOOKING.has(b.bookingStatus) && !registeredIds.has(b.plotId))
      .map((b) => b.plotId),
  );

  const interestIds = new Set(
    input.interests
      .filter(
        (i) =>
          ACTIVE_INTEREST.has(i.type) &&
          !registeredIds.has(i.plotId) &&
          !bookedIds.has(i.plotId),
      )
      .map((i) => i.plotId),
  );

  if (resaleIds.size > 0) {
    return { stage: "Resale", count: resaleIds.size, plotIds: [...resaleIds] };
  }
  if (registeredIds.size > 0) {
    return { stage: "Registered", count: registeredIds.size, plotIds: [...registeredIds] };
  }
  if (bookedIds.size > 0) {
    return { stage: "Booked", count: bookedIds.size, plotIds: [...bookedIds] };
  }
  if (interestIds.size > 0) {
    return { stage: "Interest", count: interestIds.size, plotIds: [...interestIds] };
  }
  return { stage: null, count: 0, plotIds: [] };
}

export type DocChecklistItem = { id: string; title: string };

export const DEFAULT_DOC_CHECKLIST: DocChecklistItem[] = [
  { id: "booking-form", title: "Booking Form" },
  { id: "id-proof", title: "ID Proof" },
  { id: "address-proof", title: "Address Proof" },
];

export function parseDocChecklist(raw: unknown): DocChecklistItem[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DOC_CHECKLIST];
  const items = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = String(o.id || "").trim();
      const title = String(o.title || "").trim();
      if (!id || !title) return null;
      return { id, title };
    })
    .filter((x): x is DocChecklistItem => x != null);
  return items.length > 0 ? items : [...DEFAULT_DOC_CHECKLIST];
}
