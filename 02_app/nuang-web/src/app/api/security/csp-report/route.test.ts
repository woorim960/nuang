import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("CSP report-only endpoint", () => {
  it("accepts a small JSON report without persisting product data", async () => {
    const response = await POST(
      new Request("https://nuang.example/api/security/csp-report", {
        body: JSON.stringify({ "csp-report": { "violated-directive": "script-src" } }),
        method: "POST",
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects malformed reports", async () => {
    const response = await POST(
      new Request("https://nuang.example/api/security/csp-report", {
        body: "not-json",
        method: "POST",
      }),
    );
    expect(response.status).toBe(400);
  });
});
