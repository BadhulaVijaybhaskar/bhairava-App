"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/mobile/status-badge";
import { AnimeStagger } from "@/components/motion/anime-stagger";

type Item = {
  id: string;
  href: string;
  name: string;
  city: string | null;
  status: string;
  plots: number;
  cover: string | null;
};

export function ProjectsListClient({ items }: { items: Item[] }) {
  return (
    <AnimeStagger className="space-y-2">
      {items.map((a) => (
        <div key={a.id} data-anime-item>
          <Link href={a.href} className="block">
            <Card className="flex items-center gap-3 border-border/80 p-2.5 shadow-sm transition-transform active:scale-[0.99]">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-secondary">
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] font-bold text-primary">
                    {a.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[14px] font-semibold text-foreground">{a.name}</p>
                  <ProjectStatusBadge status={a.status} />
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{a.plots} Plots</p>
                <p className="text-[11px] text-[var(--muted-soft)]">{a.city || "—"}</p>
              </div>
            </Card>
          </Link>
        </div>
      ))}
    </AnimeStagger>
  );
}
