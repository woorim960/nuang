import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

await verifyPng("public/icons/nuang-app-store-icon-1024.png", 1024, 1024, {
  alphaAllowed: false,
});
await verifyPng(
  "public/images/store/nuang-google-play-icon-512.png",
  512,
  512,
  { alphaRequired: true, maximumBytes: 1024 * 1024 },
);
await verifyPng(
  "public/images/store/nuang-google-play-feature-graphic-1024x500.png",
  1024,
  500,
  { alphaAllowed: false },
);

if (errors.length > 0) {
  console.error("NUANG mobile store asset check failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("NUANG mobile store asset check passed");
console.log("- App Store icon: 1024x1024, opaque PNG");
console.log("- Google Play icon: 512x512, 32-bit PNG under 1 MB");
console.log("- Google Play feature graphic: 1024x500, opaque PNG");
console.log(
  "- screenshots intentionally remain a real-device release artifact",
);

async function verifyPng(path, width, height, options = {}) {
  try {
    const absolutePath = resolve(root, path);
    const [metadata, file] = await Promise.all([
      sharp(absolutePath).metadata(),
      stat(absolutePath),
    ]);
    assert(metadata.format === "png", `${path} must be PNG`);
    assert(
      metadata.width === width && metadata.height === height,
      `${path} must be ${width}x${height}`,
    );
    if (options.alphaAllowed === false) {
      assert(!metadata.hasAlpha, `${path} must not contain alpha`);
    }
    if (options.alphaRequired) {
      assert(metadata.hasAlpha, `${path} must contain an alpha channel`);
    }
    if (options.maximumBytes) {
      assert(
        file.size <= options.maximumBytes,
        `${path} must be at most ${options.maximumBytes} bytes`,
      );
    }
  } catch (error) {
    errors.push(
      `${path} is missing or invalid${error instanceof Error ? `: ${error.message}` : ""}`,
    );
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}
