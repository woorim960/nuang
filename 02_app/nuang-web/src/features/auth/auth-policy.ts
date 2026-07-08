import { hasPublicSupabaseEnv } from "@/lib/supabase/env";

export const socialAuthProviders = [
  {
    id: "kakao",
    label: "카카오",
    tone: "sun",
    collects: ["provider_subject", "email_optional", "profile_optional"],
  },
  {
    id: "naver",
    label: "네이버",
    tone: "forest",
    collects: ["provider_subject", "email_optional", "profile_optional"],
  },
  {
    id: "google",
    label: "Google",
    tone: "water",
    collects: ["provider_subject", "email_optional", "profile_optional"],
  },
] as const;

export type SocialAuthProviderId = (typeof socialAuthProviders)[number]["id"];
export type SupabaseOAuthProvider = "google" | "kakao";

const supabaseOAuthProviderById = {
  google: "google",
  kakao: "kakao",
  naver: null,
} satisfies Record<SocialAuthProviderId, SupabaseOAuthProvider | null>;

export const forbiddenProviderFields = [
  "raw_birthdate",
  "raw_mobile",
  "raw_ci",
  "raw_provider_response",
  "access_token",
  "refresh_token",
] as const;

export function getSupabaseOAuthProvider(providerId: SocialAuthProviderId) {
  return supabaseOAuthProviderById[providerId];
}

export { hasPublicSupabaseEnv };
