import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmailVerificationSecret,
  hashEmailVerificationCode,
  verifyEmailVerificationCode,
} from "@/features/account/email-verification-security";

describe("private email verification security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a six digit code and stores only a stable HMAC", () => {
    vi.stubEnv("SHARE_TOKEN_PEPPER", "email-verification-test-pepper");
    const secret = createEmailVerificationSecret();
    const input = {
      accountId: "11111111-1111-4111-8111-111111111111",
      challengeId: secret.challengeId,
      code: secret.code,
      emailHash: "a".repeat(64),
    };
    const hash = hashEmailVerificationCode(input);

    expect(secret.code).toMatch(/^\d{6}$/);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(secret.code);
    expect(
      verifyEmailVerificationCode({ ...input, expectedHash: hash }),
    ).toBe(true);
    expect(
      verifyEmailVerificationCode({
        ...input,
        code: secret.code === "000000" ? "000001" : "000000",
        expectedHash: hash,
      }),
    ).toBe(false);
  });

  it("binds a code to its account, challenge, and email", () => {
    vi.stubEnv("SHARE_TOKEN_PEPPER", "email-verification-test-pepper");
    const base = {
      accountId: "11111111-1111-4111-8111-111111111111",
      challengeId: "33333333-3333-4333-8333-333333333333",
      code: "123456",
      emailHash: "b".repeat(64),
    };
    const expectedHash = hashEmailVerificationCode(base);

    expect(
      verifyEmailVerificationCode({
        ...base,
        accountId: "22222222-2222-4222-8222-222222222222",
        expectedHash,
      }),
    ).toBe(false);
    expect(
      verifyEmailVerificationCode({
        ...base,
        emailHash: "c".repeat(64),
        expectedHash,
      }),
    ).toBe(false);
  });
});
