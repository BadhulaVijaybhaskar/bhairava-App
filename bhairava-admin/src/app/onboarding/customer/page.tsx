"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/kit";
import {
  ChoiceGrid,
  Field,
  SelectInput,
  TextInput,
  TextareaInput,
  Wizard,
  type WizardStep,
} from "@/components/form-kit";
import { useData } from "@/lib/store";
import type { Customer } from "@/lib/mock-data";
import { digits, firstError, isAadhaar, isEmail, isPan, isPhone, isPincode, mask } from "@/lib/validate";

const stages = ["Lead", "Site visit", "Reserved", "Booked", "Registered"] as const;
const kycStates = ["Pending", "Partial", "Verified", "Rejected"] as const;
const sources = ["Referral", "Walk-in", "Website", "Meta ads", "Google ads", "Channel partner", "Exhibition"] as const;

const blank = {
  name: "",
  phone: "",
  altPhone: "",
  email: "",
  address: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "",
  pan: "",
  aadhaar: "",
  kycStatus: "Pending" as NonNullable<Customer["kycStatus"]>,
  nomineeName: "",
  nomineeRelation: "",
  nomineePhone: "",
  notes: "",
  source: "Referral",
  stage: "Lead" as Customer["stage"],
};

export default function CustomerOnboarding() {
  const router = useRouter();
  const { customers, agents, saveCustomer, nextId } = useData();

  const [f, setF] = useState({ ...blank, agentId: agents[0]?.id ?? "" });
  const [err, setErr] = useState<Record<string, string | undefined>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty = Object.entries(blank).some(([k, v]) => f[k as keyof typeof blank] !== v);

  const check = (map: Record<string, string | undefined>) => {
    setErr((p) => ({ ...p, ...map }));
    const first = Object.values(map).find(Boolean);
    return first ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Identity",
      summary: "Who the buyer is and how to reach them.",
      validate: () =>
        check({
          name: f.name.trim() ? undefined : "Full name is required.",
          phone: isPhone(f.phone) ? undefined : "Enter a 10-digit mobile number.",
          altPhone: !f.altPhone || isPhone(f.altPhone) ? undefined : "Alternate mobile must be 10 digits.",
          email: isEmail(f.email) ? undefined : "Enter a valid email address.",
        }),
      content: (
        <>
          <Field label="Full name" required error={err["name"]}>
            <TextInput value={f.name} onChange={(v) => set("name", v)} placeholder="Ravi Kumar" invalid={!!err["name"]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile" required error={err["phone"]} hint="10-digit number">
              <TextInput
                value={f.phone}
                onChange={(v) => set("phone", digits(v, 10))}
                type="tel"
                placeholder="9848000000"
                invalid={!!err["phone"]}
              />
            </Field>
            <Field label="Alternate mobile" error={err["altPhone"]}>
              <TextInput
                value={f.altPhone}
                onChange={(v) => set("altPhone", digits(v, 10))}
                type="tel"
                placeholder="Optional"
                invalid={!!err["altPhone"]}
              />
            </Field>
          </div>
          <Field label="Email" required error={err["email"]}>
            <TextInput value={f.email} onChange={(v) => set("email", v)} type="email" placeholder="name@email.com" invalid={!!err["email"]} />
          </Field>
        </>
      ),
    },
    {
      title: "Address",
      summary: "Where the buyer is based.",
      validate: () =>
        check({
          address: f.address.trim() ? undefined : "House / street is required.",
          city: f.city.trim() ? undefined : "City is required.",
          state: f.state.trim() ? undefined : "State is required.",
          pincode: isPincode(f.pincode) ? undefined : "Enter a 6-digit pincode.",
        }),
      content: (
        <>
          <Field label="Address" required error={err["address"]}>
            <TextareaInput value={f.address} onChange={(v) => set("address", v)} placeholder="House no, street, locality" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required error={err["city"]}>
              <TextInput value={f.city} onChange={(v) => set("city", v)} invalid={!!err["city"]} />
            </Field>
            <Field label="State" required error={err["state"]}>
              <TextInput value={f.state} onChange={(v) => set("state", v)} invalid={!!err["state"]} />
            </Field>
            <Field label="Pincode" required error={err["pincode"]}>
              <TextInput value={f.pincode} onChange={(v) => set("pincode", digits(v, 6))} invalid={!!err["pincode"]} placeholder="500081" />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: "KYC & nominee",
      summary: "Identity documents and the declared nominee.",
      validate: () =>
        check({
          pan: !f.pan || isPan(f.pan) ? undefined : "PAN must look like ABCDE1234F.",
          aadhaar: !f.aadhaar || isAadhaar(f.aadhaar) ? undefined : "Aadhaar must be 12 digits.",
          nomineePhone: !f.nomineePhone || isPhone(f.nomineePhone) ? undefined : "Nominee mobile must be 10 digits.",
        }),
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PAN" error={err["pan"]} hint="Stored encrypted — only the last 4 are shown later.">
              <TextInput
                value={f.pan}
                onChange={(v) => set("pan", v.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                invalid={!!err["pan"]}
              />
            </Field>
            <Field label="Aadhaar" error={err["aadhaar"]} hint="Stored encrypted — only the last 4 are shown later.">
              <TextInput
                value={f.aadhaar}
                onChange={(v) => set("aadhaar", digits(v, 12))}
                placeholder="123412341234"
                invalid={!!err["aadhaar"]}
              />
            </Field>
          </div>
          <Field label="KYC status">
            <SelectInput value={f.kycStatus} onChange={(v) => set("kycStatus", v)} options={kycStates} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nominee name">
              <TextInput value={f.nomineeName} onChange={(v) => set("nomineeName", v)} placeholder="Optional" />
            </Field>
            <Field label="Nominee relation">
              <TextInput value={f.nomineeRelation} onChange={(v) => set("nomineeRelation", v)} placeholder="Spouse / Parent" />
            </Field>
            <Field label="Nominee mobile" error={err["nomineePhone"]}>
              <TextInput
                value={f.nomineePhone}
                onChange={(v) => set("nomineePhone", digits(v, 10))}
                invalid={!!err["nomineePhone"]}
                placeholder="Optional"
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: "Ownership",
      summary: "Source, pipeline stage, owning agent and team notes.",
      validate: () => firstError([[!f.agentId, "Assign an agent."]]),
      content: (
        <>
          <Field label="Lead source">
            <ChoiceGrid value={f.source} onChange={(v) => set("source", v)} options={sources.map((s) => ({ value: s, label: s }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pipeline stage">
              <SelectInput value={f.stage} onChange={(v) => set("stage", v)} options={stages} />
            </Field>
            <Field label="Owning agent" required>
              <SelectInput
                value={f.agentId}
                onChange={(v) => set("agentId", v)}
                options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
              />
            </Field>
          </div>
          <Field label="Internal notes" hint="Visible to the Bhairava team only.">
            <TextareaInput value={f.notes} onChange={(v) => set("notes", v)} rows={4} placeholder="Context the sales team should know" />
          </Field>
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("CUS-", customers);
    saveCustomer({
      id,
      name: f.name.trim(),
      phone: f.phone,
      email: f.email.trim(),
      city: f.city.trim(),
      source: f.source,
      stage: f.stage,
      agentId: f.agentId,
      plots: [],
      totalValue: 0,
      paid: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      altPhone: f.altPhone,
      address: f.address.trim(),
      state: f.state.trim(),
      pincode: f.pincode,
      pan: mask(f.pan),
      aadhaar: mask(f.aadhaar),
      kycStatus: f.kycStatus,
      nomineeName: f.nomineeName.trim(),
      nomineeRelation: f.nomineeRelation.trim(),
      nomineePhone: f.nomineePhone,
      notes: f.notes.trim(),
    });
    router.push(`/customers/${id}`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Onboarding"
        title="Onboard a customer"
        description="Capture the buyer once — every booking, payment and document hangs off this record."
      />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Create customer"
        dirty={dirty}
        onDiscard={() => router.push("/customers")}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            PAN and Aadhaar are stored encrypted — only the last four characters are ever shown back to the team.
          </Panel>
        }
      />
    </AppShell>
  );
}
