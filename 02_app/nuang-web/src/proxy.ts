import { type NextRequest, NextResponse } from "next/server";
import { refreshSupabaseAuthSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const mobileCallbackResponse = scrubMobileAuthCallbackQuery(request);
  if (mobileCallbackResponse) return mobileCallbackResponse;

  const crossOriginApiResponse = rejectCrossOriginApiMutation(request);
  if (crossOriginApiResponse) return crossOriginApiResponse;

  const oversizedApiResponse = rejectDeclaredOversizedApiRequest(request);
  if (oversizedApiResponse) return oversizedApiResponse;

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

function scrubMobileAuthCallbackQuery(request: NextRequest) {
  if (
    request.method !== "GET" ||
    request.nextUrl.pathname !== "/mobile/auth/callback" ||
    !request.nextUrl.search
  ) {
    return null;
  }

  const cleanUrl = request.nextUrl.clone();
  cleanUrl.search = "";
  return NextResponse.redirect(cleanUrl, {
    headers: {
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
    },
    status: 303,
  });
}

function rejectCrossOriginApiMutation(request: NextRequest) {
  if (
    !request.nextUrl.pathname.startsWith("/api/") ||
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
  ) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const originMatches = origin
    ? safeOrigin(origin) === request.nextUrl.origin
    : true;
  if (fetchSite !== "cross-site" && originMatches) return null;

  return NextResponse.json(
    {
      error: "invalid_request_origin",
      message: "요청 출처를 확인하지 못했어요.",
    },
    {
      headers: { "cache-control": "no-store" },
      status: 403,
    },
  );
}

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function rejectDeclaredOversizedApiRequest(request: NextRequest) {
  if (
    !request.nextUrl.pathname.startsWith("/api/") ||
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ||
    !request.headers.get("content-type")?.includes("application/json")
  ) {
    return null;
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 1024 * 1024) {
    return null;
  }

  return NextResponse.json(
    {
      error: "request_body_too_large",
      message: "Request body must be 1 MB or smaller.",
    },
    {
      headers: { "cache-control": "no-store" },
      status: 413,
    },
  );
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
    "/((?!_next/static|_next/image|\\.well-known/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
