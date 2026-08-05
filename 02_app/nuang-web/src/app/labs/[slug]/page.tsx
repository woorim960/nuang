import { notFound } from "next/navigation";
import { LabRunner } from "@/features/lab/LabRunner";
import { getLabAssessment } from "@/features/lab/lab-assessments";
import type { LabAssessment } from "@/features/lab/lab-assessments";
import { resolveAssessmentRuntimeContent } from "@/features/assessment/server-assessment-content-runtime";

type LabPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LabPage({ params }: LabPageProps) {
  const { slug } = await params;
  const resolution = await resolveAssessmentRuntimeContent({
    category: "lab",
    slug,
    subtype: "odd_lab",
  });
  if (resolution.state === "unavailable") notFound();
  const payload = resolution.document?.payload as
    | { assessment?: LabAssessment }
    | undefined;
  const assessment = payload?.assessment ?? getLabAssessment(slug);

  if (!assessment) {
    notFound();
  }

  return <LabRunner assessment={assessment} releaseId={resolution.releaseId} />;
}
