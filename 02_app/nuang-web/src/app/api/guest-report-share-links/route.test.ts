import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/guest-report-share-links/route";
import { buildLabReportShareContent } from "@/features/share/report-share-contract";

vi.mock("server-only", () => ({}));

const content = buildLabReportShareContent({
  assessmentTitle: "대화 온도",
  highlights: ["천천히 풀어가요"],
  resultName: "잔잔한 대화",
  summary: "말을 고르며 차분하게 대화를 이어가는 편이에요.",
});

describe("POST /api/guest-report-share-links", () => {
  beforeEach(() => {
    vi.stubEnv("SHARE_TOKEN_PEPPER", "guest-share-route-test-pepper");
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://nuang.app");
  });

  it("creates a public link without authentication", async () => {
    const response = await POST(
      new Request("http://localhost/api/guest-report-share-links", {
        body: JSON.stringify({ content }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      expiresInDays: 180,
      ok: true,
      persistent: false,
    });
    expect(payload.url).toMatch(/^https:\/\/nuang\.app\/share\/g1\./);
  });

  it("rejects private or oversized fields", async () => {
    const response = await POST(
      new Request("http://localhost/api/guest-report-share-links", {
        body: JSON.stringify({
          content: {
            ...content,
            answers: { secret: "never share" },
            summary: "x".repeat(501),
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "validation_error",
    });
  });

  it("rejects cross-site browser requests", async () => {
    const response = await POST(
      new Request("https://nuang.app/api/guest-report-share-links", {
        body: JSON.stringify({ content }),
        headers: {
          "content-type": "application/json",
          origin: "https://example.com",
          "sec-fetch-site": "cross-site",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "invalid_request_origin",
      ok: false,
    });
  });
});
