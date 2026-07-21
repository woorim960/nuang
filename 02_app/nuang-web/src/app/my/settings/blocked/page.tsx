import type { Metadata } from "next";
import { BlockedProfilesScreen } from "@/features/account/BlockedProfilesScreen";

export const metadata: Metadata = {
  title: "차단한 프로필 | NUANG",
};

export default function BlockedProfilesSettingsPage() {
  return <BlockedProfilesScreen />;
}
