import { notFound } from "next/navigation";
import { LabRunner } from "@/features/lab/LabRunner";
import { getLabAssessment } from "@/features/lab/lab-assessments";

type LabPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LabPage({ params }: LabPageProps) {
  const { slug } = await params;
  const assessment = getLabAssessment(slug);

  if (!assessment) {
    notFound();
  }

  return <LabRunner assessment={assessment} />;
}
