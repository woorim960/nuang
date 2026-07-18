import { describe, expect, it } from "vitest";
import {
  localCompletedRetentionDays,
  localInProgressRetentionDays,
  localRetentionPolicy,
} from "@/features/account/local-retention-policy";

describe("local retention policy", () => {
  it("keeps in-progress and completed local retention periods explicit", () => {
    expect(localInProgressRetentionDays).toBe(7);
    expect(localCompletedRetentionDays).toBe(30);
    expect(localRetentionPolicy).toEqual({
      completedCopy: "완료한 결과는 30일 동안 다시 열 수 있어요.",
      completedDays: 30,
      inProgressDays: 7,
      inProgressLabel: "진행 중 검사는 7일 동안 이어갈 수 있어요.",
    });
  });
});
