import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as feedGet, POST as feedPost } from "@/app/api/feed/route";

const validPostPayload = {
  action: "create_post",
  body: "오늘의 생각을 짧게 남겨요.",
  clientRequestId: "local_request_001",
  source: "free_text",
  visibility: "public",
};

describe("feed api", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("returns the current read feed payload", async () => {
    const response = await feedGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result.items).toEqual([]);
    expect(body.result.stories).toEqual([]);
  });

  it("keeps valid write requests behind the auth/env gate", async () => {
    const response = await feedPost(jsonRequest(validPostPayload));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("supabase_env_missing");
  });

  it("rejects invalid writes before auth", async () => {
    const response = await feedPost(
      jsonRequest({
        action: "create_post",
        body: "x".repeat(801),
        source: "unsupported",
        visibility: "public",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });

  it("rejects unsupported multipart photos before auth", async () => {
    const formData = new FormData();
    formData.set("payload", JSON.stringify(validPostPayload));
    formData.append(
      "media",
      new File(["gif"], "animated.gif", { type: "image/gif" }),
    );

    const response = await feedPost({
      formData: async () => formData,
      headers: new Headers({
        "content-type": "multipart/form-data; boundary=test",
      }),
    } as Request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_request");
    expect(body.message).toContain("JPG");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/feed", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
