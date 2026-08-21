import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCharacterProfileImage } from "@/features/public-profile/profile-image";
import { BlockedProfilesScreen } from "@/features/account/BlockedProfilesScreen";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BlockedProfilesScreen", () => {
  it("loads blocked profiles and removes one after a successful unblock", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          blockedProfiles: [
            {
              blockedAccountId: "11111111-1111-4111-8111-111111111111",
              blockedAt: "2026-07-21T00:00:00.000Z",
              code: "ENAKQ",
              communityProfileId: "33333333-3333-4333-8333-333333333333",
              displayName: "여름",
              profileImage: createCharacterProfileImage({
                alt: "여름 프로필 이미지",
                motif: "purple",
              }),
              profileName: "관계를 여는 선도자",
              publicSnapshotId: "22222222-2222-4222-8222-222222222222",
            },
          ],
          ok: true,
        }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(<BlockedProfilesScreen />);

    expect(await screen.findByText("여름")).toBeInTheDocument();
    expect(screen.getByText("ENAKQ · 관계를 여는 선도자")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "차단 해제" }));

    await waitFor(() => {
      expect(screen.queryByText("여름")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "여름님의 차단을 해제했어요.",
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/community/blocks",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      blockedAccountId: "11111111-1111-4111-8111-111111111111",
      communityProfileId: "33333333-3333-4333-8333-333333333333",
      publicSnapshotId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("shows a useful empty state without adding another setting task", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          blockedProfiles: [],
          ok: true,
        }),
      ),
    );

    render(<BlockedProfilesScreen />);

    expect(
      await screen.findByText("차단한 프로필이 없어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("상대 프로필의 더보기 메뉴에서 차단할 수 있어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "차단한 사람과는 서로의 프로필과 게시물이 보이지 않으며, 상대에게 알리지 않아요.",
      ),
    ).toBeInTheDocument();
  });

  it("offers a login path when the session is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "로그인이 필요해요.", ok: false },
            { status: 401 },
          ),
        ),
    );

    render(<BlockedProfilesScreen />);

    expect(await screen.findByText("로그인이 필요해요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인하기" })).toHaveAttribute(
      "href",
      "/login?next=%2Fmy%2Fsettings%2Fblocked&reason=community",
    );
  });
});
