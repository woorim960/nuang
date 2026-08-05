import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTopicReportShareContent } from "@/features/share/report-share-contract";
import {
  buildKakaoReportShareTemplate,
  KAKAO_REPORT_SHARE_IMAGE_URLS,
  prepareKakaoTalkShare,
  sendReportToKakaoTalk,
} from "@/features/share/kakao-talk-share";

describe("Kakao Talk report share template", () => {
  it("builds a branded card with the exact public report link", () => {
    const content = buildTopicReportShareContent({
      assessmentTitle: "위로받을 때 필요한 것",
      highlights: ["방법 함께 찾기 88점", "내 속도와 선택 69점"],
      resultName: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
      summary: "막막할 때 해결 방법을 함께 정리하는 도움이 크게 나타났어요.",
    });
    const url =
      "https://nuang.app/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111";

    const template = buildKakaoReportShareTemplate(content, url);

    expect(template).toMatchObject({
      buttons: [
        {
          link: { mobileWebUrl: url, webUrl: url },
          title: "결과 리포트 보기",
        },
      ],
      content: {
        imageHeight: 630,
        imageUrl: KAKAO_REPORT_SHARE_IMAGE_URLS.topic,
        imageWidth: 1200,
        link: { mobileWebUrl: url, webUrl: url },
      },
      objectType: "feed",
    });
    expect(template.content.title).toContain("위로받을 때 필요한 것 결과");
    expect(template.content.description).toContain("방법 함께 찾기 88점");
    expect(JSON.stringify(template)).not.toMatch(
      /answers|responses|observations|원점수/,
    );
  });

  it.each(["core", "topic", "lab"] as const)(
    "uses the branded %s report image",
    (reportType) => {
      const variantContent = {
        ...buildTopicReportShareContent({
          assessmentTitle: "관계 검사",
          highlights: ["대화를 천천히 시작해요"],
          resultName: "차분한 대화",
          summary: "생각을 정리한 뒤 말하는 편이에요.",
        }),
        reportType,
      };

      expect(
        buildKakaoReportShareTemplate(
          variantContent,
          "https://nuang.app/results/example",
        ).content.imageUrl,
      ).toBe(KAKAO_REPORT_SHARE_IMAGE_URLS[reportType]);
    },
  );

  it("rejects a non-web destination", () => {
    const content = buildTopicReportShareContent({
      assessmentTitle: "관계 검사",
      highlights: ["대화를 천천히 시작해요"],
      resultName: "차분한 대화",
      summary: "생각을 정리한 뒤 말하는 편이에요.",
    });

    expect(() =>
      buildKakaoReportShareTemplate(content, "javascript:alert(1)"),
    ).toThrow("kakao_share_url_invalid");
  });

  it("keeps the public JavaScript key in the production release env gate", () => {
    const envCheck = readFileSync(
      resolve(process.cwd(), "scripts/check-env.mjs"),
      "utf8",
    );
    const serverRequirements = envCheck.match(
      /server:\s*\[([\s\S]*?)\n\s*\],/,
    )?.[1];
    const exampleEnv = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    expect(serverRequirements).toContain(
      '"NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY"',
    );
    expect(exampleEnv).toContain("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=");
    expect(exampleEnv).toContain("재빌드·재배포합니다");
  });

  it("loads the pinned official SDK with integrity protection", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY",
      "public-javascript-test-key",
    );
    const init = vi.fn();
    const isInitialized = vi.fn(() => false);

    const preparation = prepareKakaoTalkShare();
    const script = document.querySelector<HTMLScriptElement>(
      "#nuang-kakao-javascript-sdk",
    );
    expect(script).toMatchObject({
      async: true,
      crossOrigin: "anonymous",
      integrity:
        "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J",
      src: "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js",
    });

    window.Kakao = {
      init,
      isInitialized,
      Share: { sendDefault: vi.fn(), uploadImage: vi.fn() },
    };
    script?.dispatchEvent(new Event("load"));
    await preparation;

    expect(init).toHaveBeenCalledWith("public-javascript-test-key");
  });

  it("uploads the bundled image to Kakao CDN before opening the picker", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY",
      "public-javascript-test-key",
    );
    const cdnUrl = "https://mud-kage.kakao.com/dn/share/topic_original.png";
    const sendDefault = vi.fn();
    const uploadImage = vi.fn().mockResolvedValue({
      infos: { original: { url: cdnUrl } },
    });
    window.Kakao = {
      init: vi.fn(),
      isInitialized: vi.fn(() => true),
      Share: { sendDefault, uploadImage },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["nuang-image"], { type: "image/png" }), {
        headers: { "content-type": "image/png" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const topicContent = buildTopicReportShareContent({
      assessmentTitle: "관계 검사",
      highlights: ["대화를 천천히 시작해요"],
      resultName: "차분한 대화",
      summary: "생각을 정리한 뒤 말하는 편이에요.",
    });

    await sendReportToKakaoTalk({
      content: topicContent,
      url: "https://nuang.app/results/example",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/images/share/nuang-result-share-topic-v2.png",
      expect.objectContaining({ cache: "force-cache" }),
    );
    expect(uploadImage).toHaveBeenCalledTimes(1);
    const uploadRequest = uploadImage.mock.calls[0]?.[0] as {
      file: FileList;
    };
    expect(uploadRequest.file).toHaveLength(1);
    expect(uploadRequest.file.item(0)).toMatchObject({ type: "image/png" });
    expect(sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ imageUrl: cdnUrl }),
      }),
    );
  });

  it("normalizes an SDK-issued image URL to HTTPS", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY",
      "public-javascript-test-key",
    );
    const sendDefault = vi.fn();
    window.Kakao = {
      init: vi.fn(),
      isInitialized: vi.fn(() => true),
      Share: {
        sendDefault,
        uploadImage: vi.fn().mockResolvedValue({
          infos: {
            original: {
              url: "http://k.kakaocdn.net/dn/share/lab_original.png",
            },
          },
        }),
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["nuang-image"], { type: "image/png" }), {
          headers: { "content-type": "image/png" },
          status: 200,
        }),
      ),
    );
    const labContent = {
      ...buildTopicReportShareContent({
        assessmentTitle: "관계 검사",
        highlights: ["대화를 천천히 시작해요"],
        resultName: "차분한 대화",
        summary: "생각을 정리한 뒤 말하는 편이에요.",
      }),
      reportType: "lab" as const,
    };

    await sendReportToKakaoTalk({
      content: labContent,
      url: "https://nuang.app/results/example",
    });

    expect(sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          imageUrl: "https://k.kakaocdn.net/dn/share/lab_original.png",
        }),
      }),
    );
  });

  it("scrapes the production asset when a browser cannot upload the bundled image", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY",
      "public-javascript-test-key",
    );
    const sendDefault = vi.fn();
    const scrapedUrl =
      "https://mud-kage.kakao.com/dn/share/core_scraped_original.png";
    const scrapImage = vi.fn().mockResolvedValue({
      infos: { original: { url: scrapedUrl } },
    });
    window.Kakao = {
      init: vi.fn(),
      isInitialized: vi.fn(() => true),
      Share: {
        scrapImage,
        sendDefault,
        uploadImage: vi.fn().mockRejectedValue(new Error("upload blocked")),
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["nuang-image"], { type: "image/png" }), {
          headers: { "content-type": "image/png" },
          status: 200,
        }),
      ),
    );
    const coreContent = {
      ...buildTopicReportShareContent({
        assessmentTitle: "성향 검사",
        highlights: ["대화를 천천히 시작해요"],
        resultName: "차분한 대화",
        summary: "생각을 정리한 뒤 말하는 편이에요.",
      }),
      reportType: "core" as const,
    };

    await sendReportToKakaoTalk({
      content: coreContent,
      url: "http://localhost:3000/results/example",
    });

    expect(scrapImage).toHaveBeenCalledWith({
      imageUrl: KAKAO_REPORT_SHARE_IMAGE_URLS.core,
    });
    expect(sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ imageUrl: scrapedUrl }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete window.Kakao;
  });
});
