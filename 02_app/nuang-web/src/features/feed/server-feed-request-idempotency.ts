import "server-only";

import { createHash } from "node:crypto";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";

const feedCreateRequestHashVersion = "nuang-feed-create-v1";

export async function createFeedCreateRequestHash({
  files,
  payload,
}: {
  files: File[];
  payload: Extract<FeedWriteRequest, { action: "create_post" }>;
}) {
  const hash = createHash("sha256");
  const canonicalPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== "clientRequestId"),
  );

  hash.update(feedCreateRequestHashVersion);
  hash.update("\0");
  hash.update(stableSerialize(canonicalPayload));

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    hash.update("\0media\0");
    hash.update(String(bytes.byteLength));
    hash.update("\0");
    hash.update(file.type.toLocaleLowerCase("en-US"));
    hash.update("\0");
    hash.update(bytes);
  }

  return hash.digest("hex");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right, "en-US"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    .join(",")}}`;
}
