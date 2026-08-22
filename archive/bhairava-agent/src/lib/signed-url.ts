import { createHmac, timingSafeEqual } from "crypto";
import path from "path";
import { existsSync } from "fs";

const TTL_SECONDS = 60 * 60;

function secret() {
  return process.env.SIGNED_URL_SECRET || process.env.JWT_ACCESS_SECRET || "dev-signed-url";
}

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

/** Resolve /uploads/... from agent public/ or shared admin public/. */
export function resolveUploadFile(publicPath: string): string | null {
  if (!publicPath.startsWith("/uploads/")) return null;
  const relative = publicPath.replace(/^\/+/, "");
  const candidates = [
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "..", "bhairava-app", "public"),
  ];
  for (const root of candidates) {
    const absolute = path.normalize(path.join(root, relative));
    if (!absolute.startsWith(path.normalize(root))) continue;
    if (existsSync(absolute)) return absolute;
  }
  // Prefer writing path even if missing (for 404 handling by caller)
  const fallbackRoot = candidates.find((r) => existsSync(r)) ?? candidates[0];
  const absolute = path.normalize(path.join(fallbackRoot, relative));
  if (!absolute.startsWith(path.normalize(fallbackRoot))) return null;
  return absolute;
}

export function uploadsPublicRoot(): string {
  const admin = path.join(process.cwd(), "..", "bhairava-app", "public");
  if (existsSync(admin)) return admin;
  return path.join(process.cwd(), "public");
}
