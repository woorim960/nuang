import { notFound } from "next/navigation";
import { canAccessTopicAssessmentRoute } from "@/features/assessment/assessment-catalog";
import { getFreeTopicAssessment } from "@/features/assessment/free-topic-assessments";
import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";

export default async function FreeTopicResultPage({
  params,
}: {
  params: Promise<{ localResultId: string; slug: string }>;
}) {
  const { localResultId, slug } = await params;

  if (!getFreeTopicAssessment(slug) || !canAccessTopicAssessmentRoute(slug)) {
    notFound();
  }

  return <FreeTopicResultView localResultId={localResultId} slug={slug} />;
}
