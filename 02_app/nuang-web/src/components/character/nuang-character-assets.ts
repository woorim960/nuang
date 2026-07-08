export const nuangCharacterMotifs = [
  "purple",
  "flame",
  "sun",
  "water",
  "forest",
] as const;

export type NuangCharacterMotif = (typeof nuangCharacterMotifs)[number];

export const nuangCharacterSizes = ["sm", "md", "lg"] as const;

export type NuangCharacterSize = (typeof nuangCharacterSizes)[number];

export const nuangCharacterPixelSizes = {
  sm: 56,
  md: 80,
  lg: 112,
} as const satisfies Record<NuangCharacterSize, number>;

export const nuangCharacterAssetPaths = {
  purple: "/assets/characters/nuang-character-purple.webp",
  flame: "/assets/characters/nuang-character-flame.webp",
  sun: "/assets/characters/nuang-character-sun.webp",
  water: "/assets/characters/nuang-character-water.webp",
  forest: "/assets/characters/nuang-character-forest.webp",
} as const satisfies Record<
  NuangCharacterMotif,
  `/assets/characters/nuang-character-${string}.webp`
>;

export const nuangCharacterAssetSpec = {
  background: "transparent",
  format: "webp",
  pixelSourceSize: 768,
  renderIntent: "decorative",
  source: "generated-bitmap",
} as const;
