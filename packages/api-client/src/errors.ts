export type ApiErrorCategory =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'MPIN_MISMATCH'
  | 'MPIN_INVALID'
  | 'MPIN_LOCKED'
  | 'DUPLICATE_CUSTOMER'
  | 'INVITE_INVALID'
  | 'SESSION_EXPIRED'
  | 'ROLE_MISMATCH'
  | 'ACCOUNT_UNAVAILABLE'
  | 'ACCESS_DENIED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type UserFacingErrorContext =
  | 'default'
  | 'mpin_save'
  | 'mpin_login'
  | 'auth'
  | 'agent_auth';

export const USER_ERROR_COPY = {
  VALIDATION_ERROR: 'Please check your details and try again.',
  AUTH_ERROR: 'Sign-in failed. Please try again.',
  MPIN_MISMATCH: 'MPINs do not match. Please try again.',
  MPIN_MISMATCH_FIELD: 'MPINs do not match. Please enter the same 4-digit MPIN.',
  MPIN_INVALID: 'Incorrect MPIN. Please try again.',
  MPIN_LOCKED: 'Too many incorrect attempts. Please try again later or reset your MPIN.',
  DUPLICATE_CUSTOMER: 'An account with these details already exists. Please sign in instead.',
  INVITE_INVALID: 'This invite link is invalid or has expired.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  ROLE_MISMATCH: 'This Google account cannot sign in to this portal.',
  ACCOUNT_UNAVAILABLE: 'Your account is currently unavailable. Please contact Bhairava.',
  ACCESS_DENIED: 'You don’t have access to this account.',
  /** Agent portal — wrong portal / non-Agent Google account. */
  AGENT_ROLE_MISMATCH: 'This Google account is not registered as an Agent.',
  /** Agent portal — suspended / disabled Agent. */
  AGENT_ACCOUNT_UNAVAILABLE: 'Your Agent account is currently unavailable. Please contact Bhairava.',
  /** Agent portal — generic access denied. */
  AGENT_ACCESS_DENIED: 'You don’t have access to this Agent account.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network problem. Please check your connection and try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  MPIN_SAVE_FAILED: 'We couldn’t save your MPIN. Please try again.',
} as const;

/** Patterns that must never appear in Customer/Agent UI copy. */
export const UNSAFE_USER_MESSAGE_PATTERNS = [
  /statusCode/i,
  /requestId/i,
  /timestamp/i,
  /\/api\//i,
  /\bBad Request\b/i,
  /\bInternal Server Error\b/i,
  /\bForbidden\b/i,
  /\b403\b/,
  /^(GET|POST|PUT|PATCH|DELETE)\s+\//i,
  /→\s*\d{3}\b/,
  /^\s*\{/,
  /"path"\s*:/,
  /Axios|NestJS|Exception/i,
  /at\s+\S+\s+\(/, // stack frames
] as const;

export type ApiErrorDiagnostics = {
  status?: number;
  method?: string;
  path?: string;
  bodyText?: string;
  serverMessage?: string;
  requestId?: string;
  timestamp?: string;
};

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly status?: number;
  readonly method?: string;
  readonly path?: string;
  /** Raw response body — NEVER render in Customer/Agent UI. */
  readonly bodyText?: string;
  readonly serverMessage?: string;
  readonly requestId?: string;
  readonly timestamp?: string;

  constructor(
    category: ApiErrorCategory,
    userMessage: string,
    diagnostics: ApiErrorDiagnostics = {},
  ) {
    super(assertSafeUserMessage(userMessage, category));
    this.name = 'ApiError';
    this.category = category;
    this.status = diagnostics.status;
    this.method = diagnostics.method;
    this.path = diagnostics.path;
    this.bodyText = diagnostics.bodyText;
    this.serverMessage = diagnostics.serverMessage;
    this.requestId = diagnostics.requestId;
    this.timestamp = diagnostics.timestamp;
  }

  /** Admin diagnostic sofa only — do not show on Customer/Agent surfaces. */
  get diagnostics(): ApiErrorDiagnostics {
    return {
      status: this.status,
      method: this.method,
      path: this.path,
      bodyText: this.bodyText,
      serverMessage: this.serverMessage,
      requestId: this.requestId,
      timestamp: this.timestamp,
    };
  }
}

export function isUnsafeUserMessage(text: string): boolean {
  const t = String(text || '');
  if (!t.trim()) return true;
  return UNSAFE_USER_MESSAGE_PATTERNS.some((re) => re.test(t));
}

export function assertSafeUserMessage(text: string, category: ApiErrorCategory = 'UNKNOWN_ERROR'): string {
  if (!text || isUnsafeUserMessage(text)) {
    return USER_ERROR_COPY[category] ?? USER_ERROR_COPY.UNKNOWN_ERROR;
  }
  return text;
}

type ParsedBody = {
  message?: string;
  messages: string[];
  statusCode?: number;
  requestId?: string;
  timestamp?: string;
  path?: string;
  error?: string;
  code?: string;
};

function parseResponseBody(bodyText: string): ParsedBody {
  const out: ParsedBody = { messages: [] };
  const trimmed = bodyText.trim();
  if (!trimmed) return out;
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof json.statusCode === 'number') out.statusCode = json.statusCode;
    if (typeof json.requestId === 'string') out.requestId = json.requestId;
    if (typeof json.timestamp === 'string') out.timestamp = json.timestamp;
    if (typeof json.path === 'string') out.path = json.path;
    if (typeof json.error === 'string') out.error = json.error;
    if (typeof json.code === 'string') out.code = json.code;
    if (typeof json.message === 'string') {
      out.message = json.message;
      out.messages.push(json.message);
    } else if (Array.isArray(json.message)) {
      for (const m of json.message) {
        if (typeof m === 'string') out.messages.push(m);
      }
      if (out.messages[0]) out.message = out.messages[0];
    }
  } catch {
    if (!isUnsafeUserMessage(trimmed) && trimmed.length < 160) {
      out.message = trimmed;
      out.messages.push(trimmed);
    }
  }
  return out;
}

function joinServerText(parts: Array<string | undefined | null>): string {
  return parts.filter((p): p is string => Boolean(p && String(p).trim())).join(' | ');
}

export function categorizeFromStatusAndMessage(
  status: number | undefined,
  serverMessage: string,
  code?: string,
): ApiErrorCategory {
  const msg = serverMessage.toLowerCase();
  const c = (code || '').toUpperCase();

  if (status === 0 || status === undefined) {
    // network path handled separately
  }

  if (
    c === 'MPIN_MISMATCH' ||
    msg === 'pin not matched' ||
    msg.includes('confirmation does not match') ||
    msg.includes('mpins do not match') ||
    msg.includes('pin not matched')
  ) {
    return 'MPIN_MISMATCH';
  }

  if (
    c === 'MPIN_LOCKED' ||
    msg.includes('too many attempts') ||
    msg.includes('too many incorrect') ||
    (msg.includes('locked') && msg.includes('mpin'))
  ) {
    return 'MPIN_LOCKED';
  }

  if (
    c === 'MPIN_INVALID' ||
    msg.includes('incorrect mpin') ||
    msg.includes('invalid mpin') ||
    (msg.includes('invalid credentials') && msg.includes('mpin'))
  ) {
    return 'MPIN_INVALID';
  }

  // Wrong MPIN login returns generic Invalid credentials — treat login-auth as AUTH/MPIN_INVALID via context later.
  if (msg.includes('invalid credentials')) {
    return 'AUTH_ERROR';
  }

  if (
    c === 'DUPLICATE_CUSTOMER' ||
    msg.includes('already exists') ||
    msg.includes('duplicate customer') ||
    msg.includes('phone already')
  ) {
    return 'DUPLICATE_CUSTOMER';
  }

  if (
    c === 'INVITE_INVALID' ||
    msg.includes('invite') && (msg.includes('invalid') || msg.includes('expired') || msg.includes('revoked'))
  ) {
    return 'INVITE_INVALID';
  }

  if (status === 401 || msg.includes('unauthorized') || msg.includes('session has expired')) {
    return 'SESSION_EXPIRED';
  }

  if (status === 403 && (msg.includes('attempt') || msg.includes('lock'))) {
    return 'MPIN_LOCKED';
  }

  // Portal / role / account access (403) — never treat as generic AUTH "Sign-in failed".
  if (
    c === 'ROLE_MISMATCH' ||
    msg.includes('not an agent login') ||
    msg.includes('not a customer login') ||
    msg.includes('not registered as an agent') ||
    msg.includes('wrong portal')
  ) {
    return 'ROLE_MISMATCH';
  }

  if (
    c === 'ACCOUNT_UNAVAILABLE' ||
    msg.includes('account suspended') ||
    msg.includes('account not active') ||
    (msg.includes('disabled') && msg.includes('account')) ||
    (msg.includes('suspended') && msg.includes('account'))
  ) {
    return 'ACCOUNT_UNAVAILABLE';
  }

  if (status === 403 || c === 'ACCESS_DENIED' || msg.includes('forbidden') || msg.includes('access denied')) {
    return 'ACCESS_DENIED';
  }

  if (status === 400 || status === 422) {
    if (msg.includes('mpin must be exactly') || msg.includes('4 digits')) {
      return 'VALIDATION_ERROR';
    }
    return 'VALIDATION_ERROR';
  }

  if (status !== undefined && status >= 500) {
    return 'SERVER_ERROR';
  }

  if (status !== undefined && status >= 400) {
    return 'VALIDATION_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

export function userMessageForCategory(
  category: ApiErrorCategory,
  context: UserFacingErrorContext = 'default',
): string {
  if (context === 'mpin_save') {
    if (category === 'MPIN_MISMATCH') return USER_ERROR_COPY.MPIN_MISMATCH;
    if (category === 'VALIDATION_ERROR') return USER_ERROR_COPY.VALIDATION_ERROR;
    if (category === 'SERVER_ERROR' || category === 'UNKNOWN_ERROR') return USER_ERROR_COPY.MPIN_SAVE_FAILED;
  }
  if (context === 'mpin_login') {
    if (category === 'AUTH_ERROR' || category === 'MPIN_INVALID') return USER_ERROR_COPY.MPIN_INVALID;
    if (category === 'MPIN_LOCKED') return USER_ERROR_COPY.MPIN_LOCKED;
    if (category === 'SESSION_EXPIRED') return USER_ERROR_COPY.SESSION_EXPIRED;
    if (category === 'ACCOUNT_UNAVAILABLE') return USER_ERROR_COPY.ACCOUNT_UNAVAILABLE;
    if (category === 'ACCESS_DENIED') return USER_ERROR_COPY.ACCESS_DENIED;
  }
  if (context === 'agent_auth') {
    if (category === 'ROLE_MISMATCH') return USER_ERROR_COPY.AGENT_ROLE_MISMATCH;
    if (category === 'ACCOUNT_UNAVAILABLE') return USER_ERROR_COPY.AGENT_ACCOUNT_UNAVAILABLE;
    if (category === 'ACCESS_DENIED') return USER_ERROR_COPY.AGENT_ACCESS_DENIED;
    if (category === 'SESSION_EXPIRED') return USER_ERROR_COPY.SESSION_EXPIRED;
    if (category === 'AUTH_ERROR') return USER_ERROR_COPY.AUTH_ERROR;
  }
  if (context === 'auth' && category === 'AUTH_ERROR') {
    return USER_ERROR_COPY.AUTH_ERROR;
  }
  return USER_ERROR_COPY[category] ?? USER_ERROR_COPY.UNKNOWN_ERROR;
}

export function createApiErrorFromResponse(params: {
  method: string;
  path: string;
  status: number;
  bodyText: string;
  context?: UserFacingErrorContext;
}): ApiError {
  const parsed = parseResponseBody(params.bodyText);
  const serverMessage = joinServerText([parsed.message, ...parsed.messages.slice(1)]);
  const category = categorizeFromStatusAndMessage(params.status, serverMessage, parsed.code);
  const userMessage = userMessageForCategory(category, params.context);
  return new ApiError(category, userMessage, {
    status: params.status,
    method: params.method,
    path: params.path,
    bodyText: params.bodyText,
    serverMessage: serverMessage || undefined,
    requestId: parsed.requestId,
    timestamp: parsed.timestamp,
  });
}

export function createNetworkApiError(cause?: unknown): ApiError {
  const detail = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
  return new ApiError('NETWORK_ERROR', USER_ERROR_COPY.NETWORK_ERROR, {
    bodyText: detail || undefined,
    serverMessage: detail || undefined,
  });
}

/**
 * Map any thrown value to safe Customer/Agent copy.
 * Prefer this over `error.message` / `JSON.stringify(err)`.
 */
export function userFacingError(
  error: unknown,
  opts: { context?: UserFacingErrorContext; fallback?: string } = {},
): string {
  const context = opts.context ?? 'default';
  if (error instanceof ApiError) {
    return assertSafeUserMessage(
      userMessageForCategory(error.category, context) || error.message,
      error.category,
    );
  }
  if (typeof error === 'string') {
    if (!isUnsafeUserMessage(error)) {
      const category = categorizeFromStatusAndMessage(undefined, error);
      return userMessageForCategory(category, context);
    }
    // Legacy transport dump string
    const extracted = extractLegacyDump(error);
    if (extracted) {
      const category = categorizeFromStatusAndMessage(extracted.status, extracted.serverMessage);
      return userMessageForCategory(category, context);
    }
    return opts.fallback ?? userMessageForCategory('UNKNOWN_ERROR', context);
  }
  if (error instanceof Error) {
    if (!isUnsafeUserMessage(error.message)) {
      const category = categorizeFromStatusAndMessage(undefined, error.message);
      // Prefer contextual friendly copy over echoing unknown server phrases
      if (category === 'UNKNOWN_ERROR' || category === 'VALIDATION_ERROR') {
        // Known short validation phrases that are already friendly may pass through via category copy
        const mapped = userMessageForCategory(category, context);
        if (category === 'VALIDATION_ERROR' && error.message.length < 100 && !isUnsafeUserMessage(error.message)) {
          // Still prefer category defaults for consistency unless it's a known mapped phrase
          const recategorized = categorizeFromStatusAndMessage(400, error.message);
          return userMessageForCategory(recategorized, context);
        }
        return mapped;
      }
      return userMessageForCategory(category, context);
    }
    const extracted = extractLegacyDump(error.message);
    if (extracted) {
      const category = categorizeFromStatusAndMessage(extracted.status, extracted.serverMessage);
      return userMessageForCategory(category, context);
    }
  }
  return opts.fallback ?? userMessageForCategory('SERVER_ERROR', context);
}

function extractLegacyDump(text: string): { status?: number; serverMessage: string } | null {
  const arrow = text.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+→\s+(\d{3})\s+([\s\S]+)$/i);
  if (arrow) {
    const status = Number(arrow[3]);
    const body = arrow[4] || '';
    const parsed = parseResponseBody(body);
    return { status, serverMessage: parsed.message || '' };
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = parseResponseBody(jsonMatch[0]);
    return { status: parsed.statusCode, serverMessage: parsed.message || '' };
  }
  return null;
}

/** Admin diagnostic sofa — formats diagnostics; never use on Customer/Agent. */
export function formatApiDiagnostics(error: unknown): string {
  if (error instanceof ApiError) {
    return JSON.stringify(error.diagnostics, null, 2);
  }
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}
