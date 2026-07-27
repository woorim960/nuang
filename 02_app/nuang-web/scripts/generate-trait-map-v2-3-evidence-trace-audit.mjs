import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const docsDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2",
);
const generatedDirectory = path.join(docsDirectory, "generated");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "117_EVIDENCE_TRACE_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const evidenceFiles = [
  "src/features/nuang-code/trait-map-change-context-evidence-v2.ts",
  "src/features/nuang-code/trait-map-foundation-evidence-v2.ts",
  "src/features/nuang-code/trait-map-friendship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-relationship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-process-evidence-v2.ts",
  "src/features/nuang-code/trait-map-work-evidence-v2.ts",
];
const ledger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const sourceRegistry = new Map();
const findingRegistry = new Set();
for (const fileName of evidenceFiles) {
  const source = fs.readFileSync(path.join(projectRoot, fileName), "utf8");
  for (const entry of parseNormalizedSources(source, fileName)) {
    sourceRegistry.set(entry.sourceId, entry);
  }
  for (const findingId of parseFindingIds(source)) {
    findingRegistry.add(findingId);
  }
}
const draftById = new Map();
const riskDomainsById = new Map();
for (let index = 1; index <= 12; index += 1) {
  const batchId = `CAB_${String(index).padStart(2, "0")}`;
  const draft = readJson(
    `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${batchId}_V2_3.json`,
  );
  for (const scenario of draft.scenarios) {
    for (const variant of scenario.claimSlots.flatMap(
      (slot) => slot.variants,
    )) {
      draftById.set(variant.canonicalVariantId, variant);
      riskDomainsById.set(
        variant.canonicalVariantId,
        scenario.riskDomains,
      );
    }
  }
}

const entries = ledger.entries.map((entry) => {
  const draft = draftById.get(entry.canonicalVariantId);
  if (!draft) {
    throw new Error(
      `Missing research draft lineage: ${entry.canonicalVariantId}`,
    );
  }
  const sourceUnits = draft.includedUnits ?? [];
  const evidenceFindingRefs = [
    ...new Set(
      sourceUnits.flatMap(
        (unit) => unit.evidenceFindingRefs ?? [],
      ),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const registeredSourceRefs = [
    ...new Set(
      sourceUnits.flatMap(
        (unit) => unit.independentSourceRefs ?? [],
      ),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const unknownFindingRefs = evidenceFindingRefs.filter(
    (findingId) => !findingRegistry.has(findingId),
  );
  const unknownSourceRefs = registeredSourceRefs.filter(
    (sourceId) => !sourceRegistry.has(sourceId),
  );
  const excludedSourceRefs = registeredSourceRefs.filter(
    (sourceId) =>
      sourceRegistry.get(sourceId)?.screeningStatus === "excluded",
  );
  const riskDomains = riskDomainsById.get(entry.canonicalVariantId);
  const highRisk = riskDomains.some(
    (domain) => domain !== "none",
  );
  const minimumDistinctRegisteredSources = highRisk ? 2 : 1;
  const structuralEvidencePassed =
    sourceUnits.length > 0 &&
    evidenceFindingRefs.length > 0 &&
    registeredSourceRefs.length >= minimumDistinctRegisteredSources &&
    unknownFindingRefs.length === 0 &&
    unknownSourceRefs.length === 0 &&
    excludedSourceRefs.length === 0;
  return {
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    scenarioRef: entry.scenarioRef,
    axisSignature: entry.axisSignature,
    semanticAxes: entry.semanticAxes,
    riskDomains,
    highRisk,
    sourceUnitIds: sourceUnits.map((unit) => unit.unitId),
    evidenceFindingRefs,
    registeredSourceRefs,
    minimumDistinctRegisteredSources,
    unknownFindingRefs,
    unknownSourceRefs,
    excludedSourceRefs,
    wordingRevisionRequiresIndependentScopeReview: entry.version > 1,
    structuralEvidencePassed,
    evidenceInterpretationState:
      "registered_trace_complete_claim_scope_review_pending",
    publicationState: "research_only",
  };
});
const failures = entries.filter(
  (entry) => !entry.structuralEvidencePassed,
);
const report = {
  contractVersion:
    "nuang-trait-map-evidence-trace-audit.v2.3",
  reportId: "TRAIT-MAP-EVIDENCE-TRACE-AUDIT.2.3",
  status:
    failures.length === 0
      ? "EVIDENCE_TRACE_STRUCTURALLY_COMPLETE_SCOPE_REVIEW_PENDING"
      : "EVIDENCE_TRACE_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  summary: {
    canonicalVariants: entries.length,
    variantsWithSourceUnits: entries.filter(
      (entry) => entry.sourceUnitIds.length > 0,
    ).length,
    variantsWithFindings: entries.filter(
      (entry) => entry.evidenceFindingRefs.length > 0,
    ).length,
    variantsWithAtLeastTwoRegisteredSources: entries.filter(
      (entry) => entry.registeredSourceRefs.length >= 2,
    ).length,
    relationshipOutcomeVariants: entries.filter((entry) =>
      entry.riskDomains.includes("relationship_outcome"),
    ).length,
    workPerformanceVariants: entries.filter((entry) =>
      entry.riskDomains.includes("work_performance"),
    ).length,
    highRiskVariantsMeetingTwoSourceRule: entries.filter(
      (entry) =>
        entry.highRisk &&
        entry.registeredSourceRefs.length >= 2 &&
        entry.unknownSourceRefs.length === 0 &&
        entry.excludedSourceRefs.length === 0,
    ).length,
    highRiskVariants: entries.filter((entry) => entry.highRisk).length,
    unknownFindingRefs: new Set(
      entries.flatMap((entry) => entry.unknownFindingRefs),
    ).size,
    unknownSourceRefs: new Set(
      entries.flatMap((entry) => entry.unknownSourceRefs),
    ).size,
    excludedSourceRefsUsed: new Set(
      entries.flatMap((entry) => entry.excludedSourceRefs),
    ).size,
    structurallyPassedVariants: entries.length - failures.length,
    structuralFailures: failures.length,
    wordingRevisionsNeedingIndependentScopeReview: entries.filter(
      (entry) => entry.wordingRevisionRequiresIndependentScopeReview,
    ).length,
    evidenceSourcesInRegistry: sourceRegistry.size,
    evidenceFindingsInRegistry: findingRegistry.size,
    independentClaimScopeApprovedVariants: 0,
    customerApprovedEntries: 0,
  },
  auditRules: [
    "모든 canonical 문장은 하나 이상의 source unit과 finding, 등록 출처를 가져야 한다.",
    "relationship_outcome·work_performance 위험 영역은 서로 다른 등록 sourceRef를 둘 이상 가져야 한다.",
    "출처 ID가 둘이라는 사실만으로 연구 설계·저자·표본의 실질적 독립성을 승인하지 않는다.",
    "문장 교정 뒤에도 근거가 새 표현의 범위를 지지하는지는 독립 역할이 다시 판정한다.",
  ],
  failures,
  entries,
  nextGate: {
    name: "EVIDENCE_SEMANTIC_SCOPE_AND_DEPENDENCE_REVIEW",
    actions: [
      "P0와 P1 패킷에서 현재 문장이 finding의 실제 결과 범위를 넘지 않는지 판정한다.",
      "두 sourceRef가 같은 표본·데이터·연구팀에 의존하는지 서지 수준에서 확인한다.",
      "관계 결과·업무 수행 문장은 예측 문구가 아니라 경향 설명으로 제한됐는지 검토한다.",
    ],
  },
};
if (
  report.summary.canonicalVariants !== 605 ||
  report.summary.structuralFailures !== 0 ||
  report.summary.highRiskVariantsMeetingTwoSourceRule !==
    report.summary.highRiskVariants
) {
  throw new Error("v2.3 evidence trace audit failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 evidence trace audit is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Evidence trace v2.3: ${entries.length} variants, high-risk ${report.summary.highRiskVariantsMeetingTwoSourceRule}/${report.summary.highRiskVariants} with 2+ registered sources, unknown findings ${report.summary.unknownFindingRefs}, unknown sources ${report.summary.unknownSourceRefs}, structural failures ${failures.length}.`,
);

function parseNormalizedSources(source, sourceFile) {
  const sourceSection = source.split(
    /export const .*EvidenceFindingsV2\s*=/,
  )[0];
  return [
    ...sourceSection.matchAll(
      /sourceId:\s*"(SRC-[A-Z0-9-]+)"[\s\S]*?screeningStatus:\s*"(candidate|included|excluded|replaced)"/g,
    ),
  ].map((match) => ({
    sourceId: match[1],
    screeningStatus: match[2],
    sourceFile,
  }));
}

function parseFindingIds(source) {
  const findingSection =
    source.split(/export const .*EvidenceFindingsV2\s*=/)[1] ?? "";
  return [
    ...findingSection.matchAll(/findingId:\s*"(FND-[A-Z0-9-]+)"/g),
  ].map((match) => match[1]);
}

function buildMarkdown(result) {
  return `# v2.3 근거 추적 전수 감사

- canonical: ${result.summary.canonicalVariants}
- source unit 연결: ${result.summary.variantsWithSourceUnits}
- finding 연결: ${result.summary.variantsWithFindings}
- 등록 출처 2개 이상: ${result.summary.variantsWithAtLeastTwoRegisteredSources}
- 관계 결과 위험 문장: ${result.summary.relationshipOutcomeVariants}
- 업무 수행 위험 문장: ${result.summary.workPerformanceVariants}
- 고위험 2출처 규칙: ${result.summary.highRiskVariantsMeetingTwoSourceRule}/${result.summary.highRiskVariants}
- 알 수 없는 finding: ${result.summary.unknownFindingRefs}
- 알 수 없는 출처: ${result.summary.unknownSourceRefs}
- 제외 출처 사용: ${result.summary.excludedSourceRefsUsed}
- 구조 실패: ${result.summary.structuralFailures}
- 독립 범위 승인: 0

605개 문장을 연구 초안의 source unit, finding, 등록 출처까지 역추적했다.
관계 결과와 업무 수행 위험 영역은 서로 다른 등록 sourceRef 두 개 이상을
요구했으며 모든 문장이 구조 규칙을 통과했다.

다만 출처 ID가 둘이라는 사실은 연구팀·표본·데이터의 실질적 독립성이나
현재 문장의 구체적 표현 범위를 승인하지 않는다. 이 두 항목은 P0·P1
독립 검토와 서지 의존성 판독에서 확인하며, 전 문장은 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
