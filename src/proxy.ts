import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/(dashboard)/:path*",
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
  ],
};
