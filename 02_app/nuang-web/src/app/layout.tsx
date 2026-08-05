import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { GlobalRouteTransition } from "@/components/navigation/GlobalRouteTransition";
import { AssessmentSyncCoordinator } from "@/features/assessment/AssessmentSyncCoordinator";
import { ProductAnalyticsBoundary } from "@/features/consent/ProductAnalyticsBoundary";
import {
  buildSearchEngineVerification,
  NUANG_DEFAULT_DESCRIPTION,
  NUANG_DEFAULT_SOCIAL_IMAGE,
  NUANG_DEFAULT_SOCIAL_IMAGE_ALT,
  NUANG_METADATA_THEME_COLOR,
  NUANG_SITE_NAME,
  NUANG_SITE_ORIGIN,
} from "@/features/seo/site-config";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: NUANG_SITE_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: NUANG_SITE_NAME,
  },
  description: NUANG_DEFAULT_DESCRIPTION,
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  icons: {
    apple: [{ sizes: "180x180", url: "/apple-icon.png" }],
    icon: [
      { sizes: "any", url: "/favicon.ico" },
      {
        sizes: "48x48",
        type: "image/png",
        url: "/icons/nuang-favicon-48.png",
      },
      {
        sizes: "96x96",
        type: "image/png",
        url: "/icons/nuang-favicon-96.png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(NUANG_SITE_ORIGIN),
  openGraph: {
    description: NUANG_DEFAULT_DESCRIPTION,
    images: [
      {
        alt: NUANG_DEFAULT_SOCIAL_IMAGE_ALT,
        height: 630,
        url: NUANG_DEFAULT_SOCIAL_IMAGE,
        width: 1200,
      },
    ],
    locale: "ko_KR",
    siteName: NUANG_SITE_NAME,
    title: "뉴앙 | 성향 테스트와 밸런스 게임",
    type: "website",
  },
  referrer: "origin-when-cross-origin",
  title: "뉴앙 | 성향 테스트와 밸런스 게임",
  twitter: {
    card: "summary_large_image",
    description: NUANG_DEFAULT_DESCRIPTION,
    images: [NUANG_DEFAULT_SOCIAL_IMAGE],
    title: "뉴앙 | 성향 테스트와 밸런스 게임",
  },
  verification: buildSearchEngineVerification(),
};

export const viewport: Viewport = {
  colorScheme: "light",
  initialScale: 1,
  themeColor: NUANG_METADATA_THEME_COLOR,
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <Suspense fallback={null}>
          <GlobalRouteTransition />
          <ProductAnalyticsBoundary />
        </Suspense>
        <AssessmentSyncCoordinator />
        {children}
      </body>
    </html>
  );
}
