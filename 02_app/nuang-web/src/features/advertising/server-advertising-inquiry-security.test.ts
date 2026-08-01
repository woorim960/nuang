import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdvertisingDuplicateHash,
  createAdvertisingEmailBlindIndex,
  createAdvertisingPublicReference,
  maskAdvertisingEmail,
  protectAdvertisingInquiryValue,
  revealAdvertisingInquiryValue,
} from "@/features/advertising/server-advertising-inquiry-security";

describe("advertising inquiry field protection", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 17).toString("base64"));
    vi.stubEnv("AD_CONTACT_HASH_PEPPER", "independent-advertising-pepper");
  });

  it("encrypts with inquiry and field bound authenticated data", () => {
    const inquiryId = "10000000-0000-4000-8000-000000000001";
    const ciphertext = protectAdvertisingInquiryValue({
      field: "contact_email",
      inquiryId,
      value: "business@example.com",
    });
    expect(ciphertext).not.toContain("business@example.com");
    expect(
      revealAdvertisingInquiryValue({
        ciphertext,
        field: "contact_email",
        inquiryId,
      }),
    ).toBe("business@example.com");
    expect(() =>
      revealAdvertisingInquiryValue({
        ciphertext,
        field: "contact_name",
        inquiryId,
      }),
    ).toThrow();
  });

  it("creates deterministic keyed blind indexes without exposing the email", () => {
    const first = createAdvertisingEmailBlindIndex("Business@Example.com");
    const second = createAdvertisingEmailBlindIndex("business@example.com");
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain("business");
    expect(maskAdvertisingEmail("business@example.com")).toBe(
      "bu***@example.com",
    );
  });

  it("uses content and normalized email in the duplicate hash", () => {
    const input = {
      companyName: "브랜드 A",
      details: "협업을 제안합니다.",
      promotedOffering: "라이프스타일 서비스",
      workEmail: "business@example.com",
    };
    expect(createAdvertisingDuplicateHash(input)).toBe(
      createAdvertisingDuplicateHash({
        ...input,
        companyName: "  브랜드 A  ",
      }),
    );
    expect(
      createAdvertisingDuplicateHash({ ...input, details: "다른 제안입니다." }),
    ).not.toBe(createAdvertisingDuplicateHash(input));
  });

  it("creates non-sequential public references", () => {
    const reference = createAdvertisingPublicReference(
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(reference).toMatch(/^AD-20260801-[A-Z2-9]{6}$/);
  });
});
