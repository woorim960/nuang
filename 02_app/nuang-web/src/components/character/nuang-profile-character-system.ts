import {
  nuangCharacterAssetPaths,
  type NuangCharacterMotif,
} from "@/components/character/nuang-character-assets";
import { getNuangProfileName } from "@/features/nuang-code/nuang-code-dictionary";

export const nuangProfileMotifPrefixes = ["TV", "TC", "SV", "SC"] as const;

export type NuangProfileMotifPrefix =
  (typeof nuangProfileMotifPrefixes)[number];

export const nuangProfileRoleCodes = [
  "OAE",
  "OAP",
  "ODE",
  "ODP",
  "FAE",
  "FAP",
  "FDE",
  "FDP",
] as const;

export type NuangProfileRoleCode = (typeof nuangProfileRoleCodes)[number];

export type NuangProfileCode =
  `${NuangProfileMotifPrefix}${NuangProfileRoleCode}`;

type ProfileMotifRule = {
  motif: Exclude<NuangCharacterMotif, "purple">;
  motifLabel: string;
  characterCue: string;
  motionCue: string;
};

type ProfileRoleVariant = {
  roleLabel: string;
  expressionCue: string;
  postureCue: string;
  propCue: string;
};

export type NuangProfileCharacterRule = ProfileMotifRule &
  ProfileRoleVariant & {
    baseAssetPath: string;
    motifPrefix: NuangProfileMotifPrefix;
    profileCode: NuangProfileCode;
    roleCode: NuangProfileRoleCode;
    displayName: string;
    variantSeed: string;
  };

export const nuangProfileMotifRules: Record<
  NuangProfileMotifPrefix,
  ProfileMotifRule
> = {
  TV: {
    motif: "flame",
    motifLabel: "불꽃",
    characterCue: "warm orange-red body, lively rounded silhouette",
    motionCue: "open stance with visible forward energy",
  },
  TC: {
    motif: "sun",
    motifLabel: "햇살",
    characterCue: "golden yellow body, calm bright silhouette",
    motionCue: "open stance with softer centered energy",
  },
  SV: {
    motif: "water",
    motifLabel: "물결",
    characterCue: "clear blue body, fluid rounded silhouette",
    motionCue: "selective stance with vivid responsive movement",
  },
  SC: {
    motif: "forest",
    motifLabel: "숲",
    characterCue: "fresh green body, grounded rounded silhouette",
    motionCue: "selective stance with steady calm movement",
  },
};

export const nuangProfileRoleVariants: Record<
  NuangProfileRoleCode,
  ProfileRoleVariant
> = {
  OAE: {
    roleLabel: "온기 탐험가",
    expressionCue: "curious and gentle face",
    postureCue: "leaning forward as if discovering a small path",
    propCue: "small lantern-like light object without text",
  },
  OAP: {
    roleLabel: "세심한 실천가",
    expressionCue: "focused and caring face",
    postureCue: "holding a small rounded note board close to the body",
    propCue: "simple checklist-like board without letters or marks",
  },
  ODE: {
    roleLabel: "새길 개척가",
    expressionCue: "clear and confident face",
    postureCue: "pointing toward a new direction with balanced energy",
    propCue: "small compass-like object without numbers",
  },
  ODP: {
    roleLabel: "현실 추진가",
    expressionCue: "direct and practical face",
    postureCue: "pushing a small rounded block forward",
    propCue: "soft geometric block without symbols",
  },
  FAE: {
    roleLabel: "영감 동행자",
    expressionCue: "bright and imaginative face",
    postureCue: "floating lightly beside a small idea object",
    propCue: "small glowing idea bead without text",
  },
  FAP: {
    roleLabel: "편안한 조율가",
    expressionCue: "relaxed and receptive face",
    postureCue: "sitting or gently balancing in a comfortable pose",
    propCue: "small rounded cushion-like object",
  },
  FDE: {
    roleLabel: "자유 발견가",
    expressionCue: "playful and decisive face",
    postureCue: "stepping sideways as if choosing an unexpected route",
    propCue: "small telescope-like object without lens glare text",
  },
  FDP: {
    roleLabel: "담백한 해결가",
    expressionCue: "simple and composed face",
    postureCue: "holding one practical object with minimal movement",
    propCue: "small multi-tool-like object with rounded safe edges",
  },
};

const motifPrefixSet = new Set<string>(nuangProfileMotifPrefixes);
const roleCodeSet = new Set<string>(nuangProfileRoleCodes);

export const nuangProfileCharacterRules = nuangProfileMotifPrefixes.flatMap(
  (motifPrefix) =>
    nuangProfileRoleCodes.map((roleCode) =>
      buildNuangProfileCharacterRule(`${motifPrefix}${roleCode}`),
    ),
);

export function isNuangProfileCode(value: string): value is NuangProfileCode {
  return (
    value.length === 5 &&
    motifPrefixSet.has(value.slice(0, 2)) &&
    roleCodeSet.has(value.slice(2))
  );
}

export function getNuangProfileCharacterRule(
  profileCode: string,
): NuangProfileCharacterRule | null {
  if (!isNuangProfileCode(profileCode)) return null;

  return buildNuangProfileCharacterRule(profileCode);
}

function buildNuangProfileCharacterRule(
  profileCode: NuangProfileCode,
): NuangProfileCharacterRule {
  const motifPrefix = profileCode.slice(0, 2) as NuangProfileMotifPrefix;
  const roleCode = profileCode.slice(2) as NuangProfileRoleCode;
  const motifRule = nuangProfileMotifRules[motifPrefix];
  const roleVariant = nuangProfileRoleVariants[roleCode];

  return {
    ...motifRule,
    ...roleVariant,
    baseAssetPath: nuangCharacterAssetPaths[motifRule.motif],
    motifPrefix,
    profileCode,
    roleCode,
    displayName:
      getNuangProfileName(profileCode) ??
      `${motifRule.motifLabel}의 ${roleVariant.roleLabel}`,
    variantSeed: `${motifRule.motif}-${roleCode.toLowerCase()}`,
  };
}
