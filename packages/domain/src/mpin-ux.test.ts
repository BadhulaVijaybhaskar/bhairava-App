import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MPIN_UX,
  canSubmitMpinSetup,
  sanitizeMpinInput,
  validateMpinDigitsInput,
  validateMpinSetupPair,
} from './mpin-ux.js';

describe('MPIN UX client validation', () => {
  it('1234/1234 submit allowed', () => {
    assert.equal(canSubmitMpinSetup('1234', '1234'), true);
    assert.equal(validateMpinSetupPair('1234', '1234').ok, true);
  });

  it('1234/5678 MPINs do not match', () => {
    assert.equal(canSubmitMpinSetup('1234', '5678'), false);
    const pair = validateMpinSetupPair('1234', '5678');
    assert.equal(pair.ok, false);
    if (!pair.ok) {
      assert.equal(pair.field, 'confirm');
      assert.equal(pair.message, MPIN_UX.mismatch);
      assert.match(pair.message, /MPINs do not match/);
    }
  });

  it('123/123 Enter a 4-digit MPIN', () => {
    const pair = validateMpinSetupPair('123', '123');
    assert.equal(pair.ok, false);
    if (!pair.ok) assert.equal(pair.message, 'Enter a 4-digit MPIN.');
    assert.equal(canSubmitMpinSetup('123', '123'), false);
  });

  it('ab12 digits only', () => {
    const field = validateMpinDigitsInput('ab12');
    assert.equal(field.ok, false);
    if (!field.ok) assert.equal(field.message, 'MPIN can contain numbers only.');
    assert.equal(sanitizeMpinInput('ab12'), '12');
  });
});
