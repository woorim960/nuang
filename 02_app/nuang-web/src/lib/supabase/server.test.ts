import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createClient: vi.fn(),
  createServerClient: vi.fn(),
  getSupabasePublicEnv: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabasePublicEnv: mocks.getSupabasePublicEnv,
}));

import { createServerSupabaseClient } from "./server";

describe("createServerSupabaseClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabasePublicEnv.mockReturnValue({
      anonKey: "public-anon-key",
      url: "https://project.supabase.co",
    });
    mocks.createClient.mockReturnValue({ mode: "bearer" });
  });

  it("creates a non-persistent server client scoped to the native Bearer token", async () => {
    const result = await createServerSupabaseClient({
      accessToken: "header.payload.signature",
    });

    expect(result).toEqual({ mode: "bearer" });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "public-anon-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: "Bearer header.payload.signature",
          },
        },
      },
    );
    expect(mocks.cookies).not.toHaveBeenCalled();
  });
});
