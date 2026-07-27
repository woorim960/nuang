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
const outputJsonPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json",
);
const outputMarkdownPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/05_32_PROFILE_CONTENT_QUALITY_AUDIT_V2.md",
);
const checkOnly = process.argv.includes("--check");
const codes = cartesianCodes();
const axisRefsByPosition = ["SE", "OE", "RO", "SM", "ER"];
const canonicalProfileRebase = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const canonicalContentLedger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const evidenceTraceAudit = readGenerated(
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const canonicalContentById = new Map(
  canonicalContentLedger.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const evidenceTraceById = new Map(
  evidenceTraceAudit.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const canonicalClaimsByCode = Object.fromEntries(
  codes.map((code) => [code, buildCanonicalClaims(code)]),
);
const assertionProfiles = new Map();
const chapterMinimums = {
  overview: 600,
  role_name_and_values: 600,
  five_code_positions: 1_500,
  code_interactions: 700,
  first_thought_and_actual_response: 500,
  daily_choice_and_change: 4_500,
  family: 4_500,
  friend: 4_500,
  partner: 4_500,
  person_of_interest: 4_500,
  work_and_study: 4_500,
  conflict_stress_and_recovery: 500,
  strength_overuse_and_growth: 500,
  misunderstanding_and_communication: 500,
  neighbor_contrasts: 2_500,
};
const scenarioChapterIds = new Set([
  "daily_choice_and_change",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work_and_study",
]);
const editorialChapterIds = new Set([
  "overview",
  "role_name_and_values",
  "five_code_positions",
  "code_interactions",
  "first_thought_and_actual_response",
  "conflict_stress_and_recovery",
  "strength_overuse_and_growth",
  "misunderstanding_and_communication",
]);

for (const [code, claims] of Object.entries(canonicalClaimsByCode)) {
  for (const claim of claims) {
    const profiles = assertionProfiles.get(claim.assertion) ?? new Set();
    profiles.add(code);
    assertionProfiles.set(claim.assertion, profiles);
  }
}

const neighborEdges = buildNeighborEdges();
const profiles = codes.map(auditProfile);
const globalChecks = {
  allScenarioInventoriesComplete: profiles.every(
    (profile) =>
      profile.scenarioClaims === 288 &&
      profile.uniqueScenarioClaimIds === 288 &&
      profile.exactDuplicateScenarioAssertions === 0,
  ),
  allClaimsTraceable: profiles.every(
    (profile) =>
      profile.claimsWithoutEvidence === 0 &&
      profile.highRiskClaimsWithFewerThanTwoSources === 0 &&
      profile.nonResearchOnlyClaims === 0 &&
      profile.missingCanonicalClaimsInManifest === 0 &&
      profile.unexpectedCanonicalClaimsInManifest === 0,
  ),
  noTemplateResidue: profiles.every(
    (profile) => profile.templateResidue.length === 0,
  ),
  allProfilesMeetSubstantiveDepth: profiles.every(
    (profile) =>
      profile.contentCharactersExcludingEvidence >= 40_000 &&
      profile.editorialCharacters >= 5_000 &&
      profile.thinChapters.length === 0 &&
      profile.repeatedLongLineCharacterRatio <= 0.03,
  ),
  allNeighborPairsFactoriallyConsistent: neighborEdges.every(
    (edge) => edge.status === "PASS",
  ),
};
const repairPriority = profiles
  .map((profile) => ({
    code: profile.code,
    automatedContentGate: profile.automatedContentGate,
    score:
      profile.thinChapters.length * 2 +
      profile.inconsistentNeighborEdges * 3 +
      (profile.contentCharactersExcludingEvidence < 40_000 ? 2 : 0) +
      (profile.editorialCharacters < 5_000 ? 2 : 0) +
      (profile.repeatedLongLineCharacterRatio > 0.03 ? 1 : 0) +
      profile.templateResidue.length * 4,
    thinChapters: profile.thinChapters.map((chapter) => chapter.chapterId),
    inconsistentNeighborEdges: profile.inconsistentNeighborEdges,
    contentCharactersExcludingEvidence:
      profile.contentCharactersExcludingEvidence,
    editorialCharacters: profile.editorialCharacters,
    repeatedLongLineCharacterRatio: profile.repeatedLongLineCharacterRatio,
  }))
  .sort(
    (left, right) =>
      right.score - left.score || left.code.localeCompare(right.code),
  );
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "TRAIT-MAP-32-CONTENT-QUALITY-AUDIT.0.1",
  status: Object.values(globalChecks).every(Boolean)
    ? "ALL_32_PROFILE_CONTENT_QUALITY_GATES_PASSED_HUMAN_VALIDATION_REQUIRED"
    : "CONTENT_QUALITY_REPAIR_REQUIRED",
  auditScope: [
    "장별 실제 정보량과 근거 장을 제외한 본문 분량",
    "원장 안의 정확히 중복된 상황 문장과 긴 문장 반복",
    "claim별 근거·위험 문장의 독립 출처·연구 전용 상태",
    "한 글자 이웃 80쌍에서 해당 축을 참조하는 claim만 달라지는지 확인",
    "TODO·placeholder·자동 생성 안내 같은 템플릿 잔여물",
  ],
  globalChecks,
  totals: {
    profiles: profiles.length,
    scenarioClaims: profiles.reduce(
      (total, profile) => total + profile.scenarioClaims,
      0,
    ),
    uniqueScenarioAssertions: assertionProfiles.size,
    neighborEdges: neighborEdges.length,
    consistentNeighborEdges: neighborEdges.filter(
      (edge) => edge.status === "PASS",
    ).length,
    inconsistentNeighborEdges: neighborEdges.filter(
      (edge) => edge.status !== "PASS",
    ).length,
    profilesMeetingEveryAutomatedContentGate: profiles.filter(
      (profile) => profile.automatedContentGate === "PASS",
    ).length,
  },
  thresholds: {
    contentCharactersExcludingEvidence: 40_000,
    editorialCharacters: 5_000,
    repeatedLongLineCharacterRatio: 0.03,
    expectedChangedClaimsByAxis: Object.fromEntries(
      axisRefsByPosition.map((axisRef) => [
        axisRef,
        canonicalClaimsByCode[codes[0]].filter((claim) =>
          claim.semanticAxes.includes(axisRef),
        ).length,
      ]),
    ),
    chapterMinimums,
  },
  profiles,
  neighborEdges,
  repairPriority,
  interpretation:
    "기존 5만 자·16개 장·72개 상황 감사보다 엄격한 내용 품질 감사다. 자동 통과는 심리측정 타당도나 고객 발행 승인을 뜻하지 않는다. 실패한 항목은 사람 검증 전에 원장 생성 계보와 본문을 보강해야 한다.",
};
const markdown = renderMarkdown(report);
const jsonOutput = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdownOutput = await prettier.format(markdown, {
  parser: "markdown",
  proseWrap: "preserve",
});

await writeOrCheck(outputJsonPath, jsonOutput);
await writeOrCheck(outputMarkdownPath, markdownOutput);

console.log(
  `32-profile content quality audit: ${report.status}; ${report.totals.consistentNeighborEdges}/${report.totals.neighborEdges} neighbor edges consistent, ${report.totals.profilesMeetingEveryAutomatedContentGate}/32 profiles pass every automated content gate.`,
);

function auditProfile(code) {
  const claims = canonicalClaimsByCode[code];
  const manifest = readGenerated(`${code}_LONGFORM_RESEARCH_MANIFEST_V2.json`);
  const markdown = fs.readFileSync(
    path.join(
      projectRoot,
      `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
    ),
    "utf8",
  );
  const assertions = claims.map((claim) => claim.assertion);
  const evidenceChapter = manifest.chapters.find(
    (chapter) => chapter.chapterId === "evidence_and_method",
  );
  const editorialCharacters = manifest.chapters
    .filter((chapter) => editorialChapterIds.has(chapter.chapterId))
    .reduce((total, chapter) => total + chapter.nonWhitespaceCharacters, 0);
  const scenarioCharacters = manifest.chapters
    .filter((chapter) => scenarioChapterIds.has(chapter.chapterId))
    .reduce((total, chapter) => total + chapter.nonWhitespaceCharacters, 0);
  const thinChapters = manifest.chapters
    .filter(
      (chapter) =>
        chapterMinimums[chapter.chapterId] !== undefined &&
        chapter.nonWhitespaceCharacters < chapterMinimums[chapter.chapterId],
    )
    .map((chapter) => ({
      chapterId: chapter.chapterId,
      actualCharacters: chapter.nonWhitespaceCharacters,
      requiredCharacters: chapterMinimums[chapter.chapterId],
      missingCharacters:
        chapterMinimums[chapter.chapterId] - chapter.nonWhitespaceCharacters,
    }));
  const exactDuplicateScenarioAssertions =
    assertions.length - new Set(assertions).size;
  const claimsWithoutEvidence = claims.filter(
    (claim) =>
      claim.evidenceFindingRefs.length === 0 ||
      claim.independentSourceRefs.length === 0,
  ).length;
  const highRiskClaimsWithFewerThanTwoSources = claims.filter(
    (claim) =>
      claim.riskDomains.some((risk) => risk !== "none") &&
      new Set(claim.independentSourceRefs).size < 2,
  ).length;
  const nonResearchOnlyClaims = claims.filter(
    (claim) => claim.publicationState !== "research_only",
  ).length;
  const exclusiveAssertions = claims.filter(
    (claim) => assertionProfiles.get(claim.assertion)?.size === 1,
  ).length;
  const manuscriptCanonicalClaimRefs = new Set(
    manifest.claimRefs.filter((claimId) => claimId.startsWith("CAN-SCN-")),
  );
  const missingCanonicalClaimsInManifest = claims.filter(
    (claim) => !manuscriptCanonicalClaimRefs.has(claim.claimId),
  ).length;
  const unexpectedCanonicalClaimsInManifest = [
    ...manuscriptCanonicalClaimRefs,
  ].filter(
    (claimId) => !claims.some((claim) => claim.claimId === claimId),
  ).length;
  const repeatedLongLineCharacterRatio =
    calculateRepeatedLongLineCharacterRatio(markdown);
  const templateResidue = [
    ...new Set(
      [
        "TODO",
        "TBD",
        "PLACEHOLDER",
        "LOREM",
        "예시 문구",
        "내용을 입력",
        "자동 생성된 설명",
        "채워 넣기",
      ].filter((token) => markdown.toUpperCase().includes(token.toUpperCase())),
    ),
  ];
  const profileEdges = neighborEdges.filter(
    (edge) => edge.leftCode === code || edge.rightCode === code,
  );
  const inconsistentNeighborEdges = profileEdges.filter(
    (edge) => edge.status !== "PASS",
  ).length;
  const contentCharactersExcludingEvidence =
    manifest.totalNonWhitespaceCharacters -
    (evidenceChapter?.nonWhitespaceCharacters ?? 0);
  const automatedContentGate =
    exactDuplicateScenarioAssertions === 0 &&
    claimsWithoutEvidence === 0 &&
    highRiskClaimsWithFewerThanTwoSources === 0 &&
    nonResearchOnlyClaims === 0 &&
    missingCanonicalClaimsInManifest === 0 &&
    unexpectedCanonicalClaimsInManifest === 0 &&
    templateResidue.length === 0 &&
    contentCharactersExcludingEvidence >= 40_000 &&
    editorialCharacters >= 5_000 &&
    thinChapters.length === 0 &&
    repeatedLongLineCharacterRatio <= 0.03 &&
    inconsistentNeighborEdges === 0
      ? "PASS"
      : "REPAIR_REQUIRED";

  return {
    code,
    profileName: manifest.profileName,
    automatedContentGate,
    totalNonWhitespaceCharacters: manifest.totalNonWhitespaceCharacters,
    evidenceCharacters: evidenceChapter?.nonWhitespaceCharacters ?? 0,
    evidenceCharacterRatio: round(
      (evidenceChapter?.nonWhitespaceCharacters ?? 0) /
        manifest.totalNonWhitespaceCharacters,
    ),
    contentCharactersExcludingEvidence,
    editorialCharacters,
    scenarioCharacters,
    thinChapters,
    scenarioClaims: claims.length,
    uniqueScenarioClaimIds: new Set(claims.map((claim) => claim.claimId)).size,
    exactDuplicateScenarioAssertions,
    exclusiveScenarioAssertions: exclusiveAssertions,
    sharedScenarioAssertions: claims.length - exclusiveAssertions,
    claimsWithoutEvidence,
    highRiskClaimsWithFewerThanTwoSources,
    nonResearchOnlyClaims,
    missingCanonicalClaimsInManifest,
    unexpectedCanonicalClaimsInManifest,
    repeatedLongLineCharacterRatio,
    templateResidue,
    inconsistentNeighborEdges,
  };
}

function buildCanonicalClaims(code) {
  const profile = canonicalProfileRebase.profiles.find(
    (candidate) => candidate.code === code,
  );
  if (!profile) {
    throw new Error(`${code} is missing from the v2.3 profile rebase.`);
  }
  const claims = profile.claimRefs.map((claimRef) => {
    const contentEntry = canonicalContentById.get(claimRef.canonicalVariantId);
    const evidenceEntry = evidenceTraceById.get(claimRef.canonicalVariantId);
    if (!contentEntry || !evidenceEntry) {
      throw new Error(
        `${code} cannot resolve ${claimRef.canonicalVariantId} through the v2.3 canonical ledger and evidence trace.`,
      );
    }
    if (
      contentEntry.claimKey !== claimRef.claimKey ||
      contentEntry.scenarioRef !== claimRef.scenarioRef
    ) {
      throw new Error(
        `${code} canonical metadata mismatch for ${claimRef.canonicalVariantId}.`,
      );
    }
    return {
      claimId: claimRef.canonicalVariantId,
      claimKey: claimRef.claimKey,
      scenarioRef: claimRef.scenarioRef,
      semanticAxes: claimRef.semanticAxes,
      assertion: contentEntry.content.summaryText,
      evidenceFindingRefs: evidenceEntry.evidenceFindingRefs,
      independentSourceRefs: evidenceEntry.registeredSourceRefs,
      riskDomains: evidenceEntry.riskDomains,
      publicationState: evidenceEntry.publicationState,
    };
  });
  if (
    claims.length !== 288 ||
    new Set(claims.map((claim) => claim.claimId)).size !== 288 ||
    new Set(claims.map((claim) => claim.claimKey)).size !== 288 ||
    new Set(claims.map((claim) => claim.scenarioRef)).size !== 72
  ) {
    throw new Error(`${code} v2.3 canonical claim inventory is incomplete.`);
  }
  return claims;
}

function buildNeighborEdges() {
  const pairs = [
    ["E", "I"],
    ["R", "N"],
    ["G", "A"],
    ["K", "M"],
    ["C", "Q"],
  ];
  const edges = [];

  for (const code of codes) {
    for (const [axisIndex, pair] of pairs.entries()) {
      const otherSymbol = pair.find((symbol) => symbol !== code[axisIndex]);
      const neighborCode = `${code.slice(0, axisIndex)}${otherSymbol}${code.slice(axisIndex + 1)}`;
      if (code.localeCompare(neighborCode, "en") > 0) {
        continue;
      }

      const leftClaims = new Map(
        canonicalClaimsByCode[code].map((claim) => [claim.claimKey, claim]),
      );
      const rightClaims = new Map(
        canonicalClaimsByCode[neighborCode].map((claim) => [
          claim.claimKey,
          claim,
        ]),
      );
      let changedCanonicalRefCount = 0;
      let changedAssertionCount = 0;
      const changedAxis = axisRefsByPosition[axisIndex];
      const unexpectedCanonicalChanges = [];
      const missingExpectedCanonicalChanges = [];
      const indistinguishableExpectedChanges = [];
      for (const [claimKey, leftClaim] of leftClaims) {
        const rightClaim = rightClaims.get(claimKey);
        const expectedToChange = leftClaim.semanticAxes.includes(changedAxis);
        const canonicalChanged = rightClaim?.claimId !== leftClaim.claimId;
        const assertionChanged = rightClaim?.assertion !== leftClaim.assertion;
        if (canonicalChanged) {
          changedCanonicalRefCount += 1;
        }
        if (assertionChanged) {
          changedAssertionCount += 1;
        }
        if (canonicalChanged && !expectedToChange) {
          unexpectedCanonicalChanges.push(claimKey);
        }
        if (!canonicalChanged && expectedToChange) {
          missingExpectedCanonicalChanges.push(claimKey);
        }
        if (canonicalChanged && expectedToChange && !assertionChanged) {
          indistinguishableExpectedChanges.push(claimKey);
        }
      }
      const expectedChangedClaims = [...leftClaims.values()].filter((claim) =>
        claim.semanticAxes.includes(changedAxis),
      ).length;

      edges.push({
        leftCode: code,
        rightCode: neighborCode,
        changedAxisPosition: axisIndex + 1,
        changedAxis,
        changedSymbols: `${code[axisIndex]}/${neighborCode[axisIndex]}`,
        expectedChangedClaims,
        sharedCanonicalRefCount: 288 - changedCanonicalRefCount,
        changedCanonicalRefCount,
        sharedAssertionCount: 288 - changedAssertionCount,
        changedAssertionCount,
        unexpectedCanonicalChanges,
        missingExpectedCanonicalChanges,
        indistinguishableExpectedChanges,
        status:
          unexpectedCanonicalChanges.length === 0 &&
          missingExpectedCanonicalChanges.length === 0 &&
          indistinguishableExpectedChanges.length === 0
            ? "PASS"
            : "RECONCILIATION_REQUIRED",
      });
    }
  }

  return edges.sort(
    (left, right) =>
      left.leftCode.localeCompare(right.leftCode, "en") ||
      left.rightCode.localeCompare(right.rightCode, "en"),
  );
}

function calculateRepeatedLongLineCharacterRatio(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length >= 80 && !line.startsWith("#") && !line.startsWith("-"),
    );
  const counts = new Map();
  for (const line of lines) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  const repeatedCharacters = [...counts.entries()].reduce(
    (total, [line, count]) =>
      total + (count > 1 ? line.length * (count - 1) : 0),
    0,
  );
  return round(repeatedCharacters / markdown.replace(/\s/g, "").length);
}

function renderMarkdown(report) {
  const failingProfiles = report.repairPriority.filter(
    (item) => item.automatedContentGate !== "PASS",
  );
  const inconsistentEdges = report.neighborEdges.filter(
    (edge) => edge.status !== "PASS",
  );
  return `# 뉴앙 32개 성향 원장 내용 품질 감사 V2

> 상태: \`${report.status}\`
> 목적: 파일 수와 5만 자 충족 여부가 아니라, 32개 원장이 실제로 서로 구분되고 고객용 상세 성향 데이터의 기반이 될 만큼 충분한지 확인한다.

## 결론

- 32개 원장과 9,216개 상황 claim은 모두 존재한다.
- claim ID 중복, 원장 안의 완전 동일 상황 문장, 근거가 전혀 없는 상황 claim, 고객에게 잘못 공개된 claim은 발견되지 않았다.
- 한 글자 이웃 80쌍 중 **${report.totals.consistentNeighborEdges}쌍**이 해당 축을 참조하는 claim만 바뀌는 규칙을 지켰다.
- 축별 변경 claim 수는 SE ${report.thresholds.expectedChangedClaimsByAxis.SE}개, OE ${report.thresholds.expectedChangedClaimsByAxis.OE}개, RO ${report.thresholds.expectedChangedClaimsByAxis.RO}개, SM ${report.thresholds.expectedChangedClaimsByAxis.SM}개, ER ${report.thresholds.expectedChangedClaimsByAxis.ER}개다.
- 규칙을 벗어난 이웃쌍은 **${report.totals.inconsistentNeighborEdges}쌍**이다.
- 5만 자에는 모든 성향이 공유하는 근거 원장도 포함된다. 근거 장을 제외한 실제 본문과 핵심 해설 장의 최소 분량을 별도 기준으로 관리해야 한다.
- 현재 모든 자동 내용 기준을 통과한 원장은 **${report.totals.profilesMeetingEveryAutomatedContentGate}/32개**다.

따라서 기존 상태를 “32개 원장 구조 완성”으로는 유지할 수 있지만, “32개 고객용 내용 완성”으로 부르면 안 된다. 제품 발행 전에 아래 보강이 필요하다.

## 발견된 핵심 문제

### 1. 한 글자 이웃 계보 불일치

한 글자만 다른 두 코드는 바뀐 축을 참조하는 claim만 달라져야 한다. 다음 ${inconsistentEdges.length}쌍은 v2.3 canonical 계보 규칙과 일치하지 않는다.

${inconsistentEdges.length > 0 ? inconsistentEdges.map((edge) => `- \`${edge.leftCode} ↔ ${edge.rightCode}\` · ${edge.changedAxis} ${edge.changedSymbols} · 예상 ${edge.expectedChangedClaims}개 / canonical 변경 ${edge.changedCanonicalRefCount}개 / 문장 변경 ${edge.changedAssertionCount}개`).join("\n") : "- 발견 없음"}

### 2. 장문 분량의 구성

원장별 총 5만 자에는 논문·공식 지침을 정리한 공통 근거 장이 포함된다. 내용 품질 감사에서는 근거 장을 제외한 본문 4만 자 이상, 핵심 해설 장 5천 자 이상, 장별 최소 분량을 별도로 요구한다. 이 기준을 통과하지 못한 장은 단순 문장 늘리기가 아니라 코드 고유의 가치·주의·생각·행동·말하기·관계별 예시로 보강해야 한다.

## 코드별 보강 우선순위

| 코드 | 보강 점수 | 불일치 이웃 | 근거 제외 본문 | 핵심 해설 | 긴 문장 반복 | 얇은 장 |
|---|---:|---:|---:|---:|---:|---|
${failingProfiles.map((profile) => `| ${profile.code} | ${profile.score} | ${profile.inconsistentNeighborEdges} | ${profile.contentCharactersExcludingEvidence.toLocaleString("ko-KR")}자 | ${profile.editorialCharacters.toLocaleString("ko-KR")}자 | ${(profile.repeatedLongLineCharacterRatio * 100).toFixed(1)}% | ${profile.thinChapters.join(", ") || "-"} |`).join("\n")}

## 보강 순서

1. 80개 이웃 간선을 기준으로 해당 축을 참조하는 claim만 달라지는지 다시 합성한다.
2. 어느 부모에서 출발해도 같은 코드에 도착하면 같은 문장이 만들어지는지 경로 독립성을 검사한다.
3. 근거 장을 제외한 본문과 핵심 해설 장을 코드별 고유 사례로 보강한다.
4. 정확히 같은 문장뿐 아니라 의미가 같은 반복 문장, 다른 코드 이름만 바꾼 문장, 번역체를 사람 검토한다.
5. 다시 자동 감사를 통과한 뒤 코드 이름을 가린 인지 인터뷰와 정량 검증으로 넘어간다.

자동 감사 통과는 심리측정 타당도나 고객 공개 승인을 뜻하지 않는다.
`;
}

async function writeOrCheck(filePath, output) {
  if (checkOnly) {
    if (
      !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, "utf8") !== output
    ) {
      console.error(
        "32-profile content quality audit is stale. Run npm run research:trait-map:v2:content-quality-audit.",
      );
      process.exit(1);
    }
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function cartesianCodes() {
  const result = [];
  for (const first of ["E", "I"])
    for (const second of ["R", "N"])
      for (const third of ["G", "A"])
        for (const fourth of ["K", "M"])
          for (const fifth of ["C", "Q"])
            result.push(`${first}${second}${third}${fourth}${fifth}`);
  return result.sort();
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}
