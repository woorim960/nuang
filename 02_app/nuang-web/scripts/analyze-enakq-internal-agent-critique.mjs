import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const researchRoot = path.join(projectRoot, "docs/research/enakq-map-v0.1");
const critiqueRoot = path.join(researchRoot, "internal-critique/v0.1");
const outputRoot = path.join(critiqueRoot, "analysis");
const assignmentPath = path.join(
  researchRoot,
  "generated/internal/claim_review_assignment.csv",
);
const checkOnly = process.argv.includes("--check");
const generatedAt = "2026-07-20T00:00:00+09:00";

const roleFiles = {
  personality_psychology: "personality_psychology_review.csv",
  psychometrics: "psychometrics_review.csv",
  relationship_safety: "relationship_safety_review.csv",
};

const assignments = readCsv(assignmentPath).rows;
const reviewsByClaim = new Map();
for (const [role, file] of Object.entries(roleFiles)) {
  for (const review of readCsv(path.join(critiqueRoot, file)).rows) {
    const reviews = reviewsByClaim.get(review.claim_id) ?? [];
    reviews.push({ ...review, reviewer_role: role });
    reviewsByClaim.set(review.claim_id, reviews);
  }
}

const adjudications = assignments.map((assignment) => {
  const requiredRoles = assignment.required_roles.split(";");
  const reviews = reviewsByClaim.get(assignment.claim_id) ?? [];
  invariant(
    reviews.length === requiredRoles.length,
    `${assignment.claim_id} expected ${requiredRoles.length} internal reviews, found ${reviews.length}`,
  );
  for (const role of requiredRoles) {
    invariant(
      reviews.some((review) => review.reviewer_role === role),
      `${assignment.claim_id} is missing ${role}`,
    );
  }

  const decisions = reviews.map((review) => review.decision);
  const disposition = getDisposition(decisions);
  const riskFlags = [
    ...new Set(
      reviews.flatMap((review) =>
        review.risk_flags
          .split(";")
          .map((value) => value.trim())
          .filter((value) => value && value !== "none"),
      ),
    ),
  ];
  return {
    claim_id: assignment.claim_id,
    priority: assignment.priority,
    required_roles: assignment.required_roles,
    role_decisions: reviews
      .map((review) => `${review.reviewer_role}:${review.decision}`)
      .join(";"),
    construct_fit_mean: mean(reviews, "construct_fit_rating_1_4"),
    evidence_fit_mean: mean(reviews, "evidence_fit_rating_1_4"),
    inference_scope_mean: mean(reviews, "inference_scope_rating_1_4"),
    language_safety_mean: mean(reviews, "language_safety_rating_1_4"),
    risk_flags: riskFlags.join(";"),
    internal_disposition: disposition,
    required_revision_summary: reviews
      .filter((review) => review.required_revision.trim())
      .map(
        (review) =>
          `${review.reviewer_role}: ${review.required_revision.trim()}`,
      )
      .join(" | "),
    rationale_summary: reviews
      .map((review) => `${review.reviewer_role}: ${review.rationale.trim()}`)
      .join(" | "),
    external_review_status: "NOT_STARTED",
    registry_mutation_permitted: "false",
  };
});

const dispositionCounts = countBy(
  adjudications,
  (adjudication) => adjudication.internal_disposition,
);
const decisionCounts = countBy(
  [...reviewsByClaim.values()].flat(),
  (review) => review.decision,
);
const riskCounts = {};
for (const adjudication of adjudications) {
  for (const risk of adjudication.risk_flags.split(";").filter(Boolean)) {
    riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
  }
}

const summary = {
  claimCount: adjudications.length,
  decisionCounts,
  dispositionCounts,
  externalReviewStatus: "NOT_STARTED",
  generatedAt,
  internalReviewCount: [...reviewsByClaim.values()].flat().length,
  registryMutationPermitted: false,
  riskCounts,
  status: "INTERNAL_AGENT_CRITIQUE_COMPLETE_NOT_EXTERNAL_REVIEW",
};

const outputs = new Map([
  [
    "claim_adjudication.csv",
    toCsv([
      Object.keys(adjudications[0]),
      ...adjudications.map((adjudication) => Object.values(adjudication)),
    ]),
  ],
  [
    "summary.json",
    await prettier.format(JSON.stringify(summary), { parser: "json" }),
  ],
  [
    "INTERNAL_AGENT_ADJUDICATION.md",
    await prettier.format(createAdjudicationReport(summary, adjudications), {
      parser: "markdown",
    }),
  ],
]);

if (checkOnly) {
  const failures = [];
  for (const [file, expected] of outputs) {
    const target = path.join(outputRoot, file);
    if (!fs.existsSync(target)) failures.push(`missing ${file}`);
    else if (fs.readFileSync(target, "utf8") !== expected) {
      failures.push(`stale ${file}`);
    }
  }
  if (failures.length > 0) {
    console.error("ENAKQ internal critique analysis check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `ENAKQ internal critique analysis is current: ${adjudications.length} claims.`,
  );
} else {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const [file, content] of outputs) {
    fs.writeFileSync(path.join(outputRoot, file), content);
  }
  console.log(
    `Generated ENAKQ internal critique analysis for ${adjudications.length} claims.`,
  );
}

function getDisposition(decisions) {
  if (decisions.includes("reject")) return "REJECT_OR_REWRITE";
  if (decisions.includes("insufficient_evidence")) {
    return "HOLD_FOR_MORE_EVIDENCE";
  }
  if (decisions.includes("revise")) return "REVISE_BEFORE_NEXT_GATE";
  return "INTERNAL_ACCEPT_NOT_APPROVED";
}

function mean(reviews, field) {
  const value =
    reviews.reduce((sum, review) => sum + Number(review[field]), 0) /
    reviews.length;
  return value.toFixed(2);
}

function createAdjudicationReport(summaryData, allAdjudications) {
  const critical = allAdjudications.filter(
    (adjudication) => adjudication.priority === "critical",
  );
  const rejected = allAdjudications.filter(
    (adjudication) => adjudication.internal_disposition === "REJECT_OR_REWRITE",
  );
  const held = allAdjudications.filter(
    (adjudication) =>
      adjudication.internal_disposition === "HOLD_FOR_MORE_EVIDENCE",
  );
  const revised = allAdjudications.filter(
    (adjudication) =>
      adjudication.internal_disposition === "REVISE_BEFORE_NEXT_GATE",
  );
  return `# ENAKQ 내부 전문 에이전트 검토 종합

- 상태: \`${summaryData.status}\`
- 외부 전문가 검토: \`NOT_STARTED\`
- 레지스트리 자동 변경 허용: \`false\`

## 결론

성격심리·심리측정·관계/임상 안전 역할의 내부 에이전트가 각자 배정된 claim을 독립 검토했다. 이 결과는 다음 수정 우선순위를 찾기 위한 내부 비판 자료이며, 학위·면허·신원이 확인된 외부 전문가 검토를 대신하지 않는다.

## 규모

- 고유 claim: ${summaryData.claimCount}
- 역할별 내부 검토 응답: ${summaryData.internalReviewCount}
- critical claim: ${critical.length}
- 재작성/제외 검토: ${rejected.length}
- 추가 근거 보류: ${held.length}
- 다음 gate 전 수정: ${revised.length}
- 내부 수용, 운영 미승인: ${summaryData.dispositionCounts.INTERNAL_ACCEPT_NOT_APPROVED ?? 0}

## 조정 규칙

1. 한 역할이라도 \`reject\`면 \`REJECT_OR_REWRITE\`다.
2. reject는 없지만 \`insufficient_evidence\`가 있으면 \`HOLD_FOR_MORE_EVIDENCE\`다.
3. 앞의 판정이 없고 하나라도 \`revise\`면 \`REVISE_BEFORE_NEXT_GATE\`다.
4. 모든 배정 역할이 accept한 경우에도 \`INTERNAL_ACCEPT_NOT_APPROVED\`다.
5. 이 분석은 원본 claim registry의 근거 상태나 발행 상태를 자동으로 바꾸지 않는다.

## 우선 확인 목록

### 재작성 또는 제외 검토

${markdownClaimList(rejected)}

### 추가 근거 보류

${markdownClaimList(held)}

### Critical claim

${markdownClaimList(critical)}

## 다음 단계

각 역할 summary와 claim별 수정 요구를 대조해 수정 후보를 별도 버전으로 작성한다. 원문을 바로 덮어쓰지 않고 변경 전후·이유·영향받는 block과 contentKey를 기록한다. 내부 수정 뒤에도 외부 전문가 검토, 한국어 인지 인터뷰, 정량 파일럿, 제품 안전 검수가 남아 있다.
`;
}

function markdownClaimList(values) {
  if (values.length === 0) return "- 없음";
  return values
    .map(
      (value) =>
        `- \`${value.claim_id}\` — ${value.internal_disposition}${
          value.risk_flags ? ` · ${value.risk_flags}` : ""
        }`,
    )
    .join("\n");
}

function countBy(values, key) {
  const counts = {};
  for (const value of values) {
    const group = key(value);
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return counts;
}

function readCsv(filePath) {
  const parsedRows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const headers = parsedRows[0] ?? [];
  return {
    headers,
    rows: parsedRows
      .slice(1)
      .map((values) =>
        Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? ""]),
        ),
      ),
  };
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
