import {
  StubEmailProvider,
  StubSmsProvider,
  StubWhatsAppProvider,
  StubPushProvider,
} from './providers/notification-provider';

describe('notification provider stubs', () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env = { ...prev };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_PROVIDER_API_KEY;
    delete process.env.SMS_PROVIDER_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.WHATSAPP_PROVIDER_API_KEY;
    delete process.env.META_WHATSAPP_TOKEN;
    delete process.env.FCM_SERVER_KEY;
    delete process.env.EXPO_ACCESS_TOKEN;
    delete process.env.PUSH_PROVIDER_API_KEY;
  });

  it('email without credentials is BLOCKED (never fake success)', async () => {
    const r = await new StubEmailProvider().send({ title: 't', body: 'b', toAddress: 'a@b.co' });
    expect(r.ok).toBe(false);
    expect(r.blocked).toBe(true);
    expect(r.reason).toMatch(/BLOCKED BY EXTERNAL CREDENTIAL/);
  });

  it('sms / whatsapp / push without credentials are BLOCKED', async () => {
    expect((await new StubSmsProvider().send({ title: 't', body: 'b' })).ok).toBe(false);
    expect((await new StubWhatsAppProvider().send({ title: 't', body: 'b' })).blocked).toBe(true);
    expect((await new StubPushProvider().send({ title: 't', body: 'b' })).reason).toMatch(/BLOCKED/);
  });
});
