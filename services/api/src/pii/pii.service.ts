import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { maskAadhaar, maskPan, maskPhone, maskEmail } from '@bhairava/domain';

@Injectable()
export class PiiService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.get<string>('PII_ENCRYPTION_KEY') || '';
    this.key = hex.length >= 64
      ? Buffer.from(hex.slice(0, 64), 'hex')
      : createHash('sha256').update(hex || 'dev-only-pii-key').digest();
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64url');
  }

  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;
    const buf = Buffer.from(ciphertext, 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  masks = { maskAadhaar, maskPan, maskPhone, maskEmail };
}
