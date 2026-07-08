export type CommunityReadFeedKind =
  | "daily_prompt"
  | "map_reflection_prompt"
  | "relationship_repair_prompt"
  | "self_intro_prompt"
  | "trait_card_guide"
  | "public_profile_example";

export type CommunityReadFeedSection =
  | "daily_question"
  | "map_reflection"
  | "profile_card"
  | "relationship_repair"
  | "self_intro"
  | "visibility_safety";

export type CommunityReadFeedGroupId =
  | "today"
  | "exploration"
  | "safety";

export type CommunityReadFeedGroup = {
  description: string;
  id: CommunityReadFeedGroupId;
  items: CommunityReadFeedItem[];
  label: string;
};

export type CommunityReadFeedItem = {
  actionLabel: string;
  body: string;
  chips: string[];
  href: string;
  groupId: CommunityReadFeedGroupId;
  id: string;
  kind: CommunityReadFeedKind;
  motif: "flame" | "forest" | "purple" | "sun" | "water";
  previewReactionCount: number;
  priority: number;
  safetyTarget: {
    description: string;
    id: string;
    label: string;
    type: "community_preview_card";
  };
  scopeLabel: string;
  section: CommunityReadFeedSection;
  sectionLabel: string;
  sourceLabel: string;
  statusLabel: string;
  surfaceLabel: string;
  title: string;
};

export const communityReadFeedPolicy = {
  commentsEnabled: false,
  directMessagesEnabled: false,
  onlyOfficialSeedBeforeModeration: true,
  publicWriteEnabled: false,
  reactionWriteEnabled: false,
  sensitiveTopicsAllowed: false,
} as const;

export const communityReadFeedItems: ReadonlyArray<CommunityReadFeedItem> = [
  {
    actionLabel: "질문 홈",
    body: "나와 다른 속도의 사람을 만났을 때, 먼저 맞춰보는 신호는 무엇인가요?",
    chips: ["오늘의 질문", "댓글 준비 중"],
    groupId: "today",
    href: "/together",
    id: "daily_prompt_001",
    kind: "daily_prompt",
    motif: "sun",
    previewReactionCount: 128,
    priority: 10,
    safetyTarget: {
      description: "오늘의 질문 공식 카드",
      id: "daily_prompt_001",
      label: "오늘의 질문",
      type: "community_preview_card",
    },
    scopeLabel: "공식 질문",
    section: "daily_question",
    sectionLabel: "오늘의 질문",
    sourceLabel: "NUANG 공식",
    statusLabel: "응답 준비 중",
    surfaceLabel: "읽기 카드",
    title: "오늘의 질문",
  },
  {
    actionLabel: "공개 카드",
    body: "대표 성향, 5축 요약, 공개 가능한 한 줄 소개만 모아 카드로 보여주는 흐름을 준비 중이에요.",
    chips: ["성향 카드", "직접 응답 제외"],
    groupId: "exploration",
    href: "/my",
    id: "trait_card_guide_001",
    kind: "trait_card_guide",
    motif: "purple",
    previewReactionCount: 96,
    priority: 20,
    safetyTarget: {
      description: "성향 카드 가이드 공식 카드",
      id: "trait_card_guide_001",
      label: "성향 카드 가이드",
      type: "community_preview_card",
    },
    scopeLabel: "카드 가이드",
    section: "profile_card",
    sectionLabel: "공개 카드",
    sourceLabel: "NUANG 가이드",
    statusLabel: "공유 준비 중",
    surfaceLabel: "공개 카드",
    title: "성향 카드는 이렇게 보여줘요",
  },
  {
    actionLabel: "비교 미리보기",
    body: "같은 상황을 다르게 받아들였을 때, 먼저 맞춰보고 싶은 표현은 무엇인가요?",
    chips: ["관계 조율", "대화 질문"],
    groupId: "exploration",
    href: "/together/comparison-preview",
    id: "relationship_repair_001",
    kind: "relationship_repair_prompt",
    motif: "forest",
    previewReactionCount: 82,
    priority: 25,
    safetyTarget: {
      description: "관계 조율 공식 카드",
      id: "relationship_repair_001",
      label: "관계 조율 질문",
      type: "community_preview_card",
    },
    scopeLabel: "대화 질문",
    section: "relationship_repair",
    sectionLabel: "관계 조율",
    sourceLabel: "NUANG 공식",
    statusLabel: "대화 준비 중",
    surfaceLabel: "질문 카드",
    title: "다르게 느낀 순간을 어떻게 맞춰볼까요?",
  },
  {
    actionLabel: "성향지도",
    body: "내 5축 지도에서 가장 먼저 눈에 들어온 영역을 한 문장으로 풀어보세요.",
    chips: ["성향지도", "해석 질문"],
    groupId: "exploration",
    href: "/map",
    id: "map_reflection_001",
    kind: "map_reflection_prompt",
    motif: "flame",
    previewReactionCount: 88,
    priority: 27,
    safetyTarget: {
      description: "성향지도 해석 공식 카드",
      id: "map_reflection_001",
      label: "성향지도 해석 질문",
      type: "community_preview_card",
    },
    scopeLabel: "지도 해석",
    section: "map_reflection",
    sectionLabel: "성향지도",
    sourceLabel: "NUANG 가이드",
    statusLabel: "해석 준비 중",
    surfaceLabel: "지도 카드",
    title: "내 성향지도에서 제일 선명한 부분은?",
  },
  {
    actionLabel: "마이",
    body: "처음 만난 사람에게 내 리듬을 설명한다면 어떤 말이 가장 편할까요?",
    chips: ["자기소개", "가벼운 시작"],
    groupId: "exploration",
    href: "/my",
    id: "self_intro_001",
    kind: "self_intro_prompt",
    motif: "sun",
    previewReactionCount: 63,
    priority: 29,
    safetyTarget: {
      description: "자기소개 공식 카드",
      id: "self_intro_001",
      label: "자기소개 질문",
      type: "community_preview_card",
    },
    scopeLabel: "소개 질문",
    section: "self_intro",
    sectionLabel: "자기소개",
    sourceLabel: "NUANG 공식",
    statusLabel: "소개 준비 중",
    surfaceLabel: "질문 카드",
    title: "나를 편하게 소개하는 한 문장",
  },
  {
    actionLabel: "공개 범위",
    body: "기본 프로필과 성향지도 요약은 기본 공개, 민감 주제와 도움 연결 기록은 기본 비공개로 둬요.",
    chips: ["공개 범위", "민감 항목 비공개"],
    groupId: "safety",
    href: "/my",
    id: "public_profile_example_001",
    kind: "public_profile_example",
    motif: "water",
    previewReactionCount: 74,
    priority: 40,
    safetyTarget: {
      description: "공개 범위 안내 공식 카드",
      id: "public_profile_example_001",
      label: "공개 범위 예시",
      type: "community_preview_card",
    },
    scopeLabel: "공개 범위",
    section: "visibility_safety",
    sectionLabel: "공개 범위",
    sourceLabel: "공개 프로필 예시",
    statusLabel: "비교 준비 중",
    surfaceLabel: "프로필 카드",
    title: "비교 전에 공개 범위를 먼저 확인해요",
  },
];

export function listCommunityReadFeedItems() {
  return [...communityReadFeedItems].sort((a, b) => a.priority - b.priority);
}

export function listCommunityReadFeedGroups(): CommunityReadFeedGroup[] {
  const items = listCommunityReadFeedItems();

  return communityReadFeedGroupDefinitions
    .map((group) => ({
      ...group,
      items: items.filter((item) => item.groupId === group.id),
    }))
    .filter((group) => group.items.length > 0);
}

const communityReadFeedGroupDefinitions = [
  {
    description: "가볍게 답해볼 수 있는 공식 질문",
    id: "today",
    label: "오늘",
  },
  {
    description: "성향지도와 관계를 더 재밌게 읽는 질문",
    id: "exploration",
    label: "탐색 질문",
  },
  {
    description: "공개 범위와 안전 기준을 확인하는 안내",
    id: "safety",
    label: "공개와 안전",
  },
] as const satisfies ReadonlyArray<Omit<CommunityReadFeedGroup, "items">>;
