import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  return redirectWithAuthStatus(request, "connected");
}
