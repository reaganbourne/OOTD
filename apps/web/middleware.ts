import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_VALUE
} from "@/lib/auth-session";

const AUTH_ROUTES = new Set(["/login", "/signup"]);
const PROTECTED_ROUTE_PREFIXES = ["/feed", "/vault", "/upload"];

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function hasActiveSession(request: NextRequest) {
  return request.cookies.get(AUTH_SESSION_COOKIE)?.value === AUTH_SESSION_COOKIE_VALUE;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = hasActiveSession(request);

  if (AUTH_ROUTES.has(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${search}`;

    if (nextPath !== "/login") {
      loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
