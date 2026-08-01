import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAuthCookieOptions } from "@/lib/supabase/auth-session";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function refreshSupabaseAuthSession(
  request: NextRequest,
  forwardedRequestHeaders?: Headers,
) {
  const env = getSupabasePublicEnv();
  const createResponse = () =>
    NextResponse.next({
      request: {
        headers: forwardedRequestHeaders ?? request.headers,
      },
    });

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
