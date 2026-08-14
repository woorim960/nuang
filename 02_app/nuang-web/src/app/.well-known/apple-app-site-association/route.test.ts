import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/.well-known/apple-app-site-association/route";

describe("Apple app-site association route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns 404 until the Apple Team ID is verified", async () => {
    vi.stubEnv("NUANG_APPLE_APP_ID", "");
    const response = GET();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("serves a no-redirect JSON association document", async () => {
    vi.stubEnv("NUANG_APPLE_APP_ID", "ABCDE12345.app.nuang.mobile");
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(await response.json()).toMatchObject({
      applinks: {
        details: [{ appIDs: ["ABCDE12345.app.nuang.mobile"] }],
      },
    });
  });
});
