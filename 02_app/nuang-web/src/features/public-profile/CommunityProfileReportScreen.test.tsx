import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityProfileReportScreen } from "@/features/public-profile/CommunityProfileReportScreen";

const navigationMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () =>
    "/feed/profiles/11111111-1111-4111-8111-111111111111/report",
  useRouter: () => navigationMock,
}));

describe("CommunityProfileReportScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    navigationMock.push.mockClear();
  });

  it("submits one clear report reason on a dedicated screen", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ reported: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityProfileReportScreen
        availability="ready"
        communityProfileId="22222222-2222-4222-8222-222222222222"
        displayName="여름"
        profileId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        publicSnapshotId="11111111-1111-4111-8111-111111111111"
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/스팸 또는 홍보/));
    fireEvent.click(screen.getByRole("button", { name: "신고 접수하기" }));

    await waitFor(() => {
      expect(screen.getByText("알려주셔서 고마워요")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/community/profile-safety",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      action: "report",
      communityProfileId: "22222222-2222-4222-8222-222222222222",
      publicSnapshotId: "11111111-1111-4111-8111-111111111111",
      reason: "spam",
    });
  });

  it("shows an explicit unavailable state without submitting", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityProfileReportScreen
        availability="unavailable"
        displayName="여름"
        profileId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        publicSnapshotId="11111111-1111-4111-8111-111111111111"
      />,
    );

    expect(
      screen.getByText("이 프로필에서는 신고 기능을 사용할 수 없어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "프로필로 돌아가기" }),
    ).toHaveAttribute(
      "href",
      "/feed/profiles/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "신고 접수하기" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
