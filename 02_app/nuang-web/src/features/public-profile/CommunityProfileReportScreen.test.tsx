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
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ reported: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityProfileReportScreen
        displayName="여름"
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
        body: expect.stringContaining('"reason":"spam"'),
        method: "POST",
      }),
    );
  });
});
