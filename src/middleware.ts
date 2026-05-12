import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register"];

const TRANSACTIONS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_TRANSACTIONS === "true";
const MESSAGING_ENABLED = process.env.NEXT_PUBLIC_FEATURE_MESSAGING === "true";

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/listings")) return true;
  if (pathname.startsWith("/api/listings")) return true;
  if (pathname.startsWith("/api/documents/access/")) return true;
  if (pathname.startsWith("/tours/share/")) return true;
  if (pathname.startsWith("/api/tours/share/")) return true;
  if (pathname.startsWith("/api/feature-flags")) return true;
  return false;
}

function isFeatureDisabled(pathname: string): boolean {
  if (!TRANSACTIONS_ENABLED) {
    if (pathname.startsWith("/transactions") || pathname.startsWith("/api/transactions")) {
      return true;
    }
  }
  if (!MESSAGING_ENABLED) {
    if (pathname.startsWith("/messaging") || pathname.startsWith("/api/messaging")) {
      return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isFeatureDisabled(pathname)) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Feature disabled" }, { status: 403 })
      );
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  const response = isPublicPath(pathname) ? NextResponse.next() : null;

  if (!response) {
    const token = req.cookies.get("portal_session")?.value;

    if (!token && pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return addSecurityHeaders(response || NextResponse.next());
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
