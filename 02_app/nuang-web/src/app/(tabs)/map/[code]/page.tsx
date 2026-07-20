import { notFound } from "next/navigation";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";

export default async function TraitMapDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const guide = getPublishedTraitMapCustomerGuide(code);
  if (!guide) notFound();

  return <TraitMapDetailTemplate guide={guide} />;
}
