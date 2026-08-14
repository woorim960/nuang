import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  pruneResolvedFeedMediaCleanupQueue,
  runFeedMediaCleanupWithinBudget,
} from "@/features/feed/server-feed-media-cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runCleanup(request, process.env.CRON_SECRET);
}

export async function POST(request: Request) {
  return runCleanup(
    request,
    process.env.FEED_MEDIA_CLEANUP_SECRET || process.env.CRON_SECRET,
  );
}

async function runCleanup(request: Request, configuredSecret?: string) {
  if (!isAuthorized(request, configuredSecret)) {
    return NextResponse.json(
      { message: "인증되지 않은 요청입니다.", ok: false },
      { headers: noStoreHeaders, status: 401 },
    );
  }
  const cleanup = await runFeedMediaCleanupWithinBudget();
  const resolvedMetadata = await pruneResolvedFeedMediaCleanupQueue({
    limit: 10_000,
  });
  const result = {
    attempted: cleanup.attempted,
    budgetExhausted: cleanup.budgetExhausted,
    deleted: cleanup.deleted,
    failed: cleanup.failed + (resolvedMetadata.ok ? 0 : 1),
    hasMore: cleanup.hasMore,
    ok: cleanup.ok && resolvedMetadata.ok,
    pruned: resolvedMetadata.pruned,
    queued: cleanup.queued,
    reconciled: cleanup.reconciled,
  };
  return NextResponse.json(result, {
    headers: noStoreHeaders,
    status: result.ok ? 200 : 503,
  });
}

function isAuthorized(request: Request, configuredSecret?: string) {
  const secret = configuredSecret?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) {
    return false;
  }
  const provided = authorization.slice("Bearer ".length).trim();
  const expectedDigest = createHash("sha256").update(secret).digest();
  const providedDigest = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}

const noStoreHeaders = { "cache-control": "private, no-store" };
