import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Baby,
  BadgeCheck,
  CloudRain,
  Droplet,
  Droplets,
  Fence,
  FileCheck2,
  Footprints,
  Gem,
  HardHat,
  Landmark,
  Leaf,
  MapPinned,
  PersonStanding,
  Road,
  Scale,
  ShieldCheck,
  Sparkles,
  Stamp,
  Sun,
  Tent,
  TreeDeciduous,
  TreePine,
  Trees,
  TrendingUp,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import {
  AMENITY_OPTIONS,
  APPROVAL_OPTIONS,
  FEATURE_OPTIONS,
  INFRA_OPTIONS,
  SUSTAINABLE_OPTIONS,
  parseHighlights,
  type ProjectHighlights,
} from "@/lib/project-highlights";

type Tone = { bg: string; fg: string };

type HighlightMeta = {
  id: string;
  short: string;
  Icon: LucideIcon;
  tone: Tone;
};

/** Soft tinted chip + matching icon color — varies by meaning */
const TONE = {
  trust: { bg: "bg-emerald-100", fg: "text-emerald-700" },
  legal: { bg: "bg-indigo-100", fg: "text-indigo-700" },
  bank: { bg: "bg-blue-100", fg: "text-blue-700" },
  doc: { bg: "bg-sky-100", fg: "text-sky-700" },
  build: { bg: "bg-amber-100", fg: "text-amber-800" },
  premium: { bg: "bg-violet-100", fg: "text-violet-700" },
  map: { bg: "bg-cyan-100", fg: "text-cyan-700" },
  road: { bg: "bg-[var(--surface-container)]", fg: "text-foreground" },
  green: { bg: "bg-green-100", fg: "text-green-700" },
  growth: { bg: "bg-fuchsia-100", fg: "text-fuchsia-700" },
  kids: { bg: "bg-rose-100", fg: "text-rose-700" },
  park: { bg: "bg-lime-100", fg: "text-lime-800" },
  seat: { bg: "bg-orange-100", fg: "text-orange-700" },
  walk: { bg: "bg-teal-100", fg: "text-teal-700" },
  people: { bg: "bg-purple-100", fg: "text-purple-700" },
  power: { bg: "bg-yellow-100", fg: "text-yellow-700" },
  water: { bg: "bg-sky-100", fg: "text-sky-600" },
  drain: { bg: "bg-stone-200", fg: "text-stone-700" },
  rain: { bg: "bg-blue-100", fg: "text-blue-600" },
  solar: { bg: "bg-amber-100", fg: "text-amber-600" },
  eco: { bg: "bg-emerald-100", fg: "text-emerald-600" },
  clean: { bg: "bg-cyan-100", fg: "text-cyan-600" },
} as const;

const META: Record<string, HighlightMeta> = {
  crda: { id: "crda", short: "CRDA", Icon: ShieldCheck, tone: TONE.trust },
  rera: { id: "rera", short: "RERA", Icon: Scale, tone: TONE.legal },
  dtcp: { id: "dtcp", short: "DTCP", Icon: Stamp, tone: TONE.trust },
  bank_loan: { id: "bank_loan", short: "Bank loan", Icon: Landmark, tone: TONE.bank },
  ready_registration: {
    id: "ready_registration",
    short: "Register ready",
    Icon: FileCheck2,
    tone: TONE.doc,
  },
  ready_construction: {
    id: "ready_construction",
    short: "Build ready",
    Icon: HardHat,
    tone: TONE.build,
  },
  premium_plots: { id: "premium_plots", short: "Premium", Icon: Gem, tone: TONE.premium },
  excellent_connectivity: {
    id: "excellent_connectivity",
    short: "Connectivity",
    Icon: MapPinned,
    tone: TONE.map,
  },
  wide_roads: { id: "wide_roads", short: "Wide roads", Icon: Road, tone: TONE.road },
  green_landscaping: {
    id: "green_landscaping",
    short: "Landscaping",
    Icon: Trees,
    tone: TONE.green,
  },
  future_growth: { id: "future_growth", short: "Growth zone", Icon: TrendingUp, tone: TONE.growth },
  play_area: { id: "play_area", short: "Play area", Icon: Baby, tone: TONE.kids },
  landscaped_park: { id: "landscaped_park", short: "Park", Icon: TreePine, tone: TONE.park },
  seating_zones: { id: "seating_zones", short: "Seating", Icon: Armchair, tone: TONE.seat },
  walking_track: { id: "walking_track", short: "Walk track", Icon: Footprints, tone: TONE.walk },
  community_spaces: {
    id: "community_spaces",
    short: "Open space",
    Icon: Users,
    tone: TONE.people,
  },
  green_boulevards: { id: "green_boulevards", short: "Boulevard", Icon: Leaf, tone: TONE.green },
  gazebo: { id: "gazebo", short: "Gazebo", Icon: Tent, tone: TONE.seat },
  underground_electricity: {
    id: "underground_electricity",
    short: "Power",
    Icon: Zap,
    tone: TONE.power,
  },
  water_pipeline: { id: "water_pipeline", short: "Pipeline", Icon: Droplets, tone: TONE.water },
  individual_water_tap: {
    id: "individual_water_tap",
    short: "Water tap",
    Icon: Droplet,
    tone: TONE.water,
  },
  closed_drainage: { id: "closed_drainage", short: "Drainage", Icon: Waves, tone: TONE.drain },
  storm_water: { id: "storm_water", short: "Storm drain", Icon: CloudRain, tone: TONE.rain },
  rainwater: { id: "rainwater", short: "Rainwater", Icon: CloudRain, tone: TONE.rain },
  avenue_plantation: {
    id: "avenue_plantation",
    short: "Trees",
    Icon: TreeDeciduous,
    tone: TONE.park,
  },
  footpaths: { id: "footpaths", short: "Footpath", Icon: PersonStanding, tone: TONE.walk },
  solar_fencing: { id: "solar_fencing", short: "Solar fence", Icon: Fence, tone: TONE.solar },
  solar_street_lights: {
    id: "solar_street_lights",
    short: "Solar light",
    Icon: Sun,
    tone: TONE.solar,
  },
  eco_friendly: { id: "eco_friendly", short: "Eco layout", Icon: Leaf, tone: TONE.eco },
  clean_environment: {
    id: "clean_environment",
    short: "Clean air",
    Icon: Sparkles,
    tone: TONE.clean,
  },
};

const ALL_OPTIONS = [
  ...APPROVAL_OPTIONS,
  ...FEATURE_OPTIONS,
  ...AMENITY_OPTIONS,
  ...INFRA_OPTIONS,
  ...SUSTAINABLE_OPTIONS,
] as const;

const GROUP_ORDER: (keyof ProjectHighlights)[] = [
  "approvals",
  "features",
  "amenities",
  "infrastructure",
  "sustainable",
];

function metaFor(id: string, fallbackLabel: string): HighlightMeta {
  return (
    META[id] ?? {
      id,
      short: fallbackLabel,
      Icon: BadgeCheck,
      tone: TONE.trust,
    }
  );
}

export function ProjectHighlightsView({ raw }: { raw: unknown }) {
  const highlights = parseHighlights(raw);

  const selectedIds = new Set(GROUP_ORDER.flatMap((key) => highlights[key]));
  const items = ALL_OPTIONS.filter((opt) => selectedIds.has(opt.id)).map((opt) =>
    metaFor(opt.id, opt.label),
  );

  if (items.length === 0) return null;

  return (
    <section className="surface px-3 py-3 sm:px-4 sm:py-3.5">
      <h3 className="text-sm font-semibold text-foreground">Highlights</h3>
      <ul className="mt-2.5 grid grid-cols-4 gap-x-1 gap-y-2.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <li
              key={item.id}
              title={item.short}
              className="flex min-w-0 flex-col items-center gap-1 text-center"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${item.tone.bg} ${item.tone.fg}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="max-w-[4.25rem] text-[10px] font-semibold leading-tight text-foreground">
                {item.short}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
