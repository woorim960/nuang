import { notFound } from "next/navigation";
import { canAccessTopicAssessmentRoute } from "@/features/assessment/assessment-catalog";
import { getFreeTopicAssessment } from "@/features/assessment/free-topic-assessments";
import { FreeTopicRunner } from "@/features/assessment/FreeTopicRunner";

export default async function FreeTopicAssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const assessment = getFreeTopicAssessment(slug);

  if (!assessment || !canAccessTopicAssessmentRoute(slug)) {
    notFound();
  }

  return <FreeTopicRunner assessment={assessment} />;
}
