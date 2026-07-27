import { bundledTrustedLinkDomains } from "./trusted-link-domains";

export type ExternalLinkStatus =
  | "approved"
  | "blocked"
  | "pending"
  | "trusted";

export type FeedExternalLink = {
  displayUrl: string;
  hostname: string;
  normalizedUrl: string;
  status: ExternalLinkStatus;
};

export type ExtractedExternalLink = FeedExternalLink & {
  end: number;
  originalUrl: string;
  start: number;
};

const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;
const trailingPunctuation = /[),.!?:;\]}]+$/u;

export function extractExternalLinks(text: string): ExtractedExternalLink[] {
  return [...text.matchAll(urlPattern)].flatMap((match) => {
    const raw = match[0];
    const originalUrl = raw.replace(trailingPunctuation, "");
    const start = match.index ?? 0;
    const normalized = normalizeExternalUrl(originalUrl);

    if (!normalized) return [];

    return [
      {
        ...normalized,
        end: start + originalUrl.length,
        originalUrl,
        start,
        status: isBundledTrustedHostname(normalized.hostname)
          ? "trusted"
          : "pending",
      },
    ];
  });
}

export function normalizeExternalUrl(value: string) {
  const candidate = value.startsWith("www.") ? `https://${value}` : value;

  if (candidate.length > 2048) return null;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      isBlockedHostname(hostname)
    ) {
      return null;
    }

    url.hostname = hostname;
    url.hash = "";

    return {
      displayUrl: value,
      hostname,
      normalizedUrl: url.toString(),
    };
  } catch {
    return null;
  }
}

export function hostnameMatchesDomain(
  hostname: string,
  domain: string,
  allowSubdomains = true,
) {
  const normalizedHostname = hostname.toLocaleLowerCase("en-US");
  const normalizedDomain = domain.toLocaleLowerCase("en-US");
  return (
    normalizedHostname === normalizedDomain ||
    (allowSubdomains && normalizedHostname.endsWith(`.${normalizedDomain}`))
  );
}

export function isBundledTrustedHostname(hostname: string) {
  return [...bundledTrustedLinkDomains].some((domain) =>
    hostnameMatchesDomain(hostname, domain),
  );
}

function isBlockedHostname(hostname: string) {
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("[") ||
    hostname.includes(":")
  ) {
    return true;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname)) {
    return true;
  }

  return false;
}
