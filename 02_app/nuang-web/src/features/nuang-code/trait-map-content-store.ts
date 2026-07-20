import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  traitMapContentReleaseId,
  traitMapContentSlots,
} from "@/features/nuang-code/trait-map-content-contract-v1";

const reviewStatusSchema = z.enum([
  "not_started",
  "in_review",
  "passed",
  "changes_requested",
]);

const reviewSnapshotSchema = z.object({
  atoms: z.array(
    z.object({
      atomId: z.string(),
      claimCount: z.number().int().nonnegative(),
      context: z.string(),
      copyShort: z.string(),
      evidenceCount: z.number().int().nonnegative(),
      publicationState: z.enum([
        "research_only",
        "review_candidate",
        "approved",
        "published",
        "retired",
      ]),
      reviews: z.record(z.string(), reviewStatusSchema).nullable(),
      slot: z.enum(traitMapContentSlots),
      version: z.number().int().positive(),
    }),
  ),
  contractVersion: z.string(),
  inventory: z.object({
    axes: z.number().int().nonnegative(),
    contentAtoms: z.number().int().nonnegative(),
    facets: z.number().int().nonnegative(),
    publishedAtoms: z.number().int().nonnegative(),
    roleProfiles: z.number().int().nonnegative(),
  }),
  releaseId: z.string(),
  status: z.enum(["draft", "in_review", "approved", "published", "retired"]),
});

const publishedProfileSchema = z.object({
  contentAtoms: z.array(
    z.object({
      atomId: z.string(),
      context: z.string(),
      copy: z.object({
        long: z.string().nullable(),
        short: z.string(),
        standard: z.string().nullable(),
      }),
      slot: z.string(),
      version: z.number().int().positive(),
    }),
  ),
  contractVersion: z.string(),
  profile: z.object({ code: z.string(), name: z.string() }),
  releaseId: z.string(),
});

export type TraitMapReviewSnapshot = z.infer<typeof reviewSnapshotSchema>;
export type PublishedTraitMapProfile = z.infer<typeof publishedProfileSchema>;

export async function readTraitMapReviewSnapshot(
  client: SupabaseClient,
  releaseId = traitMapContentReleaseId,
) {
  const { data, error } = await client.rpc("get_trait_map_review_snapshot", {
    target_release_id: releaseId,
  });

  if (error) {
    throw new Error(
      `성향지도 검토 저장소를 불러오지 못했어요: ${error.message}`,
    );
  }
  if (!data) return null;
  return reviewSnapshotSchema.parse(data);
}

export async function readPublishedTraitMapProfile(
  client: SupabaseClient,
  code: string,
) {
  const { data, error } = await client.rpc("get_published_trait_map_profile", {
    target_code: code,
  });

  if (error) {
    throw new Error(`공개 성향지도를 불러오지 못했어요: ${error.message}`);
  }
  if (!data) return null;
  return publishedProfileSchema.parse(data);
}
