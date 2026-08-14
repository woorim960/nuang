const PUBLIC_CACHE_SECONDS = 60;
const PUBLIC_LINK_SECONDS = 60 * 60;
const PRIVATE_LINK_SECONDS = 60 * 60;
const CLOCK_SKEW_SECONDS = 60;
const MAX_OBJECT_KEY_BYTES = 512;
const SIGNATURE_VERSION = "1";
const CACHE_STATUS_HEADER = "X-Nuang-Cache";
const OBJECT_KEY_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

type DeliveryMode = "private" | "public";

type R2ObjectLike = {
  body: BodyInit | null;
  httpEtag: string;
  size: number;
  uploaded: Date;
  writeHttpMetadata(headers: Headers): void;
};

type R2HeadObjectLike = Omit<R2ObjectLike, "body">;

type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2HeadObjectLike | null>;
};

type WorkerEnvironment = {
  FEED_MEDIA: R2BucketLike;
  FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: string;
};

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
};

type CacheLike = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

type WorkerDependencies = {
  cache?: CacheLike;
  now?: () => number;
};

export async function handleFeedMediaRequest(
  request: Request,
  environment: WorkerEnvironment,
  context: ExecutionContextLike,
  dependencies: WorkerDependencies = {},
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(405, "Method not allowed", {
      Allow: "GET, HEAD",
    });
  }

  const signingSecret =
    environment.FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET?.trim();
  if (!environment.FEED_MEDIA || !signingSecret || signingSecret.length < 32) {
    return errorResponse(503, "Media delivery unavailable");
  }

  const url = new URL(request.url);
  const canonicalKey = canonicalizeObjectPath(url.pathname);
  if (!canonicalKey) return errorResponse(400, "Invalid media path");

  const authorization = readAuthorization(url);
  if (!authorization) return errorResponse(401, "Invalid media link");

  const nowSeconds = Math.floor((dependencies.now?.() ?? Date.now()) / 1_000);
  const maximumLifetime =
    authorization.mode === "public"
      ? PUBLIC_LINK_SECONDS
      : PRIVATE_LINK_SECONDS;
  if (
    authorization.expiresAt <= nowSeconds ||
    authorization.expiresAt > nowSeconds + maximumLifetime + CLOCK_SKEW_SECONDS
  ) {
    return errorResponse(401, "Expired media link");
  }

  const signatureValid = await verifySignature({
    expiresAt: authorization.expiresAt,
    mode: authorization.mode,
    pathname: url.pathname,
    providedSignature: authorization.signature,
    signingSecret,
  });
  if (!signatureValid) return errorResponse(401, "Invalid media link");

  try {
    if (authorization.mode === "private") {
      return await readPrivateObject({
        bucket: environment.FEED_MEDIA,
        key: canonicalKey,
        method: request.method,
      });
    }

    const cache = dependencies.cache ?? readDefaultCache();
    return await readPublicObject({
      bucket: environment.FEED_MEDIA,
      cache,
      context,
      key: canonicalKey,
      method: request.method,
      requestUrl: url,
    });
  } catch {
    return errorResponse(502, "Media delivery failed");
  }
}

async function readPublicObject({
  bucket,
  cache,
  context,
  key,
  method,
  requestUrl,
}: {
  bucket: R2BucketLike;
  cache: CacheLike | null;
  context: ExecutionContextLike;
  key: string;
  method: string;
  requestUrl: URL;
}) {
  const cacheKey = buildCanonicalCacheKey(requestUrl, key);
  let availableCache = cache;
  if (availableCache) {
    try {
      const cached = await availableCache.match(cacheKey);
      if (cached) return decorateResponse(cached, method, "HIT");
    } catch {
      // Media delivery remains available when the optional edge cache is down.
      availableCache = null;
    }
  }

  if (method === "HEAD") {
    const object = await bucket.head(key);
    if (!object) {
      return errorResponse(404, "Media not found", {
        [CACHE_STATUS_HEADER]: availableCache ? "MISS" : "BYPASS",
      });
    }
    return objectResponse(
      object,
      null,
      "public",
      availableCache ? "MISS" : "BYPASS",
    );
  }

  const object = await bucket.get(key);
  if (!object) {
    return errorResponse(404, "Media not found", {
      [CACHE_STATUS_HEADER]: availableCache ? "MISS" : "BYPASS",
    });
  }

  const cacheableResponse = objectResponse(object, object.body, "public");
  if (availableCache) {
    context.waitUntil(
      availableCache.put(cacheKey, cacheableResponse.clone()).catch(() => {
        // A failed cache fill must not turn a successful R2 read into an error.
      }),
    );
  }
  return decorateResponse(
    cacheableResponse,
    method,
    availableCache ? "MISS" : "BYPASS",
  );
}

async function readPrivateObject({
  bucket,
  key,
  method,
}: {
  bucket: R2BucketLike;
  key: string;
  method: string;
}) {
  if (method === "HEAD") {
    const object = await bucket.head(key);
    if (!object) {
      return errorResponse(404, "Media not found", {
        [CACHE_STATUS_HEADER]: "BYPASS",
      });
    }
    return objectResponse(object, null, "private", "BYPASS");
  }

  const object = await bucket.get(key);
  if (!object) {
    return errorResponse(404, "Media not found", {
      [CACHE_STATUS_HEADER]: "BYPASS",
    });
  }
  return objectResponse(object, object.body, "private", "BYPASS");
}

function objectResponse(
  object: R2HeadObjectLike,
  body: BodyInit | null,
  mode: DeliveryMode,
  cacheStatus?: "BYPASS" | "MISS",
) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set(
    "Cache-Control",
    mode === "public"
      ? `public, max-age=${PUBLIC_CACHE_SECONDS}, s-maxage=${PUBLIC_CACHE_SECONDS}, immutable`
      : "private, no-store",
  );
  headers.set("Content-Disposition", "inline");
  headers.set("Content-Length", String(object.size));
  headers.set("ETag", object.httpEtag);
  headers.set("Last-Modified", object.uploaded.toUTCString());
  headers.set("X-Content-Type-Options", "nosniff");
  if (cacheStatus) headers.set(CACHE_STATUS_HEADER, cacheStatus);
  return new Response(body, { headers, status: 200 });
}

function decorateResponse(
  response: Response,
  method: string,
  cacheStatus: "BYPASS" | "HIT" | "MISS",
) {
  const headers = new Headers(response.headers);
  headers.set(CACHE_STATUS_HEADER, cacheStatus);
  return new Response(method === "HEAD" ? null : response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function readAuthorization(url: URL): {
  expiresAt: number;
  mode: DeliveryMode;
  signature: string;
} | null {
  const allowedKeys = new Set(["exp", "mode", "sig", "v"]);
  for (const key of url.searchParams.keys()) {
    if (!allowedKeys.has(key) || url.searchParams.getAll(key).length !== 1) {
      return null;
    }
  }
  if (Array.from(url.searchParams.keys()).length !== allowedKeys.size) {
    return null;
  }

  const version = url.searchParams.get("v");
  const expiresAtText = url.searchParams.get("exp");
  const mode = url.searchParams.get("mode");
  const signature = url.searchParams.get("sig");
  if (
    version !== SIGNATURE_VERSION ||
    !expiresAtText ||
    !/^\d{10,11}$/.test(expiresAtText) ||
    (mode !== "private" && mode !== "public") ||
    !signature ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return null;
  }

  return {
    expiresAt: Number(expiresAtText),
    mode,
    signature,
  };
}

async function verifySignature({
  expiresAt,
  mode,
  pathname,
  providedSignature,
  signingSecret,
}: {
  expiresAt: number;
  mode: DeliveryMode;
  pathname: string;
  providedSignature: string;
  signingSecret: string;
}) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        buildSignaturePayload({ expiresAt, mode, pathname }),
      ),
    ),
  );
  const provided = decodeBase64Url(providedSignature);
  if (!provided) return false;
  return constantTimeEqual(signature, provided);
}

function buildSignaturePayload({
  expiresAt,
  mode,
  pathname,
}: {
  expiresAt: number;
  mode: DeliveryMode;
  pathname: string;
}) {
  return `nuang:feed-media-delivery:v1\n${pathname}\n${expiresAt}\n${mode}`;
}

function canonicalizeObjectPath(pathname: string) {
  const objectKey = pathname.slice(1);
  if (
    !pathname.startsWith("/") ||
    pathname.includes("\\") ||
    new TextEncoder().encode(objectKey).byteLength > MAX_OBJECT_KEY_BYTES
  ) {
    return null;
  }

  const segments = objectKey.split("/");
  if (
    segments.length > 8 ||
    segments.some((segment) => !OBJECT_KEY_SEGMENT_PATTERN.test(segment))
  ) {
    return null;
  }
  return segments.join("/");
}

function buildCanonicalCacheKey(requestUrl: URL, key: string) {
  const url = new URL(requestUrl.origin);
  url.pathname = `/__nuang_feed_media_cache_v1__/${key}`;
  return new Request(url, { method: "GET" });
}

function decodeBase64Url(value: string) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(`${base64}=`);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function constantTimeEqual(expected: Uint8Array, supplied: Uint8Array) {
  let difference = expected.length ^ supplied.length;
  const maximumLength = Math.max(expected.length, supplied.length);
  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (expected[index] ?? 0) ^ (supplied[index] ?? 0);
  }
  return difference === 0;
}

function readDefaultCache(): CacheLike | null {
  const cacheStorage = globalThis.caches as CacheStorage & {
    default?: CacheLike;
  };
  return cacheStorage?.default ?? null;
}

function errorResponse(
  status: number,
  message: string,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(message, { headers, status });
}

const worker = {
  fetch(
    request: Request,
    environment: WorkerEnvironment,
    context: ExecutionContextLike,
  ) {
    return handleFeedMediaRequest(request, environment, context);
  },
};

export default worker;
