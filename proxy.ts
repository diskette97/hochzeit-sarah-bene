import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/register", "/setup"];
const COOKIE_NAME = "hz_session";

// Grobe Vorprüfung: ohne Sitzungs-Cookie geht es nur zu Login/Registrierung.
// Die eigentliche Prüfung (Sitzung gültig, freigeschaltet, Rolle) passiert serverseitig in lib/session.ts.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (!process.env.DATABASE_URL) {
    return path === "/setup" ? NextResponse.next() : NextResponse.redirect(new URL("/setup", request.url));
  }
  if (!isPublic && !request.cookies.get(COOKIE_NAME)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
