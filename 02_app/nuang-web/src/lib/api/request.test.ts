import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readValidatedJson } from "@/lib/api/request";

const schema = z.object({ value: z.string() }).strict();

describe("readValidatedJson", () => {
  it("parses and validates a bounded JSON request", async () => {
    const result = await readValidatedJson(
      jsonRequest({ value: "뉴앙" }),
      schema,
    );

    expect(result).toEqual({ data: { value: "뉴앙" }, ok: true });
  });

  it("rejects a declared oversized request before parsing it", async () => {
    const result = await readValidatedJson(
      new Request("https://nuang.app/api/test", {
        body: JSON.stringify({ value: "too large" }),
        headers: {
          "content-length": "1000",
          "content-type": "application/json",
        },
        method: "POST",
      }),
      schema,
      { maxBytes: 100 },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
    expect(await result.response.json()).toMatchObject({
      error: "request_body_too_large",
    });
  });

  it("stops a streamed body when its actual bytes exceed the limit", async () => {
    const result = await readValidatedJson(
      jsonRequest({ value: "한".repeat(100) }),
      schema,
      { maxBytes: 32 },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
  });

  it("keeps malformed and schema-invalid requests distinct", async () => {
    const malformed = await readValidatedJson(
      new Request("https://nuang.app/api/test", {
        body: "{",
        method: "POST",
      }),
      schema,
    );
    const invalid = await readValidatedJson(
      jsonRequest({ value: 123 }),
      schema,
    );

    expect(malformed.ok).toBe(false);
    expect(invalid.ok).toBe(false);
    if (malformed.ok || invalid.ok) return;
    expect(malformed.response.status).toBe(400);
    expect(invalid.response.status).toBe(422);
  });
});

function jsonRequest(body: unknown) {
  return new Request("https://nuang.app/api/test", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
