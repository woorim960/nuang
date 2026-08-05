import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const characterDirectory = resolve(root, "public/assets/characters");
const publicIconDirectory = resolve(root, "public/icons");
const seoImageDirectory = resolve(root, "public/images/seo");
const appDirectory = resolve(root, "src/app");

await Promise.all([
  mkdir(publicIconDirectory, { recursive: true }),
  mkdir(seoImageDirectory, { recursive: true }),
]);

const appIcon = await createAppIcon();
const iconSizes = [16, 32, 48, 96, 128, 180, 192, 512];
const iconBuffers = new Map();

for (const size of iconSizes) {
  iconBuffers.set(
    size,
    await sharp(appIcon)
      .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      // Next.js decodes PNG-compressed ICO entries as RGBA. Keeping every
      // derivative in true color also prevents browsers from re-quantizing
      // the small character mark differently across icon surfaces.
      .ensureAlpha()
      .png({ compressionLevel: 9, palette: false })
      .toBuffer(),
  );
}

await Promise.all([
  writeFile(resolve(appDirectory, "icon.png"), iconBuffers.get(512)),
  writeFile(resolve(appDirectory, "apple-icon.png"), iconBuffers.get(180)),
  writeFile(
    resolve(appDirectory, "favicon.ico"),
    createPngIco([16, 32, 48].map((size) => iconBuffers.get(size))),
  ),
  writeFile(
    resolve(publicIconDirectory, "nuang-favicon-48.png"),
    iconBuffers.get(48),
  ),
  writeFile(
    resolve(publicIconDirectory, "nuang-favicon-96.png"),
    iconBuffers.get(96),
  ),
  writeFile(
    resolve(publicIconDirectory, "nuang-app-icon-128.png"),
    iconBuffers.get(128),
  ),
  writeFile(
    resolve(publicIconDirectory, "nuang-icon-192.png"),
    iconBuffers.get(192),
  ),
  writeFile(
    resolve(publicIconDirectory, "nuang-icon-512.png"),
    iconBuffers.get(512),
  ),
  writeFile(
    resolve(publicIconDirectory, "nuang-maskable-icon-512.png"),
    await createMaskableIcon(),
  ),
  writeFile(
    resolve(seoImageDirectory, "nuang-personality-social-v1.png"),
    await createSocialImage(),
  ),
]);

console.log(
  "Generated NUANG favicon, app icon, manifest icon, and SEO image assets.",
);

async function createAppIcon() {
  const character = await sharp(
    resolve(characterDirectory, "nuang-character-purple.webp"),
  )
    .resize(398, 398, { fit: "contain" })
    .png()
    .toBuffer();
  const background = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="70" y1="30" x2="430" y2="480" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFFDFE"/>
          <stop offset="1" stop-color="#EEE7FF"/>
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="488" height="488" rx="132" fill="url(#bg)" stroke="#D7CAFA" stroke-width="12"/>
      <ellipse cx="256" cy="421" rx="132" ry="28" fill="#7151D6" fill-opacity="0.10"/>
    </svg>
  `);

  return sharp({
    create: {
      background: "#f7f4fe",
      channels: 4,
      height: 512,
      width: 512,
    },
  })
    .composite([
      { input: background, left: 0, top: 0 },
      { input: character, left: 57, top: 60 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function createMaskableIcon() {
  const character = await sharp(
    resolve(characterDirectory, "nuang-character-purple.webp"),
  )
    .resize(332, 332, { fit: "contain" })
    .png()
    .toBuffer();
  const background = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="0" cy="0" r="1" gradientTransform="translate(190 150) rotate(45) scale(500)">
          <stop stop-color="#FFFFFF"/>
          <stop offset="1" stop-color="#E8DFFF"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg)"/>
      <circle cx="256" cy="256" r="194" fill="#FFFFFF" fill-opacity="0.58"/>
    </svg>
  `);

  return sharp({
    create: {
      background: "#eee7ff",
      channels: 4,
      height: 512,
      width: 512,
    },
  })
    .composite([
      { input: background, left: 0, top: 0 },
      { input: character, left: 90, top: 92 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function createSocialImage() {
  const [purple, forest, sun] = await Promise.all([
    prepareSocialCharacter("nuang-character-purple.webp", 292),
    prepareSocialCharacter("nuang-character-forest.webp", 312),
    prepareSocialCharacter("nuang-character-sun.webp", 260),
  ]);
  const copyLayer = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="80" y1="20" x2="1140" y2="610" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FBF9FF"/>
          <stop offset="1" stop-color="#EEE8FF"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#4B357F" flood-opacity="0.10"/>
        </filter>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <circle cx="1115" cy="92" r="120" fill="#FFFFFF" fill-opacity="0.48"/>
      <circle cx="1040" cy="570" r="170" fill="#D8F0E4" fill-opacity="0.40"/>
      <rect x="42" y="34" width="1116" height="562" rx="42" fill="#FFFFFF" fill-opacity="0.78" filter="url(#shadow)"/>
      <rect x="84" y="78" width="150" height="48" rx="24" fill="#F0E9FF"/>
      <circle cx="112" cy="102" r="8" fill="#7151D6"/>
      <text x="134" y="110" fill="#5C3EAD" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="22" font-weight="700" letter-spacing="2">NUANG</text>
      <text x="84" y="222" fill="#211A2B" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="58" font-weight="800">
        <tspan x="84" dy="0">성향으로 나와 우리를</tspan>
        <tspan x="84" dy="76">발견하는 곳</tspan>
      </text>
      <text x="88" y="402" fill="#6F687A" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="26" font-weight="600">무료 성향 테스트 · 밸런스 게임 · 관계 커뮤니티</text>
      <rect x="84" y="486" width="154" height="48" rx="24" fill="#FFFFFF" stroke="#D9CEF5" stroke-width="2"/>
      <text x="111" y="518" fill="#6247BA" font-family="Arial, sans-serif" font-size="20" font-weight="700">nuang.app</text>
    </svg>
  `);

  return sharp({
    create: {
      background: "#f7f4fe",
      channels: 4,
      height: 630,
      width: 1200,
    },
  })
    .composite([
      { input: copyLayer, left: 0, top: 0 },
      { input: forest, left: 890, top: 184 },
      { input: sun, left: 1006, top: 280 },
      { input: purple, left: 692, top: 238 },
    ])
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toBuffer();
}

async function prepareSocialCharacter(filename, size) {
  return sharp(resolve(characterDirectory, filename))
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

function createPngIco(images) {
  const headerSize = 6;
  const directorySize = images.length * 16;
  const header = Buffer.alloc(headerSize + directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize + directorySize;
  images.forEach((image, index) => {
    const size = [16, 32, 48][index];
    const entryOffset = headerSize + index * 16;
    header.writeUInt8(size, entryOffset);
    header.writeUInt8(size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += image.length;
  });

  return Buffer.concat([header, ...images]);
}
