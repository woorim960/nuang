import { describe, expect, it } from "vitest";
import {
  resolveTraitMapCanonicalV2,
  resolveTraitMapProfilePayloadV2,
  type TraitMapRuntimeCanonicalV2,
  type TraitMapRuntimeManifestV2,
} from "@/features/nuang-code/trait-map-runtime-resolver-v2";

const approved: TraitMapRuntimeCanonicalV2 = {
  canonicalVariantId: "CAN-APPROVED",
  contentKey: "trait-map.v2.3.approved",
  text: "승인된 문장",
  version: 3,
  state: "approved",
  privacyScope: "self_only",
  axisSignature: "OE=N",
};
const manifest: TraitMapRuntimeManifestV2 = {
  digest: "MANIFEST-1",
  surfaceAllowlists: {
    result_summary: [
      {
        canonicalVariantId: approved.canonicalVariantId,
        version: approved.version,
      },
    ],
  },
};

describe("trait-map runtime resolver v2", () => {
  it("renders only the exact approved version on an allowed surface", () => {
    expect(
      resolveTraitMapCanonicalV2({
        canonicalVariantId: approved.canonicalVariantId,
        expectedVersion: 3,
        surface: "result_summary",
        requestManifestDigest: "MANIFEST-1",
        manifest,
        canonicalLibrary: new Map([
          [approved.canonicalVariantId, approved],
        ]),
      }),
    ).toEqual({
      action: "render",
      claim: {
        contentKey: approved.contentKey,
        text: approved.text,
        version: 3,
      },
      diagnostic: null,
    });
  });

  it("blocks stale manifests before looking up content", () => {
    const result = resolveTraitMapCanonicalV2({
      canonicalVariantId: approved.canonicalVariantId,
      expectedVersion: 3,
      surface: "result_summary",
      requestManifestDigest: "STALE",
      manifest,
      canonicalLibrary: new Map([
        [approved.canonicalVariantId, approved],
      ]),
    });

    expect(result).toMatchObject({
      action: "omit",
      diagnostic: "MANIFEST_DIGEST_MISMATCH",
    });
  });

  it("never renders retired, COMMON, or research-only content", () => {
    for (const canonical of [
      { ...approved, state: "retired" as const },
      {
        ...approved,
        state: "common_archive" as const,
        axisSignature: "COMMON",
      },
      { ...approved, state: "research_only" as const },
    ]) {
      const result = resolveTraitMapCanonicalV2({
        canonicalVariantId: canonical.canonicalVariantId,
        expectedVersion: 3,
        surface: "result_summary",
        requestManifestDigest: "MANIFEST-1",
        manifest,
        canonicalLibrary: new Map([
          [canonical.canonicalVariantId, canonical],
        ]),
      });
      expect(result.action).toBe("omit");
    }
  });

  it("does not leak self-only content to comparison or profile surfaces", () => {
    const openEverywhere: TraitMapRuntimeManifestV2 = {
      digest: "MANIFEST-2",
      surfaceAllowlists: {
        comparison_report: [
          { canonicalVariantId: approved.canonicalVariantId, version: 3 },
        ],
        profile_preview: [
          { canonicalVariantId: approved.canonicalVariantId, version: 3 },
        ],
      },
    };

    for (const surface of [
      "comparison_report",
      "profile_preview",
    ] as const) {
      const result = resolveTraitMapCanonicalV2({
        canonicalVariantId: approved.canonicalVariantId,
        expectedVersion: 3,
        surface,
        requestManifestDigest: "MANIFEST-2",
        manifest: openEverywhere,
        canonicalLibrary: new Map([
          [approved.canonicalVariantId, approved],
        ]),
      });
      expect(result).toMatchObject({
        action: "omit",
        diagnostic: "PRIVACY_SCOPE_DENIED",
      });
    }
  });

  it("keeps all 9,216 research-only profile refs out of client payloads", () => {
    const researchLibrary = new Map<string, TraitMapRuntimeCanonicalV2>();
    const profiles = Array.from({ length: 32 }, (_, profileIndex) => {
      const claimRefs = Array.from({ length: 288 }, (_, claimIndex) => {
        const canonicalVariantId = `CAN-${claimIndex}`;
        if (!researchLibrary.has(canonicalVariantId)) {
          researchLibrary.set(canonicalVariantId, {
            ...approved,
            canonicalVariantId,
            contentKey: `trait-map.v2.3.${claimIndex}`,
            state: "research_only",
          });
        }
        return { canonicalVariantId, expectedVersion: 3 };
      });
      return {
        code: `SYNTHETIC-${profileIndex}`,
        claimRefs,
      };
    });
    const closedManifest: TraitMapRuntimeManifestV2 = {
      digest: "CLOSED",
      surfaceAllowlists: {},
    };

    const payloads = profiles.map((profile) =>
      resolveTraitMapProfilePayloadV2({
        profile,
        surface: "trait_map_detail",
        requestManifestDigest: "CLOSED",
        manifest: closedManifest,
        canonicalLibrary: researchLibrary,
      }),
    );

    expect(
      payloads.reduce(
        (sum, payload) =>
          sum + payload.serverDiagnostics.requestedClaims,
        0,
      ),
    ).toBe(9216);
    expect(
      payloads.reduce(
        (sum, payload) =>
          sum + payload.serverDiagnostics.omittedClaims,
        0,
      ),
    ).toBe(9216);
    expect(payloads.every((payload) => payload.client.claims.length === 0)).toBe(
      true,
    );
  });
});
