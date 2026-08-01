import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readAdminReviewRecipients,
  sendAdminReviewNotification,
} from "@/features/admin/server-admin-review-notification";

describe("admin review notifications", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a dedicated recipient list and removes duplicates", () => {
    vi.stubEnv(
      "ADMIN_REVIEW_NOTIFICATION_EMAILS",
      "woorimprog@gmail.com, second@example.com, WOORIMPROG@gmail.com, invalid",
    );
    vi.stubEnv("ADMIN_BOOTSTRAP_EMAILS", "fallback@example.com");

    expect(readAdminReviewRecipients()).toEqual([
      "woorimprog@gmail.com",
      "second@example.com",
    ]);
  });

  it("falls back to administrator account emails", () => {
    vi.stubEnv("ADMIN_REVIEW_NOTIFICATION_EMAILS", "");
    vi.stubEnv(
      "ADMIN_BOOTSTRAP_EMAILS",
      "woorimprog@gmail.com, second@example.com",
    );

    expect(readAdminReviewRecipients()).toEqual([
      "woorimprog@gmail.com",
      "second@example.com",
    ]);
  });

  it("sends a privacy-minimized operations email with an admin deep link", async () => {
    vi.stubEnv("ADMIN_REVIEW_NOTIFICATION_EMAILS", "woorimprog@gmail.com");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("ADMIN_NOTIFICATION_FROM", "NUANG <ops@nuang.test>");
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://nuang.example");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "mail-1" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendAdminReviewNotification({
      id: "feedback-1",
      kind: "product_feedback",
      occurredAt: "2026-07-28T01:00:00.000Z",
    });

    expect(result).toEqual({ messageId: "mail-1", ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "idempotency-key":
            "nuang-admin-review-product_feedback-feedback-1",
        }),
        method: "POST",
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      html: string;
      text: string;
      to: string[];
    };
    expect(body.to).toEqual(["woorimprog@gmail.com"]);
    expect(body.html).toContain(
      "https://nuang.example/admin/feedback",
    );
    expect(body.text).not.toContain("사용자가 작성한 원문");
  });

  it("does not throw when email delivery is not configured", async () => {
    vi.stubEnv("ADMIN_REVIEW_NOTIFICATION_EMAILS", "");
    vi.stubEnv("ADMIN_BOOTSTRAP_EMAILS", "");
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(
      sendAdminReviewNotification({
        id: "report-1",
        kind: "content_report",
      }),
    ).resolves.toEqual({
      code: "notification_not_configured",
      ok: false,
    });
  });
});
