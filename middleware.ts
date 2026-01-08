import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simplified middleware - auth checks handled client-side
export async function middleware(req: NextRequest) {
  // Just pass through - ProtectedRoute component handles auth on client
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/Create-note/:path*",
    "/Groups/:path*",
    "/Profile/:path*",
    "/admin/:path*",
  ],
};
