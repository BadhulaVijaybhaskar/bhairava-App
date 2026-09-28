import { cn } from "../lib/utils";

/**
 * Apps serve the logo from `public/branding/`. The file ships with this package
 * at `@bhairava/ui-web/branding/bhairava-logo.png` for apps to copy or import.
 */
export const DEFAULT_LOGO_SRC = "/branding/bhairava-logo.png";

export function BrandLogo({
  size = 36,
  className,
  logoSrc = DEFAULT_LOGO_SRC,
  alt = "Bhairava",
}: {
  size?: number;
  className?: string;
  logoSrc?: string | undefined;
  alt?: string;
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
        src={logoSrc}
        alt={alt}
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
  title = "Bhairava",
  subtitle = "Land Sales OS",
  logoSrc,
  className,
}: {
  size?: number;
  title?: string;
  subtitle?: string | null;
  logoSrc?: string | undefined;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandLogo size={size} logoSrc={logoSrc} alt={title} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-sm font-semibold tracking-tight">{title}</p>
        {subtitle ? (
          <p className="truncate text-[11px] tracking-wide text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
