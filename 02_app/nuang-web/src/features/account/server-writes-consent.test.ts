import { describe, expect, it, vi } from "vitest";
import { optionalConsentVersions } from "@/features/consent/optional-consent-contract";
import { persistAccountConsent } from "./server-writes";

describe("persistAccountConsent", () => {
  it("delegates required and optional state to one atomic consent RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { schema: () => ({ rpc }) };

    const result = await persistAccountConsent(client as never, "account-1", {
      analytics: true,
      is14OrOlder: true,
      marketing: false,
      privacy: true,
      terms: true,
    });

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("persist_account_consent", {
      p_account_id: "account-1",
      p_analytics_requested: true,
      p_analytics_version: optionalConsentVersions.analytics,
      p_is_14_or_older: true,
      p_marketing_requested: false,
      p_marketing_version: optionalConsentVersions.marketing,
      p_policy_version: "nuang-consent.v0.1",
      p_privacy_version: "privacy.v0.1",
      p_terms_version: "terms.v0.1",
    });
  });

  it("rejects incomplete required consent before opening the database", async () => {
    const schema = vi.fn();

    const result = await persistAccountConsent(
      { schema } as never,
      "account-1",
      {
        analytics: true,
        is14OrOlder: true,
        marketing: true,
        privacy: false,
        terms: true,
      } as never,
    );

    expect(result).toEqual({ ok: false });
    expect(schema).not.toHaveBeenCalled();
  });
});
