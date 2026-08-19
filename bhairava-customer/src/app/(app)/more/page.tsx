import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CreditCard,
  FileText,
  Gift,
  Headphones,
  MapPinned,
  Megaphone,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { MobileHeader } from "@/components/mobile/mobile-header";

const QUICK = [
  { href: "/my-plot", label: "My Plots", icon: MapPinned, color: "#6d28d9" },
  { href: "/payments", label: "Payments", icon: CreditCard, color: "#16a34a" },
  { href: "/documents", label: "Documents", icon: FileText, color: "#2563eb" },
  { href: "/support", label: "Support", icon: Headphones, color: "#ea580c" },
  { href: "/support?tab=announcements", label: "Announcements", icon: Megaphone, color: "#db2777" },
  { href: "/more", label: "Refer & Earn", icon: Gift, color: "#0891b2" },
];

const OTHER = [
  { href: "/more", label: "Terms & Conditions" },
  { href: "/more", label: "Privacy Policy" },
  { href: "/more", label: "About Us" },
  { href: "/profile", label: "Contact Us" },
];

export default async function MorePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <MobileHeader title="More" backHref="/dashboard" showBell={false} />

      <p className="mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
        Quick Links
      </p>
      <div className="grid grid-cols-3 gap-2">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.label}
              href={q.href}
              className="m-card flex flex-col items-center gap-2 p-3 text-center"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: q.color }}
              >
                <Icon size={18} />
              </span>
              <span className="text-[11px] font-semibold text-[var(--ink)]">{q.label}</span>
            </Link>
          );
        })}
      </div>

      <p className="mt-5 mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
        Other
      </p>
      <div className="m-card px-3">
        {OTHER.map((o) => (
          <Link
            key={o.label}
            href={o.href}
            className="block border-b border-[var(--border)] py-3 text-[13px] font-medium text-[var(--ink)] last:border-0"
          >
            {o.label}
          </Link>
        ))}
      </div>

      <Link href="/projects" className="mt-4 block text-center text-[13px] font-semibold text-[var(--brand)]">
        Browse all projects & layouts →
      </Link>
      <Link href="/profile" className="mt-2 block text-center text-[13px] font-semibold text-[var(--brand)]">
        Open profile →
      </Link>
    </div>
  );
}
