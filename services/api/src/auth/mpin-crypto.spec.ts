import { hashPassword, verifyPassword } from './crypto.util';

describe('MPIN hashing uses Argon2id via hashPassword', () => {
  it('never stores plaintext and verifies correctly', async () => {
    const mpin = '4821';
    const hash = await hashPassword(mpin);
    expect(hash).not.toContain(mpin);
    expect(hash.startsWith('$argon2')).toBe(true);
    expect(await verifyPassword(hash, mpin)).toBe(true);
    expect(await verifyPassword(hash, '0000')).toBe(false);
  });
});
