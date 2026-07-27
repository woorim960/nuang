import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(
  projectRoot,
  "docs/trait-maps/ENAKQ/ENAKQ_NEIGHBOR_CONTRAST_DRAFT_V2.md",
);
const outputPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-v2-neighbor-claims.generated.json",
);
const checkOnly = process.argv.includes("--check");

const reviewStates = {
  personality_psychology: "not_started",
  psychometrics: "not_started",
  relationship_psychology: "not_started",
  clinical_safety: "not_started",
  plain_korean: "not_started",
  product: "not_started",
  design: "not_started",
};

const neighborConfig = {
  INAKQ: {
    findingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
      "FND-EXTRAVERSION-NOT-SIMPLE-HAPPINESS",
    ],
    sourceRefs: [
      "SRC-BFI2-2017",
      "SRC-IPC-2013",
      "SRC-EXTRAVERSION-PA-2015",
    ],
  },
  ERAKQ: {
    findingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-OPENNESS-INTELLECT-DISTINCTION",
    ],
    sourceRefs: ["SRC-BFI2-2017", "SRC-OPENNESS-INTELLECT-2009"],
  },
  ENGKQ: {
    findingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ],
    sourceRefs: ["SRC-BFI2-2017", "SRC-IPC-2013"],
  },
  ENAMQ: {
    findingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-BFAS-DOMAIN-ASPECT-DISTINCTION",
    ],
    sourceRefs: ["SRC-BFI2-2017", "SRC-BFAS-2007"],
  },
  ENAKC: {
    findingRefs: [
      "FND-BFI2-HIERARCHICAL-FACETS",
      "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ],
    sourceRefs: ["SRC-BFI2-2017", "SRC-EMOTION-PROCESS-1998"],
  },
};

const blockConfig = {
  "ENAKQ-V2-NBR-I-01": {
    kind: "evidence_statement",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-3"],
  },
  "ENAKQ-V2-NBR-I-02": {
    kind: "attention",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-2", "SCN-GENERAL-3"],
  },
  "ENAKQ-V2-NBR-I-03": {
    kind: "actual_response",
    contexts: ["person_of_interest"],
    scenarios: ["SCN-PERSON-OF-INTEREST-2", "SCN-PERSON-OF-INTEREST-8"],
  },
  "ENAKQ-V2-NBR-I-04": {
    kind: "misunderstanding",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-8"],
  },
  "ENAKQ-V2-NBR-R-01": {
    kind: "evidence_statement",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-1"],
  },
  "ENAKQ-V2-NBR-R-02": {
    kind: "attention",
    contexts: ["general", "work"],
    scenarios: ["SCN-GENERAL-5", "SCN-WORK-5"],
  },
  "ENAKQ-V2-NBR-R-03": {
    kind: "decision",
    contexts: ["general", "work"],
    scenarios: ["SCN-GENERAL-1", "SCN-WORK-1"],
  },
  "ENAKQ-V2-NBR-R-04": {
    kind: "misunderstanding",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-5"],
  },
  "ENAKQ-V2-NBR-G-01": {
    kind: "evidence_statement",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-7"],
  },
  "ENAKQ-V2-NBR-G-02": {
    kind: "attention",
    contexts: ["friend", "partner", "work"],
    scenarios: ["SCN-FRIEND-7", "SCN-PARTNER-7", "SCN-WORK-7"],
  },
  "ENAKQ-V2-NBR-G-03": {
    kind: "actual_response",
    contexts: ["friend", "partner", "work"],
    scenarios: ["SCN-FRIEND-7", "SCN-PARTNER-7", "SCN-WORK-7"],
  },
  "ENAKQ-V2-NBR-G-04": {
    kind: "conversation_guide",
    contexts: ["friend", "partner", "work"],
    scenarios: ["SCN-FRIEND-7", "SCN-PARTNER-7", "SCN-WORK-7"],
  },
  "ENAKQ-V2-NBR-M-01": {
    kind: "evidence_statement",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-4"],
  },
  "ENAKQ-V2-NBR-M-02": {
    kind: "follow_through",
    contexts: ["general", "work"],
    scenarios: ["SCN-GENERAL-1", "SCN-WORK-1"],
  },
  "ENAKQ-V2-NBR-M-03": {
    kind: "actual_response",
    contexts: ["general", "work"],
    scenarios: ["SCN-GENERAL-4", "SCN-WORK-4"],
  },
  "ENAKQ-V2-NBR-M-04": {
    kind: "misunderstanding",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-4"],
  },
  "ENAKQ-V2-NBR-C-01": {
    kind: "evidence_statement",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-11"],
  },
  "ENAKQ-V2-NBR-C-02": {
    kind: "emotional_activation",
    contexts: ["partner", "person_of_interest"],
    scenarios: ["SCN-PARTNER-5", "SCN-PERSON-OF-INTEREST-5"],
  },
  "ENAKQ-V2-NBR-C-03": {
    kind: "actual_response",
    contexts: ["general"],
    scenarios: ["SCN-GENERAL-11", "SCN-GENERAL-12"],
  },
  "ENAKQ-V2-NBR-C-04": {
    kind: "conversation_guide",
    contexts: ["partner", "person_of_interest"],
    scenarios: ["SCN-PARTNER-5", "SCN-PERSON-OF-INTEREST-5"],
  },
};

const source = fs.readFileSync(sourcePath, "utf8");
const markers = [
  ...source.matchAll(
    /<!-- block: (ENAKQ-V2-NBR-[A-Z]-\d{2}); claims: (ENAKQ\.neighbor\.([A-Z]{5})\.[a-z_]+) -->/g,
  ),
];

const claims = markers.map((marker, index) => {
  const [, blockId, claimId, neighborCode] = marker;
  const blockStart = marker.index + marker[0].length;
  const nextMarkerIndex = markers[index + 1]?.index ?? source.length;
  const rawBlock = source.slice(blockStart, nextMarkerIndex);
  const headingIndex = rawBlock.search(/\n##\s/);
  const assertion = normalizeMarkdown(
    headingIndex >= 0 ? rawBlock.slice(0, headingIndex) : rawBlock,
  );
  const config = blockConfig[blockId];
  const evidence = neighborConfig[neighborCode];
  if (!config || !evidence) {
    throw new Error(`Missing neighbor configuration for ${blockId}`);
  }

  const requiredSignals = new Set([
    "representative_code",
    "domain_scores",
    "scenario_context",
  ]);
  if (config.contexts.some((context) => context !== "general")) {
    requiredSignals.add("relationship_context");
  }
  if (
    config.kind === "actual_response" ||
    config.kind === "emotional_activation"
  ) {
    requiredSignals.add("private_process_signals");
  }

  return {
    claim: {
      claimId,
      entity: { kind: "interaction", ref: `ENAKQ<>${neighborCode}` },
      scope: "contrast",
      claimKind: config.kind,
      assertion,
      contexts: config.contexts,
      scenarioRefs: config.scenarios,
      requiredSignals: [...requiredSignals],
      evidenceFindingRefs: evidence.findingRefs,
      independentSourceRefs: evidence.sourceRefs,
      evidenceStatus: "mapped_provisional",
      evidenceGrade: "C",
      privacyScope:
        config.kind === "actual_response" ? "self_only" : "comparison_safe",
      riskDomains: ["none"],
      publicationState: "research_only",
      reviews: reviewStates,
    },
    migration: {
      sourceBlockId: blockId,
      sourceFile:
        "docs/trait-maps/ENAKQ/ENAKQ_NEIGHBOR_CONTRAST_DRAFT_V2.md",
      evidenceLinkStatus: "foundation_only_needs_neighbor_specific_review",
      symmetryReviewStatus: "not_started",
      copyStatus: "research_draft_not_customer_content",
    },
  };
});

const packet = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "ENAKQ-V2-NEIGHBOR-CONTRASTS.0.1",
  code: "ENAKQ",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  neighborCodes: Object.keys(neighborConfig),
  claimCount: claims.length,
  claims,
  summary: {
    claimsPerNeighbor: Object.fromEntries(
      Object.keys(neighborConfig).map((neighborCode) => [
        neighborCode,
        claims.filter(
          (item) => item.claim.entity.ref === `ENAKQ<>${neighborCode}`,
        ).length,
      ]),
    ),
    approvedClaims: 0,
    requiredNextReviews: [
      "one_letter_difference",
      "axis_measurement_scope",
      "bidirectional_symmetry",
      "value_bias",
      "plain_korean_cognitive_interview",
      "quantitative_neighbor_discrimination",
    ],
  },
};

const output = await prettier.format(JSON.stringify(packet), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "ENAKQ v2 neighbor packet is stale. Run npm run research:trait-map:v2:enakq-neighbors.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ neighbor packet is current: ${claims.length} claims across ${packet.neighborCodes.length} neighbors.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${claims.length} neighbor claims.`,
  );
}

function normalizeMarkdown(value) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
