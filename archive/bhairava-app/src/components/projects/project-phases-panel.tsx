"use client";

import { createPhase, deletePhase } from "@/app/admin/projects/phase-actions";

type Phase = { id: string; name: string; code: string | null; sequence: number };

export function ProjectPhasesPanel({
  projectId,
  phases,
}: {
  projectId: string;
  phases: Phase[];
}) {
  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Phases</h3>
          <p className="text-sm text-muted-foreground">Group blocks and plots by launch phase.</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {phases.length === 0 ? (
          <li className="text-sm text-muted-foreground">No phases yet.</li>
        ) : (
          phases.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-canvas/80 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {p.name}
                  {p.code ? (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">{p.code}</span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">Sequence {p.sequence}</p>
              </div>
              <form action={deletePhase}>
                <input type="hidden" name="phaseId" value={p.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))
        )}
      </ul>

      <form action={createPhase} className="mt-4 grid gap-2 sm:grid-cols-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="name" required placeholder="Phase name" className="input-field !pl-3 sm:col-span-2" />
        <input name="code" placeholder="Code" className="input-field !pl-3" />
        <input
          name="sequence"
          type="number"
          min={1}
          defaultValue={phases.length + 1}
          className="input-field !pl-3"
        />
        <button type="submit" className="btn-primary sm:col-span-4">
          Add phase
        </button>
      </form>
    </section>
  );
}
