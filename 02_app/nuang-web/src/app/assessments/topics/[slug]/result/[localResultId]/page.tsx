import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";

export default async function FreeTopicResultPage({
  params,
}: {
  params: Promise<{ localResultId: string; slug: string }>;
}) {
  const { localResultId, slug } = await params;

  return <FreeTopicResultView localResultId={localResultId} slug={slug} />;
}
