import { describe, expect, it } from "vitest";
import {
  adminCommunityContentRequestSchema,
  isFutureSchedule,
} from "@/features/admin/admin-community-content-contract";

describe("admin community content contract", () => {
  it("accepts a complete balance game draft", () => {
    const result = adminCommunityContentRequestSchema.safeParse({
      action: "create",
      body: "두 선택지 중 더 끌리는 쪽을 골라보세요.",
      contentType: "balance_game",
      options: [
        { key: "plan", label: "미리 계획한다" },
        { key: "flow", label: "그날 마음대로 정한다" },
      ],
      prompt: "여행 전날, 나는 어느 쪽에 가까운가요?",
      title: "여행 계획 방식",
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate or missing balance game options", () => {
    const missing = adminCommunityContentRequestSchema.safeParse({
      action: "create",
      body: "",
      contentType: "balance_game",
      options: [{ key: "same", label: "같은 선택" }],
      prompt: "어느 쪽에 더 가까운가요?",
      title: "잘못된 투표",
    });
    const duplicate = adminCommunityContentRequestSchema.safeParse({
      action: "create",
      body: "",
      contentType: "balance_game",
      options: [
        { key: "same", label: "같은 선택" },
        { key: "same", label: "다른 문구" },
      ],
      prompt: "어느 쪽에 더 가까운가요?",
      title: "잘못된 투표",
    });

    expect(missing.success).toBe(false);
    expect(duplicate.success).toBe(false);
  });

  it("keeps daily questions free of poll options", () => {
    const valid = adminCommunityContentRequestSchema.safeParse({
      action: "create",
      body: "",
      contentType: "daily_question",
      options: [],
      prompt: "요즘 가장 마음이 편해지는 순간은 언제인가요?",
      title: "마음이 편한 순간",
    });
    const invalid = adminCommunityContentRequestSchema.safeParse({
      action: "create",
      body: "",
      contentType: "daily_question",
      options: [{ key: "one", label: "선택지" }],
      prompt: "요즘 가장 마음이 편해지는 순간은 언제인가요?",
      title: "마음이 편한 순간",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("requires a schedule to be more than one minute in the future", () => {
    const now = Date.parse("2026-07-27T00:00:00.000Z");

    expect(isFutureSchedule("2026-07-27T00:02:00.000Z", now)).toBe(true);
    expect(isFutureSchedule("2026-07-27T00:00:30.000Z", now)).toBe(false);
  });
});
