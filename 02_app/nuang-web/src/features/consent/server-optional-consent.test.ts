import { describe, expect, it, vi } from "vitest";
import { optionalConsentVersions } from "./optional-consent-contract";
import {
  readAnalyticsCollectionPermission,
  readOptionalConsentPreferences,
  recordProductScreenView,
  saveOptionalConsentPreference,
} from "./server-optional-consent";

describe("optional consent server boundary", () => {
  it("normalizes both current preferences without exposing ledger metadata", async () => {
    const client = readClient({
      analytics_consent_updated_at: "2026-08-03T00:00:00.000Z",
      analytics_consent_version: optionalConsentVersions.analytics,
      analytics_opt_in: true,
      marketing_consent_updated_at: null,
      marketing_consent_version: optionalConsentVersions.marketing,
      marketing_opt_in: false,
    });

    const response = await readOptionalConsentPreferences({
      accountId: "account-1",
      client: client as never,
    });

    expect(response).toEqual({
      data: {
        analytics: {
          enabled: true,
          updatedAt: "2026-08-03T00:00:00.000Z",
          version: optionalConsentVersions.analytics,
        },
        marketing: {
          enabled: false,
          updatedAt: null,
          version: optionalConsentVersions.marketing,
        },
      },
      ok: true,
    });
  });

  it("writes through the canonical RPC and re-reads its materialized state", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { changed: true }, error: null });
    const client = readClient(
      {
        analytics_consent_version: optionalConsentVersions.analytics,
        analytics_opt_in: false,
        marketing_consent_version: optionalConsentVersions.marketing,
        marketing_opt_in: true,
      },
      rpc,
    );

    const response = await saveOptionalConsentPreference({
      accountId: "account-1",
      client: client as never,
      enabled: true,
      preference: "marketing",
    });

    expect(response.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("set_optional_preference", {
      p_account_id: "account-1",
      p_consent_type: "marketing",
      p_consent_version: optionalConsentVersions.marketing,
      p_enabled: true,
      p_source: "my_settings",
    });
  });

  it("does not present an older marketing consent as current permission", async () => {
    const client = readClient({
      analytics_consent_version: optionalConsentVersions.analytics,
      analytics_opt_in: false,
      marketing_consent_version: "NUANG-MARKETING-PREFERENCE-2026-07-27",
      marketing_opt_in: true,
    });
    const response = await readOptionalConsentPreferences({
      accountId: "account-1",
      client: client as never,
    });
    expect(response).toMatchObject({
      data: {
        marketing: {
          enabled: false,
          version: optionalConsentVersions.marketing,
        },
      },
      ok: true,
    });
  });

  it("fails closed when active-account or analytics state cannot be read", async () => {
    const client = permissionClient({
      account: { data: null, error: { message: "unavailable" } },
      preference: { data: { analytics_opt_in: true }, error: null },
    });

    const response = await readAnalyticsCollectionPermission({
      accountId: "account-1",
      client: client as never,
    });

    expect(response).toEqual({
      code: "analytics_consent_check_failed",
      ok: false,
    });
  });

  it("authorizes collection only for the current analytics consent version", async () => {
    const currentClient = permissionClient({
      account: { data: { status: "active" }, error: null },
      preference: {
        data: {
          analytics_consent_version: optionalConsentVersions.analytics,
          analytics_opt_in: true,
        },
        error: null,
      },
    });
    const staleClient = permissionClient({
      account: { data: { status: "active" }, error: null },
      preference: {
        data: {
          analytics_consent_version: "NUANG-ANALYTICS-OLD",
          analytics_opt_in: true,
        },
        error: null,
      },
    });

    await expect(
      readAnalyticsCollectionPermission({
        accountId: "account-1",
        client: currentClient as never,
      }),
    ).resolves.toEqual({ allowed: true, ok: true });
    await expect(
      readAnalyticsCollectionPermission({
        accountId: "account-1",
        client: staleClient as never,
      }),
    ).resolves.toEqual({ allowed: false, ok: true });
  });

  it("accepts only known database outcomes from screen-view recording", async () => {
    const recordedClient = rpcClient("recorded");
    const unknownClient = rpcClient("unexpected");

    await expect(
      recordProductScreenView({
        accountId: "account-1",
        area: "home",
        client: recordedClient as never,
      }),
    ).resolves.toEqual({ ok: true, status: "recorded" });
    await expect(
      recordProductScreenView({
        accountId: "account-1",
        area: "other",
        client: unknownClient as never,
      }),
    ).resolves.toEqual({ code: "analytics_write_failed", ok: false });
  });
});

function readClient(row: Record<string, unknown>, rpc = vi.fn()) {
  const builder = {
    eq: () => builder,
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    select: () => builder,
  };
  return {
    schema: () => ({
      from: () => builder,
      rpc,
    }),
  };
}

function permissionClient({
  account,
  preference,
}: {
  account: { data: unknown; error: unknown };
  preference: { data: unknown; error: unknown };
}) {
  return {
    schema: (schema: string) => ({
      from: () => {
        const result = schema === "identity" ? account : preference;
        const builder = {
          eq: () => builder,
          maybeSingle: vi.fn().mockResolvedValue(result),
          select: () => builder,
        };
        return builder;
      },
    }),
  };
}

function rpcClient(data: string) {
  return {
    schema: () => ({
      rpc: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}
