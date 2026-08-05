import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readTraitMapGuideActiveEdits } from "@/features/nuang-code/server-trait-map-guide-content";

export type AdminTraitMapGuideHumanDecision = Readonly<{
  contentHash: string;
  note: string | null;
  reviewRole: string;
  status: string;
  unitKey: string;
  updatedAt: string;
}>;

export type AdminTraitMapGuideProfileApproval = Readonly<{
  approvedAt: string | null;
  profileCode: string;
  status: string;
  updatedAt: string;
}>;

export async function readAdminTraitMapGuideHumanReview(
  client: SupabaseClient,
  input: Readonly<{ profileCode: string; releaseId: string }>,
) {
  const [decisionResponse, profileResponse, deploymentResponse] =
    await Promise.all([
      client
        .schema("trait_map")
        .from("guide_human_review_decision")
        .select("unit_key,content_hash,review_role,status,note,updated_at")
        .eq("release_id", input.releaseId)
        .eq("profile_code", input.profileCode)
        .limit(50_000),
      client
        .schema("trait_map")
        .from("guide_profile_approval")
        .select("profile_code,status,approved_at,updated_at")
        .eq("release_id", input.releaseId),
      client
        .schema("trait_map")
        .from("guide_deployment")
        .select("channel,status,deployed_at,updated_at")
        .eq("release_id", input.releaseId),
    ]);

  const unavailable = [
    decisionResponse.error,
    profileResponse.error,
    deploymentResponse.error,
  ].some((error) =>
    ["42P01", "PGRST205", "PGRST106"].includes(error?.code ?? ""),
  );

  if (unavailable) {
    return {
      available: false as const,
      decisions: [] as AdminTraitMapGuideHumanDecision[],
      deployments: [] as Array<{
        channel: string;
        deployedAt: string | null;
        status: string;
        updatedAt: string;
      }>,
      profiles: [] as AdminTraitMapGuideProfileApproval[],
    };
  }

  for (const response of [
    decisionResponse,
    profileResponse,
    deploymentResponse,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    available: true as const,
    decisions: (decisionResponse.data ?? []).map((row) => ({
      contentHash: row.content_hash,
      note: row.note,
      reviewRole: row.review_role,
      status: row.status,
      unitKey: row.unit_key,
      updatedAt: row.updated_at,
    })),
    deployments: (deploymentResponse.data ?? []).map((row) => ({
      channel: row.channel,
      deployedAt: row.deployed_at,
      status: row.status,
      updatedAt: row.updated_at,
    })),
    profiles: (profileResponse.data ?? []).map((row) => ({
      approvedAt: row.approved_at,
      profileCode: row.profile_code,
      status: row.status,
      updatedAt: row.updated_at,
    })),
  };
}

export async function readAdminTraitMapGuideEditingState(
  client: SupabaseClient,
  input: Readonly<{ profileCode: string; releaseId: string }>,
) {
  return readTraitMapGuideActiveEdits(client, input);
}
