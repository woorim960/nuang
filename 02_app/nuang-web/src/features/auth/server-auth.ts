import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readAccountAccessStatus } from "@/features/auth/server-account-access";

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

  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }
  const access = await readAccountAccessStatus({
    client: serviceClient,
    supabaseUserId: data.user.id,
  });
  if (!access.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "account_access_unavailable",
          message: "계정 상태를 확인하지 못했습니다.",
        },
        { status: 503 },
      ),
    };
  }
  if (
    access.status === "conflict" ||
    access.status === "deleted" ||
    access.status === "merged" ||
    access.status === "suspended"
  ) {
    const isSuspended = access.status === "suspended";
    const isConflict = access.status === "conflict";
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: isSuspended
            ? "account_suspended"
            : isConflict
              ? "identity_conflict"
              : "account_deleted",
          message:
            isSuspended
              ? "운영 정책에 따라 계정 활동이 일시 정지되었습니다."
              : isConflict
                ? "로그인 연결 상태를 안전하게 확인하고 있어요. 잠시 후 다시 시도해 주세요."
              : "사용할 수 없는 계정입니다.",
        },
        { status: isConflict ? 409 : 403 },
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    user: data.user,
  };
}
