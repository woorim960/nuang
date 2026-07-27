import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
  "TRAIT_MAP_DATA_CENTER_FINAL_COMPLETION_AUDIT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "161_DATA_CENTER_FINAL_COMPLETION_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const axisV21 = readGenerated("TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json");
const axisV22 = readGenerated("TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json");
const axisV23 = readGenerated("TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_3.json");
const allBatch = readGenerated("TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2_3.json");
const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const recomposition = readGenerated(
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const structural = readGenerated(
  "TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const content = readGenerated("TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json");
const master = readGenerated(
  "TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
);
const completeness = readGenerated(
  "TRAIT_MAP_V2_3_COMPLETENESS_GAP_REGISTER.json",
);
const contextAudit = readGenerated(
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const nameAudit = readGenerated(
  "TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json",
);
const profileRebase = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const commonIsolation = readGenerated(
  "TRAIT_MAP_COMMON_ISOLATION_AUDIT_V2_3.json",
);
const publication = readGenerated("TRAIT_MAP_PUBLICATION_GATE_V2_3.json");
const runtimeHarness = readGenerated(
  "TRAIT_MAP_RUNTIME_RESOLVER_HARNESS_V2_3.json",
);

const reproducibility = checkOnly
  ? readStoredReproducibility()
  : runReproducibilityCheck();
const proofFiles = [
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_V2_3_COMPLETENESS_GAP_REGISTER.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_COMMON_ISOLATION_AUDIT_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_PUBLICATION_GATE_V2_3.json",
  "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_RUNTIME_RESOLVER_HARNESS_V2_3.json",
  "scripts/check-trait-map-v2-3-current.mjs",
  "scripts/lib/generate-derived-longform-research-draft.mjs",
  "scripts/generate-trait-map-32-content-quality-audit.mjs",
].map(hashProofFile);

const requirements = [
  result(
    "RM-01",
    "705 canonical 계보의 완전한 재구축",
    [
      axisV21.summary.canonicalVariants === 705,
      axisV22.summary.baselineCanonicalVariants === 705,
      axisV22.summary.canonicalVariants === 611,
      axisV23.summary.baselineCanonicalVariants === 611,
      axisV23.summary.canonicalVariants === 605,
      axisV21.summary.structuralIssueCount === 0,
      axisV22.summary.structuralIssueCount === 0,
      axisV23.summary.structuralIssueCount === 0,
    ],
    "v2.1 705 → v2.2 611 → v2.3 605, 구조 오류 0",
  ),
  result(
    "RM-02",
    "CAB-01~12 문장 교정 원장 완결",
    [
      allBatch.summary.batches === 12,
      allBatch.summary.batchesPassingStructuralAudit === 12,
      allBatch.summary.scenarios === 72,
      allBatch.summary.claimSlots === 288,
      allBatch.summary.canonicalVariants === 605,
      allBatch.summary.preflightHardFailures === 0,
      ledger.summary.entries === 605,
    ],
    "CAB 12/12, 72개 상황, 288개 슬롯, canonical 605개",
  ),
  result(
    "RM-03",
    "32개 성향 재조합과 한 글자 이웃 완결",
    [
      recomposition.summary.profileClaimReferences === 9216,
      recomposition.summary.unresolvedReferences === 0,
      recomposition.summary.duplicateOutputsWithinClaim === 0,
      recomposition.summary.unsafeLanguageFlags === 0,
      recomposition.summary.commonSurfaceViolations === 0,
      recomposition.summary.neighborEdgesPassed === 80,
      recomposition.summary.neighborEdges === 80,
      allBatch.summary.neighborEdgesPassed === 960,
      allBatch.summary.neighborEdges === 960,
    ],
    "9,216개 참조, 전체 이웃 80/80, CAB 이웃 960/960",
  ),
  result(
    "RM-04",
    "32개 장문 원고 구조와 최소 분량",
    [
      structural.status ===
        "ALL_32_PROFILE_RESEARCH_PACKAGES_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
      completeness.summary.profiles === 32,
      completeness.summary.manuscriptsAtLeastFiftyThousand === 32,
      completeness.summary.profilesWith288CanonicalRefs === 32,
      completeness.summary.profilesWithAllCanonicalRefsResolved === 32,
    ],
    `32/32 5만 자 이상, 총 ${completeness.summary.totalLongformNonWhitespaceCharacters.toLocaleString("ko-KR")}자`,
  ),
  result(
    "RM-05",
    "32개 장문 원고 실질 품질 gate",
    [
      content.status ===
        "ALL_32_PROFILE_CONTENT_QUALITY_GATES_PASSED_HUMAN_VALIDATION_REQUIRED",
      content.totals.profilesMeetingEveryAutomatedContentGate === 32,
      content.totals.consistentNeighborEdges === 80,
      content.totals.inconsistentNeighborEdges === 0,
      master.summary.profilesPassingCurrentAutomatedContentGate === 32,
      master.summary.profilesRequiringContentRepair === 0,
    ],
    "32/32 내용 gate 통과, 열린 내용 보수 0",
  ),
  result(
    "RM-06",
    "근거·맥락 범위의 완전한 등록",
    [
      contextAudit.summary.canonicalEntriesAudited === 605,
      contextAudit.summary.findingLinksAudited === 2939,
      contextAudit.summary.exactRegisteredContextLinks +
        contextAudit.summary.totalContextTransfersNotEstablished ===
        contextAudit.summary.findingLinksAudited,
      contextAudit.summary.entriesWithNoExactContextFinding ===
        completeness.summary.noExactContextCanonicalEntries,
    ],
    "605 canonical과 2,939개 finding 연결의 맥락 범위 등록",
  ),
  result(
    "RM-07",
    "공식 10글자 언어와 32개 별칭 내부 계약",
    [
      profileRebase.summary.profilesUsingOfficialTenSymbolLanguage === 32,
      profileRebase.summary.uniqueShortNames === 32,
      profileRebase.summary.uniqueDisplayNames === 32,
      nameAudit.summary.automatedChecksPassed ===
        nameAudit.summary.automatedChecksTotal,
    ],
    "공식 10글자 언어 32/32, 짧은·긴 별칭 중복 0",
  ),
  result(
    "RM-08",
    "COMMON·미승인 문장 발행 차단",
    [
      commonIsolation.summary.violations === 0,
      commonIsolation.summary.blockedFromAllPersonalizedSurfaces === 61,
      publication.summary.productionAllowedCanonicalEntries === 0,
      publication.summary.productionPublicationBlocked,
      runtimeHarness.summary.syntheticProfileReferencesCovered === 9216,
      runtimeHarness.summary.appRoutesWired === 0,
    ],
    "COMMON 61개 개인화 차단, 운영 allowlist 0, route 연결 0",
  ),
  result(
    "RM-09",
    "최종 기준선 전체 재현 검사",
    [
      reproducibility.exitCode === 0,
      reproducibility.checksPassed > 0,
      reproducibility.command ===
        "node scripts/check-trait-map-v2-3-current.mjs --skip-final-audit",
    ],
    `${reproducibility.checksPassed}개 current check 통과`,
  ),
];
requirements.push(
  result(
    "RM-10",
    "요구사항별 최종 완료 감사",
    [
      requirements.length === 9,
      requirements.every((entry) => entry.state === "passed"),
      proofFiles.length === 19,
      proofFiles.every(
        (entry) => entry.bytes > 0 && entry.sha256.length === 64,
      ),
    ],
    `RM-01~09 개별 판정과 ${proofFiles.length}개 증거 파일 해시 고정`,
  ),
);

const passed = requirements.filter((entry) => entry.state === "passed").length;
const audit = {
  contractVersion: "nuang-trait-map-data-center-final-completion-audit.v2.3",
  reportId: "TRAIT-MAP-DATA-CENTER-FINAL-COMPLETION-AUDIT.2.3",
  status:
    passed === requirements.length
      ? "RESEARCH_MASTER_V2_3_COMPLETE"
      : "RESEARCH_MASTER_V2_3_INCOMPLETE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  targetId: "RESEARCH_MASTER_V2_3_COMPLETE",
  summary: {
    requirements: requirements.length,
    passed,
    blocked: requirements.length - passed,
    proofFilesHashed: proofFiles.length,
    customerPublicationValidated: false,
    customerPublicationAllowlistedEntries:
      publication.summary.productionAllowedCanonicalEntries,
  },
  reproducibility,
  requirements,
  proofFiles,
  scopeBoundary: {
    achieved:
      "사용자 참여 검증 전에 완성할 수 있는 canonical 계보·문장 원장·32개 재조합·장문 내용·근거 범위 등록·발행 차단·재현성",
    notClaimed:
      "독립 외부 검토, 실제 참여자 타당화, 고객 발행 승인, 운영 서비스 효능",
    reason:
      "실제 사용자 검사는 사용자가 별도로 진행하며, 합성 자료와 내부 검토를 외부 검증으로 바꾸어 말하지 않는다.",
  },
  nextRelease:
    "CUSTOMER_PUBLICATION_VALIDATED는 실제 독립 검토·인지 면담·정량 검증·별칭 사용자 검증·화면별 allowlist가 모두 통과한 뒤 별도로 판정한다.",
};

if (
  audit.summary.requirements !== 10 ||
  audit.summary.passed !== 10 ||
  audit.summary.blocked !== 0 ||
  audit.summary.customerPublicationValidated ||
  audit.summary.customerPublicationAllowlistedEntries !== 0
) {
  throw new Error("Final completion audit invariants failed.");
}

const output = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(audit), {
  parser: "markdown",
  proseWrap: "preserve",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown
  ) {
    console.error("v2.3 final completion audit is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Final completion audit v2.3: ${audit.summary.passed}/${audit.summary.requirements} research-master requirements passed, ${audit.summary.proofFilesHashed} proof files hashed, customer publication allowlist 0.`,
);

function runReproducibilityCheck() {
  const command =
    "node scripts/check-trait-map-v2-3-current.mjs --skip-final-audit";
  const result = spawnSync(
    process.execPath,
    [
      path.join(scriptDirectory, "check-trait-map-v2-3-current.mjs"),
      "--skip-final-audit",
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error("Final reproducibility check failed.");
  }
  const match = result.stdout.match(/(\d+) reproducibility checks passed/);
  if (!match) {
    throw new Error("Final reproducibility check count was not reported.");
  }
  return {
    command,
    exitCode: result.status,
    checksPassed: Number(match[1]),
    includesCanonicalBatches: 12,
    includesLongformSuites: 7,
    checkedAt: "2026-07-24T00:00:00.000Z",
  };
}

function readStoredReproducibility() {
  if (!fs.existsSync(outputPath)) {
    throw new Error(
      "Final completion audit is missing. Run the generator before --check.",
    );
  }
  return JSON.parse(fs.readFileSync(outputPath, "utf8")).reproducibility;
}

function result(requirementId, title, conditions, actual) {
  return {
    requirementId,
    title,
    state: conditions.every(Boolean) ? "passed" : "blocked",
    checks: conditions,
    actual,
  };
}

function hashProofFile(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Final proof file is missing: ${relativePath}`);
  }
  const contents = fs.readFileSync(filePath);
  return {
    path: relativePath,
    bytes: contents.length,
    sha256: crypto.createHash("sha256").update(contents).digest("hex"),
  };
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  const rows = result.requirements
    .map(
      (entry) =>
        `| ${entry.requirementId} | ${entry.title} | ${entry.state} | ${entry.actual} |`,
    )
    .join("\n");
  return `# 161. 데이터센터 최종 완료 감사 v2.3

- 목표: \`${result.targetId}\`
- 판정: \`${result.status}\`
- 요구사항: **${result.summary.passed}/${result.summary.requirements} 통과**
- 차단 항목: **${result.summary.blocked}개**
- 해시 고정 증거: **${result.summary.proofFilesHashed}개**
- 고객 발행 allowlist: **0개**

## 요구사항별 판정

| ID | 요구사항 | 상태 | 현재 증거 |
| --- | --- | --- | --- |
${rows}

## 재현성

- 명령: \`${result.reproducibility.command}\`
- 종료 코드: \`${result.reproducibility.exitCode}\`
- 통과 검사: **${result.reproducibility.checksPassed}개**
- CAB: **12/12**

## 완료 범위

${result.scopeBoundary.achieved}

## 완료했다고 주장하지 않는 범위

${result.scopeBoundary.notClaimed}

${result.scopeBoundary.reason}

연구 원장은 완성 상태로 고정하되 고객 발행은 계속 fail-closed로 유지한다. 실제 외부 검증이 들어오면 \`CUSTOMER_PUBLICATION_VALIDATED\`를 별도 release로 판정한다.
`;
}
