import { NextResponse, type NextRequest } from "next/server";

// Must match SESSION_COOKIE in src/lib/session.ts.
const SESSION_COOKIE = "userId";

// Cheap presence check only; pages verify the user actually exists via getCurrentUser/requireUser.
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
