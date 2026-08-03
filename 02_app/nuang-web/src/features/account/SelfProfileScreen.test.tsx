import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelfProfileScreen } from "@/features/account/SelfProfileScreen";
import type { SelfProfilePayload } from "@/features/account/self-profile-contract";

vi.mock("next/navigation", () => ({
  usePathname: () => "/my",
}));

describe("SelfProfileScreen", () => {
  it("keeps the real profile and the complete shell before the first assessment", async () => {
    const user = userEvent.setup();
    render(<SelfProfileScreen payload={createPayload()} />);

    expect(screen.getByRole("heading", { name: "다온" })).toBeInTheDocument();
    expect(screen.getByText("@daon.day")).toBeInTheDocument();
    expect(screen.getByText("느긋한 산책을 좋아해요.")).toBeInTheDocument();
    expect(screen.getByAltText("다온 프로필 이미지")).toBeInTheDocument();
    expect(screen.getAllByText("첫 검사 전")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "프로필 편집" })).toHaveAttribute(
      "href",
      "/my/profile/edit",
    );
    expect(
      screen.getByRole("link", { name: "첫 성향 검사 시작하기" }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports",
    );
    expect(
      screen.queryByRole("button", { name: "프로필 공유" }),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("tab", { name: /게시물/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    screen.getByRole("tab", { name: /게시물/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /검사 결과/ })).toHaveFocus();
    expect(
      screen.getByText("아직 완료한 검사 결과가 없어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "첫 검사 시작하기" }),
    ).toBeInTheDocument();
  });

  it("keeps the same profile layout and enables sharing after assessment", () => {
    render(
      <SelfProfileScreen
        payload={createPayload({
          assessmentJourney: {
            reportHref: "/results/account/result-1",
            state: "full_completed",
          },
          capabilities: {
            canEdit: true,
            canShare: true,
            showAdminEntry: false,
          },
          profile: {
            ...createPayload().profile,
            publicSnapshotId: "snapshot-1",
          },
          stats: { followers: 12, following: 8, posts: 0, reports: 0 },
          trait: {
            code: "ENAKQ",
            completedAt: "2026-08-01T00:00:00.000Z",
            profileName: "다정한 탐험가",
            source: "full",
          },
          viewerCode: "ENAKQ",
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "다온" })).toBeInTheDocument();
    expect(screen.getByText("ENAKQ")).toBeInTheDocument();
    expect(screen.getByText("다정한 탐험가")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "프로필 공유" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "프로필 편집" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /게시물/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /검사 결과/ })).toBeInTheDocument();
  });

  it("announces the exact persisted progress", () => {
    render(
      <SelfProfileScreen
        payload={createPayload({
          assessmentJourney: {
            answeredCount: 7,
            assessmentKind: "quick",
            href: "/assessments/nu-core-quick",
            resumeOrdinal: 8,
            state: "in_progress",
            totalCount: 20,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("progressbar", {
        name: "20개 중 7개 답변 완료, 8번부터 이어서 진행",
      }),
    ).toHaveAttribute("aria-valuenow", "7");
    expect(
      screen.getByRole("link", { name: "8번부터 이어하기" }),
    ).toBeInTheDocument();
  });

  it("shows unknown values and an area recovery message without fabricating zero", () => {
    render(
      <SelfProfileScreen
        payload={createPayload({
          contentState: {
            posts: "unavailable",
            reports: "ready",
            trait: "unavailable",
          },
          stats: { followers: null, following: null, posts: null, reports: 0 },
        })}
      />,
    );

    expect(
      screen.getByText("성향 정보를 불러오지 못했어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("게시물을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });
});

function createPayload(
  overrides: Partial<SelfProfilePayload> = {},
): SelfProfilePayload {
  return {
    assessmentJourney: { state: "not_started" },
    capabilities: {
      canEdit: true,
      canShare: false,
      showAdminEntry: false,
    },
    contentState: {
      posts: "ready",
      reports: "ready",
      trait: "ready",
    },
    posts: [],
    profile: {
      bio: "느긋한 산책을 좋아해요.",
      displayName: "다온",
      handle: "daon.day",
      image: {
        alt: "다온 프로필 이미지",
        motif: "purple",
        source: "character",
        src: "/characters/nuang-purple.svg",
      },
      publicId: "profile-1",
      publicSnapshotId: null,
    },
    reports: [],
    stats: {
      followers: 0,
      following: 0,
      posts: 0,
      reports: 0,
    },
    trait: null,
    viewerCode: null,
    ...overrides,
  };
}
