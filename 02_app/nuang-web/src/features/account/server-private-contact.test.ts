import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  savePrivateEmail,
  savePrivateMobilePhone,
} from "@/features/account/server-private-contact";

const accountId = "11111111-1111-4111-8111-111111111111";
const registeredAt = "2026-07-27T01:00:00.000Z";

describe("private contact updates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the original email registration time when changing email", async () => {
    const fixture = createContactClient({
      email_encrypted: "existing-email",
      email_hash: "a".repeat(64),
      email_registered_at: registeredAt,
      email_status: "unverified",
      email_updated_at: registeredAt,
    });
    stubContactSecurity();

    const result = await savePrivateEmail({
      accountId,
      client: fixture.client,
      email: "changed@example.com",
      source: "profile",
    });

    expect(result.ok).toBe(true);
    expect(fixture.upsertPayload).toMatchObject({
      email_registered_at: registeredAt,
      email_status: "unverified",
    });
  });

  it("preserves the original phone registration time when changing phone", async () => {
    const fixture = createContactClient({
      mobile_phone_ciphertext: "existing-phone",
      mobile_phone_lookup_hash: "b".repeat(64),
      mobile_phone_registered_at: registeredAt,
      mobile_phone_status: "unverified",
      mobile_phone_updated_at: registeredAt,
    });
    stubContactSecurity();

    const result = await savePrivateMobilePhone({
      accountId,
      client: fixture.client,
      mobilePhone: "010-8765-4321",
      source: "profile",
    });

    expect(result.ok).toBe(true);
    expect(fixture.upsertPayload).toMatchObject({
      mobile_phone_registered_at: registeredAt,
      mobile_phone_status: "unverified",
    });
  });
});

function createContactClient(overrides: Record<string, unknown>) {
  const baseRow = {
    account_id: accountId,
    email_encrypted: null,
    email_hash: null,
    email_registered_at: null,
    email_status: "missing",
    email_updated_at: null,
    mobile_phone_ciphertext: null,
    mobile_phone_lookup_hash: null,
    mobile_phone_registered_at: null,
    mobile_phone_status: "missing",
    mobile_phone_updated_at: null,
    ...overrides,
  };
  let upsertPayload: Record<string, unknown> = {};
  const from = vi
    .fn()
    .mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: baseRow, error: null }),
        }),
      }),
    })
    .mockReturnValueOnce({
      upsert: (payload: Record<string, unknown>) => {
        upsertPayload = payload;
        return {
          select: () => ({
            single: async () => ({
              data: { ...baseRow, ...payload },
              error: null,
            }),
          }),
        };
      },
    });
  const client = {
    schema: () => ({ from }),
  } as unknown as SupabaseClient;

  return {
    client,
    get upsertPayload() {
      return upsertPayload;
    },
  };
}

function stubContactSecurity() {
  vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 5).toString("base64"));
  vi.stubEnv("SHARE_TOKEN_PEPPER", "private-contact-update-test");
}
