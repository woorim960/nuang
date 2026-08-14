import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LabResultView } from "@/features/lab/LabResultView";
import {
  getLabAssessment,
  type LabAssessment,
} from "@/features/lab/lab-assessments";
import type { StoredLabResult } from "@/features/lab/lab-storage";

const mocks = vi.hoisted(() => ({
  deleteEverywhere: vi.fn(),
  loadExact: vi.fn(),
  loadLatest: vi.fn(),
  replace: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace }),
}));

vi.mock("@/features/share/ReportShareSheet", () => ({
  ReportShareSheet: () => null,
}));

vi.mock("@/features/lab/lab-storage", () => ({
  deleteLabResultEverywhere: mocks.deleteEverywhere,
  loadLabResultLocalFirst: mocks.loadExact,
  loadLatestLabResultLocalFirst: mocks.loadLatest,
  syncLabResult: mocks.sync,
}));

const assessmentFixture = getLabAssessment("conversation-temperature");
if (!assessmentFixture) throw new Error("fixture assessment missing");
const assessment: LabAssessment = assessmentFixture;

describe("LabResultView account restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteEverywhere.mockResolvedValue("deleted");
    mocks.loadExact.mockResolvedValue(null);
    mocks.loadLatest.mockResolvedValue(null);
    mocks.sync.mockImplementation(async (result) => result);
  });

  it("never substitutes another latest result when an exact id is missing", async () => {
    mocks.loadLatest.mockResolvedValue(createStoredResult("lab_other_result"));

    render(
      <LabResultView
        assessment={assessment}
        localResultId="lab_requested_result"
      />,
    );

    expect(
      await screen.findByText("이 브라우저에는 이 결과가 없어요"),
    ).toBeInTheDocument();
    expect(mocks.loadExact).toHaveBeenCalledWith("lab_requested_result");
    expect(mocks.loadLatest).not.toHaveBeenCalled();
    expect(screen.queryByText(assessment.profiles[0].title)).not.toBeInTheDocument();
  });

  it("renders an exact result hydrated from the account", async () => {
    const restored = createStoredResult("lab_requested_result");
    mocks.loadExact.mockResolvedValue(restored);

    render(
      <LabResultView
        assessment={assessment}
        localResultId="lab_requested_result"
      />,
    );

    expect(await screen.findByText(restored.result.profile.title)).toBeVisible();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("offers account storage without claiming that lab changes the Nuang code", async () => {
    const guest = createStoredResult("lab_guest_result");
    delete guest.serverResultId;
    guest.sync = { lastError: "login_required", status: "failed" };
    mocks.loadExact.mockResolvedValue(guest);
    mocks.sync.mockResolvedValue(guest);

    render(
      <LabResultView
        assessment={assessment}
        localResultId="lab_guest_result"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "로그인하고 이번 결과를 내 기록에 이어가세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/뉴앙코드를 바꾸지는 않아요/)).toBeInTheDocument();
  });

  it("keeps the report visible when server deletion fails", async () => {
    const restored = createStoredResult("lab_requested_result");
    mocks.loadExact.mockResolvedValue(restored);
    mocks.deleteEverywhere.mockResolvedValue("error");
    render(
      <LabResultView
        assessment={assessment}
        localResultId="lab_requested_result"
      />,
    );
    await screen.findByText(restored.result.profile.title);

    fireEvent.click(screen.getByRole("button", { name: "결과 메뉴" }));
    fireEvent.click(await screen.findByRole("button", { name: /이 결과 삭제/ }));
    fireEvent.click(await screen.findByRole("button", { name: "삭제" }));

    expect(
      await screen.findByText(
        "결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      ),
    ).toBeVisible();
    await waitFor(() => expect(mocks.replace).not.toHaveBeenCalled());
  });
});

function createStoredResult(localResultId: string): StoredLabResult {
  return {
    answers: Object.fromEntries(
      assessment.questions.map((question) => {
        const option = question.options[0];
        return [
          question.id,
          {
            optionId: option.id,
            questionId: question.id,
            resultId: option.resultId,
          },
        ];
      }),
    ),
    assessmentSnapshot: assessment,
    completedAt: "2026-08-07T06:00:00.000Z",
    contentVersion: assessment.contentVersion,
    localResultId,
    result: {
      profile: assessment.profiles[0],
      scores: { [assessment.profiles[0].id]: assessment.questions.length },
      tiedProfileIds: [assessment.profiles[0].id],
    },
    serverResultId: "11111111-1111-4111-8111-111111111111",
    slug: assessment.slug,
    sync: { status: "synced" },
  };
}
