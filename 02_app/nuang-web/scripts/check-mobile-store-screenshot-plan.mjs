import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const plan = JSON.parse(
  await readFile(
    resolve(root, "config/mobile-store-screenshot-plan.json"),
    "utf8",
  ),
);
const errors = [];

assert(plan.schemaVersion === 1, "schemaVersion must be 1");
assert(plan.locale === "ko-KR", "initial screenshot locale must be ko-KR");
assert(
  plan.capturePolicy?.actualAppUiOnly === true,
  "screenshots must use actual app UI",
);
assert(
  plan.capturePolicy?.noProductionPersonalData === true,
  "screenshots must prohibit production personal data",
);
assert(
  plan.capturePolicy?.applePortraitSize?.width === 1320 &&
    plan.capturePolicy?.applePortraitSize?.height === 2868,
  "Apple primary screenshots must use an accepted 6.9-inch portrait size",
);
assert(
  plan.capturePolicy?.googlePortraitSize?.width === 1080 &&
    plan.capturePolicy?.googlePortraitSize?.height === 1920,
  "Google phone screenshots must use 1080x1920 portrait",
);
assert(
  Array.isArray(plan.scenes) &&
    plan.scenes.length >= 4 &&
    plan.scenes.length <= 8,
  "the initial plan must contain 4-8 reusable scenes",
);

const ids = new Set();
for (const [index, scene] of (plan.scenes ?? []).entries()) {
  assert(
    scene.order === index + 1,
    `scene ${scene.id ?? index} order must be sequential`,
  );
  assert(
    typeof scene.id === "string" && scene.id.length > 0,
    "each scene needs an id",
  );
  assert(!ids.has(scene.id), `duplicate scene id: ${scene.id}`);
  ids.add(scene.id);
  assert(
    scene.route?.startsWith("/"),
    `scene ${scene.id} needs an internal route`,
  );
  assert(scene.title?.length > 0, `scene ${scene.id} needs a Korean title`);
  assert(
    scene.requiredState?.length > 0,
    `scene ${scene.id} needs a deterministic state`,
  );
}

for (const requiredId of [
  "home",
  "core-result",
  "balance-game",
  "community",
  "my",
]) {
  assert(
    ids.has(requiredId),
    `required screenshot scene is missing: ${requiredId}`,
  );
}

if (errors.length > 0) {
  console.error("NUANG mobile screenshot plan check failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("NUANG mobile screenshot plan check passed");
console.log(`- ${plan.scenes.length} actual-app scenes defined`);
console.log("- Apple 1320x2868 and Google 1080x1920 capture sizes fixed");
console.log("- production personal data prohibited");

function assert(condition, message) {
  if (!condition) errors.push(message);
}
