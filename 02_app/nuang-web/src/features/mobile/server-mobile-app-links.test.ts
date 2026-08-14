import { describe, expect, it } from "vitest";
import {
  createAndroidAssetLinks,
  createAppleAppSiteAssociation,
  mobileAppLinkPaths,
  normalizeAndroidFingerprints,
} from "@/features/mobile/server-mobile-app-links";

const fingerprint = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
).join(":");

describe("mobile app association contracts", () => {
  it("fails closed until the verified Apple application identifier exists", () => {
    expect(createAppleAppSiteAssociation({})).toBeNull();
    expect(
      createAppleAppSiteAssociation({
        NUANG_APPLE_APP_ID: "INVALID.app.nuang.mobile",
      }),
    ).toBeNull();
  });

  it("publishes only reviewed application paths and never intercepts OAuth callbacks", () => {
    const payload = createAppleAppSiteAssociation({
      NUANG_APPLE_APP_ID: "ABCDE12345.app.nuang.mobile",
    });

    expect(payload?.applinks.details[0].appIDs).toEqual([
      "ABCDE12345.app.nuang.mobile",
    ]);
    expect(
      payload?.applinks.details[0].components.map((component) => component["/"]),
    ).toEqual(mobileAppLinkPaths);
    expect(mobileAppLinkPaths).not.toContain("/auth/*");
    expect(mobileAppLinkPaths).toContain("/mobile/auth/callback");
    expect(mobileAppLinkPaths).toEqual(
      expect.arrayContaining(["/assessments", "/labs", "/feed", "/my", "/map"]),
    );
  });

  it("normalizes, de-duplicates, and validates Android SHA-256 fingerprints", () => {
    expect(
      normalizeAndroidFingerprints(
        `${fingerprint.toLowerCase()},${fingerprint},invalid`,
      ),
    ).toEqual([fingerprint.toUpperCase()]);
    expect(normalizeAndroidFingerprints("AA:BB")).toEqual([]);
  });

  it("binds Android links to the immutable production package", () => {
    expect(
      createAndroidAssetLinks({
        NUANG_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS: fingerprint,
      }),
    ).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "app.nuang.mobile",
          sha256_cert_fingerprints: [fingerprint.toUpperCase()],
        },
      },
    ]);
  });
});
