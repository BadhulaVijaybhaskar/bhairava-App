import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { userFacingError } from '@bhairava/api-client';
import {
  MPIN_UX,
  canSubmitMpinSetup,
  sanitizeMpinInput,
  validateMpinSetupPair,
} from '@bhairava/domain';
import { Btn, BrandWordmark, Field, GoogleSignInButton, Panel, TextInput } from '@bhairava/ui-web';
import { acceptSession, api } from '../api';
import { LOGO_SRC } from '../basePath';
import { Notice } from '../components/RecordList';
import { errorMessage } from '../lib/format';

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID_AGENT
  || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID
  || '';
/** Dev bypass ONLY when explicitly enabled AND not a production build. Never because client ID is missing. */
const DEV_BYPASS =
  String((import.meta as any).env?.VITE_GOOGLE_AUTH_DEV_BYPASS || '') === 'true'
  && (import.meta as any).env?.PROD !== true
  && (import.meta as any).env?.MODE !== 'production';

function nextPath(user: { needsProfile?: boolean; profileComplete?: boolean; needsMpin?: boolean; mpinSet?: boolean }) {
  const needsProfile = Boolean(user.needsProfile ?? user.profileComplete === false);
  if (needsProfile) return '/onboarding';
  if (user.needsMpin || (user.profileComplete && user.mpinSet === false)) return '/mpin';
  return '/';
}

type LoginMode = 'mpin' | 'google' | 'forgot';

export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(() => (params.get('forgot') === '1' ? 'forgot' : 'mpin'));
  const [identifier, setIdentifier] = useState('');
  const [mpin, setMpin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const googleConfigured = Boolean(GOOGLE_CLIENT_ID);

  const onCredential = useCallback(
    async (idToken: string) => {
      setErr('');
      setBusy(true);
      try {
        if (mode === 'forgot') {
          // Hold Google token briefly in sessionStorage for reset confirm step (not MPIN).
          sessionStorage.setItem('bhairava.mpin.reset.idToken', idToken);
          nav('/mpin?reset=1');
          return;
        }
        const s = await api.auth.googleAgent(idToken);
        await acceptSession(s);
        nav(nextPath(s.user as any));
      } catch (ex) {
        setErr(userFacingError(ex, { context: 'agent_auth' }));
      } finally {
        setBusy(false);
      }
    },
    [mode, nav],
  );

  async function onMpinLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const s = await api.auth.mpinLogin({
        identifier: identifier.trim(),
        mpin,
        role: 'AGENT',
      });
      await acceptSession(s);
      nav(nextPath(s.user as any));
    } catch (ex) {
      setErr(userFacingError(ex, { context: 'mpin_login' }));
    } finally {
      setBusy(false);
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
          <BrandWordmark size={52} title="Bhairava" subtitle="Agent portal" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          {mode === 'mpin' ? (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Enter MPIN</h1>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                Quick unlock with your 4-digit MPIN. Google remains your account recovery.
              </p>
              <form onSubmit={onMpinLogin} className="mt-6 space-y-4" data-testid="agent-mpin-login">
                <Field label="Email or mobile">
                  <TextInput
                    value={identifier}
                    onChange={setIdentifier}
                    required
                    autoComplete="username"
                    placeholder="Google email or mobile"
                    data-testid="agent-mpin-identifier"
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
                    data-testid="agent-mpin-digits"
                  />
                </Field>
                {err ? <Notice tone="error">{err}</Notice> : null}
                <Btn type="submit" variant="primary" className="h-11 w-full" disabled={busy || mpin.length !== 4}>
                  {busy ? 'Signing in…' : 'Continue'}
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
              <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
                {mode === 'forgot' ? 'Reset MPIN with Google' : 'Continue with Google'}
              </h1>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                {mode === 'forgot'
                  ? 'Verify your Google account, then set a new 4-digit MPIN.'
                  : 'Open signup — no Admin approval. Complete profile and MPIN to go Active.'}
              </p>
              <div className="mt-6 space-y-4">
                {googleConfigured || DEV_BYPASS ? (
                  <GoogleSignInButton
                    clientId={GOOGLE_CLIENT_ID || undefined}
                    onCredential={onCredential}
                    disabled={busy}
                    allowDevBypass={DEV_BYPASS}
                    requireClientIdInProduction
                    unavailableMessage="Google sign-in is temporarily unavailable. Please contact Bhairava."
                    devEmail="new.agent@example.com"
                    devName="New Agent"
                    label="Continue with Google"
                  />
                ) : (
                  <p role="status" className="rounded-xl bg-muted/60 px-3.5 py-3 text-sm" data-testid="google-unavailable">
                    Google sign-in is temporarily unavailable. Please contact Bhairava.
                  </p>
                )}
                {err ? <Notice tone="error">{err}</Notice> : null}
              </div>
              <button type="button" className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setMode('mpin'); setErr(''); }}>
                Back to MPIN
              </button>
            </>
          )}
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Google remains your account recovery. Use Change MPIN from Profile anytime.
          </p>
        </Panel>
      </div>
    </div>
  );
}

export function AgentOnboardingPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
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
        if ((r.user as any).profileComplete) {
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    if (!phone.trim()) {
      setErr('Mobile number is required');
      setBusy(false);
      return;
    }
    if (!region.trim()) {
      setErr('City / region is required');
      setBusy(false);
      return;
    }
    try {
      await api.auth.completeAgentProfile({
        name,
        phone: phone.trim(),
        region: region.trim(),
        termsAccepted: terms,
      });
      nav('/mpin');
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div className="rise relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size={52} title="Bhairava" subtitle="Agent profile" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Complete your profile</h1>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            Full name, Google email, mobile, and city/region are required. No OTP. Next you create a 4-digit MPIN.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Full name" required>
              <TextInput value={name} onChange={setName} required autoComplete="name" data-testid="agent-profile-name" />
            </Field>
            <Field label="Google email">
              <TextInput value={email} onChange={() => {}} disabled data-testid="agent-profile-email" />
            </Field>
            <Field label="Mobile number" required>
              <TextInput
                type="tel"
                value={phone}
                onChange={setPhone}
                required
                inputMode="tel"
                placeholder="10-digit mobile"
                data-testid="agent-profile-mobile"
              />
            </Field>
            <Field label="City / region" required>
              <TextInput
                value={region}
                onChange={setRegion}
                required
                placeholder="City or region"
                data-testid="agent-profile-region"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
                data-testid="agent-profile-terms"
              />
              <span>I accept the Bhairava agent terms.</span>
            </label>
            {err ? <Notice tone="error">{err}</Notice> : null}
            <Btn type="submit" variant="primary" className="h-11 w-full" disabled={busy || !terms} data-testid="agent-profile-submit">
              {busy ? 'Saving…' : 'Continue'}
            </Btn>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="hover:underline">Back</Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}

/** Create or reset 4-digit MPIN (forced before Home for first-time users). */
export function AgentMpinPage() {
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
    if (/[^\d]/.test(raw)) setMpinErr(MPIN_UX.digitsOnly);
    else setMpinErr('');
    setMpin(sanitizeMpinInput(raw));
  }

  function onConfirmChange(raw: string) {
    setErr('');
    setMpinErr('');
    if (/[^\d]/.test(raw)) setConfirmErr(MPIN_UX.digitsOnly);
    else setConfirmErr('');
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
        const s = await api.auth.mpinReset({ idToken, mpin, confirmMpin: confirm, role: 'AGENT' });
        sessionStorage.removeItem('bhairava.mpin.reset.idToken');
        await acceptSession(s);
      } else {
        await api.auth.mpinSetup({ mpin, confirmMpin: confirm });
      }
      nav('/');
    } catch (ex) {
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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div className="rise relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size={52} title="Bhairava" subtitle="Agent MPIN" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
            {reset ? 'Set new MPIN' : 'Create your MPIN'}
          </h1>
          <p className="pt-2 text-sm text-muted-foreground">
            Choose exactly 4 digits. Used for quick unlock — Google recovers your account.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="agent-mpin-setup">
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
                data-testid="agent-mpin-create"
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
                data-testid="agent-mpin-confirm"
              />
            </Field>
            {err ? <Notice tone="error">{err}</Notice> : null}
            <Btn
              type="submit"
              variant="primary"
              className="h-11 w-full"
              disabled={busy || !canSubmit}
              data-testid="agent-mpin-submit"
            >
              {busy ? 'Saving…' : 'Go Active'}
            </Btn>
          </form>
        </Panel>
      </div>
    </div>
  );
}
