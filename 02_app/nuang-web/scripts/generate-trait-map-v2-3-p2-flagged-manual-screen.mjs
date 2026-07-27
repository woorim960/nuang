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
  "TRAIT_MAP_P2_FLAGGED_INTERNAL_SCREEN_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "111_P2_FLAGGED_INTERNAL_SCREEN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const preflight = readJson("TRAIT_MAP_P2_AUTOMATED_PREFLIGHT_V2_3.json");

const revisions = {
  "CAN-SCN-FAMILY-UNCERTAINTY-ATTENTION-OE-R-ER-C": {
    revisedText:
      "가족의 건강·진로·경제처럼 결과를 알기 어려운 일이 생기면 걱정과 감정이 커지기 전에, 확인된 사실과 아직 모르는 부분, 당장 준비할 수 있는 행동을 구분하려는 경향이 있다.",
    issue:
      "R의 사실 확인은 선명하지만 C의 감정이 천천히 정리되는 과정이 원문에 직접 드러나지 않았다.",
  },
  "CAN-SCN-GENERAL-NEED-EXPRESSION-PROCESS-SE-I-RO-A": {
    revisedText:
      "먼저 혼자 원하는 것과 자신의 마음을 정리한 뒤, 상대가 어떻게 느낄지와 관계에 필요한 배려를 담아 어떤 말부터 할지 생각하기 쉽다.",
    issue:
      "I의 혼자 정리하는 과정과 A의 상대 마음·관계 영향이 모두 간접적으로만 표현됐다.",
  },
  "CAN-SCN-GENERAL-NEED-EXPRESSION-RESPONSE-SE-I-RO-A": {
    revisedText:
      "혼자 충분히 생각하며 자신의 마음과 관계에 필요한 점을 정리한 뒤, 차분한 때 대화를 요청해 상대의 마음도 듣는 편이다.",
    issue:
      "I는 어느 정도 보이지만 A의 관계와 마음을 살피는 실제 반응이 선명하지 않았다.",
  },
  "CAN-SCN-GENERAL-NEED-EXPRESSION-RESPONSE-SE-I-RO-G": {
    revisedText:
      "혼자 상황과 필요한 도움을 정리한 뒤, 믿을 만한 사람에게 문제 지점과 원하는 시간·정보·행동을 구체적으로 요청하는 편이다.",
    issue:
      "구체적 요청은 보이지만 I의 혼자 정리와 G의 문제 지점·해결 행동이 충분히 연결되지 않았다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-E-OE-N-SM-M": {
    revisedText:
      "사람들과 선택 가능성을 이야기하는 동안 새 아이디어를 얻고, 현재의 흥미·자원·주변 반응에 맞춰 작은 시도를 시작한 뒤 방법과 순서를 바꾸는 편이다.",
    issue:
      "사람들의 반응은 E의 상호작용을 뜻하지 않으며, 흥미만으로는 N의 가능성 탐색이 선명하지 않았다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-N-SM-M": {
    revisedText:
      "혼자 여러 가능성을 비교한 뒤 현재 흥미와 자원에 맞는 한 가지를 작게 시험하고, 결과에 따라 다음 방법과 순서를 바꾸는 편이다.",
    issue:
      "N과 M은 보이지만 I의 혼자 생각하고 결정하는 과정이 빠져 있었다.",
  },
  "CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-R-SM-K": {
    revisedText:
      "혼자 확인된 조건과 지난 경험을 살핀 뒤 목표를 작은 단계로 나누고 시작·중간 확인·완료 시점을 정해, 에너지가 달라져도 정한 흐름으로 돌아가 이어가는 편이다.",
    issue:
      "R과 K는 보이지만 I의 혼자 검토하는 과정이 빠져 있었다.",
  },
  "CAN-SCN-GENERAL-SUCCESS-RESPONSE-SE-E": {
    revisedText:
      "성취한 일을 사람들과 이야기하고 축하를 주고받는 동안 기쁨과 에너지가 커지며, 그 흐름을 다음 계획이나 새로운 시도로 이어가는 편이다.",
    issue:
      "감정 표현과 주변 사람 언급만으로는 E의 상호작용에서 에너지를 얻는 방향이 충분히 선명하지 않았다.",
  },
  "CAN-SCN-GENERAL-UNCERTAINTY-RESPONSE-SE-E-OE-R-ER-Q": {
    revisedText:
      "걱정이 빠르게 올라오면 사람들과 정보를 주고받으며 생각을 정리하고, 확인된 사실을 바탕으로 선택지를 좁혀 가장 현실적인 계획부터 실행하는 편이다.",
    issue:
      "R은 보이지만 E의 상호작용과 Q의 빠른 정서 반응이 원문에 직접 나타나지 않았다.",
  },
  "CAN-SCN-GENERAL-UNCERTAINTY-RESPONSE-SE-I-OE-N-ER-C": {
    revisedText:
      "걱정과 감정이 커지기 전에 혼자 여러 가설과 가능한 방향을 정리한 뒤, 현재 조건에서 시험할 수 있는 방법을 골라 작게 움직이는 편이다.",
    issue:
      "I와 N은 보이지만 C의 감정이 크게 번지기 전 정리하는 과정이 빠져 있었다.",
  },
  "CAN-SCN-GENERAL-UNCERTAINTY-RESPONSE-SE-I-OE-R-ER-Q": {
    revisedText:
      "걱정이 빠르게 올라와도 혼자 확인된 사실과 가능한 원인을 정리하고, 위험을 줄일 질문과 작은 대비 행동을 고르는 편이다.",
    issue:
      "R은 보이지만 I의 혼자 정리와 Q의 빠른 정서 반응이 충분히 직접적이지 않았다.",
  },
  "CAN-SCN-PARTNER-DISAGREEMENT-RESPONSE-RO-G-SM-K": {
    revisedText:
      "연인과 의견이 부딪힌 원인과 풀어야 할 문제를 함께 정리한 뒤, 다음에 지킬 구체적인 약속과 확인 시점을 정하는 편이다.",
    issue:
      "K의 약속과 확인 시점은 선명하지만 G의 원인과 해결 방향이 간접적으로만 표현됐다.",
  },
  "CAN-SCN-PERSON-OF-INTEREST-BOUNDARY-COMMUNICATION-RO-A": {
    revisedText:
      "“너와 계속 알아가는 관계가 중요해서 내 마음을 솔직히 말하고 싶어. 늦은 밤 반복 연락은 부담스러우니 다음 날 이야기했으면 좋겠어”처럼 관계의 의미와 경계를 함께 전하는 방식이 자연스럽다.",
    issue:
      "관심이라는 말만으로는 A의 마음과 관계 영향을 살피는 방향이 충분히 구별되지 않았다.",
  },
  "CAN-SCN-PERSON-OF-INTEREST-PLAN-CHANGE-PROCESS-OE-N": {
    revisedText:
      "일정이 바뀌면 관심 변화뿐 아니라 바쁨·건강·다른 일정처럼 여러 설명 가능성을 떠올리고, 앞으로 관계가 이어질 방향을 확인하고 싶다고 생각하기 쉽다.",
    issue:
      "여러 이유는 보이지만 N의 가능성과 앞으로의 방향을 탐색하는 뜻을 더 직접적으로 보여줄 필요가 있었다.",
  },
};

const semanticBasisById = {
  "CAN-SCN-FAMILY-BOUNDARY-ATTENTION-RO-G":
    "반복 행동과 실제로 바꿀 점을 분리해 살피므로 G의 원인·해결 초점이 의미상 선명하다.",
  "CAN-SCN-FAMILY-BOUNDARY-PROCESS-RO-G":
    "불편한 정확한 지점과 지킬 행동 기준을 정리하므로 G의 문제 지점·대응 초점이 드러난다.",
  "CAN-SCN-FAMILY-NEED-EXPRESSION-ATTENTION-RO-G":
    "생활에서 달라져야 할 구체 행동을 먼저 정리하므로 G의 해결 행동 초점이 드러난다.",
  "CAN-SCN-FAMILY-NEED-EXPRESSION-COMMUNICATION-RO-G":
    "필요와 실행 가능한 행동 기준을 함께 요청해 G의 구체적 해결 방식이 선명하다.",
  "CAN-SCN-FAMILY-NEED-EXPRESSION-PROCESS-RO-G":
    "원하는 행동과 실행 가능한 수준을 구분해 G의 해결 가능성 검토가 드러난다.",
  "CAN-SCN-FRIEND-AFTERMATH-ATTENTION-RO-G":
    "오해가 시작된 지점과 다시 확인할 내용을 찾아 G의 원인·해결 초점이 드러난다.",
  "CAN-SCN-FRIEND-BOUNDARY-ATTENTION-RO-G":
    "불편한 행동과 관계 유지를 위해 달라질 점을 구분해 G의 문제·변화 초점이 선명하다.",
  "CAN-SCN-FRIEND-BOUNDARY-COMMUNICATION-RO-G":
    "문제가 된 행동과 원하는 변화를 직접 연결해 G의 해결 지향을 보여준다.",
  "CAN-SCN-FRIEND-NEED-EXPRESSION-ATTENTION-RO-G":
    "도움이 필요한 상황과 실제로 도움이 되는 부탁을 구체화해 G의 실행 초점이 드러난다.",
  "CAN-SCN-FRIEND-NEED-EXPRESSION-COMMUNICATION-RO-G":
    "시간·자료처럼 필요한 지원을 구체 행동으로 요청해 G의 해결 방식이 드러난다.",
  "CAN-SCN-FRIEND-NEED-EXPRESSION-RESPONSE-RO-G":
    "필요한 시간과 행동을 분명히 요청해 G의 구체적 해결 반응이 선명하다.",
  "CAN-SCN-GENERAL-BOUNDARY-COMMUNICATION-RO-G":
    "행동 기준과 가능한 대안을 함께 제시해 G의 해결 지향이 선명하다.",
  "CAN-SCN-GENERAL-SUCCESS-PROCESS-OE-N":
    "현재 성취에서 다음에 더 해볼 가능성으로 생각이 확장되어 N의 방향이 드러난다.",
  "CAN-SCN-GENERAL-SUCCESS-PROCESS-OE-R":
    "결과를 만든 선택과 같은 방식의 재현 가능성을 되짚어 R의 경험·사실 초점이 드러난다.",
  "CAN-SCN-GENERAL-UNCERTAINTY-RESPONSE-SE-E-OE-N-ER-C":
    "가능한 방향을 사람들과 확인하고 시간이 지난 뒤 감정을 점검해 E·N·C가 모두 드러난다.",
  "CAN-SCN-GENERAL-UNCERTAINTY-RESPONSE-SE-E-OE-N-ER-Q":
    "사람들과 가능성을 확인하고 올라온 걱정을 즉시 준비 목록으로 바꾸어 E·N·Q가 드러난다.",
  "CAN-SCN-PARTNER-AFTERMATH-COMMUNICATION-RO-G":
    "다르게 이해한 지점과 다음 행동 제안을 연결해 G의 원인·해결 초점이 선명하다.",
  "CAN-SCN-PARTNER-BOUNDARY-COMMUNICATION-RO-G":
    "금지 행동과 직접 물어보는 대안을 함께 제시해 G의 해결 지향이 선명하다.",
  "CAN-SCN-PARTNER-NEED-EXPRESSION-ATTENTION-RO-G":
    "달라지길 바라는 행동과 대화 시점을 정리해 G의 실행 초점이 드러난다.",
  "CAN-SCN-PARTNER-NEED-EXPRESSION-COMMUNICATION-RO-G":
    "바라는 행동과 그 이유를 직접 연결해 G의 구체적 해결 방식이 드러난다.",
  "CAN-SCN-PARTNER-SETBACK-RESPONSE-RO-G-ER-C":
    "차분히 들은 뒤 함께 찾을 방법을 묻고 대안을 정해 G·C가 모두 드러난다.",
  "CAN-SCN-PARTNER-SETBACK-RESPONSE-RO-G-ER-Q":
    "빠르게 올라온 걱정 속에서도 사과와 수정 행동을 정해 G·Q가 모두 드러난다.",
  "CAN-SCN-PERSON-OF-INTEREST-BOUNDARY-COMMUNICATION-RO-G":
    "부담이 되는 행동과 다음 날 대화라는 대안을 분명히 연결해 G의 해결 방식이 드러난다.",
  "CAN-SCN-WORK-AFTERMATH-RESPONSE-SM-M":
    "회복 뒤 자신의 현재 흐름에 맞게 작업 방식을 고쳐 M의 상황 조정이 드러난다.",
  "CAN-SCN-WORK-DISAGREEMENT-RESPONSE-RO-A-SM-M":
    "구성원의 부담을 살피고 실행안을 유연하게 조정해 A·M이 모두 드러난다.",
  "CAN-SCN-WORK-DISAGREEMENT-RESPONSE-RO-G-SM-K":
    "근거와 시험 기준, 결정 시점을 정해 G의 해결 검증과 K의 유지 기준이 드러난다.",
  "CAN-SCN-WORK-GROUP-PARTICIPATION-RESPONSE-SE-E-SM-K":
    "질문과 의견 교환으로 논의를 열고 합의를 일정으로 고정해 E·K가 드러난다.",
  "CAN-SCN-WORK-GROUP-PARTICIPATION-RESPONSE-SE-E-SM-M":
    "논의를 주고받으며 작은 실험을 제안하고 반응에 맞춰 바꾸어 E·M이 드러난다.",
  "CAN-SCN-WORK-UNCERTAINTY-RESPONSE-OE-R-SM-K":
    "자료·담당자·일정을 확인해 한 실행안으로 좁히므로 R·K가 모두 드러난다.",
};

const flaggedEntries = preflight.entries.filter(
  (entry) => entry.flags.length > 0,
);
const decisions = flaggedEntries.map((entry) => {
  const revision = revisions[entry.canonicalVariantId];
  const semanticBasis = semanticBasisById[entry.canonicalVariantId];
  if (!revision && !semanticBasis) {
    throw new Error(
      `Missing internal decision: ${entry.canonicalVariantId}`,
    );
  }
  const revisedContent = revision
    ? {
        summaryText: revision.revisedText,
        detailParagraphs: [revision.revisedText],
        contentShape: entry.content.contentShape,
      }
    : null;
  return {
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    axisSignature: entry.axisSignature,
    automatedFlags: entry.flags,
    decision: revision
      ? "revise_for_axis_clarity"
      : "retain_lexical_false_positive",
    rationale: revision?.issue ?? semanticBasis,
    previousContent: entry.content,
    revisedContent,
    independentRoleReviewState: "pending",
    customerApprovalState: "pending",
    publicationState: "research_only",
  };
});

const report = {
  contractVersion:
    "nuang-trait-map-p2-flagged-internal-screen.v2.3",
  reportId: "TRAIT-MAP-P2-FLAGGED-INTERNAL-SCREEN.2.3",
  status: "P2_FLAGGED_INTERNAL_SCREEN_COMPLETE_RECOMPOSITION_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourcePreflightReportId: preflight.reportId,
  summary: {
    flaggedEntries: decisions.length,
    retainLexicalFalsePositives: decisions.filter(
      (entry) => entry.decision === "retain_lexical_false_positive",
    ).length,
    revisionCandidates: decisions.filter(
      (entry) => entry.decision === "revise_for_axis_clarity",
    ).length,
    scopeRemovalCandidates: 0,
    unresolvedInternalDecisions: 0,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  decisionRules: [
    "어휘 목록에 없는 표현이라도 축의 주의 대상·처리 방식·실제 반응이 의미상 분명하면 유지한다.",
    "축을 유추해야 하거나 다른 축 설명으로도 읽히면 문장을 직접 교정한다.",
    "내부 판독과 교정은 독립 심리측정 검증 또는 고객 발행 승인이 아니다.",
  ],
  decisions,
  nextGate: {
    name: "APPLY_P2_REVISIONS_AND_RECOMPOSE_32_PROFILES",
    actions: [
      "14개 교정을 canonical 원장에 적용한다.",
      "32개 성향의 한 글자 이웃 80쌍과 중복·위험 표현을 다시 검사한다.",
      "교정 문장을 P0 독립 검토 큐로 승격한다.",
    ],
  },
};

if (
  report.summary.flaggedEntries !== 43 ||
  report.summary.revisionCandidates !== 14 ||
  report.summary.retainLexicalFalsePositives !== 29
) {
  throw new Error("P2 flagged decision accounting is not 43 = 14 + 29.");
}

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
    console.error("v2.3 P2 flagged internal screen is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P2 flagged screen v2.3: ${decisions.length} = retain ${report.summary.retainLexicalFalsePositives} + revise ${report.summary.revisionCandidates}; independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.3 P2 표시 문장 내부 판독

- 자동 표시 문장: ${result.summary.flaggedEntries}
- 어휘 사전 오탐으로 유지: ${result.summary.retainLexicalFalsePositives}
- 축 선명도 교정: ${result.summary.revisionCandidates}
- 축 범위 제거: ${result.summary.scopeRemovalCandidates}
- 미결정: ${result.summary.unresolvedInternalDecisions}
- 독립 승인: 0

자동 어휘 검사가 표시한 43개를 문장 의미와 반대 방향 문장까지 함께
판독했다. 29개는 ‘바라는 변화’, ‘행동 기준’, ‘대안’처럼 기존 단서
목록에 없지만 축 의미가 직접 드러나는 표현이라 유지했다. 나머지 14개는
외향형·혼자형·가능성형·마음형·차분반응형·빠른반응형 중 하나 이상의
뜻을 사용자가 추측해야 해서 직접 교정한다.

이 결과는 내부 품질 판독이며 독립 심리측정 검증이나 고객 발행 승인이
아니다. 모든 문장은 계속 research_only로 유지한다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
