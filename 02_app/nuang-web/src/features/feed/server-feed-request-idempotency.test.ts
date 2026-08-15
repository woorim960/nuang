import { describe, expect, it } from "vitest";
import { createFeedCreateRequestHash } from "@/features/feed/server-feed-request-idempotency";

const basePayload = {
  action: "create_post",
  body: "오늘의 사진",
  clientRequestId: "feed-request-0001",
  source: "free_text",
  visibility: "public",
} as const;

describe("feed create request idempotency", () => {
  it("keeps the hash stable when only the client request id changes", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.webp", {
      type: "image/webp",
    });

    const first = await createFeedCreateRequestHash({
      files: [file],
      payload: basePayload,
    });
    const second = await createFeedCreateRequestHash({
      files: [file],
      payload: { ...basePayload, clientRequestId: "feed-request-0002" },
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when photo bytes, order, or post content changes", async () => {
    const firstFile = new File([new Uint8Array([1, 2, 3])], "a.webp", {
      type: "image/webp",
    });
    const secondFile = new File([new Uint8Array([4, 5, 6])], "b.webp", {
      type: "image/webp",
    });
    const baseline = await createFeedCreateRequestHash({
      files: [firstFile, secondFile],
      payload: basePayload,
    });

    await expect(
      createFeedCreateRequestHash({
        files: [secondFile, firstFile],
        payload: basePayload,
      }),
    ).resolves.not.toBe(baseline);
    await expect(
      createFeedCreateRequestHash({
        files: [firstFile, secondFile],
        payload: { ...basePayload, body: "바뀐 내용" },
      }),
    ).resolves.not.toBe(baseline);
  });
});
