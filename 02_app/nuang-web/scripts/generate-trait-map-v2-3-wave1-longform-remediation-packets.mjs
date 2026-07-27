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
  "TRAIT_MAP_WAVE1_LONGFORM_REMEDIATION_PACKETS_V2_3.json",
);
const queuePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_WAVE1_LONGFORM_REMEDIATION_WORK_QUEUE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "159_WAVE1_LONGFORM_REMEDIATION_PACKETS_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const historicalWaveCodes = [
  "INGKQ",
  "INAMC",
  "IRAMQ",
  "IRAKC",
  "INAMQ",
  "IRGKQ",
  "ERAMQ",
  "INGMQ",
];

const completeness = readGenerated(
  "TRAIT_MAP_V2_3_COMPLETENESS_GAP_REGISTER.json",
);
const contentAudit = readGenerated(
  "TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json",
);
const profileRebase = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const contentByCode = new Map(
  contentAudit.profiles.map((profile) => [profile.code, profile]),
);
const rebaseByCode = new Map(
  profileRebase.profiles.map((profile) => [profile.code, profile]),
);
const completenessByCode = new Map(
  completeness.profiles.map((profile) => [profile.code, profile]),
);

const packets = historicalWaveCodes.map((code, index) => {
  const content = contentByCode.get(code);
  const profile = rebaseByCode.get(code);
  const complete = completenessByCode.get(code);
  if (!content || !profile || !complete) {
    throw new Error(`Wave-1 completion lineage missing for ${code}.`);
  }
  return {
    packetId: `LONGFORM-REMEDIATION-${code}-V2.3`,
    code,
    shortName: profile.shortName,
    displayName: profile.displayName,
    historicalPriorityRank: index + 1,
    manuscriptPath: complete.manuscriptPath,
    initialState: {
      thinChapters: 8,
      remediationWave: "WAVE-1",
      sourceSnapshot:
        "TRAIT_MAP-WAVE1-LONGFORM-REMEDIATION-PACKETS.2.3 pre-remediation baseline",
    },
    currentState: {
      totalNonWhitespaceCharacters: content.totalNonWhitespaceCharacters,
      contentCharactersExcludingEvidence:
        content.contentCharactersExcludingEvidence,
      editorialCharacters: content.editorialCharacters,
      canonicalClaimRefs: profile.claimRefCount,
      thinChapters: content.thinChapters.length,
      repeatedLongLineCharacterRatio: content.repeatedLongLineCharacterRatio,
      missingCanonicalClaimsInManifest:
        content.missingCanonicalClaimsInManifest,
      automatedContentGate: content.automatedContentGate,
    },
    completion: {
      automatedContentRepair: "passed",
      canonicalV23Rebase: "passed",
      externalIndependentReview: "not_started",
      participantValidation: "not_started",
      customerPublicationApproval: "not_started",
    },
    publicationState: "research_only",
  };
});

const report = {
  contractVersion: "nuang-trait-map-wave1-longform-remediation-packets.v2.3",
  reportId: "TRAIT-MAP-WAVE1-LONGFORM-REMEDIATION-PACKETS.2.3",
  status: "WAVE_1_AUTOMATED_CONTENT_REMEDIATION_COMPLETE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceCompletenessReportId: completeness.reportId,
  sourceContentAuditReportId: contentAudit.reportId,
  sourceProfileRebaseReportId: profileRebase.reportId,
  summary: {
    waveProfiles: packets.length,
    totalCanonicalClaimRefs: packets.reduce(
      (sum, packet) => sum + packet.currentState.canonicalClaimRefs,
      0,
    ),
    initialThinChapters: 64,
    initialSubstantiveMissingCharacters: 12_506,
    initialEditorialCoreMissingCharacters: 9_448,
    currentThinChapters: packets.reduce(
      (sum, packet) => sum + packet.currentState.thinChapters,
      0,
    ),
    profilesPassingAutomatedContentGate: packets.filter(
      (packet) => packet.currentState.automatedContentGate === "PASS",
    ).length,
    profilesCanonicalV23Rebased: packets.filter(
      (packet) => packet.currentState.missingCanonicalClaimsInManifest === 0,
    ).length,
    openAutomatedContentRepairs: packets.filter(
      (packet) => packet.currentState.automatedContentGate !== "PASS",
    ).length,
    externalIndependentApprovals: 0,
    customerPublicationApprovals: 0,
  },
  packets,
  nextGate: {
    name: "FINAL_REPRODUCIBILITY_AND_REQUIREMENT_AUDIT",
    action:
      "WAVE-1을 포함한 32개 원장 전체 current check와 요구사항별 최종 완료 감사를 실행한다.",
  },
};

const queue = {
  queueVersion: "nuang-trait-map-wave1-longform-remediation-work-queue.v2.3",
  sourceReportId: report.reportId,
  state: "automated_content_remediation_complete",
  entries: packets.map((packet) => ({
    packetId: packet.packetId,
    code: packet.code,
    manuscriptPath: packet.manuscriptPath,
    automatedContentRepair: "passed",
    canonicalV23Rebase: "passed",
    externalIndependentReview: "not_started",
    participantValidation: "not_started",
    customerPublicationApproval: "not_started",
  })),
};

if (
  report.summary.waveProfiles !== 8 ||
  report.summary.totalCanonicalClaimRefs !== 2304 ||
  report.summary.initialThinChapters !== 64 ||
  report.summary.currentThinChapters !== 0 ||
  report.summary.profilesPassingAutomatedContentGate !== 8 ||
  report.summary.profilesCanonicalV23Rebased !== 8 ||
  report.summary.openAutomatedContentRepairs !== 0 ||
  report.summary.externalIndependentApprovals !== 0 ||
  report.summary.customerPublicationApprovals !== 0
) {
  throw new Error("Wave-1 remediation completion invariants failed.");
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
    console.error(
      "v2.3 Wave-1 longform remediation completion record is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(queuePath, queueOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Wave-1 longform remediation v2.3: ${packets.length}/8 automated content gates passed, 0 thin chapters, 0 open content repairs, customer approvals 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  const rows = result.packets
    .map(
      (packet) =>
        `| ${packet.code} | ${packet.currentState.totalNonWhitespaceCharacters.toLocaleString("ko-KR")} | ${packet.currentState.contentCharactersExcludingEvidence.toLocaleString("ko-KR")} | ${packet.currentState.editorialCharacters.toLocaleString("ko-KR")} | ${packet.currentState.thinChapters} | ${packet.currentState.repeatedLongLineCharacterRatio} | ${packet.currentState.automatedContentGate} |`,
    )
    .join("\n");
  return `# 159. WAVE-1 장문 원장 보수 완료 기록 v2.3

- 상태: \`${result.status}\`
- 최초 얇은 장: **${result.summary.initialThinChapters}개**
- 현재 얇은 장: **${result.summary.currentThinChapters}개**
- 자동 내용 gate: **${result.summary.profilesPassingAutomatedContentGate}/8**
- v2.3 canonical 재연결: **${result.summary.profilesCanonicalV23Rebased}/8**
- 열린 내용 보수: **${result.summary.openAutomatedContentRepairs}개**
- 고객 발행 승인: **0개**

## 전후 판정

초기 WAVE-1은 얇은 핵심 장 64개와 실제 설명량·편집 밀도 부족을 보수하기 위해 구성됐다. 현재 8개 원장은 모두 v2.3 canonical 문장과 근거 추적을 사용하며, 장별 깊이·반복·분량·이웃 일관성 자동 기준을 통과했다.

| 코드 | 총 글자 | 근거 제외 설명 | 핵심 편집문 | 얇은 장 | 반복 비율 | 자동 gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows}

이 완료는 연구 원장의 자동 내용 보수를 뜻한다. 독립 외부 검토·실제 참여자 타당화·고객 발행 승인은 별도 단계이며 0으로 유지한다.
`;
}
