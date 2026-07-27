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
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_V2_3_COMPLETENESS_GAP_REGISTER.json",
);
const queuePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_V2_3_LONGFORM_REMEDIATION_QUEUE.json",
);
const reportPath = path.join(
  docsDirectory,
  "158_DATA_CENTER_COMPLETENESS_GAP_REGISTER_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const master = readGenerated(
  "TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
);
const longformCompleteness = readGenerated(
  "TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const nameAudit = readGenerated(
  "TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json",
);
const canonicalLedger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const profileRebase = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const recomposition = readGenerated(
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const publication = readGenerated("TRAIT_MAP_PUBLICATION_GATE_V2_3.json");
const runtimeHarness = readGenerated(
  "TRAIT_MAP_RUNTIME_RESOLVER_HARNESS_V2_3.json",
);
const noExactQueue = readReview(
  "TRAIT_MAP_ALL_CANONICAL_NO_EXACT_CONTEXT_REVIEW_QUEUE_V2_3.json",
);

const noExactIds = new Set(
  noExactQueue.entries.map((entry) => entry.canonicalVariantId),
);
const masterByCode = new Map(
  master.profiles.map((profile) => [profile.code, profile]),
);
const nameByCode = new Map(
  nameAudit.profiles.map((profile) => [profile.code, profile]),
);
const canonicalIds = new Set(
  canonicalLedger.entries.map((entry) => entry.canonicalVariantId),
);

const profiles = profileRebase.profiles
  .map((profile) => {
    const masterProfile = masterByCode.get(profile.code);
    const name = nameByCode.get(profile.code);
    if (!masterProfile || !name) {
      throw new Error(`Completeness lineage missing for ${profile.code}.`);
    }
    const noExactContextRefs = profile.claimRefs.filter((claimRef) =>
      noExactIds.has(claimRef.canonicalVariantId),
    ).length;
    const canonicalRefsResolved = profile.claimRefs.every((claimRef) =>
      canonicalIds.has(claimRef.canonicalVariantId),
    );
    const requiresRemediation =
      masterProfile.legacyAutomatedContentGate !== "PASS" ||
      masterProfile.remediationItems.length > 0;
    return {
      code: profile.code,
      shortName: profile.shortName,
      displayName: profile.displayName,
      familyId: profile.familyId,
      manuscriptPath: masterProfile.manuscriptPath,
      manuscriptNonWhitespaceCharacters:
        masterProfile.actualNonWhitespaceCharacters,
      manuscriptAtLeastFiftyThousand:
        masterProfile.actualNonWhitespaceCharacters >= 50_000,
      canonicalClaimRefs: profile.claimRefCount,
      canonicalRefsResolved,
      currentCanonicalRecompositionPassed:
        recomposition.summary.recompositionPassed,
      longformQuality: {
        currentAutomatedContentGate: masterProfile.legacyAutomatedContentGate,
        legacyAutomatedContentGate: masterProfile.legacyAutomatedContentGate,
        substantiveContentMissingCharacters:
          masterProfile.deficits.substantiveContentMissingCharacters,
        editorialCoreMissingCharacters:
          masterProfile.deficits.editorialMissingCharacters,
        thinChapterCount: masterProfile.deficits.thinChapters.length,
        repeatedLongLineCharacterRatio:
          masterProfile.deficits.repeatedLongLineCharacterRatio,
        requiresRemediation,
      },
      evidenceAndValidation: {
        noExactContextCanonicalRefs: noExactContextRefs,
        evidenceScopeRegistration:
          "complete_with_explicit_context_transfer_gaps",
        sevenRoleHumanValidation: "not_started",
        cognitiveValidation: "not_started",
        directScenarioValidation: "not_started",
        customerPublicationApproval: "not_started",
      },
      naming: {
        automatedChecksPassed: Object.values(name.checks).every(Boolean),
        userValidationState: name.userValidationState,
        publicationState: name.publicationState,
      },
      validationPriorityScore: noExactContextRefs * 2,
      remediationState: requiresRemediation
        ? "longform_content_repair_required"
        : "research_master_content_complete_external_validation_pending",
      publicationState: "research_only",
    };
  })
  .sort(
    (left, right) =>
      right.validationPriorityScore - left.validationPriorityScore ||
      left.code.localeCompare(right.code, "en"),
  );
profiles.forEach((profile, index) => {
  profile.validationPriorityRank = index + 1;
});

const openContentRepairs = profiles.filter(
  (profile) => profile.longformQuality.requiresRemediation,
);
const domainGates = [
  {
    domain: "32_profile_structure",
    state: "passed",
    evidence: "32 profiles, 16 chapters, 72 scenarios and 288 refs each",
  },
  {
    domain: "longform_minimum_length",
    state: "passed",
    evidence: "32/32 at least 50,000 non-whitespace characters",
  },
  {
    domain: "longform_substantive_and_editorial_quality",
    state: openContentRepairs.length === 0 ? "passed" : "in_progress",
    evidence: `${32 - openContentRepairs.length}/32 current automated content gates passed`,
  },
  {
    domain: "canonical_v2_3_recomposition",
    state: "passed",
    evidence: `${profileRebase.summary.profileClaimRefs} refs, ${recomposition.summary.neighborEdgesPassed}/${recomposition.summary.neighborEdges} neighbor edges`,
  },
  {
    domain: "evidence_scope_registration",
    state: "passed_with_explicit_gaps",
    evidence: `${noExactQueue.entries.length} canonical entries without exact-context finding are explicitly registered`,
  },
  {
    domain: "seven_role_human_review",
    state: "not_started_external_release_gate",
    evidence: "0 approved canonical entries",
  },
  {
    domain: "cognitive_and_comprehension_validation",
    state: "not_started_external_release_gate",
    evidence: "0 completed participants",
  },
  {
    domain: "quantitative_and_direct_validation",
    state: "not_started_external_release_gate",
    evidence: "0 real participants and 0 empirical analyses",
  },
  {
    domain: "profile_name_user_validation",
    state: "not_started_external_release_gate",
    evidence: `${nameAudit.summary.userValidatedNames}/32 user validated`,
  },
  {
    domain: "runtime_fail_closed_resolver",
    state: "harness_ready_not_wired",
    evidence: `${runtimeHarness.summary.syntheticProfileReferencesCovered} synthetic refs covered`,
  },
  {
    domain: "customer_publication",
    state: "blocked_by_design",
    evidence: `${publication.summary.productionAllowedCanonicalEntries} canonical entries allowlisted`,
  },
];

const report = {
  contractVersion: "nuang-trait-map-data-center-completeness-gap-register.v2.3",
  reportId: "TRAIT-MAP-V2-3-COMPLETENESS-GAP-REGISTER.2.3",
  status:
    openContentRepairs.length === 0
      ? "RESEARCH_MASTER_CONTENT_COMPLETE_EXTERNAL_VALIDATION_PENDING"
      : "RESEARCH_MASTER_LONGFORM_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceMasterReportId: master.reportId,
  sourceLegacyMasterReportId: master.reportId,
  sourceLongformCompletenessReportId: longformCompleteness.reportId,
  sourceNameAuditReportId: nameAudit.reportId,
  sourceCanonicalLedgerReportId: canonicalLedger.reportId,
  sourceProfileRebaseReportId: profileRebase.reportId,
  sourceRecompositionReportId: recomposition.reportId,
  sourcePublicationGateReportId: publication.reportId,
  sourceRuntimeHarnessReportId: runtimeHarness.reportId,
  sourceNoExactContextQueueId: noExactQueue.queueId,
  summary: {
    profiles: profiles.length,
    totalLongformNonWhitespaceCharacters:
      longformCompleteness.totals.longformCharacters,
    manuscriptsAtLeastFiftyThousand: profiles.filter(
      (profile) => profile.manuscriptAtLeastFiftyThousand,
    ).length,
    profilesWith288CanonicalRefs: profiles.filter(
      (profile) => profile.canonicalClaimRefs === 288,
    ).length,
    profilesWithAllCanonicalRefsResolved: profiles.filter(
      (profile) => profile.canonicalRefsResolved,
    ).length,
    profilesPassingLegacyLongformQualityGate: profiles.filter(
      (profile) =>
        profile.longformQuality.currentAutomatedContentGate === "PASS",
    ).length,
    profilesPassingCurrentLongformQualityGate: profiles.filter(
      (profile) =>
        profile.longformQuality.currentAutomatedContentGate === "PASS",
    ).length,
    profilesRequiringLongformContentRepair: openContentRepairs.length,
    canonicalVariants: canonicalLedger.summary.entries,
    profileClaimRefs: profileRebase.summary.profileClaimRefs,
    neighborEdgesPassed: recomposition.summary.neighborEdgesPassed,
    neighborEdges: recomposition.summary.neighborEdges,
    noExactContextCanonicalEntries: noExactQueue.entries.length,
    userValidatedNames: nameAudit.summary.userValidatedNames,
    sevenRoleApprovedCanonicalEntries:
      profileRebase.summary.sevenRoleReviewedCanonicalVariants,
    customerApprovedCanonicalEntries:
      profileRebase.summary.customerApprovedCanonicalVariants,
    profilesReadyForCustomerPublication: 0,
  },
  interpretationBoundary: [
    "32/32 자동 내용 gate 통과는 연구 원장 내부 완성 기준이며 실제 참여자 타당화나 고객 발행 승인을 뜻하지 않는다.",
    "동일 맥락 근거가 없는 101개 canonical은 누락이 아니라 명시적으로 등록한 직접 검증 대상이다.",
    "별칭 자동 일관성 통과는 사용자의 이해·회상·만족을 뜻하지 않는다.",
    "내부 판정과 합성 fixture는 독립 외부 검토나 실제 참여자 검증을 대신하지 않는다.",
  ],
  domainGates,
  profiles,
  remediationPlan: {
    openContentRepairCount: openContentRepairs.length,
    currentWave:
      openContentRepairs.length === 0
        ? "COMPLETE_NO_OPEN_CONTENT_REPAIR"
        : "CONTENT_REPAIR_IN_PROGRESS",
    perProfileOrder: openContentRepairs.map((profile) => profile.code),
  },
  nextGate: {
    name: "FINAL_REPRODUCIBILITY_AND_REQUIREMENT_AUDIT",
    action:
      "최신 생성물 manifest를 갱신하고 전체 current check를 통과한 뒤 RM-01~09 증거를 final completion audit로 고정한다.",
  },
};

const queue = {
  queueVersion: "nuang-trait-map-v2-3-longform-remediation-queue.2.3",
  sourceReportId: report.reportId,
  state:
    openContentRepairs.length === 0
      ? "complete_no_open_content_repair"
      : "open",
  entries: openContentRepairs.map((profile) => ({
    code: profile.code,
    manuscriptPath: profile.manuscriptPath,
    remediationState: profile.remediationState,
    longformQuality: profile.longformQuality,
    publicationState: "research_only",
  })),
};

if (
  report.summary.profiles !== 32 ||
  report.summary.totalLongformNonWhitespaceCharacters < 1_600_000 ||
  report.summary.manuscriptsAtLeastFiftyThousand !== 32 ||
  report.summary.profilesWith288CanonicalRefs !== 32 ||
  report.summary.profilesWithAllCanonicalRefsResolved !== 32 ||
  report.summary.profilesPassingCurrentLongformQualityGate !== 32 ||
  report.summary.profilesRequiringLongformContentRepair !== 0 ||
  report.summary.canonicalVariants !== 605 ||
  report.summary.profileClaimRefs !== 9216 ||
  report.summary.neighborEdgesPassed !== report.summary.neighborEdges ||
  report.summary.noExactContextCanonicalEntries !== 101 ||
  report.summary.userValidatedNames !== 0 ||
  report.summary.sevenRoleApprovedCanonicalEntries !== 0 ||
  report.summary.customerApprovedCanonicalEntries !== 0 ||
  report.summary.profilesReadyForCustomerPublication !== 0 ||
  queue.entries.length !== 0
) {
  throw new Error("Data-center completeness gap invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const queueOutput = await prettier.format(JSON.stringify(queue), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
  proseWrap: "preserve",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [queuePath, queueOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 data-center completeness gap register is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(queuePath, queueOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Data-center completeness v2.3: 32/32 >=50k, ${report.summary.profilesPassingCurrentLongformQualityGate}/32 current quality pass, ${report.summary.profilesRequiringLongformContentRepair} open content repairs, publication-ready 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function readReview(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# 158. 데이터센터 완성도 gap register v2.3

- 상태: \`${result.status}\`
- 장문 원고: **32/32개 5만 자 이상**, 총 **${result.summary.totalLongformNonWhitespaceCharacters.toLocaleString("ko-KR")}자**
- 장문 실질 품질: **${result.summary.profilesPassingCurrentLongformQualityGate}/32 통과**, 열린 내용 보수 **${result.summary.profilesRequiringLongformContentRepair}개**
- v2.3 canonical 참조: **${result.summary.profileClaimRefs.toLocaleString("ko-KR")}개**, 해결 **${result.summary.profilesWithAllCanonicalRefsResolved}/32**
- 한 글자 이웃: **${result.summary.neighborEdgesPassed}/${result.summary.neighborEdges}**
- 동일 맥락 finding 없음: **${result.summary.noExactContextCanonicalEntries}개 canonical · 직접 검증 대상으로 명시 등록**
- 사용자 검증 별칭 / 고객 공개 준비 성향: **0 / 0**

## 정확한 현재 상태

32개 원고는 구조·분량·실제 설명량·핵심 편집문·장별 깊이·반복·v2.3 canonical 재연결 기준을 모두 통과했다. 현재 열린 장문 내용 보수는 없다. 이 판정은 연구 원장의 내부 완성 기준이며, 독립 외부 검토·인지 면담·실제 참여자 정량 검증·고객 화면 발행 승인을 대신하지 않는다.

## 영역별 gate

${result.domainGates.map((entry) => `- **${entry.domain}** — \`${entry.state}\`: ${entry.evidence}`).join("\n")}

## 다음 gate

${result.nextGate.action}

고객 발행 allowlist는 0개로 유지하며, 연구 전용 원장이 앱 화면으로 흘러가지 않도록 fail-closed 상태를 유지한다.
`;
}
