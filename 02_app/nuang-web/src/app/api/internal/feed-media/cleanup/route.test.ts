import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pruneResolvedFeedMediaCleanupQueue: vi.fn(),
  runFeedMediaCleanupWithinBudget: vi.fn(),
}));

vi.mock("@/features/feed/server-feed-media-cleanup", () => ({
  pruneResolvedFeedMediaCleanupQueue: mocks.pruneResolvedFeedMediaCleanupQueue,
  runFeedMediaCleanupWithinBudget: mocks.runFeedMediaCleanupWithinBudget,
}));

import {
  GET,
  maxDuration,
  POST,
} from "@/app/api/internal/feed-media/cleanup/route";

const monitorSecret = "m".repeat(48);

describe("GET and POST /api/internal/feed-media/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = monitorSecret;
    process.env.FEED_MEDIA_CLEANUP_SECRET = monitorSecret;
    mocks.runFeedMediaCleanupWithinBudget.mockResolvedValue({
      attempted: 3,
      batches: 2,
      budgetExhausted: false,
      deleted: 3,
      failed: 0,
      hasMore: false,
      ok: true,
      queued: 0,
      reconciled: 1,
    });
    mocks.pruneResolvedFeedMediaCleanupQueue.mockResolvedValue({
      ok: true,
      pruned: 5,
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.FEED_MEDIA_CLEANUP_SECRET;
  });

  it("fails closed without a valid bearer secret and performs no cleanup", async () => {
    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${"x".repeat(48)}` },
        method: "GET",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({ ok: false });
    expect(mocks.runFeedMediaCleanupWithinBudget).not.toHaveBeenCalled();
    expect(mocks.pruneResolvedFeedMediaCleanupQueue).not.toHaveBeenCalled();
  });

  it("rejects a configured secret shorter than the security contract", async () => {
    process.env.CRON_SECRET = "short-secret";
    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: "Bearer short-secret" },
        method: "GET",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.runFeedMediaCleanupWithinBudget).not.toHaveBeenCalled();
    expect(mocks.pruneResolvedFeedMediaCleanupQueue).not.toHaveBeenCalled();
  });

  it("returns only aggregate cleanup results for an authorized cron GET", async () => {
    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      attempted: 3,
      budgetExhausted: false,
      deleted: 3,
      failed: 0,
      hasMore: false,
      ok: true,
      pruned: 5,
      queued: 0,
      reconciled: 1,
    });
    expect(mocks.runFeedMediaCleanupWithinBudget).toHaveBeenCalledWith();
    expect(mocks.pruneResolvedFeedMediaCleanupQueue).toHaveBeenCalledWith({
      limit: 10_000,
    });
  });

  it("surfaces cleanup failure without exposing the bearer value", async () => {
    mocks.runFeedMediaCleanupWithinBudget.mockResolvedValue({
      attempted: 1,
      batches: 1,
      budgetExhausted: false,
      deleted: 0,
      failed: 1,
      hasMore: true,
      ok: false,
      queued: 0,
      reconciled: 0,
    });

    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "GET",
      }),
    );
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(503);
    expect(body).not.toContain(monitorSecret);
    expect(body).not.toContain("feed/v1/");
  });

  it("reports a time-budget stop as aggregate-only resumable work", async () => {
    mocks.runFeedMediaCleanupWithinBudget.mockResolvedValue({
      attempted: 2_900,
      batches: 30,
      budgetExhausted: true,
      deleted: 2_900,
      failed: 0,
      hasMore: true,
      ok: true,
      queued: 0,
      reconciled: 0,
    });

    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "GET",
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      attempted: 2_900,
      budgetExhausted: true,
      hasMore: true,
      ok: true,
    });
    expect(JSON.stringify(result)).not.toContain("feed/v1/");
    expect(maxDuration).toBe(60);
  });

  it("returns a failure aggregate when cleanup reconciliation is unavailable", async () => {
    mocks.runFeedMediaCleanupWithinBudget.mockResolvedValue({
      attempted: 3,
      batches: 2,
      budgetExhausted: false,
      deleted: 2,
      failed: 1,
      hasMore: true,
      ok: false,
      queued: 0,
      reconciled: 0,
    });

    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "GET",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      attempted: 3,
      budgetExhausted: false,
      deleted: 2,
      failed: 1,
      hasMore: true,
      ok: false,
      pruned: 5,
      queued: 0,
      reconciled: 0,
    });
  });

  it("does not let a manual-only secret authorize the Vercel cron GET", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "GET",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.runFeedMediaCleanupWithinBudget).not.toHaveBeenCalled();
    expect(mocks.pruneResolvedFeedMediaCleanupQueue).not.toHaveBeenCalled();
  });

  it("retains an authenticated POST for manual recovery", async () => {
    const response = await POST(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.runFeedMediaCleanupWithinBudget).toHaveBeenCalledTimes(1);
    expect(mocks.pruneResolvedFeedMediaCleanupQueue).toHaveBeenCalledTimes(1);
  });

  it("fails the aggregate when resolved metadata pruning is unavailable", async () => {
    mocks.pruneResolvedFeedMediaCleanupQueue.mockResolvedValue({
      ok: false,
      pruned: 0,
    });

    const response = await GET(
      new Request("https://nuang.app/api/internal/feed-media/cleanup", {
        headers: { authorization: `Bearer ${monitorSecret}` },
        method: "GET",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      attempted: 3,
      budgetExhausted: false,
      deleted: 3,
      failed: 1,
      hasMore: false,
      ok: false,
      pruned: 0,
      queued: 0,
      reconciled: 1,
    });
  });

  it("registers one Hobby-compatible daily GET schedule", () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: Array<{ path?: string; schedule?: string }> };

    expect(configuration.crons).toEqual([
      {
        path: "/api/internal/feed-media/cleanup",
        schedule: "43 18 * * *",
      },
    ]);
  });
});
