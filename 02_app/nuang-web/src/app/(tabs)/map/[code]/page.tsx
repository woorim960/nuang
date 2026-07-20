import { notFound } from "next/navigation";
import { EnakqTraitMapTemplate } from "@/features/map/EnakqTraitMapTemplate";

export default async function TraitMapDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (code.toUpperCase() !== "ENAKQ") {
    notFound();
  }

  return <EnakqTraitMapTemplate />;
}
