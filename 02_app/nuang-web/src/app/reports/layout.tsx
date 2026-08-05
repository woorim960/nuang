import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "비교 리포트",
});

export default function ReportsPrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
