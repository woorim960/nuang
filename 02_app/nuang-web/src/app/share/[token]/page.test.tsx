import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharePage, { metadata } from "@/app/share/[token]/page";

const readPublicShareTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/share/public-share-server", () => ({
  readPublicShareToken: readPublicShareTokenMock,
}));
vi.mock("@/features/result/unified-core-report/CoreResultReportTemplate", () => ({
  CoreResultReportTemplate: ({ model, surface }: { model: { result: { code: string } }; surface: string }) => (
    <main>
      <h1>{model.result.code}</h1>
      <p>{surface}</p>
    </main>
  ),
}));

describe("SharePage", () => {
  beforeEach(() => {
    readPublicShareTokenMock.mockReset();
    readPublicShareTokenMock.mockResolvedValue({ status: "closed" });
  });

  it("shows only an unavailable state when an old link cannot resolve", async () => {
    render(
      await SharePage({ params: Promise.resolve({ token: "test-token" }) }),
    );

    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
    expect(
      screen.getByRole("heading", { name: "이 리포트는 지금 볼 수 없어요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "공유한 사람이 결과를 숨겼거나 주소의 사용 기간이 끝났어요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/임의의 결과|최대 5개|DB|서버/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "다른 검사 둘러보기" }),
    ).toHaveAttribute("href", "/home");
  });

  it("renders an active token with the share projection", async () => {
    readPublicShareTokenMock.mockResolvedValue({
      model: { result: { code: "ENAKQ" } },
      status: "active",
    });

    render(
      await SharePage({
        params: Promise.resolve({ token: "active-token" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "ENAKQ" })).toBeInTheDocument();
    expect(screen.getByText("share")).toBeInTheDocument();
  });
});
