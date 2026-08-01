import { notFound } from "next/navigation";
import { LabResultView } from "@/features/lab/LabResultView";
import { getLabAssessment } from "@/features/lab/lab-assessments";

type LabResultPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ localResultId?: string }>;
};

export default async function LabResultPage({
  params,
  searchParams,
}: LabResultPageProps) {
  const { slug } = await params;
  const { localResultId } = await searchParams;
  const assessment = getLabAssessment(slug);

  if (!assessment) {
    notFound();
  }

  return (
    <LabResultView
      assessment={assessment}
      localResultId={localResultId}
    />
  );
}
