import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharePage, { generateMetadata } from "@/app/share/[token]/page";

const readPublicShareTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/share/public-share-server", () => ({
  readPublicShareToken: readPublicShareTokenMock,
}));
vi.mock(
  "@/features/result/unified-core-report/CoreResultReportTemplate",
  () => ({
    CoreResultReportTemplate: ({
      model,
      surface,
    }: {
      model: { result: { code: string } };
      surface: string;
    }) => (
      <main>
        <h1>{model.result.code}</h1>
        <p>{surface}</p>
      </main>
    ),
  }),
);
vi.mock("@/features/share/GuestReportShareView", () => ({
  GuestReportShareView: ({
    canonicalUrl,
    content,
  }: {
    canonicalUrl: string;
    content: { resultName: string };
  }) => (
    <main>
      <h1>{content.resultName}</h1>
      <p>{canonicalUrl}</p>
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

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "test-token" }),
    });
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
      shareKind: "account_core",
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

  it("publishes a branded large preview for an active share", async () => {
    readPublicShareTokenMock.mockResolvedValue({
      model: {
        result: {
          code: "ENAKQ",
          currentProfileName: "차분한 탐색가",
        },
      },
      shareKind: "account_core",
      status: "active",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "active-token" }),
    });

    expect(metadata.title).toBe("차분한 탐색가 | 뉴앙 결과 리포트");
    expect(metadata.openGraph).toMatchObject({
      images: [
        expect.objectContaining({
          height: 630,
          url: "https://nuang.app/images/share/nuang-result-share-card-v1.png",
          width: 1200,
        }),
      ],
      siteName: "뉴앙",
    });
  });

  it("renders and previews a guest summary without account data", async () => {
    readPublicShareTokenMock.mockResolvedValue({
      content: {
        contentVersion: "report-share-v1",
        highlights: ["천천히 대화를 풀어가요"],
        reportType: "lab",
        resultName: "잔잔한 대화",
        summary: "말을 고르며 차분하게 대화를 이어가는 편이에요.",
        title: "대화 온도 결과",
      },
      shareKind: "guest_summary",
      status: "active",
    });

    render(
      await SharePage({ params: Promise.resolve({ token: "g1.test.token" }) }),
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "g1.test.token" }),
    });

    expect(screen.getByRole("heading", { name: "잔잔한 대화" })).toBeInTheDocument();
    expect(metadata.openGraph).toMatchObject({
      images: [
        expect.objectContaining({
          url: "https://nuang.app/images/share/nuang-result-share-lab-v2.png",
        }),
      ],
    });
  });
});
