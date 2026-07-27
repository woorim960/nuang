import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "@/app/api/research/gate-c/reward-entries/route";
import { gateCRewardEntryConsentVersion } from "@/features/research/gate-c/gate-c-reward-entry-contract";

const routeMocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
  readPrivateContact: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  serviceClient: null as unknown,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: routeMocks.requireAuthenticatedUser,
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: routeMocks.ensureAccountForUser,
}));

vi.mock("@/features/account/server-private-contact", () => ({
  readPrivateContact: routeMocks.readPrivateContact,
  toPrivateContactPayload: () => ({
    hasMobilePhone: true,
    marketingOptIn: false,
    mobilePhoneMasked: "010-****-5678",
    mobilePhoneStatus: "unverified",
    updatedAt: "2026-07-27T00:00:00.000Z",
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => routeMocks.serviceClient),
}));

describe("Gate C reward entry API", () => {
  beforeEach(() => {
    vi.stubEnv("GATE_C_REVIEW_EVENT_ENTRY_ENABLED", "true");
    vi.stubEnv("SHARE_TOKEN_PEPPER", "test-reward-entry-pepper");
    routeMocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "auth-user" },
    });
    routeMocks.ensureAccountForUser.mockResolvedValue({
      accountId: "11111111-1111-4111-8111-111111111111",
      ok: true,
    });
    routeMocks.readPrivateContact.mockResolvedValue({
      data: {
        accountId: "11111111-1111-4111-8111-111111111111",
        mobilePhoneCiphertext: "v1.encrypted",
        mobilePhoneLookupHash: "a".repeat(64),
        mobilePhoneStatus: "unverified",
        mobilePhoneUpdatedAt: "2026-07-27T00:00:00.000Z",
      },
      ok: true,
    });
  });

  afterEach(() => {
    routeMocks.serviceClient = null;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("stores an account-linked entry without duplicating the encrypted phone", async () => {
    const captured: { insert: null | Record<string, unknown> } = {
      insert: null,
    };
    routeMocks.serviceClient = createRewardClient(captured);

    const response = await POST(
      jsonRequest("http://localhost/api/research/gate-c/reward-entries", {
        consentAccepted: true,
        consentVersion: gateCRewardEntryConsentVersion,
        participantCode: "GC-1234ABCD",
        publicReceiptId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        website: "",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      announcementLabel: "2026년 10월 1일",
      entryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ok: true,
    });
    expect(captured.insert).toMatchObject({
      account_id: "11111111-1111-4111-8111-111111111111",
      campaign_id: "gate-c-review-2026-10-01",
      contact_ciphertext: null,
      contact_lookup_hash: "a".repeat(64),
      contact_method: "mobile_phone",
      retention_until: "2026-10-31T15:00:00.000Z",
      withdrawal_secret_hash: null,
    });
    expect(captured.insert).not.toHaveProperty("contact");
    expect(captured.insert).not.toHaveProperty("participant_code");
    expect(captured.insert).not.toHaveProperty("public_receipt_id");
    expect(String(captured.insert?.receipt_lookup_hash)).toHaveLength(64);
  });

  it("rejects entry before a matching participation is complete", async () => {
    routeMocks.serviceClient = createRewardClient(
      { insert: null },
      { sessionStatus: "started" },
    );

    const response = await POST(
      jsonRequest("http://localhost/api/research/gate-c/reward-entries", {
        consentAccepted: true,
        consentVersion: gateCRewardEntryConsentVersion,
        participantCode: "GC-1234ABCD",
        publicReceiptId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        website: "",
      }),
    );

    expect(response.status).toBe(422);
  });

  it("withdraws only the authenticated member's active entry", async () => {
    routeMocks.serviceClient = createRewardClient(
      { insert: null },
      { withdrawnIds: ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"] },
    );

    const response = await DELETE(
      new Request("http://localhost/api/research/gate-c/reward-entries", {
        headers: { "sec-fetch-site": "same-origin" },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

function createRewardClient(
  captured: { insert: null | Record<string, unknown> },
  {
    sessionStatus = "completed",
    withdrawnIds = [],
  }: { sessionStatus?: string; withdrawnIds?: string[] } = {},
) {
  const sessionBuilder = {
    eq: () => sessionBuilder,
    maybeSingle: async () => ({
      data: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        status: sessionStatus,
      },
      error: null,
    }),
  };
  const existingBuilder = {
    eq: () => existingBuilder,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const insertBuilder = {
    select: () => insertBuilder,
    single: async () => ({
      data: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      error: null,
    }),
  };
  const updateBuilder = {
    eq: () => updateBuilder,
    in: () => updateBuilder,
    select: async () => ({
      data: withdrawnIds.map((id) => ({ id })),
      error: null,
    }),
  };

  return {
    from: (table: string) => {
      if (table === "research_gate_c_session") {
        return { select: () => sessionBuilder };
      }
      return {
        insert: (row: Record<string, unknown>) => {
          captured.insert = row;
          return insertBuilder;
        },
        select: () => existingBuilder,
        update: () => updateBuilder,
      };
    },
  };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    },
    method: "POST",
  });
}
