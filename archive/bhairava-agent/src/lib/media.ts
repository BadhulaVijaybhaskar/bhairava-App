import { signedUploadUrl } from "@/lib/signed-url";

/** Convert stored /uploads path to agent-served URL; leave external URLs alone. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/uploads/")) return signedUploadUrl(path);
  return path;
}
