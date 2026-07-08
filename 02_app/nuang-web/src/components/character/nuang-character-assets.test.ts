import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  nuangCharacterAssetPaths,
  nuangCharacterAssetSpec,
  nuangCharacterMotifs,
  nuangCharacterPixelSizes,
  nuangCharacterSizes,
} from "@/components/character/nuang-character-assets";

describe("nuangCharacterAssets", () => {
  it("covers every approved motif with a stable webp path", () => {
    expect(Object.keys(nuangCharacterAssetPaths).sort()).toEqual(
      [...nuangCharacterMotifs].sort(),
    );
    expect(new Set(Object.values(nuangCharacterAssetPaths)).size).toBe(
      nuangCharacterMotifs.length,
    );

    for (const path of Object.values(nuangCharacterAssetPaths)) {
      expect(path).toMatch(
        /^\/assets\/characters\/nuang-character-[a-z]+\.webp$/,
      );
    }
  });

  it("keeps the render sizes aligned with the current component contract", () => {
    expect(Object.keys(nuangCharacterPixelSizes).sort()).toEqual(
      [...nuangCharacterSizes].sort(),
    );
    expect(nuangCharacterPixelSizes).toEqual({
      sm: 56,
      md: 80,
      lg: 112,
    });
  });

  it("locks generated bitmap requirements before renderer migration", () => {
    expect(nuangCharacterAssetSpec).toEqual({
      background: "transparent",
      format: "webp",
      pixelSourceSize: 768,
      renderIntent: "decorative",
      source: "generated-bitmap",
    });
  });

  it("keeps generated project assets available under public", () => {
    for (const assetPath of Object.values(nuangCharacterAssetPaths)) {
      const absolutePath = path.join(process.cwd(), "public", assetPath);

      expect(existsSync(absolutePath)).toBe(true);
      expect(statSync(absolutePath).size).toBeGreaterThan(10_000);
    }
  });
});
