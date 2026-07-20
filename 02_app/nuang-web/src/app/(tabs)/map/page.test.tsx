import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MapPage from "@/app/(tabs)/map/page";

const localStorageValues = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageValues.get(key) ?? null),
  removeItem: vi.fn((key: string) => localStorageValues.delete(key)),
  setItem: vi.fn((key: string, value: string) =>
    localStorageValues.set(key, value),
  ),
};

describe("MapPage", () => {
  beforeEach(() => {
    localStorageValues.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
  });

  it("starts without a fixed profile and opens ENAKQ only after selection", async () => {
    const user = userEvent.setup();
    render(await MapPage());

    expect(
      screen.getByRole("heading", { name: "성향지도" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("나와 궁금한 사람의 성향을 한곳에서 알아봐요."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "누구의 성향이 궁금한가요?" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("selected-code")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "ENAKQ 상세 지도 보기" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "ENAKQ 관계를 여는 지휘자 살펴보기",
      }),
    );

    const detailLinks = screen.getAllByRole("link", {
      name: "상세 성향지도 보기",
    });
    expect(detailLinks).toHaveLength(2);
    detailLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/map/ENAKQ"),
    );
    expect(screen.getByTestId("selected-code")).toHaveTextContent("ENAKQ");
    expect(
      screen.getByText("이 코드가 어떤 생각과 행동으로 이어지는지 살펴보세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("궁금한 사람의 코드는 아래에서 직접 조합할 수 있어요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("TVOAE")).not.toBeInTheDocument();
  });

  it("honors a code passed from another app screen", async () => {
    render(
      await MapPage({
        searchParams: Promise.resolve({ code: "INAKQ" }),
      }),
    );

    expect(screen.getByTestId("selected-code")).toHaveTextContent("INAKQ");
    expect(
      screen.getAllByRole("heading", { name: "고요한 마음 지휘자" }),
    ).toHaveLength(2);
    const detailLinks = screen.getAllByRole("link", {
      name: "상세 성향지도 보기",
    });
    expect(detailLinks).toHaveLength(2);
    detailLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/map/INAKQ"),
    );
  });

  it("updates the profile as each code letter is selected", async () => {
    const user = userEvent.setup();
    render(
      await MapPage({
        searchParams: Promise.resolve({ code: "ENAKQ" }),
      }),
    );

    await user.click(screen.getByRole("button", { name: "1번째 I 혼자" }));

    expect(screen.getByTestId("selected-code")).toHaveTextContent("INAKQ");
    expect(
      screen.getAllByRole("heading", { name: "고요한 마음 지휘자" }),
    ).toHaveLength(2);
  });

  it("finds a profile by its role name", async () => {
    const user = userEvent.setup();
    render(await MapPage());

    await user.type(
      screen.getByRole("searchbox", { name: "코드 또는 역할 이름 검색" }),
      "마음결",
    );

    expect(
      screen.getByRole("button", {
        name: "IRAMQ 마음결을 걷는 동행가 살펴보기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "ENAKQ 관계를 여는 지휘자 살펴보기",
      }),
    ).not.toBeInTheDocument();
  });
});
