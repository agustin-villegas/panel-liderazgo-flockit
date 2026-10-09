import { NextResponse, type NextRequest } from "next/server";

// Solo comodidad de UX: sin cookie, al login. La autorización real la hace el backend.
export function proxy(req: NextRequest) {
  if (req.cookies.has("panel_session")) return NextResponse.next();
  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api|_next|favicon.ico).*)"],
};
