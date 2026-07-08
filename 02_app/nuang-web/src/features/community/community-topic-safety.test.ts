import { describe, expect, it } from "vitest";
import { hasSensitiveCommunityTopic } from "@/features/community/community-topic-safety";

describe("community topic safety", () => {
  it("keeps light community topics in the feed lane", () => {
    expect(
      hasSensitiveCommunityTopic("나는 대화 전에 생각을 정리할 시간이 있으면 좋아요."),
    ).toBe(false);
  });

  it("routes treatment or crisis-like topics away from the feed lane", () => {
    expect(hasSensitiveCommunityTopic("요즘 우울 이야기를 하고 싶어요.")).toBe(
      true,
    );
    expect(hasSensitiveCommunityTopic("ADHD 고민을 상담받고 싶어요.")).toBe(true);
  });
});
