import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/sign-in-intents/route";

beforeEach(() => {
  vi.stubEnv("SHARE_TOKEN_PEPPER", "sign-in-route-test-pepper");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/sign-in-intents", () => {
  it.each([
    ["https://nuang.app", "google", true],
    ["https://nuang.app", "kakao", true],
    ["http://localhost:3000", "google", false],
    ["http://localhost:3000", "kakao", false],
  ] as const)(
    "issues an exact %s %s callback with environment-safe cookie",
    async (origin, provider, secure) => {
      const response = await POST(
        new Request(`${origin}/api/auth/sign-in-intents`, {
          body: JSON.stringify({ provider, returnPath: "/my/profile/edit" }),
          headers: {
            "content-type": "application/json",
            origin,
            "sec-fetch-site": "same-origin",
          },
          method: "POST",
        }),
      );
      const payload = await response.json();
      const setCookie = response.headers.get("set-cookie") ?? "";

      expect(response.status).toBe(200);
      expect(payload.intent.callbackUrl).toBe(`${origin}/auth/callback`);
      expect(payload.intent.callbackUrl).not.toContain("?");
      expect(JSON.stringify(payload)).not.toContain("nonce");
      expect(setCookie).toMatch(/^nuang-sign-in-intent=/i);
      expect(setCookie).toMatch(/Path=\/auth\/callback/i);
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=lax/i);
      expect(setCookie.includes("Secure")).toBe(secure);
    },
  );

  it("rejects Apple until the server-side provider rollout is complete", async () => {
    const response = await POST(
      new Request("https://nuang.app/api/auth/sign-in-intents", {
        body: JSON.stringify({ provider: "apple", returnPath: "/my" }),
        headers: {
          "content-type": "application/json",
          origin: "https://nuang.app",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://preview.vercel.app",
  ])("fails closed for an unapproved origin: %s", async (origin) => {
    const response = await POST(
      new Request(`${origin}/api/auth/sign-in-intents`, {
        body: JSON.stringify({ provider: "google", returnPath: "/my" }),
        headers: { origin, "sec-fetch-site": "same-origin" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a cross-origin browser request", async () => {
    const response = await POST(
      new Request("https://nuang.app/api/auth/sign-in-intents", {
        body: JSON.stringify({ provider: "google", returnPath: "/my" }),
        headers: {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
  });
});
