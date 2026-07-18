import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharePage, { metadata } from "@/app/share/[token]/page";
import { createPublicShareSuccessPayload } from "@/features/share/public-share-contract";

const readPublicShareTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/share/public-share-server", () => ({
  readPublicShareToken: readPublicShareTokenMock,
}));

describe("SharePage", () => {
  beforeEach(() => {
    readPublicShareTokenMock.mockReset();
    readPublicShareTokenMock.mockResolvedValue({ status: "closed" });
  });

  it("keeps the pending share page summary-only and noindex", async () => {
    render(await SharePage({ params: Promise.resolve({ token: "test-token" }) }));

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(screen.getByText("공유 리포트 준비 중")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "아직 공유 결과를 열 수 없어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/임의의 결과를 보여주지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText(/대표 성향과 최대 5개/)).toBeInTheDocument();
    expect(screen.getByText("문항별 답변, 원점수, 계정 정보는 보이지 않아요."))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "빠른 코어 시작하기" })).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick",
    );
  });

  it("renders an active public report with a same-assessment CTA", async () => {
    readPublicShareTokenMock.mockResolvedValue({
      payload: createPublicShareSuccessPayload({
        assessmentKind: "full",
        completedAt: "2026-07-04T00:00:00.000Z",
        domains: [
          { domainId: "SE", label: "사람 사이 에너지", score: 72, symbol: "T" },
          { domainId: "ER", label: "마음의 반응", score: 64, symbol: "V" },
          { domainId: "SM", label: "일상 리듬", score: 68, symbol: "O" },
          { domainId: "RO", label: "관계 방식", score: 58, symbol: "A" },
          { domainId: "OE", label: "감각과 생각", score: 66, symbol: "E" },
        ],
        profileCode: "TVOAE",
        profileName: "불꽃의 온기 탐험가",
        resultLabel: "현재 대표 성향",
      }),
      status: "active",
    });

    render(await SharePage({ params: Promise.resolve({ token: "active-token" }) }));

    expect(screen.getByRole("heading", { name: "불꽃의 온기 탐험가" }))
      .toBeInTheDocument();
    expect(screen.getByText("TVOAE")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "공유된 코드 지도 그래프" }))
      .toBeInTheDocument();
    expect(screen.getByText("공유 범위")).toBeInTheDocument();
    expect(screen.queryByText(/문항별 답변/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "나도 같은 검사 해보기" }))
      .toHaveAttribute("href", "/assessments/nu-core-full");
  });
});
