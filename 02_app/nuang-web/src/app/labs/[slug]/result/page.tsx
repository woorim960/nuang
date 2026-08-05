import { notFound } from "next/navigation";
import { LabResultView } from "@/features/lab/LabResultView";
import { getLabAssessment } from "@/features/lab/lab-assessments";
import type { LabAssessment } from "@/features/lab/lab-assessments";
import {
  resolveAssessmentReleaseById,
  resolveAssessmentRuntimeContent,
} from "@/features/assessment/server-assessment-content-runtime";

type LabResultPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    localResultId?: string | string[];
    share?: string | string[];
  }>;
};

export default async function LabResultPage({
  params,
  searchParams,
}: LabResultPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const localResultId = Array.isArray(query.localResultId)
    ? query.localResultId[0]
    : query.localResultId;
  const share = Array.isArray(query.share) ? query.share[0] : query.share;
  let resolution = await resolveAssessmentRuntimeContent({
    category: "lab",
    slug,
    subtype: "odd_lab",
  });
  if (resolution.state === "unavailable" && resolution.releaseId) {
    resolution = await resolveAssessmentReleaseById({
      category: "lab",
      releaseId: resolution.releaseId,
      slug,
      subtype: "odd_lab",
    });
  }
  const payload = resolution.document?.payload as
    | { assessment?: LabAssessment }
    | undefined;
  const assessment = payload?.assessment ?? getLabAssessment(slug);

  if (!assessment) {
    notFound();
  }

  return (
    <LabResultView
      assessment={assessment}
      localResultId={localResultId}
      openShareOnMount={share === "1"}
    />
  );
}
