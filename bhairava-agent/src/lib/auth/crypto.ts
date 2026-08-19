import bcrypt from "bcryptjs";
import { createHash } from "crypto";
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

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(payload: AccessTokenPayload) {
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

export async function signRefreshToken(userId: string, tokenId: string) {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  return new SignJWT({ sub: userId, jti: tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(REFRESH_SECRET());
}

export function refreshExpiryDate() {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
