import { describe, expect, it } from "vitest";
import {
  calculateDynamicTraitSnapshot,
  calculateEffectiveTraitEvidenceWeight,
  dynamicTraitEvidenceVersion,
  dynamicTraitSourceWeights,
  type TraitEvidenceObservation,
} from "@/lib/scoring/dynamic-trait-evidence";
import type { DomainDefinition } from "@/lib/scoring/types";

const domains: DomainDefinition[] = [
  {
    domainId: "SE",
    label: "사람 사이 에너지",
    lowSymbol: "S",
    highSymbol: "T",
    facetIds: ["SE-RE", "SE-AI"],
  },
  {
    domainId: "ER",
    label: "마음의 반응",
    lowSymbol: "C",
    highSymbol: "V",
    facetIds: ["ER-IR", "ER-WD"],
  },
];

const profileNames = {
  TC: "불꽃의 균형 탐험가",
  TV: "불꽃의 온기 탐험가",
  SC: "숲의 균형 탐험가",
  SV: "물결의 온기 탐험가",
};

describe("calculateEffectiveTraitEvidenceWeight", () => {
  it("uses assessment evidence quality but never a paid accuracy multiplier", () => {
    const weight = calculateEffectiveTraitEvidenceWeight(
      evidence({
        approvalStatus: "approved",
        constructDirectness: 0.8,
        measurementAmount: 1,
        repetitionDiscount: 0.5,
        responseQuality: 0.9,
        sourceKind: "free_topic",
      }),
    );

    expect(weight).toBeCloseTo(
      dynamicTraitSourceWeights.free_topic * 1 * 0.8 * 0.9 * 1 * 1 * 0.5,
    );
  });

  it("excludes help and blocked observations from scoring", () => {
    expect(
      calculateEffectiveTraitEvidenceWeight(
        evidence({ sourceKind: "help", approvalStatus: "approved" }),
      ),
    ).toBe(0);
    expect(
      calculateEffectiveTraitEvidenceWeight(
        evidence({ sourceKind: "free_topic", approvalStatus: "blocked" }),
      ),
    ).toBe(0);
  });
});

describe("calculateDynamicTraitSnapshot", () => {
  it("keeps a previous code when one lightweight topic result is not enough evidence", () => {
    const snapshot = calculateDynamicTraitSnapshot({
      domains,
      observations: [
        evidence({
          id: "topic-1",
          score: 22,
          sourceKind: "free_topic",
          target: { kind: "domain", id: "SE" },
        }),
        evidence({
          id: "full-er",
          score: 30,
          sourceKind: "full_core",
          target: { kind: "domain", id: "ER" },
        }),
      ],
      previous: {
        code: "TC",
        domains: [
          { domainId: "SE", score: 72, symbol: "T" },
          { domainId: "ER", score: 30, symbol: "C" },
        ],
      },
      profileNames,
    });

    expect(snapshot.version).toBe(dynamicTraitEvidenceVersion);
    expect(snapshot.domains[0]).toMatchObject({
      rawSymbol: "S",
      symbol: "T",
      change: "held_for_stability",
    });
    expect(snapshot.code).toBe("TC");
  });

  it("changes the current representative code after enough repeated opposing evidence", () => {
    const snapshot = calculateDynamicTraitSnapshot({
      domains,
      observations: [
        evidence({
          id: "full-se",
          score: 40,
          sourceKind: "full_core",
          target: { kind: "domain", id: "SE" },
        }),
        evidence({
          id: "topic-se-1",
          score: 20,
          sourceKind: "free_topic",
          target: { kind: "facet", id: "SE-RE" },
        }),
        evidence({
          id: "topic-se-2",
          score: 30,
          sourceKind: "free_topic",
          target: { kind: "facet", id: "SE-AI" },
        }),
        evidence({
          id: "full-er",
          score: 30,
          sourceKind: "full_core",
          target: { kind: "domain", id: "ER" },
        }),
      ],
      previous: {
        code: "TC",
        domains: [
          { domainId: "SE", score: 72, symbol: "T" },
          { domainId: "ER", score: 30, symbol: "C" },
        ],
      },
      profileNames,
    });

    expect(snapshot.domains[0]).toMatchObject({
      rawSymbol: "S",
      symbol: "S",
      change: "code_changed",
    });
    expect(snapshot.code).toBe("SC");
    expect(snapshot.profileName).toBe("숲의 균형 탐험가");
  });

  it("marks boundary domains and offers nearby alternative codes", () => {
    const snapshot = calculateDynamicTraitSnapshot({
      domains,
      observations: [
        evidence({
          id: "full-se",
          score: 50,
          sourceKind: "full_core",
          target: { kind: "domain", id: "SE" },
        }),
        evidence({
          id: "full-er",
          score: 72,
          sourceKind: "full_core",
          target: { kind: "domain", id: "ER" },
        }),
      ],
      profileNames,
    });

    expect(snapshot.domains[0]).toMatchObject({
      isBoundary: true,
      change: "boundary",
      symbol: "T",
    });
    expect(snapshot.code).toBe("TV");
    expect(snapshot.alternativeCodes).toContain("SV");
  });
});

function evidence(
  overrides: Partial<TraitEvidenceObservation> = {},
): TraitEvidenceObservation {
  return {
    approvalStatus: "approved",
    constructDirectness: 1,
    id: "evidence",
    measurementAmount: 1,
    observedAt: "2026-07-10T00:00:00.000Z",
    recency: 1,
    repetitionDiscount: 1,
    responseQuality: 1,
    score: 70,
    sourceKind: "full_core",
    target: { kind: "domain", id: "SE" },
    ...overrides,
  };
}
