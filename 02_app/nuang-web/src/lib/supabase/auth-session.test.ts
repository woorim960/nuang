import { describe, expect, it } from "vitest";
import {
  authSessionMaxAgeSeconds,
  supabaseAuthCookieOptions,
} from "@/lib/supabase/auth-session";

describe("Supabase auth session policy", () => {
  it("keeps the browser session cookie for 30 days", () => {
    expect(authSessionMaxAgeSeconds).toBe(2_592_000);
    expect(supabaseAuthCookieOptions).toMatchObject({
      maxAge: 2_592_000,
      path: "/",
      sameSite: "lax",
    });
  });
});
