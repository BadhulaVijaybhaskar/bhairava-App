import bcrypt from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

const ACCESS_SECRET = () => new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const REFRESH_SECRET = () => new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export type AccessTokenPayload = {
  sub: string;
  orgId: string;
  roles: string[];
  email?: string | null;
  mobile?: string | null;
  name: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRawToken(bytes = 48): string {
  return randomBytes(bytes).toString("hex");
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const ttl = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(ACCESS_SECRET());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET());
  return payload as unknown as AccessTokenPayload;
}

export async function signRefreshToken(userId: string, tokenId: string): Promise<string> {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  return new SignJWT({ sub: userId, jti: tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(REFRESH_SECRET());
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; jti: string }> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET());
  return { sub: String(payload.sub), jti: String(payload.jti) };
}

export function refreshExpiryDate(): Date {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function maskPan(last4?: string | null): string {
  if (!last4) return "—";
  return `XXXXXX${last4}`;
}

export function maskAadhaar(last4?: string | null): string {
  if (!last4) return "—";
  return `XXXXXXXX${last4}`;
}

function piiKey() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.ENCRYPTION_KEY || "bhairava-dev-pii-key";
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM: returns `iv:tag:ciphertext` hex payload */
export function encryptPii(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", piiKey(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPii(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid PII payload");
  const decipher = createDecipheriv("aes-256-gcm", piiKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function normalizePan(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function normalizeAadhaar(raw: string): string {
  return raw.replace(/\s+/g, "");
}
