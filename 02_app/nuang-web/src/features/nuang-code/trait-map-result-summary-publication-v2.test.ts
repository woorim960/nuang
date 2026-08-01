import { describe, expect, it } from "vitest";
import {
  activeTraitMapResultSummaryPublicationV2,
  resolveTraitMapResultSummaryV2,
  type TraitMapResultSummaryPublicationRegistryV2,
} from "./trait-map-result-summary-publication-v2";

describe("trait-map result-summary publication v2", () => {
  it("keeps the production customer surface closed while approval is zero", () => {
    const result = resolveTraitMapResultSummaryV2({ code: "ENAKQ" });

    expect(
      activeTraitMapResultSummaryPublicationV2.manifest.surfaceAllowlists
        .result_summary,
    ).toEqual([]);
    expect(result.claims).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it("renders an exact approved and allowlisted version with its placement", () => {
    const publication: TraitMapResultSummaryPublicationRegistryV2 = {
      baselineId: "TEST-BASELINE",
      canonicalLibrary: new Map([
        [
          "CAN-OVERUSE-1",
          {
            axisSignature: "OE=N",
            canonicalVariantId: "CAN-OVERUSE-1",
            contentKey: "profile.ENAKQ.overuse.1",
            privacyScope: "self_only",
            state: "approved",
            text: "상대의 반응을 기다리지 않고 먼저 결론을 낼 수 있어요.",
            version: 2,
          },
        ],
      ]),
      manifest: {
        digest: "TEST-MANIFEST",
        surfaceAllowlists: {
          result_summary: [{ canonicalVariantId: "CAN-OVERUSE-1", version: 2 }],
        },
      },
      profileClaimRefs: {
        ENAKQ: [
          {
            canonicalVariantId: "CAN-OVERUSE-1",
            expectedVersion: 2,
            placement: "overuse_cost",
          },
        ],
      },
    };

    expect(
      resolveTraitMapResultSummaryV2({ code: "enakq", publication }).claims,
    ).toEqual([
      expect.objectContaining({
        canonicalVariantId: "CAN-OVERUSE-1",
        contentKey: "profile.ENAKQ.overuse.1",
        placement: "overuse_cost",
        version: 2,
      }),
    ]);
  });

  it("omits research-only and stale-version refs with server diagnostics", () => {
    const publication: TraitMapResultSummaryPublicationRegistryV2 = {
      baselineId: "TEST-BASELINE",
      canonicalLibrary: new Map([
        [
          "CAN-DRAFT",
          {
            axisSignature: "OE=N",
            canonicalVariantId: "CAN-DRAFT",
            contentKey: "profile.ENAKQ.draft",
            privacyScope: "self_only",
            state: "research_only",
            text: "연구 초안",
            version: 1,
          },
        ],
        [
          "CAN-STALE",
          {
            axisSignature: "RO=K",
            canonicalVariantId: "CAN-STALE",
            contentKey: "profile.ENAKQ.stale",
            privacyScope: "self_only",
            state: "approved",
            text: "버전이 맞지 않는 문장",
            version: 2,
          },
        ],
      ]),
      manifest: {
        digest: "TEST-MANIFEST",
        surfaceAllowlists: {
          result_summary: [
            { canonicalVariantId: "CAN-DRAFT", version: 1 },
            { canonicalVariantId: "CAN-STALE", version: 2 },
          ],
        },
      },
      profileClaimRefs: {
        ENAKQ: [
          {
            canonicalVariantId: "CAN-DRAFT",
            expectedVersion: 1,
            placement: "headline",
          },
          {
            canonicalVariantId: "CAN-STALE",
            expectedVersion: 1,
            placement: "action_experiment",
          },
        ],
      },
    };

    const result = resolveTraitMapResultSummaryV2({
      code: "ENAKQ",
      publication,
    });

    expect(result.claims).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        canonicalVariantId: "CAN-DRAFT",
        reason: "CANONICAL_NOT_APPROVED",
      },
      {
        canonicalVariantId: "CAN-STALE",
        reason: "VERSION_NOT_ALLOWLISTED",
      },
    ]);
  });
});
