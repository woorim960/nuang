import Image from "next/image";
import {
  nuangCharacterAssetPaths,
  nuangCharacterMotifs,
  type NuangCharacterMotif,
} from "@/components/character/nuang-character-assets";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";
import artwork from "./BalanceResultArtwork.module.css";

type ResultIconProps = {
  className?: string;
  size?: number;
};

const resultSceneCharacterMotifs: Record<
  "different" | "invite" | "unanimous",
  readonly [NuangCharacterMotif, NuangCharacterMotif]
> = {
  different: ["flame", "forest"],
  invite: ["sun", "purple"],
  unanimous: ["purple", "water"],
};

export function ResultAvatar({
  label,
  motif,
  participantIndex,
  profileImage,
  seed,
  size = "medium",
}: {
  label: string;
  motif?: NuangCharacterMotif;
  participantIndex?: number;
  profileImage?: PublicProfileImage | null;
  seed: string;
  size?: "small" | "medium" | "large";
}) {
  const resolvedMotif =
    motif ??
    (participantIndex === undefined
      ? nuangCharacterMotifs[hashSeed(seed) % nuangCharacterMotifs.length]
      : getResultGuestCharacterMotif(participantIndex));
  const image = profileImage ?? {
    alt: `${label} 프로필 이미지`,
    source: "character" as const,
    src: nuangCharacterAssetPaths[resolvedMotif],
  };

  return (
    <span
      aria-hidden="true"
      className={artwork.avatar}
      data-size={size}
      data-source={image.source}
      title={label}
    >
      <Image
        alt=""
        className={artwork.avatarImage}
        draggable={false}
        height={64}
        src={image.src}
        unoptimized={image.source === "user_uploaded"}
        width={64}
      />
    </span>
  );
}

export function ResultGroupAvatar() {
  return (
    <span aria-hidden="true" className={artwork.groupAvatar} title="모두">
      {(["water", "purple", "flame"] as const).map((motif, index) => (
        <Image
          alt=""
          className={artwork.groupAvatarImage}
          data-position={index}
          draggable={false}
          height={42}
          key={motif}
          src={nuangCharacterAssetPaths[motif]}
          width={42}
        />
      ))}
    </span>
  );
}

export function getResultGuestCharacterMotif(index: number) {
  return nuangCharacterMotifs[
    Math.max(0, index) % nuangCharacterMotifs.length
  ];
}

export function ResultDuoArtwork({
  mode = "group",
}: {
  mode?: "group" | "pair" | "self";
}) {
  return (
    <div
      aria-hidden="true"
      className={artwork.duo}
      data-mode={mode}
    >
      <span className={artwork.duoHalo} />
      <svg className={artwork.duoConnection} viewBox="0 0 280 144">
        <path
          className={artwork.duoConnectionPath}
          d="M124 82c10-11 22-11 32 0"
        />
        <circle className={artwork.duoPulse} cx="140" cy="74" r="4.5" />
        <path className={artwork.duoGround} d="M43 119c48 15 146 15 194 0" />
      </svg>
      <span className={artwork.duoCharacterSlot} data-side="left">
        <Image
          alt=""
          className={artwork.duoCharacter}
          data-result-hero-character="purple"
          draggable={false}
          height={112}
          priority
          src={nuangCharacterAssetPaths.purple}
          width={112}
        />
      </span>
      <span className={artwork.duoCharacterSlot} data-side="right">
        <Image
          alt=""
          className={artwork.duoCharacter}
          data-result-hero-character="water"
          draggable={false}
          height={112}
          priority
          src={nuangCharacterAssetPaths.water}
          width={112}
        />
      </span>
      <span className={artwork.duoCharacterSlot} data-side="group">
        <Image
          alt=""
          className={artwork.duoCharacter}
          data-result-hero-character="sun"
          draggable={false}
          height={72}
          priority
          src={nuangCharacterAssetPaths.sun}
          width={72}
        />
      </span>
    </div>
  );
}

export function ResultSceneBadge({
  scene,
}: {
  scene: "different" | "invite" | "unanimous";
}) {
  const motifs = resultSceneCharacterMotifs[scene];
  return (
    <span aria-hidden="true" className={artwork.scene} data-scene={scene}>
      {motifs.map((motif, index) => (
        <Image
          alt=""
          className={artwork.sceneCharacter}
          data-position={index}
          data-result-scene-character={motif}
          draggable={false}
          height={38}
          key={`${scene}-${motif}`}
          src={nuangCharacterAssetPaths[motif]}
          width={38}
        />
      ))}
      <span className={artwork.sceneSignal} />
    </span>
  );
}

export function ResultBackIcon({ className, size = 22 }: ResultIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    </svg>
  );
}

export function ResultChevronIcon({ className, size = 18 }: ResultIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 20 20"
      width={size}
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

export function ResultShareIcon({ className, size = 20 }: ResultIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      <circle cx="17.5" cy="5.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
      <path d="m8.7 10.8 6.6-3.9M8.7 13.2l6.6 3.9" />
    </svg>
  );
}

export function ResultCopyIcon({ className, size = 19 }: ResultIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      <rect height="12" rx="3" width="12" x="8" y="8" />
      <path d="M16 8V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h1" />
    </svg>
  );
}

export function ResultQrIcon({ className, size = 19 }: ResultIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      <rect height="6" rx="1.5" width="6" x="4" y="4" />
      <rect height="6" rx="1.5" width="6" x="14" y="4" />
      <rect height="6" rx="1.5" width="6" x="4" y="14" />
      <path d="M14 14h2v2h-2zm4 0h2v6h-2zm-4 4h2v2h-2z" />
    </svg>
  );
}

export function ResultCheckIcon({ className, size = 18 }: ResultIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 20 20"
      width={size}
    >
      <path d="m4 10.3 3.5 3.5L16 5.9" />
    </svg>
  );
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
