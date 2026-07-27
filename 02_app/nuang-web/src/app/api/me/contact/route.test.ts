import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deletePrivateEmail: vi.fn(),
  deletePrivateMobilePhone: vi.fn(),
  ensureAccountForUser: vi.fn(),
  readMarketing: vi.fn(),
  readPrivateContact: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  saveMarketing: vi.fn(),
  savePrivateEmail: vi.fn(),
  savePrivateMobilePhone: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ service: true }),
}));

vi.mock("@/features/account/server-private-contact", () => ({
  deletePrivateEmail: mocks.deletePrivateEmail,
  deletePrivateMobilePhone: mocks.deletePrivateMobilePhone,
  readPrivateContact: mocks.readPrivateContact,
  readPrivateContactMarketingPreference: mocks.readMarketing,
  savePrivateContactMarketingPreference: mocks.saveMarketing,
  savePrivateEmail: mocks.savePrivateEmail,
  savePrivateMobilePhone: mocks.savePrivateMobilePhone,
  toPrivateContactPayload: (
    contact: { emailStatus: string; mobilePhoneStatus: string },
    marketingOptIn = false,
  ) => ({
    emailMasked:
      contact.emailStatus === "missing" ? null : "wo***@gmail.com",
    emailStatus: contact.emailStatus,
    hasEmail: contact.emailStatus !== "missing",
    hasMobilePhone: contact.mobilePhoneStatus !== "missing",
    marketingOptIn,
    mobilePhoneMasked:
      contact.mobilePhoneStatus === "missing" ? null : "010-****-5678",
    mobilePhoneStatus: contact.mobilePhoneStatus,
    updatedAt: "2026-07-27T00:00:00.000Z",
  }),
}));

import { GET, PATCH } from "@/app/api/me/contact/route";
import {
  privateContactConsentVersion,
  privateContactMarketingConsentVersion,
  privateEmailRegistrationVersion,
} from "@/features/account/private-contact-contract";

const contactRecord = {
  accountId: "11111111-1111-4111-8111-111111111111",
  emailEncrypted: "encrypted-email",
  emailHash: "b".repeat(64),
  emailStatus: "unverified",
  emailUpdatedAt: "2026-07-27T00:00:00.000Z",
  mobilePhoneCiphertext: "encrypted",
  mobilePhoneLookupHash: "a".repeat(64),
  mobilePhoneStatus: "unverified",
  mobilePhoneUpdatedAt: "2026-07-27T00:00:00.000Z",
};

describe("private member contact API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "auth-user" },
    });
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: contactRecord.accountId,
      ok: true,
    });
    mocks.readPrivateContact.mockResolvedValue({
      data: contactRecord,
      ok: true,
    });
    mocks.readMarketing.mockResolvedValue({ data: false, ok: true });
    mocks.savePrivateMobilePhone.mockResolvedValue({
      data: contactRecord,
      ok: true,
    });
    mocks.savePrivateEmail.mockResolvedValue({
      data: contactRecord,
      ok: true,
    });
    mocks.saveMarketing.mockResolvedValue({ data: true, ok: true });
  });

  it("returns only the masked phone and marketing preference", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contact).toEqual({
      emailMasked: "wo***@gmail.com",
      emailStatus: "unverified",
      hasEmail: true,
      hasMobilePhone: true,
      marketingOptIn: false,
      mobilePhoneMasked: "010-****-5678",
      mobilePhoneStatus: "unverified",
      updatedAt: "2026-07-27T00:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toContain("encrypted");
    expect(JSON.stringify(body)).not.toContain("woorim.prog@gmail.com");
    expect(JSON.stringify(body)).not.toContain("01012345678");
  });

  it("treats saving as the registration action and records marketing separately", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/me/contact", {
        body: JSON.stringify({
          consentVersion: privateContactConsentVersion,
          marketingOptIn: true,
          mobilePhone: "010-1234-5678",
          source: "profile",
        }),
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.savePrivateMobilePhone).toHaveBeenCalledWith(
      expect.objectContaining({
        mobilePhone: "010-1234-5678",
        source: "profile",
      }),
    );
    expect(mocks.saveMarketing).toHaveBeenCalledWith(
      expect.objectContaining({ marketingOptIn: true }),
    );
  });

  it("saves a private profile email independently from the provider login", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/me/contact", {
        body: JSON.stringify({
          consentVersion: privateEmailRegistrationVersion,
          email: "woorim.prog@gmail.com",
          source: "profile",
        }),
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.savePrivateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "woorim.prog@gmail.com",
        source: "profile",
      }),
    );
    expect(mocks.savePrivateMobilePhone).not.toHaveBeenCalled();
  });

  it("updates marketing preference without rewriting either contact", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/me/contact", {
        body: JSON.stringify({
          consentVersion: privateContactMarketingConsentVersion,
          marketingOptIn: true,
          preference: "marketing",
        }),
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.saveMarketing).toHaveBeenCalledWith(
      expect.objectContaining({ marketingOptIn: true }),
    );
    expect(mocks.savePrivateEmail).not.toHaveBeenCalled();
    expect(mocks.savePrivateMobilePhone).not.toHaveBeenCalled();
  });
});
