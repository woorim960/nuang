import type { Metadata } from "next";
import { ProfileVisibilityPreview } from "@/features/account/ProfileVisibilityPreview";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";

export const metadata: Metadata = {
  title: "공개 정보 | NUANG",
};

export default function VisibilitySettingsPage() {
  return (
    <CommunityScreenShell
      backHref="/my/settings"
      backLabel="설정으로 돌아가기"
      title="공개 정보"
    >
      <ProfileVisibilityPreview />
    </CommunityScreenShell>
  );
}
