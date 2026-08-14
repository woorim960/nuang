# 뉴앙 iOS·Android 스토어 출시 실행 계획

작성일: 2026-08-11<br>
운영 서비스: `https://nuang.app`<br>
앱 표시 이름: `뉴앙`<br>
고정 애플리케이션 ID: `app.nuang.mobile`

## 1. 확정된 계정·공개 정보

| 구분                 | 적용 값                                                             | 사용 원칙                                                |
| -------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| 현재 법적 운영 주체  | 딱좋은라이프                                                        | 사업자등록 자료와 동일하게 입력한다.                     |
| 대표자               | 박우림                                                              | 본인 인증 자료와 동일하게 입력한다.                      |
| 사업자등록번호       | 768-75-00424                                                        | Google 사업자 검증에 사용한다.                           |
| 앱·브랜드 이름       | 뉴앙                                                                | 양 스토어의 앱 이름으로 사용한다.                        |
| Google 공개 개발자명 | 뉴앙                                                                | 법적 조직명과 별도로 설정한다.                           |
| 사업자 주소          | 경기도 파주시 고봉로 755-27, 201-E280호(상지석동, 갤러리하우스상가) | Google 결제 프로필·D&B·사업자 자료가 서로 일치해야 한다. |
| 공개 전화번호        | 010-2515-0939                                                       | 국제 형식은 `+82 10-2515-0939`이다.                      |
| 공개 이메일          | woorimprog@gmail.com                                                | 추후 뉴앙 전용 운영 메일로 교체할 수 있다.               |

미등록 브랜드 `뉴앙`을 법적 조직명으로 입력하지 않는다. Google Play에서는 법적 조직명 `딱좋은라이프`와 공개 개발자명 `뉴앙`을 함께 사용할 수 있다.

## 2. Apple과 Google의 계정 경로가 다른 이유

사업자등록번호의 가운데 코드 `75`는 국세청 부여 체계상 개인과세사업자 코드 `01~79`에 포함된다. 따라서 현재 운영 주체는 개인사업자로 분류한다.

- Google Play: 상업적 사업 용도이므로 **조직 계정**을 사용한다. 법적 조직명은 `딱좋은라이프`, 공개 개발자명은 `뉴앙`이다. 조직 계정 개설 전 D‑U‑N‑S 번호가 필요하다.
- Apple App Store: Apple은 개인사업자·1인 사업자에게 **개인 등록**을 요구한다. 앱 이름은 `뉴앙`이지만 판매자명은 Apple에서 검증된 박우림의 법적 이름으로 표시된다.

`뉴앙`이라는 새 상호만 개인사업자로 추가 등록해도 Apple 판매자명이 자동으로 뉴앙이 되지는 않는다. Apple에 조직 판매자명으로 보이려면 Apple이 계약 가능한 별도의 법적 법인과 D‑U‑N‑S 검증이 필요하다.

## 3. 주소 입력 규칙

Google의 법적 조직 주소는 Google Payments와 D&B 자료, 검증 문서가 일치해야 하므로 임의의 다른 주소를 사용할 수 없다. 현재는 전달받은 사업자등록 주소를 사용한다.

한국 사용자에게 표시하는 업체 문의 주소는 실제로 연락 가능한 주소여야 한다. 다른 주소를 사용할 수 있는 별도 입력란이 있더라도, 조직 계정의 법적 주소 공개를 대체하거나 숨기는 용도로 사용할 수는 없다. 따라서 단순히 주소 노출을 피하기 위해 다른 주소를 넣지 않는다.

Apple 개인 등록 과정에서 요구하는 계정 보유자의 주소는 본인 확인 정보와 일치해야 한다. 이 값은 저장소나 문서에 기록하지 않고 Apple 포털에 본인이 직접 비공개로 입력한다. 사업자 주소가 본인의 법적 주소와 다르면 사업자 주소를 대신 넣지 않는다.

## 4. 제품 아키텍처

뉴앙 웹을 외부 URL 하나로 감싼 운영용 WebView로 제출하지 않는다. 현재 Next.js 앱은 서버 렌더링·API 라우트·동적 데이터에 의존하므로 정적 내보내기를 바로 적용할 수 없다.

출시 앱은 다음 구조로 만든다.

1. `nuang.app`: 기존 웹, 검색 유입, 공개 공유 리포트, API·Supabase 연동을 유지한다.
2. 모바일 프런트 번들: 공통 디자인 토큰과 React 기능 컴포넌트를 재사용하되 기기 안에 패키징한다.
3. Capacitor 네이티브 셸: iOS·Android 생명주기, 보안 저장소, 공유, 딥링크, 네트워크 상태, 햅틱을 담당한다.
4. 공통 계정 데이터: 웹과 앱이 같은 Supabase 계정·검사 결과·커뮤니티 데이터를 사용한다.

운영 설정에 Capacitor `server.url=https://nuang.app`를 넣지 않는다. 이 값은 개발 중 라이브 리로드 외에는 사용하지 않으며, 출시 검사 스크립트에서 금지한다.

## 5. 기능 이관 순서

### P0 — 심사와 핵심 이용 흐름

- 온보딩, 홈, 검사 허브
- 코어 검사, 주제 검사, 별난 연구소, 결과 리포트
- 밸런스게임 방 생성·입장·선택·결과
- Google·Kakao·Apple 로그인과 정확한 복귀
- 비회원 결과를 로그인 계정에 저장
- 마이, 기록, 공개 범위, 회원 탈퇴
- 공유용 링크와 카카오톡·시스템 공유
- 개인정보처리방침, 이용약관, 고객지원

### P1 — 커뮤니티와 운영 안정성

- 피드, 게시물, 댓글, 투표
- 신고, 차단, 삭제, 운영자 연락
- 알림 화면
- 광고주 배너, 쿠팡 파트너스 외부 브라우저 연결
- 네트워크 중단·복구, 오류 화면, 업데이트 안내

### P2 — 앱다운 사용감

- 절제된 햅틱
- 스플래시·상태바·안전영역
- Universal Links와 Android App Links
- 공유 링크의 앱 설치 여부별 분기
- 선택형 푸시 알림

## 6. 로그인·딥링크

- 웹 콜백과 앱 콜백을 구분한다.
- iOS Universal Link와 Android App Link의 기준 도메인은 `https://nuang.app`이다.
- `apple-app-site-association`, `assetlinks.json`을 `/.well-known/`에 제공한다.
- Supabase, Google, Kakao, Apple 콘솔에 승인된 콜백만 등록한다.
- OAuth는 시스템 브라우저에서 진행하고 앱의 정확한 원래 화면으로 돌아온다.
- 세션 토큰은 iOS Keychain과 Android Keystore 기반 보안 저장소를 사용한다.

## 7. 광고·연령·개인정보

- 스토어에서 광고 포함을 선언한다.
- 광고주 배너와 쿠팡 파트너스 링크는 광고임을 표시하고 시스템 브라우저로 연다.
- 만 14세 미만 계정 생성을 막고 19세 기능은 비공개로 유지한다.
- 14~17세에게 노출할 수 없는 광고 소재와 추적형 광고를 제한한다.
- Apple App Privacy와 Google Data safety에는 앱 코드뿐 아니라 OAuth·광고·분석 SDK의 처리도 포함한다.
- 계정 삭제는 앱 안과 웹 안내 URL 양쪽에서 접근 가능해야 한다.

## 8. 실제 기기 출시 게이트

다음 조합을 모두 통과하기 전 제출하지 않는다.

- iPhone 소형·일반·대형 화면, 최신 iOS와 지원 최저 iOS
- Android 360dp·412dp, 최신 Android와 지원 최저 Android
- 비회원·신규 로그인·기존 로그인·계정 전환
- Wi‑Fi·모바일망·오프라인·느린 연결
- Google·Kakao·Apple 로그인 성공·취소·실패
- 앱 종료·강제 종료·재실행·업데이트
- 공유 링크를 앱 설치 기기·미설치 기기·다른 브라우저에서 열기
- 글자 크기 확대, 스크린리더, 키보드, 모션 감소

## 9. 현재 개발 환경 차단 항목

- 설치된 Xcode는 16.4이며 현재 App Store 제출 요구사항인 Xcode 26 이상이 아니다.
- Android Studio 2026.1, 내장 Java Runtime, 공식 명령줄 도구는 설치했다. 계정 소유자가 Google Android SDK 약관에 동의해야 Platform 36·Build Tools 36.0.0·Platform Tools 설치를 마칠 수 있다.
- Google 조직 계정용 D‑U‑N‑S 번호가 아직 등록되지 않았다.
- Apple Developer Program과 Google Play Console 결제가 완료되지 않았다.
- Apple App ID·Services ID·Sign in with Apple Key·Supabase Provider의 운영 연결이 완료되지 않았다.
- Apple Team ID와 Google Play App Signing SHA-256 지문이 없어 Universal Links/App Links 운영 검증 전이다.
- 현재 `mobile/`은 네이티브 브리지 검증 화면이며, P0 뉴앙 제품 UI 이관과 실기기 스크린샷이 남아 있다.

도구 설치와 계정 등록 전에도 공통 모바일 구조·에셋·정책 제출 자료·테스트 계약은 개발할 수 있다. 서명된 실제 기기 빌드와 스토어 업로드는 위 차단 항목이 해소된 뒤 수행한다.

## 10. 사용자가 직접 해야 하는 최소 작업

1. Google 조직 계정에 사용할 `딱좋은라이프` D‑U‑N‑S 번호를 무료 조회·신청한다.
2. Apple Developer Program은 박우림 개인으로 가입하고 법적 이름·주소를 신분 자료와 동일하게 입력한다.
3. Google Play 조직 계정을 만들고 법적 조직명 `딱좋은라이프`, 공개 개발자명 `뉴앙`을 입력한다.
4. 비용 결제, 본인 인증, 약관 동의와 OTP만 직접 처리한다.
5. Xcode 26 이상을 설치하고, 설치된 Android Studio에서 Android SDK 약관에 동의한다.

나머지 애플리케이션 구현, 스토어 문구·이미지·데이터 공개표, 테스트, 빌드 설정과 심사 대응은 코드 저장소에서 이어서 관리한다.

## 11. 현재까지 자동화·구현 완료

- iOS·Android Capacitor 프로젝트와 로컬 번들 방식
- 고정 Bundle ID/Application ID `app.nuang.mobile`
- iPhone 전용·세로 화면·iOS 15 이상, Android min 24/target 36
- cleartext·외부 WebView 탐색·Android 백업 차단
- iOS 앱 자체 Privacy Manifest와 Android 백업·기기 이전·평문 통신 차단
- Universal Links/App Links 경로 allowlist와 fail-closed 배포 라우트
- Apple 로그인 provider 계약·Xcode capability·DB provider registry
- Google·Kakao·Apple 로그인 정책과 계정 연결 UI
- 공개 고객지원·계정 삭제 안내 URL
- 한국어 스토어 설명·키워드·광고·연령·UGC 선언 원본
- Apple App Privacy·Google Data safety 공통 데이터 처리표
- App Store 아이콘·Google Play 아이콘·피처 그래픽 자동 생성·규격 검사
- 실제 앱 화면 7장 촬영 계획과 실제 기기 QA 매트릭스
- 제출 초안 자동 검사 `npm run mobile:submission:check`
- 모든 계정·실기기·서명 게이트를 포함한 최종 검사 `npm run mobile:release:check`

관련 문서:

- `docs/store/NUANG_APPLE_SIGN_IN_SETUP_RUNBOOK.md`
- `docs/store/NUANG_REAL_DEVICE_QA_MATRIX.md`
- `docs/store/NUANG_STORE_ASSET_AND_SCREENSHOT_GUIDE.md`
- `docs/store/NUANG_APP_PRIVACY_DATA_SAFETY_MATRIX.md`
- `docs/store/NUANG_STORE_REVIEW_NOTES_KO.md`
- `docs/store/NUANG_MOBILE_RELEASE_STATUS_2026-08-11.md`

`mobile:submission:check`는 지금 개발자가 완료할 수 있는 제출 자료·코드·에셋을 검사한다. `mobile:release:check`는 계정 소유자의 본인 인증, 운영 키, 실기기 QA, 스크린샷, 서명 빌드까지 전부 확인하므로 이 항목이 사실로 검증되기 전에는 통과시키지 않는다.

## 12. 공식 근거

- Apple D‑U‑N‑S와 개인사업자 등록: <https://developer.apple.com/help/account/membership/D-U-N-S/>
- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play 계정 유형: <https://support.google.com/googleplay/android-developer/answer/13634885?hl=ko>
- Google Play 계정 정보: <https://support.google.com/googleplay/android-developer/answer/13628312?hl=ko>
- 한국 개발자 공개 연락처: <https://support.google.com/googleplay/android-developer/answer/3255733?hl=ko>
- 국세청 사업자등록번호 부여 체계: <https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=2448&nttSn=1386>
- Capacitor 설치·구성: <https://capacitorjs.com/docs/getting-started>
