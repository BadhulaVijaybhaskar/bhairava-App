import Link from "next/link";

export function SectionHeader({
  title,
  href,
  linkLabel = "See All",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-[12px] font-bold tracking-wide text-foreground uppercase">{title}</p>
      {href ? (
        <Link href={href} className="shrink-0 text-[12px] font-semibold text-primary">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
