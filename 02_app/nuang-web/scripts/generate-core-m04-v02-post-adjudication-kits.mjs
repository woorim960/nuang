import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "docs/research/core-m04/v0.2");
const outputRoot = path.join(sourceRoot, "post-adjudication/generated");
const smrlAnalysisRoot = path.join(
  sourceRoot,
  "post-adjudication/internal-critique/v0.1/analysis",
);
const check = process.argv.includes("--check");
const force = process.argv.includes("--force");
const m04Protocol = "m04-core-expert-kit.v0.2-smrl-r3";
const m05Protocol = "m05-core-cognitive-kit.v0.2-targeted-remediation-smrl";
const reviewerSlots = ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08"];

const sourceValidation = spawnSync(
  process.execPath,
  [
    path.join(
      projectRoot,
      "scripts/check-core-m04-v02-post-adjudication-drafts.mjs",
    ),
  ],
  { cwd: projectRoot, encoding: "utf8" },
);
if (sourceValidation.status !== 0) {
  process.stderr.write(sourceValidation.stderr || sourceValidation.stdout);
  process.exit(1);
}

const drafts = readCsvObjects(
  path.join(sourceRoot, "05_POST_ADJUDICATION_ITEM_DRAFTS.csv"),
);
const smrl = drafts.find(
  (row) => row.next_revision_candidate_id === "SMRL-C11-r3",
);
const baseM05Items = drafts.filter(
  (row) => row.required_next_gate === "M05_COGNITIVE",
);
if (!smrl || baseM05Items.length !== 4) {
  throw new Error(
    "Expected one SMRL major revision and four M05 copy revisions",
  );
}
assertSmrlPassToCognitive();
const m05Items = [smrl, ...baseM05Items];

const outputs = new Map();
const baseCodebook = fs.readFileSync(
  path.join(sourceRoot, "generated/reviewer/00_STAGE1_CODEBOOK.md"),
  "utf8",
);
outputs.set(
  "m04/reviewer/00_STAGE1_CODEBOOK.md",
  baseCodebook.replace("m04-core-expert-kit.v0.2-targeted", m04Protocol),
);
outputs.set("m04/reviewer/01_RESPONSE_GUIDE.md", m04ResponseGuide());

const stage1Columns = [
  "protocol_version",
  "reviewer_slot",
  "sequence",
  "opaque_item_id",
  "context_label",
  "prompt_text",
  "first_construct_mapping",
  "second_construct_mapping",
  "direction_guess",
  "clarity_rating_1_4",
  "single_response_rating_1_4",
  "universality_rating_1_4",
  "scale_fit_rating_1_4",
  "desirable_direction_guess",
  "risk_flags",
  "fatal_risk_note",
  "stage1_notes",
];
const stage2Columns = [
  "protocol_version",
  "reviewer_slot",
  "sequence",
  "opaque_item_id",
  "context_label",
  "prompt_text",
  "target_facet",
  "keyed_direction",
  "source_candidate_id",
  "revision_candidate_id",
  "target_relevance_rating_1_4",
  "key_direction_fit_rating_1_4",
  "coverage_contribution_rating",
  "adjacent_separation_rating_1_4",
  "recommendation",
  "final_rationale",
];

for (const reviewerSlot of reviewerSlots) {
  outputs.set(
    `m04/reviewer/${reviewerSlot}_stage1_blind.csv`,
    serializeCsv(
      [
        {
          protocol_version: m04Protocol,
          reviewer_slot: reviewerSlot,
          sequence: 1,
          opaque_item_id: "NX3-001",
          context_label: smrl.draft_context_label,
          prompt_text: smrl.draft_prompt_text,
        },
      ],
      stage1Columns,
    ),
  );
  outputs.set(
    `m04/internal/DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`,
    serializeCsv(
      [
        {
          protocol_version: m04Protocol,
          reviewer_slot: reviewerSlot,
          sequence: 1,
          opaque_item_id: "NX3-001",
          context_label: smrl.draft_context_label,
          prompt_text: smrl.draft_prompt_text,
          target_facet: smrl.target_facet,
          keyed_direction: smrl.keyed_direction,
          source_candidate_id: smrl.source_revision_candidate_id,
          revision_candidate_id: smrl.next_revision_candidate_id,
        },
      ],
      stage2Columns,
    ),
  );
}

outputs.set(
  "m04/internal/opaque_item_mapping.csv",
  serializeCsv([
    {
      protocol_version: m04Protocol,
      opaque_item_id: "NX3-001",
      source_opaque_item_id: smrl.source_opaque_item_id,
      source_revision_candidate_id: smrl.source_revision_candidate_id,
      revision_candidate_id: smrl.next_revision_candidate_id,
      revision_level: smrl.revision_level,
      target_facet: smrl.target_facet,
      keyed_direction: smrl.keyed_direction,
      context_label: smrl.draft_context_label,
      prompt_text: smrl.draft_prompt_text,
      required_next_gate: smrl.required_next_gate,
      status: "PACKET_READY_NOT_REVIEWED",
    },
  ]),
);
outputs.set(
  "m04/internal/reviewer_roster_template.csv",
  serializeCsv(
    reviewerSlots.map((reviewerSlot) => ({
      reviewer_slot: reviewerSlot,
      status: "NOT_STARTED",
      role_codes: "",
      conflict_disclosure_status: "NOT_REVIEWED",
      stage1_locked_at: "",
      stage2_locked_at: "",
    })),
  ),
);
outputs.set(
  "m04/internal/packet_lock_log.csv",
  serializeCsv(
    reviewerSlots.map((reviewerSlot) => ({
      reviewer_slot: reviewerSlot,
      stage1_packet_sha256: sha256(
        outputs.get(`m04/reviewer/${reviewerSlot}_stage1_blind.csv`),
      ),
      stage1_response_sha256: "",
      stage1_locked_at: "",
      stage2_packet_sha256: sha256(
        outputs.get(
          `m04/internal/DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`,
        ),
      ),
      stage2_response_sha256: "",
      stage2_released_at: "",
      stage2_locked_at: "",
    })),
  ),
);

outputs.set("m05/00_TARGETED_SESSION_GUIDE.md", m05SessionGuide());
outputs.set(
  "m05/reviewer/01_TARGETED_ITEM_FORM.csv",
  serializeCsv(
    m05Items.map((row, index) => ({
      protocol_version: m05Protocol,
      form_id: "M05-TARGETED-R2-A",
      order_index: index + 1,
      opaque_item_id: m05OpaqueId(index),
      context_label: row.draft_context_label,
      prompt_text: row.draft_prompt_text,
      first_response_value_1_5: "",
      first_difficult_reason: "",
      response_changed: "",
    })),
  ),
);
outputs.set(
  "m05/reviewer/02_TARGETED_ITEM_FORM.json",
  `${JSON.stringify(
    {
      protocolVersion: m05Protocol,
      formId: "M05-TARGETED-R2-A",
      responseFormatId: "FREQUENCY_5_WITH_UNSURE_V1",
      items: m05Items.map((row, index) => ({
        opaqueItemId: m05OpaqueId(index),
        orderIndex: index + 1,
        contextLabel: row.draft_context_label,
        promptText: row.draft_prompt_text,
      })),
    },
    null,
    2,
  )}\n`,
);
outputs.set(
  "m05/internal/01_OPAQUE_ITEM_MAPPING.csv",
  serializeCsv(
    m05Items.map((row, index) => ({
      protocol_version: m05Protocol,
      opaque_item_id: m05OpaqueId(index),
      item_revision_id: row.next_revision_candidate_id,
      source_opaque_item_id: row.source_opaque_item_id,
      target_facet: row.target_facet,
      keyed_direction: row.keyed_direction,
      status: "PREPARED_NOT_RUN",
    })),
  ),
);
outputs.set(
  "m05/internal/02_ITEM_MAPPING_AND_PROBES.csv",
  serializeCsv(m05Items.map(buildM05ProbeRow)),
);
outputs.set(
  "m05/internal/03_SESSION_LOG_TEMPLATE.csv",
  serializeCsv(
    [],
    [
      "study_id",
      "protocol_version",
      "round_id",
      "participant_id_pseudonymous",
      "sampling_cells",
      "form_id",
      "response_format_id",
      "opaque_item_id",
      "item_revision_id",
      "order_index",
      "first_response_value",
      "first_difficult_reason",
      "response_changed",
      "response_latency_bucket",
      "paraphrase_summary",
      "recalled_situation_summary",
      "response_reason_code",
      "issue_codes",
      "severity",
      "desirability_direction",
      "access_notes_deidentified",
      "seam_probe_summary",
      "constraint_probe_summary",
      "experience_probe_summary",
      "wording_preference",
      "verbatim_excerpt_if_consented",
      "interviewer_id",
      "adjudicated_decision",
    ],
  ),
);
outputs.set(
  "m05/internal/04_ISSUE_CODEBOOK.csv",
  serializeCsv(m05IssueCodebook()),
);
outputs.set(
  "m05/internal/05_ITEM_DECISION_TEMPLATE.csv",
  serializeCsv(
    m05Items.map((row) => ({
      item_revision_id: row.next_revision_candidate_id,
      round_id: "",
      participant_rows_reviewed: "",
      repeated_s2_issue: "",
      unresolved_s3_issue: "",
      subgroup_gap: "",
      mandatory_probe_completion: "",
      mandatory_probe_evidence_summary: "",
      decision: "",
      revision_required: "",
      evidence_summary: "",
      dissent_note: "",
      approved_by: "",
      approved_at: "",
    })),
  ),
);

const manifestEntries = [...outputs.entries()]
  .map(([file, content]) => ({ file, sha256: sha256(content) }))
  .sort((left, right) => left.file.localeCompare(right.file));
outputs.set(
  "packet_manifest.json",
  `${JSON.stringify(
    {
      status: "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION",
      source_contract: "05_POST_ADJUDICATION_ITEM_DRAFTS.csv",
      m04_protocol_version: m04Protocol,
      m04_candidate_count: 1,
      m04_reviewer_packet_count: reviewerSlots.length,
      m05_protocol_version: m05Protocol,
      m05_candidate_count: m05Items.length,
      files: manifestEntries,
    },
    null,
    2,
  )}\n`,
);

if (check) {
  for (const [relativePath, expected] of outputs) {
    const filePath = path.join(outputRoot, relativePath);
    if (!fs.existsSync(filePath))
      throw new Error(`Missing output: ${filePath}`);
    if (fs.readFileSync(filePath, "utf8") !== expected) {
      throw new Error(`Generated output drift: ${filePath}`);
    }
  }
} else {
  if (
    !force &&
    fs.existsSync(outputRoot) &&
    fs.readdirSync(outputRoot).length > 0
  ) {
    throw new Error(`Output folder is not empty: ${outputRoot}`);
  }
  for (const [relativePath, content] of outputs) {
    const filePath = path.join(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }
}

console.log(
  JSON.stringify(
    {
      m04_candidate_count: 1,
      m04_reviewer_packet_count: reviewerSlots.length,
      m05_candidate_count: m05Items.length,
      files_checked_or_written: outputs.size,
      mode: check ? "check" : "write",
      status: "PASS",
    },
    null,
    2,
  ),
);

function buildM05ProbeRow(row, index) {
  const probes = {
    "SMRL-C11-r3": {
      priority_issue:
        "역할 이행과 원인 탐색·일정 통제·과제 난이도·책임감 인상의 구분",
      comprehension_probe:
        "‘내가 맡은 부분’과 ‘정한 때에 맞춰 끝낸다’를 각각 어떻게 이해했나요?",
      recall_probe:
        "최근 6개월 동안 다른 사람과 함께한 일 중 맡은 부분과 정한 때가 분명했던 실제 경험을 떠올렸나요?",
      judgment_probe:
        "그 응답을 고른 가장 큰 이유는 평소 역할을 끝내는 방식이었나요, 과제 난이도나 시간 여유였나요?",
      desirability_probe:
        "때에 맞춰 끝낸다는 답이 더 책임감 있고 좋은 사람처럼 보여 선택에 영향을 줬나요? 결과가 공개되면 답을 바꾸고 싶나요?",
      access_probe:
        "일정을 스스로 정하기 어려웠거나 건강·돌봄·다른 사람의 일정 때문에 늦어진 경험이 답에 섞였나요?",
      seam_probe:
        "이 문항은 맡은 일을 끝내는 습관과 문제의 원인·해결 방법을 찾는 성향 중 무엇을 더 묻는다고 느꼈나요?",
      constraint_probe:
        "일정 통제권·업무량·과제 난이도·건강·돌봄 조건이 달라도 같은 답을 골랐을까요?",
      experience_probe:
        "최근 6개월 동안 다른 사람과 함께 맡은 일을 한 경험이 거의 없다면 ‘판단하기 어려움’을 선택할 수 있었나요?",
      wording_probe:
        "‘정한 때에 맞춰’와 ‘정한 때까지’ 중 어느 표현이 더 분명했나요? 두 표현의 뜻이 다르게 느껴졌나요?",
      pass_evidence:
        "평소 역할 이행 빈도로 설명하고 원인 탐색·능력·환경 제약과 구분하며, 경험 부족 시 판단 어려움을 사용할 수 있고 문구 의미가 안정적이다.",
    },
    "ERWD-C06-r3": {
      priority_issue: "반복 걱정과 필요한 점검·완벽주의의 구분",
      comprehension_probe:
        "‘같은 걱정을 되짚는 것’과 ‘필요한 부분을 확인하는 것’은 어떻게 다르다고 이해했나요?",
      recall_probe:
        "실제로 보내거나 보여주기 전에 같은 걱정을 여러 번 반복한 경험을 떠올렸나요?",
      judgment_probe:
        "걱정 때문에 늦어진 것인가요, 확인할 정보나 시간이 더 필요해서 늦어진 것인가요?",
      desirability_probe: "어느 답이 더 용감하거나 유능한 사람처럼 보였나요?",
      access_probe:
        "다른 사람에게 결과물을 보내거나 보여줄 기회가 거의 없다면 어떻게 답했을 것 같나요?",
      pass_evidence:
        "걱정 반복이 행동을 늦추는지로 설명하며 신중함·완벽주의·기회 차이와 구분한다.",
    },
    "RORN-P05-B-r3": {
      priority_issue: "함께 맞추자는 제안과 상대 선택 제한의 구분",
      comprehension_probe:
        "‘함께 맞추려 한다’는 단순한 제안인가요, 상대도 같은 선택을 하게 하는 것인가요?",
      recall_probe:
        "각자 다르게 골라도 실제로 문제가 없는 가족·친구·연인 장면을 떠올렸나요?",
      judgment_probe:
        "한쪽으로 맞춘 이유가 함께하는 경험 때문인가요, 상대 선택을 줄이려는 반응 때문인가요?",
      desirability_probe:
        "어느 답이 더 배려하거나 좋은 사람처럼 보였나요? 결과가 공개되면 답을 바꾸고 싶나요?",
      access_probe:
        "가족·친구·연인 중 떠올릴 사람이 없거나 관계의 힘 차이가 크다면 답하기 어려웠나요?",
      pass_evidence:
        "적극적 의견 표현이 아니라 상대가 따로 고를 수 있는 여지를 실제로 어떻게 다루는지로 설명한다.",
    },
    "SMOS-C08-r3": {
      priority_issue: "계획 시점과 실제 시작·외부 일정 제약의 구분",
      comprehension_probe:
        "‘그날 상황을 보고 정한다’에서 어떤 상황과 어떤 결정을 떠올렸나요?",
      recall_probe:
        "실제로 본인이 시간을 자유롭게 정할 수 있었던 최근 일을 떠올렸나요?",
      judgment_probe:
        "언제 할지 정하는 방식으로 답했나요, 실제로 미루거나 시작한 시점으로 답했나요?",
      desirability_probe:
        "미리 정하는 답과 그날 정하는 답 중 어느 쪽이 더 유능하거나 유연해 보였나요?",
      access_probe:
        "교대근무·돌봄·건강·다른 사람 일정 때문에 시간을 정할 수 없었던 경험이 답에 섞였나요?",
      pass_evidence:
        "일정 자율성이 있는 상황에서 계획 시점만 설명하며 착수 능력이나 외부 제약과 구분한다.",
    },
    "OEIE-C09-r3": {
      priority_issue: "필요한 이해와 이해 완료 뒤 추가 탐구의 구분",
      comprehension_probe:
        "‘필요한 내용은 이해한 뒤’와 ‘이유나 배경을 더 알아본다’를 어떻게 구분했나요?",
      recall_probe:
        "이해를 마친 뒤에도 실제로 더 알아본 경험을 떠올렸나요, 궁금했던 마음만 떠올렸나요?",
      judgment_probe:
        "필요해서 더 본 것인가요, 이유·배경 자체가 궁금해서 더 본 것인가요?",
      desirability_probe:
        "더 알아보는 답이 더 지적이거나 좋은 답처럼 보였나요?",
      access_probe:
        "시간·기기·검색 환경·추가 설명 접근 여부가 선택한 답을 바꿨나요?",
      pass_evidence:
        "이해 능력이나 정보 접근 성공이 아니라 필요한 범위 이후에도 탐구를 이어간 반응으로 설명한다.",
    },
  }[row.next_revision_candidate_id];
  if (!probes)
    throw new Error(`Missing M05 probes: ${row.next_revision_candidate_id}`);
  return {
    protocol_version: m05Protocol,
    opaque_item_id: m05OpaqueId(index),
    item_revision_id: row.next_revision_candidate_id,
    target_facet: row.target_facet,
    keyed_direction: row.keyed_direction,
    context_label: row.draft_context_label,
    prompt_text: row.draft_prompt_text,
    ...probes,
    status: "PREPARED_NOT_RUN",
  };
}

function m05OpaqueId(index) {
  return `CIT-${String(index + 1).padStart(3, "0")}`;
}

function m04ResponseGuide() {
  return `# M04 SMRL-C11-r3 제한 blind 재검토 안내

protocol: \`${m04Protocol}\`  
대상: 기억·알림 방법효과를 제거해 전면 개편한 1개 후보

1. \`00_STAGE1_CODEBOOK.md\`를 읽고 자신의 Stage 1 한 행을 독립 평가한다.
2. Stage 1 원본 hash가 잠긴 뒤에만 자신의 Stage 2 target reveal을 받는다.
3. 첫 구성개념·두 번째 구성개념·HIGH/LOW 방향·명확성·단일 반응성·보편성·6개월 빈도 적합성을 평가한다.
4. 역할 이행보다 능력·일정 통제권·사회적 바람직성이 답을 지배하면 위험과 근거를 남긴다.
5. 이 한 문항 검토만으로 SM-RL 또는 전체 M04를 승인하지 않는다.
`;
}

function m05SessionGuide() {
  return `# M05 수정 문항 5개 사용자 이해 검토 모듈

상태: \`PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION\`  
protocol: \`${m05Protocol}\`

## 범위

이 자료는 M04 내부 검토를 통과한 SMRL-C11-r3과 ERWD-C06-r3, RORN-P05-B-r3, SMOS-C08-r3, OEIE-C09-r3의 수정 의도가 사용자에게 전달되는지 확인하는 표적 모듈이다. 외부 참여자 모집·인터뷰·판정은 아직 수행하지 않았다. 전체 M05 form이나 문항 타당도를 대신하지 않으며 앱·운영 DB에 연결하지 않는다.

## 실행 순서

1. 동의·철회·녹음/화면 기록 범위를 안내한다.
2. target facet·HIGH/LOW·수정 의도를 보여주지 않은 채 5문항을 현재 모바일 runner와 같은 구조로 먼저 답하게 한다.
3. 자연 응답 중에는 문장 뜻을 설명하지 않고 응답 시간·변경·판단 어려움만 최소 기록한다.
4. 다섯 문항 응답이 끝난 뒤 한 문항씩 다시 보여주며 공통 probe와 \`02_ITEM_MAPPING_AND_PROBES.csv\`의 전용 probe를 진행한다.
5. 상황 라벨·질문·5점 빈도·판단 어려움·엄지 조작·답변 유도 여부를 마지막에 확인한다.

## SMRL-C11-r3 필수 확인

- SM-RL 역할 이행보다 SM-EP 원인·해결 탐색을 묻는 것으로 느끼지 않는지 확인한다.
- 일정 통제권·업무량·과제 난이도·건강·돌봄 조건이 응답을 대신 결정하지 않는지 확인한다.
- 최근 협업 경험이 거의 없을 때 \`판단하기 어려움\`을 자연스럽게 사용할 수 있는지 확인한다.
- 책임감 있고 좋은 사람처럼 보이는 방향이나 결과 공개가 응답을 바꾸지 않는지 확인한다.
- \`정한 때에 맞춰\`와 \`정한 때까지\` 중 의미가 더 분명하고 일관된 표현을 확인한다.

## 공통 probe

- 이 문장을 본인 말로 다시 설명해 주세요.
- 상황 라벨은 언제의 일이라고 이해했나요?
- 어떤 실제 경험을 떠올렸고 최근 6개월 기준을 사용했나요?
- 왜 그 응답을 골랐으며 1·3·5점은 어떻게 다르다고 생각했나요?
- 판단하기 어려웠다면 경험 부족·문장·접근·개인정보 중 무엇 때문인가요?
- 어느 방향이 더 좋은 사람처럼 보였고 결과가 공개되면 답을 바꾸고 싶나요?

## 판정 경계

- \`KEEP_FOR_PILOT\`: 의도한 상황·반응으로 이해되고 반복 S2와 미해결 S3가 없다.
- \`COPY_REVISE_RETEST\`: target은 유지되지만 표현·범위·척도 문제가 반복된다.
- \`CONSTRUCT_REWRITE\`: 다른 성향·능력으로 반복 해석된다.
- \`HOLD_FOR_SUBGROUP\`: 특정 경험·접근 집단의 근거가 부족하다.
- \`EXCLUDE\`: 수정 뒤에도 오해·낙인·접근 차별이 반복된다.

최종 문구는 새 참여자에게 재확인되기 전 통과시키지 않는다.
`;
}

function assertSmrlPassToCognitive() {
  const decisionPath = path.join(smrlAnalysisRoot, "adjudication_decision.csv");
  const lockPath = path.join(smrlAnalysisRoot, "analysis_lock.json");
  if (!fs.existsSync(decisionPath) || !fs.existsSync(lockPath)) {
    throw new Error("SMRL internal adjudication evidence is missing");
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  if (
    lock.status !==
      "INTERNAL_ADJUDICATION_COMPLETE_PASS_TO_COGNITIVE_NOT_EXTERNAL_VALIDATION" ||
    lock.files?.["adjudication_decision.csv"] !== sha256File(decisionPath)
  ) {
    throw new Error("SMRL internal adjudication lock mismatch");
  }
  const decisions = readCsvObjects(decisionPath);
  if (
    decisions.length !== 1 ||
    decisions[0].revision_candidate_id !== "SMRL-C11-r3" ||
    decisions[0].internal_decision !== "PASS_TO_COGNITIVE"
  ) {
    throw new Error("SMRL has not passed the internal cognitive gate");
  }
}

function m05IssueCodebook() {
  return [
    ["CONTEXT_MISREAD", "상황 라벨을 의도와 다른 조건으로 이해"],
    ["PROMPT_MISREAD", "질문이 묻는 실제 반응을 다르게 이해"],
    ["DOUBLE_RESPONSE", "두 가지 이상 반응을 동시에 묻는다고 느낌"],
    ["TARGET_SEAM", "인접 성향을 주된 질문으로 이해"],
    ["ABILITY_ACCESS", "능력·도구·환경 접근이 응답을 주로 결정"],
    ["EXPERIENCE_GAP", "해당 장면 경험이 거의 없어 빈도 판단 불가"],
    ["RESPONSE_SCALE", "1·3·5점 또는 6개월 빈도 기준을 일관되게 사용하지 못함"],
    ["SOCIAL_DESIRABILITY", "좋은 사람처럼 보이는 방향으로 답을 조정"],
    ["NEGATION_DIRECTION", "비교·부정 표현 때문에 응답 방향을 반대로 이해"],
    ["UI_INTERFERENCE", "상황 라벨·버튼·진행·조작이 이해나 응답을 방해"],
    ["PRIVACY_DISCOMFORT", "공개·관계·민감성 우려가 응답을 방해"],
    ["OTHER", "다른 해석 또는 응답 문제"],
  ].map(([issue_code, definition]) => ({
    issue_code,
    definition,
    severity_s0: "문제 없음",
    severity_s1: "작은 불편이나 의미·응답은 유지",
    severity_s2: "의미 또는 응답 선택이 달라질 수 있음",
    severity_s3: "의도한 문항으로 사용할 수 없거나 안전·접근 위험이 큼",
  }));
}

function readCsvObjects(filePath) {
  const [header, ...rows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(
        header.map((column, index) => [column, row[index] ?? ""]),
      ),
    );
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) rows.push([...row, cell.replace(/\r$/, "")]);
  return rows;
}

function serializeCsv(rows, columns = Object.keys(rows[0] ?? {})) {
  const lines = [
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ];
  return `${lines.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}
