import type { Metadata } from "next";
import { PolicySkeletonView } from "@/features/policy/PolicySkeletonView";
import { policySkeletons } from "@/features/policy/policy-skeleton";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "개인정보 처리방침 | NUANG",
};

export default function PrivacyPolicyPage() {
  return <PolicySkeletonView policy={policySkeletons.privacy} />;
}
