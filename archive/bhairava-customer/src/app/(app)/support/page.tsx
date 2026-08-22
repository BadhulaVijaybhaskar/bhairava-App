import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { StatusBadge } from "@/components/mobile/status-badge";

/** Support requests — lightweight local list until a Support model exists. */
const PLACEHOLDER: { title: string; date: string; status: string }[] = [];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const tab = sp.tab === "announcements" ? "announcements" : "requests";

  return (
    <div>
      <MobileHeader
        title="Support / Requests"
        backHref="/more"
        right={
          <Link href="/support?new=1" className="text-[12px] font-semibold text-[var(--brand)]">
            + New Request
          </Link>
        }
        showBell={false}
      />

      <div className="tab-bar -mx-4 mb-3 px-4">
        <Link href="/support?tab=requests" className={tab === "requests" ? "active" : undefined}>
          My Requests
        </Link>
        <Link
          href="/support?tab=announcements"
          className={tab === "announcements" ? "active" : undefined}
        >
          Announcements
        </Link>
      </div>

      {tab === "announcements" ? (
        <div className="m-card p-6 text-center text-[13px] text-[var(--muted)]">
          No announcements yet
        </div>
      ) : PLACEHOLDER.length === 0 ? (
        <div className="m-card p-6 text-center text-[13px] text-[var(--muted)]">
          No support requests yet
        </div>
      ) : (
        <div className="m-card px-3">
          {PLACEHOLDER.map((r, i) => (
            <div key={i} className="list-row">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{r.title}</p>
                <p className="text-[11px] text-[var(--muted)]">{r.date}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
