import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGuestReportShareToken,
  readGuestReportShareToken,
} from "@/features/share/server-guest-report-share-token";
import { buildTopicReportShareContent } from "@/features/share/report-share-contract";

vi.mock("server-only", () => ({}));

const content = buildTopicReportShareContent({
  assessmentTitle: "위로받을 때 필요한 것",
  highlights: ["방법 함께 찾기", "내 속도와 선택"],
  resultName: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
  summary: "막막할 때 해결 방법을 함께 정리하는 도움이 크게 나타났어요.",
});

describe("guest report share token", () => {
  beforeEach(() => {
    vi.stubEnv("SHARE_TOKEN_PEPPER", "guest-share-test-pepper");
  });

  it("round-trips only the validated public summary", () => {
    const issuedAt = new Date("2026-08-06T00:00:00.000Z");
    const token = createGuestReportShareToken(content, issuedAt);

    expect(token).toMatch(/^g1\./);
    expect(
      readGuestReportShareToken(
        token ?? "",
        new Date("2026-08-07T00:00:00.000Z"),
      ),
    ).toEqual({ content, status: "active" });
    expect(token).not.toContain(content.summary);
  });

  it("rejects a modified signature and expires old links", () => {
    const issuedAt = new Date("2026-01-01T00:00:00.000Z");
    const token = createGuestReportShareToken(content, issuedAt) ?? "";

    expect(readGuestReportShareToken(`${token}changed`, issuedAt)).toEqual({
      status: "invalid",
    });
    expect(
      readGuestReportShareToken(token, new Date("2026-07-01T00:00:01.000Z")),
    ).toEqual({ status: "expired" });
  });

  it("does not confuse account share tokens with guest tokens", () => {
    expect(readGuestReportShareToken("existing-random-token")).toEqual({
      status: "not_guest",
    });
  });
});
