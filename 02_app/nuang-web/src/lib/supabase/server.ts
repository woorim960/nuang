import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAuthCookieOptions } from "@/lib/supabase/auth-session";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function createServerSupabaseClient(options?: {
  accessToken?: string | null;
}) {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  if (options?.accessToken) {
    return createClient(env.url, env.anonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
        },
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate cookies; Route Handlers can.
        }
      },
    },
  });
}
