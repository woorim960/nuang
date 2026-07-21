import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditForm } from "@/features/account/ProfileEditForm";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMock,
}));

const profile = {
  avatar: {
    alt: "여름 프로필",
    source: "user_uploaded" as const,
    src: "https://example.com/avatar.webp",
  },
  avatarCharacterKey: "purple" as const,
  bio: "카페와 산책을 좋아해요.",
  code: "ENAKQ",
  displayName: "여름",
  handle: "summer.walk",
  profileName: "관계를 여는 지휘자",
  publicId: "profile-1",
  revision: 4,
};

describe("ProfileEditForm", () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    navigationMock.refresh.mockClear();
    navigationMock.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the current public profile and saves changed fields as multipart data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, profile }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          profile: { ...profile, displayName: "새여름", revision: 5 },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileEditForm />);

    const nameInput = await screen.findByLabelText("이름");
    expect(nameInput).toHaveValue("여름");
    expect(screen.getByLabelText("아이디")).toHaveValue("summer.walk");
    expect(screen.getByLabelText("프로필 메시지")).toHaveAttribute(
      "maxlength",
      "120",
    );
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "새여름" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith("/my");
    });

    const request = fetchMock.mock.calls[1];
    expect(request?.[0]).toBe("/api/me/profile");
    expect(request?.[1]).toMatchObject({ method: "PATCH" });
    const body = request?.[1]?.body as FormData;
    expect(body.get("displayName")).toBe("새여름");
    expect(body.get("handle")).toBe("summer.walk");
    expect(body.get("bio")).toBe("카페와 산책을 좋아해요.");
    expect(body.get("expectedRevision")).toBe("4");
    expect(body.get("removeAvatar")).toBe("false");
  });

  it("lets the user choose and persist a built-in Nuang character", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, profile }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          profile: {
            ...profile,
            avatar: {
              alt: "아쿠아 뉴앙 캐릭터",
              motif: "water",
              source: "character",
              src: "/assets/characters/nuang-character-water.webp",
            },
            avatarCharacterKey: "water",
            revision: 5,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileEditForm />);

    fireEvent.click(
      await screen.findByRole("button", { name: "기본 캐릭터 사용" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "아쿠아 캐릭터 선택" }));
    expect(screen.getByAltText("뉴앙 기본 프로필 캐릭터")).toHaveAttribute(
      "src",
      "/assets/characters/nuang-character-water.webp",
    );

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = fetchMock.mock.calls[1]?.[1]?.body as FormData;
    expect(body.get("removeAvatar")).toBe("true");
    expect(body.get("avatarCharacterKey")).toBe("water");
  });

  it("keeps invalid handles out of the save flow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true, profile })),
    );

    render(<ProfileEditForm />);

    fireEvent.change(await screen.findByLabelText("아이디"), {
      target: { value: "한글아이디" },
    });

    expect(
      screen.getByText(
        "아이디에는 영문 소문자, 숫자, 점과 밑줄만 사용할 수 있어요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
