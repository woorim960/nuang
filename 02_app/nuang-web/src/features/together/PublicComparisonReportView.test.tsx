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
  code: "FOAMT",
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
  profileName: "불꽃 온기 탐험가",
};

const targetResult: CoreScoreResult = {
  ...viewerResult,
  code: "WESCI",
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
  profileName: "물결 새길 개척가",
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

    expect(screen.getByRole("heading", { name: "우리는 이렇게 달라요" })).toBeInTheDocument();
    expect(screen.getByText("불꽃 온기 탐험가")).toBeInTheDocument();
    expect(screen.getByText("물결 새길 개척가")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공통점" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "차이점" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "대화 질문" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "조절 가이드" })).toBeInTheDocument();
    expect(screen.getByText("궁합 점수 없음")).toBeInTheDocument();
    expect(screen.getByText("순위 없음")).toBeInTheDocument();
    expect(screen.getByText("비공개 추정 없음")).toBeInTheDocument();
    expect(screen.queryByText(/직접 문항 응답/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score_payload/)).not.toBeInTheDocument();
    expect(screen.queryByText(/itemId/)).not.toBeInTheDocument();
  });
});
