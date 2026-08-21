import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MapPage, { metadata } from "@/app/(tabs)/map/page";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import type { ClientAccountResultsRead } from "@/features/account/client-account-results";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";

const mapPageMocks = vi.hoisted(() => ({
  accountRead: {
    comparisonReports: [],
    currentTraitProfile: null,
    results: [],
    state: "not_requested",
  } as ClientAccountResultsRead,
  localAttempts: [] as LocalAssessmentAttempt[],
}));

vi.mock("@/features/account/client-account-results", () => ({
  readClientAccountResults: vi.fn(async () => mapPageMocks.accountRead),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => mapPageMocks.localAttempts),
}));

const savedCodeStorageKey = "nuang.map.saved-codes.v1";
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
    mapPageMocks.accountRead = {
      comparisonReports: [],
      currentTraitProfile: null,
      results: [],
      state: "not_requested",
    };
    mapPageMocks.localAttempts = [];
    localStorageValues.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
  });

  it("keeps the preserved beta map out of search indexing", () => {
    expect(metadata.robots).toMatchObject({ follow: false, index: false });
    expect(metadata.title).toEqual({ absolute: "이전 베타 성향지도 | 뉴앙" });
  });

  it("starts without a fixed profile and opens ENAKQ only after selection", async () => {
    const user = userEvent.setup();
    render(await MapPage({}));

    expect(
      screen.getByRole("heading", { name: "성향지도" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", {
        name: "이전 베타 성향지도 안내",
      }),
    ).toHaveTextContent("참고용 · 공유 불가");
    expect(
      screen.queryByText("나와 궁금한 사람의 성향을 한곳에서 알아봐요."),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "누구의 성향이 궁금한가요?" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("selected-code")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "ENAKQ 상세 지도 보기" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "ENAKQ 관계를 여는 선도자 살펴보기",
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
      screen.getByRole("heading", { name: "코드 조합해 보기" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("TVOAE")).not.toBeInTheDocument();
  });

  it("does not promote a legacy account result or its stored trait profile", async () => {
    const result = createCandidateAccountResult();
    mapPageMocks.accountRead = {
      comparisonReports: [],
      currentTraitProfile: {
        alternativeCodes: [],
        baseResultReportId: result.resultReportId,
        code: result.profileCode,
        domains: [],
        evidenceCount: 1,
        profileName: result.profileName,
        source: "core_only",
        topicCount: 0,
        updatedAt: result.completedAt,
        version: "legacy-profile-v1",
      },
      results: [result],
      state: "ready",
    };

    render(await MapPage({}));

    expect(
      await screen.findByRole("heading", { name: "누구의 성향이 궁금한가요?" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("selected-code")).not.toBeInTheDocument();
    expect(
      screen.queryByText("내 대표 코드 · 코어 검사 기준"),
    ).not.toBeInTheDocument();
  });

  it("does not promote a legacy local result", async () => {
    mapPageMocks.localAttempts = [createCompletedAttempt()];

    render(await MapPage({}));

    expect(
      await screen.findByRole("heading", { name: "누구의 성향이 궁금한가요?" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("selected-code")).not.toBeInTheDocument();
    expect(screen.queryByText(/내 대표 코드/)).not.toBeInTheDocument();
  });

  it("keeps a manually saved code available as the map starting point", async () => {
    localStorageValues.set(savedCodeStorageKey, JSON.stringify(["INAKQ"]));

    render(await MapPage({}));

    expect(await screen.findByTestId("selected-code")).toHaveTextContent(
      "INAKQ",
    );
    expect(screen.getAllByText("최근 관심 코드").length).toBeGreaterThan(0);
    screen
      .getAllByRole("link", { name: "상세 성향지도 보기" })
      .forEach((link) => expect(link).toHaveAttribute("href", "/map/INAKQ"));
  });

  it("honors a code passed from another app screen", async () => {
    render(
      await MapPage({
        searchParams: Promise.resolve({ code: "INAKQ" }),
      }),
    );

    expect(screen.getByTestId("selected-code")).toHaveTextContent("INAKQ");
    expect(
      screen.getAllByRole("heading", { name: "마음과 가능성을 살피는 안내자" }),
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

    await user.click(screen.getByRole("button", { name: "1번째 I 내향형" }));

    expect(screen.getByTestId("selected-code")).toHaveTextContent("INAKQ");
    expect(
      screen.getAllByRole("heading", { name: "마음과 가능성을 살피는 안내자" }),
    ).toHaveLength(2);
  });

  it("finds a profile by its role name", async () => {
    const user = userEvent.setup();
    render(await MapPage({}));

    await user.type(
      screen.getByRole("searchbox", { name: "코드 또는 성향 이름 검색" }),
      "경청자",
    );

    expect(
      screen.getByRole("button", {
        name: "IRAMQ 마음 변화를 듣는 경청자 살펴보기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "ENAKQ 관계를 여는 선도자 살펴보기",
      }),
    ).not.toBeInTheDocument();
  });
});

function createCandidateAccountResult(): AccountResultSummary {
  return {
    assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
    completedAt: "2026-07-19T03:00:00.000Z",
    createdAt: "2026-07-19T03:00:00.000Z",
    domains: [
      {
        domainId: "RO",
        label: "관계에서 관심이 가는 곳",
        score: 35,
        symbol: "G",
      },
      {
        domainId: "ER",
        label: "걱정과 감정 반응",
        score: 29,
        symbol: "C",
      },
      {
        domainId: "SE",
        label: "사람 사이 에너지",
        score: 38,
        symbol: "I",
      },
      {
        domainId: "SM",
        label: "일상을 꾸리는 방식",
        score: 41,
        symbol: "M",
      },
      {
        domainId: "OE",
        label: "생각과 탐색",
        score: 73,
        symbol: "N",
      },
    ],
    facets: [],
    kind: "full",
    localResultId: null,
    profileCode: "INGMC",
    profileName: "새 가능성을 찾는 탐험가",
    resultLabel: "현재 가장 가까운 대표 성향",
    resultReportId: "22222222-2222-4222-8222-222222222222",
    resultStatus: "ready",
    versionBundle: {
      assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
      codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
      scoringModelVersion: "NUANG-SCORING-MODEL-CANDIDATE-1.0",
      scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
    },
  };
}

function createCompletedAttempt(): LocalAssessmentAttempt {
  const assessment = candidateFullCoreAssessment;
  const completedAt = "2026-07-19T03:00:00.000Z";
  const responses = Object.fromEntries(
    assessment.items.map((item, index) => [
      item.itemId,
      {
        answeredAt: new Date(
          Date.parse(completedAt) + index * 1000,
        ).toISOString(),
        itemId: item.itemId,
        value: (item.isReverse ? 1 : 5) as 1 | 5,
      },
    ]),
  );
  const draft: LocalAssessmentAttempt = {
    assessmentId: assessment.assessmentId,
    completedAt,
    createdAt: completedAt,
    currentIndex: assessment.items.length - 1,
    expiresAt: "2026-08-19T03:00:00.000Z",
    id: "local-map-explorer",
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "completed",
    updatedAt: completedAt,
  };
  const readiness = prepareAssessmentCompletion(assessment, draft);

  return {
    ...draft,
    completionStatus: "completed",
    responseSnapshotHash: readiness.responseSnapshotHash,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: readiness.evidenceStatus,
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: completedAt,
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult: readiness.result,
    },
  };
}
