import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Routes that require authentication. Omit `/`, `/login`, and `/api`.
 * URLs use the pathname (route groups like `(dashboard)` are not visible in the URL).
 */
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/pos/:path*",
    "/products/:path*",
    "/stock/:path*",
    "/purchases/:path*",
    "/suppliers/:path*",
    "/sales/:path*",
    "/customers/:path*",
    "/accounts/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/settings",
    "/settings/:path*",
    "/users",
    "/users/:path*",
  ],
};
