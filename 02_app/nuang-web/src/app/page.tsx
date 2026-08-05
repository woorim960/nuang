import type { Metadata } from "next";
import { EntryGate } from "@/features/onboarding/EntryGate";
import { JsonLd } from "@/features/seo/JsonLd";
import { createPublicPageMetadata } from "@/features/seo/site-config";
import { createNuangHomeStructuredData } from "@/features/seo/structured-data";

const rootMetadata = createPublicPageMetadata({
  description:
    "무료 성향 테스트와 밸런스 게임으로 나를 알아보고, 친구·연인과 서로의 생각을 비교하는 성향 기반 SNS 뉴앙을 시작해 보세요.",
  path: "/",
  title: "뉴앙",
});

export const metadata: Metadata = {
  ...rootMetadata,
  title: { absolute: "뉴앙 | 성향 테스트와 밸런스 게임" },
};

export default function RootPage() {
  return (
    <>
      <JsonLd data={createNuangHomeStructuredData()} />
      <EntryGate />
    </>
  );
}
