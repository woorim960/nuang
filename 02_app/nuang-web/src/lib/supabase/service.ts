import { createClient } from "@supabase/supabase-js";
import { getAppOrigin, getSupabasePublicEnv } from "@/lib/supabase/env";

export type SupabaseServiceEnv = {
  appOrigin: string;
  serviceRoleKey: string;
  shareTokenPepper: string;
  url: string;
};

function nonEmpty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getSupabaseServiceEnv(): SupabaseServiceEnv | null {
  const publicEnv = getSupabasePublicEnv();
  const serviceRoleKey = nonEmpty(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const shareTokenPepper = nonEmpty(process.env.SHARE_TOKEN_PEPPER);

  if (!publicEnv || !serviceRoleKey || !shareTokenPepper) {
    return null;
  }

  return {
    appOrigin: getAppOrigin(),
    serviceRoleKey,
    shareTokenPepper,
    url: publicEnv.url,
  };
}

export function createSupabaseServiceClient() {
  const env = getSupabaseServiceEnv();

  if (!env) {
    return null;
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
