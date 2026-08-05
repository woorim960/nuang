import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const requiredFlag = "NUANG_ALLOW_TEMP_REMOTE_SMOKE";
const requiredConsentVersions = {
  analytics: "NUANG-ANALYTICS-PREFERENCE-2026-08-03",
  marketing: "NUANG-MARKETING-EMAIL-KO-2026-08-03",
  policy: "nuang-consent.v0.1",
  privacy: "privacy.v0.1",
  terms: "terms.v0.1",
};

if (process.env[requiredFlag] !== "true") {
  console.error(
    `${requiredFlag}=true is required because this smoke test creates and removes one temporary remote account.`,
  );
  process.exit(1);
}

const env = {
  ...readEnvFile(".env.local"),
  ...process.env,
};
const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missingEnv = requiredEnv.filter((key) => !nonEmpty(env[key]));

if (missingEnv.length > 0) {
  console.error(`missing required env: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const appOrigin = normalizeAppOrigin(
  process.env.NUANG_SMOKE_APP_ORIGIN ?? "http://localhost:3000",
);
const runId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const email = `nuang-community-smoke-${runId}@example.com`;
const password = randomBytes(24).toString("base64url");
const commentBody = `NUANG community smoke ${runId}`;
const service = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

let authUserId = null;
let accountId = null;
let smokePostId = null;
let smokePollId = null;
let smokeOptionId = null;
let smokeResult = null;
let primaryError = null;

try {
  const created = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      name: "NUANG QA",
    },
  });

  if (created.error || !created.data.user) {
    throw createStageError("create_auth_user", created.error);
  }

  authUserId = created.data.user.id;
  const cookieJar = [];
  const sessionClient = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieJar;
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            const index = cookieJar.findIndex(
              (existing) => existing.name === cookie.name,
            );
            const shouldRemove = cookie.options?.maxAge === 0;

            if (shouldRemove && index >= 0) {
              cookieJar.splice(index, 1);
              continue;
            }

            if (shouldRemove) continue;

            const storedCookie = {
              name: cookie.name,
              value: cookie.value,
            };

            if (index >= 0) {
              cookieJar[index] = storedCookie;
            } else {
              cookieJar.push(storedCookie);
            }
          }
        },
      },
    },
  );
  const signedIn = await sessionClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signedIn.error || !signedIn.data.user || cookieJar.length === 0) {
    throw createStageError("sign_in_and_cookie", signedIn.error);
  }

  const cookieHeader = cookieJar
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const accountBootstrapResponse = await fetch(`${appOrigin}/api/me/consents`, {
    headers: { cookie: cookieHeader },
  });

  if (!accountBootstrapResponse.ok) {
    const bootstrapBody = await accountBootstrapResponse
      .json()
      .catch(() => null);
    const accountWasCreatedBeforeMissingConsent =
      accountBootstrapResponse.status === 503 &&
      bootstrapBody?.code === "preference_read_failed";
    if (!accountWasCreatedBeforeMissingConsent) {
      throw new Error(
        `bootstrap_account failed (http ${accountBootstrapResponse.status})`,
      );
    }
  }

  const identityResponse = await service
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", authUserId)
    .maybeSingle();

  if (identityResponse.error || !identityResponse.data) {
    throw createStageError("read_created_account", identityResponse.error);
  }

  accountId = identityResponse.data.account_id;
  const consentResponse = await service
    .schema("consent")
    .rpc("persist_account_consent", {
      p_account_id: accountId,
      p_analytics_requested: false,
      p_analytics_version: requiredConsentVersions.analytics,
      p_is_14_or_older: true,
      p_marketing_requested: false,
      p_marketing_version: requiredConsentVersions.marketing,
      p_policy_version: requiredConsentVersions.policy,
      p_privacy_version: requiredConsentVersions.privacy,
      p_terms_version: requiredConsentVersions.terms,
    });

  if (consentResponse.error || consentResponse.data !== true) {
    throw createStageError("persist_required_consent", consentResponse.error);
  }

  const createPollResponse = await postFeedAction(appOrigin, cookieHeader, {
    action: "create_post",
    body: `MVP 인증 스모크 ${runId}`,
    clientRequestId: `smoke-post-${runId}`,
    poll: {
      options: ["첫 번째 선택", "두 번째 선택"],
      question: "MVP 출시 전 인증 투표가 정상 동작하나요?",
    },
    source: "balance_game",
    sourceId: `smoke-poll-${runId}`,
    visibility: "public",
  });

  if (!createPollResponse.ok) {
    throw await createHttpStageError("create_poll_post", createPollResponse);
  }

  const createPollPayload = await createPollResponse.json();
  smokePostId = createPollPayload?.feedWrite?.id ?? null;
  if (!smokePostId) throw new Error("create_poll_post returned no post id");

  const pollRow = await service
    .schema("feed")
    .from("feed_poll")
    .select("id")
    .eq("post_id", smokePostId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (pollRow.error || !pollRow.data?.id) {
    throw createStageError("read_created_poll", pollRow.error);
  }
  smokePollId = pollRow.data.id;

  const optionRow = await service
    .schema("feed")
    .from("feed_poll_option")
    .select("id")
    .eq("poll_id", smokePollId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (optionRow.error || !optionRow.data?.id) {
    throw createStageError("read_created_poll_option", optionRow.error);
  }
  smokeOptionId = optionRow.data.id;

  const voteResponse = await postFeedAction(appOrigin, cookieHeader, {
    action: "vote_poll",
    optionId: smokeOptionId,
    pollId: smokePollId,
  });

  if (!voteResponse.ok) {
    throw await createHttpStageError("vote_poll", voteResponse);
  }

  const commentResponse = await postFeedAction(appOrigin, cookieHeader, {
    action: "create_comment",
    body: commentBody,
    target: {
      id: smokePostId,
      type: "feed_post",
    },
  });

  if (!commentResponse.ok) {
    throw await createHttpStageError("create_comment", commentResponse);
  }

  const [voteRow, commentRow, viewerFeedResponse] = await Promise.all([
    service
      .schema("feed")
      .from("feed_poll_vote")
      .select("id, option_id")
      .eq("account_id", accountId)
      .eq("poll_id", smokePollId)
      .is("deleted_at", null)
      .maybeSingle(),
    service
      .schema("feed")
      .from("feed_comment")
      .select("id, body, moderation_status")
      .eq("author_account_id", accountId)
      .eq("post_id", smokePostId)
      .eq("body", commentBody)
      .is("deleted_at", null)
      .maybeSingle(),
    fetch(`${appOrigin}/api/feed`, {
      headers: {
        cookie: cookieHeader,
      },
    }),
  ]);

  if (voteRow.error || voteRow.data?.option_id !== smokeOptionId) {
    throw createStageError("verify_vote_row", voteRow.error);
  }

  if (commentRow.error || commentRow.data?.body !== commentBody) {
    throw createStageError("verify_comment_row", commentRow.error);
  }

  if (!viewerFeedResponse.ok) {
    throw await createHttpStageError(
      "read_authenticated_feed",
      viewerFeedResponse,
    );
  }

  const viewerFeed = await viewerFeedResponse.json();
  const smokeItem = viewerFeed?.result?.items?.find(
    (item) => item?.poll?.id === smokePollId,
  );
  const viewerVoteVisible =
    smokeItem?.poll?.viewerVoteOptionId === smokeOptionId;
  const ownCommentVisible = smokeItem?.replyPreview?.some(
    (reply) => reply?.body === commentBody,
  );

  if (!viewerVoteVisible || !ownCommentVisible) {
    throw new Error("verify_authenticated_read_model failed");
  }

  smokeResult = {
    authenticatedFeed: "ok",
    cleanup: "pending",
    commentWrite: "ok",
    origin: appOrigin,
    temporaryAuth: "ok",
    voteWrite: "ok",
  };
} catch (error) {
  primaryError = error;
} finally {
  const cleanupErrors = [];

  if (!accountId && authUserId) {
    const identityResponse = await service
      .schema("identity")
      .from("auth_identity")
      .select("account_id")
      .eq("supabase_user_id", authUserId)
      .maybeSingle();

    if (!identityResponse.error && identityResponse.data) {
      accountId = identityResponse.data.account_id;
    }
  }

  if (accountId) {
    const cleanupOperations = [
      service
        .schema("feed")
        .from("feed_comment")
        .delete()
        .eq("author_account_id", accountId),
      service
        .schema("feed")
        .from("feed_poll_vote")
        .delete()
        .eq("account_id", accountId),
    ];
    if (smokePollId) {
      cleanupOperations.push(
        service.schema("feed").from("feed_poll").delete().eq("id", smokePollId),
      );
    }
    if (smokePostId) {
      cleanupOperations.push(
        service.schema("feed").from("feed_post").delete().eq("id", smokePostId),
      );
    }
    cleanupOperations.push(
      service.schema("identity").from("account").delete().eq("id", accountId),
    );

    for (const cleanup of cleanupOperations) {
      const response = await cleanup;

      if (response.error) {
        cleanupErrors.push(response.error.code ?? "cleanup_db_failed");
      }
    }

    const [
      remainingComments,
      remainingVotes,
      remainingAccount,
      remainingPost,
      remainingPoll,
    ] = await Promise.all([
      service
        .schema("feed")
        .from("feed_comment")
        .select("id", { count: "exact", head: true })
        .eq("author_account_id", accountId),
      service
        .schema("feed")
        .from("feed_poll_vote")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId),
      service
        .schema("identity")
        .from("account")
        .select("id", { count: "exact", head: true })
        .eq("id", accountId),
      service
        .schema("feed")
        .from("feed_post")
        .select("id", { count: "exact", head: true })
        .eq("id", smokePostId ?? "00000000-0000-4000-8000-000000000000"),
      service
        .schema("feed")
        .from("feed_poll")
        .select("id", { count: "exact", head: true })
        .eq("id", smokePollId ?? "00000000-0000-4000-8000-000000000000"),
    ]);
    const cleanupVerification = [
      ["comment", remainingComments],
      ["vote", remainingVotes],
      ["account", remainingAccount],
      ["post", remainingPost],
      ["poll", remainingPoll],
    ];

    for (const [label, response] of cleanupVerification) {
      if (response.error || response.count !== 0) {
        cleanupErrors.push(`cleanup_${label}_remaining`);
      }
    }
  }

  if (authUserId) {
    const deletedUser = await service.auth.admin.deleteUser(authUserId);

    if (deletedUser.error) {
      cleanupErrors.push(
        deletedUser.error.code ??
          deletedUser.error.name ??
          "cleanup_auth_failed",
      );
    }
  }

  if (cleanupErrors.length > 0) {
    primaryError ??= new Error(
      `temporary cleanup failed: ${cleanupErrors.join(", ")}`,
    );
  } else if (smokeResult) {
    smokeResult.cleanup = "ok";
  }
}

if (primaryError) {
  console.error(primaryError.message);
  process.exit(1);
}

console.log(JSON.stringify(smokeResult));

async function postFeedAction(origin, cookieHeader, body) {
  return fetch(`${origin}/api/feed`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
    },
    method: "POST",
  });
}

function readEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);

  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = stripQuotes(line.slice(separatorIndex + 1).trim());
        return [key, value];
      }),
  );
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }

  return value;
}

function normalizeAppOrigin(value) {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NUANG_SMOKE_APP_ORIGIN must use http or https.");
  }

  return url.origin;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createStageError(stage, error) {
  const code = error?.code ?? error?.status ?? "unknown";
  return new Error(`${stage} failed (${code})`);
}

async function createHttpStageError(stage, response) {
  const body = await response.text().catch(() => "");
  return new Error(
    `${stage} failed (http ${response.status}${body ? `: ${body.slice(0, 500)}` : ""})`,
  );
}
