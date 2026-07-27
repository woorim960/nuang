import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const inputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_REVIEW_V2.json",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_COPY_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const packet = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const prohibitedPhrases = [
  "그럴 수도",
  "아닐 수도",
  "단정할 수 없",
  "무조건 그런",
  "알 수 없",
  "상황에 따라 다르",
  "사람마다 다르",
];
const stigmatizingShortcuts = [
  "사람을 피한다",
  "상상력이 부족",
  "공감이 부족",
  "계획이 없다",
  "감정이 없다",
];
const exactAssertionCounts = new Map();
for (const claim of packet.claims) {
  const assertion = claim.assertion.trim();
  exactAssertionCounts.set(
    assertion,
    (exactAssertionCounts.get(assertion) ?? 0) + 1,
  );
}

const rows = packet.claims.map((claim) => {
  const assertion = claim.assertion.trim();
  const issues = [];
  const matchedPhrases = prohibitedPhrases.filter((phrase) =>
    assertion.includes(phrase),
  );
  const matchedShortcuts = stigmatizingShortcuts.filter((phrase) =>
    assertion.includes(phrase),
  );
  if (matchedPhrases.length > 0) {
    issues.push(`회피 문구: ${matchedPhrases.join(", ")}`);
  }
  if (matchedShortcuts.length > 0) {
    issues.push(`낙인성 축약: ${matchedShortcuts.join(", ")}`);
  }
  if (assertion.length < 40) issues.push("설명이 지나치게 짧음");
  if (assertion.length > 125) issues.push("모바일 한 문장 기준으로 너무 김");
  if ((exactAssertionCounts.get(assertion) ?? 0) > 1) {
    issues.push("다른 claim과 문장 전체가 중복됨");
  }
  if (claim.claimKind === "first_thought" && !assertion.includes("“")) {
    issues.push("처음 드는 생각에 구체적인 자기 말이 없음");
  }
  if (
    claim.claimKind === "actual_response" &&
    !/(편이다|이어지는|움직이는|반응하는)/.test(assertion)
  ) {
    issues.push("실제 나타나는 반응을 행동말로 설명하지 않음");
  }
  return {
    claimId: claim.claimId,
    scenarioId: claim.scenarioRefs[0],
    claimKind: claim.claimKind,
    characterCount: assertion.length,
    issueCount: issues.length,
    issues,
    status: issues.length === 0 ? "automatic_pass" : "needs_rewrite",
  };
});

const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "IRGMC-SCENARIO-COPY-AUDIT.0.1",
  status: rows.every((row) => row.issueCount === 0)
    ? "AUTOMATIC_RULES_PASSED_HUMAN_REVIEW_REQUIRED"
    : "REWRITE_REQUIRED",
  auditedClaims: rows.length,
  automaticPasses: rows.filter((row) => row.issueCount === 0).length,
  rewriteRequired: rows.filter((row) => row.issueCount > 0).length,
  exactDuplicateAssertions: [...exactAssertionCounts.values()].filter(
    (count) => count > 1,
  ).length,
  prohibitedPhrases,
  stigmatizingShortcuts,
  characterCounts: {
    minimum: Math.min(...rows.map((row) => row.characterCount)),
    maximum: Math.max(...rows.map((row) => row.characterCount)),
    average: Math.round(
      rows.reduce((sum, row) => sum + row.characterCount, 0) / rows.length,
    ),
  },
  nextGate:
    "자동 통과는 정확성이나 공개 승인이 아니다. 인지 인터뷰, 인접 코드 blind 비교, 전문가 검토를 계속 요구한다.",
  rows,
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "IRGMC scenario copy audit is stale. Run npm run research:trait-map:v2:irgmc-copy-audit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `IRGMC scenario copy audit: ${report.automaticPasses}/${report.auditedClaims} automatic passes, ${report.rewriteRequired} rewrites.`,
);
