import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canAccessTopicAssessmentRoute } from "@/features/assessment/assessment-catalog";
import { getFreeTopicAssessment } from "@/features/assessment/free-topic-assessments";
import type {
  FreeTopicAssessment,
  FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";
import { FreeTopicRunner } from "@/features/assessment/FreeTopicRunner";
import { resolveAssessmentRuntimeContent } from "@/features/assessment/server-assessment-content-runtime";
import { createTopicAssessmentMetadata } from "@/features/seo/seo-content";

type FreeTopicAssessmentPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: FreeTopicAssessmentPageProps): Promise<Metadata> {
  return createTopicAssessmentMetadata((await params).slug);
}

export default async function FreeTopicAssessmentPage({
  params,
}: FreeTopicAssessmentPageProps) {
  const { slug } = await params;
  const resolution = await resolveAssessmentRuntimeContent({
    category: "topic",
    slug,
    subtype: "free_topic",
  });
  if (resolution.state === "unavailable") notFound();
  const payload = resolution.document?.payload as
    | { assessment?: FreeTopicAssessment; questions?: FreeTopicQuestion[] }
    | undefined;
  const assessment = payload?.assessment ?? getFreeTopicAssessment(slug);

  if (
    !assessment ||
    (resolution.state === "fallback" && !canAccessTopicAssessmentRoute(slug))
  ) {
    notFound();
  }

  return (
    <FreeTopicRunner
      assessment={assessment}
      questions={payload?.questions}
      releaseId={resolution.releaseId}
    />
  );
}
