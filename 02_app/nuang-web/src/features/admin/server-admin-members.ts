import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminMemberSummary = {
  accountId: string;
  accountStatus: "active" | "deleted" | "suspended";
  code: string | null;
  contact: {
    email: "missing" | "unverified" | "verified";
    mobile: "missing" | "unverified" | "verified";
  };
  createdAt: string;
  displayName: string;
  handle: string;
  postCount: number;
  profileStatus: "active" | "deleted" | "hidden";
  provider: string | null;
  reportCount: number;
};

export type AdminMemberDetail = AdminMemberSummary & {
  bio: string;
  comparisonEnabled: boolean;
  resultCount: number;
  visibility: {
    code: "private" | "public";
    detail: "private" | "public";
  };
};

export async function readAdminMembers({
  client,
  query = "",
  status = "all",
}: {
  client: SupabaseClient;
  query?: string;
  status?: string;
}) {
  const profileResponse = await client
    .schema("profile")
    .from("community_profile")
    .select(
      "account_id,handle,display_name,status,created_at,updated_at,deleted_at",
    )
    .order("updated_at", { ascending: false })
    .limit(300);

  if (profileResponse.error) throw profileResponse.error;

  const normalizedQuery = query.trim().toLowerCase();
  const profiles = (profileResponse.data ?? []).filter((profile) => {
    if (!normalizedQuery) return true;
    return (
      profile.display_name.toLowerCase().includes(normalizedQuery) ||
      profile.handle.toLowerCase().includes(normalizedQuery) ||
      profile.account_id.toLowerCase().includes(normalizedQuery)
    );
  });
  const accountIds = profiles.map((profile) => profile.account_id);
  if (accountIds.length === 0) return [];

  const [accounts, contacts, reports, posts, profileReports, identities] =
    await Promise.all([
      client
        .schema("identity")
        .from("account")
        .select("id,status,created_at")
        .in("id", accountIds),
      client
        .schema("identity")
        .from("contact_profile")
        .select("account_id,email_status,mobile_phone_status")
        .in("account_id", accountIds),
      client
        .schema("report")
        .from("result_report")
        .select("account_id,profile_code,created_at")
        .in("account_id", accountIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3000),
      client
        .schema("feed")
        .from("feed_post")
        .select("author_account_id")
        .in("author_account_id", accountIds)
        .is("deleted_at", null)
        .limit(5000),
      client
        .schema("feed")
        .from("profile_report")
        .select("target_account_id")
        .in("target_account_id", accountIds)
        .limit(5000),
      client
        .schema("identity")
        .from("auth_identity")
        .select("account_id,provider,provider_linked_at")
        .in("account_id", accountIds)
        .is("revoked_at", null)
        .order("provider_linked_at", { ascending: true }),
    ]);

  for (const response of [
    accounts,
    contacts,
    reports,
    posts,
    profileReports,
    identities,
  ]) {
    if (response.error) throw response.error;
  }

  const accountMap = new Map((accounts.data ?? []).map((row) => [row.id, row]));
  const contactMap = new Map(
    (contacts.data ?? []).map((row) => [row.account_id, row]),
  );
  const latestCodeMap = new Map<string, string>();
  for (const row of reports.data ?? []) {
    if (!latestCodeMap.has(row.account_id)) {
      latestCodeMap.set(row.account_id, row.profile_code);
    }
  }
  const postCount = countBy(posts.data ?? [], "author_account_id");
  const reportCount = countBy(profileReports.data ?? [], "target_account_id");
  const providerMap = new Map<string, string>();
  for (const row of identities.data ?? []) {
    if (!providerMap.has(row.account_id)) {
      providerMap.set(row.account_id, row.provider);
    }
  }

  return profiles
    .map((profile): AdminMemberSummary | null => {
      const account = accountMap.get(profile.account_id);
      if (!account) return null;
      const contact = contactMap.get(profile.account_id);
      return {
        accountId: profile.account_id,
        accountStatus: account.status,
        code: latestCodeMap.get(profile.account_id) ?? null,
        contact: {
          email: contact?.email_status ?? "missing",
          mobile: contact?.mobile_phone_status ?? "missing",
        },
        createdAt: account.created_at,
        displayName: profile.display_name,
        handle: profile.handle,
        postCount: postCount.get(profile.account_id) ?? 0,
        profileStatus: profile.status,
        provider: providerMap.get(profile.account_id) ?? null,
        reportCount: reportCount.get(profile.account_id) ?? 0,
      };
    })
    .filter((member): member is AdminMemberSummary => Boolean(member))
    .filter((member) => status === "all" || member.accountStatus === status)
    .slice(0, 100);
}

export async function readAdminMemberDetail({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}): Promise<AdminMemberDetail | null> {
  const [profile, account, contact, identity, latestReport, reports, posts, flags] =
    await Promise.all([
      client
        .schema("profile")
        .from("community_profile")
        .select(
          "account_id,handle,display_name,bio,status,code_visibility,detail_visibility,comparison_enabled,created_at",
        )
        .eq("account_id", accountId)
        .maybeSingle(),
      client
        .schema("identity")
        .from("account")
        .select("id,status,created_at")
        .eq("id", accountId)
        .maybeSingle(),
      client
        .schema("identity")
        .from("contact_profile")
        .select("email_status,mobile_phone_status")
        .eq("account_id", accountId)
        .maybeSingle(),
      client
        .schema("identity")
        .from("auth_identity")
        .select("provider")
        .eq("account_id", accountId)
        .is("revoked_at", null)
        .order("provider_linked_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      client
        .schema("report")
        .from("result_report")
        .select("profile_code")
        .eq("account_id", accountId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .schema("report")
        .from("result_report")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .is("deleted_at", null),
      client
        .schema("feed")
        .from("feed_post")
        .select("id", { count: "exact", head: true })
        .eq("author_account_id", accountId)
        .is("deleted_at", null),
      client
        .schema("feed")
        .from("profile_report")
        .select("id", { count: "exact", head: true })
        .eq("target_account_id", accountId),
    ]);

  if (
    profile.error ||
    account.error ||
    contact.error ||
    identity.error ||
    latestReport.error ||
    reports.error ||
    posts.error ||
    flags.error
  ) {
    throw (
      profile.error ??
      account.error ??
      contact.error ??
      identity.error ??
      latestReport.error ??
      reports.error ??
      posts.error ??
      flags.error
    );
  }
  if (!profile.data || !account.data) return null;

  return {
    accountId,
    accountStatus: account.data.status,
    bio: profile.data.bio,
    code: latestReport.data?.profile_code ?? null,
    comparisonEnabled: profile.data.comparison_enabled,
    contact: {
      email: contact.data?.email_status ?? "missing",
      mobile: contact.data?.mobile_phone_status ?? "missing",
    },
    createdAt: account.data.created_at,
    displayName: profile.data.display_name,
    handle: profile.data.handle,
    postCount: posts.count ?? 0,
    profileStatus: profile.data.status,
    provider: identity.data?.provider ?? null,
    reportCount: flags.count ?? 0,
    resultCount: reports.count ?? 0,
    visibility: {
      code: profile.data.code_visibility,
      detail: profile.data.detail_visibility,
    },
  };
}

function countBy<T extends Record<string, unknown>>(
  rows: T[],
  field: keyof T,
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row[field];
    if (typeof key === "string") {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}
