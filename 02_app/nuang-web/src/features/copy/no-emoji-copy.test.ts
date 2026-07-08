import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scannedExtensions = new Set([
  ".css",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);

const skippedDirectories = new Set([
  ".next",
  "coverage",
  "node_modules",
]);

const emojiPattern = /[\u{1f000}-\u{1faff}\u{2600}-\u{27bf}]/u;

function listScannableFiles(root: string): string[] {
  if (!existsSync(root)) return [];

  return readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (skippedDirectories.has(entry)) return [];
      return listScannableFiles(fullPath);
    }

    if (!stat.isFile()) return [];
    if (!scannedExtensions.has(path.extname(entry))) return [];

    return [fullPath];
  });
}

describe("user-facing copy emoji guard", () => {
  it("keeps app source and content seeds free of emoji glyphs", () => {
    const roots = ["src", "content-seed"].map((root) =>
      path.join(process.cwd(), root),
    );
    const offenders = roots
      .flatMap(listScannableFiles)
      .flatMap((file) => {
        const text = readFileSync(file, "utf8");
        if (!emojiPattern.test(text)) return [];

        return [path.relative(process.cwd(), file)];
      });

    expect(offenders).toEqual([]);
  });
});
