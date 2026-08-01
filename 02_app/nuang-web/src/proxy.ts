import type { NextRequest } from "next/server";
import { refreshSupabaseAuthSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (!isAdvertisingCspRoute(request.nextUrl.pathname)) {
    return refreshSupabaseAuthSession(request);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = createAdvertisingReportOnlyPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  // Next.js reads this request header to attach the request nonce to its own
  // scripts. The browser receives only the report-only form below.
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const response = await refreshSupabaseAuthSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy-Report-Only", policy);
  response.headers.set(
    "Reporting-Endpoints",
    'nuang-csp="/api/security/csp-report"',
  );
  return response;
}

function isAdvertisingCspRoute(pathname: string) {
  return (
    pathname === "/home" ||
    pathname === "/feed" ||
    pathname === "/advertise" ||
    pathname.startsWith("/advertise/")
  );
}

function createAdvertisingReportOnlyPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google.com https://*.google.co.kr https://*.googlesyndication.com https://*.doubleclick.net",
    "frame-src 'self' https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net",
    "form-action 'self'",
    "report-uri /api/security/csp-report",
    "report-to nuang-csp",
  ].join("; ");
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
