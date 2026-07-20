import type { Metadata } from "next";
import { GateCPublicStudy } from "@/features/research/gate-c/GateCPublicStudy";

export const metadata: Metadata = {
  title: "뉴앙 질문 확인 참여 | NUANG",
  description:
    "이름과 연락처 없이 12개 질문을 확인하고 뉴앙 성향 검사 개선에 참여해 주세요.",
  robots: { follow: false, index: false },
};

export default function GateCResearchHomePage() {
  return <GateCPublicStudy />;
}
