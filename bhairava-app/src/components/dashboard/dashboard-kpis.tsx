"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "@/components/motion/count-up";
import { Stagger, StaggerItem } from "@/components/motion/fade-in";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function DashboardKpis({
  projectCount,
  plotCount,
  soldPct,
  revenue,
}: {
  projectCount: number;
  plotCount: number;
  soldPct: number;
  revenue: number;
}) {
  return (
    <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-12">
      <StaggerItem className="col-span-2 lg:col-span-5">
        <Link href="/admin/payments" className="block h-full">
          <div className="h-full rounded-xl bg-white p-5">
            <p className="text-label">Portfolio Value</p>
            <div className="mt-3">
              <CountUp
                value={revenue}
                format={(n) => formatINR(Math.round(n))}
                className="font-display tabular-nums text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              />
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Live from payments ledger
            </p>
          </div>
        </Link>
      </StaggerItem>
      <StaggerItem className="lg:col-span-3">
        <Link href="/admin/plots" className="block h-full">
          <div className="h-full rounded-xl bg-white p-4">
            <p className="text-label">Available Inventory</p>
            <div className="mt-2.5">
              <CountUp
                value={plotCount}
                className="font-display tabular-nums text-2xl font-bold tracking-tight text-foreground"
              />
              <span className="ml-1 text-sm font-medium text-muted-foreground">plots</span>
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {soldPct}% sold across projects
            </p>
          </div>
        </Link>
      </StaggerItem>
      <StaggerItem className="lg:col-span-2">
        <Link href="/admin/projects" className="block h-full">
          <div className="h-full rounded-xl bg-white p-4">
            <p className="text-label">Projects</p>
            <div className="mt-2.5">
              <CountUp
                value={projectCount}
                className="font-display tabular-nums text-2xl font-bold tracking-tight text-foreground"
              />
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Active portfolio</p>
          </div>
        </Link>
      </StaggerItem>
      <StaggerItem className="lg:col-span-2">
        <div className="h-full rounded-xl bg-[#E7EFF6] p-4">
          <p className="text-label">Attention</p>
          <p className="mt-2.5 font-display tabular-nums text-lg font-bold tracking-tight text-foreground">
            —
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Items need action</p>
        </div>
      </StaggerItem>
    </Stagger>
  );
}
