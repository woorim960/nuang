import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = resolve(root, "mobile");
const errors = [];

const [
  capacitor,
  androidVariables,
  androidManifest,
  iosProject,
  iosInfo,
  iosEntitlements,
  iosPrivacyManifest,
  iosPackages,
  mobilePackage,
  androidCapacitorSettings,
  androidCapacitorBuild,
  gradleWrapper,
  androidFilePaths,
  mobileIndex,
  androidNetworkSecurity,
  androidExtractionRules,
] = await Promise.all([
  readJson("capacitor.config.json"),
  read("android/variables.gradle"),
  read("android/app/src/main/AndroidManifest.xml"),
  read("ios/App/App.xcodeproj/project.pbxproj"),
  read("ios/App/App/Info.plist"),
  read("ios/App/App/App.entitlements"),
  read("ios/App/App/PrivacyInfo.xcprivacy"),
  read("ios/App/CapApp-SPM/Package.swift"),
  readJson("package.json"),
  read("android/capacitor.settings.gradle"),
  read("android/app/capacitor.build.gradle"),
  read("android/gradle/wrapper/gradle-wrapper.properties"),
  read("android/app/src/main/res/xml/file_paths.xml"),
  read("index.html"),
  read("android/app/src/main/res/xml/network_security_config.xml"),
  read("android/app/src/main/res/xml/data_extraction_rules.xml"),
]);

assert(
  capacitor.appId === "app.nuang.mobile",
  "Capacitor appId must stay stable",
);
assert(capacitor.appName === "뉴앙", "Capacitor appName must be 뉴앙");
assert(
  capacitor.webDir === "dist",
  "Capacitor must use the bundled dist directory",
);
assert(
  !("url" in (capacitor.server ?? {})),
  "production config must never use server.url",
);
assert(
  capacitor.server?.cleartext === false,
  "cleartext transport must be disabled",
);
assert(
  Array.isArray(capacitor.server?.allowNavigation) &&
    capacitor.server.allowNavigation.length === 0,
  "remote WebView navigation allowlist must remain empty until a reviewed requirement exists",
);

assert(
  /compileSdkVersion\s*=\s*36/.test(androidVariables),
  "Android compileSdkVersion must be 36",
);
assert(
  /targetSdkVersion\s*=\s*36/.test(androidVariables),
  "Android targetSdkVersion must be 36",
);
assert(
  /android:allowBackup="false"/.test(androidManifest),
  "Android backups must be disabled for local result and session protection",
);
assert(
  /android:usesCleartextTraffic="false"/.test(androidManifest),
  "Android cleartext traffic must be disabled",
);
assert(
  androidManifest.includes(
    'android:networkSecurityConfig="@xml/network_security_config"',
  ) &&
    androidNetworkSecurity.includes('cleartextTrafficPermitted="false"') &&
    androidNetworkSecurity.includes('certificates src="system"'),
  "Android must use the reviewed system-only TLS trust configuration",
);
assert(
  androidManifest.includes(
    'android:dataExtractionRules="@xml/data_extraction_rules"',
  ) &&
    androidExtractionRules.includes("<cloud-backup") &&
    androidExtractionRules.includes("<device-transfer>") &&
    (androidExtractionRules.match(/<exclude domain="root" path="\."/g) ?? [])
      .length === 2,
  "Android cloud backup and device transfer must exclude app-owned data",
);
assert(
  (androidManifest.match(/android:autoVerify="true"/g) ?? []).length === 9,
  "Android must verify all nine reviewed NUANG app-link destinations",
);
assert(
  !androidManifest.includes('android:pathPrefix="/auth/"') &&
    !androidManifest.includes('android:path="/auth/callback"'),
  "Android must not intercept web OAuth callbacks",
);
assert(
  /PRODUCT_BUNDLE_IDENTIFIER = app\.nuang\.mobile;/.test(iosProject),
  "iOS bundle identifier must stay stable",
);
assert(
  !/TARGETED_DEVICE_FAMILY = "1,2";/.test(iosProject) &&
    /TARGETED_DEVICE_FAMILY = 1;/.test(iosProject),
  "initial release must target iPhone only",
);
assert(
  !iosInfo.includes("UIInterfaceOrientationLandscape"),
  "initial iPhone release must remain portrait-only",
);
assert(
  iosInfo.includes("ITSAppUsesNonExemptEncryption"),
  "iOS export-compliance declaration must be explicit",
);
assert(
  iosProject.includes("CODE_SIGN_ENTITLEMENTS = App/App.entitlements;"),
  "iOS associated-domain entitlements must be attached to the target",
);
assert(
  iosEntitlements.includes("applinks:nuang.app") &&
    iosEntitlements.includes("webcredentials:nuang.app"),
  "iOS must declare the exact NUANG associated domains",
);
assert(
  iosEntitlements.includes("com.apple.developer.applesignin") &&
    iosEntitlements.includes("<string>Default</string>"),
  "iOS must declare the Sign in with Apple capability",
);
assert(
  iosProject.includes("com.apple.SignInWithApple") &&
    iosProject.includes("enabled = 1;"),
  "the Xcode target must enable Sign in with Apple",
);
assert(
  iosProject.includes("PrivacyInfo.xcprivacy in Resources") &&
    iosProject.includes("PrivacyInfo.xcprivacy */ = {isa = PBXFileReference"),
  "the iOS app privacy manifest must be attached to the app target",
);
assert(
  iosPrivacyManifest.includes("<key>NSPrivacyTracking</key>") &&
    iosPrivacyManifest.includes("<false/>") &&
    iosPrivacyManifest.includes("NSPrivacyCollectedDataTypeUserID") &&
    iosPrivacyManifest.includes(
      "NSPrivacyCollectedDataTypeOtherDiagnosticData",
    ) &&
    !iosPrivacyManifest.includes("NSPrivacyCollectedDataTypeDeviceID"),
  "the iOS privacy manifest must declare reviewed collection without device-ID over-disclosure",
);
assert(
  iosPackages.includes("AparajitaCapacitorSecureStorage"),
  "iOS must include the reviewed Keychain secure-storage plugin",
);
assert(
  typeof mobilePackage.dependencies?.["@aparajita/capacitor-secure-storage"] ===
    "string",
  "mobile package must declare the reviewed Keychain/Keystore secure-storage plugin",
);
assert(
  androidCapacitorSettings.includes(
    "include ':aparajita-capacitor-secure-storage'",
  ) &&
    androidCapacitorSettings.includes(
      "node_modules/@aparajita/capacitor-secure-storage/android",
    ) &&
    androidCapacitorBuild.includes(
      "implementation project(':aparajita-capacitor-secure-storage')",
    ),
  "Android Gradle source config must register the Keystore-backed secure-storage plugin",
);
assert(
  gradleWrapper.includes(
    "distributionSha256Sum=a3c4ba4aca8f0075688b9c5b18939fd28e8cb4357c227da5c1d9f38343791439",
  ),
  "Gradle 8.14.3 wrapper distribution checksum must remain pinned",
);
assert(
  !androidFilePaths.includes("<external-path") &&
    androidFilePaths.includes('<cache-path name="shared_cache" path="."'),
  "Android FileProvider must expose only the app cache, never external storage",
);
for (const directive of [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self' https://nuang.app https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
]) {
  assert(
    mobileIndex.includes(directive),
    `mobile Content Security Policy must contain: ${directive}`,
  );
}

await verifyPng(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  1024,
  1024,
);
await verifyPng(
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  192,
  192,
);
if (errors.length > 0) {
  console.error("NUANG mobile native config check failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("NUANG mobile native config check passed");
console.log("- local bundled webDir confirmed");
console.log("- iPhone identifier/orientation confirmed");
console.log("- Android API 36 and transport protections confirmed");
console.log("- iOS privacy manifest and Android backup protections confirmed");
console.log("- reviewed iOS and Android associated domains confirmed");
console.log("- Keychain/Keystore session plugin integration confirmed");
console.log("- canonical native icons confirmed");

async function read(path) {
  return readFile(resolve(mobileRoot, path), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

async function verifyPng(path, width, height) {
  try {
    const metadata = await sharp(resolve(mobileRoot, path)).metadata();
    assert(
      metadata.width === width && metadata.height === height,
      `${path} must be ${width}x${height}`,
    );
  } catch {
    errors.push(`${path} is missing or invalid`);
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}
