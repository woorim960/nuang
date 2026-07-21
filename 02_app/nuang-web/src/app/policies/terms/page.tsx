import type { Metadata } from "next";
import { PolicySkeletonView } from "@/features/policy/PolicySkeletonView";
import { policySkeletons } from "@/features/policy/policy-skeleton";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "이용약관 | NUANG",
};

export default function TermsPolicyPage() {
  return <PolicySkeletonView policy={policySkeletons.terms} />;
}
