import type { Metadata } from "next";
import { AdvertisingLanding } from "@/features/advertising/AdvertisingLanding";

export const metadata: Metadata = {
  title: "광고·제휴 안내 | NUANG",
  description:
    "뉴앙의 성향 검사와 커뮤니티 경험을 지키면서 브랜드와 오래 기억되는 접점을 만드는 광고·제휴 안내입니다.",
};

export default function AdvertisePage() {
  return <AdvertisingLanding />;
}
