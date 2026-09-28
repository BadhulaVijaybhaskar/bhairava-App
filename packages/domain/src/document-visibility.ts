export const DOCUMENT_VISIBILITIES = [
  'INTERNAL',
  'AGENT_VISIBLE',
  'CUSTOMER_PROFILE_RELATED',
] as const;

export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

export function isDocumentVisibility(v: unknown): v is DocumentVisibility {
  return typeof v === 'string' && (DOCUMENT_VISIBILITIES as readonly string[]).includes(v);
}
