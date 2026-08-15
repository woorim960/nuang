import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve("scripts/build-next-production.mjs"),
  "utf8",
);

test("production build uses the supported Next.js default compiler", () => {
  assert.match(
    source,
    /\[resolve\(root, "node_modules\/next\/dist\/bin\/next"\), "build"\]/,
  );
  assert.doesNotMatch(source, /--webpack/);
  assert.doesNotMatch(source, /--turbopack/);
});

test("production build preserves an explicit caller memory limit", () => {
  assert.match(
    source,
    /const inheritedNodeOptions = process\.env\.NODE_OPTIONS/,
  );
  assert.match(source, /--max-old-space-size=8192/);
  assert.match(
    source,
    /env: \{ \.\.\.process\.env, NODE_OPTIONS: nodeOptions \}/,
  );
});
