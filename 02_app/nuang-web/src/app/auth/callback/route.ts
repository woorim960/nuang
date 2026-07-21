import { type NextRequest, NextResponse } from "next/server";
import { ensureCommunityProfile } from "@/features/account/server-community-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/my";
  }

  return value;
}

function redirectWithAuthStatus(request: NextRequest, status: string) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, request.nextUrl.origin);
  redirectUrl.searchParams.set("auth", status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return redirectWithAuthStatus(request, "missing_code");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return redirectWithAuthStatus(request, "env_missing");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithAuthStatus(request, "error");
  }

  const [{ data }, serviceClient] = await Promise.all([
    supabase.auth.getUser(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);

  if (data.user && serviceClient) {
    // A signed-in user must be able to follow, block and edit their profile
    // before completing an assessment. Bootstrap failures do not invalidate
    // the successful OAuth session; the profile API retries this operation.
    await ensureCommunityProfile({ client: serviceClient, user: data.user });
  }

  return redirectWithAuthStatus(request, "connected");
}
