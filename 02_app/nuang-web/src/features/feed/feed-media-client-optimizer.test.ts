import { describe, expect, it, vi } from "vitest";
import {
  maxFeedPhotoSourceBytes,
  maxFeedPhotoSourcePixels,
  maxFeedPhotoSourceTotalBytes,
  prepareFeedMediaFiles,
  type FeedMediaClientOptimizerAdapter,
} from "@/features/feed/feed-media-client-optimizer";

describe("feed media client optimizer", () => {
  it("decodes files sequentially and prepares 1600px WebP images at transport quality 90", async () => {
    let activeDecodes = 0;
    let maximumActiveDecodes = 0;
    const encodeCalls: Array<{
      fileName: string;
      height: number;
      quality: number;
      width: number;
    }> = [];
    const adapter: FeedMediaClientOptimizerAdapter = {
      supported: true,
      async decode(file) {
        activeDecodes += 1;
        maximumActiveDecodes = Math.max(maximumActiveDecodes, activeDecodes);
        await Promise.resolve();
        return {
          close() {
            activeDecodes -= 1;
          },
          async encodeWebp({ height, quality, width }) {
            encodeCalls.push({
              fileName: file.name,
              height,
              quality,
              width,
            });
            return webpBlob(180 * 1024);
          },
          height: 3_000,
          width: 4_000,
        };
      },
    };
    const files = [
      sizedFile("first.jpg", "image/jpeg", 8 * 1024 * 1024),
      sizedFile("second.png", "image/png", 4 * 1024 * 1024),
    ];

    const result = await prepareFeedMediaFiles(files, { adapter });

    expect(maximumActiveDecodes).toBe(1);
    expect(encodeCalls).toEqual([
      {
        fileName: "first.jpg",
        height: 1_200,
        quality: 0.9,
        width: 1_600,
      },
      {
        fileName: "second.png",
        height: 1_200,
        quality: 0.9,
        width: 1_600,
      },
    ]);
    expect(result.mode).toBe("optimized");
    expect(result.files.map((file) => file.name)).toEqual([
      "feed-photo-1.webp",
      "feed-photo-2.webp",
    ]);
    expect(result.files.every((file) => file.type === "image/webp")).toBe(true);
    expect(result.outputBytes).toBe(360 * 1024);
  });

  it("keeps every photo at 1600px quality 90 when the high-quality batch already fits", async () => {
    const files = [
      sizedFile("detailed.jpg", "image/jpeg", 12 * 1024 * 1024),
      sizedFile("simple.png", "image/png", 2 * 1024 * 1024),
    ];
    const encodeCalls: number[][] = [[], []];
    const adapter = adapterFor(files, ({ fileIndex, quality }) => {
      encodeCalls[fileIndex].push(quality);
      return webpBlob(fileIndex === 0 ? 3 * 1024 * 1024 : 512 * 1024);
    });

    const result = await prepareFeedMediaFiles(files, { adapter });

    expect(result.outputBytes).toBe(3.5 * 1024 * 1024);
    expect(encodeCalls).toEqual([[0.9], [0.9]]);
  });

  it("steps down dimensions and quality until the complete batch fits 4 MiB", async () => {
    const encodeCalls: number[][] = [[], []];
    const files = [
      sizedFile("one.jpg", "image/jpeg", 10 * 1024 * 1024),
      sizedFile("two.jpg", "image/jpeg", 10 * 1024 * 1024),
    ];
    const adapter = adapterFor(files, ({ fileIndex, quality }) => {
      encodeCalls[fileIndex].push(quality);
      return webpBlob(quality === 0.9 ? 2.5 * 1024 * 1024 : 1.8 * 1024 * 1024);
    });

    const result = await prepareFeedMediaFiles(files, { adapter });

    expect(encodeCalls).toEqual([
      [0.9, 0.87],
      [0.9, 0.87],
    ]);
    expect(result.outputBytes).toBeLessThanOrEqual(4 * 1024 * 1024);
  });

  it("returns a typed error instead of reducing every photo below the minimum profile", async () => {
    const file = sizedFile("detailed.jpg", "image/jpeg", 20 * 1024 * 1024);
    const adapter = adapterFor([file], () => webpBlob(4 * 1024 * 1024 + 1));

    await expect(
      prepareFeedMediaFiles([file], { adapter }),
    ).rejects.toMatchObject({
      code: "transport_budget_exceeded",
    });
  });

  it("rejects decoded images above 40 MP and always closes the bitmap", async () => {
    const close = vi.fn();
    const encodeWebp = vi.fn();
    const adapter: FeedMediaClientOptimizerAdapter = {
      supported: true,
      decode: vi.fn(async () => ({
        close,
        encodeWebp,
        height: 5_001,
        width: Math.floor(maxFeedPhotoSourcePixels / 5_000),
      })),
    };

    await expect(
      prepareFeedMediaFiles([sizedFile("huge.png", "image/png", 1024)], {
        adapter,
      }),
    ).rejects.toMatchObject({ code: "pixel_limit_exceeded" });
    expect(encodeWebp).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it("uses original files only when browser optimization is unavailable and the legacy transport contract already fits", async () => {
    const smallFiles = [
      sizedFile("small.jpg", "image/jpeg", 2 * 1024 * 1024),
      sizedFile("small.webp", "image/webp", 1024 * 1024),
    ];
    const unsupportedAdapter: FeedMediaClientOptimizerAdapter = {
      supported: false,
      decode: vi.fn(),
    };

    const fallback = await prepareFeedMediaFiles(smallFiles, {
      adapter: unsupportedAdapter,
    });

    expect(fallback.mode).toBe("original_fallback");
    expect(fallback.files).toEqual(smallFiles);
    await expect(
      prepareFeedMediaFiles(
        [sizedFile("large.jpg", "image/jpeg", 5 * 1024 * 1024)],
        { adapter: unsupportedAdapter },
      ),
    ).rejects.toMatchObject({ code: "browser_unsupported" });
  });

  it("accepts browser-decodable HEIC sources but never sends an HEIC original as fallback", async () => {
    const heic = sizedFile("portrait.heic", "image/heic", 2 * 1024 * 1024);
    const adapter = adapterFor([heic], () => webpBlob(320 * 1024));

    const optimized = await prepareFeedMediaFiles([heic], { adapter });

    expect(optimized.mode).toBe("optimized");
    expect(optimized.files[0]).toMatchObject({ type: "image/webp" });
    await expect(
      prepareFeedMediaFiles([heic], {
        adapter: { decode: vi.fn(), supported: false },
      }),
    ).rejects.toMatchObject({ code: "browser_unsupported" });
  });

  it("validates the 25 MiB per-file and 150 MiB source-batch safety limits before decoding", async () => {
    const decode = vi.fn();
    const adapter: FeedMediaClientOptimizerAdapter = {
      supported: true,
      decode,
    };

    await expect(
      prepareFeedMediaFiles(
        [sizedFile("oversized.jpg", "image/jpeg", maxFeedPhotoSourceBytes + 1)],
        { adapter },
      ),
    ).rejects.toMatchObject({ code: "source_file_too_large" });
    await expect(
      prepareFeedMediaFiles(
        Array.from({ length: 7 }, (_, index) =>
          sizedFile(
            `${index}.jpg`,
            "image/jpeg",
            Math.floor(maxFeedPhotoSourceTotalBytes / 7) + 1,
          ),
        ),
        { adapter },
      ),
    ).rejects.toMatchObject({ code: "source_total_too_large" });
    expect(decode).not.toHaveBeenCalled();
  });
});

function adapterFor(
  files: File[],
  encode: (input: {
    fileIndex: number;
    height: number;
    quality: number;
    width: number;
  }) => Blob,
): FeedMediaClientOptimizerAdapter {
  return {
    supported: true,
    async decode(file) {
      const fileIndex = files.indexOf(file);
      if (fileIndex < 0) throw new Error("Unexpected test file");
      return {
        close: vi.fn(),
        async encodeWebp({ height, quality, width }) {
          return encode({ fileIndex, height, quality, width });
        },
        height: 3_000,
        width: 4_000,
      };
    },
  };
}

function sizedFile(name: string, type: string, size: number) {
  const file = new File(["source"], name, { type });
  Object.defineProperty(file, "size", { configurable: true, value: size });
  return file;
}

function webpBlob(size: number) {
  return new Blob([new Uint8Array(size)], { type: "image/webp" });
}
