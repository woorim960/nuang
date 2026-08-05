import type { Metadata } from "next";

export const NUANG_SITE_ORIGIN = "https://nuang.app";
export const NUANG_SITE_NAME = "뉴앙";
export const NUANG_SITE_NAME_LATIN = "NUANG";
export const NUANG_METADATA_BACKGROUND_COLOR = "#f7f4fe";
export const NUANG_METADATA_THEME_COLOR = "#7151d6";
export const NUANG_DEFAULT_DESCRIPTION =
  "무료 성향 테스트와 밸런스 게임으로 나를 알아보고, 친구·연인과 서로의 생각을 비교하며 관계를 이어가는 성향 기반 SNS 뉴앙";
export const NUANG_DEFAULT_SOCIAL_IMAGE =
  "/images/seo/nuang-personality-social-v1.png";
export const NUANG_DEFAULT_SOCIAL_IMAGE_ALT =
  "성향 테스트와 밸런스 게임으로 나와 우리를 발견하는 뉴앙";

type PublicPageMetadataInput = Readonly<{
  description: string;
  image?: string;
  imageAlt?: string;
  path: string;
  title: string;
  type?: "article" | "profile" | "website";
}>;

export function createPublicPageMetadata({
  description,
  image = NUANG_DEFAULT_SOCIAL_IMAGE,
  imageAlt = NUANG_DEFAULT_SOCIAL_IMAGE_ALT,
  path,
  title,
  type = "website",
}: PublicPageMetadataInput): Metadata {
  const canonicalPath = normalizeCanonicalPath(path);
  const fullTitle = title.includes(NUANG_SITE_NAME)
    ? title
    : `${title} | ${NUANG_SITE_NAME}`;

  return {
    alternates: { canonical: canonicalPath },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: imageAlt,
          height: 630,
          url: image,
          width: 1200,
        },
      ],
      locale: "ko_KR",
      siteName: NUANG_SITE_NAME,
      title: fullTitle,
      type,
      url: canonicalPath,
    },
    robots: {
      follow: true,
      index: true,
      googleBot: {
        follow: true,
        index: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    title: { absolute: fullTitle },
    twitter: {
      card: "summary_large_image",
      description,
      images: [image],
      title: fullTitle,
    },
  };
}

export function createPrivatePageMetadata({
  description,
  title,
}: Readonly<{ description?: string; title: string }>): Metadata {
  const fullTitle = title.includes(NUANG_SITE_NAME)
    ? title
    : `${title} | ${NUANG_SITE_NAME}`;

  return {
    ...(description ? { description } : {}),
    robots: {
      follow: false,
      index: false,
      googleBot: {
        follow: false,
        index: false,
        noarchive: true,
        noimageindex: true,
        nosnippet: true,
      },
    },
    title: { absolute: fullTitle },
  };
}

export function buildSearchEngineVerification(): Metadata["verification"] {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const naver = process.env.NAVER_SITE_VERIFICATION?.trim();

  if (!google && !naver) return undefined;

  return {
    ...(google ? { google } : {}),
    ...(naver ? { other: { "naver-site-verification": [naver] } } : {}),
  };
}

export function toAbsoluteNuangUrl(path: string) {
  return new URL(normalizeCanonicalPath(path), NUANG_SITE_ORIGIN).toString();
}

function normalizeCanonicalPath(path: string) {
  const normalized = path.trim();
  if (!normalized || normalized === "/") return "/";
  const pathname = new URL(normalized, NUANG_SITE_ORIGIN).pathname;
  return `/${pathname.replace(/^\/+|\/+$/gu, "")}`;
}
