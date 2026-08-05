import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshSupabaseAuthSession: vi.fn(),
}));

vi.mock("@/lib/supabase/proxy", () => ({
  refreshSupabaseAuthSession: mocks.refreshSupabaseAuthSession,
}));

import { proxy } from "@/proxy";

describe("global API request size guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSupabaseAuthSession.mockResolvedValue(NextResponse.next());
  });

  it("rejects a declared mutation body above 1 MB before auth work", async () => {
    const response = await proxy(
      new NextRequest("https://nuang.app/api/account-results", {
        headers: {
          "content-length": String(1024 * 1024 + 1),
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.refreshSupabaseAuthSession).not.toHaveBeenCalled();
  });

  it("allows bounded API writes and page reads to continue", async () => {
    await proxy(
      new NextRequest("https://nuang.app/api/account-results", {
        headers: {
          "content-length": "2048",
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );
    await proxy(new NextRequest("https://nuang.app/home"));

    expect(mocks.refreshSupabaseAuthSession).toHaveBeenCalledTimes(2);
  });

  it("leaves validated multipart media limits to the feed upload route", async () => {
    const response = await proxy(
      new NextRequest("https://nuang.app/api/feed", {
        headers: {
          "content-length": String(8 * 1024 * 1024),
          "content-type": "multipart/form-data; boundary=test",
        },
        method: "POST",
      }),
    );

    expect(response.status).not.toBe(413);
    expect(mocks.refreshSupabaseAuthSession).toHaveBeenCalledOnce();
  });

  it("rejects cross-site browser mutations before route-specific auth", async () => {
    const response = await proxy(
      new NextRequest("https://nuang.app/api/account", {
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "invalid_request_origin",
    });
    expect(mocks.refreshSupabaseAuthSession).not.toHaveBeenCalled();
  });

  it("keeps origin-less server webhooks available", async () => {
    await proxy(
      new NextRequest("https://nuang.app/api/marketing/webhooks/resend", {
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(mocks.refreshSupabaseAuthSession).toHaveBeenCalledOnce();
  });
});
