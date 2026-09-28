import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  USER_ERROR_COPY,
  assertSafeUserMessage,
  categorizeFromStatusAndMessage,
  createApiErrorFromResponse,
  isUnsafeUserMessage,
  userFacingError,
  userMessageForCategory,
} from './errors';

const LEAK_RES = /statusCode|requestId|timestamp|\/api\/|Bad Request|Internal Server Error|Forbidden|\b403\b|POST\s+\/|→\s*\d{3}/i;

function assertNoLeak(text: string) {
  assert.equal(isUnsafeUserMessage(text), false, `unsafe user message: ${text}`);
  assert.doesNotMatch(text, LEAK_RES);
}

describe('api error mapper', () => {
  it('maps pin not matched / confirmation mismatch to MPIN_MISMATCH', () => {
    const a = createApiErrorFromResponse({
      method: 'POST',
      path: '/api/auth/mpin/reset',
      status: 400,
      bodyText: JSON.stringify({
        statusCode: 400,
        message: 'pin not matched',
        error: 'Bad Request',
        requestId: 'req_1',
        timestamp: '2026-09-28T00:00:00.000Z',
        path: '/api/auth/mpin/reset',
      }),
    });
    assert.equal(a.category, 'MPIN_MISMATCH');
    assert.equal(a.message, USER_ERROR_COPY.MPIN_MISMATCH);
    assertNoLeak(a.message);
    assert.equal(a.diagnostics.requestId, 'req_1');
    assert.ok(a.diagnostics.bodyText?.includes('statusCode'));

    const b = createApiErrorFromResponse({
      method: 'POST',
      path: '/api/auth/mpin/setup',
      status: 400,
      bodyText: JSON.stringify({
        statusCode: 400,
        message: 'MPIN confirmation does not match.',
        error: 'Bad Request',
      }),
    });
    assert.equal(b.category, 'MPIN_MISMATCH');
    assert.equal(userFacingError(b, { context: 'mpin_save' }), 'MPINs do not match. Please try again.');
  });

  it('maps incorrect / locked MPIN and unauthorized', () => {
    assert.equal(categorizeFromStatusAndMessage(401, 'Incorrect MPIN'), 'MPIN_INVALID');
    assert.equal(userMessageForCategory('MPIN_INVALID'), 'Incorrect MPIN. Please try again.');

    assert.equal(categorizeFromStatusAndMessage(403, 'Too many attempts. Try again later.'), 'MPIN_LOCKED');
    assert.equal(
      userMessageForCategory('MPIN_LOCKED'),
      'Too many incorrect attempts. Please try again later or reset your MPIN.',
    );

    assert.equal(categorizeFromStatusAndMessage(401, 'Unauthorized'), 'SESSION_EXPIRED');
    assert.equal(userMessageForCategory('SESSION_EXPIRED'), 'Your session has expired. Please sign in again.');
  });

  it('maps Agent portal 403 role mismatch to friendly Agent copy (never Sign-in failed)', () => {
    const err = createApiErrorFromResponse({
      method: 'POST',
      path: '/api/auth/google/agent',
      status: 403,
      bodyText: JSON.stringify({
        statusCode: 403,
        message: 'This Google account is not an agent login.',
        error: 'Forbidden',
        requestId: 'req_role',
        timestamp: '2026-09-28T00:00:00.000Z',
        path: '/api/auth/google/agent',
      }),
    });
    assert.equal(err.category, 'ROLE_MISMATCH');
    assert.notEqual(err.message, USER_ERROR_COPY.AUTH_ERROR);
    assert.doesNotMatch(err.message, /Sign-in failed/i);
    assertNoLeak(err.message);

    const friendly = userFacingError(err, { context: 'agent_auth' });
    assert.equal(friendly, USER_ERROR_COPY.AGENT_ROLE_MISMATCH);
    assert.equal(friendly, 'This Google account is not registered as an Agent.');
    assertNoLeak(friendly);
  });

  it('maps suspended Agent 403 to friendly Agent unavailable copy', () => {
    const err = createApiErrorFromResponse({
      method: 'POST',
      path: '/api/auth/google/agent',
      status: 403,
      bodyText: JSON.stringify({
        statusCode: 403,
        message: 'Account suspended',
        error: 'Forbidden',
        requestId: 'req_susp',
        timestamp: '2026-09-28T00:00:00.000Z',
        path: '/api/auth/google/agent',
      }),
    });
    assert.equal(err.category, 'ACCOUNT_UNAVAILABLE');
    assert.doesNotMatch(err.message, /Sign-in failed/i);
    assertNoLeak(err.message);

    const friendly = userFacingError(err, { context: 'agent_auth' });
    assert.equal(friendly, USER_ERROR_COPY.AGENT_ACCOUNT_UNAVAILABLE);
    assert.equal(friendly, 'Your Agent account is currently unavailable. Please contact Bhairava.');
    assertNoLeak(friendly);
  });

  it('maps generic Agent 403 and session expired without transport leaks', () => {
    const denied = createApiErrorFromResponse({
      method: 'POST',
      path: '/api/auth/google/agent',
      status: 403,
      bodyText: JSON.stringify({
        statusCode: 403,
        message: 'Forbidden',
        error: 'Forbidden',
        requestId: 'req_den',
        path: '/api/auth/google/agent',
      }),
    });
    assert.equal(denied.category, 'ACCESS_DENIED');
    const deniedCopy = userFacingError(denied, { context: 'agent_auth' });
    assert.equal(deniedCopy, USER_ERROR_COPY.AGENT_ACCESS_DENIED);
    assertNoLeak(deniedCopy);
    assert.doesNotMatch(deniedCopy, /403|Forbidden|requestId|\/api\//i);

    const expired = createApiErrorFromResponse({
      method: 'GET',
      path: '/api/auth/me',
      status: 401,
      bodyText: JSON.stringify({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
        requestId: 'req_401',
        path: '/api/auth/me',
      }),
    });
    assert.equal(expired.category, 'SESSION_EXPIRED');
    assert.equal(
      userFacingError(expired, { context: 'agent_auth' }),
      'Your session has expired. Please sign in again.',
    );

    const dump =
      'POST /api/auth/google/agent → 403 {"statusCode":403,"message":"This Google account is not an agent login.","error":"Forbidden","requestId":"abc","timestamp":"t","path":"/api/auth/google/agent"}';
    const fromDump = userFacingError(new Error(dump), { context: 'agent_auth' });
    assert.equal(fromDump, 'This Google account is not registered as an Agent.');
    assertNoLeak(fromDump);
    assert.doesNotMatch(fromDump, /403|Forbidden|statusCode|requestId|\/api\/|Sign-in failed/i);
  });

  it('maps 500 to SERVER_ERROR', () => {
    const err = createApiErrorFromResponse({
      method: 'GET',
      path: '/api/bookings',
      status: 500,
      bodyText: JSON.stringify({
        statusCode: 500,
        message: 'Internal Server Error',
        error: 'Internal Server Error',
        requestId: 'x',
        timestamp: 't',
        path: '/api/bookings',
      }),
    });
    assert.equal(err.category, 'SERVER_ERROR');
    assert.equal(err.message, 'Something went wrong. Please try again.');
    assertNoLeak(err.message);
  });

  it('legacy transport dump string never leaks via userFacingError', () => {
    const dump =
      'POST /api/auth/mpin/reset → 400 {"statusCode":400,"message":"pin not matched","error":"Bad Request","requestId":"abc","timestamp":"2026-09-28T00:00:00.000Z","path":"/api/auth/mpin/reset"}';
    const friendly = userFacingError(new Error(dump), { context: 'mpin_save' });
    assert.equal(friendly, 'MPINs do not match. Please try again.');
    assertNoLeak(friendly);

    const unexpected =
      'POST /api/auth/mpin/reset → 500 {"statusCode":500,"message":"Internal Server Error","path":"/api/auth/mpin/reset","requestId":"r","timestamp":"t"}';
    const fallback = userFacingError(new Error(unexpected), { context: 'mpin_save' });
    assert.equal(fallback, USER_ERROR_COPY.MPIN_SAVE_FAILED);
    assertNoLeak(fallback);
  });

  it('assertSafeUserMessage rejects dumps', () => {
    assert.equal(
      assertSafeUserMessage('POST /api/x → 400 {"statusCode":400}', 'SERVER_ERROR'),
      USER_ERROR_COPY.SERVER_ERROR,
    );
    assert.ok(isUnsafeUserMessage('{"statusCode":400,"message":"x"}'));
    assert.equal(isUnsafeUserMessage('MPINs do not match. Please try again.'), false);
  });

  it('ApiError.message is always safe even if caller reads .message', () => {
    const err = new ApiError('SERVER_ERROR', 'POST /api/auth/mpin/reset → 400 {statusCode:400}', {
      status: 400,
      path: '/api/auth/mpin/reset',
    });
    assertNoLeak(err.message);
    assert.equal(err.message, USER_ERROR_COPY.SERVER_ERROR);
  });
});
