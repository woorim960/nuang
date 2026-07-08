import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createApiClosedResponse } from "@/lib/api/closed-state";

export async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "unauthenticated",
          message: "Sign in is required for this server action.",
        },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    user: data.user,
  };
}
