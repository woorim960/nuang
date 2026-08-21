import { createHmac } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGuestReportShareToken,
  readGuestReportShareToken,
} from "@/features/share/server-guest-report-share-token";
import {
  buildCoreReportShareContent,
  buildTopicReportShareContent,
  type ReportShareContent,
} from "@/features/share/report-share-contract";

vi.mock("server-only", () => ({}));

const content = buildTopicReportShareContent({
  assessmentSlug: "comfort-style",
  assessmentTitle: "위로받을 때 필요한 것",
  highlights: ["방법 함께 찾기", "내 속도와 선택"],
  resultName: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
  scoresByScaleId: {
    emotional_support: 45,
    pacing_support: 70,
    practical_support: 65,
  },
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
    expect(token?.length).toBeLessThan(1_500);
  });

  it("does not embed expanded report sections in the URL token", () => {
    const issuedAt = new Date("2026-08-06T00:00:00.000Z");
    const contentWithSections = {
      ...content,
      sections: [
        {
          description: "공개 가능한 상세 설명입니다.",
          id: "detail-1",
          items: [{ text: "검수된 상세 문장입니다." }],
          title: "상세 결과",
        },
      ],
    };
    const token = createGuestReportShareToken(contentWithSections, issuedAt);
    const result = readGuestReportShareToken(token ?? "", issuedAt);

    expect(result.status).toBe("active");
    if (result.status !== "active") return;
    expect(result.content.sections).toBeUndefined();
    expect(result.content.source).toEqual(content.source);
  });

  it("refuses new core tokens and closes an already-issued g1 core token", () => {
    const issuedAt = new Date("2026-08-06T00:00:00.000Z");
    const coreContent = buildCoreReportShareContent({
      code: "ENAKQ",
      highlights: ["혼자 정리한 뒤 대화를 시작해요"],
      profileName: "차분한 탐색가",
      resultLabel: "나의 뉴앙 코드 결과",
      summary: "생각을 충분히 정리한 뒤 움직이는 편이에요.",
    });

    expect(createGuestReportShareToken(coreContent, issuedAt)).toBeNull();

    const legacyToken = createPreviouslyIssuedToken(coreContent, issuedAt);
    expect(readGuestReportShareToken(legacyToken, issuedAt)).toEqual({
      status: "closed",
    });
  });

  it("removes embedded legacy code from new and already-issued topic tokens", () => {
    const issuedAt = new Date("2026-08-06T00:00:00.000Z");
    const topicWithEmbeddedCode: ReportShareContent = {
      ...content,
      code: "ENAKQ",
      source: {
        assessmentSlug: "comfort-style",
        code: "ENAKQ",
        kind: "topic",
        scoresByScaleId: {
          emotional_support: 45,
          pacing_support: 70,
          practical_support: 65,
        },
      },
    };

    const newToken = createGuestReportShareToken(
      topicWithEmbeddedCode,
      issuedAt,
    );
    const oldToken = createPreviouslyIssuedToken(
      topicWithEmbeddedCode,
      issuedAt,
    );

    for (const token of [newToken ?? "", oldToken]) {
      const result = readGuestReportShareToken(token, issuedAt);
      expect(result.status).toBe("active");
      if (result.status !== "active") continue;
      expect(result.content.code).toBeUndefined();
      expect(result.content.source).not.toHaveProperty("code");
    }
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

function createPreviouslyIssuedToken(
  tokenContent: ReportShareContent,
  issuedAt: Date,
) {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1_000);
  const encodedPayload = deflateRawSync(
    Buffer.from(
      JSON.stringify({
        content: tokenContent,
        expiresAt: issuedAtSeconds + 180 * 24 * 60 * 60,
        issuedAt: issuedAtSeconds,
        version: 1,
      }),
      "utf8",
    ),
  ).toString("base64url");
  const signature = createHmac("sha256", "guest-share-test-pepper")
    .update(`nuang:guest-report-share:v1:${encodedPayload}`)
    .digest("base64url");
  return `g1.${encodedPayload}.${signature}`;
}
