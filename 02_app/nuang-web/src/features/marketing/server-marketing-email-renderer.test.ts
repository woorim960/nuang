import { afterEach, describe, expect, it, vi } from "vitest";
import {
  advertisingSubject,
  renderMarketingEmail,
} from "./server-marketing-email-renderer";

afterEach(() => vi.unstubAllEnvs());

describe("marketing email renderer", () => {
  it("forces advertising disclosure, contact details and one-click unsubscribe", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://nuang.app");
    const mail = renderMarketingEmail({
      content: {
        body: "새로운 검사를 만나보세요.",
        ctaLabel: "검사 보러 가기",
        ctaUrl: "https://nuang.app/home",
        eyebrow: "NUANG NEWS",
        heading: "나를 더 재미있게 알아봐요",
        subject: "새 검사가 열렸어요",
      },
      oneClickUnsubscribeUrl:
        "https://nuang.app/api/marketing/unsubscribe?token=opaque",
      unsubscribeUrl: "https://nuang.app/email/unsubscribe?token=opaque",
    });

    expect(mail.subject).toBe("(광고) 새 검사가 열렸어요");
    expect(mail.headers).toEqual({
      "List-Unsubscribe":
        "<https://nuang.app/api/marketing/unsubscribe?token=opaque>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(mail.html).toContain("woorimprog@gmail.com");
    expect(mail.html).toContain("010-2515-0939");
    expect(mail.html).toContain("수신거부");
  });

  it("escapes operator content and never duplicates the ad prefix", () => {
    const mail = renderMarketingEmail({
      content: {
        body: "<script>alert(1)</script>",
        ctaLabel: null,
        ctaUrl: null,
        eyebrow: "<b>NEWS</b>",
        heading: "안전한 <이메일>",
        subject: "(광고) 확인",
      },
      unsubscribeUrl: "https://nuang.app/email/unsubscribe?token=opaque",
    });
    expect(mail.subject).toBe("(광고) 확인");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(advertisingSubject("제목\r\nBcc: bad@example.com")).toBe(
      "(광고) 제목 Bcc: bad@example.com",
    );
  });
});
