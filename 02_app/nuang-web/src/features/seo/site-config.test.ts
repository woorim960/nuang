import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSearchEngineVerification,
  createPrivatePageMetadata,
  createPublicPageMetadata,
  NUANG_DEFAULT_SOCIAL_IMAGE,
  toAbsoluteNuangUrl,
} from "@/features/seo/site-config";

describe("NUANG SEO metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds one canonical, indexable metadata contract for a public page", () => {
    const metadata = createPublicPageMetadata({
      description: "페이지 내용을 정확하게 설명하는 문장",
      path: "/map/ENAKQ?ignored=true",
      title: "선도자 ENAKQ 성향 특징",
    });

    expect(metadata.alternates).toEqual({
      canonical: "/map/ENAKQ",
    });
    expect(metadata.title).toEqual({
      absolute: "선도자 ENAKQ 성향 특징 | 뉴앙",
    });
    expect(metadata.robots).toMatchObject({ follow: true, index: true });
    expect(metadata.openGraph).toMatchObject({
      images: [{ height: 630, url: NUANG_DEFAULT_SOCIAL_IMAGE, width: 1200 }],
      locale: "ko_KR",
      siteName: "뉴앙",
      url: "/map/ENAKQ",
    });
  });

  it("keeps account and result pages out of search snippets", () => {
    const metadata = createPrivatePageMetadata({ title: "검사 결과" });

    expect(metadata.title).toEqual({ absolute: "검사 결과 | 뉴앙" });
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
      googleBot: {
        noarchive: true,
        noimageindex: true,
        nosnippet: true,
      },
    });
  });

  it("emits ownership tags only when the operator provides tokens", () => {
    expect(buildSearchEngineVerification()).toBeUndefined();

    vi.stubEnv("GOOGLE_SITE_VERIFICATION", " google-token ");
    vi.stubEnv("NAVER_SITE_VERIFICATION", " naver-token ");

    expect(buildSearchEngineVerification()).toEqual({
      google: "google-token",
      other: { "naver-site-verification": ["naver-token"] },
    });
  });

  it("keeps every canonical URL on the production origin", () => {
    expect(toAbsoluteNuangUrl("/map/ENAKQ")).toBe(
      "https://nuang.app/map/ENAKQ",
    );
  });
});
