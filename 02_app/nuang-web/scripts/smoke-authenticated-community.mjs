import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const officialPollId = "7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801";
const officialOptionId = "8cf3d9e4-daf3-4017-8e8a-98db4dfc0801";
const officialPostId = "6af1b7c2-b8e1-4ee5-9c68-76b92bda0801";
const requiredFlag = "NUANG_ALLOW_TEMP_REMOTE_SMOKE";

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
  const voteResponse = await postFeedAction(appOrigin, cookieHeader, {
    action: "vote_poll",
    optionId: officialOptionId,
    pollId: officialPollId,
  });

  if (!voteResponse.ok) {
    throw createHttpStageError("vote_poll", voteResponse);
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
  const commentResponse = await postFeedAction(appOrigin, cookieHeader, {
    action: "create_comment",
    body: commentBody,
    target: {
      id: officialPostId,
      type: "feed_post",
    },
  });

  if (!commentResponse.ok) {
    throw createHttpStageError("create_comment", commentResponse);
  }

  const [voteRow, commentRow, viewerFeedResponse] = await Promise.all([
    service
      .schema("feed")
      .from("feed_poll_vote")
      .select("id, option_id")
      .eq("account_id", accountId)
      .eq("poll_id", officialPollId)
      .is("deleted_at", null)
      .maybeSingle(),
    service
      .schema("feed")
      .from("feed_comment")
      .select("id, body, moderation_status")
      .eq("author_account_id", accountId)
      .eq("post_id", officialPostId)
      .eq("body", commentBody)
      .is("deleted_at", null)
      .maybeSingle(),
    fetch(`${appOrigin}/api/feed`, {
      headers: {
        cookie: cookieHeader,
      },
    }),
  ]);

  if (voteRow.error || voteRow.data?.option_id !== officialOptionId) {
    throw createStageError("verify_vote_row", voteRow.error);
  }

  if (commentRow.error || commentRow.data?.body !== commentBody) {
    throw createStageError("verify_comment_row", commentRow.error);
  }

  if (!viewerFeedResponse.ok) {
    throw createHttpStageError("read_authenticated_feed", viewerFeedResponse);
  }

  const viewerFeed = await viewerFeedResponse.json();
  const officialItem = viewerFeed?.result?.items?.find(
    (item) => item?.poll?.id === officialPollId,
  );
  const viewerVoteVisible =
    officialItem?.poll?.viewerVoteOptionId === officialOptionId;
  const ownCommentVisible = officialItem?.replyPreview?.some(
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
    for (const cleanup of [
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
      service.schema("identity").from("account").delete().eq("id", accountId),
    ]) {
      const response = await cleanup;

      if (response.error) {
        cleanupErrors.push(response.error.code ?? "cleanup_db_failed");
      }
    }

    const [remainingComments, remainingVotes, remainingAccount] =
      await Promise.all([
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
      ]);
    const cleanupVerification = [
      ["comment", remainingComments],
      ["vote", remainingVotes],
      ["account", remainingAccount],
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
        deletedUser.error.code ?? deletedUser.error.name ?? "cleanup_auth_failed",
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

function createHttpStageError(stage, response) {
  return new Error(`${stage} failed (http ${response.status})`);
}
