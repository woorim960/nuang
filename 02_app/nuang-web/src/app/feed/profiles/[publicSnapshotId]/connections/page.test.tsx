import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommunityProfileConnectionsPage from "@/app/feed/profiles/[publicSnapshotId]/connections/page";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  notFound: vi.fn(),
  readCommunityProfileConnections: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/feed/server-community-social", () => ({
  readCommunityProfileConnections: mocks.readCommunityProfileConnections,
}));

vi.mock(
  "@/features/public-profile/CommunityProfileConnectionsScreen",
  () => ({
    CommunityProfileConnectionsScreen: ({
      activeTab,
      result,
    }: {
      activeTab: string;
      result: { state: string };
    }) => (
      <div data-active-tab={activeTab} data-testid="connections-state">
        {result.state}
      </div>
    ),
  }),
);

const publicSnapshotId = "11111111-1111-4111-8111-111111111111";
const viewer = { id: "auth-viewer" };

describe("CommunityProfileConnectionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: viewer },
          error: null,
        }),
      },
    });
    mocks.createSupabaseServiceClient.mockReturnValue({});
    mocks.readCommunityProfileConnections.mockResolvedValue({
      followers: [],
      following: [],
      ownerDisplayName: "주인",
      ownerPublicSnapshotId: publicSnapshotId,
      state: "ready",
    });
  });

  it("passes the verified viewer to the bilateral block-aware read", async () => {
    render(
      await CommunityProfileConnectionsPage({
        params: Promise.resolve({ publicSnapshotId }),
        searchParams: Promise.resolve({ tab: "following" }),
      }),
    );

    expect(mocks.readCommunityProfileConnections).toHaveBeenCalledWith({
      client: {},
      publicSnapshotId,
      user: viewer,
    });
    expect(screen.getByTestId("connections-state")).toHaveTextContent("ready");
    expect(screen.getByTestId("connections-state")).toHaveAttribute(
      "data-active-tab",
      "following",
    );
  });

  it("does not run a public read when authentication verification fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "auth unavailable" },
        }),
      },
    });

    render(
      await CommunityProfileConnectionsPage({
        params: Promise.resolve({ publicSnapshotId }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mocks.readCommunityProfileConnections).not.toHaveBeenCalled();
    expect(screen.getByTestId("connections-state")).toHaveTextContent(
      "unavailable",
    );
  });

  it("uses not-found for a blocked owner relationship", async () => {
    mocks.readCommunityProfileConnections.mockResolvedValue({
      followers: [],
      following: [],
      ownerDisplayName: "프로필",
      ownerPublicSnapshotId: publicSnapshotId,
      state: "profile_not_found",
    });

    await expect(
      CommunityProfileConnectionsPage({
        params: Promise.resolve({ publicSnapshotId }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
