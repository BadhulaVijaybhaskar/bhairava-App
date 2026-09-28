/**
 * Bhairava design tokens — logo is Source of Truth.
 *
 * Palette extracted programmatically from
 * `apps/admin-web/public/branding/bhairava-logo.png` (identical bytes in
 * `packages/ui-web/assets/branding/bhairava-logo.png`): non-white, opaque
 * pixels clustered by HSV into primary blue, dark blue, light blue, gold,
 * and deep navy. Surfaces are blue+white / gold+white mixes only.
 *
 * Green is NOT brand identity. Keep green for semantic success / completed /
 * positive / AVAILABLE plot status only.
 *
 * `tokens.css` must stay in sync (enforced by `tokens.test.ts`).
 */

/* --------------------------------- surfaces -------------------------------- */

/** Blue+white tonal surface ladder (logo primary × white). */
export const surfaces = {
  /** App background — brand-surface. */
  base: '#F2F6FA',
  /** Section / sidebar / tonal panels. */
  section: '#EBF1F7',
  /** Cards on a section, inputs, chips. */
  card: '#E1EAF4',
  /** Selected / pressed / highest emphasis surface — brand-selected. */
  selected: '#D1E0EE',
  /** Raised panels, sheets, popovers. */
  white: '#FFFFFF',
} as const;

/* ---------------------------------- palette -------------------------------- */

/**
 * Logo-extracted brand colors (hex from pixel clusters).
 * - primary: house-body saturated blue average
 * - primaryDark: house shadow mode
 * - primaryLight: metallic highlight mode
 * - accent: gold 'B' mode
 * - accentSoft: gold × white
 * - foreground: deep navy from darkest blue shadows
 */
export const brand = {
  primary: '#0250A1',
  primaryDark: '#002C68',
  primaryLight: '#90C8F8',
  accent: '#F0B038',
  accentSoft: '#FCF2DF',
  surface: surfaces.base,
  selected: surfaces.selected,
  foreground: '#001F49',
  /** @deprecated Alias of primaryLight — was luminous green; now logo light blue. */
  luminous: '#90C8F8',
} as const;

export const palette = {
  primary: brand.primary,
  primaryForeground: '#FFFFFF',
  primaryLuminous: brand.primaryLight,
  primaryContainer: '#C7D8EA',
  onPrimaryContainer: brand.primaryDark,

  /** Muted blue-neutral secondary (desaturated logo primary). Google button keeps Google blue. */
  secondary: '#3F5061',
  secondaryForeground: '#F4F8FC',
  secondaryContainer: '#D5E0EB',

  /** Logo gold accent — sparse decorative use. */
  gold: brand.accent,
  goldForeground: '#3C2200',
  goldContainer: brand.accentSoft,

  foreground: brand.foreground,
  mutedForeground: '#5A6B7A',
  outlineVariant: '#A8B4C2',

  destructive: '#D02B31',
  destructiveForeground: '#FFF9F8',
  /** Semantic warning — amber, distinct from brand gold accent. */
  warning: '#DA950B',
  warningForeground: '#3C2200',
  /** Semantic success only — not brand identity. */
  success: '#00884B',
  successForeground: '#FFFFFF',
} as const;

/** Dark theme counterparts (web `.dark` class). Brand blues stay recognisable. */
export const darkPalette = {
  surfaces: {
    base: '#060E1A',
    section: '#0B1626',
    card: '#122033',
    selected: '#1A2C44',
    white: '#03080F',
    bright: '#1E3048',
    highest: '#243A54',
  },
  primary: brand.primaryLight,
  primaryForeground: brand.primaryDark,
  primaryContainer: brand.primaryDark,
  onPrimaryContainer: '#C7D8EA',
  secondary: '#9AADBF',
  secondaryForeground: '#0A1522',
  secondaryContainer: '#1A2C40',
  gold: brand.accent,
  goldForeground: '#3C2200',
  goldContainer: '#3A2E14',
  foreground: '#E8F0FA',
  mutedForeground: '#9AABBC',
  outlineVariant: '#4A5F75',
} as const;

/** Charts: logo blue hierarchy + gold + gray — no green identity series. */
export const chart = {
  1: brand.primary,
  2: brand.primaryDark,
  3: brand.primaryLight,
  4: brand.accent,
  5: '#64748B',
} as const;

/* -------------------------------- plot status ------------------------------ */

/**
 * Canonical plot status colors. Mirrors `@bhairava/domain`
 * (`canonicalPlotStatusSolid/Fill/Ink`) so RN and plain-CSS consumers don't
 * need the domain package; `tokens.test.ts` guards against drift.
 * AVAILABLE green is functional status, not brand chrome.
 */
export const PLOT_STATUS_KEYS = [
  'AVAILABLE',
  'RESERVED',
  'BOOKED',
  'UNDER_DOCUMENTATION',
  'SOLD',
  'REGISTERED',
  'RESALE_AVAILABLE',
  'BLOCKED',
  'CANCELLED',
] as const;

export type PlotStatusKey = (typeof PLOT_STATUS_KEYS)[number];

export const plotStatusSolid: Record<PlotStatusKey, string> = {
  AVAILABLE: '#4CAF7D',
  RESERVED: '#F2B84B',
  BOOKED: '#3B82F6',
  UNDER_DOCUMENTATION: '#0EA5E9',
  SOLD: '#6366F1',
  REGISTERED: '#7657D5',
  RESALE_AVAILABLE: '#D85C8A',
  BLOCKED: '#94A3B8',
  CANCELLED: '#EF4444',
};

export const plotStatusFill: Record<PlotStatusKey, string> = {
  AVAILABLE: '#BFE5D1',
  RESERVED: '#F6D89A',
  BOOKED: '#A9D2FF',
  UNDER_DOCUMENTATION: '#BAE6FD',
  SOLD: '#C7D2FE',
  REGISTERED: '#C4B5F4',
  RESALE_AVAILABLE: '#F0B6CB',
  BLOCKED: '#E2E8F0',
  CANCELLED: '#FECACA',
};

export const plotStatusInk: Record<PlotStatusKey, string> = {
  AVAILABLE: '#2E7A52',
  RESERVED: '#8A6414',
  BOOKED: '#1D4ED8',
  UNDER_DOCUMENTATION: '#0369A1',
  SOLD: '#4338CA',
  REGISTERED: '#4F3AA8',
  RESALE_AVAILABLE: '#9A3A62',
  BLOCKED: '#475569',
  CANCELLED: '#B91C1C',
};

/* ------------------------------ aggregate colors ---------------------------- */

export const colors = {
  surface: surfaces,
  brand: {
    primary: brand.primary,
    primaryDark: brand.primaryDark,
    primaryLight: brand.primaryLight,
    luminous: brand.primaryLight,
    accent: brand.accent,
    accentSoft: brand.accentSoft,
    surface: brand.surface,
    selected: brand.selected,
    foreground: brand.foreground,
    danger: palette.destructive,
  },
  ...palette,
  chart,
  /** Solid plot status colors (legend dots, map strokes). */
  plotStatus: plotStatusSolid,
  plotStatusFill,
  plotStatusInk,
} as const;

/* -------------------------------- gradients -------------------------------- */

export const gradients = {
  primary: `linear-gradient(135deg, ${brand.primaryDark} 0%, ${brand.primary} 45%, ${brand.primaryLight} 130%)`,
  luminous: `linear-gradient(135deg, ${brand.primaryLight}, ${brand.primary})`,
  flow: `linear-gradient(135deg, ${palette.secondary}, ${brand.primaryLight})`,
  gold: `linear-gradient(135deg, ${brand.accent}, #F8C048)`,
} as const;

/* -------------------------------- typography ------------------------------- */

/** Space Grotesk for headings and major values; Inter for UI and body copy. */
export const fonts = {
  display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
} as const;

/** Bare family names (React Native `fontFamily`, font loaders). */
export const fontFamilies = {
  display: 'Space Grotesk',
  sans: 'Inter',
} as const;

export const FONT_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap';

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Pixel sizes used across the MAIN visual system. */
export const fontSizes = {
  micro: 10,
  eyebrow: 11,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  pageTitleMobile: 22,
  metric: 26,
  pageTitle: 32,
  recordTitle: 34,
  metricLg: 40,
} as const;

export const letterSpacing = {
  /** Display headings / big numbers. */
  display: '-0.03em',
  heading: '-0.02em',
  /** Uppercase eyebrow labels. */
  eyebrow: '0.16em',
  label: '0.1em',
} as const;

/* --------------------------------- spacing --------------------------------- */

/** 4px base grid. Named aliases kept for existing consumers. */
export const spacing = {
  none: 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/* ---------------------------------- radius --------------------------------- */

/** Moderate radius. Base `--radius` is 0.5rem (8px); steps mirror the Tailwind theme. */
export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  '4xl': 24,
  full: 9999,
} as const;

/* ---------------------------------- shadows -------------------------------- */

/** Subtle ambient shadows tinted with brand navy (never pure black). */
export const shadows = {
  ambient: '0 18px 40px -18px rgba(0, 31, 73, 0.14)',
  float: '0 24px 60px -24px rgba(0, 31, 73, 0.22)',
  glow: '0 0 0 1px rgba(2, 80, 161, 0.18), 0 12px 32px -12px rgba(144, 200, 248, 0.45)',
} as const;

/** React Native equivalents of `shadows`. */
export const nativeShadows = {
  ambient: {
    shadowColor: palette.foreground,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  float: {
    shadowColor: palette.foreground,
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
} as const;

/* ---------------------------------- motion --------------------------------- */

export const motion = {
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fast: 180,
  base: 220,
  rise: 420,
} as const;

/* ------------------------------- layout chrome ----------------------------- */

export const layout = {
  sidebarWidth: 256,
  topbarHeight: 64,
  mobileNavHeight: 68,
  wizardActionHeight: 72,
  /** Mobile/desktop breakpoint used by the app shell (Tailwind `lg`). */
  desktopBreakpoint: 1024,
} as const;

/* ------------------------------ CSS variable names -------------------------- */

/** CSS custom properties defined by `tokens.css` (and `@bhairava/ui-web/styles.css`). */
export const cssVar = {
  brandPrimary: '--brand-primary',
  brandPrimaryDark: '--brand-primary-dark',
  brandPrimaryLight: '--brand-primary-light',
  brandAccent: '--brand-accent',
  brandAccentSoft: '--brand-accent-soft',
  brandSurface: '--brand-surface',
  brandSelected: '--brand-selected',
  brandForeground: '--brand-foreground',
  surface: '--surface',
  surfaceBright: '--surface-bright',
  surfaceLowest: '--surface-lowest',
  surfaceLow: '--surface-low',
  surfaceC: '--surface-c',
  surfaceHigh: '--surface-high',
  surfaceHighest: '--surface-highest',
  onSurfaceTint: '--on-surface-tint',
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  primaryLuminous: '--primary-luminous',
  primaryContainer: '--primary-container',
  onPrimaryContainer: '--on-primary-container',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  secondaryContainer: '--secondary-container',
  gold: '--gold',
  goldForeground: '--gold-foreground',
  goldContainer: '--gold-container',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  warning: '--warning',
  warningForeground: '--warning-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  outlineVariant: '--outline-variant',
  border: '--border',
  ring: '--ring',
  radius: '--radius',
  fontDisplay: '--font-display-family',
  fontSans: '--font-sans-family',
  gradientPrimary: '--gradient-primary',
  gradientLuminous: '--gradient-luminous',
  gradientFlow: '--gradient-flow',
  gradientGold: '--gradient-gold',
  mobileNavHeight: '--mobile-nav-height',
  /** Plot status: `--plot-<status>`, `--plot-<status>-fill`, `--plot-<status>-ink`. */
  plotStatus: (status: PlotStatusKey, variant: 'solid' | 'fill' | 'ink' = 'solid') =>
    `--plot-${status.toLowerCase().replace(/_/g, '-')}${variant === 'solid' ? '' : `-${variant}`}`,
} as const;

export const tokens = {
  colors,
  surfaces,
  brand,
  palette,
  darkPalette,
  gradients,
  fonts,
  fontFamilies,
  fontWeights,
  fontSizes,
  letterSpacing,
  spacing,
  radius,
  shadows,
  nativeShadows,
  motion,
  layout,
} as const;

export default tokens;
