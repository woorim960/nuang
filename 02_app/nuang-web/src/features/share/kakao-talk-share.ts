import type { ReportShareContent } from "@/features/share/report-share-contract";

const KAKAO_SDK_ELEMENT_ID = "nuang-kakao-javascript-sdk";
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const KAKAO_SDK_INTEGRITY =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";
export const KAKAO_REPORT_SHARE_IMAGE_URLS: Record<
  ReportShareContent["reportType"],
  string
> = {
  core: "https://nuang.app/images/share/nuang-result-share-core-v2.png",
  lab: "https://nuang.app/images/share/nuang-result-share-lab-v2.png",
  topic: "https://nuang.app/images/share/nuang-result-share-topic-v2.png",
};
const KAKAO_REPORT_SHARE_IMAGE_PATHS: Record<
  ReportShareContent["reportType"],
  string
> = {
  core: "/images/share/nuang-result-share-core-v2.png",
  lab: "/images/share/nuang-result-share-lab-v2.png",
  topic: "/images/share/nuang-result-share-topic-v2.png",
};
const KAKAO_IMAGE_CACHE_VERSION = "nuang-result-share-v2";
const KAKAO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type KakaoLink = {
  mobileWebUrl: string;
  webUrl: string;
};

export type KakaoReportShareTemplate = {
  buttons: Array<{
    link: KakaoLink;
    title: string;
  }>;
  content: {
    description: string;
    imageHeight: number;
    imageUrl: string;
    imageWidth: number;
    link: KakaoLink;
    title: string;
  };
  objectType: "feed";
};

type KakaoJavaScriptSdk = {
  Share: {
    scrapImage?: (request: { imageUrl: string }) => Promise<{
      infos?: { original?: { url?: string } };
    }>;
    uploadImage: (request: { file: FileList }) => Promise<{
      infos?: { original?: { url?: string } };
    }>;
    sendDefault: (template: KakaoReportShareTemplate) => void;
  };
  init: (javascriptKey: string) => void;
  isInitialized: () => boolean;
};

declare global {
  interface Window {
    Kakao?: KakaoJavaScriptSdk;
  }
}

let sdkPreparation: Promise<KakaoJavaScriptSdk> | null = null;
const imagePreparations = new Map<
  ReportShareContent["reportType"],
  Promise<string>
>();

export function prepareKakaoTalkShare() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("kakao_share_browser_required"));
  }

  const javascriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!javascriptKey) {
    return Promise.reject(new Error("kakao_share_key_missing"));
  }

  if (window.Kakao) {
    initializeKakaoSdk(window.Kakao, javascriptKey);
    return Promise.resolve(window.Kakao);
  }

  if (sdkPreparation) return sdkPreparation;

  sdkPreparation = new Promise<KakaoJavaScriptSdk>((resolve, reject) => {
    const existingScript = document.getElementById(
      KAKAO_SDK_ELEMENT_ID,
    ) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => {
      if (!window.Kakao) {
        script.remove();
        sdkPreparation = null;
        reject(new Error("kakao_share_sdk_unavailable"));
        return;
      }

      try {
        initializeKakaoSdk(window.Kakao, javascriptKey);
        resolve(window.Kakao);
      } catch (error) {
        sdkPreparation = null;
        reject(error);
      }
    };

    const handleError = () => {
      script.remove();
      sdkPreparation = null;
      reject(new Error("kakao_share_sdk_load_failed"));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.async = true;
      script.crossOrigin = "anonymous";
      script.id = KAKAO_SDK_ELEMENT_ID;
      script.integrity = KAKAO_SDK_INTEGRITY;
      script.src = KAKAO_SDK_URL;
      document.head.appendChild(script);
    }
  });

  return sdkPreparation;
}

export async function sendReportToKakaoTalk({
  content,
  url,
}: {
  content: ReportShareContent;
  url: string;
}) {
  const sdk = await prepareKakaoTalkShare();
  if (!sdk.isInitialized()) {
    throw new Error("kakao_share_sdk_not_ready");
  }

  const imageUrl = await prepareKakaoReportShareImage(content.reportType);
  sdk.Share.sendDefault(buildKakaoReportShareTemplate(content, url, imageUrl));
}

export async function prepareKakaoReportShareImage(
  reportType: ReportShareContent["reportType"],
) {
  const sdk = await prepareKakaoTalkShare();
  const pending = imagePreparations.get(reportType);
  if (pending) return pending;

  const preparation = issueKakaoReportImage(sdk, reportType).catch(
    (error) => {
      imagePreparations.delete(reportType);
      throw error;
    },
  );
  imagePreparations.set(reportType, preparation);
  return preparation;
}

export function buildKakaoReportShareTemplate(
  content: ReportShareContent,
  url: string,
  imageUrl = KAKAO_REPORT_SHARE_IMAGE_URLS[content.reportType],
): KakaoReportShareTemplate {
  const link = createKakaoLink(url);
  const resultLabel = content.code
    ? `${content.code} · ${content.resultName}`
    : content.resultName;
  const description = [content.summary, ...content.highlights.slice(0, 2)]
    .filter(Boolean)
    .join(" · ");

  return {
    buttons: [
      {
        link,
        title: "결과 리포트 보기",
      },
    ],
    content: {
      description: truncateText(description, 180),
      imageHeight: 630,
      imageUrl,
      imageWidth: 1200,
      link,
      title: truncateText(`${content.title} · ${resultLabel}`, 80),
    },
    objectType: "feed",
  };
}

async function uploadKakaoReportImage(
  sdk: KakaoJavaScriptSdk,
  reportType: ReportShareContent["reportType"],
) {
  const response = await fetch(KAKAO_REPORT_SHARE_IMAGE_PATHS[reportType], {
    cache: "force-cache",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("kakao_share_image_asset_unavailable");

  const blob = await response.blob();
  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || blob.type;
  if (!contentType.startsWith("image/") || blob.size > KAKAO_IMAGE_MAX_BYTES) {
    throw new Error("kakao_share_image_asset_invalid");
  }

  const file = new File(
    [blob],
    `${KAKAO_IMAGE_CACHE_VERSION}-${reportType}.png`,
    {
      type: contentType,
    },
  );
  const uploaded = await sdk.Share.uploadImage({ file: createFileList(file) });
  const imageUrl = normalizeKakaoIssuedImageUrl(
    uploaded.infos?.original?.url,
  );
  if (!imageUrl) {
    throw new Error("kakao_share_image_upload_invalid");
  }

  return imageUrl;
}

async function issueKakaoReportImage(
  sdk: KakaoJavaScriptSdk,
  reportType: ReportShareContent["reportType"],
) {
  try {
    // localhost·preview·production 모두 현재 빌드에 포함된 이미지를
    // Kakao CDN에 올린 뒤, 카카오가 발급한 URL로만 카드를 만듭니다.
    return await uploadKakaoReportImage(sdk, reportType);
  } catch (uploadError) {
    // 로컬 에셋 fetch 또는 FileList 업로드가 특정 브라우저에서
    // 막히면 운영 에셋을 Kakao가 스크랩하게 해 이미지 없는
    // 카드로 폴백하지 않습니다.
    if (typeof sdk.Share.scrapImage === "function") {
      try {
        const scraped = await sdk.Share.scrapImage({
          imageUrl: KAKAO_REPORT_SHARE_IMAGE_URLS[reportType],
        });
        const imageUrl = normalizeKakaoIssuedImageUrl(
          scraped.infos?.original?.url,
        );
        if (imageUrl) return imageUrl;
      } catch {
        // 원래 업로드 오류를 유지해 운영자가 에셋·용량·형식
        // 문제를 구분할 수 있게 합니다.
      }
    }

    throw uploadError;
  }
}

function createFileList(file: File) {
  if (typeof DataTransfer !== "undefined") {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    return transfer.files;
  }

  return {
    0: file,
    item: (index: number) => (index === 0 ? file : null),
    length: 1,
  } as unknown as FileList;
}

function normalizeKakaoIssuedImageUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    // Kakao's upload API can return different CDN hosts and, on some SDK
    // responses, an http URL. Kakao Talk cards require an externally reachable
    // image, so always pass the SDK-issued URL back as HTTPS.
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

function createKakaoLink(value: string): KakaoLink {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("kakao_share_url_invalid");
  }

  const normalized = url.toString();
  return {
    mobileWebUrl: normalized,
    webUrl: normalized,
  };
}

function initializeKakaoSdk(kakao: KakaoJavaScriptSdk, javascriptKey: string) {
  if (!kakao.isInitialized()) kakao.init(javascriptKey);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
