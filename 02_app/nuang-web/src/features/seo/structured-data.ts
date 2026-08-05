import {
  NUANG_DEFAULT_DESCRIPTION,
  NUANG_SITE_NAME,
  NUANG_SITE_NAME_LATIN,
  NUANG_SITE_ORIGIN,
  toAbsoluteNuangUrl,
} from "@/features/seo/site-config";

export function createNuangHomeStructuredData() {
  const organizationId = `${NUANG_SITE_ORIGIN}/#organization`;
  const websiteId = `${NUANG_SITE_ORIGIN}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": organizationId,
        "@type": "Organization",
        email: "woorimprog@gmail.com",
        legalName: "딱좋은라이프",
        logo: {
          "@type": "ImageObject",
          height: 512,
          url: toAbsoluteNuangUrl("/icons/nuang-icon-512.png"),
          width: 512,
        },
        name: NUANG_SITE_NAME,
        url: `${NUANG_SITE_ORIGIN}/`,
      },
      {
        "@id": websiteId,
        "@type": "WebSite",
        alternateName: [NUANG_SITE_NAME_LATIN, "뉴앙 성향 놀이터"],
        description: NUANG_DEFAULT_DESCRIPTION,
        inLanguage: "ko-KR",
        name: NUANG_SITE_NAME,
        publisher: { "@id": organizationId },
        url: `${NUANG_SITE_ORIGIN}/`,
      },
      {
        "@type": "WebApplication",
        applicationCategory: "SocialNetworkingApplication",
        browserRequirements: "Requires JavaScript",
        description: NUANG_DEFAULT_DESCRIPTION,
        featureList: [
          "무료 성향 테스트",
          "친구·연인 밸런스 게임",
          "32가지 성향 지도",
          "성향 기반 커뮤니티",
        ],
        inLanguage: "ko-KR",
        isAccessibleForFree: true,
        name: NUANG_SITE_NAME,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
        operatingSystem: "Web",
        url: `${NUANG_SITE_ORIGIN}/`,
      },
    ],
  };
}

export function createBreadcrumbStructuredData(
  items: readonly Readonly<{ name: string; path: string }>[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: toAbsoluteNuangUrl(item.path),
      name: item.name,
      position: index + 1,
    })),
  };
}
