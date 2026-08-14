import "server-only";

import { createHmac } from "node:crypto";
import { AwsClient } from "aws4fetch";

const R2_FEATURE_FLAG = "FEED_MEDIA_R2_ENABLED";
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const MIN_REQUEST_TIMEOUT_MS = 250;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const MAX_OBJECT_KEY_BYTES = 512;
const PUBLIC_LINK_LIFETIME_SECONDS = 60 * 60;
// Match the existing Supabase signed-URL lifetime so a private result does not
// break when a user leaves a hydrated page open before scrolling. Private
// responses still bypass every edge/browser cache.
const PRIVATE_LINK_LIFETIME_SECONDS = 60 * 60;
const DELIVERY_SIGNATURE_VERSION = "1";
const MIN_SECRET_CHARACTERS = 32;
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/i;
const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const OBJECT_KEY_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export const defaultFeedMediaR2MaxManagedBytes = 8_000_000_000;
export const minFeedMediaR2MaxManagedBytes = 1_000_000_000;
export const maxFeedMediaR2MaxManagedBytes = 9_500_000_000;

export const feedMediaR2ConfigurationRules = {
  accountId: "32 hexadecimal characters",
  bucketName: "3-63 lowercase letters, numbers, or interior hyphens",
  deliveryOrigin: "HTTPS origin without credentials, path, query, or hash",
  enabledValue: "true",
  maxManagedBytes: {
    default: defaultFeedMediaR2MaxManagedBytes,
    maximum: maxFeedMediaR2MaxManagedBytes,
    minimum: minFeedMediaR2MaxManagedBytes,
  },
  requestTimeoutMs: {
    default: DEFAULT_REQUEST_TIMEOUT_MS,
    maximum: MAX_REQUEST_TIMEOUT_MS,
    minimum: MIN_REQUEST_TIMEOUT_MS,
  },
  secretMinimumCharacters: MIN_SECRET_CHARACTERS,
} as const;

const supportedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type FeedMediaR2Environment = Readonly<
  Record<string, string | undefined>
>;
type SignedFetch = (
  input: Request | { toString(): string },
  init?: RequestInit,
) => Promise<Response>;

type ReadyConfiguration = {
  accessKeyId: string;
  accountId: string;
  bucketName: string;
  deliveryOrigin: string;
  deliverySigningSecret: string;
  maxManagedBytes: number;
  requestTimeoutMs: number;
  secretAccessKey: string;
};

export type FeedMediaR2Readiness =
  { status: "disabled" } | { status: "misconfigured" } | { status: "ready" };

export type FeedMediaR2ConfigurationIssue =
  | "access_key_id_missing"
  | "account_id_invalid"
  | "bucket_name_invalid"
  | "delivery_origin_invalid"
  | "delivery_signing_secret_invalid"
  | "max_managed_bytes_invalid"
  | "request_timeout_invalid"
  | "secret_access_key_invalid";

export type FeedMediaR2ConfigurationValidationSummary = {
  enabled: boolean;
  issues: FeedMediaR2ConfigurationIssue[];
  status: FeedMediaR2Readiness["status"];
};

export type FeedMediaR2OperationResult =
  | {
      etag?: string;
      ok: true;
      status: number;
    }
  | {
      code:
        | "configuration_invalid"
        | "feature_disabled"
        | "invalid_content_type"
        | "invalid_object_key"
        | "network_error"
        | "object_exists"
        | "storage_rejected"
        | "timeout";
      ok: false;
    };

export type FeedMediaDeliveryMode = "private" | "public";
export type FeedMediaR2UploadBody = ArrayBuffer | Blob | Buffer | Uint8Array;

export type FeedMediaR2Adapter = {
  createDeliveryUrl(input: {
    key: string;
    mode: FeedMediaDeliveryMode;
    now?: Date;
  }): string | null;
  deleteObject(input: { key: string }): Promise<FeedMediaR2OperationResult>;
  maxManagedBytes: number | null;
  putObject(input: {
    body: FeedMediaR2UploadBody;
    contentType: string;
    key: string;
  }): Promise<FeedMediaR2OperationResult>;
  readiness: FeedMediaR2Readiness;
};

export function getFeedMediaR2Readiness(
  environment: FeedMediaR2Environment = process.env,
): FeedMediaR2Readiness {
  return { status: validateFeedMediaR2Configuration(environment).status };
}

export function getFeedMediaR2MaxManagedBytes(
  environment: FeedMediaR2Environment = process.env,
) {
  return parseFeedMediaR2MaxManagedBytes(
    environment.FEED_MEDIA_R2_MAX_MANAGED_BYTES,
  );
}

export function parseFeedMediaR2MaxManagedBytes(value: string | undefined) {
  if (!value?.trim()) return defaultFeedMediaR2MaxManagedBytes;
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minFeedMediaR2MaxManagedBytes ||
    parsed > maxFeedMediaR2MaxManagedBytes
  ) {
    return null;
  }
  return parsed;
}

export function validateFeedMediaR2Configuration(
  environment: FeedMediaR2Environment,
): FeedMediaR2ConfigurationValidationSummary {
  return evaluateConfiguration(environment).summary;
}

export function createFeedMediaR2Adapter({
  environment = process.env,
  signedFetch,
}: {
  environment?: FeedMediaR2Environment;
  signedFetch?: SignedFetch;
} = {}): FeedMediaR2Adapter {
  const configurationResult = evaluateConfiguration(environment);
  if (!configurationResult.configuration) {
    const unavailableCode =
      configurationResult.summary.status === "disabled"
        ? "feature_disabled"
        : "configuration_invalid";
    return {
      createDeliveryUrl: () => null,
      deleteObject: async () => ({ code: unavailableCode, ok: false }),
      maxManagedBytes: null,
      putObject: async () => ({ code: unavailableCode, ok: false }),
      readiness: { status: configurationResult.summary.status },
    };
  }

  const configuration = configurationResult.configuration;
  const awsClient = signedFetch
    ? null
    : new AwsClient({
        accessKeyId: configuration.accessKeyId,
        region: "auto",
        retries: 1,
        secretAccessKey: configuration.secretAccessKey,
        service: "s3",
      });
  const storageFetch = signedFetch ?? awsClient!.fetch.bind(awsClient);

  return {
    createDeliveryUrl: ({ key, mode, now = new Date() }) => {
      const canonicalKey = canonicalizeFeedMediaR2Key(key);
      if (
        !canonicalKey ||
        (mode !== "private" && mode !== "public") ||
        !Number.isFinite(now.getTime())
      ) {
        return null;
      }

      const expiresAt =
        Math.floor(now.getTime() / 1_000) +
        (mode === "public"
          ? PUBLIC_LINK_LIFETIME_SECONDS
          : PRIVATE_LINK_LIFETIME_SECONDS);
      const pathname = `/${encodeObjectKey(canonicalKey)}`;
      const signature = createHmac(
        "sha256",
        configuration.deliverySigningSecret,
      )
        .update(buildDeliverySignaturePayload({ expiresAt, mode, pathname }))
        .digest("base64url");
      const url = new URL(pathname, `${configuration.deliveryOrigin}/`);
      url.searchParams.set("v", DELIVERY_SIGNATURE_VERSION);
      url.searchParams.set("exp", String(expiresAt));
      url.searchParams.set("mode", mode);
      url.searchParams.set("sig", signature);
      return url.toString();
    },
    deleteObject: async ({ key }) => {
      const canonicalKey = canonicalizeFeedMediaR2Key(key);
      if (!canonicalKey) return { code: "invalid_object_key", ok: false };

      const response = await requestWithTimeout({
        configuration,
        init: { method: "DELETE" },
        key: canonicalKey,
        signedFetch: storageFetch,
      });
      if (!response.ok) return response;
      if ([200, 204, 404].includes(response.response.status)) {
        return { ok: true, status: response.response.status };
      }
      return classifyStorageFailure(response.response.status);
    },
    maxManagedBytes: configuration.maxManagedBytes,
    putObject: async ({ body, contentType, key }) => {
      const canonicalKey = canonicalizeFeedMediaR2Key(key);
      if (!canonicalKey) return { code: "invalid_object_key", ok: false };
      if (!supportedContentTypes.has(contentType)) {
        return { code: "invalid_content_type", ok: false };
      }

      const response = await requestWithTimeout({
        configuration,
        init: {
          body: body as BodyInit,
          headers: {
            "Cache-Control": "private, no-store",
            "Content-Type": contentType,
            "If-None-Match": "*",
          },
          method: "PUT",
        },
        key: canonicalKey,
        signedFetch: storageFetch,
      });
      if (!response.ok) return response;
      if (response.response.ok) {
        const etag = response.response.headers.get("etag")?.trim();
        return {
          ...(etag ? { etag } : {}),
          ok: true,
          status: response.response.status,
        };
      }
      return classifyStorageFailure(response.response.status);
    },
    readiness: { status: configurationResult.summary.status },
  };
}

export function canonicalizeFeedMediaR2Key(value: string) {
  if (
    value !== value.trim() ||
    value.includes("\\") ||
    new TextEncoder().encode(value).byteLength > MAX_OBJECT_KEY_BYTES
  ) {
    return null;
  }

  const segments = value.split("/");
  if (
    segments.length > 8 ||
    segments.some((segment) => !OBJECT_KEY_SEGMENT_PATTERN.test(segment))
  ) {
    return null;
  }

  return segments.join("/");
}

function evaluateConfiguration(environment: FeedMediaR2Environment): {
  configuration: ReadyConfiguration | null;
  summary: FeedMediaR2ConfigurationValidationSummary;
} {
  if (environment[R2_FEATURE_FLAG]?.trim().toLowerCase() !== "true") {
    return {
      configuration: null,
      summary: { enabled: false, issues: [], status: "disabled" },
    };
  }

  const accountId = nonEmpty(environment.CLOUDFLARE_R2_ACCOUNT_ID);
  const bucketName = nonEmpty(environment.CLOUDFLARE_R2_BUCKET_NAME);
  const accessKeyId = nonEmpty(environment.CLOUDFLARE_R2_ACCESS_KEY_ID);
  const secretAccessKey = nonEmpty(environment.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
  const deliveryOrigin = normalizeDeliveryOrigin(
    environment.FEED_MEDIA_R2_DELIVERY_ORIGIN,
  );
  const deliverySigningSecret = nonEmpty(
    environment.FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET,
  );
  const requestTimeoutMs = normalizeRequestTimeout(
    environment.FEED_MEDIA_R2_REQUEST_TIMEOUT_MS,
  );
  const maxManagedBytes = parseFeedMediaR2MaxManagedBytes(
    environment.FEED_MEDIA_R2_MAX_MANAGED_BYTES,
  );

  const issues: FeedMediaR2ConfigurationIssue[] = [];
  if (!accountId || !ACCOUNT_ID_PATTERN.test(accountId)) {
    issues.push("account_id_invalid");
  }
  if (!bucketName || !BUCKET_NAME_PATTERN.test(bucketName)) {
    issues.push("bucket_name_invalid");
  }
  if (!accessKeyId) issues.push("access_key_id_missing");
  if (!secretAccessKey || secretAccessKey.length < MIN_SECRET_CHARACTERS) {
    issues.push("secret_access_key_invalid");
  }
  if (!deliveryOrigin) issues.push("delivery_origin_invalid");
  if (
    !deliverySigningSecret ||
    deliverySigningSecret.length < MIN_SECRET_CHARACTERS
  ) {
    issues.push("delivery_signing_secret_invalid");
  }
  if (requestTimeoutMs === null) issues.push("request_timeout_invalid");
  if (maxManagedBytes === null) issues.push("max_managed_bytes_invalid");

  if (issues.length > 0) {
    return {
      configuration: null,
      summary: { enabled: true, issues, status: "misconfigured" },
    };
  }

  return {
    configuration: {
      accessKeyId: accessKeyId!,
      accountId: accountId!,
      bucketName: bucketName!,
      deliveryOrigin: deliveryOrigin!,
      deliverySigningSecret: deliverySigningSecret!,
      maxManagedBytes: maxManagedBytes!,
      requestTimeoutMs: requestTimeoutMs!,
      secretAccessKey: secretAccessKey!,
    },
    summary: { enabled: true, issues: [], status: "ready" },
  };
}

function normalizeDeliveryOrigin(value: string | undefined) {
  const candidate = nonEmpty(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeRequestTimeout(value: string | undefined) {
  if (!value?.trim()) return DEFAULT_REQUEST_TIMEOUT_MS;
  if (!/^\d+$/.test(value.trim())) return null;
  const timeout = Number(value.trim());
  if (timeout < MIN_REQUEST_TIMEOUT_MS || timeout > MAX_REQUEST_TIMEOUT_MS) {
    return null;
  }
  return timeout;
}

async function requestWithTimeout({
  configuration,
  init,
  key,
  signedFetch,
}: {
  configuration: ReadyConfiguration;
  init: RequestInit;
  key: string;
  signedFetch: SignedFetch;
}): Promise<
  | { ok: true; response: Response }
  | Extract<FeedMediaR2OperationResult, { ok: false }>
> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    configuration.requestTimeoutMs,
  );
  const endpoint = `https://${configuration.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(configuration.bucketName)}/${encodeObjectKey(key)}`;

  try {
    const response = await signedFetch(endpoint, {
      ...init,
      signal: controller.signal,
    });
    return { ok: true, response };
  } catch {
    return controller.signal.aborted
      ? { code: "timeout", ok: false }
      : { code: "network_error", ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

function classifyStorageFailure(
  status: number,
): Extract<FeedMediaR2OperationResult, { ok: false }> {
  return status === 409 || status === 412
    ? { code: "object_exists", ok: false }
    : { code: "storage_rejected", ok: false };
}

function buildDeliverySignaturePayload({
  expiresAt,
  mode,
  pathname,
}: {
  expiresAt: number;
  mode: FeedMediaDeliveryMode;
  pathname: string;
}) {
  return `nuang:feed-media-delivery:v1\n${pathname}\n${expiresAt}\n${mode}`;
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function nonEmpty(value: string | undefined) {
  return value?.trim() || null;
}
