import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGateCRewardReceiptLookupHash,
  normalizeGateCRewardContact,
  protectGateCRewardContact,
  revealGateCRewardContact,
} from "@/features/research/gate-c/gate-c-reward-contact-security";

describe("Gate C reward contact security", () => {
  beforeEach(() => {
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("SHARE_TOKEN_PEPPER", "test-reward-entry-pepper");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes supported contact methods", () => {
    expect(normalizeGateCRewardContact("mobile_phone", "010-1234-5678")).toBe(
      "01012345678",
    );
    expect(normalizeGateCRewardContact("email", " USER@Example.COM ")).toBe(
      "user@example.com",
    );
  });

  it("encrypts contact data and binds decryption to campaign and method", () => {
    const protectedContact = protectGateCRewardContact({
      campaignId: "gate-c-2026-08",
      method: "mobile_phone",
      value: "010-1234-5678",
    });

    expect(protectedContact.ciphertext).not.toContain("01012345678");
    expect(
      revealGateCRewardContact(
        { campaignId: "gate-c-2026-08", method: "mobile_phone" },
        protectedContact.ciphertext,
      ),
    ).toBe("01012345678");
    expect(() =>
      revealGateCRewardContact(
        { campaignId: "another-campaign", method: "mobile_phone" },
        protectedContact.ciphertext,
      ),
    ).toThrow();
  });

  it("creates stable campaign-scoped lookup hashes without storing receipt ids", () => {
    const first = createGateCRewardReceiptLookupHash(
      "gate-c-2026-08",
      "11111111-1111-4111-8111-111111111111",
    );
    const second = createGateCRewardReceiptLookupHash(
      "gate-c-2026-08",
      "11111111-1111-4111-8111-111111111111",
    );

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).not.toContain("11111111");
  });
});
