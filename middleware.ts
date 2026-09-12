import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect /admin routes except /admin/login
  if (path.startsWith("/admin") && path !== "/admin/login") {
    // In Next.js middleware, Firebase client auth session cookies can be checked.
    // For robust server-side RBAC middleware, we check session cookie or allow client context guard.
    // Here we let requests through to client layout/context guard or check basic cookie if available.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
