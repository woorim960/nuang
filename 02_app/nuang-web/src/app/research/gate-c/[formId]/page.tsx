import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GateCStudyRunner } from "@/features/research/gate-c/GateCStudyRunner";
import { isGateCFormId } from "@/features/research/gate-c/gate-c-study-contract";
import { getGateCParticipantDefinition } from "@/features/research/gate-c/gate-c-study-fixture";

export const metadata: Metadata = {
  title: "문항 확인 세션 | NUANG",
  robots: { follow: false, index: false },
};

export default async function GateCResearchFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { formId } = await params;
  const normalizedFormId = formId.replace("form-", "FORM_").toUpperCase();
  if (!isGateCFormId(normalizedFormId)) notFound();

  return (
    <GateCStudyRunner
      definition={getGateCParticipantDefinition(normalizedFormId)}
    />
  );
}
