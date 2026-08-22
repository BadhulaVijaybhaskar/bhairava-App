import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { LogoutButton } from "@/components/mobile/logout-button";

const MENU = [
  { href: "/profile", label: "My Profile" },
  { href: "/profile", label: "Change Password" },
  { href: "/more", label: "Notification Settings" },
  { href: "/my-plot", label: "My Plots" },
  { href: "/documents", label: "My Documents" },
  { href: "/payments", label: "Payment History" },
];

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const customer = session.customerId
    ? await prisma.customer.findFirst({
        where: { id: session.customerId, deletedAt: null },
      })
    : null;

  const name = customer?.fullName ?? session.name;
  const mobile = customer?.mobile ?? session.mobile ?? "—";
  const email = customer?.email ?? session.email ?? "—";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <MobileHeader title="Profile" backHref="/more" />

      <div className="m-card mb-3 flex flex-col items-center p-5 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-[18px] font-bold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          {initials}
        </div>
        <p className="mt-3 text-[16px] font-bold text-[var(--ink)]">{name}</p>
        <p className="text-[13px] text-[var(--muted)]">{mobile}</p>
        <p className="text-[12px] text-[var(--muted)]">{email}</p>
      </div>

      <div className="m-card px-1">
        {MENU.map((m) => (
          <Link key={m.label} href={m.href} className="list-row px-3">
            <span className="flex-1 text-[13px] font-medium text-[var(--ink)]">{m.label}</span>
            <ChevronRight size={16} className="text-[var(--muted-soft)]" />
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
