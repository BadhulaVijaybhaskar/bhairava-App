import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "bhairava_agent_access";
const AGENT_ROLES = new Set(["SALES_AGENT", "SALES_MANAGER"]);
const PUBLIC_PATHS = ["/login"];

const AUTH_PREFIXES = [
  "/dashboard",
  "/projects",
  "/customers",
  "/bookings",
  "/plots",
  "/documents",
  "/more",
  "/api/",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/files") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (req.headers.has("next-action")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const secret = process.env.JWT_ACCESS_SECRET;

  let valid = false;
  let isAgent = false;

  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
      const roles = (payload.roles as string[]) || [];
      isAgent = roles.some((r) => AGENT_ROLES.has(r));
    } catch {
      valid = false;
    }
  }

  const needsAuth = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsAuth && (!valid || !isAgent)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/" || isPublic) && valid && isAgent) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && !valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
