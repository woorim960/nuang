import type { Metadata } from "next";
import { ProfileEditForm } from "@/features/account/ProfileEditForm";

export const metadata: Metadata = {
  title: "프로필 편집 | NUANG",
};

export default function MyProfileEditPage() {
  return <ProfileEditForm />;
}
