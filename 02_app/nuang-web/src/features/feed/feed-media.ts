export const feedMediaBucket = "feed-media";
export const maxFeedPhotoCount = 19;
export const maxFeedPhotoBytes = 8 * 1024 * 1024;
export const maxFeedPhotoTotalBytes = 40 * 1024 * 1024;
export const supportedFeedPhotoTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedFeedPhotoType = (typeof supportedFeedPhotoTypes)[number];

export function validateFeedPhotoFiles(files: File[]) {
  if (files.length > maxFeedPhotoCount) {
    return `사진은 최대 ${maxFeedPhotoCount}장까지 올릴 수 있어요.`;
  }

  if (files.some((file) => !isSupportedFeedPhotoType(file.type))) {
    return "JPG, PNG, WEBP 사진만 올릴 수 있어요.";
  }

  if (files.some((file) => file.size <= 0 || file.size > maxFeedPhotoBytes)) {
    return "사진 한 장의 크기는 8MB 이하여야 해요.";
  }

  if (
    files.reduce((total, file) => total + file.size, 0) > maxFeedPhotoTotalBytes
  ) {
    return "한 게시물의 사진 용량은 모두 합쳐 40MB 이하여야 해요.";
  }

  return null;
}

export function isSupportedFeedPhotoType(
  value: string,
): value is SupportedFeedPhotoType {
  return supportedFeedPhotoTypes.includes(value as SupportedFeedPhotoType);
}

export function getFeedPhotoExtension(type: SupportedFeedPhotoType) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}
