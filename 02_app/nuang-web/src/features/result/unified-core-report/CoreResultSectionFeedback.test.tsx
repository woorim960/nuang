import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoreResultSectionFeedback } from "./CoreResultSectionFeedback";
import type { CoreResultReportSection } from "./core-result-report-model";

const section: CoreResultReportSection = {
  allowedSurfaces: ["completion", "my"],
  availability: "render" as const,
  canonicalVariantId: null,
  canonicalVersion: null,
  contentKey: "guide.ENAKQ.strength_and_growth",
  contentVersion: "ENAKQ-CUSTOMER-GUIDE-2.0",
  omissionCode: null,
  privacyScope: "owner_only" as const,
  requiredSignals: ["profile_code"],
  sectionId: "strength_and_overuse",
  sourceClass: "current_customer_guide" as const,
};

describe("CoreResultSectionFeedback", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits a fit response in one tap with exact content identity", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );
    render(
      <CoreResultSectionFeedback
        resultReportId="11111111-1111-4111-8111-111111111111"
        section={section}
        surface="my"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "나와 비슷해요" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      contentKey: section.contentKey,
      contentVersion: section.contentVersion,
      reason: null,
      sectionId: section.sectionId,
      sentiment: "fit",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "알려주셔서 고마워요",
    );
  });

  it("asks for an optional concrete reason after a mismatch choice", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 201 }),
    );
    render(
      <CoreResultSectionFeedback
        resultReportId="11111111-1111-4111-8111-111111111111"
        section={section}
        surface="completion"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "나와 달라요" }));
    expect(
      screen.getByRole("button", { name: "중요한 모습이 빠졌어요" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "중요한 모습이 빠졌어요" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "이 의견 보내기" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "알려주셔서 고마워요",
    );
  });
});
