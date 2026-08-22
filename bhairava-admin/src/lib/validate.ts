/** Small validators shared by the onboarding forms. */

export const isPhone = (v: string) => /^\d{10}$/.test(v.replace(/\D/g, ""));
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isPincode = (v: string) => /^\d{6}$/.test(v.trim());
export const isPan = (v: string) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.trim().toUpperCase());
export const isAadhaar = (v: string) => /^\d{12}$/.test(v.replace(/\D/g, ""));

export const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

/** Store-safe masked value — only the last 4 characters stay readable. */
export const mask = (v: string) => {
  const clean = v.trim();
  if (!clean) return "";
  return `${"•".repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
};

/** First error message from a list of [condition, message] pairs. */
export const firstError = (checks: [boolean, string][]) => checks.find(([bad]) => bad)?.[1];
