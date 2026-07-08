import {
  nuangCharacterAssetPaths,
  type NuangCharacterMotif,
} from "@/components/character/nuang-character-assets";
import type { DomainScore } from "@/lib/scoring/types";

type ShareImageInput = {
  code: string;
  domains: DomainScore[];
  motif: ShareImageMotif;
  profileName: string;
  resultLabel: string;
};

type ShareImageMotif = NuangCharacterMotif;

const width = 1080;
const height = 1350;
const characterImageCache = new Map<ShareImageMotif, Promise<HTMLImageElement>>();

export async function shareResultImage(input: ShareImageInput) {
  const blob = await createResultImageBlob(input);
  const fileName = `nuang-${input.code.toLowerCase()}.png`;
  const file = new File([blob], fileName, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: input.profileName,
      text: `NUANG ${input.profileName}`,
      files: [file],
    });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}

async function createResultImageBlob(input: ShareImageInput) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context is unavailable");
  }

  await paintCard(ctx, input);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create result image"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function paintCard(ctx: CanvasRenderingContext2D, input: ShareImageInput) {
  ctx.fillStyle = "#fbfbfe";
  ctx.fillRect(0, 0, width, height);

  roundRect(ctx, 72, 72, width - 144, height - 144, 36);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e6e3f2";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#6546d7";
  ctx.font =
    '700 42px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
  ctx.fillText("NUANG", 120, 150);

  drawPill(ctx, input.resultLabel, 120, 218);

  ctx.fillStyle = "#202232";
  ctx.font =
    '800 78px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
  wrapText(ctx, input.profileName, 120, 340, 600, 88);

  ctx.fillStyle = "#6b6f82";
  ctx.font =
    '700 44px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(input.code, 120, 520);

  await drawCharacter(ctx, 700, 230, 290, input.motif);

  ctx.fillStyle = "#202232";
  ctx.font =
    '800 44px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
  ctx.fillText("5개 영역", 120, 660);

  input.domains.forEach((domain, index) => {
    const y = 735 + index * 112;
    const score = Math.round(domain.score ?? 0);
    ctx.fillStyle = "#202232";
    ctx.font =
      '600 34px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(domain.label, 120, y);
    ctx.fillStyle = "#6b6f82";
    ctx.textAlign = "right";
    ctx.fillText(String(score), 960, y);
    ctx.textAlign = "left";

    roundRect(ctx, 120, y + 28, 840, 22, 12);
    ctx.fillStyle = "#eceaf4";
    ctx.fill();
    roundRect(ctx, 120, y + 28, Math.max(10, score * 8.4), 22, 12);
    ctx.fillStyle = domainColor(domain.domainId);
    ctx.fill();
  });

  ctx.fillStyle = "#6b6f82";
  ctx.font =
    '500 30px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
  ctx.fillText("결과는 진단이나 궁합 점수가 아니라 현재 성향을 이해하기 위한 요약이에요.", 120, 1240);
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font =
    '700 30px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';
  const metrics = ctx.measureText(text);
  roundRect(ctx, x, y, metrics.width + 56, 56, 28);
  ctx.fillStyle = "#f4f1ff";
  ctx.fill();
  ctx.fillStyle = "#6546d7";
  ctx.fillText(text, x + 28, y + 38);
}

async function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  motif: ShareImageMotif,
) {
  const image = await loadCharacterImage(motif);

  ctx.drawImage(image, x, y, size, size);
}

function loadCharacterImage(motif: ShareImageMotif) {
  const cached = characterImageCache.get(motif);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Failed to load NUANG character asset: ${motif}`));
    image.src = nuangCharacterAssetPaths[motif];
  });

  characterImageCache.set(motif, promise);
  return promise;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let offset = 0;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      line = word;
      offset += lineHeight;
    } else {
      line = nextLine;
    }
  }

  ctx.fillText(line, x, y + offset);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function domainColor(domainId: string) {
  const colors: Record<string, string> = {
    SE: "#e9511d",
    ER: "#2f7de1",
    SM: "#36a06f",
    RO: "#6546d7",
    OE: "#f6ae24",
  };

  return colors[domainId] ?? "#6546d7";
}
