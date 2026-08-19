import Link from "next/link";
import { Layers3, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  createBlock,
  deleteBlock,
  generatePlotsForBlock,
  updateBlock,
} from "@/app/admin/projects/block-actions";
import { summarizeSpecs, type BlockPlotSpec } from "@/lib/block-plot-specs";

type BlockRow = {
  id: string;
  name: string;
  code: string | null;
  plannedPlots: number;
  plotCount: number;
  specs: BlockPlotSpec[];
};

const BLOCK_ERRORS: Record<string, string> = {
  required: "Block name is required.",
  count: "Enter a valid plot count in size rows.",
  duplicate: "A block with this name already exists.",
  hasplots: "Delete or move plots before removing this block.",
  already: "All planned plots for this block are already generated.",
  specs: "Add at least one size row (area × plot count).",
};

export function ProjectBlocksPanel({
  projectId,
  blocks,
  error,
  saved,
  generated,
}: {
  projectId: string;
  blocks: BlockRow[];
  error?: string;
  saved?: boolean;
  generated?: string;
}) {
  return (
    <section className="surface space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Blocks</h3>
          <p className="text-sm text-muted-foreground">
            Add a block, then set size rows (e.g. 200 sq.yd × 10, 300 × 5) with facing &amp; price
          </p>
        </div>
        <Layers3 className="h-5 w-5 text-primary" />
      </div>

      {error && BLOCK_ERRORS[error] ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {BLOCK_ERRORS[error]}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Block saved.
        </p>
      ) : null}
      {generated ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Generated {generated} plot{generated === "1" ? "" : "s"}.
        </p>
      ) : null}

      <form action={createBlock} className="rounded-2xl border border-border/80 bg-canvas p-4">
        <input type="hidden" name="projectId" value={projectId} />
        <p className="text-sm font-semibold text-foreground">Add block</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-muted-foreground sm:col-span-2">
            Block name
            <input
              name="name"
              required
              className="input-field mt-1 !pl-3"
              placeholder="Block A"
            />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            Code / prefix
            <input name="code" className="input-field mt-1 !pl-3" placeholder="A" />
          </label>
        </div>
        <button type="submit" className="btn-primary mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" />
          Add block &amp; set sizes
        </button>
      </form>

      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No blocks yet. Add Block A / B, then define area × plot count rows.
        </div>
      ) : (
        <ul className="space-y-3">
          {blocks.map((block) => {
            const remaining = Math.max(block.plannedPlots - block.plotCount, 0);
            return (
              <li
                key={block.id}
                className="rounded-2xl border border-border/80 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {block.name}
                      {block.code ? (
                        <span className="font-medium text-muted-foreground"> · {block.code}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{summarizeSpecs(block.specs)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {block.plotCount} generated · {block.plannedPlots} planned
                      {remaining > 0 ? ` · ${remaining} left` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {remaining > 0 && block.specs.length > 0 ? (
                      <form action={generatePlotsForBlock}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="blockId" value={block.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Generate {remaining}
                        </button>
                      </form>
                    ) : null}
                    <Link
                      href={`/admin/projects/${projectId}/blocks/${block.id}`}
                      className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary"
                    >
                      Size rows / pricing
                    </Link>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Edit block name
                  </summary>
                  <form action={updateBlock} className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <label className="block text-xs font-semibold text-muted-foreground sm:col-span-2">
                      Name
                      <input
                        name="name"
                        required
                        defaultValue={block.name}
                        className="input-field mt-1 !pl-3"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Code
                      <input
                        name="code"
                        defaultValue={block.code ?? ""}
                        className="input-field mt-1 !pl-3"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-3">
                      <button type="submit" className="btn-primary px-3 py-2 text-xs">
                        Save block
                      </button>
                    </div>
                  </form>
                  <form action={deleteBlock} className="mt-2">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete block
                    </button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
