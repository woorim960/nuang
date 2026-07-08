import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalResultManager } from "@/features/account/LocalResultManager";
import {
  deleteLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { deleteLabResult, listLabResults } from "@/features/lab/lab-storage";

vi.mock("@/features/assessment/assessment-storage", () => ({
  deleteLocalAttempt: vi.fn(),
  listLocalAttempts: vi.fn(),
}));

vi.mock("@/features/lab/lab-assessments", () => ({
  labAssessments: [
    {
      slug: "conversation-temperature",
      title: "대화 온도 실험",
    },
  ],
}));

vi.mock("@/features/lab/lab-storage", () => ({
  deleteLabResult: vi.fn(),
  getLabExpiresAt: vi.fn((result) => result.expiresAt),
  listLabResults: vi.fn(),
}));

describe("LocalResultManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLocalAttempts).mockResolvedValue([]);
    vi.mocked(listLabResults).mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains local-only storage before account connection", async () => {
    render(<LocalResultManager />);

    expect(
      await screen.findByText("계정 연결 전에는 서버로 자동 전송되지 않아요"),
    ).toBeInTheDocument();
    expect(screen.getByText("로컬 30일")).toBeInTheDocument();
    expect(
      screen.getByText(/삭제하면 이 화면과 로컬 내보내기 파일에서도 제외됩니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("아직 저장된 로컬 결과가 없어요")).toBeInTheDocument();
  });

  it("keeps delete and export rights visible for stored local results", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([
      {
        assessmentId: "nu-core-full",
        completedAt: "2026-07-08T00:00:00.000Z",
        createdAt: "2026-07-08T00:00:00.000Z",
        currentIndex: 59,
        expiresAt: "2026-08-07T00:00:00.000Z",
        id: "local_test_1",
        itemIds: [],
        mode: "full",
        releaseId: "full-core.v0.1",
        responses: {},
        state: "completed",
        updatedAt: "2026-07-08T00:00:00.000Z",
      },
    ]);

    render(<LocalResultManager />);

    expect(await screen.findByText("정밀 코어")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /정밀 코어 결과 열기/ }))
      .toHaveAttribute("href", "/results/local/local_test_1");
    expect(screen.getByRole("button", { name: "정밀 코어 삭제" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 기기의 로컬 데이터 JSON 내보내기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/직접 응답과 결과가 JSON 파일로 저장됩니다/),
    ).toBeInTheDocument();
  });

  it("does not delete a core result when confirmation is cancelled", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<LocalResultManager />);

    fireEvent.click(await screen.findByRole("button", { name: "정밀 코어 삭제" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "이 기기에 저장된 결과를 삭제할까요? 삭제하면 이 화면에서 다시 열 수 없어요.",
    );
    expect(deleteLocalAttempt).not.toHaveBeenCalled();
  });

  it("deletes a core result after confirmation", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);

    fireEvent.click(await screen.findByRole("button", { name: "정밀 코어 삭제" }));

    await waitFor(() => {
      expect(deleteLocalAttempt).toHaveBeenCalledWith("local_test_1");
    });
    await waitFor(() => {
      expect(screen.queryByText("정밀 코어")).not.toBeInTheDocument();
    });
  });

  it("deletes a lab result after confirmation", async () => {
    vi.mocked(listLabResults).mockReturnValue([
      {
        answers: {},
        completedAt: "2026-07-08T00:00:00.000Z",
        expiresAt: "2026-08-07T00:00:00.000Z",
        result: {
          profile: {
            id: "spark",
            relationTip: "대화 전 짧게 확인해요.",
            shortTitle: "바로 대화",
            smallExperiment: "오늘 한 번 물어보세요.",
            strengths: ["대화를 시작하기 쉬워요."],
            summary: "말하면서 정리하는 편이에요.",
            title: "바로 불을 켜는 대화 스타일",
            watch: "상대에게 빠르게 느껴질 수 있어요.",
          },
          scores: {
            spark: 3,
          },
          tiedProfileIds: [],
        },
        slug: "conversation-temperature",
      },
    ]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);

    fireEvent.click(await screen.findByRole("button", { name: "대화 온도 실험 삭제" }));

    expect(deleteLabResult).toHaveBeenCalledWith("conversation-temperature");
  });
});

function createCoreAttempt() {
  return {
    assessmentId: "nu-core-full",
    completedAt: "2026-07-08T00:00:00.000Z",
    createdAt: "2026-07-08T00:00:00.000Z",
    currentIndex: 59,
    expiresAt: "2026-08-07T00:00:00.000Z",
    id: "local_test_1",
    itemIds: [],
    mode: "full" as const,
    releaseId: "full-core.v0.1",
    responses: {},
    state: "completed" as const,
    updatedAt: "2026-07-08T00:00:00.000Z",
  };
}
