import { notFound } from "next/navigation";
import { canAccessTopicAssessmentRoute } from "@/features/assessment/assessment-catalog";
import { getFreeTopicAssessment } from "@/features/assessment/free-topic-assessments";
import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";
import type { FreeTopicAssessment, FreeTopicQuestion } from "@/features/assessment/free-topic-assessments";
import {
  resolveAssessmentReleaseById,
  resolveAssessmentRuntimeContent,
} from "@/features/assessment/server-assessment-content-runtime";

export default async function FreeTopicResultPage({
  params,
}: {
  params: Promise<{ localResultId: string; slug: string }>;
}) {
  const { localResultId, slug } = await params;
  let resolution = await resolveAssessmentRuntimeContent({
    category: "topic",
    slug,
    subtype: "free_topic",
  });
  if (resolution.state === "unavailable" && resolution.releaseId) {
    resolution = await resolveAssessmentReleaseById({
      category: "topic",
      releaseId: resolution.releaseId,
      slug,
      subtype: "free_topic",
    });
  }
  const payload = resolution.document?.payload as
    | { assessment?: FreeTopicAssessment; questions?: FreeTopicQuestion[] }
    | undefined;

  if (
    !payload?.assessment &&
    (!getFreeTopicAssessment(slug) || !canAccessTopicAssessmentRoute(slug))
  ) {
    notFound();
  }

  return (
    <FreeTopicResultView
      assessmentOverride={payload?.assessment}
      localResultId={localResultId}
      questionsOverride={payload?.questions}
      slug={slug}
    />
  );
}
