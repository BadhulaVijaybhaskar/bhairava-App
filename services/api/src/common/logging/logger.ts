import { randomUUID } from 'crypto';

const SENSITIVE_KEY = /password|token|secret|authorization|cookie|refresh|pan|aadhaar|aadhar/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v);
    }
    return out;
  }
  if (typeof value === 'string') {
    if (/^\d{12}$/.test(value)) return 'XXXXXXXX' + value.slice(-4);
    if (/^[A-Z]{5}\d{4}[A-Z]$/i.test(value)) return '[PAN_REDACTED]';
  }
  return value;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createRequestId(): string {
  return randomUUID();
}

export function structuredLog(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    service: 'bhairava-api',
    ...redact(fields) as Record<string, unknown>,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export class AppLogger {
  constructor(private readonly context?: string) {}

  child(fields: Record<string, unknown>) {
    const parent = this;
    return {
      debug: (msg: string, extra: Record<string, unknown> = {}) =>
        parent.debug(msg, { ...fields, ...extra }),
      info: (msg: string, extra: Record<string, unknown> = {}) =>
        parent.info(msg, { ...fields, ...extra }),
      warn: (msg: string, extra: Record<string, unknown> = {}) =>
        parent.warn(msg, { ...fields, ...extra }),
      error: (msg: string, extra: Record<string, unknown> = {}) =>
        parent.error(msg, { ...fields, ...extra }),
    };
  }

  debug(msg: string, fields: Record<string, unknown> = {}) {
    structuredLog('debug', msg, { context: this.context, ...fields });
  }
  info(msg: string, fields: Record<string, unknown> = {}) {
    structuredLog('info', msg, { context: this.context, ...fields });
  }
  warn(msg: string, fields: Record<string, unknown> = {}) {
    structuredLog('warn', msg, { context: this.context, ...fields });
  }
  error(msg: string, fields: Record<string, unknown> = {}) {
    structuredLog('error', msg, { context: this.context, ...fields });
  }
}
