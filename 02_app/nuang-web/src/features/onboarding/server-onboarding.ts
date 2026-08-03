import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";

export type AccountOnboardingState = {
  completedAt: string | null;
  firstSeenAt: string | null;
  guideVersion: number;
  seen: boolean;
};

type AccountExperienceRow = {
  onboarding_completed_at?: unknown;
  onboarding_first_seen_at?: unknown;
  onboarding_last_seen_guide_version?: unknown;
};

export async function readAccountOnboardingState({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("identity")
    .from("account_experience_state")
    .select(
      "onboarding_first_seen_at,onboarding_completed_at,onboarding_last_seen_guide_version",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (response.error) {
    return { code: "onboarding_state_read_failed" as const, ok: false as const };
  }

  return {
    data: normalizeAccountOnboardingState(
      response.data as AccountExperienceRow | null,
    ),
    ok: true as const,
  };
}

export async function saveAccountOnboardingState({
  accountId,
  client,
  state,
}: {
  accountId: string;
  client: SupabaseClient;
  state: "completed" | "seen";
}) {
  const response = await client.schema("identity").rpc(
    "record_onboarding_experience",
    {
      p_account_id: accountId,
      p_guide_version: onboardingEntryContract.guideVersion,
      p_state: state,
    },
  );

  if (response.error || !response.data) {
    return {
      code: "onboarding_state_write_failed" as const,
      ok: false as const,
    };
  }

  const row = response.data as {
    completedAt?: unknown;
    firstSeenAt?: unknown;
    guideVersion?: unknown;
    seen?: unknown;
  };
  return {
    data: {
      completedAt: stringOrNull(row.completedAt),
      firstSeenAt: stringOrNull(row.firstSeenAt),
      guideVersion: integerOrZero(row.guideVersion),
      seen: row.seen === true,
    } satisfies AccountOnboardingState,
    ok: true as const,
  };
}

function normalizeAccountOnboardingState(
  row: AccountExperienceRow | null,
): AccountOnboardingState {
  if (!row) {
    return {
      completedAt: null,
      firstSeenAt: null,
      guideVersion: 0,
      seen: false,
    };
  }

  const firstSeenAt = stringOrNull(row.onboarding_first_seen_at);
  return {
    completedAt: stringOrNull(row.onboarding_completed_at),
    firstSeenAt,
    guideVersion: integerOrZero(row.onboarding_last_seen_guide_version),
    seen: firstSeenAt !== null,
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integerOrZero(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}
