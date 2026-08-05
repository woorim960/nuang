import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "public/images/share");

const variants = [
  {
    accent: "#6B4BB8",
    accentSoft: "#EEE8FA",
    background: "#F3EFFB",
    description: "다섯 가지 성향으로 지금의 나를 이해해요.",
    illustration: "public/assets/onboarding-v3/nuang-onboarding-v3-code.png",
    illustrationHeight: 540,
    illustrationLeft: 726,
    illustrationTop: 48,
    illustrationWidth: 405,
    label: "CORE",
    name: "core",
    titleLines: ["나의 성향을 발견한", "코어 리포트"],
  },
  {
    accent: "#9A4564",
    accentSoft: "#F8E8EF",
    background: "#F9EFF3",
    description: "사과·위로·대화 속 내 선택을 살펴봐요.",
    illustration:
      "public/assets/onboarding-v3/nuang-onboarding-v3-together.png",
    illustrationHeight: 420,
    illustrationLeft: 602,
    illustrationTop: 151,
    illustrationWidth: 560,
    label: "TOPIC",
    name: "topic",
    titleLines: ["관계 속 내 마음을 읽는", "주제 리포트"],
  },
  {
    accent: "#317C72",
    accentSoft: "#E4F2EE",
    background: "#EAF4F1",
    description: "재미로 시작해 나다운 힌트를 발견해요.",
    illustration: "public/assets/onboarding-v3/nuang-onboarding-v3-start.png",
    illustrationHeight: 405,
    illustrationLeft: 608,
    illustrationTop: 158,
    illustrationWidth: 552,
    label: "LAB",
    name: "lab",
    titleLines: ["가볍게 시작해 발견한", "나의 한 장면"],
  },
];

for (const variant of variants) {
  const illustration = await sharp(path.join(projectRoot, variant.illustration))
    .resize({
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: "contain",
      height: variant.illustrationHeight,
      width: variant.illustrationWidth,
    })
    .ensureAlpha()
    .png()
    .toBuffer();
  const outputPath = path.join(
    outputDirectory,
    `nuang-result-share-${variant.name}-v2.png`,
  );

  await sharp(Buffer.from(createCardSvg(variant)), { density: 144 })
    .resize(1200, 630)
    .composite([
      {
        input: illustration,
        left: variant.illustrationLeft,
        top: variant.illustrationTop,
      },
    ])
    .png({ compressionLevel: 9, quality: 96 })
    .toFile(outputPath);

  console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
}

function createCardSvg(variant) {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="background" x1="76" y1="44" x2="1118" y2="594" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="${variant.background}"/>
    </linearGradient>
    <filter id="shadow" x="-40" y="-40" width="1280" height="710" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="17" stdDeviation="27" flood-color="#382950" flood-opacity="0.11"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="${variant.background}"/>
  <g filter="url(#shadow)">
    <rect x="34" y="34" width="1132" height="562" rx="44" fill="url(#background)"/>
    <rect x="34.5" y="34.5" width="1131" height="561" rx="43.5" stroke="#E7E1EC"/>
  </g>
  <circle cx="1084" cy="111" r="98" fill="${variant.accentSoft}" fill-opacity="0.76"/>
  <circle cx="1072" cy="560" r="154" fill="${variant.accentSoft}" fill-opacity="0.58"/>
  <path d="M680 35H1002C1077 35 1137 95 1137 170V596H625L680 35Z" fill="${variant.accentSoft}" fill-opacity="0.33"/>

  <g transform="translate(92 78)">
    <rect width="184" height="46" rx="23" fill="${variant.accentSoft}"/>
    <circle cx="26" cy="23" r="8" fill="${variant.accent}"/>
    <text x="46" y="30" fill="${variant.accent}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.8">NUANG · ${variant.label}</text>
  </g>

  <text x="92" y="219" fill="#201A2A" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="58" font-weight="800" letter-spacing="-2.7">
    <tspan x="92" dy="0">${variant.titleLines[0]}</tspan>
    <tspan x="92" dy="74">${variant.titleLines[1]}</tspan>
  </text>
  <text x="94" y="403" fill="#70677C" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="26" font-weight="600" letter-spacing="-0.9">${variant.description}</text>

  <g transform="translate(92 517)">
    <rect width="142" height="42" rx="21" fill="#FFFFFF" stroke="#DDD5E7"/>
    <text x="21" y="28" fill="${variant.accent}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="0.4">nuang.app</text>
  </g>
</svg>`;
}
