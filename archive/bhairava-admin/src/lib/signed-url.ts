import { createHmac, timingSafeEqual } from "crypto";
import path from "path";

const TTL_SECONDS = 60 * 60; // 1 hour

function secret() {
  return process.env.SIGNED_URL_SECRET || process.env.JWT_ACCESS_SECRET || "dev-signed-url";
}

/** Create a time-limited token for a publicPath under /uploads/... */
export function signUploadPath(publicPath: string, ttlSeconds = TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${publicPath}:${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyUploadSignature(publicPath: string, token: string): boolean {
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${publicPath}:${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function signedUploadUrl(publicPath: string, ttlSeconds = TTL_SECONDS): string {
  const token = signUploadPath(publicPath, ttlSeconds);
  return `/api/files?path=${encodeURIComponent(publicPath)}&token=${encodeURIComponent(token)}`;
}

/** Resolve a /uploads/... path to an absolute file under public/, rejecting traversal. */
export function resolveUploadFile(publicPath: string): string | null {
  if (!publicPath.startsWith("/uploads/")) return null;
  const relative = publicPath.replace(/^\/+/, "");
  const root = path.join(process.cwd(), "public");
  const absolute = path.normalize(path.join(root, relative));
  if (!absolute.startsWith(root)) return null;
  return absolute;
}
