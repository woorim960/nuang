import { describe, expect, it, vi } from "vitest";
import FeedReportSharePage, {
  metadata,
} from "@/app/feed/reports/[postId]/page";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedReportSharePayload: vi.fn(),
}));
const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedReportSharePayload:
    feedReadMocks.createServerFeedReportSharePayload,
}));
vi.mock("next/navigation", () => navigationMocks);

describe("FeedReportSharePage", () => {
  it("redirects a shared feed card to the canonical original report", async () => {
    feedReadMocks.createServerFeedReportSharePayload.mockResolvedValue({
      reportShare: {
        href: "/feed/profiles/profile-1/reports/core_33333333-3333-4333-8333-333333333333",
      },
    });

    await FeedReportSharePage({
      params: Promise.resolve({
        postId: "33333333-3333-4333-8333-333333333333",
      }),
    });

    expect(navigationMocks.redirect).toHaveBeenCalledWith(
      "/feed/profiles/profile-1/reports/core_33333333-3333-4333-8333-333333333333",
    );
  });

  it("does not render the retired summary-only page", async () => {
    navigationMocks.notFound.mockClear();
    navigationMocks.redirect.mockClear();
    feedReadMocks.createServerFeedReportSharePayload.mockResolvedValue({
      reportShare: {
        href: "/feed/reports/legacy-post",
      },
    });

    await FeedReportSharePage({
      params: Promise.resolve({ postId: "legacy-post" }),
    });

    expect(navigationMocks.notFound).toHaveBeenCalled();
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps noindex metadata for feed report shares", () => {
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
    });
  });
});
