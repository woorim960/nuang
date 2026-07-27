import { describe, expect, it } from "vitest";
import {
  extractExternalLinks,
  hostnameMatchesDomain,
  normalizeExternalUrl,
} from "./link-safety";
import { trustedLinkDomainSeeds } from "./trusted-link-domains";

describe("feed external link safety", () => {
  it("ships at least 200 unique reviewed platform domains", () => {
    const domains = trustedLinkDomainSeeds.map((item) => item.domain);

    expect(domains.length).toBeGreaterThanOrEqual(200);
    expect(new Set(domains).size).toBe(domains.length);
    expect(domains).toEqual(
      expect.arrayContaining([
        "instagram.com",
        "youtube.com",
        "naver.com",
        "kakao.com",
        "coupang.com",
        "daangn.com",
      ]),
    );
  });

  it("never treats a lookalike hostname as a trusted subdomain", () => {
    expect(hostnameMatchesDomain("instagram.com.evil.example", "instagram.com"))
      .toBe(false);
    expect(hostnameMatchesDomain("help.instagram.com", "instagram.com")).toBe(
      true,
    );
  });

  it("rejects local/private targets and strips URL fragments", () => {
    expect(normalizeExternalUrl("http://127.0.0.1/admin")).toBeNull();
    expect(normalizeExternalUrl("http://192.168.0.2/private")).toBeNull();
    expect(normalizeExternalUrl("https://8.8.8.8/path")).toBeNull();
    expect(normalizeExternalUrl("https://example.com/page#secret")).toEqual(
      expect.objectContaining({
        hostname: "example.com",
        normalizedUrl: "https://example.com/page",
      }),
    );
  });

  it("classifies bundled domains as trusted and unknown domains as pending", () => {
    const links = extractExternalLinks(
      "영상 https://youtu.be/demo 새 링크 https://new.example/path",
    );

    expect(links.map((link) => [link.hostname, link.status])).toEqual([
      ["youtu.be", "trusted"],
      ["new.example", "pending"],
    ]);
  });
});
