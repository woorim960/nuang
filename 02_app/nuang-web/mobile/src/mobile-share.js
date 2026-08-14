const shareOrigin = "https://nuang.app";
const guestSharePattern = /^\/share\/[A-Za-z0-9._~-]{8,2048}$/;
const accountReportPattern =
  /^\/feed\/profiles\/[A-Za-z0-9._~-]{1,160}\/reports\/[A-Za-z0-9._~-]{1,200}$/;

export function createMobileReportShare({ share }) {
  return async function shareReport({ text, title, url }) {
    const portableUrl = normalizePortableReportUrl(url);
    if (!portableUrl) return { error: "url_not_portable", ok: false };
    if (!isSafeShareCopy(title, 100) || !isSafeShareCopy(text, 500)) {
      return { error: "copy_invalid", ok: false };
    }

    try {
      await share.share({
        dialogTitle: "뉴앙 결과 공유",
        text: text.trim(),
        title: title.trim(),
        url: portableUrl,
      });
      return { ok: true, url: portableUrl };
    } catch {
      return { error: "share_unavailable", ok: false };
    }
  };
}

export function normalizePortableReportUrl(value) {
  try {
    const url = new URL(value);
    if (
      url.origin !== shareOrigin ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      (!guestSharePattern.test(url.pathname) &&
        !accountReportPattern.test(url.pathname))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isSafeShareCopy(value, maxLength) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  );
}
