import { notFound } from "next/navigation";
import { LabResultView } from "@/features/lab/LabResultView";
import { getLabAssessment } from "@/features/lab/lab-assessments";

type LabResultPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LabResultPage({ params }: LabResultPageProps) {
  const { slug } = await params;
  const assessment = getLabAssessment(slug);

  if (!assessment) {
    notFound();
  }

  return <LabResultView assessment={assessment} />;
}
