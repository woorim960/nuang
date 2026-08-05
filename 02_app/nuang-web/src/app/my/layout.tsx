import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPrivatePageMetadata } from "@/features/seo/site-config";

export const metadata: Metadata = createPrivatePageMetadata({ title: "마이" });

export default function MyPrivateLayout({ children }: { children: ReactNode }) {
  return children;
}
