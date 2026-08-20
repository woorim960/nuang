import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next config security headers", () => {
  it("keeps low-risk browser security headers enabled for every route", async () => {
    const headerRules = await nextConfig.headers?.();

    expect(headerRules).toEqual([
      {
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
        source: "/:path*",
      },
    ]);
  });

  it("packages the Linux sharp runtime for feed image uploads", () => {
    expect(nextConfig.outputFileTracingIncludes).toMatchObject({
      "/api/feed": [
        "node_modules/sharp/**/*",
        "node_modules/@img/sharp-linux-x64/**/*",
        "node_modules/@img/sharp-libvips-linux-x64/**/*",
      ],
    });
  });
});
