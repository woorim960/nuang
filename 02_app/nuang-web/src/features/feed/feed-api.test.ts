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
    expect(body.result.items.length).toBeGreaterThan(0);
    expect(body.result.stories.length).toBeGreaterThan(0);
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
        body: "",
        source: "free_text",
        visibility: "public",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
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
