import type { MetadataRoute } from "next";
import {
  NUANG_METADATA_BACKGROUND_COLOR,
  NUANG_METADATA_THEME_COLOR,
} from "@/features/seo/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: NUANG_METADATA_BACKGROUND_COLOR,
    categories: ["social", "lifestyle", "entertainment"],
    description:
      "성향 테스트와 밸런스 게임으로 나와 우리를 발견하는 성향 기반 SNS",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/icons/nuang-icon-192.png",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/icons/nuang-icon-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/nuang-maskable-icon-512.png",
        type: "image/png",
      },
    ],
    id: "/",
    lang: "ko-KR",
    name: "뉴앙 - 성향으로 나와 우리를 발견하는 곳",
    orientation: "portrait-primary",
    scope: "/",
    short_name: "뉴앙",
    start_url: "/home",
    theme_color: NUANG_METADATA_THEME_COLOR,
  };
}
