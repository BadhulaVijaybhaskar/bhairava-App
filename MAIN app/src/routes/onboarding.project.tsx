import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  OnboardingShell,
  ReviewList,
  useOnboardingDraft,
  type FieldErrors,
  type WizardStep,
} from "@/components/onboarding";
import {
  Checkbox,
  Field,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/form-kit";
import { useData } from "@/lib/store";
import type { Project } from "@/lib/mock-data";
import { AREA_UNITS, PROJECT_STATUSES, PROJECT_TYPES, defaultPricing } from "@/lib/project-config";
import { digits, isPincode } from "@/lib/validate";

export const Route = createFileRoute("/onboarding/project")({
  head: () => ({
    meta: [
      { title: "Add a project — Bhairava" },
      {
        name: "description",
        content: "Capture a new plotted development in four focused steps.",
      },
      { property: "og:title", content: "Add a project — Bhairava" },
      {
        property: "og:description",
        content: "Capture a new plotted development in four focused steps.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AddProject,
});

const blank = {
  name: "",
  code: "",
  projectType: "Plotted development" as NonNullable<Project["projectType"]>,
  status: "Pre-launch" as (typeof PROJECT_STATUSES)[number],
  address: "",
  village: "",
  mandal: "",
  district: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "",
  reraNumber: "",
  approvalAuthority: "",
  legalInfo: "",
  totalPlots: 120,
  totalArea: 24,
  areaUnit: "Acres" as NonNullable<Project["areaUnit"]>,
  pricePerSqYd: 25000,
  valueCr: 0,
  launchDate: new Date().toISOString().slice(0, 10),
  expectedCompletion: "",
  resaleAvailable: false,
  manager: "",
  agents: [] as string[],
};

function AddProject() {
  const navigate = useNavigate();
  const { projects, agents, saveProject, nextId } = useData();
  const [f, setF, clearDraft] = useOnboardingDraft("project", blank);
  const [err, setErr] = useState<FieldErrors<typeof blank>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(blank);

  const check = (map: FieldErrors<typeof blank>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Project identity",
      summary: "Name, code, type and current status.",
      validate: () =>
        check({
          name: f.name.trim() ? undefined : "Project name is required.",
          code: f.code.trim() ? undefined : "Project code is required.",
        }),
      content: (
        <>
          <Field label="Project name" required error={err.name}>
            <TextInput
              value={f.name}
              onChange={(v) => set("name", v)}
              placeholder="Green City"
              invalid={!!err.name}
            />
          </Field>
          <Field label="Project code" required error={err.code}>
            <TextInput
              value={f.code}
              onChange={(v) => set("code", v.toUpperCase())}
              placeholder="GREEN-CITY"
              invalid={!!err.code}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project type" required>
              <SelectInput
                value={f.projectType}
                onChange={(v) => set("projectType", v)}
                options={PROJECT_TYPES}
              />
            </Field>
            <Field label="Project status" required>
              <SelectInput
                value={f.status}
                onChange={(v) => set("status", v)}
                options={PROJECT_STATUSES}
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: "Location & approvals",
      summary: "Where the parcel sits and how it is approved.",
      validate: () =>
        check({
          city: f.city.trim() ? undefined : "City is required.",
          pincode: !f.pincode || isPincode(f.pincode) ? undefined : "Pincode must be 6 digits.",
        }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="State">
              <TextInput value={f.state} onChange={(v) => set("state", v)} />
            </Field>
            <Field label="City / district" required error={err.city}>
              <TextInput value={f.city} onChange={(v) => set("city", v)} invalid={!!err.city} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Location">
              <TextInput
                value={f.village}
                onChange={(v) => set("village", v)}
                placeholder="Village / locality"
              />
            </Field>
            <Field label="Mandal">
              <TextInput value={f.mandal} onChange={(v) => set("mandal", v)} />
            </Field>
          </div>
          <Field label="Address">
            <TextInput
              value={f.address}
              onChange={(v) => set("address", v)}
              placeholder="Survey no., main road"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pincode" error={err.pincode}>
              <TextInput
                value={f.pincode}
                onChange={(v) => set("pincode", digits(v, 6))}
                placeholder="522020"
                invalid={!!err.pincode}
              />
            </Field>
            <Field label="RERA registration">
              <TextInput
                value={f.reraNumber}
                onChange={(v) => set("reraNumber", v)}
                placeholder="P0210000XXXX"
              />
            </Field>
          </div>
          <Field label="Approval authority">
            <TextInput
              value={f.approvalAuthority}
              onChange={(v) => set("approvalAuthority", v)}
              placeholder="HMDA / DTCP"
            />
          </Field>
          <Field label="Registration / legal information">
            <TextareaInput
              value={f.legalInfo}
              onChange={(v) => set("legalInfo", v)}
              rows={2}
              placeholder="Survey numbers, layout approval notes"
            />
          </Field>
        </>
      ),
    },
    {
      title: "Inventory & commercial setup",
      summary: "Scale, pricing and launch window. Resale is separate from status.",
      validate: () =>
        check({
          totalPlots: f.totalPlots > 0 ? undefined : "Enter the planned plot count.",
          pricePerSqYd: f.pricePerSqYd > 0 ? undefined : "Enter a price per sq yd.",
        }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Total plots" required error={err.totalPlots}>
              <NumberInput value={f.totalPlots} onChange={(v) => set("totalPlots", v)} />
            </Field>
            <Field label="Total area">
              <NumberInput value={f.totalArea} onChange={(v) => set("totalArea", v)} step={0.5} />
            </Field>
            <Field label="Area unit">
              <SelectInput
                value={f.areaUnit}
                onChange={(v) => set("areaUnit", v)}
                options={AREA_UNITS}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price / sq yd" required error={err.pricePerSqYd}>
              <NumberInput value={f.pricePerSqYd} onChange={(v) => set("pricePerSqYd", v)} />
            </Field>
            <Field label="Inventory value (₹ Cr)">
              <NumberInput value={f.valueCr} onChange={(v) => set("valueCr", v)} step={0.1} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Launch date">
              <TextInput value={f.launchDate} onChange={(v) => set("launchDate", v)} type="date" />
            </Field>
            <Field label="Expected completion">
              <TextInput
                value={f.expectedCompletion}
                onChange={(v) => set("expectedCompletion", v)}
                type="date"
              />
            </Field>
          </div>
          <Field label="Resale availability">
            <Checkbox
              checked={f.resaleAvailable}
              onChange={(v) => set("resaleAvailable", v)}
              label="Resale available"
              hint="Independent of project status."
            />
          </Field>
        </>
      ),
    },
    {
      title: "Team & review",
      summary: "Assign ownership, then confirm before creating.",
      validate: () =>
        check({ manager: f.manager.trim() ? undefined : "Name the project manager." }),
      content: (
        <>
          <Field label="Project manager" required error={err.manager}>
            <TextInput
              value={f.manager}
              onChange={(v) => set("manager", v)}
              placeholder="Ravi Teja"
              invalid={!!err.manager}
            />
          </Field>
          <Field label="Assigned agents">
            <SelectInput
              value={(f.agents[0] ?? "") as string}
              onChange={(v) => set("agents", v ? [v] : [])}
              placeholder="Select an agent"
              options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
            />
          </Field>
          <ReviewList
            rows={[
              { label: "Project", value: f.name, step: 0 },
              { label: "Code", value: f.code, step: 0 },
              { label: "Type", value: f.projectType, step: 0 },
              { label: "Status", value: f.status, step: 0 },
              {
                label: "Location",
                value: [f.village, f.city, f.state].filter(Boolean).join(", "),
                step: 1,
              },
              { label: "Plots", value: String(f.totalPlots), step: 2 },
              {
                label: "Price / sq yd",
                value: `₹${f.pricePerSqYd.toLocaleString("en-IN")}`,
                step: 2,
              },
              { label: "Manager", value: f.manager, step: 3 },
              {
                label: "Resale",
                value: f.resaleAvailable ? "Available" : "Not available",
                step: 2,
              },
            ]}
          />
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("PRJ-", projects);
    const location =
      [f.village.trim(), f.mandal.trim()].filter(Boolean).join(", ") || f.city.trim();
    const approvals = [f.reraNumber.trim() && "RERA", f.approvalAuthority.trim()].filter(
      Boolean,
    ) as string[];
    const project: Project = {
      id,
      name: f.name.trim(),
      code: f.code.trim(),
      location,
      city: f.city.trim(),
      totalPlots: f.totalPlots,
      soldPlots: 0,
      launchDate: f.launchDate,
      status: f.status,
      valueCr: f.valueCr,
      collectedCr: 0,
      approvals,
      manager: f.manager.trim(),
      description: f.legalInfo.trim(),
      reraNumber: f.reraNumber.trim(),
      address: f.address.trim(),
      pincode: f.pincode,
      state: f.state.trim(),
      country: "India",
      village: f.village.trim(),
      mandal: f.mandal.trim(),
      district: f.district.trim() || f.city.trim(),
      totalArea: f.totalArea,
      areaUnit: f.areaUnit,
      expectedCompletion: f.expectedCompletion,
      projectType: f.projectType,
      highlights: [],
      resaleAvailable: f.resaleAvailable,
      approvalAuthority: f.approvalAuthority.trim(),
      pricing: { ...defaultPricing(), baseRatePerSqYd: f.pricePerSqYd },
      agents: f.agents,
    };
    saveProject(project);
    clearDraft();
    void navigate({ to: "/projects/$projectId", params: { projectId: id } });
  };

  return (
    <OnboardingShell
      title="Add a project"
      description="Four short steps — identity, location, inventory, then a review before the record is created."
      steps={steps}
      onComplete={complete}
      submitLabel="Create Project"
      dirty={dirty}
      onDiscard={() => {
        clearDraft();
        void navigate({ to: "/projects" });
      }}
    />
  );
}
