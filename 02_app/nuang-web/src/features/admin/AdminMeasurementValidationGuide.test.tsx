import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminMeasurementValidationGuide } from "@/features/admin/AdminMeasurementValidationGuide";

describe("AdminMeasurementValidationGuide", () => {
  it("explains the independent review fields, ordering, and approval boundary", () => {
    render(<AdminMeasurementValidationGuide />);

    expect(screen.getByText("M04 · 독립 전문가 검토")).toBeInTheDocument();
    expect(screen.getByText("Stage 1 · 목표를 숨긴 검토")).toBeInTheDocument();
    expect(screen.getByText("Stage 2 · 목표 공개 후 검토")).toBeInTheDocument();
    expect(screen.getByText("첫 번째 구성개념")).toBeInTheDocument();
    expect(screen.getByText("목표 관련성")).toBeInTheDocument();
    expect(
      screen.getByText("유효 검토자 6명 이상 집계·최종 판정"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("‘최종 승인’ 버튼이 의미해야 하는 것"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/고객용 코드·점수·리포트가 자동 발행되지 않습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/research:core:review-web-forms -- --output-root/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("AI 사전검토 · 인간 검토나 승인이 아닙니다"),
    ).toBeInTheDocument();
    expect(screen.getByText(/사람 검증 gate를 통과·승인·활성/)).toBeInTheDocument();
  });
});
