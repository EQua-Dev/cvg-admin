import { NextResponse, type NextRequest } from "next/server";

// Fast redirect for signed-out visitors. The real check happens in the API.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("cvg_session")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|sign-in|_next|favicon.ico|icon.svg).*)"],
};
