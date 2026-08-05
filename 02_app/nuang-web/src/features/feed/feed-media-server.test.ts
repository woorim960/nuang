import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

import { uploadFeedPostMedia } from "@/features/feed/feed-media-server";

describe("uploadFeedPostMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "account-1",
      ok: true,
    });
  });

  it("starts independent image uploads together instead of one by one", async () => {
    const pendingUploads: Array<(value: { error: null }) => void> = [];
    const upload = vi.fn(
      () =>
        new Promise<{ error: null }>((resolve) => {
          pendingUploads.push(resolve);
        }),
    );
    const client = createClient(upload);

    const resultPromise = uploadFeedPostMedia({
      client,
      files: [imageFile("one.jpg"), imageFile("two.jpg")],
      postId: "post-1",
      user: { id: "user-1" } as User,
    });

    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    pendingUploads.forEach((resolve) => resolve({ error: null }));

    await expect(resultPromise).resolves.toEqual({ ok: true });
  });
});

function createClient(upload: ReturnType<typeof vi.fn>) {
  const postReadBuilder = {
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: { attachment_payload: [], id: "post-1" },
      error: null,
    })),
    select: vi.fn(),
  };
  postReadBuilder.select.mockReturnValue(postReadBuilder);
  postReadBuilder.eq.mockReturnValue(postReadBuilder);

  return {
    schema: () => ({
      from: (table: string) =>
        table === "feed_post"
          ? postReadBuilder
          : { insert: vi.fn(async () => ({ error: null })) },
    }),
    storage: {
      from: () => ({ upload }),
      listBuckets: vi.fn(async () => ({
        data: [{ id: "feed-media" }],
        error: null,
      })),
    },
  } as unknown as SupabaseClient;
}

function imageFile(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: "image/jpeg",
  });
}
