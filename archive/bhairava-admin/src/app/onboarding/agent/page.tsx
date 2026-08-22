"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/kit";
import {
  Checkbox,
  Field,
  MultiSelect,
  NumberInput,
  TextInput,
  Wizard,
  type WizardStep,
} from "@/components/form-kit";
import { useData } from "@/lib/store";
import { digits, isEmail, isPhone } from "@/lib/validate";

const blank = {
  name: "",
  phone: "",
  email: "",
  employeeCode: "",
  region: "West Hyderabad",
  target: 12,
  active: true,
};

export default function AgentOnboarding() {
  const router = useRouter();
  const { agents, projects, saveAgent, nextId } = useData();

  const [f, setF] = useState(blank);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string | undefined>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty = Object.entries(blank).some(([k, v]) => f[k as keyof typeof blank] !== v) || assigned.length > 0;

  const check = (map: Record<string, string | undefined>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Identity",
      summary: "Agent name, contact and internal code.",
      validate: () =>
        check({
          name: f.name.trim() ? undefined : "Full name is required.",
          phone: isPhone(f.phone) ? undefined : "Enter a 10-digit mobile number.",
          email: !f.email || isEmail(f.email) ? undefined : "Enter a valid email address.",
        }),
      content: (
        <>
          <Field label="Full name" required error={err["name"]}>
            <TextInput value={f.name} onChange={(v) => set("name", v)} placeholder="Anitha Rao" invalid={!!err["name"]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile" required error={err["phone"]} hint="10-digit number">
              <TextInput
                value={f.phone}
                onChange={(v) => set("phone", digits(v, 10))}
                type="tel"
                placeholder="9000000000"
                invalid={!!err["phone"]}
              />
            </Field>
            <Field label="Email" error={err["email"]}>
              <TextInput value={f.email} onChange={(v) => set("email", v)} type="email" placeholder="Optional" invalid={!!err["email"]} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee code" hint="Internal code, e.g. AG-001">
              <TextInput value={f.employeeCode} onChange={(v) => set("employeeCode", v.toUpperCase())} placeholder="AG-001" />
            </Field>
            <Field label="Territory">
              <TextInput value={f.region} onChange={(v) => set("region", v)} />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: "Status & targets",
      summary: "Quarterly booking target and whether the agent is active.",
      validate: () => check({ target: f.target > 0 ? undefined : "Set a booking target above zero." }),
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Booking target (quarter)" required error={err["target"]}>
            <NumberInput value={f.target} onChange={(v) => set("target", v)} />
          </Field>
          <Field label="Account">
            <Checkbox
              checked={f.active}
              onChange={(v) => set("active", v)}
              label="Active agent"
              hint="Inactive agents keep history but cannot take new bookings."
            />
          </Field>
        </div>
      ),
    },
    {
      title: "Project assignment",
      summary: "Which parcels this agent can sell.",
      content: (
        <Field label="Assigned projects" hint={`${assigned.length} selected`}>
          <MultiSelect
            values={assigned}
            onChange={setAssigned}
            options={projects.map((p) => ({ value: p.id, label: p.name, hint: `${p.code} · ${p.city}` }))}
            empty={
              <span>
                No projects yet.{" "}
                <Link href="/onboarding/project" className="font-medium text-primary underline-offset-4 hover:underline">
                  Create a project
                </Link>{" "}
                first, then assign it here.
              </span>
            }
          />
        </Field>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("AGT-", agents);
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
    router.push(`/agents/${id}`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Onboarding"
        title="Onboard an agent"
        description="Bring a sales agent on board with territory, targets and project access."
      />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Create agent"
        dirty={dirty}
        onDiscard={() => router.push("/agents")}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            Performance metrics start accruing from the first booking attributed to this agent.
          </Panel>
        }
      />
    </AppShell>
  );
}
