import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import { getNuangProfileName } from "@/features/nuang-code/nuang-code-dictionary";

export function getSupportedNuangProfileName(code: string | null | undefined) {
  if (!code) return null;

  return (
    getCandidateProfileDefinition(code)?.displayName ??
    getNuangProfileName(code) ??
    null
  );
}

export function isSupportedNuangCode(
  code: string | null | undefined,
): code is string {
  return getSupportedNuangProfileName(code) !== null;
}
