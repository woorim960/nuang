import {
  traitProfileFixtureContractVersion,
  traitProfileFixtureSchema,
  type TraitProfileFixture,
} from "@/features/nuang-code/trait-map-knowledge-contract";

const mapVersion = "ENAKQ.map.v0.1-draft";
const expectedSuppressedClaimIds = [
  "ENAKQ.general.inner.A",
  "ENAKQ.general.response.AA",
  "ENAKQ.general.response.AG",
  "ENAKQ.process.first_orientation",
  "ENAKQ.process.enacted_response",
  "ENAKQ.process.personal_display",
  "ENAKQ.stress.recovery",
  "ENAKQ.daily.rest",
] as const;

const syntheticPrivacy = {
  synthetic: true,
  includesDirectResponses: false,
  includesRawScorePayload: false,
} as const;

const clearFixture = {
  availableSignals: ["domain_scores", "facet_scores", "relationship_context"],
  code: "ENAKQ",
  contractVersion: traitProfileFixtureContractVersion,
  domainScores: [
    domain("SE", "E", "I", 78, false),
    domain("OE", "N", "R", 74, false),
    domain("RO", "A", "G", 69, false),
    domain("SM", "K", "M", 76, false),
    domain("ER", "Q", "C", 71, false),
  ],
  expectedSuppressedClaimIds,
  facetScores: [
    facet("SE-RE", 81),
    facet("SE-AI", 72),
    facet("OE-AE", 70),
    facet("OE-CI", 76),
    facet("OE-IE", 75),
    facet("RO-EC", 69),
    facet("SM-EP", 79),
    facet("SM-OS", 72),
    facet("SM-RL", 77),
    facet("ER-IR", 73),
    facet("ER-WD", 69),
  ],
  fixtureId: "ENAKQ.clear.v0.1",
  kind: "clear",
  mapVersion,
  privacy: syntheticPrivacy,
} as const;

const boundaryFixture = {
  availableSignals: ["domain_scores", "facet_scores", "relationship_context"],
  code: "ENAKQ",
  contractVersion: traitProfileFixtureContractVersion,
  domainScores: [
    domain("SE", "E", "I", 54, true),
    domain("OE", "N", "R", 53, true),
    domain("RO", "A", "G", 52, true),
    domain("SM", "K", "M", 55, true),
    domain("ER", "Q", "C", 51, true),
  ],
  expectedSuppressedClaimIds,
  facetScores: [
    facet("SE-RE", 56),
    facet("SE-AI", 52),
    facet("OE-AE", 55),
    facet("OE-CI", 51),
    facet("OE-IE", 53),
    facet("RO-EC", 52),
    facet("SM-EP", 56),
    facet("SM-OS", 53),
    facet("SM-RL", 55),
    facet("ER-IR", 52),
    facet("ER-WD", 50),
  ],
  fixtureId: "ENAKQ.boundary.v0.1",
  kind: "boundary",
  mapVersion,
  privacy: syntheticPrivacy,
} as const;

const facetSplitFixture = {
  availableSignals: ["domain_scores", "facet_scores", "relationship_context"],
  code: "ENAKQ",
  contractVersion: traitProfileFixtureContractVersion,
  domainScores: [
    domain("SE", "E", "I", 68, false),
    domain("OE", "N", "R", 66, false),
    domain("RO", "A", "G", 64, false),
    domain("SM", "K", "M", 67, false),
    domain("ER", "Q", "C", 65, false),
  ],
  expectedSuppressedClaimIds,
  facetScores: [
    facet("SE-RE", 82),
    facet("SE-AI", 38),
    facet("OE-AE", 79),
    facet("OE-CI", 42),
    facet("OE-IE", 77),
    facet("RO-EC", 64),
    facet("SM-EP", 81),
    facet("SM-OS", 41),
    facet("SM-RL", 78),
    facet("ER-IR", 80),
    facet("ER-WD", 43),
  ],
  fixtureId: "ENAKQ.facet-split.v0.1",
  kind: "facet_split",
  mapVersion,
  privacy: syntheticPrivacy,
} as const;

export const enakqTraitProfileFixtures: readonly TraitProfileFixture[] = [
  clearFixture,
  boundaryFixture,
  facetSplitFixture,
].map((fixture) => traitProfileFixtureSchema.parse(fixture));

export const enakqClearFixture = enakqTraitProfileFixtures[0];
export const enakqBoundaryFixture = enakqTraitProfileFixtures[1];
export const enakqFacetSplitFixture = enakqTraitProfileFixtures[2];

function domain(
  domainId: "SE" | "OE" | "RO" | "SM" | "ER",
  highSymbol: "E" | "N" | "A" | "K" | "Q",
  lowSymbol: "I" | "R" | "G" | "M" | "C",
  highPercent: number,
  isBoundary: boolean,
) {
  return {
    domainId,
    highSymbol,
    highPercent,
    isBoundary,
    lowSymbol,
    lowPercent: 100 - highPercent,
    selectedSymbol: highPercent >= 50 ? highSymbol : lowSymbol,
  };
}

function facet(facetId: string, highPercent: number) {
  return {
    direction: highPercent >= 50 ? ("high" as const) : ("low" as const),
    facetId,
    highPercent,
    isBoundary: Math.abs(highPercent - 50) <= 5,
  };
}
