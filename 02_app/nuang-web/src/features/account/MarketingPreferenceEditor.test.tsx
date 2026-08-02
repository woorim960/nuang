import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarketingPreferenceEditor } from "@/features/account/MarketingPreferenceEditor";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MarketingPreferenceEditor", () => {
  it("loads and saves marketing separately from recovery contacts", async () => {
    const contact = {
      emailMasked: "wo***@gmail.com",
      emailStatus: "verified",
      emailVerifiedAt: "2026-08-02T00:00:00.000Z",
      hasEmail: true,
      hasMobilePhone: false,
      marketingOptIn: false,
      mobilePhoneMasked: null,
      mobilePhoneStatus: "missing",
      updatedAt: "2026-08-02T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ contact, ok: true }))
      .mockResolvedValueOnce(
        Response.json({
          contact: { ...contact, marketingOptIn: true },
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketingPreferenceEditor />);

    const preference = await screen.findByRole("checkbox", {
      name: /광고성 소식 받기/,
    });
    expect(preference).not.toBeChecked();
    expect(screen.queryByLabelText("복구용 이메일")).not.toBeInTheDocument();

    fireEvent.click(preference);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      marketingOptIn: true,
      preference: "marketing",
    });
    expect(
      await screen.findByText(/새로운 소식을 받을 수 있도록 설정했어요/),
    ).toBeInTheDocument();
  });

  it("rolls back an optimistic switch when saving fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          contact: {
            emailMasked: null,
            emailStatus: "missing",
            emailVerifiedAt: null,
            hasEmail: false,
            hasMobilePhone: false,
            marketingOptIn: false,
            mobilePhoneMasked: null,
            mobilePhoneStatus: "missing",
            updatedAt: null,
          },
          ok: true,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ message: "저장할 수 없어요.", ok: false }, { status: 503 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketingPreferenceEditor />);
    const preference = await screen.findByRole("checkbox", {
      name: /광고성 소식 받기/,
    });
    fireEvent.click(preference);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장할 수 없어요.",
    );
    expect(preference).not.toBeChecked();
  });
});
