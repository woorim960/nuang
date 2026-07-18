import Image from "next/image";
import type {
  NuangCharacterMotif,
  NuangCharacterSize,
} from "@/components/character/nuang-character-assets";
import {
  nuangCharacterAssetPaths,
  nuangCharacterPixelSizes,
} from "@/components/character/nuang-character-assets";
import { cn } from "@/lib/utils/cn";

type NuangCharacterProps = {
  motif?: NuangCharacterMotif;
  priority?: boolean;
  size?: NuangCharacterSize;
  className?: string;
};

const sizeClass: Record<NuangCharacterSize, string> = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function NuangCharacter({
  motif = "purple",
  priority = false,
  size = "md",
  className,
}: NuangCharacterProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative shrink-0 select-none",
        sizeClass[size],
        className,
      )}
    >
      <Image
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
        height={nuangCharacterPixelSizes[size]}
        priority={priority || size === "lg"}
        src={nuangCharacterAssetPaths[motif]}
        width={nuangCharacterPixelSizes[size]}
      />
    </div>
  );
}
