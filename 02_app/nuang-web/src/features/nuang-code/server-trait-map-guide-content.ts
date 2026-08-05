import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCustomerApprovedTraitMapGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import {
  applyTraitMapGuideTextOverrides,
  type TraitMapGuideTextOverride,
} from "@/features/nuang-code/trait-map-guide-text-overrides";
import { traitMapGuideBetaReleaseId } from "@/features/nuang-code/trait-map-guide-review-contract";

export type TraitMapGuideActiveEdit = TraitMapGuideTextOverride &
  Readonly<{
    contentHash: string;
    editedAt: string;
    editedByRef: string;
    previousContentHash: string;
    revisionId: string;
  }>;

export async function readTraitMapGuideActiveEdits(
  client: SupabaseClient,
  input: Readonly<{ profileCode: string; releaseId?: string }>,
) {
  const response = await client
    .schema("trait_map")
    .from("guide_content_revision")
    .select(
      "id,unit_key,previous_content_hash,content_hash,text,edited_by_ref,created_at",
    )
    .eq("release_id", input.releaseId ?? traitMapGuideBetaReleaseId)
    .eq("profile_code", input.profileCode.trim().toUpperCase())
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(10_000);

  if (response.error) {
    if (["42P01", "PGRST205", "PGRST106"].includes(response.error.code ?? "")) {
      return {
        available: false as const,
        edits: [] as TraitMapGuideActiveEdit[],
      };
    }
    throw response.error;
  }

  return {
    available: true as const,
    edits: (response.data ?? []).map((row) => ({
      contentHash: row.content_hash,
      editedAt: row.created_at,
      editedByRef: row.edited_by_ref,
      previousContentHash: row.previous_content_hash,
      revisionId: row.id,
      text: row.text,
      unitKey: row.unit_key,
    })),
  };
}

export async function resolveCustomerTraitMapGuide(code: string) {
  const baseGuide = getCustomerApprovedTraitMapGuide(code);
  if (!baseGuide) return null;
  const client = createSupabaseServiceClient();
  if (!client) return baseGuide;

  try {
    const state = await readTraitMapGuideActiveEdits(client, {
      profileCode: baseGuide.code,
    });
    if (!state.available || state.edits.length === 0) return baseGuide;
    return applyTraitMapGuideTextOverrides(baseGuide, state.edits);
  } catch {
    // A broken or temporarily unavailable editorial store must never replace the
    // last code-reviewed customer guide with partial content.
    return baseGuide;
  }
}
