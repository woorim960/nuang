import { describe, expect, it } from "vitest";
import {
  communityWriteGateOptions,
  communityWriteGatePolicy,
  getCommunityWriteGateOption,
} from "@/features/community/community-write-gate";

describe("community write gate", () => {
  it("keeps all write surfaces closed before moderation and account readiness", () => {
    expect(communityWriteGatePolicy).toEqual({
      commentsEnabled: false,
      postWriteEnabled: false,
      reactionWriteEnabled: false,
      requiresAccountBeforeWrite: true,
      requiresModerationBeforeWrite: true,
      sensitiveTopicWriteAllowed: false,
    });
    expect(communityWriteGateOptions.map((option) => option.kind)).toEqual([
      "reaction",
      "comment",
      "post",
    ]);
  });

  it("keeps visible gate copy away from sensitive clinical topics", () => {
    const publicText = JSON.stringify(communityWriteGateOptions);

    expect(publicText).not.toMatch(/자살|자해|우울|ADHD|중독|트라우마|약물/);
  });

  it("returns a stable option by write kind", () => {
    expect(getCommunityWriteGateOption("comment").label).toBe("댓글");
    expect(getCommunityWriteGateOption("reaction").label).toBe("공감");
  });
});
