import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobalRouteTransition } from "@/components/navigation/GlobalRouteTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUANG",
  description: "나와 가까운 사람을 더 부드럽게 이해하는 성향 기반 SNS",
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
        </Suspense>
        {children}
      </body>
    </html>
  );
}
