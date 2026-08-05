import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "주제검사 결과",
});

export default function TopicResultPrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
