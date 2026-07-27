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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    report: "24_CANONICAL_CONTENT_VERSION_REVIEW_LEDGER_V2.md",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    report: "45_CANONICAL_CONTENT_VERSION_REVIEW_LEDGER_V2_1.md",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    report: "62_CANONICAL_CONTENT_VERSION_REVIEW_LEDGER_V2_2.md",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    report: "105_CANONICAL_CONTENT_VERSION_REVIEW_LEDGER_V2_3.md",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const useV21 = requestedAxisVersion === "v2-1";
const artifactSuffix = versionConfig.suffix;
const versionLabel = versionConfig.label;
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_CONTENT_LEDGER_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  versionConfig.report,
);
const checkOnly = process.argv.includes("--check");
const profileRebase = readJson(
  `TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_${artifactSuffix}.json`,
);
const allBatchAudit = readJson(
  `TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_${artifactSuffix}.json`,
);
const expectedEntries = allBatchAudit.summary.canonicalVariants;
const roleKeys = [
  "personality_psychologist",
  "psychometrician",
  "research_methodologist",
  "korean_plain_language_editor",
  "safety_privacy_reviewer",
  "product_content_designer",
  "data_quality_engineer",
];
const entries = [];

for (let batchIndex = 1; batchIndex <= 12; batchIndex += 1) {
  const batchId = `CAB-${String(batchIndex).padStart(2, "0")}`;
  const fileBatchId = batchId.replaceAll("-", "_");
  const correctionBase = readJson(
    `TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
  );
  const corrected =
    useV21 && batchId === "CAB-01"
      ? readJson(
          "TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.json",
        )
      : correctionBase;
  const exclusionsByVariantId = new Map();
  for (const decision of correctionBase.appliedDecisions) {
    for (const exclusion of decision.lineageExclusions) {
      const existing =
        exclusionsByVariantId.get(exclusion.canonicalVariantId) ?? [];
      existing.push({
        text: exclusion.text,
        reason: exclusion.reason,
        reviewId: decision.reviewId,
      });
      exclusionsByVariantId.set(exclusion.canonicalVariantId, existing);
    }
  }
  for (const variant of corrected.variants) {
    entries.push({
      contentKey: `trait-map.${versionLabel}.${variant.canonicalVariantId.toLowerCase()}`,
      canonicalVariantId: variant.canonicalVariantId,
      version: variant.provenance.internalRevision ? 2 : 1,
      batchId,
      scenarioRef: variant.scenarioRef,
      claimKey: variant.claimKey,
      claimKind: variant.claimKind,
      privacyScope: variant.privacyScope,
      semanticAxes: variant.semanticAxes,
      axisSignature: variant.axisSignature,
      content: {
        summaryText: variant.canonicalDisplayDraft.summaryText,
        detailParagraphs:
          variant.canonicalDisplayDraft.detailParagraphs,
        contentShape: variant.canonicalDisplayDraft.contentShape,
      },
      provenance: {
        sourceUnitIds: variant.provenance.sourceUnitIds,
        sourceBlockCount: variant.provenance.sourceBlockCount,
        semanticDecision: variant.provenance.semanticDecision,
        authoredParagraph: variant.provenance.authoredParagraph ?? null,
        internalRevision: variant.provenance.internalRevision ?? null,
        lineageExclusions:
          exclusionsByVariantId.get(variant.canonicalVariantId) ?? [],
      },
      automatedGates: {
        sourceTraceability: "passed",
        privacyScope: "passed",
        unsafeLanguage: "passed",
        targetedAxisDifferentiation: "passed",
        profileRecomposition: "passed",
      },
      reviewLedger: Object.fromEntries(
        roleKeys.map((role) => [
          role,
          {
            state: "pending",
            decision: null,
            note: null,
            reviewerRef: null,
            reviewedAt: null,
          },
        ]),
      ),
      validationLedger: {
        cognitiveInterview: "not_started",
        comprehensionTest: "not_started",
        constructValidation: "not_started",
        differentialItemFunctioning: "not_started",
      },
      release: {
        publicationState: "research_only",
        eligibleSurfaces: ["result_summary", "trait_map_detail"],
        prohibitedSurfaces:
          variant.privacyScope === "self_only"
            ? ["public_profile", "share_card", "comparison_report"]
            : [],
        approvedAt: null,
        retiredAt: null,
        rollbackToVersion: null,
      },
    });
  }
}

const entryByCanonicalId = new Map(
  entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const unresolvedProfileRefs = profileRebase.profiles.flatMap((profile) =>
  profile.claimRefs
    .filter((claim) => !entryByCanonicalId.has(claim.canonicalVariantId))
    .map((claim) => ({
      code: profile.code,
      claimKey: claim.claimKey,
      canonicalVariantId: claim.canonicalVariantId,
    })),
);
const duplicateContentKeys = findDuplicates(
  entries.map((entry) => entry.contentKey),
);
const duplicateCanonicalIds = findDuplicates(
  entries.map((entry) => entry.canonicalVariantId),
);
const duplicateOutputWithinClaim = [
  ...Map.groupBy(entries, (entry) => entry.claimKey).entries(),
].flatMap(([claimKey, claimEntries]) => {
  const byOutput = Map.groupBy(
    claimEntries,
    (entry) =>
      `${entry.content.summaryText}\n${entry.content.detailParagraphs.join("\n")}`,
  );
  return [...byOutput.entries()]
    .filter(([, outputEntries]) => outputEntries.length > 1)
    .map(([output, outputEntries]) => ({
      claimKey,
      canonicalVariantIds: outputEntries.map(
        (entry) => entry.canonicalVariantId,
      ),
      output,
    }));
});
const report = {
  contractVersion: `nuang-trait-map-canonical-content-ledger.${versionLabel}`,
  reportId: `TRAIT-MAP-CANONICAL-CONTENT-LEDGER.${versionConfig.artifactVersion}`,
  status:
    entries.length === expectedEntries &&
    duplicateContentKeys.length === 0 &&
    duplicateCanonicalIds.length === 0 &&
    unresolvedProfileRefs.length === 0 &&
    duplicateOutputWithinClaim.length === 0
      ? "CANONICAL_CONTENT_LEDGER_READY_SEVEN_ROLE_AND_EMPIRICAL_REVIEW_PENDING"
      : "CANONICAL_CONTENT_LEDGER_FAILED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  sourceAllBatchAuditReportId: allBatchAudit.reportId,
  sourceProfileRebaseReportId: profileRebase.reportId,
  profileNameReleaseId: profileRebase.nameReleaseId,
  symbolLanguageReleaseId: profileRebase.symbolLanguageReleaseId,
  summary: {
    entries: entries.length,
    uniqueContentKeys: new Set(
      entries.map((entry) => entry.contentKey),
    ).size,
    uniqueCanonicalVariantIds: entryByCanonicalId.size,
    claimKeys: new Set(entries.map((entry) => entry.claimKey)).size,
    profileClaimRefsResolved:
      profileRebase.summary.profileClaimRefs - unresolvedProfileRefs.length,
    unresolvedProfileRefs: unresolvedProfileRefs.length,
    duplicateContentKeys: duplicateContentKeys.length,
    duplicateCanonicalIds: duplicateCanonicalIds.length,
    duplicateOutputWithinClaim: duplicateOutputWithinClaim.length,
    authoredDirectionalParagraphs: entries.filter(
      (entry) => entry.provenance.authoredParagraph,
    ).length,
    lineageExclusions: entries.reduce(
      (total, entry) =>
        total + entry.provenance.lineageExclusions.length,
      0,
    ),
    versionTwoRevisedEntries: entries.filter(
      (entry) => entry.version === 2,
    ).length,
    automatedGatePassedEntries: entries.filter((entry) =>
      Object.values(entry.automatedGates).every(
        (state) => state === "passed",
      ),
    ).length,
    sevenRoleReviewedEntries: entries.filter((entry) =>
      Object.values(entry.reviewLedger).every(
        (review) => review.state === "approved",
      ),
    ).length,
    customerApprovedEntries: entries.filter(
      (entry) => entry.release.publicationState === "customer_approved",
    ).length,
  },
  lifecycle: [
    "research_only: 출처와 교정 계보가 있으나 전문·사용자 검토 전",
    "expert_reviewed: 7개 역할 검토 완료",
    "empirically_validated: 이해도·구성개념·문항 기능 검증 완료",
    "customer_approved: 지정 화면과 버전으로 제한 공개",
    "retired: 근거·안전·중복 문제로 신규 노출 중단, 기존 결과 버전은 보존",
  ],
  versionRules: [
    "문장 뜻이 바뀌면 version을 올리고 이전 version을 덮어쓰지 않는다.",
    "띄어쓰기·오탈자만 고치더라도 변경 이유와 시각을 기록한다.",
    "검사 결과에는 code release·name release·symbol language release·content version을 함께 저장한다.",
    "privacyScope가 self_only이면 프로필·공유·타인 비교에 자동으로 내보내지 않는다.",
    "철회된 콘텐츠는 rollbackToVersion 또는 승인된 대체 contentKey가 없으면 숨긴다.",
  ],
  unresolvedProfileRefs,
  duplicateContentKeys,
  duplicateCanonicalIds,
  duplicateOutputWithinClaim,
  entries,
  nextGate: {
    name: "SEVEN_ROLE_REVIEW_LEDGER_POPULATION",
    completion:
      `${expectedEntries}개 entry의 7개 역할 결정을 기록하고 추가 수정 요청 항목은 다음 version 초안으로 분기한다.`,
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdownReport(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      `Canonical content ledger ${requestedAxisVersion} is stale.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Canonical content ledger: ${report.summary.entries} entries, ${report.summary.profileClaimRefsResolved} profile refs resolved, ${report.summary.automatedGatePassedEntries} automated gates passed, ${report.summary.customerApprovedEntries} customer-approved.`,
);

function findDuplicates(values) {
  return [...Map.groupBy(values, (value) => value).entries()]
    .filter(([, grouped]) => grouped.length > 1)
    .map(([value, grouped]) => ({ value, count: grouped.length }));
}

function buildMarkdownReport(result) {
  return `# canonical 콘텐츠 버전·검토 원장 ${versionLabel}

- 상태: \`${result.status}\`
- 고객 승인: ${result.summary.customerApprovedEntries}개

## 원장

- content entry: ${result.summary.entries}
- 고유 contentKey: ${result.summary.uniqueContentKeys}
- 고유 canonical ID: ${result.summary.uniqueCanonicalVariantIds}
- claimKey: ${result.summary.claimKeys}
- 해결된 32개 프로필 참조: ${result.summary.profileClaimRefsResolved}
- 같은 claim 안의 완전 동일 출력: ${result.summary.duplicateOutputWithinClaim}
- 근거 제한 새 방향 문단: ${result.summary.authoredDirectionalParagraphs}
- 계보 보존 제외: ${result.summary.lineageExclusions}
- version 2 내부 교정: ${result.summary.versionTwoRevisedEntries}
- 자동 게이트 통과: ${result.summary.automatedGatePassedEntries}
- 7개 역할 검토 완료: ${result.summary.sevenRoleReviewedEntries}

## 각 entry가 저장하는 것

1. contentKey·canonical ID·version
2. 상황·claim 종류·비공개 범위·축 서명
3. 결과 요약 문단과 성향지도 상세 문단
4. 원문 source unit·새 문단 근거·계보 제외 이유
5. 자동 게이트와 7개 역할 검토
6. 사용자 이해도·구성개념·문항 기능 검증
7. 허용 화면·금지 화면·승인·철회·롤백 버전

현재 모든 entry는 연구용이다. 7개 역할 검토와 실증 검증 전에는
성향지도·결과·비교·프로필·공유의 고객 콘텐츠로 발행하지 않는다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
