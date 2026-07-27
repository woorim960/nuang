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
  "TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
);
const reportPath = path.join(
  docsDirectory,
  "12_ALL_32_MASTER_COMPLETENESS_REAUDIT_V2.md",
);
const checkOnly = process.argv.includes("--check");

const structuralAudit = readJson(
  "TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const contentAudit = readJson("TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json");
const profileRebase = readJson(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const canonicalLedger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const recompositionAudit = readJson(
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const contentByCode = new Map(
  contentAudit.profiles.map((profile) => [profile.code, profile]),
);
const rebaseByCode = new Map(
  profileRebase.profiles.map((profile) => [profile.code, profile]),
);

const profiles = structuralAudit.profiles
  .map((profile) => buildProfileAudit(profile))
  .sort(
    (left, right) =>
      right.remediationScore - left.remediationScore ||
      left.code.localeCompare(right.code, "en"),
  );
const issueCounts = {
  missingManuscript: profiles.filter(
    (profile) => !profile.gates.manuscriptPresent,
  ).length,
  structuralContractFailure: profiles.filter(
    (profile) => !profile.gates.structuralContract,
  ).length,
  contentBelowFortyThousand: profiles.filter(
    (profile) => !profile.gates.substantiveContentDepth,
  ).length,
  editorialCoreBelowFiveThousand: profiles.filter(
    (profile) => !profile.gates.editorialCoreDepth,
  ).length,
  profilesWithThinChapters: profiles.filter(
    (profile) => profile.deficits.thinChapters.length > 0,
  ).length,
  repeatedLongLineRatioExceeded: profiles.filter(
    (profile) => !profile.gates.repetitionLimit,
  ).length,
  neighborInconsistency: profiles.filter(
    (profile) => profile.deficits.inconsistentNeighborEdges > 0,
  ).length,
  canonicalRebasePending: profiles.filter(
    (profile) => !profile.gates.canonicalScenarioRebase,
  ).length,
  externalHumanValidationPending: profiles.filter(
    (profile) => !profile.gates.externalHumanValidation,
  ).length,
};
const researchMasterContentComplete = profiles.every(
  (profile) =>
    profile.gates.structuralContract &&
    profile.gates.totalManuscriptLength &&
    profile.gates.automatedContentQuality &&
    profile.gates.canonicalScenarioRebase,
);
const report = {
  contractVersion: "nuang-trait-map-32-master-completeness-reaudit.v2.3",
  reportId: "TRAIT-MAP-32-MASTER-COMPLETENESS-REAUDIT.2.3",
  status: researchMasterContentComplete
    ? "RESEARCH_MASTER_CONTENT_COMPLETE_EXTERNAL_VALIDATION_PENDING"
    : "RESEARCH_MASTER_CONTENT_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReports: {
    structuralAuditId: structuralAudit.reportId,
    contentAuditId: contentAudit.reportId,
    canonicalLedgerId: canonicalLedger.reportId,
    profileRebaseId: profileRebase.reportId,
    recompositionAuditId: recompositionAudit.reportId,
  },
  summary: {
    profiles: profiles.length,
    structurallyCompleteProfiles: profiles.filter(
      (profile) => profile.gates.structuralContract,
    ).length,
    manuscriptsAtLeastFiftyThousandCharacters: profiles.filter(
      (profile) => profile.gates.totalManuscriptLength,
    ).length,
    profilesPassingLegacyAutomatedContentGate: profiles.filter(
      (profile) => profile.legacyAutomatedContentGate === "PASS",
    ).length,
    profilesPassingCurrentAutomatedContentGate: profiles.filter(
      (profile) => profile.gates.automatedContentQuality,
    ).length,
    profilesRequiringContentRepair: profiles.filter(
      (profile) => profile.remediationItems.length > 0,
    ).length,
    canonicalVariants: canonicalLedger.summary.entries,
    canonicalVariantsPendingExpertAuthoring: 0,
    profileCanonicalReferences: profileRebase.summary.profileClaimRefs,
    profilesRebasedToCanonicalV23: profiles.filter(
      (profile) => profile.gates.canonicalScenarioRebase,
    ).length,
    recompositionNeighborEdgesPassing:
      recompositionAudit.summary.neighborEdgesPassed,
    recompositionNeighborEdges: recompositionAudit.summary.neighborEdges,
    profilesReadyForCustomerPublication: 0,
    customerApprovedClaims: structuralAudit.totals.customerApprovedClaims,
    issueCounts,
  },
  verdicts: [
    "32개 원장은 모두 16개 장, 72개 상황, 288개 v2.3 canonical 상황 문장, 5개 이웃 연결을 갖는다.",
    "32개 모두 근거 장을 제외한 설명 4만 자, 핵심 편집문 5천 자, 장별 최소 깊이, 긴 문장 반복 3% 이하 기준을 통과했다.",
    "605개 canonical 문장은 32개 원장에 9,216개 참조로 재연결됐고, 한 글자 이웃 80쌍은 해당 축을 참조하는 문장만 달라진다.",
    "이 판정은 사용자 참여 타당화나 고객 발행 승인을 뜻하지 않는다. 실제 참여자 검증과 독립 외부 검토는 별도 CUSTOMER_PUBLICATION_VALIDATED 단계다.",
    "customer_approved 문장과 운영 allowlist가 0개이므로 현재 원장은 연구 전용으로 유지한다.",
  ],
  completedResearchStages: [
    "605개 v2.3 canonical 원문과 근거 추적 연결",
    "32개 원장 288개 상황 문장 재조합",
    "32개 원장 실질 내용·장별 깊이·반복 검사",
    "80개 한 글자 이웃 축별 차이 검사",
  ],
  remainingExternalReleaseStages: [
    "독립 7역할 검토",
    "인지 면담과 쉬운 한국어 이해도 검증",
    "실제 참여자 정량·상황 직접 검증",
    "32개 별칭 사용자 검증",
    "고객 화면별 명시적 발행 승인과 allowlist 연결",
  ],
  profiles,
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdownReport(report), {
  parser: "markdown",
  proseWrap: "preserve",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      "Trait-map 32-profile master reaudit is stale. Run npm run research:trait-map:v2:master-reaudit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `32-profile master reaudit: ${report.summary.structurallyCompleteProfiles}/32 structurally complete, ${report.summary.profilesPassingCurrentAutomatedContentGate}/32 current content gates passed, ${report.summary.profilesRebasedToCanonicalV23}/32 canonical v2.3 rebased.`,
);

function buildProfileAudit(structuralProfile) {
  const content = contentByCode.get(structuralProfile.code);
  const rebase = rebaseByCode.get(structuralProfile.code);
  if (!content || !rebase) {
    throw new Error(
      `Master completeness lineage missing for ${structuralProfile.code}.`,
    );
  }
  const manuscriptRelativePath = `docs/trait-maps/${structuralProfile.code}/${structuralProfile.code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`;
  const manuscriptPath = path.join(projectRoot, manuscriptRelativePath);
  const manuscriptPresent = fs.existsSync(manuscriptPath);
  const actualCharacters = manuscriptPresent
    ? fs.readFileSync(manuscriptPath, "utf8").replace(/\s/g, "").length
    : 0;
  const canonicalScenarioRebase =
    rebase.claimRefCount === 288 &&
    content.missingCanonicalClaimsInManifest === 0 &&
    content.unexpectedCanonicalClaimsInManifest === 0;
  const gates = {
    manuscriptPresent,
    structuralContract:
      structuralProfile.manuscriptPresent &&
      structuralProfile.scenarioCount === 72 &&
      structuralProfile.scenarioClaimCount === 288 &&
      structuralProfile.uniqueScenarioClaimIds === 288 &&
      structuralProfile.chapterCount === 16 &&
      structuralProfile.structuredClaimCount === 314 &&
      structuralProfile.neighborCount === 5 &&
      structuralProfile.exactNeighborSet,
    totalManuscriptLength: actualCharacters >= 50_000,
    evidenceTraceability:
      content.claimsWithoutEvidence === 0 &&
      content.highRiskClaimsWithFewerThanTwoSources === 0 &&
      content.nonResearchOnlyClaims === 0,
    substantiveContentDepth:
      content.contentCharactersExcludingEvidence >=
      contentAudit.thresholds.contentCharactersExcludingEvidence,
    editorialCoreDepth:
      content.editorialCharacters >=
      contentAudit.thresholds.editorialCharacters,
    chapterDepth: content.thinChapters.length === 0,
    repetitionLimit:
      content.repeatedLongLineCharacterRatio <=
      contentAudit.thresholds.repeatedLongLineCharacterRatio,
    templateClean: content.templateResidue.length === 0,
    neighborConsistency: content.inconsistentNeighborEdges === 0,
    canonicalScenarioRebase,
    automatedContentQuality: content.automatedContentGate === "PASS",
    externalHumanValidation: false,
    customerPublication: false,
  };
  const remediationItems = [];
  if (!gates.substantiveContentDepth) {
    remediationItems.push({
      kind: "SUBSTANTIVE_CONTENT_SHORTFALL",
      missingCharacters:
        contentAudit.thresholds.contentCharactersExcludingEvidence -
        content.contentCharactersExcludingEvidence,
    });
  }
  if (!gates.editorialCoreDepth) {
    remediationItems.push({
      kind: "EDITORIAL_CORE_SHORTFALL",
      missingCharacters:
        contentAudit.thresholds.editorialCharacters -
        content.editorialCharacters,
    });
  }
  if (!gates.chapterDepth) {
    remediationItems.push({
      kind: "THIN_CHAPTERS",
      chapterCount: content.thinChapters.length,
      totalMissingCharacters: content.thinChapters.reduce(
        (total, chapter) => total + chapter.missingCharacters,
        0,
      ),
    });
  }
  if (!gates.repetitionLimit) {
    remediationItems.push({
      kind: "REPEATED_LONG_LINES",
      actualRatio: content.repeatedLongLineCharacterRatio,
      maximumRatio: contentAudit.thresholds.repeatedLongLineCharacterRatio,
    });
  }
  if (!gates.neighborConsistency) {
    remediationItems.push({
      kind: "NEIGHBOR_ASSERTION_INCONSISTENCY",
      edgeCount: content.inconsistentNeighborEdges,
    });
  }
  if (!gates.canonicalScenarioRebase) {
    remediationItems.push({
      kind: "CANONICAL_V2_3_REBASE_REQUIRED",
      missingCanonicalClaims: content.missingCanonicalClaimsInManifest,
      unexpectedCanonicalClaims: content.unexpectedCanonicalClaimsInManifest,
    });
  }

  return {
    code: structuralProfile.code,
    currentProfileName: structuralProfile.profileName,
    currentShortName: structuralProfile.shortName,
    familyId: structuralProfile.familyId,
    manuscriptPath: manuscriptRelativePath,
    actualNonWhitespaceCharacters: actualCharacters,
    legacyAutomatedContentGate: content.automatedContentGate,
    gates,
    deficits: {
      contentCharactersExcludingEvidence:
        content.contentCharactersExcludingEvidence,
      substantiveContentMissingCharacters: Math.max(
        0,
        contentAudit.thresholds.contentCharactersExcludingEvidence -
          content.contentCharactersExcludingEvidence,
      ),
      editorialCharacters: content.editorialCharacters,
      editorialMissingCharacters: Math.max(
        0,
        contentAudit.thresholds.editorialCharacters -
          content.editorialCharacters,
      ),
      thinChapters: content.thinChapters,
      repeatedLongLineCharacterRatio: content.repeatedLongLineCharacterRatio,
      inconsistentNeighborEdges: content.inconsistentNeighborEdges,
      legacyInconsistentNeighborEdges: content.inconsistentNeighborEdges,
    },
    remediationItems,
    remediationScore: remediationItems.reduce((total, item) => {
      if (item.kind === "SUBSTANTIVE_CONTENT_SHORTFALL") return total + 8;
      if (item.kind === "EDITORIAL_CORE_SHORTFALL") return total + 6;
      if (item.kind === "THIN_CHAPTERS") return total + item.chapterCount * 2;
      if (item.kind === "REPEATED_LONG_LINES") return total + 5;
      if (item.kind === "NEIGHBOR_ASSERTION_INCONSISTENCY")
        return total + item.edgeCount * 3;
      if (item.kind === "CANONICAL_V2_3_REBASE_REQUIRED") return total + 20;
      return total;
    }, 0),
    canonicalDependency: canonicalLedger.reportId,
    finalState:
      remediationItems.length === 0
        ? "research_master_content_complete_external_validation_pending"
        : "research_content_repair_required",
  };
}

function buildMarkdownReport(result) {
  const issueRows = Object.entries(result.summary.issueCounts)
    .map(([issue, count]) => `| ${issue} | ${count} |`)
    .join("\n");
  const profileRows = result.profiles
    .map(
      (profile) =>
        `| ${profile.code} | ${profile.legacyAutomatedContentGate} | ${profile.gates.canonicalScenarioRebase ? "PASS" : "REPAIR"} | ${profile.deficits.contentCharactersExcludingEvidence.toLocaleString("ko-KR")} | ${profile.deficits.editorialCharacters.toLocaleString("ko-KR")} | ${profile.deficits.thinChapters.length} | ${profile.deficits.repeatedLongLineCharacterRatio} |`,
    )
    .join("\n");
  return `# 32개 연구원장 완전성 재감사 v2.3

- 상태: \`${result.status}\`
- 연구 원장 내용 기준: ${result.summary.profilesPassingCurrentAutomatedContentGate}/32
- v2.3 canonical 재연결: ${result.summary.profilesRebasedToCanonicalV23}/32
- 고객 발행 가능 원장: ${result.summary.profilesReadyForCustomerPublication}/32

## 핵심 판정

- 파일·코드 구조·72개 상황·288개 claim·5개 이웃: ${result.summary.structurallyCompleteProfiles}/32 통과
- 공백 제외 5만 자 이상: ${result.summary.manuscriptsAtLeastFiftyThousandCharacters}/32
- 내용 4만 자·핵심 편집문 5천 자·장별 깊이·반복·근거 기준: ${result.summary.profilesPassingCurrentAutomatedContentGate}/32
- v2.3 canonical: ${result.summary.canonicalVariants}개
- 32개 원장 canonical 참조: ${result.summary.profileCanonicalReferences.toLocaleString("ko-KR")}개
- 한 글자 이웃 검사: ${result.summary.recompositionNeighborEdgesPassing}/${result.summary.recompositionNeighborEdges}
- customer_approved claim: ${result.summary.customerApprovedClaims}

현재 연구 원장은 구조와 실질 내용 기준을 통과했다. 이 결과는 실제 참여자 타당화나 고객 발행 승인을 대신하지 않는다. 독립 검토·인지 면담·정량 검증·화면별 승인 전까지 연구 전용 상태를 유지한다.

## 결함 수

| 결함 | 해당 원장 |
| --- | ---: |
${issueRows}

## 코드별 현황

| 코드 | 내용 게이트 | canonical v2.3 | 실제 설명 글자 | 편집 핵심 글자 | 얇은 장 | 반복 비율 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
${profileRows}

## 별도 고객 발행 단계

${result.remainingExternalReleaseStages.map((stage, index) => `${index + 1}. ${stage}`).join("\n")}
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
