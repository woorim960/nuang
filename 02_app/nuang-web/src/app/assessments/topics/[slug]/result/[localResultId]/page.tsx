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
  searchParams,
}: {
  params: Promise<{ localResultId: string; slug: string }>;
  searchParams: Promise<{ share?: string | string[] }>;
}) {
  const { localResultId, slug } = await params;
  const query = await searchParams;
  const share = Array.isArray(query.share) ? query.share[0] : query.share;
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
      openShareOnMount={share === "1"}
      questionsOverride={payload?.questions}
      slug={slug}
    />
  );
}
