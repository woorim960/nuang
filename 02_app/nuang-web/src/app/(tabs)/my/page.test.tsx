import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyPage from "@/app/(tabs)/my/page";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  readSelfProfilePayload: vi.fn(),
  resolveAdminIdentityForUser: vi.fn(),
  serviceClient: { id: "service-client" },
}));

vi.mock("@/features/account/MyOverview", () => ({
  MyOverview: ({ initialContent }: { initialContent: string }) => (
    <section aria-label="guest-overview">{initialContent}</section>
  ),
}));

vi.mock("@/features/account/SelfProfileScreen", () => ({
  SelfProfileScreen: ({ initialContent }: { initialContent: string }) => (
    <section aria-label="self-profile">{initialContent}</section>
  ),
  SelfProfileUnavailable: () => (
    <section aria-label="self-profile-recovery">복구</section>
  ),
}));

vi.mock("@/features/account/server-self-profile", () => ({
  readSelfProfilePayload: mocks.readSelfProfilePayload,
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminIdentityForUser: mocks.resolveAdminIdentityForUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => mocks.serviceClient),
}));

describe("MyPage", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.readSelfProfilePayload.mockReset();
    mocks.resolveAdminIdentityForUser.mockReset();
    mocks.resolveAdminIdentityForUser.mockResolvedValue(null);
  });

  it("shows the guest overview only when there is no authenticated user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    render(
      await MyPage({
        searchParams: Promise.resolve({ tab: "reports" }),
      }),
    );

    expect(screen.getByLabelText("guest-overview")).toBeInTheDocument();
    expect(screen.getByLabelText("guest-overview")).toHaveTextContent(
      "reports",
    );
    expect(mocks.readSelfProfilePayload).not.toHaveBeenCalled();
  });

  it("uses the same self profile screen before an assessment", async () => {
    const user = { id: "user-1" };
    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.readSelfProfilePayload.mockResolvedValue({
      payload: { profile: { displayName: "다온" } },
      state: "ready",
    });

    render(await MyPage({ searchParams: Promise.resolve({ tab: "reports" }) }));

    expect(screen.getByLabelText("self-profile")).toHaveTextContent("reports");
    expect(screen.queryByLabelText("guest-overview")).not.toBeInTheDocument();
    expect(mocks.readSelfProfilePayload).toHaveBeenCalledWith({
      client: mocks.serviceClient,
      showAdminEntry: false,
      user,
    });
  });

  it("keeps an authenticated recovery screen instead of falling back to guest UI", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.readSelfProfilePayload.mockResolvedValue({
      state: "profile_unavailable",
    });

    render(await MyPage({}));

    expect(screen.getByLabelText("self-profile-recovery")).toBeInTheDocument();
    expect(screen.queryByLabelText("guest-overview")).not.toBeInTheDocument();
  });
});
