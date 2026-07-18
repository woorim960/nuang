import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountResultView } from "@/features/result/AccountResultView";

const fetchMock = vi.fn();
const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

describe("AccountResultView", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          results: [
            {
              assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
              completedAt: "2026-07-09T00:00:00.000Z",
              createdAt: "2026-07-09T00:00:00.000Z",
              domains: [
                {
                  domainId: "SE",
                  label: "사람 사이 에너지",
                  score: 72,
                  symbol: "T",
                },
                {
                  domainId: "ER",
                  label: "마음의 반응",
                  score: 64,
                  symbol: "V",
                },
                {
                  domainId: "SM",
                  label: "일상 리듬",
                  score: 68,
                  symbol: "O",
                },
                {
                  domainId: "RO",
                  label: "관계 방식",
                  score: 58,
                  symbol: "A",
                },
                {
                  domainId: "OE",
                  label: "감각과 생각",
                  score: 66,
                  symbol: "E",
                },
              ],
              facets: [
                {
                  facetId: "SE_SOC",
                  label: "외향 리듬",
                  score: 72,
                  status: "valid",
                },
              ],
              kind: "full",
              localResultId: "local_test_123",
              profileCode: "TVOAE",
              profileName: "불꽃의 온기 탐험가",
              resultLabel: "현재 대표 성향",
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          ],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders a five-axis result without storage terminology", async () => {
    render(
      <AccountResultView resultReportId="22222222-2222-4222-8222-222222222222" />,
    );

    expect(
      await screen.findByRole("heading", { name: "불꽃의 온기 탐험가" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "코드 지도 그래프" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "세부 신호" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/현재 성향을 코드 자리로 요약한 결과/))
      .toBeInTheDocument();
    expect(screen.getByText("결과 리포트")).toBeInTheDocument();
    expect(screen.queryByText(/계정 결과|기기|로컬/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "결과 삭제" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 리포트로 돌아가기" }))
      .toHaveAttribute("href", "/my/reports");
  });
});
