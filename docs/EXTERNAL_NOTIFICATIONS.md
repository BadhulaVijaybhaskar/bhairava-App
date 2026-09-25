# External Notification Providers

## In-app

Always available via `NotificationsService` + DB channel `IN_APP`.

## External channels

| Channel | Env credentials (any one set) | Missing behavior |
|---------|-------------------------------|------------------|
| EMAIL | `SMTP_HOST`+`SMTP_USER`+`SMTP_PASS` **or** `SENDGRID_API_KEY` **or** `EMAIL_PROVIDER_API_KEY` | `BLOCKED BY EXTERNAL CREDENTIAL` |
| SMS | `SMS_PROVIDER_API_KEY` **or** Twilio SID+token | blocked |
| WHATSAPP | `WHATSAPP_PROVIDER_API_KEY` **or** `META_WHATSAPP_TOKEN` | blocked |
| PUSH | `FCM_SERVER_KEY` **or** `EXPO_ACCESS_TOKEN` **or** `PUSH_PROVIDER_API_KEY` | blocked |

Stubs **must not** return `ok: true` without credentials. See `services/api/src/notifications/providers/notification-provider.ts`.

Production shipping of Email/SMS/WhatsApp/Push remains **BLOCKED BY EXTERNAL CREDENTIAL** until providers are wired and secrets supplied.
