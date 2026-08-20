import "server-only";

import { createHash } from "node:crypto";
import type { Metadata } from "sharp";

export const feedMediaImageMaxInputPixels = 40_000_000;
export const feedMediaImageMaxLongEdge = 1_600;
export const feedMediaImageWebpQuality = 82;
export const feedMediaImageWebpAlphaQuality = 90;

export type FeedMediaSourceImageFormat = "jpeg" | "png" | "webp";

export type FeedMediaImageOptimizationFailureCode =
  | "animated_image_not_supported"
  | "invalid_payload"
  | "pixel_limit_exceeded"
  | "processing_failed"
  | "unsupported_format";

export type OptimizedFeedMediaImage = Readonly<{
  byteSize: number;
  data: Buffer;
  extension: "webp";
  height: number;
  mimeType: "image/webp";
  sha256: string;
  sourceByteSize: number;
  sourceFormat: FeedMediaSourceImageFormat;
  width: number;
}>;

export class FeedMediaImageOptimizationError extends Error {
  readonly code: FeedMediaImageOptimizationFailureCode;

  constructor(
    code: FeedMediaImageOptimizationFailureCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "FeedMediaImageOptimizationError";
    this.code = code;
  }
}

/**
 * Validates and normalizes an untrusted feed image for object storage.
 *
 * The returned SHA-256 digest identifies the normalized WebP bytes, not the
 * source upload. Callers can therefore use it for deterministic integrity
 * checks regardless of the source format or metadata.
 */
export async function optimizeFeedMediaImage(
  input: ArrayBuffer | Buffer | Uint8Array,
): Promise<OptimizedFeedMediaImage> {
  const source = toBuffer(input);
  const sourceFormat = detectSourceFormat(source);

  if (!sourceFormat) {
    throw optimizationError(
      "unsupported_format",
      "Feed media must be a JPEG, PNG, or WebP image.",
    );
  }

  const { default: sharp } = await import("sharp");
  const image = sharp(source, {
    failOn: "warning",
    limitInputPixels: feedMediaImageMaxInputPixels,
    sequentialRead: true,
  });
  let metadata: Metadata;

  try {
    metadata = await image.metadata();
  } catch (cause) {
    if (isPixelLimitFailure(cause)) {
      throw optimizationError(
        "pixel_limit_exceeded",
        "Feed media exceeds the safe pixel limit.",
        cause,
      );
    }

    throw optimizationError(
      "invalid_payload",
      "Feed media could not be decoded safely.",
      cause,
    );
  }

  validateMetadata(metadata, sourceFormat);

  let data: Buffer;
  let width: number;
  let height: number;

  try {
    const output = await image
      .rotate()
      .resize({
        fit: "inside",
        height: feedMediaImageMaxLongEdge,
        width: feedMediaImageMaxLongEdge,
        withoutEnlargement: true,
      })
      .webp({
        alphaQuality: feedMediaImageWebpAlphaQuality,
        effort: 4,
        quality: feedMediaImageWebpQuality,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true });

    data = output.data;
    width = output.info.width;
    height = output.info.height;
  } catch (cause) {
    throw optimizationError(
      "invalid_payload",
      "Feed media could not be normalized safely.",
      cause,
    );
  }

  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    Math.max(width, height) > feedMediaImageMaxLongEdge
  ) {
    throw optimizationError(
      "processing_failed",
      "Feed media normalization returned invalid dimensions.",
    );
  }

  return {
    byteSize: data.byteLength,
    data,
    extension: "webp",
    height,
    mimeType: "image/webp",
    sha256: createHash("sha256").update(data).digest("hex"),
    sourceByteSize: source.byteLength,
    sourceFormat,
    width,
  };
}

function validateMetadata(
  metadata: Metadata,
  sourceFormat: FeedMediaSourceImageFormat,
) {
  if (
    metadata.format !== sourceFormat ||
    !metadata.width ||
    !metadata.height ||
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height)
  ) {
    throw optimizationError(
      "invalid_payload",
      "Feed media content does not match a supported image payload.",
    );
  }

  if ((metadata.pages ?? 1) > 1) {
    throw optimizationError(
      "animated_image_not_supported",
      "Animated feed media is not supported.",
    );
  }

  if (metadata.width * metadata.height > feedMediaImageMaxInputPixels) {
    throw optimizationError(
      "pixel_limit_exceeded",
      "Feed media exceeds the safe pixel limit.",
    );
  }
}

function detectSourceFormat(input: Buffer): FeedMediaSourceImageFormat | null {
  if (
    input.length >= 3 &&
    input[0] === 0xff &&
    input[1] === 0xd8 &&
    input[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    input.length >= 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47 &&
    input[4] === 0x0d &&
    input[5] === 0x0a &&
    input[6] === 0x1a &&
    input[7] === 0x0a
  ) {
    return "png";
  }

  if (
    input.length >= 12 &&
    input.subarray(0, 4).equals(Buffer.from("RIFF", "ascii")) &&
    input.subarray(8, 12).equals(Buffer.from("WEBP", "ascii"))
  ) {
    return "webp";
  }

  return null;
}

function isPixelLimitFailure(error: unknown) {
  return (
    error instanceof Error && /pixel limit|exceeds.*pixels/i.test(error.message)
  );
}

function optimizationError(
  code: FeedMediaImageOptimizationFailureCode,
  message: string,
  cause?: unknown,
) {
  return new FeedMediaImageOptimizationError(code, message, { cause });
}

function toBuffer(input: ArrayBuffer | Buffer | Uint8Array) {
  if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));
  return Buffer.from(input);
}
