import { structuredLog, createRequestId } from './logger';

describe('structured logger', () => {
  it('creates request ids', () => {
    expect(createRequestId()).toMatch(/[0-9a-f-]{36}/i);
  });

  it('never logs raw password/token in JSON line', () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (msg: string) => { lines.push(String(msg)); };
    try {
      structuredLog('info', 'test', { password: 'secret', token: 'abc', pan: 'ABCDE1234F', aadhaar: '123456789012', safe: 1 });
    } finally {
      console.log = orig;
    }
    expect(lines[0]).toContain('[REDACTED]');
    expect(lines[0]).not.toContain('secret');
    expect(lines[0]).not.toContain('"abc"');
    expect(lines[0]).toContain('"safe":1');
  });
});
