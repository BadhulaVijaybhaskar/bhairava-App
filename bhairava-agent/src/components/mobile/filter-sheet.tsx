"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ProjectsSearchFilter({
  defaultQ = "",
  defaultStatus = "",
}: {
  defaultQ?: string;
  defaultStatus?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(defaultStatus);
  const [q, setQ] = useState(defaultQ);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    router.push(`/projects?${params.toString()}`);
  }

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    router.push(`/projects?${params.toString()}`);
    setOpen(false);
  }

  function reset() {
    setStatus("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/projects?${params.toString()}`);
    setOpen(false);
  }

  return (
    <>
      <form onSubmit={submitSearch} className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects"
            className="h-11 bg-white pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 bg-white"
          onClick={() => setOpen(true)}
          aria-label="Filter"
        >
          <Filter size={18} />
        </Button>
      </form>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter Projects</SheetTitle>
          </SheetHeader>
          <p className="mt-3 mb-2 text-[12px] font-semibold text-muted-foreground">Status</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { value: "", label: "All" },
              { value: "ACTIVE", label: "Active" },
              { value: "COMPLETED", label: "Completed" },
              { value: "ON_HOLD", label: "On Hold" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setStatus(o.value)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  status === o.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pb-[env(safe-area-inset-bottom,0px)]">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={reset}>
              Reset
            </Button>
            <Button type="button" className="h-11 flex-1" onClick={apply}>
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function BookingsSearchFilter({
  defaultQ = "",
  defaultProject = "",
  defaultTab = "",
  projects,
}: {
  defaultQ?: string;
  defaultProject?: string;
  defaultTab?: string;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(defaultProject);
  const [q, setQ] = useState(defaultQ);

  function push(nextProject = projectId) {
    const params = new URLSearchParams();
    if (defaultTab && defaultTab !== "All" && defaultTab !== "ALL") {
      params.set("tab", defaultTab);
    }
    if (q.trim()) params.set("q", q.trim());
    if (nextProject) params.set("projectId", nextProject);
    router.push(`/bookings?${params.toString()}`);
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push();
        }}
        className="mb-3 flex gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bookings"
            className="h-11 bg-white pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 bg-white"
          onClick={() => setOpen(true)}
          aria-label="Filter"
        >
          <Filter size={18} />
        </Button>
      </form>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter Bookings</SheetTitle>
          </SheetHeader>
          <p className="mt-3 mb-2 text-[12px] font-semibold text-muted-foreground">Project</p>
          <select
            className="mb-4 h-11 w-full rounded-lg border border-input bg-white px-3 text-[13px]"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 pb-[env(safe-area-inset-bottom,0px)]">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => {
                setProjectId("");
                push("");
                setOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="h-11 flex-1"
              onClick={() => {
                push();
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
