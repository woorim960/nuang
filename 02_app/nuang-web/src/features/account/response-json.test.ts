import { describe, expect, it } from "vitest";
import { readJsonResponse } from "@/features/account/response-json";

describe("readJsonResponse", () => {
  it("parses JSON response bodies", async () => {
    await expect(
      readJsonResponse<{ ok?: boolean }>(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    ).resolves.toEqual({ ok: true });
  });

  it("treats empty success bodies as missing JSON", async () => {
    await expect(
      readJsonResponse<{ ok?: boolean }>(new Response(null, { status: 204 })),
    ).resolves.toBeNull();
  });

  it("treats malformed bodies as missing JSON", async () => {
    await expect(
      readJsonResponse<{ ok?: boolean }>(new Response("{", { status: 200 })),
    ).resolves.toBeNull();
  });
});
