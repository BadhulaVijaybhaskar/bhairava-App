import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { BrandLogo, Btn, Field, Panel, TextInput } from '@bhairava/ui-web';
import { api, tokens } from '../api';
import { Notice } from '../components/common';
import { LOGO_SRC } from '../basePath';
import { errMsg } from '../lib/data';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      const session = await api.auth.login(email, password);
      await tokens.setTokens(session.accessToken, session.refreshToken ?? null);
      nav('/');
    } catch (ex) {
      setErr(errMsg(ex) || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--secondary)_22%,transparent),transparent)]"
      />
      <div aria-hidden className="hairline-gold pointer-events-none absolute bottom-0 left-1/2 h-px w-[420px] -translate-x-1/2" />

      <div className="rise relative w-full max-w-sm">
        <div className="flex flex-col items-center pb-8 text-center">
          <BrandLogo size={64} className="rounded-2xl" logoSrc={LOGO_SRC} />
          <h1 className="pt-6 font-display text-2xl font-semibold">Sign in to Bhairava</h1>
          <p className="pt-2 text-sm text-muted-foreground">Admin · Land Sales OS</p>
        </div>

        <Panel className="space-y-4">
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setErr('');
                }}
                placeholder="you@company.com"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                data-testid="admin-email"
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setErr('');
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                data-testid="admin-password"
              />
            </Field>
            <Notice tone="err">{err}</Notice>
            <Btn
              type="submit"
              variant="primary"
              className="h-11 w-full"
              disabled={submitting}
              aria-busy={submitting || undefined}
              data-testid="admin-login"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Btn>
          </form>
        </Panel>

        <p className="flex items-center justify-center gap-1.5 pt-5 text-center text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
          Use your organization credentials. Sessions end when this tab closes.
        </p>
      </div>
    </div>
  );
}
