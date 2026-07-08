import { describe, expect, it } from "vitest";
import { listCommunityFeedBridgeItems } from "@/features/community/community-feed-bridge";

describe("community feed bridge", () => {
  it("links official feed readers to the next safe product surfaces", () => {
    expect(
      listCommunityFeedBridgeItems().map((item) => ({
        actionLabel: item.actionLabel,
        href: item.href,
        id: item.id,
        statusLabel: item.statusLabel,
        title: item.title,
      })),
    ).toEqual([
      {
        actionLabel: "검사 홈",
        href: "/assessments",
        id: "start_core",
        statusLabel: "첫 기준",
        title: "내 기준 만들기",
      },
      {
        actionLabel: "성향지도",
        href: "/map",
        id: "open_map",
        statusLabel: "시각화",
        title: "지도에서 보기",
      },
      {
        actionLabel: "마이",
        href: "/my",
        id: "check_visibility",
        statusLabel: "공개 범위",
        title: "공개 범위 확인",
      },
      {
        actionLabel: "비교 미리보기",
        href: "/together/comparison-preview",
        id: "compare_preview",
        statusLabel: "1:1",
        title: "비교 흐름 보기",
      },
    ]);
  });

  it("keeps the bridge away from sensitive clinical or raw-score copy", () => {
    const publicText = JSON.stringify(listCommunityFeedBridgeItems());

    expect(publicText).not.toMatch(/자살|자해|우울|ADHD|중독|트라우마|약물/);
    expect(publicText).not.toMatch(/원점수|직접 응답|진단|치료/);
  });
});
