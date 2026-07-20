import { notFound } from "next/navigation";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import { TraitMapPreviewTemplate } from "@/features/map/TraitMapPreviewTemplate";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";

export default async function TraitMapDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  const profile = getCandidateProfileDefinition(normalizedCode);
  if (!profile) notFound();

  const guide = getPublishedTraitMapCustomerGuide(normalizedCode);
  return guide ? (
    <TraitMapDetailTemplate guide={guide} />
  ) : (
    <TraitMapPreviewTemplate profile={profile} />
  );
}
