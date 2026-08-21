import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import { candidateProfileNarrativeVersion } from "@/features/nuang-code/candidate-profile-names";
import {
  getPublishedTraitMapCustomerGuide,
  getPublishedTraitMapCustomerGuideCodes,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { precisionFacetInsightCopyVersion } from "@/features/result/precision-report-insights";
import {
  CoreResultReportTemplate,
  formatGuideText,
  formatHeroSummary,
} from "./CoreResultReportTemplate";
import type { CoreResultReportModel } from "./core-result-report-model";
import {
  buildReleaseOneOwnerSections,
  buildReleaseOnePublicSections,
} from "./core-result-section-contract";

describe("CoreResultReportTemplate", () => {
  it("keeps completion and My on the same report hierarchy", () => {
    const model = createModel("full");
    const completion = render(
      <CoreResultReportTemplate model={model} surface="completion" />,
    );

    expect(
      screen.getByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "이번 답에서 특히 눈에 띈 모습" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "정밀 성향 검사 다시하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "내 뉴앙 코드 풀이" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", {
        name: "탐색적 비검증 베타 안내",
      }),
    ).toHaveTextContent(
      /참고용 · 공유 불가.*대표 뉴앙 코드로 확정되거나.*공개 프로필·공유·비교에 사용되지 않아요/,
    );
    expect(
      screen.getByRole("heading", { name: "생활 속의 나" }),
    ).toBeInTheDocument();

    completion.unmount();
    render(
      <CoreResultReportTemplate
        backHref="/my?tab=reports"
        model={model}
        surface="my"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "이번 답에서 특히 눈에 띈 모습" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "이전 화면으로 돌아가기" }),
    ).toHaveAttribute("href", "/my?tab=reports");
  });

  it("supports roving keyboard focus without calling the score a probability", () => {
    render(
      <CoreResultReportTemplate
        model={createModel("full")}
        surface="completion"
      />,
    );
    const first = screen.getByRole("tab", { name: "E 사람 사이 에너지" });
    fireEvent.keyDown(first, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "N 생각과 탐색" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getAllByText(/두 모습 중 이번 답이 어느 쪽에 더 가까웠는지/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/성향일 확률 70%/)).not.toBeInTheDocument();
  });

  it("does not label a different historical scheme as the current candidate", () => {
    const model = createModel("full");
    model.measurement.assessmentReleaseId = "NUANG-CORE-FULL-HISTORICAL-0.9";
    model.measurement.codeSchemeVersion = "NUANG-CODE-5AXIS-PROVISIONAL-0.9";
    model.measurement.scoringReleaseId =
      "NUANG-CORE-FULL-HISTORICAL-SCORING-0.9";

    render(<CoreResultReportTemplate model={model} surface="my" />);
    expect(
      screen.queryByRole("complementary", {
        name: "탐색적 비검증 베타 안내",
      }),
    ).not.toBeInTheDocument();
  });

  it("gives a quick result a substantial code guide without precision facets", () => {
    render(
      <CoreResultReportTemplate
        model={createModel("quick")}
        precisionHref="/assessments/nu-core-full"
        surface="completion"
      />,
    );

    expect(screen.getByText("첫 성향 결과")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "이번 답에서 특히 눈에 띈 모습",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "첫 성향 검사 다시하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "생활 속의 나" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "사람들과 지낼 때" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /정밀 검사로 더 알아보기/ }),
    ).toBeInTheDocument();
  });

  it("projects owner measurements out of public DOM", () => {
    render(
      <CoreResultReportTemplate
        model={createModel("full")}
        surface="profile"
      />,
    );

    expect(screen.getByText("공개된 뉴앙 코드")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "이번 답에서 특히 눈에 띈 모습",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("NUANG-CORE-FULL-CANDIDATE-SCORING-1.0"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /함께 활력.*혼자 회복/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "뉴앙 코드 풀이" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "내 뉴앙 코드 풀이" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("검사 버전")).not.toBeInTheDocument();
    expect(screen.queryByText("채점 버전")).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("tablist", { name: "뉴앙 코드 자리 선택" }),
      ).getAllByRole("tab"),
    ).toHaveLength(5);
  });

  it("fails closed when no section has been allowlisted", () => {
    const model = createModel("full");
    model.sections = [];

    render(<CoreResultReportTemplate model={model} surface="completion" />);

    expect(
      screen.getByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "이번 답에서 보인 내 모습" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByText("결과를 이해하는 방법")).not.toBeInTheDocument();
  });

  it("keeps internal completion names and versions out of the customer DOM", () => {
    const model = createModel("full");
    model.result.currentProfileName = "현재 이름";
    model.result.profileNameAtCompletion = "완료 당시 이름";

    render(<CoreResultReportTemplate model={model} surface="my" />);
    fireEvent.click(screen.getByText("결과를 이해하는 방법"));

    expect(
      screen.queryByText("완료 당시 이름", { selector: "dd" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("검사 버전")).not.toBeInTheDocument();
    expect(screen.queryByText("채점 버전")).not.toBeInTheDocument();
    expect(
      screen.getByText("현재 이름", { selector: "h1" }),
    ).toBeInTheDocument();
  });

  it("offers a compact anchored table of contents for a long report", () => {
    render(
      <CoreResultReportTemplate
        model={createModel("full")}
        surface="completion"
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "결과 리포트 목차",
    });
    expect(
      within(navigation).getByRole("link", { name: "요약" }),
    ).toHaveAttribute("href", "#report-overview");
    expect(
      within(navigation).getByRole("link", { name: "관계" }),
    ).toHaveAttribute("href", "#report-relationships");
    expect(within(navigation).getAllByRole("link")).toHaveLength(5);
  });

  it("default-denies every share entry point for an unknown nonlegacy release", () => {
    const model = createModel("full");
    model.measurement.assessmentReleaseId = "NUANG-CORE-ACTIVE-2.0";
    model.measurement.codeSchemeVersion = "NUANG-CODE-UNKNOWN-2.0";
    model.measurement.scoringReleaseId = "NUANG-SCORING-UNKNOWN-2.0";
    render(
      <CoreResultReportTemplate
        model={model}
        originalReportKey={`core_${model.identity.accountResultReportId}`}
        shareEnabled
        surface="my"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "검사 결과 공유" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "이 문장 공유" }),
    ).not.toBeInTheDocument();
  });

  it("removes every share entry point from a candidate core result", () => {
    render(
      <CoreResultReportTemplate
        model={createModel("full")}
        shareEnabled
        surface="my"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "검사 결과 공유" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "이 문장 공유" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "결과 공유" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("참고용 · 공유 불가")).toBeInTheDocument();
  });

  it("opens with a direct strength, cost, and adjustment flow", () => {
    render(
      <CoreResultReportTemplate
        model={createModel("full")}
        surface="completion"
      />,
    );

    expect(screen.getByText("자연스럽게 잘하는 것")).toBeInTheDocument();
    expect(screen.getByText("과해지면 생기는 일")).toBeInTheDocument();
    expect(screen.getByText("조금 더 편해지는 방법")).toBeInTheDocument();
  });

  it("removes editorial-only prefixes and repairs joined Korean sentences for display", () => {
    expect(
      formatGuideText(
        "강점과 성장의 ‘자연스럽게 잘하는 것’ 장면에서는 깊이 생각해요 새로운 가능성을 찾아봐요 다섯 방향이 함께 움직여요",
      ),
    ).toBe(
      "깊이 생각해요. 새로운 가능성을 찾아봐요. 다섯 가지 성향이 함께 움직여요.",
    );
  });

  it("상단 설명에서 코드와 편집용 별칭 문구를 덜어 낸다", () => {
    expect(
      formatHeroSummary(
        "INGMC는 혼자 생각을 정리하며 회복해요. 새로운 가능성을 더 찾아봐요. 이런 흐름이 함께 나타나 ‘새 가능성을 찾는 탐험가’라는 별칭으로 설명해요.",
        "INGMC",
      ),
    ).toBe("혼자 생각을 정리하며 회복해요. 새로운 가능성을 더 찾아봐요.");
  });

  it("게시된 32개 코드의 상단 설명을 쉽게 읽히는 문장으로 정리한다", () => {
    const codes = getPublishedTraitMapCustomerGuideCodes();

    expect(codes).toHaveLength(32);
    for (const code of codes) {
      const guide = getPublishedTraitMapCustomerGuide(code);
      const summary = formatHeroSummary(guide!.heroSummary, code);

      expect(summary, code).toBeTruthy();
      expect(summary, code).not.toMatch(new RegExp(`^${code}(?:은|는)`));
      expect(summary, code).not.toMatch(/별칭|이런 흐름이 함께 나타나/);
    }
  });

  it("뉴앙 코드를 같은 순서의 독립된 셀로 렌더링한다", () => {
    const model = createModel("full");
    model.result.code = "INGMC";
    model.result.currentProfileName = "새 가능성을 찾는 탐험가";

    render(<CoreResultReportTemplate model={model} surface="completion" />);

    const code = screen.getByLabelText("뉴앙 코드 INGMC");
    expect(
      Array.from(code.querySelectorAll("[data-code-position]")).map(
        (letter) => [
          letter.getAttribute("data-code-position"),
          letter.textContent,
        ],
      ),
    ).toEqual([
      ["1", "I"],
      ["2", "N"],
      ["3", "G"],
      ["4", "M"],
      ["5", "C"],
    ]);
    expect(screen.queryByText(/별칭/)).not.toBeInTheDocument();
  });
});

function createModel(kind: "full" | "quick"): CoreResultReportModel {
  const profileCode = "ENAKQ";
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
      kind,
      localResultId: "local_current_report",
      originResultId: "local_current_report",
      sourceState: "account",
    },
    interpretation: {
      canonicalRefs: [],
      contentResolution: "current_customer_guide_fallback",
      excerptManifestDigest: null,
      guideVersion: "ENAKQ-CUSTOMER-GUIDE-2.0",
      manifestDigest: null,
      traitMapBaselineId: null,
    },
    measurement: {
      assessmentReleaseId: candidateFullScoringRelease.assessmentReleaseId,
      codeSchemeVersion: candidateFullScoringRelease.codeSchemeVersion,
      responseSnapshotHash: "snapshot-hash-current",
      resultCopyVersion: "candidate-result-copy.v1",
      scoringModelVersion: candidateFullScoringRelease.scoringModelVersion,
      scoringReleaseId: candidateFullScoringRelease.scoringReleaseId,
    },
    result: {
      alternativeCodes: [],
      boundaryDomainIds: [],
      code: profileCode,
      currentProfileName: "관계를 여는 선도자",
      domains: candidateFullScoringRelease.domains.map((domain) => ({
        domainId: domain.domainId,
        isBoundary: false,
        label: domain.label,
        score: 70,
        status: "valid",
        symbol: profileCode[(domain.codePosition ?? 1) - 1],
      })),
      facets: candidateFullScoringRelease.facets.map((facet) => ({
        facetId: facet.facetId,
        label: facet.label,
        score: 70,
        status: "valid",
        validResponses: Math.max(1, facet.minValidResponses),
      })),
      profileNameAtCompletion: "관계를 여는 선도자",
      profileNameReleaseId: "NUANG-PROFILE-NAME-CANDIDATE-3.0",
      profileNameValidationState: "product_published",
      responseEvidenceStatus: "clear",
    },
    sections: [
      ...buildReleaseOneOwnerSections({
        code: profileCode,
        facetContentVersion: precisionFacetInsightCopyVersion,
        guideVersion: "ENAKQ-CUSTOMER-GUIDE-2.0",
        kind,
        measurementVersion: "candidate-result-copy.v1",
        profileContentVersion: candidateProfileNarrativeVersion,
        renderGuide: true,
        renderMeasurement: true,
      }),
      ...buildReleaseOnePublicSections({
        code: profileCode,
        guideVersion: "ENAKQ-CUSTOMER-GUIDE-2.0",
        profileContentVersion: candidateProfileNarrativeVersion,
      }),
    ],
  };
}
