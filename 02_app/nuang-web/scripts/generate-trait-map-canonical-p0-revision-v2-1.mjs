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
  "TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.json",
);
const reportPath = path.join(
  docsDirectory,
  "41_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.md",
);
const checkOnly = process.argv.includes("--check");
const correctedDraft = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_CAB_01_V2_1.json",
);
const internalScreen = readJson(
  reviewDirectory,
  "TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2_1.json",
);

const revisions = {
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-RO-A-ER-Q":
    "부담스러운 일이 지나가면 걱정과 감정이 빠르게 선명해져, 관련된 사람들이 어떻게 느꼈는지와 관계에 남은 불편이 있는지를 먼저 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-RO-G-ER-Q":
    "부담스러운 일이 지나가면 걱정과 긴장이 빠르게 선명해져, 관련된 사람들과 무엇이 문제였고 무엇을 바로 고치면 되는지를 먼저 확인하려는 경향이 있다.",
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-RO-A-ER-C":
    "부담스러운 일이 지난 직후에는 혼자 쉬며 생각을 정리하고, 시간이 지나 마음이 선명해지면 상대가 어떻게 느꼈는지와 관계에 남은 불편을 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-RO-G-ER-C":
    "부담스러운 일이 지난 직후에는 바로 결론 내리기보다 혼자 상황을 되짚고, 시간이 지나 불편함이 선명해지면 원인과 다음 해결 방법을 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-A-ER-Q":
    "걱정과 감정이 빠르게 올라오면 관련된 사람과 이야기하며, 누가 어떤 부분에서 불편했는지와 무엇을 확인해야 마음이 풀릴지를 짚어 보는 편이다.",
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-G-ER-Q":
    "걱정과 감정이 빠르게 선명해지면 관련된 사람들과 무엇이 문제를 키웠는지, 지금 어떤 조치를 하면 반복을 줄일 수 있는지를 확인하는 편이다.",
  "CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-RO-G-ER-C":
    "혼자 시간을 두고 상황을 되짚다가 불편함이 선명해지면, 무엇이 문제를 키웠고 다음에는 어느 지점에서 다르게 움직일지를 정리하는 편이다.",
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-SM-K-ER-Q":
    "불편함이 빠르게 커지면 필요한 사람과 상황을 확인하고, 정한 후속 행동을 순서대로 끝낸 뒤 평소 흐름으로 돌아가려는 편이다.",
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-SM-M-ER-Q":
    "불편함이 빠르게 커지면 필요한 사람과 상황을 확인하되, 이후에는 상대의 반응과 현재 여건에 맞춰 사과하거나 더 이야기하거나 잠시 거리를 두는 편이다.",
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-SM-K-ER-C":
    "먼저 혼자 쉬거나 기록하며 상황을 정리하고, 시간이 지나 감정이나 몸의 긴장이 선명해지면 필요한 후속 행동을 순서대로 정해 관련된 사람과 다시 이야기하는 편이다.",
  "CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-SM-M-ER-C":
    "먼저 혼자 에너지를 회복하고, 시간이 지나 불편함이 선명해지면 현재 상황에 맞춰 기록하거나 대화하거나 잠시 거리를 두는 방식 중 하나를 고르는 편이다.",
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-N":
    "낯선 자리에서도 먼저 인사하거나 질문을 건네 대화를 시작하고, 흥미로운 공통점이 보이면 다른 가능성이나 함께 해볼 일을 넓혀 가는 편이다.",
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-R":
    "낯선 자리에서도 먼저 인사하거나 구체적인 질문을 건네고, 상대가 실제로 말한 경험이나 지금 보이는 상황에서 공통점을 찾아 대화를 이어가는 편이다.",
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-N":
    "처음에는 대화 흐름을 지켜보며 생각을 모으고, 흥미로운 연결점이 보이면 질문이나 자신의 생각을 보태 대화를 더 깊게 이어가는 편이다.",
  "CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-R":
    "처음에는 주변과 대화 흐름을 지켜보고, 상대가 실제로 말한 경험이나 분명한 공통점이 생기면 구체적인 질문이나 자신의 경험을 보태는 편이다.",
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-SM-K":
    "평소 선택에서는 지금 보이는 방법에만 머물지 않고 다른 가능성을 넓혀 보면서도, 정한 목표와 먼저 할 순서를 함께 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-SM-M":
    "평소 선택에서는 다른 가능성을 넓게 떠올린 뒤, 지금 시간과 에너지, 달라진 조건에 맞춰 어떤 방향을 먼저 시도할지 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-SM-K":
    "평소 선택에서는 직접 확인한 조건과 이전 경험을 먼저 보고, 정한 목표와 해야 할 순서를 지킬 수 있는지를 함께 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-SM-M":
    "평소 선택에서는 직접 확인한 조건과 이전 경험을 먼저 보되, 지금 시간과 에너지, 달라진 상황에 맞춰 방법이나 순서를 조정할 수 있는지도 함께 살피는 경향이 있다.",
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-E-OE-R-SM-M":
    "확인된 조건과 이전 경험을 바탕으로 사람들과 선택지를 이야기해 한 가지를 작게 시작하고, 진행 상황에 맞춰 방법과 순서를 조정하는 편이다.",
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-R-SM-M":
    "확인된 조건과 이전 경험을 혼자 비교해 한 가지를 작게 시작하고, 결과와 지금 상황을 보며 방법과 순서를 조정하는 편이다.",
};

const reviseEntries = internalScreen.entries.filter(
  (entry) =>
    entry.internalScreening.decision ===
    "revise_before_role_review",
);
const expectedIds = new Set(
  reviseEntries.map((entry) => entry.canonicalVariantId),
);
const suppliedIds = new Set(Object.keys(revisions));
const missingRevisionIds = [...expectedIds].filter(
  (canonicalVariantId) => !suppliedIds.has(canonicalVariantId),
);
const unknownRevisionIds = [...suppliedIds].filter(
  (canonicalVariantId) => !expectedIds.has(canonicalVariantId),
);
if (missingRevisionIds.length || unknownRevisionIds.length) {
  throw new Error(
    `P0 revision coverage mismatch: missing=${missingRevisionIds.join(",")} unknown=${unknownRevisionIds.join(",")}`,
  );
}

const revisedVariants = correctedDraft.variants.map((variant) => {
  const revisedText = revisions[variant.canonicalVariantId];
  if (!revisedText) return variant;
  const screening = reviseEntries.find(
    (entry) =>
      entry.canonicalVariantId === variant.canonicalVariantId,
  ).internalScreening;
  return {
    ...variant,
    provenance: {
      ...variant.provenance,
      internalRevision: {
        previousContent: variant.canonicalDisplayDraft,
        sourceUnitIds: variant.provenance.sourceUnitIds,
        issueCodes: screening.issueCodes,
        rationale: screening.rationale,
        requiredAction: screening.requiredAction,
        revisionMethod:
          "same_claim_same_axes_plain_korean_editorial_synthesis_no_new_validation_claim",
        reviewerType: "model_internal_multidisciplinary_revision",
        state: "revised_draft_pending_independent_seven_role_review",
      },
    },
    canonicalDisplayDraft: {
      summaryText: revisedText,
      detailParagraphs: [revisedText],
      contentShape: "single_core_paragraph",
      renderingRule:
        "결과 요약은 이 문단을 사용하고, 성향지도 상세에서는 별도 검토를 마친 확장 문장과 함께 사용한다.",
    },
    resolutionState:
      "p0_internally_revised_ready_for_independent_seven_role_review",
    sevenRoleReviewState: "pending",
    publicationState: "research_only",
  };
});

const revisedById = new Map(
  revisedVariants.map((variant) => [
    variant.canonicalVariantId,
    variant,
  ]),
);
const revisionAudits = reviseEntries.map((entry) => {
  const variant = revisedById.get(entry.canonicalVariantId);
  const text = variant.canonicalDisplayDraft.summaryText;
  const axisAmendment = entry.evidencePacket.axisAmendment;
  const removedAxisResidualFlags = [];
  if (axisAmendment?.removedAxes.includes("RO")) {
    for (const pattern of [
      /마음이 가는 방향/,
      /함께할 사람의 반응/,
      /사람에게 .*필요/,
      /해결할 더 큰 문제/,
    ]) {
      if (pattern.test(text)) removedAxisResidualFlags.push(pattern.source);
    }
  }
  if (axisAmendment?.removedAxes.includes("ER")) {
    for (const pattern of [
      /긴장이 생겨도/,
      /참여가 빨라/,
      /말을 .*빨리/,
    ]) {
      if (pattern.test(text)) removedAxisResidualFlags.push(pattern.source);
    }
  }
  const unsafeLanguageFlags = [
    /무조건/,
    /반드시[^,.!?]{0,30}(?:한다|된다|이다)/,
    /절대로/,
    /틀림없이/,
    /사이코패스|소시오패스|정신질환|성격장애/,
    /나쁜 사람|도덕성이 낮|지능이 낮/,
  ]
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
  return {
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    axisSignature: entry.axisSignature,
    issueCodesAddressed: entry.internalScreening.issueCodes,
    sourceUnitIds: variant.provenance.sourceUnitIds,
    summaryMatchesFirstParagraph:
      text === variant.canonicalDisplayDraft.detailParagraphs[0],
    paragraphCount:
      variant.canonicalDisplayDraft.detailParagraphs.length,
    characterCount: [...text].length,
    removedAxisResidualFlags,
    unsafeLanguageFlags,
    internalRescreenState:
      removedAxisResidualFlags.length === 0 &&
      unsafeLanguageFlags.length === 0
        ? "ready_for_independent_seven_role_review_not_approved"
        : "revision_blocked",
  };
});

const report = {
  contractVersion: "nuang-trait-map-canonical-p0-revised-draft.v2.1",
  reportId: "TRAIT-MAP-CANONICAL-P0-REVISED-DRAFT-CAB-01.0.1",
  batchId: "CAB-01",
  status:
    "P0_INTERNAL_REVISIONS_APPLIED_INDEPENDENT_SEVEN_ROLE_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceCorrectedDraftReportId: correctedDraft.reportId,
  sourceInternalScreenReportId: internalScreen.reportId,
  summary: {
    canonicalVariants: revisedVariants.length,
    p0Entries: internalScreen.summary.entries,
    revisedVariants: revisionAudits.length,
    unchangedP0ReadyVariants:
      internalScreen.summary.readyForRoleReview,
    revisionCoverageComplete:
      missingRevisionIds.length === 0 &&
      unknownRevisionIds.length === 0,
    revisionAuditsPassed: revisionAudits.filter(
      (audit) =>
        audit.internalRescreenState ===
        "ready_for_independent_seven_role_review_not_approved",
    ).length,
    removedAxisResidualFlags: revisionAudits.reduce(
      (total, audit) =>
        total + audit.removedAxisResidualFlags.length,
      0,
    ),
    unsafeLanguageFlags: revisionAudits.reduce(
      (total, audit) => total + audit.unsafeLanguageFlags.length,
      0,
    ),
    expertReviewedVariants: 0,
    customerApprovedVariants: 0,
  },
  interpretation: [
    "교정 문장은 같은 claim과 같은 축 범위 안에서 기존 뜻을 쉬운 한국어로 정리한 내부 연구 초안이다.",
    "internalRescreen 통과는 독립 전문가 승인, 인지면접, 구성타당도 검증 또는 고객 발행 승인을 뜻하지 않는다.",
    "원문은 provenance.internalRevision.previousContent에 보존해 교정 전후를 비교하고 되돌릴 수 있다.",
  ],
  revisionAudits,
  variants: revisedVariants,
  nextGate: {
    name: "CAB_01_P0_RECOMPOSITION_AND_INDEPENDENT_ROLE_REVIEW",
    actions: [
      "교정 후 32개 코드와 80개 한 글자 이웃 재조합을 다시 검사한다.",
      "P0 24개를 7개 독립 역할 검토 형식으로 전달한다.",
      "P1·P2 69개의 문장 중복·번역체·축 오염을 순차 검토한다.",
    ],
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
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
      "CAB-01 P0 revised draft is stale. Run npm run research:trait-map:v2:canonical-p0-revision-cab1-v2-1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `CAB-01 P0 revision: ${report.summary.revisedVariants} revised, ${report.summary.revisionAuditsPassed} internal rescreens passed, removed-axis residuals ${report.summary.removedAxisResidualFlags}, unsafe ${report.summary.unsafeLanguageFlags}.`,
);

function buildMarkdown(result) {
  return `# CAB-01 P0 canonical 교정 초안 v2.1

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- 전체 canonical 변형: ${result.summary.canonicalVariants}
- P0: ${result.summary.p0Entries}
- 문장 교정: ${result.summary.revisedVariants}
- 기존 검토 이동 항목: ${result.summary.unchangedP0ReadyVariants}
- 내부 재검사 통과: ${result.summary.revisionAuditsPassed}/${result.summary.revisedVariants}
- 제거한 축 의미 잔존: ${result.summary.removedAxisResidualFlags}
- 위험 문구: ${result.summary.unsafeLanguageFlags}
- 전문가 검토 완료: ${result.summary.expertReviewedVariants}
- 고객 승인: ${result.summary.customerApprovedVariants}

## 교정 원칙

1. E/I, R/N, G/A, K/M, C/Q의 공식 뜻을 다른 축의 말로 바꾸지 않는다.
2. C/Q는 불편한 상황에서 걱정과 감정이 선명해지는 상대적 속도로 설명하고,
   말하기나 행동 시작 속도로 대신 설명하지 않는다.
3. v2.1에서 제거한 일반 선택의 G/A와 새 만남의 C/Q 표현을 고객 문장에서
   걷어내되 원문은 교정 계보에 보존한다.
4. 한 문단에는 사용자가 바로 이해할 수 있는 한 가지 반응 흐름만 남긴다.

이 결과는 내부 교정 초안이다. 7개 독립 역할 검토와 사용자 이해도 검사를
통과하기 전에는 고객 화면에 발행하지 않는다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
