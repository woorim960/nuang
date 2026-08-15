import {
  isSupportedFeedPhotoType,
  maxFeedPhotoCount,
  maxFeedPhotoTotalBytes,
  validateFeedPhotoFiles,
} from "@/features/feed/feed-media";

export const maxFeedPhotoSourceBytes = 25 * 1024 * 1024;
export const maxFeedPhotoSourceTotalBytes = 150 * 1024 * 1024;
export const maxFeedPhotoSourcePixels = 40_000_000;

const optimizationProfiles = [
  { maxLongEdge: 1_600, quality: 0.9 },
  { maxLongEdge: 1_440, quality: 0.87 },
  { maxLongEdge: 1_280, quality: 0.84 },
  { maxLongEdge: 1_120, quality: 0.8 },
  { maxLongEdge: 960, quality: 0.76 },
] as const;

const clientOnlyFeedPhotoTypes = ["image/heic", "image/heif"] as const;

export type FeedMediaClientOptimizationErrorCode =
  | "browser_unsupported"
  | "encoding_failed"
  | "image_decode_failed"
  | "invalid_dimensions"
  | "pixel_limit_exceeded"
  | "source_file_invalid"
  | "source_file_too_large"
  | "source_total_too_large"
  | "too_many_files"
  | "transport_budget_exceeded"
  | "unsupported_type";

export class FeedMediaClientOptimizationError extends Error {
  readonly code: FeedMediaClientOptimizationErrorCode;

  constructor(code: FeedMediaClientOptimizationErrorCode, message: string) {
    super(message);
    this.name = "FeedMediaClientOptimizationError";
    this.code = code;
  }
}

export type FeedMediaClientDecodedImage = {
  close(): void;
  encodeWebp(input: {
    height: number;
    quality: number;
    width: number;
  }): Promise<Blob | null>;
  height: number;
  width: number;
};

export type FeedMediaClientOptimizerAdapter = {
  decode(file: File): Promise<FeedMediaClientDecodedImage>;
  supported: boolean;
};

export type PreparedFeedMediaBatch = {
  files: File[];
  mode: "optimized" | "original_fallback";
  outputBytes: number;
  sourceBytes: number;
};

type PrepareFeedMediaOptions = {
  adapter?: FeedMediaClientOptimizerAdapter;
};

class BrowserOptimizationUnsupportedError extends Error {}

export async function prepareFeedMediaFiles(
  files: File[],
  { adapter = createBrowserOptimizerAdapter() }: PrepareFeedMediaOptions = {},
): Promise<PreparedFeedMediaBatch> {
  validateSourceFiles(files);
  const sourceBytes = totalBytes(files);

  if (files.length === 0) {
    return { files: [], mode: "optimized", outputBytes: 0, sourceBytes: 0 };
  }

  if (!adapter.supported) {
    return originalFallbackOrThrow(files, sourceBytes);
  }

  try {
    const preparedFiles = await optimizeSequentially(files, adapter);
    const outputBytes = totalBytes(preparedFiles);

    if (
      outputBytes > maxFeedPhotoTotalBytes ||
      validateFeedPhotoFiles(preparedFiles)
    ) {
      throw optimizationError(
        "transport_budget_exceeded",
        "Prepared feed media exceeds the safe transport budget.",
      );
    }

    return {
      files: preparedFiles,
      mode: "optimized",
      outputBytes,
      sourceBytes,
    };
  } catch (error) {
    if (error instanceof BrowserOptimizationUnsupportedError) {
      return originalFallbackOrThrow(files, sourceBytes);
    }
    if (error instanceof FeedMediaClientOptimizationError) throw error;
    throw optimizationError(
      "encoding_failed",
      "Feed media could not be prepared in this browser.",
    );
  }
}

export function getFeedMediaClientOptimizationMessage(error: unknown) {
  if (!(error instanceof FeedMediaClientOptimizationError)) {
    return "사진을 준비하지 못했어요. 다른 사진으로 다시 시도해 주세요.";
  }

  switch (error.code) {
    case "too_many_files":
      return `사진은 최대 ${maxFeedPhotoCount}장까지 올릴 수 있어요.`;
    case "unsupported_type":
      return "JPG, PNG, WEBP, HEIC, HEIF 사진만 올릴 수 있어요.";
    case "source_file_invalid":
      return "내용이 없는 사진은 올릴 수 없어요.";
    case "source_file_too_large":
      return "원본 사진 한 장의 크기는 25MB 이하여야 해요.";
    case "source_total_too_large":
      return "선택한 원본 사진은 모두 합쳐 150MB 이하여야 해요.";
    case "pixel_limit_exceeded":
      return "해상도가 너무 큰 사진이 있어요. 4천만 화소 이하 사진을 선택해 주세요.";
    case "browser_unsupported":
      return "이 브라우저에서는 선택한 사진을 업로드용으로 준비할 수 없어요. JPG, PNG, WEBP로 바꾸거나 최신 브라우저에서 다시 시도해 주세요.";
    case "transport_budget_exceeded":
      return "사진을 충분한 화질로 줄이지 못했어요. 사진 수를 줄이거나 다른 사진을 선택해 주세요.";
    case "image_decode_failed":
    case "invalid_dimensions":
      return "읽을 수 없는 사진이 있어요. 다른 사진을 선택해 주세요.";
    case "encoding_failed":
      return "사진을 준비하지 못했어요. 다른 사진으로 다시 시도해 주세요.";
  }
}

async function optimizeSequentially(
  files: File[],
  adapter: FeedMediaClientOptimizerAdapter,
) {
  const preparedFiles = new Array<File>(files.length);
  const initialProfile = optimizationProfiles[0];

  for (const [index, file] of files.entries()) {
    preparedFiles[index] = await optimizeOneFile({
      adapter,
      file,
      index,
      profiles: [initialProfile],
      targetBytes: Number.POSITIVE_INFINITY,
    });
  }

  if (totalBytes(preparedFiles) <= maxFeedPhotoTotalBytes) {
    return preparedFiles;
  }

  const weights = preparedFiles.map((file) =>
    Math.sqrt(Math.max(1, file.size)),
  );
  const orderedIndexes = preparedFiles
    .map((_, index) => index)
    .sort(
      (left, right) =>
        preparedFiles[left].size - preparedFiles[right].size || left - right,
    );
  let remainingBudget = maxFeedPhotoTotalBytes;
  let remainingWeight = weights.reduce((total, weight) => total + weight, 0);

  for (const index of orderedIndexes) {
    if (remainingBudget <= 0) {
      throw optimizationError(
        "transport_budget_exceeded",
        "Feed media cannot fit the safe transport budget.",
      );
    }

    const weight = weights[index];
    const targetBytes = Math.max(
      1,
      Math.floor(
        (remainingBudget * weight) / Math.max(weight, remainingWeight),
      ),
    );
    const initialFile = preparedFiles[index];

    if (initialFile.size > targetBytes) {
      const downgradedFile = await optimizeOneFile({
        adapter,
        file: files[index],
        index,
        profiles: optimizationProfiles.slice(1),
        targetBytes,
      });
      if (downgradedFile.size < initialFile.size) {
        preparedFiles[index] = downgradedFile;
      }
    }

    remainingBudget -= preparedFiles[index].size;
    remainingWeight -= weight;
  }

  return preparedFiles;
}

async function optimizeOneFile({
  adapter,
  file,
  index,
  profiles,
  targetBytes,
}: {
  adapter: FeedMediaClientOptimizerAdapter;
  file: File;
  index: number;
  profiles: ReadonlyArray<{ maxLongEdge: number; quality: number }>;
  targetBytes: number;
}) {
  let decoded: FeedMediaClientDecodedImage;
  try {
    decoded = await adapter.decode(file);
  } catch (error) {
    if (error instanceof BrowserOptimizationUnsupportedError) throw error;
    throw optimizationError(
      "image_decode_failed",
      "Feed media could not be decoded by this browser.",
    );
  }

  try {
    validateDecodedDimensions(decoded.width, decoded.height);
    let selectedBlob: Blob | null = null;

    for (const profile of profiles) {
      const dimensions = fitWithinLongEdge({
        height: decoded.height,
        maxLongEdge: profile.maxLongEdge,
        width: decoded.width,
      });
      let candidate: Blob | null;
      try {
        candidate = await decoded.encodeWebp({
          ...dimensions,
          quality: profile.quality,
        });
      } catch (error) {
        if (error instanceof BrowserOptimizationUnsupportedError) throw error;
        throw optimizationError(
          "encoding_failed",
          "Feed media could not be encoded safely.",
        );
      }

      if (!candidate || candidate.type !== "image/webp") {
        throw new BrowserOptimizationUnsupportedError(
          "The browser cannot encode WebP images.",
        );
      }
      if (candidate.size <= 0) {
        throw optimizationError(
          "encoding_failed",
          "Feed media encoding returned an empty image.",
        );
      }

      selectedBlob = candidate;
      if (candidate.size <= targetBytes) break;
    }

    if (!selectedBlob) {
      throw optimizationError(
        "encoding_failed",
        "Feed media encoding returned no image.",
      );
    }

    return new File([selectedBlob], `feed-photo-${index + 1}.webp`, {
      lastModified: file.lastModified,
      type: "image/webp",
    });
  } finally {
    decoded.close();
  }
}

function validateSourceFiles(files: File[]) {
  if (files.length > maxFeedPhotoCount) {
    throw optimizationError(
      "too_many_files",
      "Too many feed media source files were selected.",
    );
  }
  if (files.some((file) => !isSupportedClientFeedPhotoType(file.type))) {
    throw optimizationError(
      "unsupported_type",
      "Feed media source type is unsupported.",
    );
  }
  if (files.some((file) => file.size <= 0)) {
    throw optimizationError(
      "source_file_invalid",
      "Feed media source file is empty.",
    );
  }
  if (files.some((file) => file.size > maxFeedPhotoSourceBytes)) {
    throw optimizationError(
      "source_file_too_large",
      "A feed media source file exceeds 25 MiB.",
    );
  }
  if (totalBytes(files) > maxFeedPhotoSourceTotalBytes) {
    throw optimizationError(
      "source_total_too_large",
      "Feed media source files exceed 150 MiB in total.",
    );
  }
}

function validateDecodedDimensions(width: number, height: number) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw optimizationError(
      "invalid_dimensions",
      "Feed media decoded dimensions are invalid.",
    );
  }
  if (width * height > maxFeedPhotoSourcePixels) {
    throw optimizationError(
      "pixel_limit_exceeded",
      "Feed media exceeds the 40 MP decoded pixel limit.",
    );
  }
}

function fitWithinLongEdge({
  height,
  maxLongEdge,
  width,
}: {
  height: number;
  maxLongEdge: number;
  width: number;
}) {
  const scale = Math.min(1, maxLongEdge / Math.max(width, height));
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function originalFallbackOrThrow(files: File[], sourceBytes: number) {
  if (!validateFeedPhotoFiles(files)) {
    return {
      files: [...files],
      mode: "original_fallback",
      outputBytes: sourceBytes,
      sourceBytes,
    } satisfies PreparedFeedMediaBatch;
  }

  throw optimizationError(
    "browser_unsupported",
    "The browser cannot optimize media that exceeds the transport contract.",
  );
}

function isSupportedClientFeedPhotoType(type: string) {
  return (
    isSupportedFeedPhotoType(type) ||
    clientOnlyFeedPhotoTypes.some((supportedType) => supportedType === type)
  );
}

function createBrowserOptimizerAdapter(): FeedMediaClientOptimizerAdapter {
  const supported =
    typeof document !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.toBlob === "function";

  return {
    supported,
    async decode(file) {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch (firstError) {
        if (firstError instanceof TypeError) {
          try {
            bitmap = await createImageBitmap(file);
          } catch (cause) {
            throw classifyBrowserDecodeFailure(cause);
          }
        } else {
          throw classifyBrowserDecodeFailure(firstError);
        }
      }

      return {
        close: () => bitmap.close(),
        encodeWebp: async ({ height, quality, width }) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { alpha: true });
          if (!context) {
            throw new BrowserOptimizationUnsupportedError(
              "The browser cannot create a 2D canvas.",
            );
          }
          context.drawImage(bitmap, 0, 0, width, height);
          return new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/webp", quality);
          });
        },
        height: bitmap.height,
        width: bitmap.width,
      };
    },
  };
}

function classifyBrowserDecodeFailure(error: unknown) {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "NotSupportedError"
  ) {
    return new BrowserOptimizationUnsupportedError(
      "The browser cannot decode this supported image type.",
    );
  }
  return optimizationError(
    "image_decode_failed",
    "Feed media could not be decoded by this browser.",
  );
}

function optimizationError(
  code: FeedMediaClientOptimizationErrorCode,
  message: string,
) {
  return new FeedMediaClientOptimizationError(code, message);
}

function totalBytes(files: ArrayLike<{ size: number }>) {
  return Array.from(files).reduce((total, file) => total + file.size, 0);
}
