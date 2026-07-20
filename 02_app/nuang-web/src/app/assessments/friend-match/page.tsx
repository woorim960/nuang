import type { Metadata } from "next";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";

export const metadata: Metadata = {
  title: "친구 성향 맞히기 | NUANG",
};

export default function FriendTraitMatchPage() {
  return <FriendTraitMatch />;
}
