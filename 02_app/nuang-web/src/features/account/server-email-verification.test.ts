import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readPrivateContact: vi.fn(),
  verifyCode: vi.fn(),
}));

vi.mock("@/features/account/server-private-contact", () => ({
  readPrivateContact: mocks.readPrivateContact,
}));
vi.mock("@/features/account/email-verification-security", () => ({
  createEmailVerificationSecret: vi.fn(),
  hashEmailVerificationCode: vi.fn(),
  verifyEmailVerificationCode: mocks.verifyCode,
}));

import { confirmPrivateEmailVerification } from "@/features/account/server-email-verification";

const accountId = "11111111-1111-4111-8111-111111111111";
const challengeId = "22222222-2222-4222-8222-222222222222";
const emailHash = "a".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyCode.mockReturnValue(true);
  mocks.readPrivateContact.mockResolvedValue({
    data: {
      accountId,
      emailEncrypted: "encrypted",
      emailHash,
      emailStatus: "unverified",
    },
    ok: true,
  });
});

describe("confirmPrivateEmailVerification identifier finalization", () => {
  it("atomically finalizes a unique verified email and consumes its challenge", async () => {
    const fake = createClient("verified");
    const result = await confirmPrivateEmailVerification({
      accountId,
      challengeId,
      client: fake.client,
      code: "123456",
    });

    expect(result).toMatchObject({ ok: true });
    expect(fake.rpc).toHaveBeenCalledWith(
      "finalize_verified_account_identifier",
      expect.objectContaining({
        p_account_id: accountId,
        p_kind: "email",
        p_lookup_hmac: emailHash,
        p_verification_method: "email_otp",
      }),
    );
    expect(fake.challengeUpdates).toContainEqual(
      expect.objectContaining({ status: "verified" }),
    );
  });

  it("returns a proof-required candidate only after the valid OTP is consumed", async () => {
    const fake = createClient("existing_account_candidate");
    const result = await confirmPrivateEmailVerification({
      accountId,
      challengeId,
      client: fake.client,
      code: "123456",
    });

    expect(result).toEqual({
      code: "verified_identifier_conflict",
      ok: false,
    });
    expect(fake.challengeUpdates).toContainEqual(
      expect.objectContaining({ status: "verified" }),
    );
  });

  it("does not consume the challenge when atomic finalization fails", async () => {
    const fake = createClient(null, { code: "P0001" });
    const result = await confirmPrivateEmailVerification({
      accountId,
      challengeId,
      client: fake.client,
      code: "123456",
    });

    expect(result).toEqual({ code: "verification_write_failed", ok: false });
    expect(fake.challengeUpdates).toHaveLength(0);
  });
});

function createClient(rpcData: string | null, rpcError: unknown = null) {
  const challengeUpdates: Array<Record<string, unknown>> = [];
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: rpcError });
  const challenge = {
    account_id: accountId,
    attempt_count: 0,
    code_hash: "b".repeat(64),
    email_hash: emailHash,
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    id: challengeId,
    max_attempts: 5,
    requested_at: new Date().toISOString(),
    status: "sent",
  };
  const table = {
    select: vi.fn(() => {
      const chain = {
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn().mockResolvedValue({ data: challenge, error: null }),
      };
      return chain;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      challengeUpdates.push(payload);
      const chain = { eq: vi.fn(() => chain) };
      return chain;
    }),
  };
  const schema = {
    from: vi.fn(() => table),
    rpc,
  };
  const client = {
    schema: vi.fn(() => schema),
  } as never;
  return { challengeUpdates, client, rpc };
}
