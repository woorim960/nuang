import type { Metadata } from "next";
import { AdvertisingInquiryForm } from "@/features/advertising/AdvertisingInquiryForm";

export const metadata: Metadata = {
  title: "광고·제휴 문의 | NUANG",
  description: "뉴앙의 광고 상품과 브랜드 제휴를 문의해 주세요.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function AdvertisingInquiryPage() {
  return <AdvertisingInquiryForm />;
}
