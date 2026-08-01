import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CoreResultReportModel,
  CoreResultSelection,
} from "./core-result-report-model";

const controls = vi.hoisted(() => ({
  selection: null as CoreResultSelection | null,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  deleteLocalAttempt: vi.fn().mockResolvedValue(undefined),
  listLocalAttempts: vi.fn().mockResolvedValue([]),
}));

vi.mock("./validated-core-result-candidates", () => ({
  collectValidatedCoreResultCandidates: vi.fn(() => ({
    accountReadState: "not_requested",
    candidates: [],
    diagnosticCodes: [],
  })),
}));

vi.mock("./core-result-report-selector", () => ({
  selectLatestCompletedCoreReport: vi.fn(() => controls.selection),
}));

vi.mock("./CoreResultReportTemplate", () => ({
  CoreResultReportTemplate: ({
    backHref,
    model,
    secondaryAction,
    statusMessage,
    surface,
  }: {
    backHref?: string;
    model: CoreResultReportModel;
    secondaryAction?: { href: string; label: string };
    statusMessage?: string | null;
    surface: string;
  }) => (
    <div data-testid="unified-core-template">
      {surface}:{model.result.code}:{backHref}:{secondaryAction?.href}
      {statusMessage ? <p>{statusMessage}</p> : null}
    </div>
  ),
}));

import { MyLatestCoreReportView } from "./MyLatestCoreReportView";

describe("MyLatestCoreReportView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controls.selection = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), {
          headers: { "content-type": "application/json" },
          status: 401,
        }),
      ),
    );
  });

  it("opens the selected latest report in the same My template", async () => {
    const model = createModel();
    controls.selection = createSelection({
      latestRenderableReport: model,
      selectionReason: "LATEST_RENDERABLE",
    });

    render(<MyLatestCoreReportView />);

    expect(
      await screen.findByTestId("unified-core-template"),
    ).toHaveTextContent("my:ENAKQ:/my?tab=reports:/my/reports/history");
  });

  it("does not silently replace a damaged latest completion with an older report", async () => {
    const model = createModel();
    controls.selection = createSelection({
      latestRenderableReport: model,
      selectionReason: "LATEST_UNRENDERABLE_WITH_FALLBACK",
    });

    render(<MyLatestCoreReportView />);

    expect(
      await screen.findByRole("heading", {
        name: "최근 결과를 지금 화면에서 온전히 열기 어려워요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("unified-core-template"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "이전에 열 수 있는 결과 보기" }),
    );
    expect(
      await screen.findByTestId("unified-core-template"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "현재 최신 결과 대신, 안전하게 열 수 있는 이전 결과를 보여드리고 있어요.",
      ),
    ).toBeInTheDocument();
  });

  it("does not call an available result the latest when one source read fails", async () => {
    controls.selection = createSelection({
      latestRenderableReport: createModel(),
      selectionReason: "LATEST_RENDERABLE",
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false }), {
        headers: { "content-type": "application/json" },
        status: 503,
      }),
    );

    render(<MyLatestCoreReportView />);

    expect(
      await screen.findByRole("heading", {
        name: "가장 최근 결과인지 확인하지 못했어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("unified-core-template"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "지금 확인된 결과 보기" }),
    );
    expect(
      await screen.findByTestId("unified-core-template"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "일부 저장 위치를 확인하지 못해, 현재 확인된 결과를 보여드리고 있어요.",
      ),
    ).toBeInTheDocument();
  });

  it("treats a signed-out 401 as an empty account source, not a server error", async () => {
    controls.selection = {
      diagnosticCodes: [],
      latestCompletionRecord: null,
      latestRenderableReport: null,
      selectionReason: "NO_CORE_RESULT",
    };

    render(<MyLatestCoreReportView />);

    expect(
      await screen.findByRole("heading", { name: "아직 코어 결과가 없어요" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "결과를 불러오지 못했어요" }),
    ).not.toBeInTheDocument();
  });
});

function createSelection({
  latestRenderableReport,
  selectionReason,
}: Pick<
  CoreResultSelection,
  "latestRenderableReport" | "selectionReason"
>): CoreResultSelection {
  return {
    diagnosticCodes: [],
    latestCompletionRecord: {
      completedAt: "2026-07-31T03:00:00.000Z",
      diagnosticCodes: [],
      kind: "full",
      model:
        selectionReason === "LATEST_RENDERABLE" ? latestRenderableReport : null,
      renderable: selectionReason === "LATEST_RENDERABLE",
      source: "account",
      stableId: "account:latest",
    },
    latestRenderableReport,
    selectionReason,
  };
}

function createModel(): CoreResultReportModel {
  return {
    completeness: {
      missingFieldCodes: [],
      omittedSectionCodes: [],
      state: "complete",
    },
    identity: {
      accountResultReportId: "22222222-2222-4222-8222-222222222222",
      assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
      canonicalResultId: "account:22222222-2222-4222-8222-222222222222",
      completedAt: "2026-07-31T03:00:00.000Z",
      kind: "full",
      localResultId: "local-current",
      originResultId: "local-current",
      sourceState: "account",
    },
    interpretation: {
      canonicalRefs: [],
      contentResolution: "current_customer_guide_fallback",
      excerptManifestDigest: null,
      guideVersion: null,
      manifestDigest: null,
      traitMapBaselineId: null,
    },
    measurement: {
      assessmentReleaseId: "candidate-full",
      codeSchemeVersion: "candidate-code",
      responseSnapshotHash: "hash",
      resultCopyVersion: "copy-v1",
      scoringModelVersion: "score-model",
      scoringReleaseId: "score-release",
    },
    result: {
      alternativeCodes: [],
      boundaryDomainIds: [],
      code: "ENAKQ",
      currentProfileName: "관계를 여는 선도자",
      domains: [],
      facets: [],
      profileNameAtCompletion: "관계를 여는 선도자",
      profileNameReleaseId: "profile-v3",
      profileNameValidationState: "product_published",
      responseEvidenceStatus: "clear",
    },
    sections: [],
  };
}
