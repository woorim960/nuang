import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const characterPath = resolve(
  root,
  "public/assets/characters/nuang-character-purple.webp",
);
const storeIconPath = resolve(
  root,
  "public/icons/nuang-app-store-icon-1024.png",
);
const storeAssetRoot = resolve(root, "public/images/store");
const mobileRoot = resolve(root, "mobile");
const canonicalStoreIcon = await sharp(storeIconPath)
  .resize(1024, 1024)
  .flatten({ background: "#f8f6fc" })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toBuffer();

await writePng(storeIconPath, canonicalStoreIcon);

await writePng(
  resolve(storeAssetRoot, "nuang-google-play-icon-512.png"),
  await sharp(canonicalStoreIcon)
    .resize(512, 512)
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

await writePng(
  resolve(storeAssetRoot, "nuang-google-play-feature-graphic-1024x500.png"),
  await createGooglePlayFeatureGraphic(),
);

await writePng(
  resolve(
    mobileRoot,
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  ),
  await sharp(canonicalStoreIcon)
    .resize(1024, 1024)
    .flatten({ background: "#f8f6fc" })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

const iosSplash = await createSplash(2732, 2732);
for (const filename of [
  "splash-2732x2732.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732-2.png",
]) {
  await writePng(
    resolve(
      mobileRoot,
      `ios/App/App/Assets.xcassets/Splash.imageset/${filename}`,
    ),
    iosSplash,
  );
}

const androidDensities = new Map([
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
]);

for (const [density, iconSize] of androidDensities) {
  const directory = resolve(
    mobileRoot,
    `android/app/src/main/res/mipmap-${density}`,
  );
  await mkdir(directory, { recursive: true });
  const launcher = await sharp(storeIconPath)
    .resize(iconSize, iconSize)
    .flatten({ background: "#f8f6fc" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await Promise.all([
    writePng(resolve(directory, "ic_launcher.png"), launcher),
    writePng(resolve(directory, "ic_launcher_round.png"), launcher),
    writePng(
      resolve(directory, "ic_launcher_foreground.png"),
      await createAndroidForeground(Math.round(iconSize * 2.25)),
    ),
  ]);
}

const splashDirectories = await listAndroidSplashDirectories();
for (const directory of splashDirectories) {
  const target = resolve(directory, "splash.png");
  const metadata = await sharp(target).metadata();
  if (!metadata.width || !metadata.height) continue;
  await writePng(target, await createSplash(metadata.width, metadata.height));
}

console.log("Generated NUANG native and Google Play listing assets.");

async function createGooglePlayFeatureGraphic() {
  const width = 1024;
  const height = 500;
  const characterInputs = await Promise.all(
    [
      ["nuang-character-water.webp", 154, 590, 222],
      ["nuang-character-purple.webp", 214, 405, 145],
      ["nuang-character-forest.webp", 154, 785, 238],
    ].map(async ([filename, size, left, top]) => ({
      input: await sharp(resolve(root, `public/assets/characters/${filename}`))
        .resize(size, size, { fit: "contain" })
        .png()
        .toBuffer(),
      left,
      top,
    })),
  );
  const background = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#F6F1FF" />
          <stop offset="1" stop-color="#EEE9FB" />
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="32" /></filter>
      </defs>
      <rect width="1024" height="500" fill="url(#bg)" />
      <circle cx="936" cy="-20" r="190" fill="#DCD0FA" opacity=".72" />
      <circle cx="700" cy="510" r="215" fill="#D7EDE6" opacity=".78" />
      <circle cx="470" cy="120" r="150" fill="#FFFFFF" opacity=".6" filter="url(#blur)" />
      <text x="72" y="190" fill="#2E2938" font-family="Arial, sans-serif" font-size="84" font-weight="800" letter-spacing="8">NUANG</text>
      <text x="76" y="252" fill="#5F586A" font-family="Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="2">DISCOVER YOUR WAY</text>
      <rect x="76" y="286" width="74" height="6" rx="3" fill="#7357C7" />
    </svg>
  `);

  return sharp(background)
    .composite(characterInputs)
    .flatten({ background: "#F3EEFC" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function createAndroidForeground(size) {
  const characterSize = Math.round(size * 0.58);
  const character = await sharp(characterPath)
    .resize(characterSize, characterSize, { fit: "contain" })
    .png()
    .toBuffer();
  return sharp({
    create: {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      channels: 4,
      height: size,
      width: size,
    },
  })
    .composite([
      {
        input: character,
        left: Math.round((size - characterSize) / 2),
        top: Math.round((size - characterSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function createSplash(width, height) {
  const shortestSide = Math.min(width, height);
  const characterSize = Math.round(shortestSide * 0.25);
  const character = await sharp(characterPath)
    .resize(characterSize, characterSize, { fit: "contain" })
    .png()
    .toBuffer();
  const wordmarkWidth = Math.round(shortestSide * 0.24);
  const wordmarkHeight = Math.max(44, Math.round(wordmarkWidth * 0.22));
  const wordmark = Buffer.from(`
    <svg width="${wordmarkWidth}" height="${wordmarkHeight}" viewBox="0 0 ${wordmarkWidth} ${wordmarkHeight}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="72%" text-anchor="middle" fill="#6247B8" font-family="Arial, sans-serif" font-size="${Math.round(wordmarkHeight * 0.72)}" font-weight="800" letter-spacing="${Math.round(wordmarkHeight * 0.12)}">NUANG</text>
    </svg>
  `);
  const stackHeight =
    characterSize + Math.round(shortestSide * 0.04) + wordmarkHeight;
  const stackTop = Math.max(0, Math.round((height - stackHeight) * 0.44));

  return sharp({
    create: {
      background: "#f8f6fc",
      channels: 4,
      height,
      width,
    },
  })
    .composite([
      {
        input: character,
        left: Math.round((width - characterSize) / 2),
        top: stackTop,
      },
      {
        input: wordmark,
        left: Math.round((width - wordmarkWidth) / 2),
        top: stackTop + characterSize + Math.round(shortestSide * 0.04),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function listAndroidSplashDirectories() {
  const resourceRoot = resolve(mobileRoot, "android/app/src/main/res");
  const entries = await readdir(resourceRoot, { withFileTypes: true });
  const candidates = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === "drawable" || entry.name.startsWith("drawable-")),
    )
    .map((entry) => resolve(resourceRoot, basename(entry.name)));
  const directories = [];
  for (const directory of candidates) {
    const files = await readdir(directory);
    if (files.includes("splash.png")) directories.push(directory);
  }
  return directories;
}

async function writePng(path, buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}
