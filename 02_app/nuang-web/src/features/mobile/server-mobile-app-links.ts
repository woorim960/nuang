const appleAppIdPattern = /^[A-Z0-9]{10}\.app\.nuang\.mobile$/;
const androidFingerprintPattern = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;

type MobileAppLinkEnv = {
  NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS?: string;
  NUANG_APPLE_APP_ID?: string;
};

export const mobileAppLinkPaths = [
  "/home",
  "/mobile/auth/callback",
  "/share/*",
  "/assessments",
  "/assessments/*",
  "/labs",
  "/labs/*",
  "/results/*",
  "/feed",
  "/feed/*",
  "/my",
  "/my/*",
  "/map",
  "/map/*",
] as const;

export function createAppleAppSiteAssociation(
  env: MobileAppLinkEnv = process.env as MobileAppLinkEnv,
) {
  const appId = env.NUANG_APPLE_APP_ID?.trim();
  if (!appId || !appleAppIdPattern.test(appId)) return null;

  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: mobileAppLinkPaths.map((path) => ({
            "/": path,
            comment: "Open a public or account-owned NUANG app destination.",
          })),
        },
      ],
    },
    webcredentials: {
      apps: [appId],
    },
  };
}

export function createAndroidAssetLinks(
  env: MobileAppLinkEnv = process.env as MobileAppLinkEnv,
) {
  const fingerprints = normalizeAndroidFingerprints(
    env.NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS,
  );
  if (fingerprints.length === 0) return null;

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "app.nuang.mobile",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

export function normalizeAndroidFingerprints(value: string | undefined) {
  if (!value) return [];

  const fingerprints = value
    .split(",")
    .map((candidate) =>
      candidate
        .trim()
        .toUpperCase()
        .replace(/[^A-F0-9]/g, "")
        .match(/.{1,2}/g)
        ?.join(":"),
    )
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter((candidate) => androidFingerprintPattern.test(candidate));

  return [...new Set(fingerprints)].sort();
}

export function appLinkResponse(payload: unknown) {
  if (!payload) {
    return Response.json(
      {
        code: "mobile_app_link_not_configured",
        ok: false,
      },
      {
        headers: { "cache-control": "no-store" },
        status: 404,
      },
    );
  }

  return Response.json(payload, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
      "content-type": "application/json",
      "x-content-type-options": "nosniff",
    },
  });
}
