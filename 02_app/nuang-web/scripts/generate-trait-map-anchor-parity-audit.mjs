import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const generatedDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated",
);
const outputPath = path.join(
  generatedDirectory,
  "ANCHOR_PROFILE_PARITY_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const enakqBaseline = readGenerated("ENAKQ_BASELINE_MANIFEST.json");
const enakqLongform = fs.existsSync(
  path.join(generatedDirectory, "ENAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json"),
)
  ? readGenerated("ENAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json")
  : null;
const enakqScenarios = readGenerated("ENAKQ_SCENARIO_REVIEW_V2.json");
const enakqCoverage = readGenerated("ENAKQ_SCENARIO_RESEARCH_COVERAGE_V2.json");
const enakqCopy = readGenerated("ENAKQ_SCENARIO_COPY_AUDIT_V2.json");
const enakqNeighbors = JSON.parse(
  fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/nuang-code/fixtures/enakq-v2-neighbor-claims.generated.json",
    ),
    "utf8",
  ),
);
const irgmcLongform = readGenerated("IRGMC_LONGFORM_RESEARCH_MANIFEST_V2.json");
const irgmcScenarios = readGenerated("IRGMC_SCENARIO_REVIEW_V2.json");
const irgmcCoverage = readGenerated("IRGMC_SCENARIO_RESEARCH_COVERAGE_V2.json");
const irgmcCopy = readGenerated("IRGMC_SCENARIO_COPY_AUDIT_V2.json");
const irgmcNeighbors = fs.existsSync(
  path.join(generatedDirectory, "IRGMC_NEIGHBOR_REVIEW_V2.json"),
)
  ? readGenerated("IRGMC_NEIGHBOR_REVIEW_V2.json")
  : null;

const profiles = {
  ENAKQ: {
    longformCharacters:
      enakqLongform?.totalNonWhitespaceCharacters ??
      enakqBaseline.currentMetrics.totalNonWhitespaceCharacters,
    chapterCount:
      enakqLongform?.chapters.length ??
      enakqBaseline.currentMetrics.chapterCount,
    normalizedLongformManifest: enakqLongform !== null,
    structuredScenarioCount: enakqCoverage.totalResearchCandidateCovered,
    structuredScenarioClaims: enakqScenarios.claims.length,
    automaticCopyPasses: enakqCopy.automaticPasses,
    structuredNeighborClaims: enakqNeighbors.claimCount,
    neighborCount: enakqNeighbors.neighborCodes.length,
    normalizedEvidenceSourceCount:
      enakqLongform?.evidenceSourceRefs.length ?? null,
    customerApprovedClaims: 0,
  },
  IRGMC: {
    longformCharacters: irgmcLongform.totalNonWhitespaceCharacters,
    chapterCount: irgmcLongform.chapters.length,
    normalizedLongformManifest: true,
    structuredScenarioCount: irgmcCoverage.totalResearchCandidateCovered,
    structuredScenarioClaims: irgmcScenarios.claims.length,
    automaticCopyPasses: irgmcCopy.automaticPasses,
    structuredNeighborClaims: irgmcNeighbors?.claimCount ?? 0,
    neighborCount: irgmcLongform.neighborContrastCodes.length,
    normalizedEvidenceSourceCount: irgmcLongform.evidenceSourceRefs.length,
    customerApprovedClaims: 0,
  },
};

const gates = [
  {
    gateId: "scenario_inventory",
    required: "각 기준 성향 72개",
    enakq: profiles.ENAKQ.structuredScenarioCount,
    irgmc: profiles.IRGMC.structuredScenarioCount,
    status:
      profiles.ENAKQ.structuredScenarioCount === 72 &&
      profiles.IRGMC.structuredScenarioCount === 72
        ? "PASS"
        : "BLOCKED",
  },
  {
    gateId: "four_channel_claims",
    required: "각 기준 성향 288개",
    enakq: profiles.ENAKQ.structuredScenarioClaims,
    irgmc: profiles.IRGMC.structuredScenarioClaims,
    status:
      profiles.ENAKQ.structuredScenarioClaims === 288 &&
      profiles.IRGMC.structuredScenarioClaims === 288
        ? "PASS"
        : "BLOCKED",
  },
  {
    gateId: "automatic_copy_audit",
    required: "각 기준 성향 288/288",
    enakq: profiles.ENAKQ.automaticCopyPasses,
    irgmc: profiles.IRGMC.automaticCopyPasses,
    status:
      profiles.ENAKQ.automaticCopyPasses === 288 &&
      profiles.IRGMC.automaticCopyPasses === 288
        ? "PASS"
        : "BLOCKED",
  },
  {
    gateId: "longform_character_range",
    required: "각 기준 성향 공백 제외 50,000자 이상",
    enakq: profiles.ENAKQ.longformCharacters,
    irgmc: profiles.IRGMC.longformCharacters,
    status:
      withinLongformRange(profiles.ENAKQ.longformCharacters) &&
      withinLongformRange(profiles.IRGMC.longformCharacters)
        ? "PASS"
        : "BLOCKED",
  },
  {
    gateId: "normalized_16_chapter_manifest",
    required: "각 기준 성향 16개 장과 v2 manifest",
    enakq: {
      chapterCount: profiles.ENAKQ.chapterCount,
      manifest: profiles.ENAKQ.normalizedLongformManifest,
    },
    irgmc: {
      chapterCount: profiles.IRGMC.chapterCount,
      manifest: profiles.IRGMC.normalizedLongformManifest,
    },
    status:
      profiles.ENAKQ.chapterCount === 16 &&
      profiles.ENAKQ.normalizedLongformManifest &&
      profiles.IRGMC.chapterCount === 16 &&
      profiles.IRGMC.normalizedLongformManifest
        ? "PASS"
        : "BLOCKED",
  },
  {
    gateId: "structured_neighbor_contrasts",
    required: "각 기준 성향 5개 이웃·20개 claim",
    enakq: profiles.ENAKQ.structuredNeighborClaims,
    irgmc: profiles.IRGMC.structuredNeighborClaims,
    status:
      profiles.ENAKQ.structuredNeighborClaims === 20 &&
      profiles.IRGMC.structuredNeighborClaims === 20
        ? "PASS"
        : "BLOCKED",
  },
];
const audit = {
  contractVersion: "nuang-trait-map-data-center.v2",
  auditId: "ANCHOR-PROFILE-PARITY.0.1",
  status: gates.every((gate) => gate.status === "PASS")
    ? "ANCHORS_STRUCTURALLY_ALIGNED_REVIEW_REQUIRED"
    : "ANCHOR_ALIGNMENT_IN_PROGRESS",
  anchors: ["ENAKQ", "IRGMC"],
  profiles,
  gates,
  passedGates: gates.filter((gate) => gate.status === "PASS").length,
  blockedGates: gates.filter((gate) => gate.status !== "PASS").length,
  nextWork: [
    ...(profiles.ENAKQ.normalizedLongformManifest
      ? []
      : ["ENAKQ를 16개 장 v2 장문 manifest로 재편집하고 정규화된 근거만 연결"]),
    ...(profiles.IRGMC.structuredNeighborClaims === 20
      ? []
      : ["IRGMC 한 글자 이웃 5개를 20개 독립 contrast claim으로 분리"]),
    "두 기준점의 중복·모순·가치 편향을 교차 감사",
    "E/I부터 두 방향의 bridge pair 제작 시작",
  ],
  publicationRule:
    "구조 정렬은 고객 공개 승인이 아니다. 인지 인터뷰, 정량 검증, 전문 검토가 별도로 필요하다.",
};

const output = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "Anchor parity audit is stale. Run npm run research:trait-map:v2:anchor-parity.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `Anchor parity audit: ${audit.passedGates}/${gates.length} gates passed, ${audit.blockedGates} alignment gates remain.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function withinLongformRange(value) {
  return value >= 50_000;
}
