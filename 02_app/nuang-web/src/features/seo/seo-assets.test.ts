import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("NUANG search and app image assets", () => {
  it.each([
    ["src/app/icon.png", 512, 512, 5_000],
    ["src/app/apple-icon.png", 180, 180, 5_000],
    ["public/icons/nuang-favicon-48.png", 48, 48, 1_000],
    ["public/icons/nuang-favicon-96.png", 96, 96, 2_000],
    ["public/icons/nuang-icon-192.png", 192, 192, 5_000],
    ["public/icons/nuang-icon-512.png", 512, 512, 5_000],
    ["public/icons/nuang-maskable-icon-512.png", 512, 512, 5_000],
    ["public/images/seo/nuang-personality-social-v1.png", 1200, 630, 5_000],
  ])(
    "keeps %s at the declared dimensions",
    async (file, width, height, minimumBytes) => {
      const filePath = path.join(projectRoot, file);
      const [metadata, details] = await Promise.all([
        sharp(filePath).metadata(),
        stat(filePath),
      ]);

      expect(metadata.width).toBe(width);
      expect(metadata.height).toBe(height);
      expect(details.size).toBeGreaterThan(minimumBytes);
    },
  );

  it("keeps a multi-size ICO at the stable root favicon URL", async () => {
    const favicon = await readFile(
      path.join(projectRoot, "src/app/favicon.ico"),
    );

    expect(favicon.readUInt16LE(0)).toBe(0);
    expect(favicon.readUInt16LE(2)).toBe(1);
    expect(favicon.readUInt16LE(4)).toBe(3);
  });
});
