import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommunityProfileReportPage from "@/app/feed/profiles/[publicSnapshotId]/report/page";

const mocks = vi.hoisted(() => ({
  createServerCommunityProfilePayload: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  notFound: vi.fn(),
  readCommunityProfileSocialState: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerCommunityProfilePayload:
    mocks.createServerCommunityProfilePayload,
}));

vi.mock("@/features/feed/server-community-social", () => ({
  readCommunityProfileSocialState: mocks.readCommunityProfileSocialState,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/public-profile/CommunityProfileReportScreen", () => ({
  CommunityProfileReportScreen: ({
    availability,
    communityProfileId,
    displayName,
    profileId,
    publicSnapshotId,
  }: {
    availability: string;
    communityProfileId?: string;
    displayName: string;
    profileId: string;
    publicSnapshotId: string;
  }) => (
    <div
      data-availability={availability}
      data-community-profile-id={communityProfileId}
      data-display-name={displayName}
      data-profile-id={profileId}
      data-public-snapshot-id={publicSnapshotId}
      data-testid="report-screen"
    />
  ),
}));

const routeProfileId = "11111111-1111-4111-8111-111111111111";
const sourceSnapshotId = "22222222-2222-4222-8222-222222222222";
const sourceCommunityProfileId = "33333333-3333-4333-8333-333333333333";
const viewer = { id: "auth-viewer" };

describe("CommunityProfileReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerCommunityProfilePayload.mockResolvedValue({
      profile: {
        display: { displayName: "여름" },
        source: {
          communityProfileId: sourceCommunityProfileId,
          publicSnapshotId: sourceSnapshotId,
        },
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: viewer } }),
      },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({ service: true });
    mocks.readCommunityProfileSocialState.mockResolvedValue({
      actions: {
        block: "unavailable",
        follow: "unavailable",
        report: "unavailable",
      },
      followerCount: 0,
      following: false,
      followingCount: 0,
      isOwnProfile: false,
    });
  });

  it("checks and submits against the payload snapshot while retaining the stable route", async () => {
    render(
      await CommunityProfileReportPage({
        params: Promise.resolve({ publicSnapshotId: routeProfileId }),
      }),
    );

    expect(mocks.readCommunityProfileSocialState).toHaveBeenCalledWith({
      client: { service: true },
      communityProfileId: sourceCommunityProfileId,
      publicSnapshotId: sourceSnapshotId,
      user: viewer,
    });
    expect(screen.getByTestId("report-screen")).toHaveAttribute(
      "data-availability",
      "unavailable",
    );
    expect(screen.getByTestId("report-screen")).toHaveAttribute(
      "data-profile-id",
      routeProfileId,
    );
    expect(screen.getByTestId("report-screen")).toHaveAttribute(
      "data-community-profile-id",
      sourceCommunityProfileId,
    );
    expect(screen.getByTestId("report-screen")).toHaveAttribute(
      "data-public-snapshot-id",
      sourceSnapshotId,
    );
  });
});
