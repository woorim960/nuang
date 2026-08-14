const callbackUrl = "https://nuang.app/mobile/auth/callback";
const intentKey = "nuang.pending-oauth-intent.v1";
const intentLifetimeMs = 10 * 60 * 1000;
const providers = new Set(["google", "kakao"]);

export function createMobileAuth({
  browser,
  clock = () => Date.now(),
  finalizeAccount,
  storage,
  supabase,
}) {
  let completionInFlight = null;
  let flowActive = false;
  let operationInFlight = null;

  return {
    async cancelOAuth(error = "cancelled") {
      if (completionInFlight || operationInFlight) {
        return { error: "oauth_busy", ok: false };
      }
      operationInFlight = "cancel";
      try {
        await storage.removeItem(intentKey);
        flowActive = false;
        await browser.close().catch(() => undefined);
        return { error: normalizeOAuthError(error), ok: false };
      } catch {
        return { error: "oauth_cancel_failed", ok: false };
      } finally {
        operationInFlight = null;
      }
    },

    completeOAuth(code) {
      const normalizedCode = typeof code === "string" ? code.trim() : "";
      if (completionInFlight) {
        return completionInFlight.code === normalizedCode && normalizedCode
          ? completionInFlight.promise
          : Promise.resolve({ error: "oauth_busy", ok: false });
      }
      if (operationInFlight) {
        return Promise.resolve({ error: "oauth_busy", ok: false });
      }

      flowActive = true;
      const promise = completeOAuthOnce(normalizedCode)
        .catch(() => ({ error: "oauth_completion_failed", ok: false }))
        .finally(() => {
          completionInFlight = null;
          flowActive = false;
        });
      completionInFlight = { code: normalizedCode, promise };
      return promise;
    },

    async signOut() {
      if (completionInFlight || operationInFlight) {
        return { error: "oauth_busy", ok: false };
      }
      operationInFlight = "sign_out";
      try {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) return { error: "sign_out_failed", ok: false };
        await storage.clear();
        flowActive = false;
        return { ok: true };
      } catch {
        return { error: "sign_out_failed", ok: false };
      } finally {
        operationInFlight = null;
      }
    },

    async startOAuth(provider, returnPath = "/home", consent) {
      if (!providers.has(provider)) {
        return { error: "provider_not_allowed", ok: false };
      }
      const safeReturnPath = normalizeReturnPath(returnPath);
      if (!safeReturnPath) {
        return { error: "return_path_not_allowed", ok: false };
      }
      if (!isValidConsent(consent)) {
        return { error: "consent_required", ok: false };
      }
      if (completionInFlight || operationInFlight || flowActive) {
        return { error: "oauth_busy", ok: false };
      }

      operationInFlight = "start";
      try {
        if (await readActiveIntent(storage, clock())) {
          flowActive = true;
          return { error: "oauth_busy", ok: false };
        }
        await storage.setItem(
          intentKey,
          JSON.stringify({
            createdAt: clock(),
            consent,
            provider,
            returnPath: safeReturnPath,
          }),
        );
        flowActive = true;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: callbackUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error || !data.url) {
          await clearPendingIntent();
          return { error: "oauth_start_failed", ok: false };
        }

        try {
          await browser.open({ presentationStyle: "popover", url: data.url });
        } catch {
          await clearPendingIntent();
          return { error: "browser_open_failed", ok: false };
        }
        return { ok: true };
      } catch {
        await clearPendingIntent();
        return { error: "oauth_start_failed", ok: false };
      } finally {
        operationInFlight = null;
      }
    },
  };

  async function clearPendingIntent() {
    await storage.removeItem(intentKey).catch(() => undefined);
    flowActive = false;
  }

  async function completeOAuthOnce(code) {
    try {
      const intent = await readActiveIntent(storage, clock());
      await storage.removeItem(intentKey);

      if (!intent) {
        return { error: "missing_intent", ok: false };
      }
      if (!code) {
        return { error: "missing_code", ok: false };
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        return { error: "exchange_failed", ok: false };
      }

      const finalized = await finalizeAccount({
        consent: intent.consent,
        provider: intent.provider,
      }).catch(() => ({ error: "network_error", ok: false }));
      if (!finalized.ok) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        await storage.clear().catch(() => undefined);
        return { error: "account_setup_failed", ok: false };
      }

      return {
        accountId: finalized.data?.accountId ?? null,
        ok: true,
        returnPath: intent.returnPath,
      };
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
}

function isValidConsent(value) {
  return Boolean(
    value &&
    value.is14OrOlder === true &&
    value.privacy === true &&
    value.terms === true &&
    typeof value.analytics === "boolean" &&
    typeof value.marketing === "boolean",
  );
}

export function normalizeReturnPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }
  try {
    const url = new URL(value, "https://nuang.app");
    if (url.origin !== "https://nuang.app") return null;
    const exactPaths = new Set([
      "/home",
      "/assessments",
      "/feed",
      "/labs",
      "/map",
      "/my",
    ]);
    if (exactPaths.has(url.pathname)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    const prefixes = [
      "/assessments/",
      "/feed/",
      "/labs/",
      "/map/",
      "/my/",
      "/results/",
      "/share/",
    ];
    return prefixes.some((prefix) => url.pathname.startsWith(prefix))
      ? `${url.pathname}${url.search}${url.hash}`
      : null;
  } catch {
    return null;
  }
}

async function readActiveIntent(storage, now) {
  const raw = await storage.getItem(intentKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !providers.has(value.provider) ||
      !isValidConsent(value.consent) ||
      !normalizeReturnPath(value.returnPath) ||
      !Number.isSafeInteger(value.createdAt) ||
      value.createdAt > now ||
      now - value.createdAt > intentLifetimeMs
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function normalizeOAuthError(value) {
  return value === "access_denied" ? "access_denied" : "cancelled";
}
