import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/consent-intent/route";

describe("POST /api/auth/consent-intent", () => {
  it("stores a short-lived http-only consent intent", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/consent-intent", {
        body: JSON.stringify({
          analytics: false,
          is14OrOlder: true,
          marketing: false,
          privacy: true,
          terms: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "nuang-consent-intent=",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("rejects consent without the age declaration", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/consent-intent", {
        body: JSON.stringify({
          analytics: false,
          marketing: false,
          privacy: true,
          terms: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
  });

  it("rejects cross-site attempts without setting the intent cookie", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/consent-intent", {
        body: JSON.stringify({
          analytics: true,
          is14OrOlder: true,
          marketing: true,
          privacy: true,
          terms: true,
        }),
        headers: {
          "content-type": "application/json",
          origin: "https://malicious.example",
          "sec-fetch-site": "cross-site",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
