import type { Metadata } from "next";
import { CommunityQuestionComposer } from "@/features/feed/CommunityQuestionComposer";

export const metadata: Metadata = {
  title: "뉴앙에게 물어봐 | NUANG",
};

export default function NewCommunityQuestionPage() {
  return <CommunityQuestionComposer />;
}
