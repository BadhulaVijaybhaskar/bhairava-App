export type ProjectHighlights = {
  approvals: string[];
  features: string[];
  amenities: string[];
  infrastructure: string[];
  sustainable: string[];
};

export const EMPTY_HIGHLIGHTS: ProjectHighlights = {
  approvals: [],
  features: [],
  amenities: [],
  infrastructure: [],
  sustainable: [],
};

export const APPROVAL_OPTIONS = [
  { id: "crda", label: "CRDA approved layout" },
  { id: "rera", label: "RERA approved / registered" },
  { id: "dtcp", label: "DTCP approved" },
] as const;

export const FEATURE_OPTIONS = [
  { id: "bank_loan", label: "Bank loan available" },
  { id: "ready_registration", label: "Ready for registration" },
  { id: "ready_construction", label: "Ready for construction" },
  { id: "premium_plots", label: "Premium residential plots" },
  { id: "excellent_connectivity", label: "Excellent connectivity" },
  { id: "wide_roads", label: "Wide internal roads" },
  { id: "green_landscaping", label: "Green landscaping" },
  { id: "future_growth", label: "Future growth zone" },
] as const;

export const AMENITY_OPTIONS = [
  { id: "play_area", label: "Children’s play area" },
  { id: "landscaped_park", label: "Landscaped park" },
  { id: "seating_zones", label: "Seating zones" },
  { id: "walking_track", label: "Walking track" },
  { id: "community_spaces", label: "Community open spaces" },
  { id: "green_boulevards", label: "Green boulevards" },
  { id: "gazebo", label: "Gazebo / pavilion" },
] as const;

export const INFRA_OPTIONS = [
  { id: "underground_electricity", label: "Underground electricity" },
  { id: "water_pipeline", label: "Water pipeline network" },
  { id: "individual_water_tap", label: "Individual water tap" },
  { id: "closed_drainage", label: "Closed drainage" },
  { id: "storm_water", label: "Storm water drainage" },
  { id: "rainwater", label: "Rainwater management" },
  { id: "avenue_plantation", label: "Avenue plantation" },
  { id: "footpaths", label: "Footpaths" },
] as const;

export const SUSTAINABLE_OPTIONS = [
  { id: "solar_fencing", label: "Solar fencing" },
  { id: "solar_street_lights", label: "Solar street lights" },
  { id: "eco_friendly", label: "Eco-friendly layout" },
  { id: "clean_environment", label: "Clean environment" },
] as const;

export function parseHighlights(raw: unknown): ProjectHighlights {
  if (!raw || typeof raw !== "object") return { ...EMPTY_HIGHLIGHTS };
  const obj = raw as Record<string, unknown>;
  const asList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    approvals: asList(obj.approvals),
    features: asList(obj.features),
    amenities: asList(obj.amenities),
    infrastructure: asList(obj.infrastructure),
    sustainable: asList(obj.sustainable),
  };
}

export function highlightsFromForm(formData: FormData): ProjectHighlights {
  return {
    approvals: formData.getAll("approvals").map(String),
    features: formData.getAll("features").map(String),
    amenities: formData.getAll("amenities").map(String),
    infrastructure: formData.getAll("infrastructure").map(String),
    sustainable: formData.getAll("sustainable").map(String),
  };
}

export function labelForHighlight(
  group: "approvals" | "features" | "amenities" | "infrastructure" | "sustainable",
  id: string,
): string {
  const map = {
    approvals: APPROVAL_OPTIONS,
    features: FEATURE_OPTIONS,
    amenities: AMENITY_OPTIONS,
    infrastructure: INFRA_OPTIONS,
    sustainable: SUSTAINABLE_OPTIONS,
  }[group];
  return map.find((o) => o.id === id)?.label ?? id;
}
