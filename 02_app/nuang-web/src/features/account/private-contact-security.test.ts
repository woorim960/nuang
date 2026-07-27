import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmailLookupHash,
  createMobilePhoneLookupHash,
  maskKoreanMobilePhone,
  maskPrivateEmail,
  normalizeKoreanMobilePhone,
  normalizePrivateEmail,
  protectPrivateEmail,
  protectPrivateMobilePhone,
  revealPrivateEmail,
  revealPrivateMobilePhone,
} from "@/features/account/private-contact-security";

describe("private account contact security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes and masks Korean mobile phone numbers", () => {
    expect(normalizeKoreanMobilePhone("010-1234-5678")).toBe("01012345678");
    expect(maskKoreanMobilePhone("01012345678")).toBe("010-****-5678");
    expect(() => normalizeKoreanMobilePhone("02-123-4567")).toThrow();
  });

  it("encrypts with account-bound additional data and creates stable hashes", () => {
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64"));
    vi.stubEnv("SHARE_TOKEN_PEPPER", "private-contact-test-pepper");

    const protectedPhone = protectPrivateMobilePhone({
      accountId: "11111111-1111-4111-8111-111111111111",
      value: "010-1234-5678",
    });

    expect(protectedPhone.ciphertext).not.toContain("01012345678");
    expect(protectedPhone.lookupHash).toHaveLength(64);
    expect(protectedPhone.lookupHash).toBe(
      createMobilePhoneLookupHash("01012345678"),
    );
    expect(
      revealPrivateMobilePhone({
        accountId: "11111111-1111-4111-8111-111111111111",
        ciphertext: protectedPhone.ciphertext,
      }),
    ).toBe("01012345678");
    expect(() =>
      revealPrivateMobilePhone({
        accountId: "22222222-2222-4222-8222-222222222222",
        ciphertext: protectedPhone.ciphertext,
      }),
    ).toThrow();
  });

  it("normalizes, masks, and account-binds a private email", () => {
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("SHARE_TOKEN_PEPPER", "private-email-test-pepper");

    expect(normalizePrivateEmail("  Woorim.Prog@GMAIL.com ")).toBe(
      "woorim.prog@gmail.com",
    );
    expect(maskPrivateEmail("woorim.prog@gmail.com")).toBe(
      "wo***@gmail.com",
    );

    const protectedEmail = protectPrivateEmail({
      accountId: "11111111-1111-4111-8111-111111111111",
      value: "Woorim.Prog@GMAIL.com",
    });

    expect(protectedEmail.ciphertext).not.toContain("woorim.prog@gmail.com");
    expect(protectedEmail.lookupHash).toBe(
      createEmailLookupHash("woorim.prog@gmail.com"),
    );
    expect(
      revealPrivateEmail({
        accountId: "11111111-1111-4111-8111-111111111111",
        ciphertext: protectedEmail.ciphertext,
      }),
    ).toBe("woorim.prog@gmail.com");
    expect(() =>
      revealPrivateEmail({
        accountId: "22222222-2222-4222-8222-222222222222",
        ciphertext: protectedEmail.ciphertext,
      }),
    ).toThrow();
  });
});
