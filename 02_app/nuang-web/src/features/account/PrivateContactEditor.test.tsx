import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateContactEditor } from "@/features/account/PrivateContactEditor";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PrivateContactEditor", () => {
  it("registers a private phone without a redundant required consent checkbox", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          contact: {
            emailMasked: null,
            emailStatus: "missing",
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
        Response.json({
          contact: {
            emailMasked: null,
            emailStatus: "missing",
            hasEmail: false,
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PrivateContactEditor />);

    const phone = await screen.findByRole("textbox", {
      name: "휴대전화번호",
    });
    expect(
      screen.queryByText(/비공개 프로필 연락처로 저장하는 데 동의/),
    ).not.toBeInTheDocument();
    const marketing = screen.getByRole("checkbox", {
      name: /광고성 소식 받기/,
    });
    expect(marketing).not.toBeChecked();

    fireEvent.change(phone, { target: { value: "01012345678" } });
    fireEvent.click(screen.getByRole("button", { name: "번호 저장" }));

    expect(await screen.findByText("010-****-5678")).toBeInTheDocument();
    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      mobilePhone: "010-1234-5678",
      source: "profile",
    });
    expect(requestBody).not.toHaveProperty("marketingOptIn");
    expect(requestBody).not.toHaveProperty("consentAccepted");
  });

  it("shows a member's phone only as a masked private value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          contact: {
            emailMasked: null,
            emailStatus: "missing",
            hasEmail: false,
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          ok: true,
        }),
      ),
    );

    render(<PrivateContactEditor />);

    expect(await screen.findByText("010-****-5678")).toBeInTheDocument();
    expect(
      screen.getByText(/나만 확인할 수 있어요/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "변경" })).toBeEnabled(),
    );
  });

  it("registers and displays a private email only as a masked value", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          contact: {
            emailMasked: null,
            emailStatus: "missing",
            hasEmail: false,
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T00:00:00.000Z",
          },
          ok: true,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          contact: {
            emailMasked: "wo***@gmail.com",
            emailStatus: "unverified",
            hasEmail: true,
            hasMobilePhone: true,
            marketingOptIn: false,
            mobilePhoneMasked: "010-****-5678",
            mobilePhoneStatus: "unverified",
            updatedAt: "2026-07-27T01:00:00.000Z",
          },
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PrivateContactEditor />);

    fireEvent.change(
      await screen.findByRole("textbox", { name: "이메일" }),
      { target: { value: "Woorim.Prog@gmail.com" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "이메일 저장" }));

    expect(await screen.findByText("wo***@gmail.com")).toBeInTheDocument();
    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      email: "Woorim.Prog@gmail.com",
      source: "profile",
    });
    expect(JSON.stringify(fetchMock.mock.calls[1]?.[0])).not.toContain(
      "Woorim.Prog@gmail.com",
    );
  });

  it("saves the marketing preference independently from contact changes", async () => {
    const savedContact = {
      emailMasked: "wo***@gmail.com",
      emailStatus: "unverified",
      hasEmail: true,
      hasMobilePhone: true,
      marketingOptIn: false,
      mobilePhoneMasked: "010-****-5678",
      mobilePhoneStatus: "unverified",
      updatedAt: "2026-07-27T01:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ contact: savedContact, ok: true }),
      )
      .mockResolvedValueOnce(
        Response.json({
          contact: { ...savedContact, marketingOptIn: true },
          ok: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PrivateContactEditor />);

    fireEvent.click(
      await screen.findByRole("checkbox", { name: /광고성 소식 받기/ }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      marketingOptIn: true,
      preference: "marketing",
    });
    expect(
      await screen.findByText("광고성 소식을 받도록 설정했어요."),
    ).toBeInTheDocument();
  });

  it("verifies a saved email with a six digit code", async () => {
    const savedContact = {
      emailMasked: "wo***@gmail.com",
      emailStatus: "unverified",
      emailVerifiedAt: null,
      hasEmail: true,
      hasMobilePhone: true,
      marketingOptIn: false,
      mobilePhoneMasked: "010-****-5678",
      mobilePhoneStatus: "unverified",
      updatedAt: "2026-07-27T01:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ contact: savedContact, ok: true }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          verification: {
            challengeId: "33333333-3333-4333-8333-333333333333",
            emailMasked: "wo***@gmail.com",
            expiresAt: "2026-07-27T01:10:00.000Z",
            resendAfterSeconds: 60,
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          verification: {
            emailStatus: "verified",
            verifiedAt: "2026-07-27T01:02:00.000Z",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PrivateContactEditor />);

    fireEvent.click(
      await screen.findByRole("button", { name: /인증하기/ }),
    );
    fireEvent.change(
      await screen.findByRole("textbox", { name: "이메일 인증번호" }),
      { target: { value: "123456" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "인증 확인" }));

    expect(await screen.findByText("인증 완료")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/me/contact/email-verification/request",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "/api/me/contact/email-verification/confirm",
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)),
    ).toMatchObject({
      challengeId: "33333333-3333-4333-8333-333333333333",
      code: "123456",
    });
  });
});
