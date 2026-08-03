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
    report: "23_32_PROFILE_CANONICAL_REBASE_V2.md",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    report: "44_32_PROFILE_CANONICAL_REBASE_V2_1.md",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    report: "61_32_PROFILE_CANONICAL_REBASE_V2_2.md",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    report: "104_32_PROFILE_CANONICAL_REBASE_V2_3.md",
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
  `TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  versionConfig.report,
);
const checkOnly = process.argv.includes("--check");
const allBatchAudit = readJson(
  `TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_${artifactSuffix}.json`,
);
const expectedCanonicalVariants =
  allBatchAudit.summary.canonicalVariants;
const nameAudit = readJson("TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json");
const symbolLanguageReleaseId = "NUANG-CODE-SYMBOL-LANGUAGE-1.0";
const symbolTypeNames = {
  E: "외향형",
  I: "내향형",
  R: "현실형",
  N: "가능성형",
  G: "해결형",
  A: "마음형",
  K: "꾸준형",
  M: "상황형",
  C: "차분반응형",
  Q: "빠른반응형",
};
const nameByCode = new Map(
  nameAudit.profiles.map((profile) => [profile.code, profile]),
);
const batchReports = Array.from({ length: 12 }, (_, index) => {
  const batchId = `CAB-${String(index + 1).padStart(2, "0")}`;
  const fileBatchId = batchId.replaceAll("-", "_");
  return readJson(
    useV21 && batchId === "CAB-01"
      ? "TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_P0_REVISED_V2_1.json"
      : `TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_${fileBatchId}_${artifactSuffix}.json`,
  );
});
const profileClaimRefsByCode = new Map();
for (const batchReport of batchReports) {
  for (const profile of batchReport.profiles) {
    const existing = profileClaimRefsByCode.get(profile.code) ?? [];
    existing.push(
      ...profile.claims.map((claim) => ({
        batchId: batchReport.batchId,
        scenarioRef: claim.scenarioRef,
        claimKey: claim.claimKey,
        claimKind: claim.claimKind,
        privacyScope: claim.privacyScope,
        semanticAxes: claim.semanticAxes,
        axisSignature: claim.axisSignature,
        canonicalVariantId: claim.canonicalVariantId,
      })),
    );
    profileClaimRefsByCode.set(profile.code, existing);
  }
}
const profiles = [...profileClaimRefsByCode.entries()]
  .sort(([left], [right]) => left.localeCompare(right, "en"))
  .map(([code, claimRefs]) => {
    const name = nameByCode.get(code);
    return {
      code,
      shortName: name.shortName,
      displayName: name.displayName,
      familyId: name.familyId,
      familyMeaning: name.familyMeaning,
      nameReleaseId: nameAudit.releaseId,
      namePublicationState: name.publicationState,
      symbolLanguageReleaseId,
      codeTokens: [...code].map((symbol) => symbolTypeNames[symbol]),
      codeTokenLabels: [...code].map(
        (symbol) => `${symbol} · ${symbolTypeNames[symbol]}`,
      ),
      claimRefCount: claimRefs.length,
      claimRefs,
      manuscriptRebaseState:
        "canonical_reference_manifest_ready_legacy_copy_retained_for_research_history",
      customerPublicationState: "blocked_pending_seven_role_review",
    };
  });
const allClaimRefs = profiles.flatMap((profile) => profile.claimRefs);
const referencedCanonicalVariantIds = new Set(
  allClaimRefs.map((claim) => claim.canonicalVariantId),
);
const profilesWithInvalidRefShape = profiles
  .filter(
    (profile) =>
      profile.claimRefs.length !== 288 ||
      new Set(profile.claimRefs.map((claim) => claim.claimKey)).size !== 288 ||
      profile.claimRefs.some(
        (claim) => !claim.canonicalVariantId || !claim.axisSignature,
      ),
  )
  .map((profile) => profile.code);
const report = {
  contractVersion: `nuang-trait-map-32-profile-canonical-rebase.${versionLabel}`,
  reportId: `TRAIT-MAP-32-PROFILE-CANONICAL-REBASE.${versionConfig.artifactVersion}`,
  status:
    profiles.length === 32 &&
      allClaimRefs.length === 9_216 &&
      referencedCanonicalVariantIds.size === expectedCanonicalVariants &&
      profilesWithInvalidRefShape.length === 0
      ? "CANONICAL_REFERENCE_BASELINE_READY_CONTENT_APPROVAL_PENDING"
      : "CANONICAL_REFERENCE_BASELINE_FAILED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  sourceAllBatchAuditReportId: allBatchAudit.reportId,
  nameReleaseId: nameAudit.releaseId,
  symbolLanguageReleaseId,
  summary: {
    profiles: profiles.length,
    claimRefsPerProfile: profiles[0]?.claimRefs.length ?? 0,
    profileClaimRefs: allClaimRefs.length,
    referencedCanonicalVariants: referencedCanonicalVariantIds.size,
    profilesWithInvalidRefShape: profilesWithInvalidRefShape.length,
    uniqueShortNames: new Set(
      profiles.map((profile) => profile.shortName),
    ).size,
    uniqueDisplayNames: new Set(
      profiles.map((profile) => profile.displayName),
    ).size,
    profilesUsingOfficialTenSymbolLanguage: profiles.filter(
      (profile) =>
        profile.codeTokens.length === 5 &&
        profile.codeTokenLabels.length === 5 &&
        profile.codeTokenLabels.every((token) => token.includes(" · ")),
    ).length,
    sevenRoleReviewedCanonicalVariants: 0,
    customerApprovedCanonicalVariants: 0,
    customerApprovedProfiles: 0,
  },
  sourceOfTruthRules: [
    "32개 성향 원장에는 상황 문장을 다시 복사하지 않고 canonicalVariantId만 저장한다.",
    "같은 canonicalVariantId의 결과 요약과 성향지도 상세는 하나의 승인된 콘텐츠 원천에서 불러온다.",
    "기존 장문 원장은 삭제하지 않고 연구 계보와 편집 비교 자료로 보존한다.",
    "역할형 별칭 release와 10개 알파벳 공식 언어 release를 결과에 함께 저장한다.",
    "콘텐츠 수정 시 canonical 콘텐츠 버전만 올리고 기존 검사 결과가 사용한 해석 버전을 보존한다.",
    "7개 역할 검토와 사용자 검증 전에는 이 기준선을 운영 DB의 고객 공개 콘텐츠로 승격하지 않는다.",
  ],
  migrationPlan: [
    `${expectedCanonicalVariants}개 canonical 변형에 contentKey·version·reviewState·publicationState를 부여한다.`,
    "32개 프로필의 9,216개 복사 문장을 이 manifest의 canonicalVariantId 참조로 매핑한다.",
    "기존 문장과 새 canonical 문장의 차이를 코드·상황·claim 단위로 검토한다.",
    "검토 통과 프로필 한 개를 내부 성향지도 상세에서 먼저 읽기 전용으로 확인한다.",
    "롤백 가능한 버전 테이블을 만든 뒤 프로필 한 개씩 고객 발행 게이트를 연다.",
  ],
  profilesWithInvalidRefShape,
  canonicalLibrarySources: batchReports.map((batch) => ({
    batchId: batch.batchId,
    reportId: batch.reportId,
    correctedDraftReportId: batch.sourceCorrectedDraftReportId,
  })),
  profiles,
  nextGate: {
    name: "CANONICAL_CONTENT_VERSION_AND_REVIEW_LEDGER",
    completion:
      `${expectedCanonicalVariants}개 변형의 버전·7개 역할 검토·승인·철회 이력을 저장하는 정식 콘텐츠 원장을 만든다.`,
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
      `32-profile canonical rebase ${requestedAxisVersion} is stale.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `32-profile canonical rebase: ${report.summary.profiles} profiles, ${report.summary.profileClaimRefs} refs, ${report.summary.referencedCanonicalVariants} canonical variants, ${report.summary.profilesUsingOfficialTenSymbolLanguage}/32 official symbol language.`,
);

function buildMarkdownReport(result) {
  const rows = result.profiles
    .map(
      (profile) =>
        `| ${profile.code} | ${profile.shortName} | ${profile.displayName} | ${profile.codeTokenLabels.join(" / ")} | ${profile.claimRefCount} |`,
    )
    .join("\n");
  return `# 32개 성향 원장 canonical 기준선 전환 ${versionLabel}

- 상태: \`${result.status}\`
- 고객 승인 프로필: 0개

## 전환 결과

32개 성향 각각의 288개 상황 문장을 복사해 관리하던 구조를 총 ${result.summary.referencedCanonicalVariants}개
canonical 콘텐츠 ID 참조로 전환할 manifest를 만들었다.

- 프로필: ${result.summary.profiles}
- 프로필별 claim 참조: ${result.summary.claimRefsPerProfile}
- 전체 참조: ${result.summary.profileClaimRefs}
- 참조하는 canonical 변형: ${result.summary.referencedCanonicalVariants}
- 고유 짧은 별칭: ${result.summary.uniqueShortNames}
- 고유 긴 별칭: ${result.summary.uniqueDisplayNames}
- 공식 10글자 언어 적용: ${result.summary.profilesUsingOfficialTenSymbolLanguage}/32

| 코드 | 짧은 별칭 | 긴 별칭 | 뉴앙 코드 공식 이름 | 참조 |
| --- | --- | --- | --- | ---: |
${rows}

## 운영 원칙

기존 장문 파일은 연구 계보로 보존한다. 앱과 DB는 승인된 canonical 콘텐츠를
ID로 참조하며, 이름 release·10글자 언어 release·콘텐츠 version을 함께
기록한다. 현재는 7개 역할 검토 전이므로 고객 화면에 발행하지 않는다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
