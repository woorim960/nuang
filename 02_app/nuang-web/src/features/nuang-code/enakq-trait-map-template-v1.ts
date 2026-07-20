import {
  candidateAxisCopy,
  getCandidateProfileDefinition,
  type CandidateCodeSymbol,
} from "@/features/nuang-code/candidate-profile-names";
import {
  traitMapContentAtomSchema,
  type TraitMapContentAtomV1,
} from "@/features/nuang-code/trait-map-content-contract-v1";

export const enakqTraitMapTemplateVersion = "ENAKQ-MAP-TEMPLATE-1.0-REVIEW";

const profile = getCandidateProfileDefinition("ENAKQ");

if (!profile) {
  throw new Error("ENAKQ profile definition is missing.");
}

export const enakqTraitMapTemplateV1 = {
  axes: profile.code.split("").map((symbol, index) => {
    const axis = candidateAxisCopy[index];
    const direction = axis?.directions[symbol];

    if (!axis || !direction) {
      throw new Error(
        `ENAKQ axis definition is missing at position ${index + 1}.`,
      );
    }

    return {
      detailTitle: direction.detailTitle,
      description: direction.description,
      guardrail: axis.guardrail,
      label: axis.label,
      position: axis.position,
      shortToken: direction.shortToken,
      symbol: symbol as CandidateCodeSymbol,
    };
  }),
  code: profile.code,
  contexts: [
    context(
      "daily",
      "일상",
      "사람과 생각을 다음 행동으로 잇는 장면",
      "대화를 시작하고 여러 가능성을 살펴본 뒤, 함께 정한 일을 이어가려는 모습이 나타날 수 있어요. 실제 모습은 그날의 여유와 맡은 역할에 따라 달라질 수 있어요.",
      "지금은 이야기를 더 펼칠 때인지, 하나를 골라 시작할 때인지 확인해 보세요.",
      "general",
      "daily_life",
      ["ENAKQ.daily.context", "ENAKQ.interaction.boundary"],
      ["ENAKQ-P4-07", "ENAKQ-P6-01"],
    ),
    context(
      "family",
      "가족",
      "챙기는 마음과 가능한 범위를 함께 말하기",
      "가족의 대화나 일정을 먼저 챙기려는 모습이 나타날 수 있어요. 상대를 생각하는 마음이 있어도 늘 먼저 움직여야 하는 책임이 생기는 것은 아니에요.",
      "지금 필요한 것이 들어주는 일인지, 함께 방법을 찾는 일인지 물어보세요.",
      "family",
      "family",
      ["ENAKQ.family.context", "ENAKQ.family.support_prompt"],
      ["ENAKQ-P7-01", "ENAKQ-P7-06"],
    ),
    context(
      "friend",
      "친구",
      "새로운 제안과 서로의 속도 맞추기",
      "먼저 연락하거나 함께할 일을 제안하며 관계의 흐름을 열 수 있어요. 가까운 친구라도 연락 빈도와 혼자 쉬는 시간은 다를 수 있어요.",
      "각자 편한 연락 간격과 약속을 정하는 속도를 직접 확인해 보세요.",
      "friend",
      "friend",
      ["ENAKQ.friend.context", "ENAKQ.friend.similarity"],
      ["ENAKQ-P8-01", "ENAKQ-P8-06"],
    ),
    context(
      "partner",
      "연인",
      "마음을 추측하기보다 원하는 반응 확인하기",
      "상대 반응이 분명하지 않을 때 마음이 더 신경 쓰이고 여러 가능성을 떠올릴 수 있어요. 코드만으로 관계의 안정이나 궁합을 판단하지 않아요.",
      "지금은 마음을 더 이야기하고 싶은지, 같이 방법을 찾고 싶은지 물어보세요.",
      "partner",
      "partner",
      ["ENAKQ.partner.boundary", "ENAKQ.partner.similarity"],
      ["ENAKQ-P9-01", "ENAKQ-P9-09"],
    ),
    context(
      "person_of_interest",
      "마음 가는 사람",
      "가능성을 사실처럼 믿기 전에 직접 확인하기",
      "상대의 말과 반응에서 여러 의미를 떠올릴 수 있지만, 호감과 속마음은 뉴앙 코드나 행동 한 장면만으로 알 수 없어요.",
      "떠오른 해석과 실제로 확인한 사실을 나누어 적어보세요.",
      "person_of_interest",
      "person_of_interest",
      ["ENAKQ.crush.boundary", "ENAKQ.crush.similarity"],
      ["ENAKQ-P10-06", "ENAKQ-P10-07"],
    ),
    context(
      "work",
      "일·공부",
      "선택지를 펼친 뒤 다음 행동을 분명히 하기",
      "의견을 먼저 꺼내고 여러 방법을 살펴본 뒤 해야 할 일을 이어갈 수 있어요. 코드가 기획력·성과·리더십을 보장하는 것은 아니에요.",
      "더 탐색할 시간과 결정할 시점을 나누어 합의해 보세요.",
      "work",
      "work",
      ["ENAKQ.work.context", "ENAKQ.work.performance_boundary"],
      ["ENAKQ-P11-01", "ENAKQ-P11-05"],
    ),
  ],
  contentAtoms: [] as TraitMapContentAtomV1[],
  evidenceNote: {
    body: "뉴앙 코드는 다섯 방향을 기억하기 쉽게 묶은 언어예요. 역할 이름은 능력이나 직업을 뜻하지 않고, 관계의 성공이나 상대의 마음을 예측하지 않아요. 개인 설명은 실제 점수와 세부 성향, 별도로 측정한 반응 자료가 있을 때만 더 좁혀야 해요.",
    title: "코드보다 실제 경험을 함께 봐요",
  },
  processBoundary: {
    body: "대표 A는 관계에서 상대 마음에 관심이 가는 방향을 보여줘요. 하지만 처음에는 원인과 해결이 궁금해도 상대의 감정을 고려해 마음을 살피는 말부터 건넬 수 있고, 그 반대도 가능해요. 이런 차이는 정밀 검사에서 두 층위를 따로 측정한 경우에만 개인 리포트에 보여줘요.",
    title: "처음 드는 생각과 실제 나타나는 반응은 달라질 수 있어요",
  },
  profileName: profile.displayName,
  readingGuide: [
    "비슷한 상황에서 반복되는 모습인지 살펴봐요.",
    "마음속 생각과 실제로 한 행동을 나누어 봐요.",
    "사람·장소·역할이 달라졌을 때의 차이를 확인해요.",
  ],
  roleNameMeaning: {
    body: "‘관계를 여는’은 함께할 때 활력이 오르는 E와 상대 마음에 관심이 가는 A를 기억하기 위한 표현이에요. ‘지휘자’는 새로운 관점을 살피는 N과 정한 흐름을 이어가는 K를 한 장면으로 묶은 이름이에요.",
    boundary:
      "사람을 통솔하는 능력이나 직책을 뜻하지 않아요. 큰 목소리보다 대화를 시작하고 다음 행동을 이어가는 방식으로 나타날 수 있어요.",
    title: "이름은 긴 설명을 기억하는 별칭이에요",
  },
  status: "research_preview_not_customer_content" as const,
  summary: profile.summary,
  version: enakqTraitMapTemplateVersion,
};

enakqTraitMapTemplateV1.contentAtoms.push(
  atom({
    atomId: "tmc.v1.enakq.summary.general",
    claimRefs: [
      "ENAKQ.general.definition.E",
      "ENAKQ.general.definition.N",
      "ENAKQ.general.definition.A",
      "ENAKQ.general.definition.K",
      "ENAKQ.general.definition.Q",
    ],
    copy: enakqTraitMapTemplateV1.summary,
    evidenceRefs: ["ENAKQ-P1-01"],
    slot: "summary",
  }),
  atom({
    atomId: "tmc.v1.enakq.role-name.general",
    claimRefs: ["ENAKQ.general.role.opens", "ENAKQ.general.role.conductor"],
    copy: enakqTraitMapTemplateV1.roleNameMeaning.body,
    evidenceRefs: ["ENAKQ-P2-01", "ENAKQ-P2-02"],
    slot: "role_name_meaning",
  }),
  atom({
    atomId: "tmc.v1.enakq.process-boundary.general",
    claimRefs: ["ENAKQ.process.non_inference"],
    copy: enakqTraitMapTemplateV1.processBoundary.body,
    evidenceRefs: ["ENAKQ-P5-05", "ENAKQ-P14-03"],
    slot: "limitation",
  }),
  ...enakqTraitMapTemplateV1.contexts.map((item) =>
    atom({
      atomId: `tmc.v1.enakq.${item.id}`,
      claimRefs: item.claimRefs,
      context: item.context,
      copy: item.body,
      evidenceRefs: item.evidenceRefs,
      requiredSignals:
        item.context === "general"
          ? ["domain_scores"]
          : ["domain_scores", "relationship_context"],
      slot: item.slot,
    }),
  ),
  atom({
    atomId: "tmc.v1.enakq.evidence-note.general",
    claimRefs: [
      "ENAKQ.evidence.scope",
      "ENAKQ.evidence.nonvalidation",
      "ENAKQ.evidence.final_boundary",
    ],
    copy: enakqTraitMapTemplateV1.evidenceNote.body,
    evidenceRefs: ["ENAKQ-P15-01", "ENAKQ-P15-06"],
    slot: "evidence_note",
  }),
);

function context(
  id: EnakqContextId,
  label: string,
  title: string,
  body: string,
  prompt: string,
  relationshipContext: RelationshipContext,
  slot: ContextSlot,
  claimRefs: string[],
  evidenceRefs: string[],
) {
  return {
    body,
    claimRefs,
    context: relationshipContext,
    evidenceRefs,
    id,
    label,
    prompt,
    slot,
    title,
  };
}

function atom({
  atomId,
  claimRefs,
  context = "general",
  copy,
  evidenceRefs,
  requiredSignals = ["domain_scores"],
  slot,
}: {
  atomId: string;
  claimRefs: string[];
  context?: RelationshipContext;
  copy: string;
  evidenceRefs: string[];
  requiredSignals?: ("domain_scores" | "relationship_context")[];
  slot: TraitMapContentAtomV1["slot"];
}) {
  return traitMapContentAtomSchema.parse({
    atomId,
    claimRefs,
    context,
    copy: { short: copy },
    entity: { kind: "role_profile", ref: "ENAKQ" },
    evidenceRefs,
    privacyScope: "public_safe",
    publicationState: "research_only",
    requiredSignals,
    reviews: {
      measurement: "in_review",
      plainLanguage: "in_review",
      productSafety: "in_review",
      psychology: "in_review",
    },
    slot,
    surfaces: ["map_explorer"],
    version: 1,
  });
}

type EnakqContextId =
  "daily" | "family" | "friend" | "partner" | "person_of_interest" | "work";

type RelationshipContext =
  "general" | "family" | "friend" | "partner" | "person_of_interest" | "work";

type ContextSlot =
  | "daily_life"
  | "family"
  | "friend"
  | "partner"
  | "person_of_interest"
  | "work";

export type EnakqTraitMapTemplate = typeof enakqTraitMapTemplateV1;
export type EnakqTraitMapContext = EnakqTraitMapTemplate["contexts"][number];
