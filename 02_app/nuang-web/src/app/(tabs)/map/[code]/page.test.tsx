import { describe, expect, it } from "vitest";
import { generateMetadata } from "@/app/(tabs)/map/[code]/page";

describe("TraitMapDetailPage metadata", () => {
  it("keeps a preserved candidate-code route noindex and nofollow", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ code: "enakq" }),
    });

    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
      googleBot: expect.objectContaining({ follow: false, index: false }),
    });
    expect(metadata.title).toEqual({
      absolute: "선도자 ENAKQ 이전 베타 성향지도 | 뉴앙",
    });
  });

  it("also fails closed for an unknown code", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ code: "unknown" }),
    });

    expect(metadata.robots).toMatchObject({ follow: false, index: false });
  });
});
