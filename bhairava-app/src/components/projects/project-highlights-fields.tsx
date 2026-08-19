import {
  AMENITY_OPTIONS,
  APPROVAL_OPTIONS,
  FEATURE_OPTIONS,
  INFRA_OPTIONS,
  SUSTAINABLE_OPTIONS,
  type ProjectHighlights,
} from "@/lib/project-highlights";

function CheckboxGroup({
  title,
  name,
  options,
  selected,
}: {
  title: string;
  name: string;
  options: readonly { id: string; label: string }[];
  selected: string[];
}) {
  const set = new Set(selected);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-white px-3 py-2.5 text-sm text-foreground has-[:checked]:border-primary/40 has-[:checked]:bg-[var(--surface-low)]/50"
          >
            <input
              type="checkbox"
              name={name}
              value={opt.id}
              defaultChecked={set.has(opt.id)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-brand"
            />
            <span className="font-medium">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProjectHighlightsFields({
  defaults,
}: {
  defaults?: ProjectHighlights;
}) {
  const d = defaults ?? {
    approvals: [],
    features: [],
    amenities: [],
    infrastructure: [],
    sustainable: [],
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border/80 bg-canvas p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Project highlights</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Optional brochure-style details (approvals, amenities, infrastructure)
        </p>
      </div>
      <CheckboxGroup title="Approvals" name="approvals" options={APPROVAL_OPTIONS} selected={d.approvals} />
      <CheckboxGroup title="Key features" name="features" options={FEATURE_OPTIONS} selected={d.features} />
      <CheckboxGroup title="Lifestyle amenities" name="amenities" options={AMENITY_OPTIONS} selected={d.amenities} />
      <CheckboxGroup
        title="Modern infrastructure"
        name="infrastructure"
        options={INFRA_OPTIONS}
        selected={d.infrastructure}
      />
      <CheckboxGroup
        title="Sustainable living"
        name="sustainable"
        options={SUSTAINABLE_OPTIONS}
        selected={d.sustainable}
      />
    </div>
  );
}
