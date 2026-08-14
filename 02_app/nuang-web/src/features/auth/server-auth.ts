import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readAccountAccessStatus } from "@/features/auth/server-account-access";

export async function requireAuthenticatedUser(
  request?: Request,
  options?: { expectedSupabaseUserId?: string | null },
) {
  const credential = await readRequestCredential(request);
  if (credential.kind === "invalid") {
    return unauthenticatedResponse();
  }

  const supabase = await createServerSupabaseClient(
    credential.kind === "bearer"
      ? { accessToken: credential.accessToken }
      : undefined,
  );

  if (!supabase) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const { data, error } = await supabase.auth.getUser(
    credential.kind === "bearer" ? credential.accessToken : undefined,
  );

  if (error || !data.user) {
    return unauthenticatedResponse();
  }

  if (options && data.user.id !== (options.expectedSupabaseUserId ?? null)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          authUserId: data.user.id,
          error: "auth_scope_changed",
          message:
            "로그인 계정이 변경되어 요청을 중단했어요. 다시 시도해 주세요.",
          ok: false,
        },
        {
          headers: { "cache-control": "private, no-store" },
          status: 409,
        },
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
          message: isSuspended
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
    authSource:
      credential.kind === "bearer" ? ("bearer" as const) : ("cookie" as const),
    ok: true as const,
    supabase,
    user: data.user,
  };
}

async function readRequestCredential(request?: Request) {
  let authorization = request?.headers.get("authorization") ?? null;
  if (!request) {
    try {
      authorization = (await headers()).get("authorization");
    } catch {
      // Unit jobs and non-request render contexts safely fall back to cookies.
    }
  }
  if (!authorization) return { kind: "cookie" as const };

  const match =
    /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(
      authorization,
    );
  if (!match || match[1].length > 8_192) return { kind: "invalid" as const };
  return { accessToken: match[1], kind: "bearer" as const };
}

function unauthenticatedResponse() {
  return {
    ok: false as const,
    response: NextResponse.json(
      {
        error: "unauthenticated",
        message: "Sign in is required for this server action.",
      },
      {
        headers: { "cache-control": "private, no-store" },
        status: 401,
      },
    ),
  };
}
