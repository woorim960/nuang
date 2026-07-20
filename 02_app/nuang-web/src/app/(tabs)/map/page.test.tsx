import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MapPage from "@/app/(tabs)/map/page";

describe("MapPage", () => {
  it("uses the map tab as a 32-profile information screen", () => {
    render(<MapPage />);

    expect(
      screen.getByRole("heading", { name: "성향지도" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "32개 뉴앙 코드를 둘러보고, 내 성향은 마이에서 자세히 확인해요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "5글자 뉴앙 코드로 보는 성향" }),
    ).toBeInTheDocument();
    expect(screen.getByText("E로 시작하는 코드")).toBeInTheDocument();
    expect(screen.getByText("ENAKQ")).toBeInTheDocument();
    expect(screen.queryByText("TVOAE")).not.toBeInTheDocument();
  });
});
