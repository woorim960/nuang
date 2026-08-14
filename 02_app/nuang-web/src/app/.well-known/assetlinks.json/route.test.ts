import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/.well-known/assetlinks.json/route";

const fingerprint = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
).join(":");

describe("Android asset links route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns 404 until the Play signing certificate exists", () => {
    vi.stubEnv("NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", "");
    expect(GET().status).toBe(404);
  });

  it("serves the immutable package and verified signing fingerprint", async () => {
    vi.stubEnv(
      "NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS",
      fingerprint,
    );
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({
        target: expect.objectContaining({
          package_name: "app.nuang.mobile",
          sha256_cert_fingerprints: [fingerprint.toUpperCase()],
        }),
      }),
    ]);
  });
});
