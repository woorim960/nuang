import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMarketingUnsubscribeToken,
  readMarketingUnsubscribeToken,
} from "./server-marketing-unsubscribe-token";

afterEach(() => vi.unstubAllEnvs());

describe("marketing unsubscribe token", () => {
  it("round-trips an opaque account reference without exposing it", () => {
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const accountId = "11111111-1111-4111-8111-111111111111";
    const token = createMarketingUnsubscribeToken(accountId);

    expect(token).not.toContain(accountId);
    expect(readMarketingUnsubscribeToken(token)).toMatchObject({
      accountId,
      purpose: "marketing_email_unsubscribe",
    });
  });

  it("rejects a modified token", () => {
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64"));
    const token = createMarketingUnsubscribeToken(
      "22222222-2222-4222-8222-222222222222",
    );
    const tampered = `${token.slice(0, -2)}aa`;
    expect(readMarketingUnsubscribeToken(tampered)).toBeNull();
  });
});
