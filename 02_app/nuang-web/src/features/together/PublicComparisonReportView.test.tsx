import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportView } from "@/features/together/PublicComparisonReportView";
import {
  createPublicComparisonReportPayload,
  createPublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

const viewerResult: CoreScoreResult = {
  alternativeCodes: [],
  code: "ENAKQ",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72,
      status: "valid",
      symbol: "E",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "걱정과 감정 반응",
      score: 64,
      status: "valid",
      symbol: "Q",
    },
  ],
  facets: [],
  profileName: "관계를 여는 지휘자",
};

const targetResult: CoreScoreResult = {
  ...viewerResult,
  code: "IRGMQ",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 38,
      status: "valid",
      symbol: "I",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "걱정과 감정 반응",
      score: 62,
      status: "valid",
      symbol: "Q",
    },
  ],
  profileName: "질문을 품은 탐구자",
};

describe("PublicComparisonReportView", () => {
  it("renders an active public comparison payload as report sections", () => {
    const viewer = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "나",
        motif: "flame",
      },
      result: viewerResult,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const target = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "상대",
        motif: "water",
      },
      result: targetResult,
      snapshotId: "22222222-2222-4222-8222-222222222222",
    });
    const report = createPublicComparisonReportPayload({
      comparisonId: "33333333-3333-4333-8333-333333333333",
      createdAt: "2026-07-04T00:00:00.000Z",
      target,
      viewer,
    });

    render(<PublicComparisonReportView report={report} />);

    expect(
      screen.getByRole("heading", {
        name: "상대와 나는 어디가 닮고 다를까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("관계를 여는 지휘자")).toBeInTheDocument();
    expect(screen.getByText("질문을 품은 탐구자")).toBeInTheDocument();
    expect(screen.getByText("한눈에 보기")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "각자 편한 방식은 이만큼 달라요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /사람 사이 에너지/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /걱정과 감정 반응/ }),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("나:");
    expect(document.body).not.toHaveTextContent("상대:");
    expect(
      screen.getAllByText(/함께할 때 활력이 올라요/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/혼자 정리하며 회복해요/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: "함께 있을 때 이런 차이가 보일 수 있어요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("오늘 한 가지 물어본다면")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        "지금 바로 이야기할까, 생각을 정리한 뒤 다시 이야기할까?",
      ),
    ).toHaveLength(1);
    expect(
      screen.getByText("서로 공개한 성향 정보만 사용했어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/직접 응답, 원점수, 민감 항목/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /관계에 맞춰 보기/ }));
    expect(
      screen.getByRole("heading", { name: "어떤 관계에서 살펴볼까요?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /마음 가는 사람/ }));
    expect(
      screen.getByRole("button", { name: /마음 가는 사람/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/직접 문항 응답/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score_payload/)).not.toBeInTheDocument();
    expect(screen.queryByText(/itemId/)).not.toBeInTheDocument();
  });

  it("shows a shared direction once when both people have the same code direction", () => {
    const viewer = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "나",
        motif: "flame",
      },
      result: viewerResult,
      snapshotId: "44444444-4444-4444-8444-444444444444",
    });
    const target = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "친구",
        motif: "water",
      },
      result: viewerResult,
      snapshotId: "55555555-5555-4555-8555-555555555555",
    });
    const report = createPublicComparisonReportPayload({
      comparisonId: "66666666-6666-4666-8666-666666666666",
      createdAt: "2026-07-04T00:00:00.000Z",
      target,
      viewer,
    });

    render(<PublicComparisonReportView report={report} />);

    expect(
      screen.getByText("두 사람에게 공통으로 나타난 방향"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("함께할 때 활력이 올라요")).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        name: "비슷해도 한 번 확인하면 좋은 순간이에요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("현재 공개된 자리에서는 큰 차이가 없어요"),
    ).toBeInTheDocument();
  });
});
