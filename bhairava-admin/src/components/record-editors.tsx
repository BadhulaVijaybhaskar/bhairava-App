"use client";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { EditSheet, Field, NumberInput, SelectInput, TextInput, TextareaInput } from "@/components/form-kit";
import { useData } from "@/lib/store";
import type { Agent, Customer, Project } from "@/lib/mock-data";

function EditButton({ onClick, label = "Edit" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-surface-c px-3.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-surface-high active:scale-[0.97]"
    >
      <Pencil className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* --------------------------------- project -------------------------------- */

export function ProjectEditor({ project }: { project: Project }) {
  const { saveProject, removeProject } = useData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(project);
  useEffect(() => setDraft(project), [project]);

  const set = <K extends keyof Project>(k: K, v: Project[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <EditButton onClick={() => setOpen(true)} label="Edit project" />
      <EditSheet
        open={open}
        onClose={() => setOpen(false)}
        title={project.name}
        description="Update parcel identity, inventory and ownership."
        onSave={() => {
          saveProject(draft);
          setOpen(false);
        }}
        onDelete={() => {
          removeProject(project.id);
          router.push("/projects");
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" required>
            <TextInput value={draft.name} onChange={(v) => set("name", v)} />
          </Field>
          <Field label="Parcel code">
            <TextInput value={draft.code} onChange={(v) => set("code", v)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <TextInput value={draft.location} onChange={(v) => set("location", v)} />
          </Field>
          <Field label="City">
            <TextInput value={draft.city} onChange={(v) => set("city", v)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Total plots">
            <NumberInput value={draft.totalPlots} onChange={(v) => set("totalPlots", v)} />
          </Field>
          <Field label="Sold plots">
            <NumberInput value={draft.soldPlots} onChange={(v) => set("soldPlots", v)} />
          </Field>
          <Field label="Value (₹ Cr)">
            <NumberInput value={draft.valueCr} onChange={(v) => set("valueCr", v)} step={0.5} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <SelectInput
              value={draft.status}
              onChange={(v) => set("status", v)}
              options={["Pre-launch", "Active", "On hold", "Sold out"] as const}
            />
          </Field>
          <Field label="Launch date">
            <TextInput value={draft.launchDate} onChange={(v) => set("launchDate", v)} type="date" />
          </Field>
        </div>
        <Field label="Project manager">
          <TextInput value={draft.manager} onChange={(v) => set("manager", v)} />
        </Field>
        <Field label="Approvals" hint="Comma separated">
          <TextareaInput
            value={draft.approvals.join(", ")}
            onChange={(v) => set("approvals", v.split(",").map((a) => a.trim()).filter(Boolean))}
          />
        </Field>
      </EditSheet>
    </>
  );
}

/* -------------------------------- customer -------------------------------- */

export function CustomerEditor({ customer }: { customer: Customer }) {
  const { saveCustomer, removeCustomer, agents } = useData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(customer);
  useEffect(() => setDraft(customer), [customer]);

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <EditButton onClick={() => setOpen(true)} label="Edit customer" />
      <EditSheet
        open={open}
        onClose={() => setOpen(false)}
        title={customer.name}
        description="Update contact details, stage and ownership."
        onSave={() => {
          saveCustomer(draft);
          setOpen(false);
        }}
        onDelete={() => {
          removeCustomer(customer.id);
          router.push("/customers");
        }}
      >
        <Field label="Full name" required>
          <TextInput value={draft.name} onChange={(v) => set("name", v)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <TextInput value={draft.phone} onChange={(v) => set("phone", v)} />
          </Field>
          <Field label="Email">
            <TextInput value={draft.email} onChange={(v) => set("email", v)} type="email" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            <TextInput value={draft.city} onChange={(v) => set("city", v)} />
          </Field>
          <Field label="Source">
            <TextInput value={draft.source} onChange={(v) => set("source", v)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stage">
            <SelectInput
              value={draft.stage}
              onChange={(v) => set("stage", v)}
              options={["Lead", "Site visit", "Reserved", "Booked", "Registered"] as const}
            />
          </Field>
          <Field label="Owning agent">
            <SelectInput
              value={draft.agentId}
              onChange={(v) => set("agentId", v)}
              options={agents.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total value (₹)">
            <NumberInput value={draft.totalValue} onChange={(v) => set("totalValue", v)} />
          </Field>
          <Field label="Paid (₹)">
            <NumberInput value={draft.paid} onChange={(v) => set("paid", v)} />
          </Field>
        </div>
      </EditSheet>
    </>
  );
}

/* ---------------------------------- agent --------------------------------- */

export function AgentEditor({ agent }: { agent: Agent }) {
  const { saveAgent, removeAgent } = useData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(agent);
  useEffect(() => setDraft(agent), [agent]);

  const set = <K extends keyof Agent>(k: K, v: Agent[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <EditButton onClick={() => setOpen(true)} label="Edit agent" />
      <EditSheet
        open={open}
        onClose={() => setOpen(false)}
        title={agent.name}
        description="Update territory, targets and status."
        onSave={() => {
          saveAgent(draft);
          setOpen(false);
        }}
        onDelete={() => {
          removeAgent(agent.id);
          router.push("/agents");
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <TextInput value={draft.name} onChange={(v) => set("name", v)} />
          </Field>
          <Field label="Agent code">
            <TextInput value={draft.code} onChange={(v) => set("code", v)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <TextInput value={draft.phone} onChange={(v) => set("phone", v)} />
          </Field>
          <Field label="Territory">
            <TextInput value={draft.region} onChange={(v) => set("region", v)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Target">
            <NumberInput value={draft.target} onChange={(v) => set("target", v)} />
          </Field>
          <Field label="Bookings">
            <NumberInput value={draft.bookings} onChange={(v) => set("bookings", v)} />
          </Field>
          <Field label="Sales (₹ Cr)">
            <NumberInput value={draft.salesCr} onChange={(v) => set("salesCr", v)} step={0.5} />
          </Field>
        </div>
        <Field label="Status">
          <SelectInput value={draft.status} onChange={(v) => set("status", v)} options={["Active", "Inactive"] as const} />
        </Field>
      </EditSheet>
    </>
  );
}
