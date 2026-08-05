import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "성향 놀이터 결과",
});

export default function LabResultPrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
