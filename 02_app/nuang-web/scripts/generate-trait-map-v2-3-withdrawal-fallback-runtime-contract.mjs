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
  "TRAIT_MAP_WITHDRAWAL_FALLBACK_RUNTIME_CONTRACT_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_WITHDRAWAL_FALLBACK_SYNTHETIC_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "156_WITHDRAWAL_FALLBACK_RUNTIME_CONTRACT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const profiles = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const publication = readGenerated(
  "TRAIT_MAP_PUBLICATION_GATE_V2_3.json",
);
const reopenMatrix = readGenerated(
  "TRAIT_MAP_REVISION_GATE_REOPEN_MATRIX_V2_3.json",
);

const candidate = ledger.entries.find(
  (entry) =>
    entry.axisSignature !== "COMMON" &&
    entry.semanticAxes.length === 1,
);
if (!candidate) {
  throw new Error("Synthetic withdrawal candidate missing.");
}
const impactedProfiles = profiles.profiles
  .filter((profile) =>
    profile.claimRefs.some(
      (claimRef) =>
        claimRef.canonicalVariantId === candidate.canonicalVariantId,
    ),
  )
  .map((profile) => profile.code)
  .sort((left, right) => left.localeCompare(right, "en"));

const resolverStates = [
  {
    caseId: "RUNTIME-01",
    canonicalState: "approved",
    allowlistedForSurface: true,
    surface: "trait_map_detail",
    expected: "render_exact_approved_version",
  },
  {
    caseId: "RUNTIME-02",
    canonicalState: "research_only",
    allowlistedForSurface: false,
    surface: "trait_map_detail",
    expected: "omit_claim_section",
  },
  {
    caseId: "RUNTIME-03",
    canonicalState: "retired",
    allowlistedForSurface: true,
    surface: "result_summary",
    expected: "deny_and_invalidate_stale_allowlist",
  },
  {
    caseId: "RUNTIME-04",
    canonicalState: "missing",
    allowlistedForSurface: false,
    surface: "comparison_report",
    expected: "omit_claim_section_and_log_integrity_error",
  },
  {
    caseId: "RUNTIME-05",
    canonicalState: "common_archive",
    allowlistedForSurface: true,
    surface: "public_profile",
    expected: "deny_common_personalization",
  },
  {
    caseId: "RUNTIME-06",
    canonicalState: "approved",
    allowlistedForSurface: false,
    surface: "share_card",
    expected: "omit_claim_section",
  },
];

const resolvedCases = resolverStates.map((entry) => ({
  ...entry,
  actual: resolve(entry),
  passed: resolve(entry) === entry.expected,
}));
const simulatedRetirement = {
  synthetic: true,
  canonicalVariantId: candidate.canonicalVariantId,
  contentKey: candidate.contentKey,
  version: candidate.version,
  impactedProfileCount: impactedProfiles.length,
  impactedProfileCodes: impactedProfiles,
  beforeState: candidate.release.publicationState,
  simulatedAfterState: "retired",
  oldContentRenderedAfterRetirement: false,
  commonUsedAsPersonalizedFallback: false,
  emptyCanonicalRefReturnedToClient: false,
  profileDataCommitted: false,
  publicationChanged: false,
};

const contract = {
  contractVersion:
    "nuang-trait-map-withdrawal-fallback-runtime-contract.v2.3",
  reportId:
    "TRAIT-MAP-WITHDRAWAL-FALLBACK-RUNTIME-CONTRACT.2.3",
  status: "FAIL_CLOSED_RUNTIME_CONTRACT_READY_NOT_WIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceProfileReportId: profiles.reportId,
  sourcePublicationGateReportId: publication.reportId,
  sourceReopenMatrixReportId: reopenMatrix.reportId,
  summary: {
    resolverCases: resolvedCases.length,
    resolverCasesPassed: resolvedCases.filter(
      (entry) => entry.passed,
    ).length,
    profileReferencesInspected: profiles.summary.profileClaimRefs,
    syntheticRetirementImpactedProfiles:
      simulatedRetirement.impactedProfileCount,
    currentProductionAllowlistEntries:
      publication.summary.productionAllowedCanonicalEntries,
    runtimeWiringCompleted: false,
    canonicalRetirementsCommitted: 0,
    profileCommitsPerformed: 0,
    publicationChanges: 0,
  },
  resolverContract: {
    lookupKey:
      "canonicalVariantId + exact version + surface + publication-manifest digest",
    allowConditions: [
      "canonical state가 approved이다.",
      "요청 surface의 명시적 allowlist에 canonical ID와 version이 함께 있다.",
      "privacyScope와 surface가 호환된다.",
      "COMMON이 아니다.",
      "manifest digest와 cache digest가 일치한다.",
    ],
    defaultOnMissingDecision: "deny",
    fallbackOrder: [
      "같은 contentKey의 명시적으로 승인된 rollback version",
      "해당 claim section 생략",
      "데이터 무결성 event 기록",
    ],
    forbiddenFallbacks: [
      "retired 문장을 계속 표시",
      "COMMON 문장을 개인화 문장으로 표시",
      "같은 claimKey의 다른 축 방향 문장을 대신 표시",
      "승인되지 않은 최신 초안을 표시",
      "빈 canonical ID를 클라이언트에 전달",
    ],
  },
  cacheContract: {
    cacheKeyFields: [
      "surface",
      "profile_code_or_result_ref",
      "canonical_manifest_digest",
      "locale",
    ],
    retirementInvalidationTargets: [
      "result_summary",
      "trait_map_detail",
      "comparison_report",
      "public_profile",
      "share_card",
      "server_render_cache",
      "client_persisted_query_cache",
      "share_image_cache",
    ],
    invalidationOrder: [
      "새 manifest에서 canonical 제거",
      "서버 캐시 purge",
      "공유 이미지 revoke 또는 만료",
      "클라이언트 digest mismatch 재요청",
      "무결성 재스캔",
    ],
    staleWhileRevalidateAllowed: false,
  },
  withdrawalEventSchema: {
    requiredFields: [
      "withdrawal_ref",
      "canonical_variant_id",
      "content_key",
      "retired_version",
      "reason_code",
      "affected_surfaces",
      "affected_profile_codes",
      "rollback_version",
      "manifest_before_digest",
      "manifest_after_digest",
      "retired_at",
      "approved_by",
    ],
    appendOnly: true,
  },
  consistencyChecks: [
    "retired canonical ID가 어떤 surface allowlist에도 남지 않는다.",
    "32개 profile claimRef 중 retired ID를 응답 payload로 반환하지 않는다.",
    "rollback version이 없다면 section을 생략하되 인접 축 문장을 대신 쓰지 않는다.",
    "COMMON은 연구 계보에 남겨도 개인화 surface에 반환하지 않는다.",
    "공유 카드와 이미지 CDN도 manifest digest가 바뀌면 무효화한다.",
  ],
  syntheticFixture: {
    fixtureId:
      "TRAIT-MAP-WITHDRAWAL-FALLBACK-SYNTHETIC-FIXTURE.2.3",
    resolverCases: resolvedCases,
    simulatedRetirement,
  },
  implementationBoundary: {
    resolverCodeWired: false,
    cacheInvalidationWired: false,
    databaseChanged: false,
    canonicalChanged: false,
    publicationChanged: false,
  },
  nextGate: {
    name: "RUNTIME_RESOLVER_INTERFACE_AND_TEST_HARNESS",
    action:
      "계약을 순수 함수형 resolver 인터페이스와 32개 profile payload 합성 테스트로 옮기되 현재 앱 발행에는 연결하지 않는다.",
  },
};

const fixture = {
  fixtureVersion:
    "nuang-trait-map-withdrawal-fallback-synthetic-fixture.v2.3",
  sourceReportId: contract.reportId,
  synthetic: true,
  resolverCases: resolvedCases,
  simulatedRetirement,
};

if (
  contract.summary.resolverCases !== 6 ||
  contract.summary.resolverCasesPassed !== 6 ||
  contract.summary.profileReferencesInspected !== 9216 ||
  contract.summary.syntheticRetirementImpactedProfiles <= 0 ||
  contract.summary.currentProductionAllowlistEntries !== 0 ||
  contract.summary.runtimeWiringCompleted ||
  simulatedRetirement.oldContentRenderedAfterRetirement ||
  simulatedRetirement.commonUsedAsPersonalizedFallback ||
  simulatedRetirement.emptyCanonicalRefReturnedToClient ||
  simulatedRetirement.profileDataCommitted ||
  simulatedRetirement.publicationChanged ||
  contract.implementationBoundary.resolverCodeWired ||
  contract.implementationBoundary.cacheInvalidationWired ||
  contract.implementationBoundary.databaseChanged ||
  contract.implementationBoundary.canonicalChanged ||
  contract.implementationBoundary.publicationChanged
) {
  throw new Error(
    "Withdrawal fallback runtime contract invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});
const fixtureOutput = await prettier.format(JSON.stringify(fixture), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(contract), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [fixturePath, fixtureOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error(
      "v2.3 withdrawal fallback runtime contract is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Withdrawal fallback runtime contract v2.3: ${contract.summary.resolverCasesPassed}/${contract.summary.resolverCases} resolver cases passed, ${contract.summary.profileReferencesInspected} refs inspected, runtime wiring false.`,
);

function resolve(entry) {
  if (entry.canonicalState === "retired") {
    return "deny_and_invalidate_stale_allowlist";
  }
  if (entry.canonicalState === "common_archive") {
    return "deny_common_personalization";
  }
  if (entry.canonicalState === "missing") {
    return "omit_claim_section_and_log_integrity_error";
  }
  if (
    entry.canonicalState === "approved" &&
    entry.allowlistedForSurface
  ) {
    return "render_exact_approved_version";
  }
  return "omit_claim_section";
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# 156. 철회와 fallback runtime 계약 v2.3

- 상태: \`${result.status}\`
- resolver 합성 시험: **${result.summary.resolverCasesPassed}/${result.summary.resolverCases} 통과**
- 검사한 profile 참조: **${result.summary.profileReferencesInspected}개**
- 합성 철회 영향 성향: **${result.summary.syntheticRetirementImpactedProfiles}개**
- 현재 운영 allowlist: **${result.summary.currentProductionAllowlistEntries}개**
- runtime 연결: **아직 안 함**

## 기본 동작

- 승인 상태·정확한 version·surface allowlist·privacyScope·manifest digest를 모두 통과해야 렌더링한다.
- 결정이 없거나 문장이 사라졌으면 해당 section을 생략한다.
- 철회 문장, COMMON, 반대 축 문장, 미승인 최신 초안을 fallback으로 사용하지 않는다.
- rollback version도 명시적으로 승인된 경우에만 사용한다.
- 철회 시 결과·성향지도·비교·프로필·공유·서버·클라이언트 캐시를 함께 무효화한다.

## 현재 경계

합성 철회만 계산했으며 canonical, 32개 profile, DB, 발행 manifest, 앱 runtime은 변경하지 않았다. 운영 허용 canonical은 계속 0개다.
`;
}
