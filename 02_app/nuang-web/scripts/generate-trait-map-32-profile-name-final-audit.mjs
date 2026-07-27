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
  "TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json",
);
const reportPath = path.join(
  docsDirectory,
  "13_ALL_32_PROFILE_NAME_FINAL_AUDIT_V2_1.md",
);
const checkOnly = process.argv.includes("--check");
const structuralAudit = readJson(
  "TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const forbiddenPattern =
  /천재|완벽|우월|열등|치유|정상|비정상|문제형|사이코|소시오|정확히 예측|위험을 미리|타고난|반드시|항상 성공/;
const familyMeaning = {
  PRACTICAL_SOLUTION: "구체적인 단서와 원인·해결을 함께 보는 현실 해법형",
  CONCRETE_CARE: "구체적인 상황과 사람의 마음을 함께 보는 생활 관계형",
  POSSIBILITY_SOLUTION: "새 가능성과 원인·해결을 함께 보는 가능성 개척형",
  POSSIBILITY_CONNECTION: "새 가능성과 사람의 마음을 함께 보는 관계 영감형",
};
const changeHistory = {
  ERGKQ: {
    previousShortName: "해결사",
    previousDisplayName: "문제를 빠르게 푸는 해결사",
    decision: "display_name_changed",
    reason:
      "문제를 잘 푼다는 능력 단정 대신, Q의 빠른 반응과 G의 해결 초점을 관찰 표현으로 바꿨어요.",
  },
  IRGKQ: {
    previousShortName: "전략가",
    previousDisplayName: "위험을 미리 살피는 전략가",
    decision: "display_name_changed",
    reason:
      "Q를 위험 예측 능력으로 읽지 않도록, 변화 가능성을 꼼꼼히 살피는 방식으로 바꿨어요.",
  },
  IRGMQ: {
    previousShortName: "추적자",
    previousDisplayName: "원인을 끝까지 좇는 추적자",
    decision: "display_name_changed",
    reason:
      "M과 반대처럼 들릴 수 있는 '끝까지'를 빼고, 상황 변화 속 원인에 관심이 가는 모습을 남겼어요.",
  },
  INGKQ: {
    previousShortName: "예측가",
    previousDisplayName: "위험과 가능성을 보는 예측가",
    decision: "short_and_display_name_changed",
    reason:
      "뉴앙이 측정하지 않는 미래 예측 능력을 암시하지 않도록, 가능성과 변수를 살피고 방향을 그리는 구상가로 바꿨어요.",
  },
};
const profiles = structuralAudit.profiles
  .map(buildNameAudit)
  .sort((left, right) => left.code.localeCompare(right.code, "en"));
const shortNames = profiles.map((profile) => profile.shortName);
const displayNames = profiles.map((profile) => profile.displayName);
const familyCounts = countBy(profiles, "familyId");
const globalChecks = {
  exactCodeCoverage: profiles.length === 32,
  uniqueShortNames: new Set(shortNames).size === 32,
  uniqueDisplayNames: new Set(displayNames).size === 32,
  shortNamesThreeToSixCharacters: profiles.every(
    (profile) => profile.shortName.length >= 3 && profile.shortName.length <= 6,
  ),
  displayNamesAtMostFourWords: profiles.every(
    (profile) => profile.displayName.split(/\s+/).length <= 4,
  ),
  displayNamesContainShortName: profiles.every((profile) =>
    profile.displayName.includes(profile.shortName),
  ),
  noForbiddenOverclaimTerms: profiles.every(
    (profile) => profile.forbiddenTermMatches.length === 0,
  ),
  eightProfilesPerFamily: Object.values(familyCounts).every(
    (count) => count === 8,
  ),
  allManuscriptNamesMatchCatalog: structuralAudit.profiles.every(
    (profile) => profile.longformNameMatchesCatalog,
  ),
};
const report = {
  contractVersion: "nuang-trait-map-32-profile-name-final-audit.v2.1",
  reportId: "TRAIT-MAP-32-PROFILE-NAME-FINAL-AUDIT.2.1",
  releaseId: "NUANG-PROFILE-NAME-CANDIDATE-2.1",
  status: Object.values(globalChecks).every(Boolean)
    ? "CATALOG_INTERNALLY_CONSISTENT_USER_VALIDATION_REQUIRED"
    : "CATALOG_REPAIR_REQUIRED",
  publicationState: "candidate_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  summary: {
    profiles: profiles.length,
    retainedNames: profiles.filter((profile) => profile.decision === "retain")
      .length,
    displayNamesChanged: profiles.filter((profile) =>
      ["display_name_changed", "short_and_display_name_changed"].includes(
        profile.decision,
      ),
    ).length,
    shortNamesChanged: profiles.filter(
      (profile) => profile.decision === "short_and_display_name_changed",
    ).length,
    automatedChecksPassed: Object.values(globalChecks).filter(Boolean).length,
    automatedChecksTotal: Object.keys(globalChecks).length,
    userValidatedNames: 0,
    customerApprovedNames: 0,
  },
  globalChecks,
  familyCounts,
  rubric: [
    {
      id: "R1_RECALL",
      requirement:
        "짧은 별칭은 3~6글자이고 32개가 서로 달라 대화와 공유에서 기억하기 쉬워야 한다.",
    },
    {
      id: "R2_IMMEDIATE_MEANING",
      requirement:
        "긴 별칭은 네 어절 이하이고 짧은 별칭을 포함해 첫인상을 바로 이해할 수 있어야 한다.",
    },
    {
      id: "R3_CODE_TRACEABILITY",
      requirement:
        "별칭 옆의 다섯 글자 설명으로 이름이 가리키는 큰 방향을 거슬러 확인할 수 있어야 한다.",
    },
    {
      id: "R4_NEIGHBOR_DIFFERENTIATION",
      requirement:
        "한 글자만 다른 코드끼리도 별칭이 중복되지 않고 반대 행동을 강요하지 않아야 한다.",
    },
    {
      id: "R5_NO_OVERCLAIM",
      requirement:
        "능력·미래 예측·위험 탐지·도덕성·정신건강·관계 결과를 검사했다고 오해하게 만들지 않는다.",
    },
    {
      id: "R6_SHARE_DESIRE",
      requirement:
        "사용자가 자신의 코드와 함께 프로필·공유 카드에 쓰고 싶은 이름인지 실제 사용자에게 확인한다.",
    },
  ],
  interpretationRules: [
    "별칭은 다섯 글자를 외우고 이야기하기 쉽게 만든 활동명이지 직업·능력·등급이 아니다.",
    "별칭만 보고 개인의 실제 행동을 확정하지 않고 다섯 축 비율과 상세 성향지도를 함께 본다.",
    "같은 코드라도 세부 반응과 상황 경험이 다를 수 있으므로 비교 리포트는 실제 검사 데이터를 우선한다.",
    "사용자 이해도·회상·공유 의향 검증에서 반복 오해가 나오면 코드와 점수는 유지하고 별칭만 다시 바꾼다.",
  ],
  remainingUserValidation: {
    minimumTasks: [
      "5초 동안 이름을 본 뒤 어떤 사람으로 이해했는지 자유롭게 말하기",
      "한 글자만 다른 두 이름을 보고 차이를 설명하기",
      "하루 뒤 코드·짧은 별칭·긴 별칭 중 무엇을 기억하는지 확인하기",
      "능력·직업·성별·나이·정신건강 판단처럼 느껴지는지 확인하기",
      "프로필이나 공유 카드에 실제로 표시하고 싶은지 선택하기",
    ],
    requiredSegments: [
      "20대",
      "30대",
      "40대 이상",
      "성향 검사에 익숙한 사람",
      "성향 검사에 익숙하지 않은 사람",
    ],
    approvalRule:
      "32개 각각의 이해·회상·오해·공유 의향 결과와 수정 이력을 기록한 뒤 별도 고객 발행 승인을 받아야 한다.",
  },
  profiles,
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
      "Trait-map profile-name final audit is stale. Run npm run research:trait-map:v2:name-final-audit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `32-profile name audit: ${report.summary.automatedChecksPassed}/${report.summary.automatedChecksTotal} automated checks, ${report.summary.retainedNames} retained, ${report.summary.displayNamesChanged} display names changed, ${report.summary.shortNamesChanged} short name changed, 0 customer-approved.`,
);

function buildNameAudit(profile) {
  const history = changeHistory[profile.code];
  const codeReading = buildCodeReading(profile.code);
  const forbiddenTermMatches =
    profile.profileName.match(forbiddenPattern)?.filter(Boolean) ?? [];
  return {
    code: profile.code,
    shortName: profile.shortName,
    displayName: profile.profileName,
    familyId: profile.familyId,
    familyMeaning: familyMeaning[profile.familyId],
    codeReading,
    intendedReading: `${familyMeaning[profile.familyId]}. ${codeReading.join(" · ")}.`,
    decision: history?.decision ?? "retain",
    previousShortName: history?.previousShortName ?? null,
    previousDisplayName: history?.previousDisplayName ?? null,
    decisionReason:
      history?.reason ??
      "현재 별칭은 같은 성향군 안에서 고유하고 짧으며, 다섯 글자의 큰 방향과 정면으로 어긋나는 능력·진단 표현이 없어 유지했어요.",
    checks: {
      uniqueShortName:
        structuralAudit.profiles.filter(
          (item) => item.shortName === profile.shortName,
        ).length === 1,
      uniqueDisplayName:
        structuralAudit.profiles.filter(
          (item) => item.profileName === profile.profileName,
        ).length === 1,
      shortLength:
        profile.shortName.length >= 3 && profile.shortName.length <= 6,
      displayWordLength: profile.profileName.split(/\s+/).length <= 4,
      displayContainsShortName: profile.profileName.includes(profile.shortName),
      familyMatchesCode: profile.familyMatchesCode,
      manuscriptMatchesCatalog: profile.longformNameMatchesCatalog,
      forbiddenOverclaimFree: forbiddenTermMatches.length === 0,
    },
    forbiddenTermMatches,
    roleNameBoundary:
      "기억과 소통을 돕는 활동명이며 직업·능력·미래 예측·도덕성·정신건강 판정이 아니에요.",
    userValidationState: "not_started",
    publicationState: "candidate_only",
  };
}

function buildCodeReading(code) {
  const directions = [
    {
      E: "함께 있을 때 활력이 오르고 필요한 말을 먼저 꺼내는 편",
      I: "혼자 정리하며 회복하고 살핀 뒤 표현하는 편",
    },
    {
      R: "확인된 사실과 구체적인 내용부터 보는 편",
      N: "보이는 것 너머의 가능성과 새 관점을 찾는 편",
    },
    {
      G: "관계 문제의 원인과 해결할 부분에 관심이 가는 편",
      A: "상대의 마음과 관계 변화에 관심이 가는 편",
    },
    {
      K: "시작·지속·정리의 흐름이 비교적 꾸준한 편",
      M: "시작·지속·정리의 흐름이 상황 영향을 더 받는 편",
    },
    {
      C: "불편할 때 걱정과 감정이 비교적 천천히 커지는 편",
      Q: "불편할 때 걱정과 감정이 비교적 빠르게 커지는 편",
    },
  ];
  return code.split("").map((symbol, index) => directions[index][symbol]);
}

function countBy(items, key) {
  return Object.fromEntries(
    [...new Set(items.map((item) => item[key]))]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((value) => [
        value,
        items.filter((item) => item[key] === value).length,
      ]),
  );
}

function buildMarkdownReport(result) {
  const changeRows = result.profiles
    .filter((profile) => profile.decision !== "retain")
    .map(
      (profile) =>
        `| ${profile.code} | ${profile.previousShortName} · ${profile.previousDisplayName} | ${profile.shortName} · ${profile.displayName} | ${profile.decisionReason} |`,
    )
    .join("\n");
  const profileRows = result.profiles
    .map(
      (profile) =>
        `| ${profile.code} | ${profile.shortName} | ${profile.displayName} | ${profile.familyMeaning} | ${profile.decision === "retain" ? "유지" : "변경"} |`,
    )
    .join("\n");
  return `# 32개 한글 별칭 최종 감사 v2.1

- 상태: \`${result.status}\`
- 릴리스: \`${result.releaseId}\`
- 자동 기준: ${result.summary.automatedChecksPassed}/${result.summary.automatedChecksTotal} 통과
- 실제 사용자 승인: 0개

## 핵심 판정

32개 짧은 별칭과 긴 별칭은 모두 고유하고, 짧은 별칭은 3~6글자,
긴 별칭은 네 어절 이하이며 짧은 별칭을 포함한다. 네 성향군에는 각각
8개 코드가 정확히 들어 있다.

재검토에서 미래 예측·위험 탐지·문제 해결 능력처럼 읽힐 수 있거나
코드 방향과 부딪히는 표현 네 개를 바꿨다. 나머지 28개는 유지했다.

## 바꾼 이름

| 코드 | 이전 | 현재 | 이유 |
| --- | --- | --- | --- |
${changeRows}

## 32개 전체

| 코드 | 짧은 별칭 | 긴 별칭 | 큰 성향군 | 판정 |
| --- | --- | --- | --- | --- |
${profileRows}

## 아직 남은 검증

이름의 내부 일관성은 통과했지만, “좋은 이름”은 코드만 보고 확정할 수 없다.
5초 이해도, 한 글자 이웃 구분, 하루 뒤 회상, 능력·진단 오해, 공유 의향을
연령과 검사 친숙도별 실제 사용자에게 확인해야 한다. 그 전까지 32개 모두
제품 후보이며 고객 승인 이름은 0개다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
