import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "bhairava_access";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Gate raw uploads — serve via /api/files with session or signed token
  if (pathname.startsWith("/uploads")) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/files";
    url.searchParams.set("path", pathname);
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/refresh") ||
    pathname.startsWith("/api/interests") ||
    pathname.startsWith("/api/files") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Server Actions must not get an HTML login redirect — that causes
  // "An unexpected response was received from the server."
  // Auth is enforced inside each action via getSession().
  if (req.headers.has("next-action")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const secret = process.env.JWT_ACCESS_SECRET;

  let valid = false;
  let isAdmin = false;

  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
      const roles = (payload.roles as string[]) || [];
      isAdmin = roles.includes("ADMIN");
    } catch {
      valid = false;
    }
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!valid || !isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (isPublic && valid && isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Include /uploads/* image extensions so they are not served as open static files
  matcher: ["/((?!_next/static|_next/image).*)"],
};
