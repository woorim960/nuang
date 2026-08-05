import { describe, expect, it } from "vitest";
import {
  maxFeedPhotoBytes,
  maxFeedPhotoTotalBytes,
  validateFeedPhotoFiles,
} from "@/features/feed/feed-media";

describe("feed photo validation", () => {
  it("accepts supported photos within the MVP limits", () => {
    expect(
      validateFeedPhotoFiles([
        new File(["photo"], "walk.webp", { type: "image/webp" }),
      ]),
    ).toBeNull();
  });

  it("rejects unsupported or oversized files before upload", () => {
    expect(
      validateFeedPhotoFiles([
        new File(["gif"], "animated.gif", { type: "image/gif" }),
      ]),
    ).toContain("JPG");

    const largeFile = new File(
      [new Uint8Array(maxFeedPhotoBytes + 1)],
      "large.jpg",
      {
        type: "image/jpeg",
      },
    );
    expect(validateFeedPhotoFiles([largeFile])).toContain("4MB");
  });

  it("keeps the complete multipart upload below the hosting payload limit", () => {
    const half = Math.floor(maxFeedPhotoTotalBytes / 2) + 1;
    const photos = ["one.jpg", "two.jpg"].map(
      (name) => new File([new Uint8Array(half)], name, { type: "image/jpeg" }),
    );

    expect(validateFeedPhotoFiles(photos)).toContain("모두 합쳐 4MB");
  });
});
