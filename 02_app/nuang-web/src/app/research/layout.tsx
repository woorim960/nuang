import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "검사 연구",
});

export default function ResearchPrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
