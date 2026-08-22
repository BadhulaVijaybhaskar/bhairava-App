import { cn } from "@/lib/utils";

/** Served from `public/branding` so it works outside Lovable's asset proxy. */
const LOGO_SRC = "/branding/bhairava-logo.png";

export function BrandLogo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-lowest shadow-ambient ring-1 ring-[color-mix(in_oklab,var(--secondary)_18%,transparent)]",
        className,
      )}
      style={{ height: size, width: size }}
    >
      <img
        src={LOGO_SRC}
        alt="Bhairava"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        decoding="async"
      />
    </span>
  );
}

export function BrandWordmark({
  size = 36,
  subtitle = "Land Sales OS",
  className,
}: {
  size?: number;
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandLogo size={size} />
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold tracking-tight">Bhairava</p>
        {subtitle ? (
          <p className="text-[11px] tracking-wide text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
