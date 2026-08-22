import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleDollarSign,
  FileQuestion,
  FileText,
  RefreshCw,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { LogoutButton } from "@/components/mobile/logout-button";
import { Card, CardContent } from "@/components/ui/card";
import { AgentQuickSearch } from "@/components/kokonutui/agent-quick-search";
import { FadeIn } from "@/components/motion/fade-in";

const MENU = [
  { href: "/more", label: "My Profile", icon: UserRound },
  { href: "/customers", label: "My Leads", icon: Users },
  { href: "/customers/new", label: "Enquiries", icon: FileQuestion },
  { href: "/bookings?tab=RESERVED", label: "Resale Requests", icon: RefreshCw },
  { href: "/bookings", label: "Payment Dues", icon: CircleDollarSign },
  { href: "/more", label: "Notifications", icon: Bell },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/more", label: "Settings", icon: Settings },
];

export default async function AgentMorePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const initials = session.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <MobileHeader title="More" showMenu showBell />

      <FadeIn>
        <AgentQuickSearch />

        <Card className="mb-3 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-foreground">{session.name}</p>
              <p className="text-[12px] font-medium text-primary">Sales Agent</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {session.email ?? session.mobile}
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </CardContent>
        </Card>

        <p className="mb-1.5 px-0.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          Quick Links
        </p>

        <Card className="shadow-sm">
          <CardContent className="px-1 py-0">
            {MENU.map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.label} href={m.href} className="list-row px-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon size={15} />
                  </span>
                  <span className="flex-1 text-[13px] font-medium">{m.label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="mt-5">
          <LogoutButton />
        </div>
      </FadeIn>
    </div>
  );
}
