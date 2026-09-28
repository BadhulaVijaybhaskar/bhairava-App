/**
 * Pure product-rule helpers for Google signup, phone-dup privacy,
 * invite attribution, and site-visit routing. Keep free of Nest/Prisma
 * so unit tests can cover acceptance rules without a database.
 */

/** Stable system agent code for the org sales desk. */
export const BHAIRAVA_DIRECT_CODE = 'BHAIRAVA_DIRECT';

/**
 * Normalize Indian mobile to last-10 digits starting 6-9.
 * Accepts +91, 0-prefix, spaces/dashes. Returns null if invalid.
 */
export function normalizePhoneIn(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  if (!/^[6-9]\d{9}$/.test(last10)) return null;
  return last10;
}

export const ATTRIBUTION_SOURCES = [
  'DIRECT_APP',
  'AGENT_INVITE',
  'ADMIN_CREATED',
  'REFERRAL',
  'OTHER',
] as const;
export type AttributionSourceCode = (typeof ATTRIBUTION_SOURCES)[number];

export type PhoneDupDecision =
  | { ok: true }
  | {
      ok: false;
      code: 'MOBILE_CONFLICT';
      /** Generic client message — never include existing customer/agent PII. */
      message: string;
    };

/**
 * Mobile-only duplicate: when another account already owns this normalized
 * mobile under a different Google identity / user, refuse merge and leak no PII.
 */
export function decideMobileOnlyDup(params: {
  normalizedMobile: string;
  /** Existing user/customer mobile owner, if any. */
  existingOwner: null | {
    userId: string;
    googleSub: string | null;
    email: string | null;
  };
  claimant: { userId: string; googleSub: string | null; email: string | null };
}): PhoneDupDecision {
  const existing = params.existingOwner;
  if (!existing) return { ok: true };
  if (existing.userId === params.claimant.userId) return { ok: true };
  if (
    existing.googleSub &&
    params.claimant.googleSub &&
    existing.googleSub === params.claimant.googleSub
  ) {
    return { ok: true };
  }
  if (
    existing.email &&
    params.claimant.email &&
    existing.email.toLowerCase() === params.claimant.email.toLowerCase()
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    code: 'MOBILE_CONFLICT',
    message: 'This mobile number cannot be used for this account.',
  };
}

/**
 * Agent "Add Customer" / invite must not steal an existing relationship by phone.
 */
export function decidePhoneStealAttempt(params: {
  normalizedMobile: string;
  existingCustomer: null | { id: string; agentId: string | null };
  actingAgentId: string;
}):
  | { ok: true; action: 'create' | 'same_agent' }
  | { ok: false; code: 'PHONE_OWNED'; message: string; audit: true } {
  const existing = params.existingCustomer;
  if (!existing) return { ok: true, action: 'create' };
  if (existing.agentId && existing.agentId === params.actingAgentId) {
    return { ok: true, action: 'same_agent' };
  }
  return {
    ok: false,
    code: 'PHONE_OWNED',
    message: existing.agentId
      ? 'A customer with this mobile is already assigned.'
      : 'A customer with this mobile already exists.',
    audit: true,
  };
}

/** Resolve sales owner for a new Direct App customer. */
export function resolveDirectAppSalesOwner(bhairavaDirectAgentId: string | null): {
  agentId: string | null;
  attributionSource: AttributionSourceCode;
} {
  return {
    agentId: bhairavaDirectAgentId,
    attributionSource: 'DIRECT_APP',
  };
}

/** Resolve sales owner when claiming an agent invite. */
export function resolveInviteSalesOwner(invitingAgentId: string): {
  agentId: string;
  invitedByAgentId: string;
  attributionSource: AttributionSourceCode;
} {
  return {
    agentId: invitingAgentId,
    invitedByAgentId: invitingAgentId,
    attributionSource: 'AGENT_INVITE',
  };
}

/**
 * Site-visit request routing: primary sales owner if active, else Bhairava Direct.
 */
export function resolveSiteVisitAssignee(params: {
  primaryAgent: null | { id: string; status: string; code: string };
  bhairavaDirectAgentId: string | null;
}): { agentId: string | null; reason: 'PRIMARY_AGENT' | 'BHAIRAVA_DIRECT' | 'UNASSIGNED' } {
  const primary = params.primaryAgent;
  if (primary && isAgentActive(primary.status)) {
    return { agentId: primary.id, reason: 'PRIMARY_AGENT' };
  }
  if (params.bhairavaDirectAgentId) {
    return { agentId: params.bhairavaDirectAgentId, reason: 'BHAIRAVA_DIRECT' };
  }
  return { agentId: null, reason: 'UNASSIGNED' };
}

export function isAgentActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return status.trim().toLowerCase() === 'active';
}

/** Returning Google user skips profile when profileCompletedAt is set. */
export function needsProfileCompletion(profileCompletedAt: Date | string | null | undefined): boolean {
  return !profileCompletedAt;
}

export function generateAgentCode(existingCodes: Set<string>, randomPart: string): string {
  const cleaned = randomPart.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const base = cleaned.length >= 4 ? `AG-${cleaned}` : `AG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  let code = base;
  let n = 0;
  while (existingCodes.has(code)) {
    n += 1;
    code = `${base}${n}`;
  }
  return code;
}

export function isInviteExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

/**
 * Invite hint binding: when the invite carries email/phone hints, the claimer
 * must match. Mismatch rejects without PII leak and without attribution transfer.
 * No hints → generic token flow remains OK.
 */
export function decideInviteHintMatch(params: {
  emailHint: string | null | undefined;
  phoneHintNormalized: string | null | undefined;
  claimantEmail: string | null | undefined;
  claimantMobileNormalized: string | null | undefined;
}):
  | { ok: true }
  | { ok: false; code: 'INVITE_HINT_MISMATCH'; message: string } {
  const emailHint = params.emailHint?.trim().toLowerCase() || null;
  if (emailHint) {
    const claimant = params.claimantEmail?.trim().toLowerCase() || '';
    if (!claimant || claimant !== emailHint) {
      return {
        ok: false,
        code: 'INVITE_HINT_MISMATCH',
        message: 'This invite cannot be used with the signed-in account.',
      };
    }
  }
  const phoneHint = params.phoneHintNormalized?.trim() || null;
  if (phoneHint) {
    const claimant = params.claimantMobileNormalized?.trim() || '';
    if (!claimant || claimant !== phoneHint) {
      return {
        ok: false,
        code: 'INVITE_HINT_MISMATCH',
        message: 'This invite cannot be used with the provided mobile number.',
      };
    }
  }
  return { ok: true };
}

/**
 * Original acquisition attribution must never be overwritten on later reassignment.
 * Sales-owner agentId may change; attributionSource / invitedByAgentId stay locked.
 */
export function preserveOriginalAttribution(params: {
  existingAttributionSource: AttributionSourceCode | string | null | undefined;
  existingInvitedByAgentId: string | null | undefined;
  incomingAttributionSource: AttributionSourceCode;
  incomingInvitedByAgentId: string | null;
}): {
  attributionSource: AttributionSourceCode | string;
  invitedByAgentId: string | null;
  retainedOriginal: boolean;
} {
  if (params.existingAttributionSource) {
    return {
      attributionSource: params.existingAttributionSource,
      invitedByAgentId: params.existingInvitedByAgentId ?? null,
      retainedOriginal: true,
    };
  }
  return {
    attributionSource: params.incomingAttributionSource,
    invitedByAgentId: params.incomingInvitedByAgentId,
    retainedOriginal: false,
  };
}

export function invitePublicMeta(params: {
  agentName: string;
  agentCode: string;
  orgName: string;
  expiresAt: Date | string;
  claimedAt: Date | string | null;
  revokedAt: Date | string | null;
}): {
  valid: boolean;
  agentName: string;
  agentCode: string;
  orgName: string;
  expiresAt: string;
  reason?: string;
} {
  const expiresAt = new Date(params.expiresAt).toISOString();
  if (params.revokedAt) {
    return {
      valid: false,
      agentName: params.agentName,
      agentCode: params.agentCode,
      orgName: params.orgName,
      expiresAt,
      reason: 'revoked',
    };
  }
  if (params.claimedAt) {
    return {
      valid: false,
      agentName: params.agentName,
      agentCode: params.agentCode,
      orgName: params.orgName,
      expiresAt,
      reason: 'claimed',
    };
  }
  if (isInviteExpired(params.expiresAt)) {
    return {
      valid: false,
      agentName: params.agentName,
      agentCode: params.agentCode,
      orgName: params.orgName,
      expiresAt,
      reason: 'expired',
    };
  }
  return {
    valid: true,
    agentName: params.agentName,
    agentCode: params.agentCode,
    orgName: params.orgName,
    expiresAt,
  };
}
