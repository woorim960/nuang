"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type ResultServerReadState = "error" | "ready" | "unauthenticated";

type ScopedLocalResult = {
  ownerAccountId?: string;
  ownerSupabaseUserId?: string;
  serverResultId?: string;
  sync?: {
    lastError?: string;
    status: "failed" | "queued" | "synced";
  };
};

const verifiedAccountScopePrefix = "nuang-result-account-scope:";

export async function readCurrentSupabaseUserId() {
  try {
    const supabase = createBrowserSupabaseClient();
    const session = supabase ? await supabase.auth.getSession() : null;
    return session?.data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function verifyStableResultAuthScope({
  requestUserId,
  responseUserId,
}: {
  requestUserId: string | null;
  responseUserId: string | null | undefined;
}) {
  if (!requestUserId || responseUserId !== requestUserId) return null;

  const currentUserId = await readCurrentSupabaseUserId();
  return currentUserId === requestUserId ? requestUserId : null;
}

export async function confirmResultAuthScopeUnchanged(
  requestUserId: string | null,
) {
  if (!requestUserId) return null;
  const currentUserId = await readCurrentSupabaseUserId();
  return currentUserId === requestUserId ? requestUserId : null;
}

export function rememberVerifiedAccountScope({
  accountId,
  supabaseUserId,
}: {
  accountId: string | null;
  supabaseUserId: string | null;
}) {
  if (!accountId || !supabaseUserId) return;
  localStorage.setItem(
    `${verifiedAccountScopePrefix}${supabaseUserId}`,
    accountId,
  );
}

export function isGuestOnlyResult(result: ScopedLocalResult) {
  return (
    !result.ownerAccountId &&
    !result.ownerSupabaseUserId &&
    !result.serverResultId &&
    result.sync?.status !== "synced" &&
    !(
      result.sync?.status === "failed" &&
      result.sync.lastError &&
      result.sync.lastError !== "login_required"
    )
  );
}

export function canReadScopedLocalResult({
  accountId,
  result,
  serverHasResult,
  serverState,
  supabaseUserId,
}: {
  accountId: string | null;
  result: ScopedLocalResult;
  serverHasResult: boolean;
  serverState: ResultServerReadState;
  supabaseUserId: string | null;
}) {
  if (isGuestOnlyResult(result)) return true;
  if (serverState === "unauthenticated") return false;

  if (result.ownerSupabaseUserId) {
    if (result.ownerSupabaseUserId !== supabaseUserId) return false;
    if (!result.ownerAccountId) return true;
  }

  if (result.ownerAccountId) {
    if (serverState === "ready") {
      return result.ownerAccountId === accountId;
    }
    if (!supabaseUserId) return false;
    return (
      localStorage.getItem(`${verifiedAccountScopePrefix}${supabaseUserId}`) ===
      result.ownerAccountId
    );
  }

  // Results created before account scoping can only be reclaimed when the
  // current account proves ownership by returning the same local result id.
  return serverState === "ready" && serverHasResult;
}
