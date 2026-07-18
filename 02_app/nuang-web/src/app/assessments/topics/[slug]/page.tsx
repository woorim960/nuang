import { notFound } from "next/navigation";
import {
  getFreeTopicAssessment,
  isFreeTopicOpen,
} from "@/features/assessment/free-topic-assessments";
import { FreeTopicRunner } from "@/features/assessment/FreeTopicRunner";

export default async function FreeTopicAssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const assessment = getFreeTopicAssessment(slug);

  if (!assessment || !isFreeTopicOpen(slug)) {
    notFound();
  }

  return <FreeTopicRunner assessment={assessment} />;
}
