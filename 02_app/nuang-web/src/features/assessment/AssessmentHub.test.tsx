import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssessmentHub,
  resolveAssessmentHomeView,
} from "@/features/assessment/AssessmentHub";

const navigationMocks = vi.hoisted(() => ({
  params: "",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(navigationMocks.params),
}));

vi.mock("@/components/character/NuangCharacter", () => ({
  NuangCharacter: () => <span aria-label="뉴앙 캐릭터" />,
}));

vi.mock("@/features/assessment/AssessmentHomeCoreSection", () => ({
  AssessmentHomeCoreSection: () => (
    <section aria-label="전역 홈 여정">핵심 검사 행동</section>
  ),
}));

describe("AssessmentHub", () => {
  beforeEach(() => {
    navigationMocks.params = "";
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
  });

  it("introduces Nuang with one slogan heading and one global journey", () => {
    render(<AssessmentHub />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "나를 이해하고, 서로를 이해하는 성향 놀이터",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("홈")).not.toHaveRole("heading");
    expect(screen.getAllByLabelText("전역 홈 여정")).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "내 검사 기록 보기" }),
    ).toHaveAttribute("href", "/my/reports/history");
  });

  it("orders recommended content as topics, together, lab, then utilities", () => {
    render(<AssessmentHub />);

    const topics = screen.getByRole("heading", {
      name: "지금 궁금한 내 모습을 골라보세요",
    });
    const together = screen.getByRole("heading", {
      name: "우리, 얼마나 비슷하게 고를까요?",
    });
    const lab = screen.getByRole("heading", {
      name: "내 안의 의외성을 발견해요",
    });
    const utility = screen.getByRole("link", {
      name: /검사 질문 리뷰하기/,
    });

    expect(topics.compareDocumentPosition(together)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(together.compareDocumentPosition(lab)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(lab.compareDocumentPosition(utility)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("uses URL views and keeps the core journey outside every tab", () => {
    navigationMocks.params = "view=self";
    render(<AssessmentHub />);

    expect(screen.getByRole("tab", { name: "나 알아보기" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByLabelText("전역 홈 여정")).toHaveLength(1);
    expect(screen.getByText("위로받을 때 필요한 것")).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name: "우리, 얼마나 비슷하게 고를까요?",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "내 안의 의외성을 발견해요",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /검사 질문 리뷰하기/ }),
    ).not.toBeInTheDocument();
  });

  it("pushes canonical view URLs without scrolling", () => {
    render(<AssessmentHub />);

    fireEvent.click(screen.getByRole("tab", { name: "함께하기" }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/home?view=together", {
      scroll: false,
    });

    fireEvent.click(screen.getByRole("tab", { name: "추천" }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/home", {
      scroll: false,
    });
  });

  it("replaces an invalid view with the canonical home URL", async () => {
    navigationMocks.params = "view=unknown";
    render(<AssessmentHub />);

    expect(resolveAssessmentHomeView("unknown")).toBe("recommended");
    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith("/home", {
        scroll: false,
      });
    });
  });
});
