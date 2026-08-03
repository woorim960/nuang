import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarketingPreferenceEditor } from "@/features/account/MarketingPreferenceEditor";

afterEach(() => {
  vi.unstubAllGlobals();
});

const preferences = {
  analytics: {
    enabled: false,
    updatedAt: "2026-08-03T00:00:00.000Z",
    version: "NUANG-ANALYTICS-PREFERENCE-2026-08-03",
  },
  marketing: {
    enabled: false,
    updatedAt: "2026-08-03T00:00:00.000Z",
    version: "NUANG-MARKETING-EMAIL-KO-2026-08-03",
  },
};

describe("MarketingPreferenceEditor", () => {
  it("loads both optional preferences and saves marketing independently", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true, preferences }))
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          preferences: {
            ...preferences,
            marketing: { ...preferences.marketing, enabled: true },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketingPreferenceEditor />);

    expect(
      await screen.findByRole("checkbox", {
        name: /서비스 개선을 위한 이용 데이터/,
      }),
    ).not.toBeChecked();
    const marketing = screen.getByRole("checkbox", {
      name: /광고성 이메일 수신 동의/,
    });
    fireEvent.click(marketing);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      consentVersion: "NUANG-MARKETING-EMAIL-KO-2026-08-03",
      enabled: true,
      preference: "marketing",
    });
    expect(
      await screen.findByText(/뉴앙의 새 소식을 이메일로 받도록 설정했어요/),
    ).toBeInTheDocument();
  });

  it("saves analytics without sending content or result data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true, preferences }))
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          preferences: {
            ...preferences,
            analytics: { ...preferences.analytics, enabled: true },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<MarketingPreferenceEditor />);

    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: /서비스 개선을 위한 이용 데이터/,
      }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = String(fetchMock.mock.calls[1]?.[1]?.body);
    expect(JSON.parse(body)).toEqual({
      consentVersion: "NUANG-ANALYTICS-PREFERENCE-2026-08-03",
      enabled: true,
      preference: "analytics",
    });
    expect(body).not.toMatch(/code|answer|post|result/i);
  });

  it("rolls back an optimistic switch when saving fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true, preferences }))
      .mockResolvedValueOnce(
        Response.json(
          { message: "저장할 수 없어요.", ok: false },
          { status: 503 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketingPreferenceEditor />);
    const preference = await screen.findByRole("checkbox", {
      name: /광고성 이메일 수신 동의/,
    });
    fireEvent.click(preference);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장할 수 없어요.",
    );
    expect(preference).not.toBeChecked();
  });
});
