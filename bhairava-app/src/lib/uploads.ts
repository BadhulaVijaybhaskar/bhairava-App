import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const DOC_ALLOWED_EXT = /\.(pdf|jpe?g|png|webp|doc|docx|xls|xlsx)$/i;
const DOC_MAX_BYTES = 20 * 1024 * 1024;

export type SavedDocumentFile = {
  publicPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

/** Generic document upload under public/uploads/documents/{orgId}/… */
export async function saveDocumentFile(
  file: File,
  orgId: string,
): Promise<SavedDocumentFile> {
  const originalName = file.name || "document.bin";
  const mimeType = file.type || "application/octet-stream";

  if (!DOC_ALLOWED_EXT.test(originalName) && !mimeType.startsWith("image/") && mimeType !== "application/pdf") {
    throw new Error("invalid_type");
  }
  if (file.size > DOC_MAX_BYTES) {
    throw new Error("too_large");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(originalName).replace(".", "").toLowerCase() || "bin";
  const dir = path.join(process.cwd(), "public", "uploads", "documents", orgId);
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

export type SavedLayoutImage = {
  publicPath: string;
  width: number;
  height: number;
};

export async function saveLayoutImage(
  file: File | Blob & { name?: string; type: string },
  orgId: string,
  projectId: string,
): Promise<SavedLayoutImage> {
  const fileName = "name" in file && file.name ? file.name : "layout.jpg";
  const fileType = file.type || "";

  if (!ALLOWED.has(fileType) && !fileName.match(/\.(jpe?g|png|webp)$/i)) {
    throw new Error("invalid_type");
  }

  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("too_large");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let width = 1;
  let height = 1;
  try {
    const meta = await sharp(bytes).metadata();
    width = meta.width || 1;
    height = meta.height || 1;
  } catch {
    // Still save the file even if metadata probing fails
  }

  const ext =
    fileType === "image/png" || fileName.toLowerCase().endsWith(".png")
      ? "png"
      : fileType === "image/webp" || fileName.toLowerCase().endsWith(".webp")
        ? "webp"
        : "jpg";

  const dir = path.join(process.cwd(), "public", "uploads", "layouts", orgId, projectId);
  await mkdir(dir, { recursive: true });

  const filename = `master-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);

  return {
    publicPath: `/uploads/layouts/${orgId}/${projectId}/${filename}`,
    width,
    height,
  };
}
