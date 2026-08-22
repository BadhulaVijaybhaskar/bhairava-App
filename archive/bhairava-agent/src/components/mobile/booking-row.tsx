import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { BookingStatusBadge } from "./status-badge";

export function BookingRow({
  href,
  plotNumber,
  projectName,
  customerName,
  amount,
  status,
  date,
}: {
  href?: string;
  plotNumber: string;
  projectName: string;
  customerName: string;
  amount: number;
  status: string;
  date?: Date | null;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--ink)]">
          {plotNumber}, {projectName}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{customerName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-bold text-[var(--ink)]">{formatINR(amount)}</p>
        <div className="mt-0.5 flex flex-col items-end gap-0.5">
          <BookingStatusBadge status={status} />
          {date ? (
            <span className="text-[10px] text-[var(--muted-soft)]">
              {date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="list-row">
        {body}
      </Link>
    );
  }
  return <div className="list-row">{body}</div>;
}
