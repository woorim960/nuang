import { TraitMapExplorer } from "@/features/map/TraitMapExplorer";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";

type MapPageProps = {
  searchParams?: Promise<{
    code?: string | string[];
  }>;
};

export default async function MapPage({ searchParams }: MapPageProps = {}) {
  const params: { code?: string | string[] } = searchParams
    ? await searchParams
    : {};
  const requestedCode = Array.isArray(params.code)
    ? params.code[0]
    : params.code;
  const normalizedCode = requestedCode?.toUpperCase();
  const initialCode =
    normalizedCode && candidateProfileDefinitions[normalizedCode]
      ? normalizedCode
      : "ENAKQ";

  return <TraitMapExplorer initialCode={initialCode} />;
}
