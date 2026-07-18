import {
  nuangCharacterAssetPaths,
  type NuangCharacterMotif,
} from "@/components/character/nuang-character-assets";

export type PublicProfileImage =
  | {
      alt: string;
      motif: NuangCharacterMotif;
      source: "character";
      src: string;
    }
  | {
      alt: string;
      source: "trait_image" | "user_uploaded";
      src: string;
    };

export function createCharacterProfileImage({
  alt,
  motif,
}: {
  alt: string;
  motif: NuangCharacterMotif;
}): PublicProfileImage {
  return {
    alt,
    motif,
    source: "character",
    src: nuangCharacterAssetPaths[motif],
  };
}

