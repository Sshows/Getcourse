import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionValueEdge
} from "@/lib/admin-auth-edge";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect all /securecourse/admin/* routes except /login itself
  if (
    pathname.startsWith("/securecourse/admin") &&
    !pathname.startsWith("/securecourse/admin/login")
  ) {
    const sessionValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isValid = await verifyAdminSessionValueEdge(sessionValue);

    if (!isValid) {
      const loginUrl = new URL("/securecourse/admin/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/securecourse/admin/:path*"]
};
