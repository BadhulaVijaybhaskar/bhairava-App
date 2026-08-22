import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  OnboardingShell,
  ReviewList,
  useOnboardingDraft,
  type FieldErrors,
  type WizardStep,
} from "@/components/onboarding";
import { Checkbox, Field, NumberInput, SelectInput, TextInput } from "@/components/form-kit";
import { useData } from "@/lib/store";
import { digits, isEmail, isPhone } from "@/lib/validate";

export const Route = createFileRoute("/onboarding/agent")({
  head: () => ({
    meta: [
      { title: "Onboard an agent — Bhairava" },
      {
        name: "description",
        content: "Register a sales agent: identity, role, targets and project access.",
      },
      { property: "og:title", content: "Onboard an agent — Bhairava" },
      {
        property: "og:description",
        content: "Register a sales agent: identity, role, targets and project access.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AgentOnboarding,
});

const blank = {
  name: "",
  phone: "",
  email: "",
  employeeCode: "",
  region: "West Hyderabad",
  target: 12,
  active: true,
  assigned: "",
};

function AgentOnboarding() {
  const navigate = useNavigate();
  const { agents, projects, saveAgent, nextId } = useData();

  const [f, setF, clearDraft] = useOnboardingDraft("agent", blank);
  const [err, setErr] = useState<FieldErrors<typeof blank>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(blank);
  const assigned = f.assigned ? f.assigned.split(",").filter(Boolean) : [];

  const check = (map: FieldErrors<typeof blank>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Identity & contact",
      summary: "Agent name, mobile and internal code.",
      validate: () =>
        check({
          name: f.name.trim() ? undefined : "Full name is required.",
          phone: isPhone(f.phone) ? undefined : "Enter a 10-digit mobile number.",
          email: !f.email || isEmail(f.email) ? undefined : "Enter a valid email address.",
        }),
      content: (
        <>
          <Field label="Full name" required error={err.name}>
            <TextInput
              value={f.name}
              onChange={(v) => set("name", v)}
              placeholder="Anitha Rao"
              invalid={!!err.name}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mobile" required error={err.phone} hint="10-digit number">
              <TextInput
                value={f.phone}
                onChange={(v) => set("phone", digits(v, 10))}
                type="tel"
                placeholder="9000000000"
                invalid={!!err.phone}
              />
            </Field>
            <Field label="Email" error={err.email}>
              <TextInput
                value={f.email}
                onChange={(v) => set("email", v)}
                type="email"
                placeholder="Optional"
                invalid={!!err.email}
              />
            </Field>
          </div>
          <Field label="Employee code" hint="Internal code, e.g. AG-001">
            <TextInput
              value={f.employeeCode}
              onChange={(v) => set("employeeCode", v.toUpperCase())}
              placeholder="AG-001"
            />
          </Field>
        </>
      ),
    },
    {
      title: "Role & assignment",
      summary: "Territory, project access and whether they can take new bookings.",
      content: (
        <>
          <Field label="Territory">
            <TextInput value={f.region} onChange={(v) => set("region", v)} />
          </Field>
          <Field label="Assigned project">
            <SelectInput
              value={f.assigned}
              onChange={(v) => set("assigned", v)}
              placeholder={projects.length ? "Select a project" : "No projects yet"}
              options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            />
          </Field>
          <Field label="Account">
            <Checkbox
              checked={f.active}
              onChange={(v) => set("active", v)}
              label="Active agent"
              hint="Inactive agents keep history but cannot take new bookings."
            />
          </Field>
        </>
      ),
    },
    {
      title: "Commercial / review",
      summary: "Quarterly target, then confirm the record.",
      validate: () =>
        check({ target: f.target > 0 ? undefined : "Set a booking target above zero." }),
      content: (
        <>
          <Field label="Booking target (quarter)" required error={err.target}>
            <NumberInput value={f.target} onChange={(v) => set("target", v)} />
          </Field>
          <ReviewList
            rows={[
              { label: "Name", value: f.name, step: 0 },
              { label: "Mobile", value: f.phone, step: 0 },
              { label: "Code", value: f.employeeCode || "Assigned on save", step: 0 },
              { label: "Territory", value: f.region, step: 1 },
              {
                label: "Project",
                value: projects.find((p) => p.id === f.assigned)?.name ?? "None",
                step: 1,
              },
              { label: "Status", value: f.active ? "Active" : "Inactive", step: 1 },
              { label: "Target", value: String(f.target) },
            ]}
          />
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("brag", agents);
    saveAgent({
      id,
      name: f.name.trim(),
      code: f.employeeCode.trim() || id,
      region: f.region.trim() || "—",
      phone: f.phone,
      bookings: 0,
      salesCr: 0,
      conversion: 0,
      target: f.target,
      projects: assigned,
      status: f.active ? "Active" : "Inactive",
      email: f.email.trim(),
      employeeCode: f.employeeCode.trim(),
    });
    clearDraft();
    void navigate({ to: "/agents/$agentId", params: { agentId: id } });
  };

  return (
    <OnboardingShell
      title="Onboard an agent"
      description="Bring a sales agent on board with territory, targets and project access."
      steps={steps}
      onComplete={complete}
      submitLabel="Create agent"
      dirty={dirty}
      onDiscard={() => {
        clearDraft();
        void navigate({ to: "/agents" });
      }}
    />
  );
}
