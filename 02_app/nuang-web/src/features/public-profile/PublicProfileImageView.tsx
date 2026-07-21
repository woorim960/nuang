import Image from "next/image";
import type { PublicProfileImage } from "@/features/public-profile/profile-image";
import { cn } from "@/lib/utils/cn";

const sizeClass = {
  lg: "h-24 w-24",
  md: "h-14 w-14",
  sm: "h-9 w-9",
} as const;

const imageSize = {
  lg: 96,
  md: 56,
  sm: 36,
} as const;

export function PublicProfileImageView({
  className,
  image,
  priority = false,
  size = "md",
}: {
  className?: string;
  image: PublicProfileImage;
  priority?: boolean;
  size?: keyof typeof sizeClass;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-[#f4f4f4]",
        sizeClass[size],
        className,
      )}
    >
      <Image
        alt={image.alt}
        className="h-full w-full object-cover"
        draggable={false}
        height={imageSize[size]}
        priority={priority}
        src={image.src}
        unoptimized={image.source === "user_uploaded"}
        width={imageSize[size]}
      />
    </span>
  );
}
