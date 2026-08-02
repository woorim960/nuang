import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  context: vi.fn(),
}));

vi.mock("@/features/account/server-contact-context", () => ({
  requirePrivateContactContext: mocks.context,
}));
vi.mock("@/features/account/server-email-verification", () => ({
  confirmPrivateEmailVerification: mocks.confirm,
}));

import { POST } from "@/app/api/me/contact/email-verification/confirm/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({
    accountId: "11111111-1111-4111-8111-111111111111",
    client: {},
    ok: true,
  });
});

describe("email verification confirm route", () => {
  it("reveals a previous-record candidate only after a valid OTP proof", async () => {
    mocks.confirm.mockResolvedValue({
      code: "verified_identifier_conflict",
      ok: false,
    });
    const response = await POST(
      new Request(
        "https://nuang.app/api/me/contact/email-verification/confirm",
        {
          body: JSON.stringify({
            challengeId: "22222222-2222-4222-8222-222222222222",
            code: "123456",
          }),
          headers: {
            "content-type": "application/json",
            origin: "https://nuang.app",
          },
          method: "POST",
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe("verified_identifier_conflict");
    expect(payload.message).toContain("같은 이메일로 사용한 기록");
  });

  it("does not disclose any candidate when the OTP contract is invalid", async () => {
    const response = await POST(
      new Request(
        "https://nuang.app/api/me/contact/email-verification/confirm",
        {
          body: JSON.stringify({ code: "123" }),
          headers: { origin: "https://nuang.app" },
          method: "POST",
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.message).not.toContain("기록");
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
