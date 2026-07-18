import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportView } from "@/features/together/PublicComparisonReportView";
import {
  createPublicComparisonReportPayload,
  createPublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

const viewerResult: CoreScoreResult = {
  alternativeCodes: [],
  code: "TVOAE",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72,
      status: "valid",
      symbol: "T",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "마음의 반응",
      score: 64,
      status: "valid",
      symbol: "V",
    },
  ],
  facets: [],
  profileName: "불꽃의 온기 탐험가",
};

const targetResult: CoreScoreResult = {
  ...viewerResult,
  code: "SVODE",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 38,
      status: "valid",
      symbol: "S",
    },
    {
      domainId: "ER",
      isBoundary: false,
      label: "마음의 반응",
      score: 62,
      status: "valid",
      symbol: "V",
    },
  ],
  profileName: "물결의 새길 개척가",
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
        name: "편하게 맞는 자리는 마음이 흔들릴 때의 반응, 신호를 맞출 자리는 에너지가 시작되는 방식이에요.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("불꽃의 온기 탐험가")).toBeInTheDocument();
    expect(screen.getByText("물결의 새길 개척가")).toBeInTheDocument();
    expect(screen.getByText("핵심 요약")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "뉴앙 코드 비교" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "에너지가 시작되는 방식" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "마음이 흔들릴 때의 반응" })).toBeInTheDocument();
    expect(screen.getAllByText("먼저 움직이는 에너지")).toHaveLength(1);
    expect(document.body).not.toHaveTextContent("나:");
    expect(document.body).not.toHaveTextContent("상대:");
    expect(screen.getAllByText(/먼저 움직이는 에너지/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/조용히 살피는 에너지/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "오해가 생길 수 있는 장면" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "대화 가이드" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "조율 가이드" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공개 범위 기준" })).toBeInTheDocument();
    expect(screen.getByText(/직접 응답, 원점수, 민감 항목/)).toBeInTheDocument();
    expect(screen.queryByText(/직접 문항 응답/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score_payload/)).not.toBeInTheDocument();
    expect(screen.queryByText(/itemId/)).not.toBeInTheDocument();
  });
});
