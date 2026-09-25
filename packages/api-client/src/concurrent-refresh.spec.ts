/**
 * Concurrent token refresh serialization.
 * Several simultaneous 401s must share ONE in-flight refresh; eligible retries succeed;
 * failure clears session once (no false reuse storm).
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, createMemoryTokenStore } from './index';

describe('api-client concurrent refresh', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('several simultaneous 401s → exactly one refresh → all eligible retries succeed', async () => {
    const tokens = createMemoryTokenStore();
    await tokens.setTokens('expired-access', 'refresh-v1');

    let refreshCalls = 0;
    let unauthorizedCalls = 0;
    let resourceHits = 0;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 30));
        assert.equal(JSON.parse(String(init?.body || '{}')).refreshToken, 'refresh-v1');
        return new Response(
          JSON.stringify({
            accessToken: 'access-v2',
            refreshToken: 'refresh-v2',
            user: { id: 'u1' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      const auth = (init?.headers as Record<string, string>)?.Authorization || '';
      if (auth === 'Bearer expired-access') {
        return new Response(JSON.stringify({ error: 'expired' }), { status: 401 });
      }
      if (auth === 'Bearer access-v2') {
        resourceHits += 1;
        return new Response(JSON.stringify({ ok: true, url }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('unexpected', { status: 500 });
    }) as typeof fetch;

    const api = createApiClient({
      baseUrl: 'http://test.local',
      tokens,
      onUnauthorized: () => {
        unauthorizedCalls += 1;
      },
    });

    const results = await Promise.all([
      api.customers.list(),
      api.bookings.list(),
      api.payments.list(),
      api.documents.list(),
      api.leads.list(),
    ]);

    assert.equal(refreshCalls, 1);
    assert.equal(resourceHits, 5);
    assert.equal(results.length, 5);
    assert.equal(unauthorizedCalls, 0);
    assert.equal(await tokens.getAccessToken(), 'access-v2');
    assert.equal(await tokens.getRefreshToken(), 'refresh-v2');
  });

  it('refresh failure clears session once and redirects once (no false reuse detection)', async () => {
    const tokens = createMemoryTokenStore();
    await tokens.setTokens('expired-access', 'refresh-v1');

    let refreshCalls = 0;
    let unauthorizedCalls = 0;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(JSON.stringify({ error: 'reuse' }), { status: 401 });
      }
      return new Response(JSON.stringify({ error: 'expired' }), { status: 401 });
    }) as typeof fetch;

    const api = createApiClient({
      baseUrl: 'http://test.local',
      tokens,
      onUnauthorized: () => {
        unauthorizedCalls += 1;
      },
    });

    const outcomes = await Promise.allSettled([
      api.customers.list(),
      api.bookings.list(),
      api.payments.list(),
    ]);

    assert.equal(refreshCalls, 1);
    assert.equal(unauthorizedCalls, 1);
    assert.ok(outcomes.every((o) => o.status === 'rejected'));
    assert.equal(await tokens.getAccessToken(), null);
    assert.equal(await tokens.getRefreshToken(), null);
  });

  it('restoreSession uses cookie refresh without requiring in-memory refresh token', async () => {
    const tokens = createMemoryTokenStore();
    await tokens.clear();

    let refreshCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1;
        assert.deepEqual(JSON.parse(String(init?.body || '{}')), {});
        assert.equal(init?.credentials, 'include');
        return new Response(
          JSON.stringify({ accessToken: 'restored', refreshToken: 'should-not-need-localstorage' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('nope', { status: 500 });
    }) as typeof fetch;

    const api = createApiClient({ baseUrl: 'http://test.local', tokens });
    const access = await api.auth.restoreSession();
    assert.equal(refreshCalls, 1);
    assert.equal(access, 'restored');
    assert.equal(await tokens.getAccessToken(), 'restored');
  });
});
