import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  FeedMediaImageOptimizationError,
  feedMediaImageMaxInputPixels,
  feedMediaImageMaxLongEdge,
  optimizeFeedMediaImage,
} from "@/features/feed/feed-media-image-optimizer";

describe("optimizeFeedMediaImage", () => {
  it("keeps a small JPEG at its original dimensions and returns integrity metadata", async () => {
    const source = await sharp({
      create: {
        background: "#8b5cf6",
        channels: 3,
        height: 180,
        width: 320,
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await optimizeFeedMediaImage(source);
    const metadata = await sharp(result.data).metadata();

    expect(result).toMatchObject({
      byteSize: result.data.byteLength,
      extension: "webp",
      height: 180,
      mimeType: "image/webp",
      sourceByteSize: source.byteLength,
      sourceFormat: "jpeg",
      width: 320,
    });
    expect(result.sha256).toBe(
      createHash("sha256").update(result.data).digest("hex"),
    );
    expect(result.data.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(result.data.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(metadata.format).toBe("webp");
  });

  it("shrinks only the long edge to 1600 pixels", async () => {
    const source = await sharp({
      create: {
        background: "#f59e0b",
        channels: 3,
        height: 1_200,
        width: 2_400,
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeFeedMediaImage(source);

    expect(result.width).toBe(feedMediaImageMaxLongEdge);
    expect(result.height).toBe(800);
    expect(result.sourceFormat).toBe("png");
  });

  it("applies EXIF orientation and strips EXIF and profile metadata", async () => {
    const source = await sharp({
      create: {
        background: "#0ea5e9",
        channels: 3,
        height: 20,
        width: 40,
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await optimizeFeedMediaImage(source);
    const metadata = await sharp(result.data).metadata();

    expect(result.width).toBe(20);
    expect(result.height).toBe(40);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.hasProfile).toBe(false);
  });

  it("preserves transparency while converting PNG to WebP", async () => {
    const source = await sharp({
      create: {
        background: { alpha: 0.5, b: 220, g: 110, r: 40 },
        channels: 4,
        height: 24,
        width: 32,
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeFeedMediaImage(source);
    const metadata = await sharp(result.data).metadata();
    const raw = await sharp(result.data).ensureAlpha().raw().toBuffer();

    expect(metadata.hasAlpha).toBe(true);
    expect(raw[3]).toBeGreaterThan(0);
    expect(raw[3]).toBeLessThan(255);
  });

  it("rejects source dimensions above the 40 megapixel guard", async () => {
    const width = 8_001;
    const height = Math.floor(feedMediaImageMaxInputPixels / width) + 1;
    const source = await sharp({
      create: {
        background: "#ffffff",
        channels: 3,
        height,
        width,
      },
    })
      .jpeg({ quality: 1 })
      .toBuffer();

    await expectOptimizationFailure(
      optimizeFeedMediaImage(source),
      "pixel_limit_exceeded",
    );
  });

  it("rejects corrupted data even when it begins with a JPEG signature", async () => {
    const corrupted = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    await expectOptimizationFailure(
      optimizeFeedMediaImage(corrupted),
      "invalid_payload",
    );
  });

  it("rejects unsupported image signatures before decoding", async () => {
    const gifHeader = Buffer.from("GIF89a", "ascii");

    await expectOptimizationFailure(
      optimizeFeedMediaImage(gifHeader),
      "unsupported_format",
    );
  });

  it("rejects animated WebP payloads", async () => {
    const width = 8;
    const frameHeight = 8;
    const frameCount = 2;
    const channels = 4;
    const pixels = Buffer.alloc(width * frameHeight * frameCount * channels);
    const frameByteSize = width * frameHeight * channels;
    for (let offset = 0; offset < pixels.byteLength; offset += channels) {
      const firstFrame = offset < frameByteSize;
      pixels[offset] = firstFrame ? 255 : 0;
      pixels[offset + 1] = firstFrame ? 0 : 255;
      pixels[offset + 2] = 0;
      pixels[offset + 3] = 255;
    }
    const source = await sharp(pixels, {
      raw: {
        channels,
        height: frameHeight * frameCount,
        pageHeight: frameHeight,
        width,
      },
    })
      .webp({ delay: [100, 100], loop: 0 })
      .toBuffer();

    await expectOptimizationFailure(
      optimizeFeedMediaImage(source),
      "animated_image_not_supported",
    );
  });
});

async function expectOptimizationFailure(
  promise: Promise<unknown>,
  code: FeedMediaImageOptimizationError["code"],
) {
  try {
    await promise;
    throw new Error("Expected feed media optimization to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(FeedMediaImageOptimizationError);
    expect((error as FeedMediaImageOptimizationError).code).toBe(code);
  }
}
