import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("ads.txt", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when the official publisher id is missing", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "");
    const response = GET();
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).not.toContain("pub-0000000000000000");
  });

  it("publishes only a valid AdSense publisher id", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "ca-pub-1234567890123456");
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });
});
