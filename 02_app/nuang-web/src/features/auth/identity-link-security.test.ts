import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("identity link intent security", () => {
  it("stores a one-way nonce and rejects malformed callback tokens", async () => {
    vi.stubEnv("SHARE_TOKEN_PEPPER", "test-only-intent-pepper");
    const { createIdentityLinkIntentSecret, parseIdentityLinkIntentToken } =
      await import("@/features/auth/identity-link-security");
    const created = createIdentityLinkIntentSecret();

    expect(created.token).not.toContain(created.nonceHash);
    expect(parseIdentityLinkIntentToken(created.token)).toEqual({
      id: created.id,
      nonceHash: created.nonceHash,
    });
    expect(parseIdentityLinkIntentToken(`${created.token}.replay`)).toBeNull();
    expect(parseIdentityLinkIntentToken("not-a-token")).toBeNull();
  });
});
