const apiOrigin = "https://nuang.app";
const allowedMethods = new Set(["DELETE", "GET", "PATCH", "POST", "PUT"]);
const allowedApiPaths = new Set([
  "/api/account",
  "/api/account-results",
  "/api/assessment-progress",
  "/api/assessment-quality-observations",
  "/api/claim-result",
  "/api/core-result-feedback",
  "/api/feed",
  "/api/free-topic-results",
  "/api/guest-report-share-links",
  "/api/lab-results",
  "/api/profile-report-visibility",
  "/api/profile-visibility",
  "/api/public-comparison-report",
  "/api/public-comparisons",
  "/api/report-share-links",
  "/api/revoke-share",
  "/api/share-links",
]);
const allowedApiPrefixes = [
  "/api/advertising/",
  "/api/analytics/",
  "/api/community/",
  "/api/me/",
  "/api/mobile/auth/",
  "/api/together/balance-game/",
];

export function createMobileApiClient({ http, supabase }) {
  let refreshInFlight = null;

  async function getAuthSession(refresh = false) {
    if (refresh) {
      refreshInFlight ??= supabase.auth.refreshSession().finally(() => {
        refreshInFlight = null;
      });
      const { data, error } = await refreshInFlight;
      return error ? null : normalizeAuthSession(data.session);
    }
    const { data, error } = await supabase.auth.getSession();
    return error ? null : normalizeAuthSession(data.session);
  }

  async function request(path, options = {}) {
    const url = normalizeApiUrl(path);
    if (!url) return { error: "path_not_allowed", ok: false, status: 0 };

    const method = String(options.method ?? "GET").toUpperCase();
    if (!allowedMethods.has(method)) {
      return { error: "method_not_allowed", ok: false, status: 0 };
    }

    const authenticated = options.authenticated !== false;
    let authSession = authenticated ? await getAuthSession() : null;
    if (authenticated && !authSession?.accessToken) {
      return { error: "unauthenticated", ok: false, status: 401 };
    }
    const requiresAccountResultScope =
      authenticated && new URL(url).pathname === "/api/account-results";
    if (requiresAccountResultScope && !authSession?.userId) {
      return { error: "unauthenticated", ok: false, status: 401 };
    }

    const execute = (session) =>
      http.request({
        connectTimeout: 8_000,
        data: options.data,
        disableRedirects: true,
        headers: {
          Accept: "application/json",
          ...(options.data === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
          ...(requiresAccountResultScope
            ? { "X-Nuang-Auth-User-Id": session.userId }
            : {}),
          "X-Nuang-Client": "app.nuang.mobile",
          "X-Nuang-Client-Version": "1",
        },
        method,
        readTimeout: 15_000,
        responseType: "json",
        url,
      });

    let response;
    try {
      response = await execute(authSession);
      if (authenticated && response.status === 401) {
        const refreshedSession = await getAuthSession(true);
        if (
          refreshedSession?.accessToken &&
          refreshedSession.accessToken !== authSession?.accessToken &&
          (!requiresAccountResultScope || refreshedSession.userId)
        ) {
          authSession = refreshedSession;
          response = await execute(authSession);
        }
      }
    } catch {
      return { error: "network_error", ok: false, status: 0 };
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        data: response.data ?? null,
        error: mapHttpError(response.status),
        ok: false,
        status: response.status,
      };
    }

    if (requiresAccountResultScope) {
      const responseUserId = response.data?.authUserId;
      const currentAuthSession = await getAuthSession();
      if (
        !authSession?.userId ||
        responseUserId !== authSession.userId ||
        currentAuthSession?.userId !== authSession.userId
      ) {
        return { data: null, error: "conflict", ok: false, status: 409 };
      }
    }

    return { data: response.data ?? null, ok: true, status: response.status };
  }

  return { request };
}

function normalizeAuthSession(session) {
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    userId: session.user?.id ?? null,
  };
}

export function normalizeApiUrl(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/api/") ||
    value.startsWith("//")
  ) {
    return null;
  }
  try {
    const url = new URL(value, apiOrigin);
    if (
      url.origin !== apiOrigin ||
      url.hash ||
      (!allowedApiPaths.has(url.pathname) &&
        !allowedApiPrefixes.some((prefix) => url.pathname.startsWith(prefix)))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function mapHttpError(status) {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status === 429) return "rate_limited";
  return status >= 500 ? "server_error" : "request_failed";
}
