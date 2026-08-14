# 뉴앙 모바일 출시 준비 상태

기준일: 2026-08-11<br>
판정: **제출 자료 기반 통과 / 스토어 제출 불가**

현재 단계는 “스토어 계정을 만들면 곧바로 제출할 수 있는 완성 앱”이 아니다. 네이티브 프로젝트, 심사 자료, 정책·지원 URL, 로그인·앱링크 계약과 자동 검사는 준비됐지만 `mobile/` 화면은 아직 브리지 검증용이다. 웹 서비스의 P0 제품 흐름을 로컬 모바일 번들에 이관하기 전에는 제출하지 않는다.

## 자동 검증 완료

- `app.nuang.mobile` iOS·Android 프로젝트 생성
- 로컬 번들, cleartext 차단, 외부 WebView allowlist 차단
- iPhone 전용·세로 화면·iOS 15 이상
- Android min 24, compile/target 36, 백업 차단
- iOS 앱 자체 Privacy Manifest 번들 포함과 Android 클라우드 백업·기기 이전 차단
- iOS Sign in with Apple capability와 provider/DB 계약
- Universal Links·Android App Links 허용 경로와 fail-closed 웹 라우트
- 공개 고객지원 `/support`
- 공개 계정 삭제 `/help/account-deletion`
- Apple·Google 한국어 등록 문안과 길이 검사
- App Privacy·Data safety 처리표와 광고·연령·UGC 선언
- App Store·Google Play 아이콘과 Google 피처 그래픽
- 실제 앱 UI만 허용하는 7장 스크린샷 계획
- 실제 기기 QA 매트릭스
- 모바일 번들·플러그인 단위 테스트
- 주요 탭의 슬래시 없는 주소까지 포함한 Universal/App Link 경계와 중복 OAuth 콜백 단일 처리
- Supabase PKCE 세션을 iOS Keychain·Android Keystore에 보관하는 보안 저장소 구현
- iOS 재설치 뒤 남은 Keychain 세션을 초기 실행 때 제거하는 계정 경계 구현
- OAuth 요청 만료·재사용·허용 경로·취소를 fail-closed로 처리하는 모바일 인증 계약
- 보안 저장 플러그인을 포함한 Xcode 16.4 환경의 서명 없는 iOS 시뮬레이터 앱 번들 생성
- iPhone 16(iOS 18.6) 시뮬레이터 설치·실행·safe-area 시각 점검과 앱 자체 crash 없음 확인
- Android Studio Quail 3 Patch 1·명령줄 도구·Gradle 8.14.3 설치 완료
- Android SDK Platform 36·Build Tools 36.0.0·Platform Tools 37.0.1 설치 완료
- 호환 JDK 21.0.12 설치 및 Android 디버그 APK 실제 빌드 성공
- macOS Sequoia 15.7.9 업데이트 파일 다운로드 완료(Xcode 26.3 실행 전제 조건)
- Android Studio 버전 문자열 `2026.1`도 정식 최신 버전으로 판정하도록 도구 검사 보정
- 전체 TypeScript와 ESLint 통과
- 전체 Vitest 단일 워커 통과
- Next 프로덕션 빌드와 신규 공개 라우트 산출물 확인
- 루트·모바일 잠금파일 무결성 검사와 깨끗한 `npm ci --dry-run` 통과
- 500개 이상 테스트 파일 이후에도 빌드 워커가 4GB 기본 힙에서 중단되지 않도록 8GB 상한의 이식 가능한 Next 빌드 래퍼 적용

현재 모바일 계약 테스트는 25/25를 통과했고 Android 앱 ID 단위 테스트도 통과했다. 보안·출시 게이트 변경 전 생성했던 APK/AAB와 해시는 역사적 검증 자료일 뿐이며 현재 제출 후보로 재사용하지 않는다. 전체 웹 회귀, 새 후보 빌드, 서명된 IPA/AAB, 실기기 QA와 스토어 증빙은 최종 `mobile:release:check`에서 다시 검증해야 한다.

자동 실행:

```bash
npm run mobile:submission:check
```

## 개발자가 이어서 구현할 항목

계정이 없어도 구현을 이어갈 수 있지만, 현재 범위가 크므로 별도 P0 이관 단계로 관리한다.

1. 홈·검사 허브·코어/주제/연구소 검사·결과를 모바일 로컬 번들로 이관
2. 밸런스게임 생성·입장·선택·최종 결과 이관
3. 피드·댓글·신고·차단, 마이·기록·공개 범위·회원 탈퇴 이관
4. 시스템 브라우저 OAuth → 앱 복귀 → code exchange 이후 실제 제품 화면 복귀
5. 시스템 공유·카카오톡 공유·Universal/App Link 실제 앱 라우팅
6. 오프라인·느린 연결·강제 종료·업데이트 복원
7. 접근성·성능·오류·분석 동의 경계

`nativeSecureSessionStorageImplemented`는 단위 테스트, 양 플랫폼 플러그인 등록, iOS 네이티브 컴파일 증빙까지 확보해 완료 처리했다. `p0MobileProductFlowsComplete`, `nativeOAuthReturnImplemented`, `nativeShareAndDeepLinksLiveVerified`는 제품 화면 복귀와 실기기 검증 전까지 `false`로 유지한다.

## 계정 소유자만 할 수 있는 항목

- Apple Developer 개인 가입·신분 확인·본인 결제·약관 동의
- Google Play 조직 계정용 D‑U‑N‑S·사업자 검증·결제·OTP
- Apple Sign in with Apple `.p8` 1회 다운로드와 Supabase secret 입력
- 다운로드한 macOS Sequoia 15.7.9 설치·재시작과 Apple 계정 로그인
- Xcode 26.3 설치 후 최초 실행 약관·추가 구성요소 승인
- 스토어 심사용 전용 계정의 비밀번호·OTP 관리
- 최종 콘솔 약관과 `Submit for Review` 승인

정확한 입력값과 순서는 `docs/store/NUANG_ACCOUNT_OWNER_ONLY_ACTIONS.md`를 따른다.

## 제출 직전 최종 게이트

아래 명령은 모든 `releaseBlockers`가 실제 증빙과 함께 `true`이고 운영 환경 변수, Xcode/Android 도구가 준비됐을 때만 통과한다.

```bash
npm run mobile:release:check
```

검사를 억지로 통과시키기 위해 값을 미리 `true`로 바꾸지 않는다. 실제 제품 UI, 운영 로그인, 실기기 QA, 스크린샷, 서명 빌드가 없으면 출시 후보가 아니다.
