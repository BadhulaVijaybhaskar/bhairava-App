import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/kit";
import {
  Checkbox,
  ChoiceGrid,
  Field,
  ImageUpload,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
  Wizard,
  type WizardStep,
} from "@/components/form-kit";
import { useData } from "@/lib/store";
import type { Project } from "@/lib/mock-data";
import { AREA_UNITS, PROJECT_TYPES } from "@/lib/project-config";
import { isPincode } from "@/lib/validate";

export const Route = createFileRoute("/onboarding/project")({
  head: () => ({
    meta: [
      { title: "Add a project — Bhairava" },
      {
        name: "description",
        content: "Capture the basics of a new plotted development and open the project workspace.",
      },
      { property: "og:title", content: "Add a project — Bhairava" },
      {
        property: "og:description",
        content: "Capture the basics of a new plotted development and open the project workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddProject,
});

const STATUSES = ["Draft", "Pre-launch", "Active", "On hold", "Inactive"] as const;

const blank = {
  name: "",
  code: "",
  projectType: "Plotted development" as NonNullable<Project["projectType"]>,
  status: "Draft" as Project["status"],
  description: "",
  address: "",
  village: "",
  mandal: "",
  district: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "",
  lat: "",
  lng: "",
  totalArea: 24,
  areaUnit: "Acres" as NonNullable<Project["areaUnit"]>,
  plannedPlots: 120,
  reraNumber: "",
  launchDate: new Date().toISOString().slice(0, 10),
  expectedCompletion: "",
  resaleAvailable: false,
  manager: "",
  coverImage: undefined as string | undefined,
  layoutImage: undefined as string | undefined,
  brochure: undefined as string | undefined,
};

function AddProject() {
  const navigate = useNavigate();
  const { projects, saveProject, nextId } = useData();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Record<string, string | undefined>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty = Object.entries(blank).some(([k, v]) => f[k as keyof typeof blank] !== v);

  const check = (map: Record<string, string | undefined>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Identity",
      summary: "Name, code, type and current status.",
      validate: () =>
        check({
          name: f.name.trim() ? undefined : "Project name is required.",
          code: f.code.trim() ? undefined : "Project code is required.",
        }),
      content: (
        <>
          <Field label="Project name" required error={err["name"]}>
            <TextInput value={f.name} onChange={(v) => set("name", v)} placeholder="Green City" invalid={!!err["name"]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project code" required error={err["code"]}>
              <TextInput
                value={f.code}
                onChange={(v) => set("code", v.toUpperCase())}
                placeholder="GREEN-CITY"
                invalid={!!err["code"]}
              />
            </Field>
            <Field label="Status">
              <SelectInput value={f.status} onChange={(v) => set("status", v)} options={STATUSES} size="lg" />
            </Field>
          </div>
          <Field label="Project type">
            <div className="sm:hidden">
              <SelectInput value={f.projectType} onChange={(v) => set("projectType", v)} options={PROJECT_TYPES} size="lg" />
            </div>
            <div className="hidden sm:block">
              <ChoiceGrid
                value={f.projectType}
                onChange={(v) => set("projectType", v)}
                options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </div>
          </Field>
        </>
      ),
    },
    {
      title: "Location",
      summary: "Where the project sits and how it is registered.",
      validate: () =>
        check({
          city: f.city.trim() ? undefined : "City is required.",
          pincode: !f.pincode || isPincode(f.pincode) ? undefined : "Pincode must be 6 digits.",
        }),
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State">
              <TextInput value={f.state} onChange={(v) => set("state", v)} />
            </Field>
            <Field label="City" required error={err["city"]}>
              <TextInput value={f.city} onChange={(v) => set("city", v)} invalid={!!err["city"]} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Village / locality">
              <TextInput value={f.village} onChange={(v) => set("village", v)} placeholder="Amaravati" />
            </Field>
            <Field label="Mandal">
              <TextInput value={f.mandal} onChange={(v) => set("mandal", v)} />
            </Field>
            <Field label="District">
              <TextInput value={f.district} onChange={(v) => set("district", v)} />
            </Field>
          </div>
          <Field label="RERA / approval no.">
            <TextInput value={f.reraNumber} onChange={(v) => set("reraNumber", v)} placeholder="P0210000XXXX" />
          </Field>
          <Field label="Site address">
            <TextInput value={f.address} onChange={(v) => set("address", v)} placeholder="Survey no. 118, main road" />
          </Field>
          <Field label="Pincode" error={err["pincode"]}>
            <TextInput
              value={f.pincode}
              onChange={(v) => set("pincode", v.replace(/\D/g, "").slice(0, 6))}
              placeholder="522020"
              invalid={!!err["pincode"]}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Inventory",
      summary: "Plot count and area. Resale is independent of status.",
      validate: () =>
        check({
          plannedPlots: f.plannedPlots >= 1 ? undefined : "Enter at least one plot.",
          totalArea: f.totalArea > 0 ? undefined : "Enter a valid total area.",
        }),
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Approx. number of plots" required error={err["plannedPlots"]} hint="Refined later in inventory.">
              <NumberInput value={f.plannedPlots} onChange={(v) => set("plannedPlots", v)} />
            </Field>
            <Field label="Total area" required error={err["totalArea"]}>
              <NumberInput value={f.totalArea} onChange={(v) => set("totalArea", v)} step={0.5} />
            </Field>
          </div>
          <Field label="Area unit">
            <SelectInput value={f.areaUnit} onChange={(v) => set("areaUnit", v)} options={AREA_UNITS} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Launch date">
              <TextInput value={f.launchDate} onChange={(v) => set("launchDate", v)} type="date" />
            </Field>
            <Field label="Expected completion">
              <TextInput value={f.expectedCompletion} onChange={(v) => set("expectedCompletion", v)} type="date" />
            </Field>
          </div>
          <Checkbox
            checked={f.resaleAvailable}
            onChange={(v) => set("resaleAvailable", v)}
            label="Resale available"
            hint="Independent of project status — a live project can also accept resale."
          />
        </>
      ),
    },
    {
      title: "Review",
      summary: "Assign a manager, attach media, then create the project.",
      content: (
        <>
          <Field label="Project manager">
            <TextInput value={f.manager} onChange={(v) => set("manager", v)} placeholder="Ravi Teja" />
          </Field>
          <Field label="Description" hint="One short paragraph for the sales team.">
            <TextareaInput value={f.description} onChange={(v) => set("description", v)} rows={3} />
          </Field>
          <div className="grid gap-5 lg:grid-cols-3">
            <Field label="Cover image" hint="Shown on the portfolio card.">
              <ImageUpload value={f.coverImage} onChange={(v) => set("coverImage", v)} hint="JPG, PNG or WebP" />
            </Field>
            <Field label="Master layout" hint="Optional now.">
              <ImageUpload value={f.layoutImage} onChange={(v) => set("layoutImage", v)} hint="Site plan image" />
            </Field>
            <Field label="Brochure">
              <ImageUpload value={f.brochure} onChange={(v) => set("brochure", v)} hint="JPG, PNG or WebP" />
            </Field>
          </div>
          <div className="rounded-xl bg-surface-low p-3.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Summary</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="truncate font-medium">{f.name.trim() || "Untitled"} · {f.code.trim() || "code"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type / status</dt>
                <dd className="truncate font-medium">{f.projectType} · {f.status}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Location</dt>
                <dd className="truncate font-medium">
                  {[f.village, f.city, f.state].filter(Boolean).join(", ") || "TBD"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Inventory</dt>
                <dd className="numeric font-medium">
                  {f.plannedPlots} plots · {f.totalArea} {f.areaUnit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Resale</dt>
                <dd className="font-medium">{f.resaleAvailable ? "Available" : "Off"}</dd>
              </div>
            </dl>
          </div>
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("PRJ-", projects);
    const project: Project = {
      id,
      name: f.name.trim(),
      code: f.code.trim(),
      location: [f.village.trim(), f.mandal.trim()].filter(Boolean).join(", ") || f.city.trim(),
      city: f.city.trim(),
      totalPlots: f.plannedPlots,
      soldPlots: 0,
      launchDate: f.launchDate,
      status: f.status,
      valueCr: 0,
      collectedCr: 0,
      approvals: f.reraNumber.trim() ? ["RERA"] : [],
      manager: f.manager.trim(),
      description: f.description.trim(),
      reraNumber: f.reraNumber.trim(),
      address: f.address.trim(),
      pincode: f.pincode,
      state: f.state.trim(),
      country: "India",
      village: f.village.trim(),
      mandal: f.mandal.trim(),
      district: f.district.trim(),
      totalArea: f.totalArea,
      areaUnit: f.areaUnit,
      expectedCompletion: f.expectedCompletion,
      projectType: f.projectType,
      highlights: [],
      resaleAvailable: f.resaleAvailable,
      ...(f.lat ? { lat: Number(f.lat) } : {}),
      ...(f.lng ? { lng: Number(f.lng) } : {}),
      ...(f.coverImage ? { coverImage: f.coverImage } : {}),
      ...(f.layoutImage ? { layoutImage: f.layoutImage } : {}),
      ...(f.brochure ? { brochure: f.brochure } : {}),
    };
    saveProject(project);
    void navigate({ to: "/projects/$projectId", params: { projectId: id } });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Onboarding"
        title="Add a project"
        description="Four short steps. Inventory stays editable after create."
      />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Create Project"
        dirty={dirty}
        onDiscard={() => void navigate({ to: "/projects" })}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            Resale is a sales capability, not a status. You can keep a project Active and still accept resale.
          </Panel>
        }
      />
    </AppShell>
  );
}
