import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "bhairava_customer_access";
const PUBLIC_PATHS = ["/login"];

const AUTH_PREFIXES = [
  "/dashboard",
  "/my-plot",
  "/browse",
  "/projects",
  "/plots",
  "/bookings",
  "/payments",
  "/documents",
  "/profile",
  "/more",
  "/support",
  "/api/",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/api/auth/login") ||
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
  let isCustomer = false;

  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
      const roles = (payload.roles as string[]) || [];
      isCustomer = roles.includes("CUSTOMER");
    } catch {
      valid = false;
    }
  }

  const needsAuth = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsAuth && (!valid || !isCustomer)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/" || isPublic) && valid && isCustomer) {
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
