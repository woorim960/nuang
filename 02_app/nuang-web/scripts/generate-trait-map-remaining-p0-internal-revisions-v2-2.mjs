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
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_REMAINING_P0_INTERNAL_REVISIONS_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "69_REMAINING_P0_INTERNAL_REVISIONS_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  "TRAIT_MAP_REMAINING_VISIBLE_P0_REVIEW_QUEUE_V2_2.json",
);

const decisions = new Map([
  ["CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-ER-Q", synth("부담스러운 일이 지나간 뒤에는 관련된 사람들과 확인할 후속 행동과 다시 생길 가능성이 빠르게 떠오르고, 아직 남은 걱정과 몸의 긴장도 함께 살피는 경향이 있다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-ER-C", synth("부담스러운 일이 지나간 직후에는 혼자 쉬면서 실제 진행 순서와 남은 후속 행동을 되짚고, 생각과 에너지를 정리할 시간이 얼마나 필요한지 차분히 살피는 경향이 있다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-ER-Q", synth("부담스러운 일이 지나간 뒤에는 혼자 되짚는 동안 놓친 장면과 다시 생길 가능성, 아직 정리되지 않은 감정과 몸의 긴장이 빠르게 눈에 들어오는 경향이 있다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-ER-C", synth("“관련된 사람들과 무엇을 확인하면 상황을 정리하고 다음 행동을 함께 바꿀 수 있을까?”를 차분히 생각하기 쉽다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-ER-Q", synth("“관련된 사람들과 무엇을 바로 확인하면 다시 생길 걱정을 줄이고 남은 불편을 실제 행동으로 바꿀 수 있을까?”를 빠르게 생각하기 쉽다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-ER-Q", synth("“잠시 혼자 정리하면 무엇이 가장 마음에 남았는지, 다시 생길 위험이나 내가 놓친 부분은 없는지 알 수 있을 것 같아”라고 되짚기 쉽다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-ER-C", synth("필요한 사람과 짧게 상황과 후속 행동을 말로 맞춘 뒤 다른 활동으로 옮겨 에너지를 회복하고, 시간이 지나 나타나는 감정과 피로를 따로 확인하는 편이다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-ER-Q", synth("필요한 사람과 상황과 후속 행동을 말로 맞춘 뒤 일상으로 돌아가려 하지만, 빠르게 올라온 걱정과 피로가 줄어드는 데는 시간이 필요한 편이다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-ER-C", synth("먼저 혼자 쉬거나 기록하며 에너지를 회복하고, 시간이 지나 감정과 피로가 선명해지면 필요한 후속 행동을 정리해 관련된 사람과 다시 이야기하는 편이다.")],
  ["CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-ER-Q", synth("혼자 쉬거나 기록하며 일을 되짚어도 걱정과 피로가 오래 남기 쉬우며, 생각이 정리되면 꼭 확인해야 할 사람에게 연락하는 편이다.")],
  ["CAN-SCN-GENERAL-GROUP-PARTICIPATION-COMMUNICATION-SE-E", synth("질문으로 참여를 열고 나온 의견을 짧게 정리한 뒤, 사람들의 반응을 받으며 다음 대화나 행동으로 이어가는 말하기가 자연스럽다.")],
  ["CAN-SCN-GENERAL-GROUP-PARTICIPATION-COMMUNICATION-SE-I", synth("생각이 정리될 때까지 듣고 있다가 한 번 말할 때 확인한 사실과 이유, 제안을 분명히 전하며, 바로 말하기 어려운 내용은 이후 메시지나 둘만의 대화로 전하는 방식이 잘 맞는다.")],
  ["CAN-SCN-GENERAL-SETBACK-ATTENTION-ER-Q", synth("실수하거나 기대한 결과가 나오지 않으면 놓친 부분과 사람들에게 미친 영향, 앞으로 더 나빠질 가능성이 빠르게 눈에 들어오는 경향이 있다.")],
  ["CAN-SCN-GENERAL-SETBACK-COMMUNICATION-ER-Q", synth("“이 부분을 놓쳐서 걱정돼. 지금 수정하고 있고 다음 확인은 이때 공유할게”처럼 빠르게 올라온 감정과 책임 행동을 함께 말한다.")],
  ["CAN-SCN-GENERAL-DISAGREEMENT-RESPONSE-RO-G", synth("상대가 본 사실과 이유를 질문해 공통 문제를 다시 정의하고, 실행 가능한 해결 기준과 다음 행동을 찾는 편이다.")],
  ["CAN-SCN-GENERAL-PLAN-CHANGE-ATTENTION-SM-K-ER-Q", synth("계획이 갑자기 바뀌면 놓친 준비와 잘못될 가능성이 빠르게 눈에 들어오며, 원래 목표와 약속에서 지킬 부분과 다시 세워야 할 순서를 살피는 경향이 있다.")],
  ["CAN-SCN-GENERAL-PLAN-CHANGE-ATTENTION-SM-M-ER-C", synth("계획이 갑자기 바뀌면 감정적으로 서두르기보다 무엇이 달라졌는지 확인하고, 현재 가능한 방법과 사람들의 상태, 남은 에너지를 살피는 경향이 있다.")],
  ["CAN-SCN-GENERAL-PLAN-CHANGE-RESPONSE-SM-K-ER-C", synth("변경된 조건을 확인해 새 순서와 완료 기준을 정하고 영향을 받는 사람과 맞춘 뒤 움직이며, 시간이 지나 남은 피로와 감정을 따로 확인하는 편이다.")],
  ["CAN-SCN-GENERAL-PLAN-CHANGE-RESPONSE-SM-K-ER-Q", synth("걱정되는 항목을 확인 목록으로 바꾸고, 변경된 조건에 맞는 새 순서와 완료 기준을 정해 영향을 받는 사람과 계획을 다시 맞추는 편이다.")],
  ["CAN-SCN-GENERAL-PLAN-CHANGE-RESPONSE-SM-M-ER-C", synth("감정적으로 서두르기보다 필요한 정보를 모으고 목표의 핵심만 남긴 채, 마감과 중요도에 맞춰 방법과 순서를 유연하게 바꾸어 움직이는 편이다.")],
  ["CAN-SCN-GENERAL-SUPPORT-REQUESTED-ATTENTION-RO-G", synth("누군가 도움을 요청하면 어떤 일이 있었고 왜 문제가 생겼는지, 지금 바꿀 수 있는 부분과 자신이 실제로 도울 수 있는 범위를 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-GENERAL-SUPPORT-REQUESTED-ATTENTION-RO-A", synth("누군가 힘든 일을 말하면 가장 힘들었던 마음과 혼자 감당한 부분, 지금 관계 안에서 어떤 반응과 도움이 필요한지를 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-FAMILY-ORDINARY-CHOICE-PROCESS-SM-K", select(1)],
  ["CAN-SCN-FAMILY-ORDINARY-CHOICE-PROCESS-SM-M", select(1)],
  ["CAN-SCN-FRIEND-GROUP-PARTICIPATION-ATTENTION-SE-E", synth("친구 모임에서는 함께 즐길 주제와 활동, 대화에 덜 참여하는 친구, 자신이 바로 맡아 움직일 수 있는 역할을 살피는 경향이 있다.")],
  ["CAN-SCN-FRIEND-GROUP-PARTICIPATION-ATTENTION-SE-I", synth("친구 모임에서는 모두의 화제를 넓히기보다 자신이 편하게 참여할 수 있는 대화와 익숙한 친구, 조용히 맡을 수 있는 역할을 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-FRIEND-GROUP-PARTICIPATION-RESPONSE-SE-I", synth("소수와 깊게 이야기하거나 준비·사진·이동 같은 역할을 맡고, 소란스러운 흐름에서는 가까운 친구와 따로 이야기하거나 잠시 조용한 시간을 확보하는 편이다.")],
  ["CAN-SCN-FRIEND-PLAN-CHANGE-PROCESS-SM-K", select(1)],
  ["CAN-SCN-FRIEND-PLAN-CHANGE-PROCESS-SM-M", select(1)],
  ["CAN-SCN-FRIEND-SUPPORT-REQUESTED-ATTENTION-RO-G", synth("친구가 고민을 말하면 문제를 만든 조건과 아직 시도하지 않은 해결 방법, 자신이 실제로 도울 수 있는 범위를 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-FRIEND-SUPPORT-REQUESTED-ATTENTION-RO-A", synth("친구가 고민을 말하면 해결 방법보다 그 경험에서 가장 힘들었던 마음과 친구가 바라는 관계적 지원을 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-PARTNER-NEW-ENCOUNTER-ATTENTION-OE-R", synth("연인과 새로운 장소나 활동을 시작하면 실제 이동 방법과 시간·비용, 직접 확인한 운영 조건처럼 지금 판단할 수 있는 구체적인 단서를 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-PARTNER-NEW-ENCOUNTER-ATTENTION-OE-N", synth("연인과 새로운 장소나 활동을 시작하면 지금 일정에만 머물기보다 둘이 새롭게 발견할 경험과 앞으로 이어질 이야기, 다른 방식의 가능성을 살피는 경향이 있다.")],
  ["CAN-SCN-PARTNER-SETBACK-ATTENTION-ER-Q", synth("연인과 기대한 결과가 나오지 않으면 상한 마음과 관계가 더 나빠질 가능성, 자신이 놓친 부분이 빠르게 눈에 들어오는 경향이 있다.")],
  ["CAN-SCN-PARTNER-DISAGREEMENT-PROCESS-RO-G", synth("“서로 어떤 사실과 기준을 다르게 보고 있으며, 같은 문제가 줄어들려면 무엇을 확인하고 어떤 행동을 바꿔야 할까?”를 생각하기 쉽다.")],
  ["CAN-SCN-PARTNER-DISAGREEMENT-PROCESS-RO-A", synth("“연인은 어떤 마음이었고 내 말은 어떻게 들렸으며, 지금 서로가 관계 안에서 편안함을 되찾으려면 무엇을 확인해야 할까?”가 떠오르기 쉽다.")],
  ["CAN-SCN-PARTNER-PLAN-CHANGE-ATTENTION-SM-K", select(1)],
  ["CAN-SCN-PARTNER-PLAN-CHANGE-ATTENTION-SM-M", select(1)],
  ["CAN-SCN-PARTNER-PLAN-CHANGE-COMMUNICATION-SM-M", select(1)],
  ["CAN-SCN-PARTNER-SUPPORT-REQUESTED-ATTENTION-RO-G", synth("연인이 힘든 일을 말하면 상황을 만든 원인과 지금 줄일 수 있는 부담, 자신이 실제로 할 수 있는 도움을 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-PARTNER-SUPPORT-REQUESTED-ATTENTION-RO-A", synth("연인이 힘든 일을 말하면 가장 상한 마음과 혼자 감당한 부분, 관계 안에서 바라는 위로와 지원을 먼저 살피는 경향이 있다.")],
  ["CAN-SCN-PERSON-OF-INTEREST-SETBACK-RESPONSE-ER-Q", synth("생각과 감정이 빠르게 올라와도 확인되는 실수는 짧게 인정하고 고칠 행동을 제안하며, 상대의 답과 경계를 존중해 행동을 정리하는 편이다.")],
  ["CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-PROCESS-SE-E", synth("“내가 바라는 것을 먼저 말하고 상대의 답을 들으면, 서로 가능한 방법을 더 분명하게 정할 수 있겠다”라고 생각하기 쉽다.")],
  ["CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-PROCESS-SE-I", synth("“내 마음을 먼저 정확히 정리한 뒤, 상대에게 부담을 덜 주면서 어떻게 표현할까?”를 생각하기 쉽다.")],
  ["CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-RESPONSE-SE-E", synth("적절한 때에 먼저 대화를 열어 자신의 바람을 말하고, 상대의 답을 들으면서 만남이나 연락 방식을 함께 조정하는 편이다.")],
  ["CAN-SCN-PERSON-OF-INTEREST-NEED-EXPRESSION-RESPONSE-SE-I", synth("마음이 정리될 때까지 서두르지 않다가 적절한 순간에 대화를 요청하고, 자신이 바라는 것과 상대가 선택할 수 있는 여지를 차분히 설명하는 편이다.")],
  ["CAN-SCN-WORK-SETBACK-ATTENTION-ER-C", synth("업무 결과가 기대와 다르면 감정적으로 서두르기보다 실제로 발생한 문제와 원인, 완료 기준에서 벗어난 부분과 수정 순서를 차분히 살피는 경향이 있다.")],
  ["CAN-SCN-WORK-SETBACK-ATTENTION-ER-Q", synth("업무 결과가 기대와 다르면 놓친 오류와 더 큰 문제로 번질 가능성, 평가와 동료에게 미칠 영향이 빠르게 눈에 들어오는 경향이 있다.")],
  ["CAN-SCN-WORK-DISAGREEMENT-PROCESS-RO-G", synth("“어떤 사실과 전제, 기준이 달라서 결론이 갈렸고 무엇을 확인하면 선택지를 좁힐 수 있을까?”를 생각하기 쉽다.")],
  ["CAN-SCN-WORK-DISAGREEMENT-PROCESS-RO-A", synth("“누가 어떤 점을 걱정하고 있으며, 각 의견이 사람과 협업 관계에 어떤 영향을 줄까?”를 생각하기 쉽다.")],
]);

const queueIds = new Set(
  queue.entries.map((entry) => entry.canonicalVariantId),
);
const decisionIds = new Set(decisions.keys());
const missing = [...queueIds].filter(
  (canonicalVariantId) => !decisionIds.has(canonicalVariantId),
);
const unknown = [...decisionIds].filter(
  (canonicalVariantId) => !queueIds.has(canonicalVariantId),
);
if (missing.length || unknown.length) {
  throw new Error(
    `Remaining P0 decision coverage mismatch: missing=${missing.join(",")} unknown=${unknown.join(",")}`,
  );
}

const entries = queue.entries.map((entry) => {
  const decision = decisions.get(entry.canonicalVariantId);
  const sourceParagraphs = entry.content.detailParagraphs;
  const revisedText =
    decision.method === "select_existing_paragraph"
      ? sourceParagraphs[decision.paragraphIndex]
      : decision.text;
  if (!revisedText) {
    throw new Error(`Empty revision: ${entry.canonicalVariantId}`);
  }
  return {
    canonicalVariantId: entry.canonicalVariantId,
    batchId: entry.batchId,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    originalContent: entry.content,
    internalScreening: {
      state:
        "completed_internal_claim_contrast_readthrough_not_expert_approval",
      decision:
        decision.method === "select_existing_paragraph"
          ? "retain_one_traceable_paragraph_remove_redundancy"
          : "revise_information_preserving_single_paragraph",
      rationale:
        decision.method === "select_existing_paragraph"
          ? "기존 한 문단만으로 현재 축과 상황 의미가 충분히 드러나며 다른 문단은 같은 정보를 반복하거나 다른 축 단서를 더한다."
          : "두 계보의 공통·고유 정보 중 현재 축과 claimKind에 필요한 내용만 한 관찰 문단으로 정리한다.",
      checkedAllClaimAxisSignatures: true,
      checkedAxisDirection: true,
      checkedRemovedAxisResidual: true,
      checkedPlainKoreanAndRedundancy: true,
      checkedSafetyAndOverclaim: true,
      reviewerType: "model_internal_claim_contrast_screen",
      reviewedAt: "2026-07-24T00:00:00.000Z",
    },
    proposedRevision: {
      contentShape: "single_core_paragraph",
      summaryText: revisedText,
      detailParagraphs: [revisedText],
      sourceParagraphs,
      revisionType:
        decision.method === "select_existing_paragraph"
          ? "traceable_paragraph_selection"
          : "information_preserving_claim_contrast_synthesis",
      state:
        "internal_editorial_candidate_independent_review_required",
    },
    independentRoleReviewState: "pending",
    customerComprehensionState: "not_started",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});

const unsafePattern =
  /무조건|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|관계가 실패|헤어지게|성공이 보장|알 수 없다|단정할 수 없다/;
const unsafeFlags = entries
  .filter((entry) =>
    unsafePattern.test(entry.proposedRevision.summaryText),
  )
  .map((entry) => entry.canonicalVariantId);
const duplicateProposedOutputs = [
  ...Map.groupBy(entries, (entry) => entry.claimKey).entries(),
].flatMap(([claimKey, claimEntries]) => {
  const grouped = Map.groupBy(
    claimEntries,
    (entry) => entry.proposedRevision.summaryText,
  );
  return [...grouped.entries()]
    .filter(([, outputEntries]) => outputEntries.length > 1)
    .map(([output, outputEntries]) => ({
      claimKey,
      output,
      canonicalVariantIds: outputEntries.map(
        (entry) => entry.canonicalVariantId,
      ),
    }));
});
const report = {
  contractVersion:
    "nuang-trait-map-remaining-p0-internal-revisions.v2.2",
  reportId: "TRAIT-MAP-REMAINING-P0-INTERNAL-REVISIONS.0.1",
  status:
    unsafeFlags.length === 0 &&
    duplicateProposedOutputs.length === 0
      ? "REMAINING_P0_INTERNAL_READTHROUGH_COMPLETE_RECOMPOSITION_REQUIRED"
      : "REMAINING_P0_REVISION_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueId: queue.queueId,
  summary: {
    reviewedEntries: entries.length,
    claimPackets: queue.summary.remainingClaimPackets,
    selectedExistingParagraphs: entries.filter(
      (entry) =>
        entry.internalScreening.decision ===
        "retain_one_traceable_paragraph_remove_redundancy",
    ).length,
    synthesizedParagraphs: entries.filter(
      (entry) =>
        entry.internalScreening.decision ===
        "revise_information_preserving_single_paragraph",
    ).length,
    unsafeLanguageFlags: unsafeFlags.length,
    duplicateProposedOutputs:
      duplicateProposedOutputs.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  interpretation: [
    "모든 문장은 같은 claim의 축 서명을 나란히 읽은 내부 편집 후보다.",
    "기존 문단 선택은 원문 하나를 그대로 사용하며, 합성은 원문 밖의 새 성격 주장을 추가하지 않는다.",
    "내부 판독은 독립 7개 역할 승인, 인지면접, 구성타당도 검증 또는 고객 발행 승인이 아니다.",
  ],
  unsafeFlags,
  duplicateProposedOutputs,
  entries,
  nextGate: {
    name: "APPLY_REMAINING_P0_REVISIONS_AND_RECOMPOSE",
    actions: [
      "50개 제안을 별도 content version으로 적용하고 이전 문단을 계보에 보존한다.",
      "32개 코드·80개 한 글자 이웃·동일 출력·위험 문구를 다시 검사한다.",
      "전체 P0의 내부 판독 회계가 빠짐없이 닫혔는지 확인한다.",
      "P0 증거 패킷을 고정한 뒤 P1 문장 검토로 이동한다.",
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
    console.error("v2.2 remaining P0 internal revisions are stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Remaining P0 internal revisions v2.2: ${report.summary.reviewedEntries} reviewed, ${report.summary.selectedExistingParagraphs} selected, ${report.summary.synthesizedParagraphs} synthesized, duplicates ${report.summary.duplicateProposedOutputs}, unsafe ${report.summary.unsafeLanguageFlags}.`,
);

function select(paragraphIndex) {
  return { method: "select_existing_paragraph", paragraphIndex };
}

function synth(text) {
  return { method: "information_preserving_synthesis", text };
}

function buildMarkdown(result) {
  return `# v2.2 남은 P0 문장 내부 판독·교정 후보

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- 판독 entry: ${result.summary.reviewedEntries}
- claim 묶음: ${result.summary.claimPackets}
- 기존 문단 선택: ${result.summary.selectedExistingParagraphs}
- 한 문단 합성: ${result.summary.synthesizedParagraphs}
- 같은 claim의 동일 제안 출력: ${result.summary.duplicateProposedOutputs}
- 위험·회피 표현: ${result.summary.unsafeLanguageFlags}
- 독립 역할 승인: 0
- 고객 승인: 0

자동 flag가 없던 문장도 같은 claim의 모든 축 서명과 나란히 읽었다. 제안
문장은 현재 축과 claimKind에 필요한 한 관찰만 남긴 내부 편집 후보이며,
독립 검토와 고객 이해도 검증 전에는 발행하지 않는다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
