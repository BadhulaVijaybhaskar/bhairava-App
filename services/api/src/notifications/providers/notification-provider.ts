/**
 * Channel provider interfaces.
 * Missing external credentials => BLOCKED BY EXTERNAL CREDENTIAL (never fake success).
 * In-app notifications remain available regardless.
 */
export type NotifyPayload = {
  toUserId?: string;
  toAddress?: string; // email / mobile / device token
  title: string;
  body: string;
  payloadJson?: Record<string, unknown>;
};

export type ProviderResult = {
  ok: boolean;
  providerId?: string;
  stub?: boolean;
  blocked?: boolean;
  reason?: string;
};

const BLOCKED: ProviderResult = {
  ok: false,
  blocked: true,
  stub: true,
  reason: 'BLOCKED BY EXTERNAL CREDENTIAL',
};

export interface EmailProvider {
  readonly channel: 'EMAIL';
  send(msg: NotifyPayload): Promise<ProviderResult>;
}

export interface SmsProvider {
  readonly channel: 'SMS';
  send(msg: NotifyPayload): Promise<ProviderResult>;
}

export interface WhatsAppProvider {
  readonly channel: 'WHATSAPP';
  send(msg: NotifyPayload): Promise<ProviderResult>;
}

export interface PushProvider {
  readonly channel: 'PUSH';
  send(msg: NotifyPayload): Promise<ProviderResult>;
}

/** Returns true when SMTP / ESP credentials are present. */
export function hasEmailCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) ||
      env.SENDGRID_API_KEY ||
      env.EMAIL_PROVIDER_API_KEY,
  );
}

export function hasSmsCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SMS_PROVIDER_API_KEY || (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN));
}

export function hasWhatsAppCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.WHATSAPP_PROVIDER_API_KEY || env.META_WHATSAPP_TOKEN);
}

export function hasPushCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.FCM_SERVER_KEY || env.EXPO_ACCESS_TOKEN || env.PUSH_PROVIDER_API_KEY);
}

export class StubEmailProvider implements EmailProvider {
  readonly channel = 'EMAIL' as const;
  async send(_msg: NotifyPayload): Promise<ProviderResult> {
    if (!hasEmailCredentials()) return { ...BLOCKED, providerId: 'email' };
    // Real provider wiring is intentionally out of scope until credentials are supplied.
    return { ...BLOCKED, providerId: 'email', reason: 'BLOCKED BY EXTERNAL CREDENTIAL: provider adapter not configured' };
  }
}

export class StubSmsProvider implements SmsProvider {
  readonly channel = 'SMS' as const;
  async send(_msg: NotifyPayload): Promise<ProviderResult> {
    if (!hasSmsCredentials()) return { ...BLOCKED, providerId: 'sms' };
    return { ...BLOCKED, providerId: 'sms', reason: 'BLOCKED BY EXTERNAL CREDENTIAL: provider adapter not configured' };
  }
}

export class StubWhatsAppProvider implements WhatsAppProvider {
  readonly channel = 'WHATSAPP' as const;
  async send(_msg: NotifyPayload): Promise<ProviderResult> {
    if (!hasWhatsAppCredentials()) return { ...BLOCKED, providerId: 'whatsapp' };
    return { ...BLOCKED, providerId: 'whatsapp', reason: 'BLOCKED BY EXTERNAL CREDENTIAL: provider adapter not configured' };
  }
}

export class StubPushProvider implements PushProvider {
  readonly channel = 'PUSH' as const;
  async send(_msg: NotifyPayload): Promise<ProviderResult> {
    if (!hasPushCredentials()) return { ...BLOCKED, providerId: 'push' };
    return { ...BLOCKED, providerId: 'push', reason: 'BLOCKED BY EXTERNAL CREDENTIAL: provider adapter not configured' };
  }
}
