import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAuthCookieOptions } from "@/lib/supabase/auth-session";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function refreshSupabaseAuthSession(
  request: NextRequest,
  forwardedRequestHeaders?: Headers,
) {
  const createResponse = () =>
    NextResponse.next({
      request: {
        headers: forwardedRequestHeaders ?? request.headers,
      },
    });

  // Anonymous traffic is the dominant path for public pages. Supabase's SSR
  // client only has work to do when an access-token cookie is present, so avoid
  // constructing the client (and any token verification/refresh work) for every
  // asset, landing page, and signed-out navigation.
  if (!hasSupabaseAuthTokenCookie(request)) {
    return createResponse();
  }

  const env = getSupabasePublicEnv();

  if (!env) {
    return createResponse();
  }

  let response = createResponse();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = createResponse();

        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // Refresh an expired access token before Server Components read the cookie.
  // getClaims verifies the token and avoids trusting an unverified cookie user.
  await supabase.auth.getClaims();

  return response;
}

function hasSupabaseAuthTokenCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name, value }) => {
    if (!value || !name.startsWith("sb-")) return false;
    return name.endsWith("-auth-token") || /-auth-token\.\d+$/.test(name);
  });
}
