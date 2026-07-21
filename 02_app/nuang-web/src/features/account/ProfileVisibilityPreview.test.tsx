import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileVisibilityPreview } from "@/features/account/ProfileVisibilityPreview";

const visibility = {
  code: "ENAKQ",
  codeVisible: true,
  comparisonEnabled: true,
  detailsVisible: true,
  displayName: "여름",
  profileName: "관계를 여는 지휘자",
  publicId: "11111111-1111-4111-8111-111111111111",
  revision: 3,
};

describe("ProfileVisibilityPreview", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("turns dependent details and comparison off with the representative code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, visibility })),
    );

    render(<ProfileVisibilityPreview />);

    const codeSwitch = await screen.findByRole("switch", {
      name: "대표 코드 공개, 켜짐",
    });
    fireEvent.click(codeSwitch);

    expect(
      screen.getByRole("switch", { name: "대표 코드 공개, 꺼짐" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "상세 성향 공개, 꺼짐" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "나와 비교 허용, 꺼짐" }),
    ).not.toBeChecked();
    expect(screen.getByText("성향 정보 비공개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변경사항 저장" })).toBeEnabled();
  });

  it("saves only the three clear controls with the current revision", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, visibility }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          visibility: {
            ...visibility,
            comparisonEnabled: false,
            revision: 4,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileVisibilityPreview />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "나와 비교 허용, 켜짐" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/profile-visibility");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT" });
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      codeVisible: true,
      comparisonEnabled: false,
      detailsVisible: true,
      expectedRevision: 3,
    });
    expect(await screen.findByText("공개 정보를 저장했어요.")).toBeVisible();
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
