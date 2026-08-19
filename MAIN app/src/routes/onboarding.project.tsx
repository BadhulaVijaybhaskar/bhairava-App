import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel, SectionTitle } from "@/components/kit";
import {
  ChoiceGrid,
  Field,
  ImageUpload,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
  useUnsavedGuard,
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
        content: "Capture the basics of a new plotted development and open the project workspace to configure the rest.",
      },
      { property: "og:title", content: "Add a project — Bhairava" },
      {
        property: "og:description",
        content: "Capture the basics of a new plotted development and open the project workspace to configure the rest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddProject,
});

const blank = {
  name: "",
  code: "",
  projectType: "Plotted development" as Project["projectType"],
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
  const [saving, setSaving] = useState(false);
  useUnsavedGuard(dirty && !saving);

  const create = () => {
    const next: Record<string, string | undefined> = {
      name: f.name.trim() ? undefined : "Project name is required.",
      code: f.code.trim() ? undefined : "Project code is required.",
      city: f.city.trim() ? undefined : "City is required.",
      pincode: !f.pincode || isPincode(f.pincode) ? undefined : "Pincode must be 6 digits.",
    };
    setErr(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    const id = nextId("PRJ-", projects);
    const project: Project = {
      id,
      name: f.name.trim(),
      code: f.code.trim(),
      location: [f.village.trim(), f.mandal.trim()].filter(Boolean).join(", ") || f.city.trim(),
      city: f.city.trim(),
      totalPlots: 0,
      soldPlots: 0,
      launchDate: f.launchDate,
      status: "Draft",
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
      ...(f.lat ? { lat: Number(f.lat) } : {}),
      ...(f.lng ? { lng: Number(f.lng) } : {}),
      ...(f.coverImage ? { coverImage: f.coverImage } : {}),
      ...(f.layoutImage ? { layoutImage: f.layoutImage } : {}),
      ...(f.brochure ? { brochure: f.brochure } : {}),
    };
    saveProject(project);
    void navigate({ to: "/projects/setup/$projectId", params: { projectId: id } });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Onboarding"
        title="Add a project"
        description="Capture just the basics. The project saves as a draft and opens its workspace, where plots, pricing, amenities and documents are configured progressively."
      />

      <div className="space-y-5 pb-28 md:pb-6">
        <Panel>
          <SectionTitle>Project information</SectionTitle>
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <Field label="Project name" required error={err["name"]}>
              <TextInput value={f.name} onChange={(v) => set("name", v)} placeholder="Green City" invalid={!!err["name"]} />
            </Field>
            <Field label="Project code" required error={err["code"]}>
              <TextInput
                value={f.code}
                onChange={(v) => set("code", v.toUpperCase())}
                placeholder="GREEN-CITY"
                invalid={!!err["code"]}
              />
            </Field>
          </div>
          <div className="pt-4">
            <Field label="Project type">
              <ChoiceGrid
                value={f.projectType ?? "Plotted development"}
                onChange={(v) => set("projectType", v)}
                options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </Field>
          </div>
          <div className="pt-4">
            <Field label="Description" hint="One short paragraph for the sales team.">
              <TextareaInput value={f.description} onChange={(v) => set("description", v)} />
            </Field>
          </div>
        </Panel>

        <Panel>
          <SectionTitle>Location</SectionTitle>
          <div className="grid gap-4 pt-4">
            <Field label="Address">
              <TextInput value={f.address} onChange={(v) => set("address", v)} placeholder="Survey no. 118, main road" />
            </Field>
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" required error={err["city"]}>
                <TextInput value={f.city} onChange={(v) => set("city", v)} invalid={!!err["city"]} />
              </Field>
              <Field label="State">
                <TextInput value={f.state} onChange={(v) => set("state", v)} />
              </Field>
              <Field label="Pincode" error={err["pincode"]}>
                <TextInput
                  value={f.pincode}
                  onChange={(v) => set("pincode", v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="522020"
                  invalid={!!err["pincode"]}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Map latitude" hint="Auto-filled from the map picker when available.">
                <TextInput value={f.lat} onChange={(v) => set("lat", v)} placeholder="16.5062" />
              </Field>
              <Field label="Map longitude">
                <TextInput value={f.lng} onChange={(v) => set("lng", v)} placeholder="80.6480" />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle>Basic development information</SectionTitle>
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            <Field label="Total area">
              <NumberInput value={f.totalArea} onChange={(v) => set("totalArea", v)} step={0.5} />
            </Field>
            <Field label="Area unit">
              <SelectInput value={f.areaUnit} onChange={(v) => set("areaUnit", v)} options={AREA_UNITS} />
            </Field>
            <Field label="Approx. number of plots" hint="Refined later in inventory.">
              <NumberInput value={f.plannedPlots} onChange={(v) => set("plannedPlots", v)} />
            </Field>
          </div>
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            <Field label="RERA number">
              <TextInput value={f.reraNumber} onChange={(v) => set("reraNumber", v)} placeholder="P0210000XXXX" />
            </Field>
            <Field label="Launch date">
              <TextInput value={f.launchDate} onChange={(v) => set("launchDate", v)} type="date" />
            </Field>
            <Field label="Expected completion">
              <TextInput value={f.expectedCompletion} onChange={(v) => set("expectedCompletion", v)} type="date" />
            </Field>
          </div>
          <div className="pt-4">
            <Field label="Project manager">
              <TextInput value={f.manager} onChange={(v) => set("manager", v)} placeholder="Ravi Teja" />
            </Field>
          </div>
        </Panel>

        <Panel>
          <SectionTitle>Media</SectionTitle>
          <div className="grid gap-5 pt-4 lg:grid-cols-3">
            <Field label="Cover image" hint="Shown on the portfolio card.">
              <ImageUpload value={f.coverImage} onChange={(v) => set("coverImage", v)} hint="JPG, PNG or WebP" />
            </Field>
            <Field label="Master layout" hint="Optional now — can be uploaded in the workspace.">
              <ImageUpload value={f.layoutImage} onChange={(v) => set("layoutImage", v)} hint="Site plan image" />
            </Field>
            <Field label="Brochure" hint="Marketing brochure image or scan.">
              <ImageUpload value={f.brochure} onChange={(v) => set("brochure", v)} hint="JPG, PNG or WebP" />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-outline-variant/60 bg-background/85 px-4 py-3 backdrop-blur md:static md:mt-2 md:border-0 md:bg-transparent md:px-0 md:pb-8 md:backdrop-blur-none">
        <button
          type="button"
          onClick={() => void navigate({ to: "/projects" })}
          className="h-11 shrink-0 rounded-xl bg-surface-low px-4 text-sm font-medium transition-colors hover:bg-surface-c"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={create}
          className="gradient-primary lift flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-primary-foreground md:flex-none"
        >
          Create project <ArrowRight className="h-4 w-4" />
        </button>
        <p className="hidden text-xs text-muted-foreground md:block">
          Saved as a draft — you'll land in the project workspace to complete setup.
        </p>
      </div>
    </AppShell>
  );
}
