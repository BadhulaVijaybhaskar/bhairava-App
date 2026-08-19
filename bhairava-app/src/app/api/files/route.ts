import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { resolveUploadFile, verifyUploadSignature } from "@/lib/signed-url";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const publicPath = req.nextUrl.searchParams.get("path") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!publicPath.startsWith("/uploads/")) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  const session = await getSession();
  const signedOk = token ? verifyUploadSignature(publicPath, token) : false;
  if (!session && !signedOk) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const absolute = resolveUploadFile(publicPath);
  if (!absolute) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(absolute);
  } catch {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const ext = absolute.split(".").pop()?.toLowerCase();
  const type =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : "application/octet-stream";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
