import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  readPublishedTraitMapProfile,
  readTraitMapReviewSnapshot,
} from "@/features/nuang-code/trait-map-content-store";

describe("trait map content store", () => {
  it("reads the service-role review snapshot through the internal RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        atoms: [
          {
            atomId: "tmc.v1.enakq.summary.general",
            claimCount: 5,
            context: "general",
            copyShort: "검토 중인 요약",
            evidenceCount: 1,
            publicationState: "research_only",
            reviews: {
              measurement: "in_review",
              plain_language: "in_review",
              product_safety: "in_review",
              psychology: "in_review",
            },
            slot: "summary",
            version: 1,
          },
        ],
        contractVersion: "nuang-trait-map-content.v1",
        inventory: {
          axes: 5,
          contentAtoms: 10,
          facets: 10,
          publishedAtoms: 0,
          roleProfiles: 32,
        },
        releaseId: "NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT",
        status: "draft",
      },
      error: null,
    });

    const result = await readTraitMapReviewSnapshot({
      rpc,
    } as unknown as SupabaseClient);

    expect(result?.inventory).toEqual({
      axes: 5,
      contentAtoms: 10,
      facets: 10,
      publishedAtoms: 0,
      roleProfiles: 32,
    });
    expect(rpc).toHaveBeenCalledWith("get_trait_map_review_snapshot", {
      target_release_id: "NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT",
    });
  });

  it("returns no customer profile when no published release exists", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await expect(
      readPublishedTraitMapProfile(
        { rpc } as unknown as SupabaseClient,
        "ENAKQ",
      ),
    ).resolves.toBeNull();
  });

  it("does not hide an RPC failure as an empty customer profile", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "schema cache unavailable" },
    });

    await expect(
      readPublishedTraitMapProfile(
        { rpc } as unknown as SupabaseClient,
        "ENAKQ",
      ),
    ).rejects.toThrow("schema cache unavailable");
  });
});
