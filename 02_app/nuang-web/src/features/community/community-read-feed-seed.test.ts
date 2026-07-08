import { describe, expect, it } from "vitest";
import {
  communityReadFeedItems,
  communityReadFeedPolicy,
  listCommunityReadFeedGroups,
  listCommunityReadFeedItems,
} from "@/features/community/community-read-feed-seed";

describe("community read feed seed", () => {
  it("opens only read-only official seed cards before moderation is complete", () => {
    expect(listCommunityReadFeedItems().map((item) => item.kind)).toEqual([
      "daily_prompt",
      "trait_card_guide",
      "relationship_repair_prompt",
      "map_reflection_prompt",
      "self_intro_prompt",
      "public_profile_example",
    ]);
    expect(communityReadFeedPolicy).toEqual({
      commentsEnabled: false,
      directMessagesEnabled: false,
      onlyOfficialSeedBeforeModeration: true,
      publicWriteEnabled: false,
      reactionWriteEnabled: false,
      sensitiveTopicsAllowed: false,
    });
  });

  it("orders official seed cards by section priority", () => {
    expect(
      listCommunityReadFeedItems().map((item) => ({
        actionLabel: item.actionLabel,
        priority: item.priority,
        section: item.section,
        sectionLabel: item.sectionLabel,
      })),
    ).toEqual([
      {
        actionLabel: "질문 홈",
        priority: 10,
        section: "daily_question",
        sectionLabel: "오늘의 질문",
      },
      {
        actionLabel: "공개 카드",
        priority: 20,
        section: "profile_card",
        sectionLabel: "공개 카드",
      },
      {
        actionLabel: "비교 미리보기",
        priority: 25,
        section: "relationship_repair",
        sectionLabel: "관계 조율",
      },
      {
        actionLabel: "성향지도",
        priority: 27,
        section: "map_reflection",
        sectionLabel: "성향지도",
      },
      {
        actionLabel: "마이",
        priority: 29,
        section: "self_intro",
        sectionLabel: "자기소개",
      },
      {
        actionLabel: "공개 범위",
        priority: 40,
        section: "visibility_safety",
        sectionLabel: "공개 범위",
      },
    ]);
  });

  it("groups official seed cards into scannable feed sections", () => {
    expect(
      listCommunityReadFeedGroups().map((group) => ({
        description: group.description,
        ids: group.items.map((item) => item.id),
        label: group.label,
      })),
    ).toEqual([
      {
        description: "가볍게 답해볼 수 있는 공식 질문",
        ids: ["daily_prompt_001"],
        label: "오늘",
      },
      {
        description: "성향지도와 관계를 더 재밌게 읽는 질문",
        ids: [
          "trait_card_guide_001",
          "relationship_repair_001",
          "map_reflection_001",
          "self_intro_001",
        ],
        label: "탐색 질문",
      },
      {
        description: "공개 범위와 안전 기준을 확인하는 안내",
        ids: ["public_profile_example_001"],
        label: "공개와 안전",
      },
    ]);
  });

  it("provides a concrete safety target for each visible feed card", () => {
    expect(
      communityReadFeedItems.map((item) => ({
        id: item.safetyTarget.id,
        label: item.safetyTarget.label,
        type: item.safetyTarget.type,
      })),
    ).toEqual([
      {
        id: "daily_prompt_001",
        label: "오늘의 질문",
        type: "community_preview_card",
      },
      {
        id: "trait_card_guide_001",
        label: "성향 카드 가이드",
        type: "community_preview_card",
      },
      {
        id: "relationship_repair_001",
        label: "관계 조율 질문",
        type: "community_preview_card",
      },
      {
        id: "map_reflection_001",
        label: "성향지도 해석 질문",
        type: "community_preview_card",
      },
      {
        id: "self_intro_001",
        label: "자기소개 질문",
        type: "community_preview_card",
      },
      {
        id: "public_profile_example_001",
        label: "공개 범위 예시",
        type: "community_preview_card",
      },
    ]);
  });

  it("provides scannable hierarchy labels for each feed card", () => {
    expect(
      communityReadFeedItems.map((item) => ({
        scopeLabel: item.scopeLabel,
        statusLabel: item.statusLabel,
        surfaceLabel: item.surfaceLabel,
      })),
    ).toEqual([
      {
        scopeLabel: "공식 질문",
        statusLabel: "응답 준비 중",
        surfaceLabel: "읽기 카드",
      },
      {
        scopeLabel: "카드 가이드",
        statusLabel: "공유 준비 중",
        surfaceLabel: "공개 카드",
      },
      {
        scopeLabel: "대화 질문",
        statusLabel: "대화 준비 중",
        surfaceLabel: "질문 카드",
      },
      {
        scopeLabel: "지도 해석",
        statusLabel: "해석 준비 중",
        surfaceLabel: "지도 카드",
      },
      {
        scopeLabel: "소개 질문",
        statusLabel: "소개 준비 중",
        surfaceLabel: "질문 카드",
      },
      {
        scopeLabel: "공개 범위",
        statusLabel: "비교 준비 중",
        surfaceLabel: "프로필 카드",
      },
    ]);
  });

  it("provides official preview reaction counts for feed density", () => {
    expect(
      communityReadFeedItems.map((item) => ({
        id: item.id,
        previewReactionCount: item.previewReactionCount,
      })),
    ).toEqual([
      {
        id: "daily_prompt_001",
        previewReactionCount: 128,
      },
      {
        id: "trait_card_guide_001",
        previewReactionCount: 96,
      },
      {
        id: "relationship_repair_001",
        previewReactionCount: 82,
      },
      {
        id: "map_reflection_001",
        previewReactionCount: 88,
      },
      {
        id: "self_intro_001",
        previewReactionCount: 63,
      },
      {
        id: "public_profile_example_001",
        previewReactionCount: 74,
      },
    ]);
  });

  it("does not expose sensitive clinical topics or direct responses in feed copy", () => {
    const publicText = JSON.stringify(communityReadFeedItems);

    expect(publicText).not.toMatch(/자살|자해|우울|ADHD|중독|트라우마|약물/);
    expect(publicText).not.toMatch(/직접 응답 공개|원점수 공개|도움 연결 기록 공개/);
  });
});
