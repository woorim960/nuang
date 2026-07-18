import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicComparisonReportRouteView } from "@/features/together/PublicComparisonReportRouteView";
import {
  createPublicComparisonReportPayload,
  createPublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

const result: CoreScoreResult = {
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
  ],
  facets: [],
  profileName: "불꽃의 온기 탐험가",
};

function createReport() {
  const viewer = createPublicProfileSnapshotPayload({
    createdAt: "2026-07-04T00:00:00.000Z",
    displayProfile: {
      displayName: "나",
      motif: "flame",
    },
    result,
    snapshotId: "11111111-1111-4111-8111-111111111111",
  });
  const target = createPublicProfileSnapshotPayload({
    createdAt: "2026-07-04T00:00:00.000Z",
    displayProfile: {
      displayName: "상대",
      motif: "water",
    },
    result,
    snapshotId: "22222222-2222-4222-8222-222222222222",
  });

  return createPublicComparisonReportPayload({
    comparisonId: "33333333-3333-4333-8333-333333333333",
    createdAt: "2026-07-04T00:00:00.000Z",
    target,
    viewer,
  });
}

describe("PublicComparisonReportRouteView", () => {
  it("renders the pending shell before server lookup opens", () => {
    render(
      <PublicComparisonReportRouteView
        state={{
          comparisonReportId: "33333333-3333-4333-8333-333333333333",
          kind: "pending",
        }}
      />,
    );

    expect(screen.getByText("조회 준비 중")).toBeInTheDocument();
    expect(screen.getByText(/비교 리포트 조회는 아직 열기 전이에요/)).toBeInTheDocument();
  });

  it("renders the active report when a safe payload exists", () => {
    render(
      <PublicComparisonReportRouteView
        state={{
          kind: "active",
          report: createReport(),
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "에너지가 시작되는 방식에서 비슷한 리듬이 보여요." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "뉴앙 코드 비교" })).toBeInTheDocument();
  });

  it("renders the unavailable state without report payloads", () => {
    render(
      <PublicComparisonReportRouteView
        state={{
          kind: "unavailable",
          status: "stale",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "비교 리포트를 다시 확인해야 해요" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "뉴앙 코드 비교" })).not.toBeInTheDocument();
  });
});
