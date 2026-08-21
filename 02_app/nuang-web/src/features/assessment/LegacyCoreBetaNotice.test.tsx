import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegacyCoreBetaNotice } from "./LegacyCoreBetaNotice";

describe("LegacyCoreBetaNotice", () => {
  it("announces the unvalidated status and sharing limit together", () => {
    render(<LegacyCoreBetaNotice context="result" />);

    const notice = screen.getByRole("complementary", {
      name: "탐색적 비검증 베타 안내",
    });
    expect(notice).toHaveTextContent("탐색적 비검증 베타");
    expect(notice).toHaveTextContent("참고용 · 공유 불가");
    expect(notice).toHaveTextContent("대표 뉴앙 코드로 확정되거나");
  });

  it("labels preserved map pages as an earlier beta", () => {
    render(<LegacyCoreBetaNotice context="map" />);

    expect(
      screen.getByRole("complementary", {
        name: "이전 베타 성향지도 안내",
      }),
    ).toHaveTextContent("검색 결과에는 노출하지 않아요");
  });
});
