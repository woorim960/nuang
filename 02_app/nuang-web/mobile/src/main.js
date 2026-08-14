import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { createMobileAuth } from "./mobile-auth.js";
import { createMobileApiClient } from "./mobile-api-client.js";
import { installNativeAppLinks } from "./native-app-links.js";
import {
  mobileAuthStorage,
  mobileSupabase,
  mobileSupabaseConfigState,
} from "./supabase-client.js";
import "./style.css";

const serviceOrigin = "https://nuang.app";
const platform = Capacitor.getPlatform();
const native = Capacitor.isNativePlatform();
const mobileApi = mobileSupabase
  ? createMobileApiClient({ http: CapacitorHttp, supabase: mobileSupabase })
  : null;
const mobileAuth =
  mobileSupabase && mobileApi
    ? createMobileAuth({
        browser: Browser,
        finalizeAccount: (payload) =>
          mobileApi.request("/api/mobile/auth/finalize", {
            data: payload,
            method: "POST",
          }),
        storage: mobileAuthStorage,
        supabase: mobileSupabase,
      })
    : null;
let oauthInProgress = false;
let oauthCallbackCount = 0;
let oauthCancellationInProgress = false;

document.querySelector("#app").innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <span class="brand-mark">NUANG</span>
      <span class="build-chip">개발 검증용</span>
    </header>

    <section class="hero">
      <img
        alt="뉴앙 보라색 캐릭터"
        class="character"
        src="/assets/nuang-character-purple.webp"
      />
      <p class="eyebrow">iOS · Android foundation</p>
      <h1>뉴앙의 모바일 기반을<br />확인하고 있어요</h1>
      <p class="description">
        이 화면은 스토어에 제출하는 최종 앱이 아니라, 네이티브 공유·햅틱·네트워크와
        로컬 번들 구성을 검증하는 내부 전용 화면입니다.
      </p>
    </section>

    <section aria-labelledby="diagnostic-title" class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">기기 상태</p>
          <h2 id="diagnostic-title">연결 진단</h2>
        </div>
        <span class="status-dot" data-network-indicator></span>
      </div>
      <dl class="diagnostics">
        <div><dt>실행 환경</dt><dd>${escapeHtml(platform)}</dd></div>
        <div><dt>네이티브 셸</dt><dd>${native ? "연결됨" : "웹 미리보기"}</dd></div>
        <div><dt>네트워크</dt><dd data-network-label>확인 중</dd></div>
        <div><dt>운영 도메인</dt><dd>nuang.app</dd></div>
        <div><dt>보안 로그인 설정</dt><dd data-auth-label>${mobileSupabaseConfigState.ready ? "확인 중" : "환경 변수 필요"}</dd></div>
        <div><dt>최근 앱 링크</dt><dd data-app-link-label>없음</dd></div>
      </dl>
    </section>

    <section aria-labelledby="auth-title" class="panel">
      <p class="eyebrow">보안 로그인</p>
      <h2 id="auth-title">OAuth 복귀 확인</h2>
      <p class="panel-description">
        시스템 브라우저에서 로그인한 뒤 이 앱으로 돌아오며, 세션은 기기의 보안 저장소에만 보관합니다.
      </p>
      <fieldset class="consent-fieldset">
        <legend>로그인 전 동의 확인</legend>
        <label><input data-consent="is14OrOlder" type="checkbox" /> 만 14세 이상입니다 <strong>필수</strong></label>
        <label><input data-consent="terms" type="checkbox" /> 이용약관에 동의합니다 <strong>필수</strong></label>
        <label><input data-consent="privacy" type="checkbox" /> 개인정보 처리에 동의합니다 <strong>필수</strong></label>
        <label><input data-consent="analytics" type="checkbox" /> 서비스 개선 분석에 동의합니다 <span>선택</span></label>
        <label><input data-consent="marketing" type="checkbox" /> 소식·혜택 수신에 동의합니다 <span>선택</span></label>
      </fieldset>
      <div class="action-list">
        <button data-provider="google" type="button">Google 로그인 확인</button>
        <button data-provider="kakao" type="button">카카오 로그인 확인</button>
        <button data-action="api-session" type="button">계정 API 연결 확인</button>
        <button class="secondary-action" data-action="sign-out" type="button">이 기기에서 로그아웃</button>
      </div>
      <p class="auth-notice">
        Apple 로그인은 서버 provider registry와 DB 마이그레이션이 별도로 완료될 때까지 하드 비활성화합니다. 이 화면은 출시 전 실기기 QA 전용입니다.
      </p>
    </section>

    <section aria-labelledby="bridge-title" class="panel">
      <p class="eyebrow">네이티브 브리지</p>
      <h2 id="bridge-title">기본 동작 확인</h2>
      <div class="action-list">
        <button data-action="share" type="button">시스템 공유 확인</button>
        <button data-action="haptic" type="button">선택 피드백 확인</button>
        <button data-action="browser" type="button">운영 웹 열기</button>
      </div>
      <p aria-live="polite" class="result" data-result>
        각 항목은 실제 기기에서 한 번씩 확인합니다.
      </p>
    </section>

    <footer>
      <strong>출시 차단 상태</strong>
      <p>전체 뉴앙 화면 이관과 OAuth·딥링크 검증 전에는 스토어 제출 빌드를 만들지 않습니다.</p>
    </footer>
  </div>
`;

const result = document.querySelector("[data-result]");

document.querySelectorAll("[data-provider]").forEach((button) => {
  if (!mobileAuth) button.disabled = true;
  button.addEventListener("click", async () => {
    if (!mobileAuth || oauthInProgress) {
      setResult("운영 Supabase 공개 설정을 먼저 연결해 주세요.");
      return;
    }
    oauthInProgress = true;
    setResult("안전한 로그인 화면을 열고 있어요.");
    let opened = false;
    try {
      const response = await mobileAuth.startOAuth(
        button.dataset.provider,
        "/home",
        readConsent(),
      );
      opened = response.ok;
      if (!response.ok) setResult(readableOAuthError(response.error));
    } catch {
      setResult(readableOAuthError("oauth_start_failed"));
    } finally {
      if (!opened) oauthInProgress = false;
    }
  });
});

document
  .querySelector("[data-action='sign-out']")
  ?.addEventListener("click", async () => {
    if (!mobileAuth) {
      setResult("로그인 설정이 연결되지 않았어요.");
      return;
    }
    const response = await mobileAuth.signOut();
    if (response.ok) {
      setAuthLabel("로그아웃됨");
      setResult("이 기기의 보안 세션을 삭제했어요.");
    } else {
      setResult("로그아웃을 마치지 못했어요. 다시 시도해 주세요.");
    }
  });

document
  .querySelector("[data-action='api-session']")
  ?.addEventListener("click", async () => {
    if (!mobileApi) {
      setResult("운영 Supabase 공개 설정을 먼저 연결해 주세요.");
      return;
    }
    setResult("보안 세션으로 계정 API를 확인하고 있어요.");
    const response = await mobileApi.request("/api/account-results");
    setResult(
      response.ok
        ? "보안 세션과 계정 API가 정상 연결됐어요."
        : response.error === "unauthenticated"
          ? "로그인한 뒤 계정 API를 확인해 주세요."
          : `계정 API를 확인하지 못했어요. (${response.error})`,
    );
  });

document
  .querySelector("[data-action='share']")
  ?.addEventListener("click", async () => {
    try {
      await Share.share({
        dialogTitle: "뉴앙 공유 기능 확인",
        text: "성향으로 나와 우리를 발견하는 곳, 뉴앙",
        title: "뉴앙",
        url: serviceOrigin,
      });
      setResult("시스템 공유 화면을 열었어요.");
    } catch (error) {
      setResult(readableError(error, "공유 화면을 열지 못했어요."));
    }
  });

document
  .querySelector("[data-action='haptic']")
  ?.addEventListener("click", async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      setResult(
        native
          ? "가벼운 선택 피드백을 보냈어요."
          : "실제 기기에서 햅틱을 확인해 주세요.",
      );
    } catch (error) {
      setResult(readableError(error, "햅틱을 확인하지 못했어요."));
    }
  });

document
  .querySelector("[data-action='browser']")
  ?.addEventListener("click", async () => {
    try {
      await Browser.open({
        presentationStyle: "popover",
        url: `${serviceOrigin}/home`,
      });
      setResult("운영 웹을 안전한 외부 브라우저로 열었어요.");
    } catch (error) {
      setResult(readableError(error, "운영 웹을 열지 못했어요."));
    }
  });

void updateNetworkStatus().catch(() => setNetworkUnavailable());
void updateAuthStatus().catch(() => setAuthLabel("확인 실패"));
void Network.addListener("networkStatusChange", (status) => {
  void updateNetworkStatus(status).catch(() => setNetworkUnavailable());
}).catch(() => setNetworkUnavailable());
void installNativeAppLinks({
  onNavigate: ({ path, source }) => {
    const label = document.querySelector("[data-app-link-label]");
    if (label) label.textContent = path;
    setResult(
      source === "cold_start"
        ? "앱 링크로 시작한 경로를 안전하게 확인했어요."
        : "실행 중인 앱으로 전달된 경로를 안전하게 확인했어요.",
    );
  },
  onOAuthCallback: async ({ code, error, status }) => {
    const label = document.querySelector("[data-app-link-label]");
    if (label) label.textContent = "/mobile/auth/callback";
    oauthInProgress = true;
    oauthCallbackCount += 1;
    try {
      if (!mobileAuth) {
        setResult(
          "로그인 복귀 주소는 맞지만 운영 로그인 설정이 연결되지 않았어요.",
        );
        return;
      }

      const response =
        status === "code"
          ? await mobileAuth.completeOAuth(code)
          : await mobileAuth.cancelOAuth(error);
      if (response.ok) {
        setAuthLabel("로그인됨");
        setResult(
          `로그인 완료 · ${response.returnPath} 화면으로 안전하게 복귀합니다.`,
        );
      } else {
        setResult(readableOAuthError(response.error));
      }
    } catch {
      setResult(readableOAuthError("oauth_completion_failed"));
    } finally {
      oauthCallbackCount -= 1;
      if (oauthCallbackCount === 0 && !oauthCancellationInProgress) {
        oauthInProgress = false;
      }
    }
  },
}).catch(() => setResult("앱 링크 연결을 초기화하지 못했어요."));

void Browser.addListener("browserFinished", () => {
  void handleBrowserFinished().catch(() => {
    oauthCancellationInProgress = false;
    if (oauthCallbackCount === 0) oauthInProgress = false;
    setResult(readableOAuthError("oauth_completion_failed"));
  });
}).catch(() => setResult("로그인 브라우저 연결을 초기화하지 못했어요."));

async function handleBrowserFinished() {
  if (
    !oauthInProgress ||
    !mobileAuth ||
    oauthCallbackCount > 0 ||
    oauthCancellationInProgress
  ) {
    return;
  }
  oauthCancellationInProgress = true;
  try {
    await mobileAuth.cancelOAuth();
    setResult("로그인을 취소했어요. 앱에 저장된 결과는 그대로 유지됩니다.");
  } catch {
    setResult(readableOAuthError("oauth_completion_failed"));
  } finally {
    oauthCancellationInProgress = false;
    if (oauthCallbackCount === 0) oauthInProgress = false;
  }
}

async function updateNetworkStatus(nextStatus) {
  const status = nextStatus ?? (await Network.getStatus());
  const label = document.querySelector("[data-network-label]");
  const indicator = document.querySelector("[data-network-indicator]");
  if (label)
    label.textContent = status.connected ? status.connectionType : "오프라인";
  indicator?.classList.toggle("is-offline", !status.connected);
}

async function updateAuthStatus() {
  if (!mobileSupabase) return;
  const { data, error } = await mobileSupabase.auth.getSession();
  setAuthLabel(error ? "확인 실패" : data.session ? "로그인됨" : "로그아웃됨");
}

function setAuthLabel(message) {
  const label = document.querySelector("[data-auth-label]");
  if (label) label.textContent = message;
}

function setNetworkUnavailable() {
  const label = document.querySelector("[data-network-label]");
  const indicator = document.querySelector("[data-network-indicator]");
  if (label) label.textContent = "확인 실패";
  indicator?.classList.add("is-offline");
}

function readConsent() {
  const checked = (name) =>
    document.querySelector(`[data-consent='${name}']`)?.checked === true;
  return {
    analytics: checked("analytics"),
    is14OrOlder: checked("is14OrOlder"),
    marketing: checked("marketing"),
    privacy: checked("privacy"),
    terms: checked("terms"),
  };
}

function setResult(message) {
  if (result) result.textContent = message;
}

function readableError(error, fallback) {
  if (error instanceof Error && error.message)
    return `${fallback} (${error.message})`;
  return fallback;
}

function readableOAuthError(error) {
  const messages = {
    account_setup_failed:
      "필수 동의와 계정 연결을 완료하지 못해 새 세션을 삭제했어요.",
    access_denied: "로그인을 취소했어요. 기존 앱 데이터는 그대로 유지됩니다.",
    browser_open_failed:
      "로그인 화면을 열지 못했어요. 잠시 후 다시 시도해 주세요.",
    cancelled: "로그인을 취소했어요. 기존 앱 데이터는 그대로 유지됩니다.",
    consent_required:
      "만 14세 이상·이용약관·개인정보 필수 동의를 먼저 확인해 주세요.",
    exchange_failed: "로그인 확인을 마치지 못했어요. 다시 로그인해 주세요.",
    missing_code: "로그인 제공자에게서 완료 코드를 받지 못했어요.",
    missing_intent: "만료되었거나 이 앱에서 시작하지 않은 로그인 요청이에요.",
    oauth_busy:
      "이미 다른 로그인 복귀를 처리하고 있어요. 잠시 후 다시 시도해 주세요.",
    oauth_cancel_failed:
      "로그인 요청을 안전하게 취소하지 못했어요. 다시 시도해 주세요.",
    oauth_completion_failed:
      "로그인 복귀 처리 중 오류가 발생했어요. 다시 로그인해 주세요.",
    oauth_start_failed:
      "로그인을 시작하지 못했어요. 연결 상태를 확인해 주세요.",
  };
  return messages[error] ?? "로그인을 마치지 못했어요. 다시 시도해 주세요.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
