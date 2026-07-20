import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(projectRoot, "docs/trait-maps/ENAKQ");
const outputRoot = path.join(
  projectRoot,
  "docs/research/enakq-map-v0.1/generated",
);
const registryPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-claim-registry.generated.json",
);
const checkOnly = process.argv.includes("--check");
const protocolVersion = "enakq-trait-map-expert-review.v0.1";
const packetVersion = "ENAKQ-EXPERT-PACKET.v0.1";
const generatedAt = "2026-07-20T00:00:00+09:00";
const maxClaimsPerWave = 40;

const roles = [
  "personality_psychology",
  "psychometrics",
  "relationship_safety",
];

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
invariant(registry.entries.length === 158, "Expected 158 ENAKQ claims");

const sourceBlocks = readSourceBlocks();
const assignments = registry.entries.map(createAssignment);
validateAssignments(assignments);
const outputFiles = new Map();

const guide = await prettier.format(createReviewerGuide(assignments), {
  parser: "markdown",
});
outputFiles.set("reviewer/00_REVIEWER_GUIDE.md", guide);

for (const role of roles) {
  const roleAssignments = assignments
    .filter((assignment) => assignment.requiredRoles.includes(role))
    .sort(compareAssignments);
  const waveCount = Math.ceil(roleAssignments.length / maxClaimsPerWave);
  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    const waveId = `W${waveIndex + 1}`;
    const claims = roleAssignments.slice(
      waveIndex * maxClaimsPerWave,
      (waveIndex + 1) * maxClaimsPerWave,
    );
    outputFiles.set(
      `reviewer/${role}_${waveId}.csv`,
      createReviewerCsv(role, waveId, claims),
    );
  }
}

outputFiles.set(
  "internal/claim_review_assignment.csv",
  createAssignmentCsv(assignments),
);
outputFiles.set(
  "internal/reviewer_roster_template.csv",
  createReviewerRosterCsv(),
);
outputFiles.set(
  "internal/adjudication_template.csv",
  createAdjudicationCsv(assignments),
);

const manifest = {
  claimCount: registry.entries.length,
  generatedAt,
  mapVersion: registry.mapVersion,
  packetVersion,
  protocolVersion,
  reviewCountByRole: Object.fromEntries(
    roles.map((role) => [
      role,
      assignments.filter((assignment) =>
        assignment.requiredRoles.includes(role),
      ).length,
    ]),
  ),
  sourceRegistry: path.relative(projectRoot, registryPath),
  files: [...outputFiles.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([relativePath, content]) => ({
      path: relativePath,
      sha256: sha256(content),
    })),
};
outputFiles.set(
  "internal/packet_manifest.json",
  await prettier.format(JSON.stringify(manifest), { parser: "json" }),
);

if (checkOnly) {
  const failures = [];
  for (const [relativePath, expectedContent] of outputFiles) {
    const targetPath = path.join(outputRoot, relativePath);
    if (!fs.existsSync(targetPath)) {
      failures.push(`missing ${relativePath}`);
      continue;
    }
    if (fs.readFileSync(targetPath, "utf8") !== expectedContent) {
      failures.push(`stale ${relativePath}`);
    }
  }
  if (failures.length > 0) {
    console.error("ENAKQ expert review packet check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `ENAKQ expert review packet is current: ${assignments.length} claims, ${manifest.files.length} locked files.`,
  );
} else {
  for (const [relativePath, content] of outputFiles) {
    const targetPath = path.join(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }
  console.log(
    `Generated ENAKQ expert review packet: ${assignments.length} claims, ${outputFiles.size} files.`,
  );
}

function readSourceBlocks() {
  const blocks = new Map();
  for (let part = 1; part <= 5; part += 1) {
    const sourcePath = path.join(
      sourceDirectory,
      `ENAKQ_MAP_DRAFT_PART${part}_V0_1.md`,
    );
    const source = fs.readFileSync(sourcePath, "utf8");
    const headingMatches = [...source.matchAll(/^## (\d+)\. ([^\n]+)$/gm)];
    for (const match of source.matchAll(
      /<!-- block: ([^;]+); claims: ([^>]+) -->\s*\n([\s\S]*?)(?=\n<!-- block:|\n## |\n### |$)/g,
    )) {
      const blockId = match[1].trim();
      const blockOffset = match.index ?? 0;
      const currentHeading = [...headingMatches]
        .reverse()
        .find((heading) => (heading.index ?? 0) < blockOffset);
      invariant(currentHeading, `${blockId} has no section heading`);
      blocks.set(blockId, {
        blockId,
        claims: match[2].split(",").map((claimId) => claimId.trim()),
        excerpt: cleanExcerpt(match[3]),
        part,
        sectionNumber: Number(currentHeading[1]),
        sectionTitle: currentHeading[2].trim(),
      });
    }
  }
  invariant(
    blocks.size === 106,
    `Expected 106 source blocks, found ${blocks.size}`,
  );
  return blocks;
}

function createAssignment(claim) {
  const requiredRoles = getRequiredRoles(claim);
  const canonicalBlock = selectCanonicalBlock(claim);
  return {
    ...claim,
    canonicalBlock,
    priority: getPriority(claim, requiredRoles),
    requiredRoles,
    reviewReason: requiredRoles
      .map((role) => getReviewReason(role))
      .join(" | "),
  };
}

function validateAssignments(allAssignments) {
  invariant(
    allAssignments.length === 158,
    "Every registry claim must be assigned",
  );
  invariant(
    new Set(allAssignments.map((assignment) => assignment.claimId)).size ===
      158,
    "Expert review assignments must have unique claim IDs",
  );
  for (const assignment of allAssignments) {
    invariant(
      assignment.requiredRoles.length > 0,
      `${assignment.claimId} has no expert role`,
    );
    invariant(
      assignment.canonicalBlock.excerpt.length > 0,
      `${assignment.claimId} has an empty source excerpt`,
    );
    if (assignment.priority === "critical") {
      invariant(
        assignment.requiredRoles.length >= 2,
        `${assignment.claimId} is critical but has fewer than two expert roles`,
      );
    }
  }
  for (const role of roles) {
    invariant(
      allAssignments.some((assignment) =>
        assignment.requiredRoles.includes(role),
      ),
      `${role} has no assigned claims`,
    );
  }
}

function selectCanonicalBlock(claim) {
  const overrideByClaimId = {
    "ENAKQ.boundary.variability": "ENAKQ-P3-ALL-01",
    "ENAKQ.process.non_inference": "ENAKQ-P5-05",
  };
  const override = overrideByClaimId[claim.claimId];
  if (override) return sourceBlocks.get(override);

  const expectedSectionNumbers = getExpectedSectionNumbers(
    claim.canonicalSectionId,
  );
  const candidates = claim.sourceBlockRefs
    .map((blockId) => sourceBlocks.get(blockId))
    .filter(Boolean);
  const canonical =
    candidates.find((block) =>
      expectedSectionNumbers.includes(block.sectionNumber),
    ) ?? candidates[0];
  invariant(canonical, `${claim.claimId} has no source excerpt`);
  invariant(
    canonical.claims.includes(claim.claimId),
    `${canonical.blockId} does not include ${claim.claimId}`,
  );
  return canonical;
}

function getExpectedSectionNumbers(sectionId) {
  return {
    overview: [1],
    role_name: [2],
    five_code_positions: [3],
    code_interactions: [4],
    inner_thought_and_response: [5],
    daily_life: [6],
    family: [7],
    friend: [8],
    partner: [9],
    person_of_interest: [10],
    work: [11],
    stress_and_recovery: [12],
    strengths_and_growth: [13],
    misunderstandings: [14],
    communication_guide: [14],
    limitations_and_evidence: [15],
  }[sectionId];
}

function getRequiredRoles(claim) {
  const requiredRoles = new Set();
  if (
    [
      "definition",
      "inner_thought",
      "observable_response",
      "strength",
      "friction",
      "context_hypothesis",
      "interaction_hypothesis",
      "possible_misread",
    ].includes(claim.claimKind)
  ) {
    requiredRoles.add("personality_psychology");
  }
  if (
    claim.requiredSignals.length > 1 ||
    [
      "definition",
      "inner_thought",
      "interaction_hypothesis",
      "evidence_statement",
      "boundary",
    ].includes(claim.claimKind) ||
    [
      "QUANT_VALIDATION_REQUIRED",
      "NUANG_MAPPED_PROVISIONAL",
      "DESIGN_APPROVED_NOT_EXECUTED",
      "EXTERNAL_SUPPORTED_METHOD",
    ].includes(claim.evidenceStatus)
  ) {
    requiredRoles.add("psychometrics");
  }
  if (
    [
      "family",
      "friend",
      "partner",
      "person_of_interest",
      "stress_and_recovery",
      "misunderstandings",
      "communication_guide",
    ].includes(claim.canonicalSectionId) ||
    [
      "boundary",
      "support_preference",
      "conversation_prompt",
      "growth_practice",
    ].includes(claim.claimKind) ||
    claim.evidenceStatus === "SAFETY_POLICY"
  ) {
    requiredRoles.add("relationship_safety");
  }
  if (requiredRoles.size === 0) requiredRoles.add("personality_psychology");
  return [...requiredRoles];
}

function getPriority(claim, requiredRoles) {
  if (
    claim.evidenceStatus === "SAFETY_POLICY" ||
    /clinical|privacy|ai_boundary|intended_use|nonjudgment|similarity/.test(
      claim.claimId,
    )
  ) {
    return "critical";
  }
  if (
    requiredRoles.length > 1 ||
    ["HOLD", "COGNITIVE_REVIEW_REQUIRED", "QUANT_VALIDATION_REQUIRED"].includes(
      claim.evidenceStatus,
    )
  ) {
    return "high";
  }
  return "standard";
}

function getReviewReason(role) {
  return {
    personality_psychology:
      "구성개념 경계, 상태·성향 구분, 상황 일반화와 조합 해석을 검토",
    psychometrics: "필수 측정 입력, 근거 적합성, 점수로부터의 추론 범위를 검토",
    relationship_safety:
      "관계 결정론, 임상·낙인·문화 규범, 개인정보와 사용자 안전을 검토",
  }[role];
}

function createReviewerCsv(role, waveId, assignmentsForWave) {
  const headers = [
    "protocol_version",
    "packet_version",
    "reviewer_id",
    "reviewer_role",
    "wave_id",
    "sequence_in_wave",
    "claim_id",
    "claim_kind",
    "canonical_section",
    "priority",
    "contexts",
    "evidence_status",
    "publication_state",
    "privacy_scope",
    "required_signals",
    "content_key",
    "source_block_ref",
    "source_section_title",
    "source_excerpt",
    "external_evidence",
    "internal_evidence",
    "review_reason",
    "decision",
    "construct_fit_rating_1_4",
    "evidence_fit_rating_1_4",
    "inference_scope_rating_1_4",
    "language_safety_rating_1_4",
    "risk_flags",
    "required_revision",
    "rationale",
    "reviewer_confidence",
    "conflict_of_interest",
  ];
  const rows = assignmentsForWave.map((claim, index) => [
    protocolVersion,
    packetVersion,
    "",
    role,
    waveId,
    index + 1,
    claim.claimId,
    claim.claimKind,
    claim.canonicalSectionId,
    claim.priority,
    claim.contexts.join(";"),
    claim.evidenceStatus,
    claim.publicationState,
    claim.privacyScope,
    claim.requiredSignals.join(";"),
    claim.contentKey,
    claim.canonicalBlock.blockId,
    claim.canonicalBlock.sectionTitle,
    claim.canonicalBlock.excerpt,
    claim.externalEvidence.join("; "),
    claim.internalEvidence.join("; "),
    getReviewReason(role),
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  return toCsv([headers, ...rows]);
}

function createAssignmentCsv(allAssignments) {
  const headers = [
    "claim_id",
    "priority",
    "required_roles",
    "canonical_block_ref",
    "source_parts",
    "evidence_status",
    "publication_state",
    "review_reason",
  ];
  return toCsv([
    headers,
    ...allAssignments.map((claim) => [
      claim.claimId,
      claim.priority,
      claim.requiredRoles.join(";"),
      claim.canonicalBlock.blockId,
      claim.sourceParts.join(";"),
      claim.evidenceStatus,
      claim.publicationState,
      claim.reviewReason,
    ]),
  ]);
}

function createReviewerRosterCsv() {
  const headers = [
    "reviewer_id",
    "reviewer_role",
    "target_qualification",
    "highest_relevant_degree",
    "license_or_research_record",
    "relevant_experience_summary",
    "independence_confirmed",
    "conflict_disclosure",
    "identity_verified_by",
    "status",
  ];
  const rolePrefix = {
    personality_psychology: "PP",
    psychometrics: "PM",
    relationship_safety: "RS",
  };
  const qualification = {
    personality_psychology:
      "성격심리 박사 또는 동등한 연구 실적과 성향 측정 연구 경험",
    psychometrics: "심리측정 박사 또는 동등한 측정·타당화·요인분석 연구 실적",
    relationship_safety:
      "관계·상담·임상심리 박사/면허 또는 동등한 안전·낙인 검토 실적",
  };
  const rows = roles.flatMap((role) =>
    [1, 2].map((index) => [
      `${rolePrefix[role]}${String(index).padStart(2, "0")}`,
      role,
      qualification[role],
      "",
      "",
      "",
      "",
      "",
      "",
      "not_recruited",
    ]),
  );
  return toCsv([headers, ...rows]);
}

function createAdjudicationCsv(allAssignments) {
  const headers = [
    "protocol_version",
    "claim_id",
    "required_roles",
    "expected_independent_reviews",
    "received_reviews",
    "role_decisions",
    "disagreement_summary",
    "adjudication_decision",
    "approved_copy_version",
    "adjudicator_id",
    "adjudication_rationale",
    "resolved_at",
  ];
  return toCsv([
    headers,
    ...allAssignments.map((claim) => [
      protocolVersion,
      claim.claimId,
      claim.requiredRoles.join(";"),
      claim.requiredRoles.length * 2,
      "0",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  ]);
}

function createReviewerGuide(allAssignments) {
  const counts = Object.fromEntries(
    roles.map((role) => [
      role,
      allAssignments.filter((assignment) =>
        assignment.requiredRoles.includes(role),
      ).length,
    ]),
  );
  return `# ENAKQ 성향지도 외부 전문가 검토 안내

패킷: \`${packetVersion}\`  
프로토콜: \`${protocolVersion}\`  
상태: \`EXTERNAL_REVIEW_NOT_STARTED\`

## 목적

이 패킷은 ENAKQ 연구 초안의 158개 claim이 현재 뉴앙 점수와 외부 근거로 설명할 수 있는 범위 안에 있는지 검토하기 위한 것이다. 사용자가 문장에 공감하는지와 심리측정 타당성을 같은 것으로 취급하지 않는다.

검토 패킷 생성은 전문가 검토 완료를 뜻하지 않는다. reviewer roster는 아직 \`not_recruited\`이며, 실제 자격과 독립성을 확인한 사람의 응답만 외부 검토 근거로 인정한다. AI나 내부 에이전트의 응답을 외부 전문가 승인으로 기록하지 않는다.

## 역할별 배정

| 역할 | 검토 claim 수 | 초점 |
|---|---:|---|
| 성격심리 | ${counts.personality_psychology} | 구성개념 경계, 상태·성향 구분, 상황 일반화, 조합 해석 |
| 심리측정 | ${counts.psychometrics} | 필수 입력, 근거 적합성, 점수에서 문장으로의 추론 범위 |
| 관계/임상 안전 | ${counts.relationship_safety} | 관계 결정론, 임상·낙인·문화 규범, 개인정보와 사용자 안전 |

각 역할에는 독립된 검토자 2명을 목표로 한다. 한 claim이 여러 역할에 배정되면 각 분야에서 각각 2개의 독립 응답을 받아야 한다.

## 판정

- \`accept\`: 현재 의미와 범위를 그대로 유지할 수 있다.
- \`revise\`: 핵심 의미는 유지할 수 있지만 구체적인 수정이 필요하다.
- \`reject\`: 현재 claim을 제품 지식으로 유지하면 안 된다.
- \`insufficient_evidence\`: 판단에 필요한 연구·측정·문맥 자료가 부족하다.

\`revise\`에는 \`required_revision\`을 반드시 작성한다. \`accept\`는 \`risk_flags=none\`일 때만 가능하다. 모든 판정에는 한 문장 이상의 \`rationale\`을 작성한다.

## 1–4점 평정

| 점수 | 의미 |
|---:|---|
| 1 | 부적절하거나 중대한 수정이 필요 |
| 2 | 중요한 문제가 있어 현재 사용 불가 |
| 3 | 제한 또는 작은 수정 뒤 사용 후보 |
| 4 | 현재 범위에서 적절 |

평정 대상은 구성개념 적합성, 근거 적합성, 추론 범위, 언어·사용자 안전이다. 전문 범위를 벗어난 평정은 낮은 점수를 억지로 주지 말고 \`insufficient_evidence\`와 이유를 남긴다.

## 위험 플래그

\`ability_inference\`, \`clinical_overreach\`, \`cultural_norm\`, \`deterministic_language\`, \`discrimination_risk\`, \`evidence_mismatch\`, \`privacy_scope\`, \`relationship_determinism\`, \`stigma_or_value_judgment\`, \`unmeasured_inference\`, \`unclear_korean\`, \`other\`, \`none\`

여러 플래그는 세미콜론으로 구분한다. \`none\`은 다른 값과 함께 사용할 수 없다.

## 작업 방법

1. roster에서 본인의 reviewer ID와 역할을 확인한다.
2. 역할별 W1부터 순서대로 검토하되, 한 wave를 끝낸 뒤 파일을 잠근다.
3. \`source_excerpt\`는 claim이 쓰인 canonical 원문 문단이다. 한 문단에 여러 claim이 있을 수 있으므로 해당 \`claim_id\`의 의미만 판정한다.
4. 외부 연구가 존재한다는 사실과 뉴앙 claim이 검증됐다는 결론을 구분한다.
5. 이해하기 쉬움, 자기일치감, 재미를 정확성의 증거로 사용하지 않는다.
6. 갈등이 있거나 전문 범위를 벗어난 claim은 숨기지 말고 conflict와 한계를 기록한다.

## 승인 규칙

검토자가 \`accept\`를 선택해도 claim은 곧바로 \`APPROVED\`가 되지 않는다. 역할별 독립 검토, 불일치 조정, 한국어 인지 인터뷰, 정량 파일럿, 제품 중복·개인정보 검수를 모두 통과해야 운영 승인 후보가 된다.
`;
}

function compareAssignments(left, right) {
  const priorityOrder = { critical: 0, high: 1, standard: 2 };
  return (
    priorityOrder[left.priority] - priorityOrder[right.priority] ||
    left.claimId.localeCompare(right.claimId, "en")
  );
}

function cleanExcerpt(source) {
  return source
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
