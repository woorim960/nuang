import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserSupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  browserClient ??= createBrowserClient(env.url, env.anonKey);
  return browserClient;
}
