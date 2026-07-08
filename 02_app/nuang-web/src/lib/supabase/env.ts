export type SupabasePublicEnv = {
  anonKey: string;
  appOrigin: string;
  url: string;
};

function nonEmpty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getAppOrigin() {
  return nonEmpty(process.env.NEXT_PUBLIC_APP_ORIGIN) ?? "http://localhost:3000";
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  return {
    anonKey,
    appOrigin: getAppOrigin(),
    url,
  };
}

export function hasPublicSupabaseEnv() {
  return getSupabasePublicEnv() !== null;
}
