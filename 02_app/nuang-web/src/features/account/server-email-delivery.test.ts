import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmailVerificationCode } from "@/features/account/server-email-delivery";

describe("email verification delivery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails closed when delivery credentials are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_VERIFICATION_FROM", "");

    await expect(
      sendEmailVerificationCode({
        challengeId: "33333333-3333-4333-8333-333333333333",
        code: "123456",
        email: "member@example.com",
      }),
    ).resolves.toEqual({
      code: "email_delivery_not_configured",
      ok: false,
    });
  });

  it("sends the code through Resend with an idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv(
      "EMAIL_VERIFICATION_FROM",
      "NUANG <verify@notice.example.com>",
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "email-message-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailVerificationCode({
      challengeId: "33333333-3333-4333-8333-333333333333",
      code: "123456",
      email: "member@example.com",
    });

    expect(result).toEqual({ messageId: "email-message-1", ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "idempotency-key":
            "nuang-email-verification-33333333-3333-4333-8333-333333333333",
        }),
        method: "POST",
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain("member@example.com");
    expect(String(request.body)).toContain("123456");
  });
});
