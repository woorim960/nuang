import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import {
  parseProfileReportKey,
  updateProfileReportVisibilityRequestSchema,
} from "@/features/public-profile/profile-report-contract";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request) {
  const parsed = updateProfileReportVisibilityRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }
  const key = parseProfileReportKey(parsed.data.reportKey);
  if (!key) {
    return NextResponse.json({ error: "invalid_report_key" }, { status: 422 });
  }
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const client = createSupabaseServiceClient();
  if (!client) return createApiClosedResponse("supabase_env_missing");

  const account = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", auth.user.id)
    .is("revoked_at", null)
    .order("provider_linked_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (account.error || !account.data?.account_id) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }
  const accountId = String(account.data.account_id);
  if (!(await ownsOriginalReport({ accountId, client, key }))) {
    return NextResponse.json({ error: "report_not_found" }, { status: 404 });
  }

  if (
    key.kind === "core" &&
    parsed.data.visibility === "private" &&
    !(await revokeActiveCoreShareLinks({
      accountId,
      client,
      resultReportId: key.sourceId,
    }))
  ) {
    return NextResponse.json(
      { error: "share_link_revoke_failed" },
      { status: 503 },
    );
  }

  const saved = await client
    .schema("profile")
    .from("profile_report_visibility")
    .upsert(
      {
        account_id: accountId,
        source_id: key.sourceId,
        source_kind: key.kind,
        updated_at: new Date().toISOString(),
        visibility: parsed.data.visibility,
      },
      { onConflict: "account_id,source_kind,source_id" },
    );
  if (saved.error) {
    return NextResponse.json(
      { error: "profile_report_visibility_write_failed" },
      { status: 503 },
    );
  }

  const profile = await client
    .schema("profile")
    .from("community_profile")
    .select("id")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();
  const profileId = profile.data?.id ? String(profile.data.id) : null;
  revalidatePath("/my");
  if (profileId) revalidatePath(`/feed/profiles/${profileId}`);

  return NextResponse.json({
    ok: true,
    reportKey: parsed.data.reportKey,
    visibility: parsed.data.visibility,
  });
}

async function revokeActiveCoreShareLinks({
  accountId,
  client,
  resultReportId,
}: {
  accountId: string;
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  resultReportId: string;
}) {
  const revokedAt = new Date().toISOString();
  const response = await client
    .schema("sharing")
    .from("share_link")
    .update({ revoked_at: revokedAt, status: "revoked" })
    .eq("account_id", accountId)
    .eq("result_report_id", resultReportId)
    .eq("status", "active");
  return !response.error;
}

async function ownsOriginalReport({
  accountId,
  client,
  key,
}: {
  accountId: string;
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  key: NonNullable<ReturnType<typeof parseProfileReportKey>>;
}) {
  const table =
    key.kind === "core"
      ? { schema: "report", table: "result_report" }
      : key.kind === "topic"
        ? { schema: "assessment", table: "free_topic_result" }
        : { schema: "assessment", table: "lab_result" };
  const response = await client
    .schema(table.schema)
    .from(table.table)
    .select("id")
    .eq("id", key.sourceId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();
  return !response.error && Boolean(response.data);
}
