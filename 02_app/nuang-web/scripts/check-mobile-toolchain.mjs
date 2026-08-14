import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const failures = [];

const xcode = run("xcodebuild", ["-version"]);
const xcodeMatch = xcode.output.match(/Xcode\s+(\d+)(?:\.(\d+))?/);
const xcodeMajor = xcodeMatch ? Number(xcodeMatch[1]) : null;
if (!xcode.ok || xcodeMajor === null) {
  failures.push("Xcode를 찾을 수 없습니다.");
} else if (xcodeMajor < 26) {
  failures.push(`Xcode 26 이상이 필요하지만 현재 ${xcodeMatch[0]}입니다.`);
}

const androidStudioPath = "/Applications/Android Studio.app";
const androidStudio = run("/usr/libexec/PlistBuddy", [
  "-c",
  "Print:CFBundleShortVersionString",
  `${androidStudioPath}/Contents/Info.plist`,
]);
if (!androidStudio.ok) {
  failures.push("Android Studio 2025.2.1 이상이 없습니다.");
} else if (!isMinimumAndroidStudio(androidStudio.output, [2025, 2, 1])) {
  failures.push(
    `Android Studio 2025.2.1 이상이 필요하지만 현재 ${firstLine(androidStudio.output)}입니다.`,
  );
}

const javaCandidates = [
  process.env.JAVA_HOME?.trim(),
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
  `${androidStudioPath}/Contents/jbr/Contents/Home`,
].filter(Boolean);
const javaHome = javaCandidates.find((candidate) =>
  existsSync(resolve(candidate, "bin/java")),
);
const java = javaHome
  ? run(resolve(javaHome, "bin/java"), ["-version"])
  : run("java", ["-version"]);
const javaMajor = parseJavaMajor(java.output);
if (!java.ok || javaMajor === null) {
  failures.push("Android 빌드용 Java Runtime이 없습니다.");
} else if (javaMajor < 17 || javaMajor > 24) {
  failures.push(
    `Android 빌드에는 JDK 17~24가 필요하지만 현재 Java ${javaMajor}입니다. JDK 21을 권장합니다.`,
  );
}

const androidSdkCandidates = [
  process.env.ANDROID_HOME?.trim(),
  process.env.ANDROID_SDK_ROOT?.trim(),
  resolve(homedir(), "Library/Android/sdk"),
  "/opt/homebrew/share/android-commandlinetools",
].filter(Boolean);
const androidSdkRoot =
  androidSdkCandidates.find((candidate) =>
    existsSync(resolve(candidate, "platforms/android-36/android.jar")),
  ) ?? androidSdkCandidates[0];
const adbPath = resolve(androidSdkRoot, "platform-tools/adb");
const adb = existsSync(adbPath) ? run(adbPath, ["version"]) : run("adb", ["version"]);
if (!adb.ok) failures.push("Android SDK Platform Tools(adb)가 없습니다.");
if (!existsSync(resolve(androidSdkRoot, "platforms/android-36/android.jar"))) {
  failures.push("Android SDK Platform 36이 없습니다.");
}
if (!existsSync(resolve(androidSdkRoot, "build-tools/36.0.0/aapt2"))) {
  failures.push("Android SDK Build Tools 36.0.0이 없습니다.");
}
if (!existsSync(resolve(androidSdkRoot, "licenses/android-sdk-license"))) {
  failures.push("Google Android SDK 약관이 계정 소유자에 의해 수락되지 않았습니다.");
}

if (failures.length > 0) {
  console.error("NUANG mobile toolchain check blocked");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("- 설치와 법적 약관 동의를 완료한 뒤 다시 실행하세요.");
  process.exit(1);
}

console.log("NUANG mobile toolchain check passed");
console.log(`- ${xcodeMatch[0]}`);
console.log(`- Android Studio ${firstLine(androidStudio.output)}`);
console.log(`- ${firstLine(java.output)}`);
console.log(`- ${firstLine(adb.output)}`);
console.log(`- Android SDK ${androidSdkRoot}`);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

function firstLine(value) {
  return value.split(/\r?\n/).find(Boolean) ?? "확인됨";
}

function parseJavaMajor(value) {
  const match = value.match(/version\s+"(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  const first = Number(match[1]);
  return first === 1 ? Number(match[2] ?? 0) : first;
}

function isMinimumAndroidStudio(value, minimum) {
  const match = value.match(/(\d{4})\.(\d+)(?:\.(\d+))?/);
  if (!match) return false;
  const current = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  for (let index = 0; index < minimum.length; index += 1) {
    if (current[index] > minimum[index]) return true;
    if (current[index] < minimum[index]) return false;
  }
  return true;
}
