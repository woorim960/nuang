import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const coveragePath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_COVERAGE.json",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/ENAKQ_GAP_AUTHORING_PLAN.json",
);
const checkOnly = process.argv.includes("--check");

const contextConfig = {
  general: {
    chapterId: "daily_choice_and_change",
    priority: "P0",
    subject: "일상에서",
  },
  family: { chapterId: "family", priority: "P1", subject: "가족과" },
  friend: { chapterId: "friend", priority: "P1", subject: "친구와" },
  partner: { chapterId: "partner", priority: "P0", subject: "연인과" },
  person_of_interest: {
    chapterId: "person_of_interest",
    priority: "P0",
    subject: "마음에 드는 사람과",
  },
  work: {
    chapterId: "work_and_study",
    priority: "P1",
    subject: "일하거나 공부할 때",
  },
};

const momentConfig = {
  ordinary_choice: "평소 선택을 할 때",
  new_encounter: "새로운 사람이나 상황을 만날 때",
  group_participation: "여럿이 함께하는 자리에 참여할 때",
  plan_change: "계획이 갑자기 달라질 때",
  uncertainty: "앞일이 분명하지 않을 때",
  disagreement: "생각이 다른 사람과 부딪힐 때",
  support_requested: "누군가 도움이나 위로를 바랄 때",
  need_expression: "자신이 원하는 것을 말해야 할 때",
  boundary: "부탁을 거절하거나 선을 정해야 할 때",
  success: "좋은 결과나 기쁜 일이 생겼을 때",
  setback: "실수하거나 기대한 결과가 나오지 않을 때",
  aftermath: "부담스러운 일이 지나간 뒤",
};

const observationByMoment = {
  ordinary_choice: ["attention", "decision", "actual_response"],
  new_encounter: ["attention", "first_thought", "communication"],
  group_participation: ["attention", "communication", "actual_response"],
  plan_change: ["first_thought", "decision", "actual_response"],
  uncertainty: ["attention", "first_thought", "emotional_activation"],
  disagreement: ["first_thought", "communication", "actual_response"],
  support_requested: ["attention", "first_thought", "actual_response"],
  need_expression: ["first_thought", "communication", "actual_response"],
  boundary: ["attention", "decision", "communication"],
  success: ["emotional_activation", "communication", "actual_response"],
  setback: ["first_thought", "emotional_activation", "actual_response"],
  aftermath: ["recovery", "follow_through", "communication"],
};

const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
const gaps = coverage.rows
  .filter((row) => row.status === "gap_needs_claim")
  .map((row, index) => {
    const context = contextConfig[row.relationshipContext];
    const momentLabel = momentConfig[row.moment];
    if (!context || !momentLabel) {
      throw new Error(`Unknown gap inventory row: ${row.scenarioId}`);
    }
    const slug = `${row.relationshipContext}.${row.moment}`;

    return {
      workItemId: `ENAKQ-GAP-${String(index + 1).padStart(2, "0")}`,
      scenarioId: row.scenarioId,
      chapterId: context.chapterId,
      relationshipContext: row.relationshipContext,
      moment: row.moment,
      priority: context.priority,
      plainKoreanQuestion: `${context.subject} ${momentLabel}, ENAKQ는 무엇을 먼저 살피고 어떤 생각과 반응으로 이어지는가?`,
      requiredObservationChannels: observationByMoment[row.moment],
      plannedClaimIds: [
        `ENAKQ.scenario.${slug}.attention`,
        `ENAKQ.scenario.${slug}.process`,
        `ENAKQ.scenario.${slug}.response`,
        `ENAKQ.scenario.${slug}.communication`,
      ],
      researchQuestions: [
        "무엇이 가장 먼저 눈에 들어오는가?",
        "처음 드는 생각은 무엇이며 실제 반응과 어떻게 다른가?",
        "왜 그런 반응이 쉬운지 5축과 facet 수준에서 어떻게 설명되는가?",
        "같은 코드 안에서도 반응을 바꾸는 상황 조건은 무엇인가?",
        "상대가 오해하기 쉬운 지점과 도움이 되는 대화 방식은 무엇인가?",
      ],
      evidenceGate: {
        minimumNormalizedFindings: 1,
        requiresNuangUserValidation: true,
        requiresKoreanPlainLanguageReview: true,
        customerPublicationAllowed: false,
      },
      authoringStatus: "evidence_search_required",
    };
  });

const priorityCounts = Object.fromEntries(
  ["P0", "P1", "P2"].map((priority) => [
    priority,
    gaps.filter((item) => item.priority === priority).length,
  ]),
);

const plan = {
  contractVersion: "nuang-trait-map-data-center.v2",
  planId: "ENAKQ-GAP-AUTHORING-PLAN.0.1",
  code: "ENAKQ",
  status: "RESEARCH_WORK_QUEUE_NOT_FOR_PRODUCTION",
  sourceCoverageReport: "ENAKQ-SCENARIO-COVERAGE.0.1",
  gapCount: gaps.length,
  priorityCounts,
  authoringOrder: [
    "P0: 마음에 드는 사람·연인·일상에서 고객 관심과 안전 영향이 큰 장면",
    "P1: 가족·친구·일과 공부 장면",
    "P2: 후속 보강 장면",
  ],
  nonNegotiableRule:
    "빈 상황을 그럴듯한 문장으로 채우지 않고, 근거 탐색·뉴앙 자료 검증·쉬운 한국어 검토를 거친 claim만 승인 후보로 올린다.",
  items: gaps,
};

const output = await prettier.format(JSON.stringify(plan), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "ENAKQ gap authoring plan is stale. Run npm run research:trait-map:v2:enakq-gap-plan.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ gap authoring plan is current: ${gaps.length} evidence-first work items.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${gaps.length} evidence-first work items.`,
  );
}
