# 뉴앙 Apple 로그인 운영 설정 가이드

기준일: 2026-08-11<br>
Bundle ID: `app.nuang.mobile`<br>
운영 도메인: `nuang.app`

이 문서는 Apple·Supabase 계정 소유자가 포털에서 해야 하는 클릭 작업과, 완료 후 개발자가 검증할 항목을 분리한다. 키 파일·비밀키·OTP는 저장소나 채팅에 올리지 않는다.

## 왜 출시 전에 필요한가

iOS 앱에서 Google·Kakao 같은 제3자 계정으로 주 계정을 인증하면 Apple App Review Guideline 4.8에 맞는 동등한 로그인 선택지를 제공해야 한다. 뉴앙은 Apple 버튼을 코드와 Xcode capability에 준비했지만, Apple이 발급하는 식별자와 키가 없으면 운영 로그인을 활성화할 수 없다.

## 1. Apple Developer 계정 소유자가 하는 일

### A. App ID 확인

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers로 이동한다.
2. App IDs에서 `app.nuang.mobile`을 등록하거나 연다.
3. `Sign in with Apple` capability를 켠다.
4. 변경 사항을 저장한다.

완료 증빙: App ID 상세 화면에서 Bundle ID와 Sign in with Apple 활성 상태만 캡처한다. 인증서·키 값은 캡처하지 않는다.

### B. Services ID 만들기

1. Identifiers → `Services IDs` → `+`를 선택한다.
2. 설명은 `NUANG Web Sign In`, 식별자는 충돌하지 않는 값(권장: `app.nuang.web`)을 입력한다.
3. `Sign in with Apple`을 활성화하고 Primary App ID로 `app.nuang.mobile`을 연결한다.
4. 웹 도메인에는 `nuang.app`을 입력한다.
5. Return URL에는 Supabase Dashboard가 안내하는 정확한 callback URL을 입력한다. 일반 형식은 `https://<project-ref>.supabase.co/auth/v1/callback`이다.
6. 저장한 뒤 Services ID 값을 별도 비밀이 아닌 운영 설정 기록에 남긴다.

주의: Return URL을 추측해 입력하지 않는다. Supabase Authentication → Providers → Apple 화면에 표시된 callback URL을 그대로 복사한다.

### C. Sign in with Apple 키 만들기

1. Keys → `+`에서 용도를 알아볼 수 있는 이름(예: `NUANG Sign in with Apple`)을 입력한다.
2. `Sign in with Apple`을 켜고 Primary App ID를 연결한다.
3. 등록 후 `.p8` 파일을 한 번만 내려받는다.
4. Key ID와 Team ID를 기록한다.
5. `.p8` 파일은 암호화된 비밀 저장소에 보관하고 저장소·문서·메신저에 첨부하지 않는다.

키를 분실하면 재다운로드할 수 없다. 새 키를 만든 뒤 기존 키를 폐기해야 한다.

## 2. Supabase에서 하는 일

1. 운영 프로젝트 → Authentication → Providers → Apple을 연다.
2. Apple provider를 활성화한다.
3. Services ID, Team ID, Key ID, Private Key를 정확히 입력한다.
4. Redirect URL allowlist에 다음 운영 경로를 등록한다.
   - `https://nuang.app/auth/callback`
   - `https://nuang.app/mobile/auth/callback`
5. 저장 후 시크릿 값이 화면·로그에 다시 노출되지 않는지 확인한다.

OAuth용 Apple client secret은 만료 관리가 필요하다. Supabase 대시보드가 직접 생성·회전 방식을 안내하면 그 방식을 우선하고, 직접 생성하는 경우 만료일 30일 전에 운영 일정에 등록한다. 최대 만료 기간만 믿고 방치하지 않는다.

## 3. 배포 환경에서 하는 일

다음 값을 Vercel Production 환경 변수에 설정한다.

```text
NEXT_PUBLIC_APPLE_AUTH_ENABLED=true
NUANG_APPLE_APP_ID=<10자리 Team ID>.app.nuang.mobile
```

`NUANG_APPLE_APP_ID`는 Universal Links용 값이다. Services ID나 Key ID를 넣지 않는다. Apple private key는 Vercel 일반 환경 변수에 중복 저장하지 않고 Supabase provider secret으로만 관리한다.

## 4. 개발자가 확인하는 자동 검사

```bash
npm run mobile:config:check
npm run mobile:submission:check
```

계정 소유자가 설정을 마친 뒤 `config/mobile-store-profile.json`의 아래 항목은 실제 증빙을 확인하고 하나씩 `true`로 바꾼다.

- `appleDeveloperAccountEnrolled`
- `appleSignInAppIdConfigured`
- `appleSignInServicesIdConfigured`
- `appleSignInKeyConfigured`
- `appleSignInSupabaseProviderVerified`
- `iosAssociatedDomainTeamIdConfigured`

## 5. 실기기 합격 기준

Google·Kakao·Apple 각각 아래 동작을 iPhone에서 확인한다.

1. 비회원 결과 리포트에서 `로그인하고 결과 저장` 선택
2. 시스템 브라우저에서 로그인
3. 정확히 같은 결과 리포트로 복귀
4. 서버 저장 완료 상태 확인
5. 앱 강제 종료·재실행 후 로그인 유지
6. 다른 iPhone 또는 새 브라우저에서 같은 계정으로 기록 복원
7. 로그인 취소·네트워크 실패 시 기존 로컬 결과가 사라지지 않음
8. 계정 연결 해제·회원 탈퇴 후 재가입 가능

Apple의 이메일 가리기를 선택해도 가입·문의 안내·계정 삭제가 정상 동작해야 한다. 이 검증까지 통과한 뒤 `appleSignInLiveVerified`를 `true`로 바꾼다.

## 6. 공식 문서

- Apple App Review Guidelines 4.8: https://developer.apple.com/app-store/review/guidelines/
- Sign in with Apple: https://developer.apple.com/documentation/SigninwithApple
- Supabase Apple 로그인: https://supabase.com/docs/guides/auth/social-login/auth-apple
