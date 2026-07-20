const analysisSize = 32;
const maxAnalyzedPhotos = 3;

export async function analyzeLocalFeedImages(files: File[]) {
  const hints = new Set<string>();

  for (const file of files.slice(0, maxAnalyzedPhotos)) {
    const pixels = await readImagePixels(file).catch(() => null);

    if (!pixels) continue;

    for (const hint of inferImageHints(pixels)) {
      hints.add(hint);
    }
  }

  return [...hints].slice(0, 3);
}

function inferImageHints(pixels: Uint8ClampedArray) {
  const sampleCount = Math.max(1, Math.floor(pixels.length / 4));
  let brightnessTotal = 0;
  let greenLeadCount = 0;
  let lowSaturationCount = 0;
  let warmLeadCount = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const high = Math.max(red, green, blue);
    const low = Math.min(red, green, blue);

    brightnessTotal += (red * 299 + green * 587 + blue * 114) / 1000;
    if (green > red * 1.08 && green > blue * 1.08) greenLeadCount += 1;
    if (high - low < 28) lowSaturationCount += 1;
    if (red > blue * 1.16 && green > blue * 1.04) warmLeadCount += 1;
  }

  const brightness = brightnessTotal / sampleCount;
  const hints: string[] = [];

  if (greenLeadCount / sampleCount > 0.24) hints.push("자연");
  if (brightness < 72) hints.push("야경");
  if (brightness > 188) hints.push("밝은 사진");
  if (warmLeadCount / sampleCount > 0.34) hints.push("따뜻한 분위기");
  if (lowSaturationCount / sampleCount > 0.5) hints.push("차분한 분위기");

  return hints;
}

async function readImagePixels(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = analysisSize;
  canvas.height = analysisSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    bitmap.close();
    return null;
  }

  context.drawImage(bitmap, 0, 0, analysisSize, analysisSize);
  bitmap.close();
  return context.getImageData(0, 0, analysisSize, analysisSize).data;
}
