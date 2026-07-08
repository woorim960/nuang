import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scannedExtensions = new Set([
  ".json",
  ".md",
  ".ts",
  ".tsx",
]);

const skippedDirectories = new Set([
  ".next",
  "coverage",
  "node_modules",
]);

const skippedFiles = new Set([
  "src/lib/api/closed-state-data.ts",
  "src/features/copy/no-dev-term-copy.test.ts",
]);

const forbiddenPublicCopyPhrases = [
  "공식 seed",
  "seed preview",
  "비교 preview",
  "커뮤니티 preview",
  "로컬 preview",
  "카드 preview",
  "탐색 prompt",
  "대화 prompt",
  "해석 prompt",
  "소개 prompt",
  "pre-credential QA",
  "route smoke",
  "Google·Kakao Supabase Auth",
  "result claim",
  "read-only",
  "Supabase credential",
  "DB migration",
  "URL/key",
] as const;

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

describe("user-facing copy developer term guard", () => {
  it("keeps previously removed developer terms out of source copy", () => {
    const roots = ["src", "content-seed"].map((root) =>
      path.join(process.cwd(), root),
    );
    const offenders = roots
      .flatMap(listScannableFiles)
      .flatMap((file) => {
        const relativePath = path.relative(process.cwd(), file);
        if (relativePath.includes(".test.")) return [];
        if (skippedFiles.has(relativePath)) return [];

        const text = readFileSync(file, "utf8");

        return forbiddenPublicCopyPhrases
          .filter((phrase) => text.includes(phrase))
          .map((phrase) => `${relativePath}: ${phrase}`);
      });

    expect(offenders).toEqual([]);
  });
});
