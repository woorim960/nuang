import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
  getSupabasePublicEnv: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabasePublicEnv: mocks.getSupabasePublicEnv,
}));

import { authSessionMaxAgeSeconds } from "@/lib/supabase/auth-session";
import { refreshSupabaseAuthSession } from "@/lib/supabase/proxy";

describe("refreshSupabaseAuthSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabasePublicEnv.mockReturnValue({
      anonKey: "anon-key",
      url: "https://project.supabase.co",
    });
    mocks.createServerClient.mockImplementation(
      (
        _url: string,
        _anonKey: string,
        options: {
          cookieOptions: { maxAge: number };
          cookies: {
            getAll(): Array<{ name: string; value: string }>;
            setAll(
              cookies: Array<{
                name: string;
                options: { maxAge: number; path: string };
                value: string;
              }>,
              headers: Record<string, string>,
            ): void;
          };
        },
      ) => {
        mocks.getClaims.mockImplementation(async () => {
          expect(options.cookies.getAll()).toEqual([
            { name: "existing", value: "cookie" },
          ]);
          options.cookies.setAll(
            [
              {
                name: "sb-project-auth-token",
                options: {
                  maxAge: authSessionMaxAgeSeconds,
                  path: "/",
                },
                value: "refreshed-session",
              },
            ],
            {
              "Cache-Control": "private, no-store",
              Pragma: "no-cache",
            },
          );
          return { data: { claims: {} }, error: null };
        });

        return {
          auth: {
            getClaims: mocks.getClaims,
          },
        };
      },
    );
  });

  it("refreshes the session and returns the renewed 30-day cookie", async () => {
    const request = new NextRequest("https://nuang.example/my", {
      headers: {
        cookie: "existing=cookie",
      },
    });

    const response = await refreshSupabaseAuthSession(request);

    expect(mocks.getClaims).toHaveBeenCalledOnce();
    expect(mocks.createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      expect.objectContaining({
        cookieOptions: expect.objectContaining({
          maxAge: authSessionMaxAgeSeconds,
        }),
      }),
    );
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe(
      "refreshed-session",
    );
    expect(response.headers.get("set-cookie")).toContain(
      `Max-Age=${authSessionMaxAgeSeconds}`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("does not initialize auth when Supabase public env is unavailable", async () => {
    mocks.getSupabasePublicEnv.mockReturnValue(null);

    const response = await refreshSupabaseAuthSession(
      new NextRequest("https://nuang.example/"),
    );

    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
