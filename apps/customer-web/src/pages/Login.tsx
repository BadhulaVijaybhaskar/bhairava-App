import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { userFacingError } from '@bhairava/api-client';
import {
  MPIN_UX,
  canSubmitMpinSetup,
  sanitizeMpinInput,
  validateMpinDigitsInput,
  validateMpinSetupPair,
} from '@bhairava/domain';
import { Btn, BrandWordmark, Field, GoogleSignInButton, Panel, TextInput } from '@bhairava/ui-web';
import { acceptSession, api } from '../api';
import { LOGO_SRC } from '../basePath';

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID_CUSTOMER
  || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID
  || '';
/** Dev bypass ONLY when explicitly enabled AND not a production build. Never because client ID is missing. */
const DEV_BYPASS =
  String((import.meta as any).env?.VITE_GOOGLE_AUTH_DEV_BYPASS || '') === 'true'
  && (import.meta as any).env?.PROD !== true
  && (import.meta as any).env?.MODE !== 'production';

function nextPath(
  user: { needsProfile?: boolean; profileComplete?: boolean; needsMpin?: boolean; mpinSet?: boolean },
  inviteToken?: string,
) {
  const needsProfile = Boolean(user.needsProfile ?? user.profileComplete === false);
  if (needsProfile) return `/onboarding${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ''}`;
  if (user.needsMpin || (user.profileComplete && user.mpinSet === false)) return '/mpin';
  return '/';
}

type LoginMode = 'mpin' | 'google' | 'forgot';

export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') || undefined;
  const [mode, setMode] = useState<LoginMode>(() => {
    if (inviteToken) return 'google';
    if (params.get('forgot') === '1') return 'forgot';
    return 'mpin';
  });
  const [identifier, setIdentifier] = useState('');
  const [mpin, setMpin] = useState('');
  const [err, setErr] = useState('');
  const [inviteMeta, setInviteMeta] = useState<{ valid: boolean; agentName?: string; reason?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const googleConfigured = Boolean(GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    api.invites
      .peek(inviteToken)
      .then((meta) => {
        if (!cancelled) setInviteMeta(meta);
      })
      .catch(() => {
        if (!cancelled) setInviteMeta({ valid: false, reason: 'invalid' });
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const onCredential = useCallback(
    async (idToken: string) => {
      setErr('');
      setSubmitting(true);
      try {
        if (mode === 'forgot') {
          sessionStorage.setItem('bhairava.mpin.reset.idToken', idToken);
          nav('/mpin?reset=1');
          return;
        }
        const s = await api.auth.googleCustomer(idToken, inviteToken);
        await acceptSession(s);
        nav(nextPath(s.user as any, inviteToken));
      } catch (ex: any) {
        setErr(userFacingError(ex, { context: 'auth', fallback: 'Google sign-in failed' }));
      } finally {
        setSubmitting(false);
      }
    },
    [inviteToken, mode, nav],
  );

  async function onMpinLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      const s = await api.auth.mpinLogin({
        identifier: identifier.trim(),
        mpin,
        role: 'CUSTOMER',
      });
      await acceptSession(s);
      nav(nextPath(s.user as any));
    } catch (ex: any) {
      setErr(userFacingError(ex, { context: 'mpin_login', fallback: 'Sign-in failed' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary-luminous)_18%,transparent),transparent)]"
      />

      <div className="rise relative w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Customer portal" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          {inviteMeta?.valid ? (
            <p className="mb-4 rounded-xl bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
              Invited by <span className="font-medium">{inviteMeta.agentName}</span>. Complete Google sign-in to connect.
            </p>
          ) : null}
          {inviteMeta && !inviteMeta.valid ? (
            <p className="mb-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              This invite is {inviteMeta.reason || 'unavailable'}. You can still continue with Google as a Direct customer.
            </p>
          ) : null}

          {mode === 'mpin' ? (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Enter MPIN</h1>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                Quick unlock with your 4-digit MPIN. Google remains your account recovery.
              </p>
              <form onSubmit={onMpinLogin} className="mt-6 space-y-4" data-testid="customer-mpin-login">
                <Field label="Email or mobile">
                  <TextInput
                    value={identifier}
                    onChange={setIdentifier}
                    required
                    autoComplete="username"
                    placeholder="Google email or mobile"
                    data-testid="customer-mpin-identifier"
                  />
                </Field>
                <Field label="MPIN" required>
                  <TextInput
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mpin}
                    onChange={(v) => setMpin(v.replace(/\D/g, '').slice(0, 4))}
                    required
                    maxLength={4}
                    placeholder="••••"
                    data-testid="customer-mpin-digits"
                  />
                </Field>
                {err ? (
                  <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {err}
                  </p>
                ) : null}
                <Btn type="submit" variant="primary" className="h-11 w-full" disabled={submitting || mpin.length !== 4}>
                  {submitting ? 'Signing in…' : 'Continue'}
                </Btn>
              </form>
              <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => { setMode('forgot'); setErr(''); }}>
                  Forgot MPIN?
                </button>
                <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setMode('google'); setErr(''); }}>
                  Continue with Google
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                {mode === 'forgot' ? 'Reset MPIN with Google' : 'Continue with Google'}
              </h1>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                {mode === 'forgot'
                  ? 'Verify your Google account, then set a new 4-digit MPIN.'
                  : 'Sign in or create your Bhairava customer account with Google. Email stays locked to your Google account.'}
              </p>
              <div className="space-y-5 pt-6">
                {googleConfigured || DEV_BYPASS ? (
                  <GoogleSignInButton
                    clientId={GOOGLE_CLIENT_ID || undefined}
                    onCredential={onCredential}
                    disabled={submitting}
                    allowDevBypass={DEV_BYPASS}
                    requireClientIdInProduction
                    unavailableMessage="Google sign-in is temporarily unavailable. Please contact Bhairava."
                    label="Continue with Google"
                  />
                ) : (
                  <p role="status" className="rounded-xl bg-muted/60 px-3.5 py-3 text-sm" data-testid="google-unavailable">
                    Google sign-in is temporarily unavailable. Please contact Bhairava.
                  </p>
                )}
                {err ? (
                  <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {err}
                  </p>
                ) : null}
              </div>
              {!inviteToken ? (
                <button type="button" className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setMode('mpin'); setErr(''); }}>
                  Back to MPIN
                </button>
              ) : null}
            </>
          )}
        </Panel>
        <p className="pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Returning customers use MPIN. New accounts complete profile, then create an MPIN.
        </p>
      </div>
    </div>
  );
}

export function CustomerOnboardingPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') || undefined;
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.auth.restoreSession();
        const r = await api.auth.me();
        if (cancelled) return;
        setEmail(r.user.email || '');
        setName(r.user.displayName || '');
        if ((r.user as any).profileComplete || (r.user as any).profileComplete === true) {
          nav((r.user as any).needsMpin ? '/mpin' : '/', { replace: true });
        }
      } catch {
        if (!cancelled) nav('/login', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!mobile.trim()) {
      setErr('Mobile number is required');
      return;
    }
    setBusy(true);
    try {
      await api.auth.completeCustomerProfile({
        name,
        mobile: mobile.trim(),
        city: city || undefined,
        referralCode: referralCode || undefined,
        termsAccepted: terms,
        inviteToken,
      });
      nav('/mpin');
    } catch (ex: any) {
      setErr(userFacingError(ex, { fallback: 'Could not save profile' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Complete profile" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Your details</h1>
          <p className="pt-2 text-sm text-muted-foreground">
            Mobile is required. Email comes from Google and cannot be changed. Next you create a 4-digit MPIN.
          </p>
          <form className="space-y-4 pt-6" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="text-muted-foreground">Google email</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3"
                value={email}
                readOnly
                disabled
                data-testid="customer-profile-email"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Full name</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="customer-profile-name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Mobile number</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                inputMode="tel"
                placeholder="10-digit mobile"
                data-testid="customer-profile-mobile"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">City (optional)</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Referral code (optional)</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
              <span>I accept the Bhairava terms of use and privacy notice.</span>
            </label>
            {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
            <Btn type="submit" variant="primary" className="h-11 w-full" disabled={busy || !terms} data-testid="customer-profile-submit">
              {busy ? 'Saving…' : 'Continue'}
            </Btn>
          </form>
          <p className="pt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="underline-offset-2 hover:underline">Back to sign-in</Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}

export function CustomerMpinPage() {
  const nav = useNavigate();
  const reset = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reset') === '1';
  const [mpin, setMpin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mpinErr, setMpinErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const liveMismatch =
    mpin.length === 4 && confirm.length === 4 && mpin !== confirm ? MPIN_UX.mismatch : '';
  const confirmFieldError = confirmErr || liveMismatch;
  const canSubmit = canSubmitMpinSetup(mpin, confirm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (reset) {
        const tok = sessionStorage.getItem('bhairava.mpin.reset.idToken');
        if (!tok) {
          nav('/login', { replace: true });
          return;
        }
        if (!cancelled) setReady(true);
        return;
      }
      try {
        await api.auth.restoreSession();
        const r = await api.auth.me();
        if (cancelled) return;
        if ((r.user as any).needsProfile) {
          nav('/onboarding', { replace: true });
          return;
        }
        if (!(r.user as any).needsMpin && (r.user as any).mpinSet) {
          nav('/', { replace: true });
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) nav('/login', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav, reset]);

  function onMpinChange(raw: string) {
    setErr('');
    setConfirmErr('');
    const digitsCheck = validateMpinDigitsInput(raw);
    if (!digitsCheck.ok && /[^\d]/.test(raw)) {
      setMpinErr(MPIN_UX.digitsOnly);
    } else {
      setMpinErr('');
    }
    setMpin(sanitizeMpinInput(raw));
  }

  function onConfirmChange(raw: string) {
    setErr('');
    setMpinErr('');
    const digitsCheck = validateMpinDigitsInput(raw);
    if (!digitsCheck.ok && /[^\d]/.test(raw)) {
      setConfirmErr(MPIN_UX.digitsOnly);
    } else {
      setConfirmErr('');
    }
    setConfirm(sanitizeMpinInput(raw));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMpinErr('');
    setConfirmErr('');
    const pair = validateMpinSetupPair(mpin, confirm);
    if (!pair.ok) {
      if (pair.field === 'mpin') setMpinErr(pair.message);
      else setConfirmErr(pair.message);
      return;
    }
    setBusy(true);
    try {
      if (reset) {
        const idToken = sessionStorage.getItem('bhairava.mpin.reset.idToken') || '';
        const s = await api.auth.mpinReset({ idToken, mpin, confirmMpin: confirm, role: 'CUSTOMER' });
        sessionStorage.removeItem('bhairava.mpin.reset.idToken');
        await acceptSession(s);
      } else {
        await api.auth.mpinSetup({ mpin, confirmMpin: confirm });
      }
      nav('/');
    } catch (ex: unknown) {
      const mapped = userFacingError(ex, { context: 'mpin_save' });
      if (mapped === MPIN_UX.mismatchRetry || mapped.includes('MPINs do not match')) {
        setConfirmErr(MPIN_UX.mismatch);
      } else {
        setErr(mapped);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Preparing MPIN…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Customer MPIN" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">
            {reset ? 'Set new MPIN' : 'Create your MPIN'}
          </h1>
          <p className="pt-2 text-sm text-muted-foreground">
            Choose exactly 4 digits for quick unlock. Google recovers your account if you forget.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit} data-testid="customer-mpin-setup">
            <Field label="MPIN" required error={mpinErr || undefined}>
              <TextInput
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                value={mpin}
                onChange={onMpinChange}
                required
                maxLength={4}
                placeholder="••••"
                invalid={Boolean(mpinErr)}
                data-testid="customer-mpin-create"
              />
            </Field>
            <Field label="Confirm MPIN" required error={confirmFieldError || undefined}>
              <TextInput
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                value={confirm}
                onChange={onConfirmChange}
                required
                maxLength={4}
                placeholder="••••"
                invalid={Boolean(confirmFieldError)}
                data-testid="customer-mpin-confirm"
              />
            </Field>
            {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
            <Btn
              type="submit"
              variant="primary"
              className="h-11 w-full"
              disabled={busy || !canSubmit}
              data-testid="customer-mpin-submit"
            >
              {busy ? 'Saving…' : 'Go Active'}
            </Btn>
          </form>
        </Panel>
      </div>
    </div>
  );
}
