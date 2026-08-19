import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { uploadsPublicRoot } from "./signed-url";

const DOC_ALLOWED_EXT = /\.(pdf|jpe?g|png|webp|doc|docx|xls|xlsx)$/i;
const DOC_MAX_BYTES = 20 * 1024 * 1024;

export type SavedDocumentFile = {
  publicPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function saveDocumentFile(
  file: File,
  orgId: string,
): Promise<SavedDocumentFile> {
  const originalName = file.name || "document.bin";
  const mimeType = file.type || "application/octet-stream";

  if (
    !DOC_ALLOWED_EXT.test(originalName) &&
    !mimeType.startsWith("image/") &&
    mimeType !== "application/pdf"
  ) {
    throw new Error("invalid_type");
  }
  if (file.size > DOC_MAX_BYTES) {
    throw new Error("too_large");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(originalName).replace(".", "").toLowerCase() || "bin";
  const publicRoot = uploadsPublicRoot();
  const dir = path.join(publicRoot, "uploads", "documents", orgId);
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);

  return {
    publicPath: `/uploads/documents/${orgId}/${filename}`,
    originalName,
    mimeType,
    sizeBytes: file.size,
  };
}
