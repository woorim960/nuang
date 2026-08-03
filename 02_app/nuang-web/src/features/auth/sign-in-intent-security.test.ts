import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSignInIntent,
  verifySignInIntent,
} from "@/features/auth/sign-in-intent-security";

beforeEach(() => {
  vi.stubEnv("SHARE_TOKEN_PEPPER", "sign-in-intent-test-pepper");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signed OAuth sign-in intent", () => {
  it("binds provider, origin, return path and ten-minute expiry", () => {
    const now = Date.parse("2026-08-03T00:00:00.000Z");
    const created = createSignInIntent({
      initiatingOrigin: "https://nuang.app",
      now,
      provider: "google",
      returnPath: "/my/profile/edit",
    });
    const verified = verifySignInIntent({
      callbackOrigin: "https://nuang.app",
      now: now + 9 * 60_000,
      token: created.token,
    });

    expect(verified).toMatchObject({
      intent: {
        initiatingOrigin: "https://nuang.app",
        provider: "google",
        returnPath: "/my/profile/edit",
      },
      ok: true,
    });
    expect(created.token).not.toContain("/my/profile/edit");
  });

  it("rejects expiry, origin mismatch and tampering", () => {
    const now = Date.parse("2026-08-03T00:00:00.000Z");
    const created = createSignInIntent({
      initiatingOrigin: "http://localhost:3000",
      now,
      provider: "kakao",
      returnPath: "/my",
    });

    expect(
      verifySignInIntent({
        callbackOrigin: "https://nuang.app",
        now: now + 1_000,
        token: created.token,
      }),
    ).toEqual({ code: "origin_mismatch", ok: false });
    expect(
      verifySignInIntent({
        callbackOrigin: "http://localhost:3000",
        now: now + 10 * 60_000,
        token: created.token,
      }),
    ).toEqual({ code: "intent_expired", ok: false });
    expect(
      verifySignInIntent({
        callbackOrigin: "http://localhost:3000",
        now: now + 1_000,
        token: `${created.token}x`,
      }),
    ).toEqual({ code: "intent_invalid", ok: false });
  });
});
