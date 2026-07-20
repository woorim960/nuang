import type { Metadata } from "next";
import { AssessmentHub } from "@/features/assessment/AssessmentHub";

export const metadata: Metadata = {
  title: "검사 | NUANG",
};

export default function AssessmentsPage() {
  return <AssessmentHub />;
}
