import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("search crawler routes", () => {
  it("publishes one production sitemap with only canonical URLs", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(entries).toHaveLength(17);
    expect(new Set(urls).size).toBe(entries.length);
    expect(urls.every((url) => url.startsWith("https://nuang.app/"))).toBe(
      true,
    );
    expect(urls).toContain("https://nuang.app/assessments/nu-core-quick");
    expect(urls).toContain(
      "https://nuang.app/assessments/together/balance-game",
    );
    expect(urls.some((url) => new URL(url).pathname.startsWith("/map"))).toBe(
      false,
    );
    expect(urls.some((url) => /admin|api|results|rooms/iu.test(url))).toBe(
      false,
    );
  });

  it("lets crawlers reach public assets while protecting system endpoints", () => {
    expect(robots()).toEqual({
      host: "https://nuang.app",
      rules: [
        {
          allow: ["/", "/_next/static/", "/assets/", "/icons/", "/images/"],
          disallow: ["/admin/", "/api/"],
          userAgent: "*",
        },
      ],
      sitemap: "https://nuang.app/sitemap.xml",
    });
  });

  it("publishes installable app icons including a maskable icon", () => {
    const value = manifest();

    expect(value.start_url).toBe("/home");
    expect(value.lang).toBe("ko-KR");
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512" }),
        expect.objectContaining({ purpose: "maskable" }),
      ]),
    );
  });
});
