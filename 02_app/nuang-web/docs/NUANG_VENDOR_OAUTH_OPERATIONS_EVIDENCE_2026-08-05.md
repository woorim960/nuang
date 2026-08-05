# 뉴앙 베타 공급자·OAuth 운영 검증 기록

- 검증일: 2026-08-05 (Asia/Seoul)
- 운영 도메인: `https://nuang.app`
- 운영 코드 기준: `cf5b6155fc0bde3c24e190ecf0baf34cb5012c97`
- 검증 범위: Supabase, Vercel, Resend, Google OAuth, Kakao OAuth, 뉴앙 로그인·연결·로그아웃·재로그인
- 보안 원칙: API key, OAuth secret, 토큰, 쿠키, 사용자 원문 식별자는 이 문서에 기록하지 않는다.

## 1. 결론

| 구분 | 실제 확인 결과 | 상태 |
| --- | --- | --- |
| Supabase 프로젝트 | Free, 서울 `ap-northeast-2`, 기본 데이터 서울 저장, 자동 백업 없음, API·DB 로그 1일, Auth 감사 로그 1시간 | 확인 완료 |
| Vercel 프로젝트 | Hobby, 실제 운영 함수 빌드·실행 리전 `icn1`, Runtime Logs 1시간, 운영 배포 보존 30일·최근 운영 배포 10개 예외 보존 | 확인 완료 |
| Resend | Free, `notice.nuang.app` 인증 완료, 발송 리전 도쿄 `ap-northeast-1`, 클릭·열람 추적 미설정, TLS Opportunistic | 확인 완료 |
| Google OAuth | 외부 사용자 대상 운영 공개, 운영 홈페이지·약관·처리방침·승인 도메인·JS 원본·Supabase callback 등록, 기본 `email profile`만 요청 | 확인 완료 |
| Google 운영 로그인 | 신규 동의 → callback → 마이 화면, 로그아웃 → 보호 화면 차단, 재로그인 → 원래 계정 설정 화면 복귀 | 통과 |
| Kakao OAuth | 비즈 앱·로그인 ON, 운영 도메인·Supabase callback·최소 프로필/이메일 동의항목·활성 client secret 확인 및 교체 | 확인 완료 |
| Kakao 운영 로그인 | callback → 기존 카카오 프로필, 로그아웃 → 보호 화면 차단, 재로그인 → 동일 프로필·게시물·검사 결과 유지 | 통과 |
| OAuth 수동 연결 | 기존 서로 다른 계정의 충돌 보호와 기록 보존을 먼저 확인한 뒤, 승인된 기존 계정을 삭제·재가입해 Google 계정에 Kakao를 연결하고 양쪽 재로그인 | 통과 |

Google·Kakao 운영 로그인과 로그아웃·재로그인은 실제 계정으로 끝까지 통과했다. 기존 서로 다른 계정 사이의 연결은 안전하게 거부되고 기록이 유지됐으며, 사용자가 삭제를 승인한 두 기존 계정을 완전 삭제한 뒤 Google 새 계정에 Kakao를 연결했다. 운영 DB에서 두 provider가 동일 계정·Auth 사용자를 가리키고 양쪽 재로그인이 같은 새 프로필을 여는 것까지 확인했다.

## 2. Supabase 실제 설정

### 프로젝트·보관

- 프로젝트 ref: `xkhulgpefeupfyugbpnf`
- 플랜: Free
- 리전: Northeast Asia (Seoul), `ap-northeast-2`
- Supabase는 선택한 specific region이 기본 프로젝트 데이터 저장 위치를 결정한다고 안내한다.
- Free 플랜에는 자동 백업이 포함되지 않는다. 장애 시 플랫폼 자동 백업 복원이 가능한 상태로 안내하면 안 된다.
- API·Database 로그 보존: 1일
- Auth Audit Logs 보존: 1시간

공식 근거:

- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/pricing

### Auth URL·provider

- Site URL: `https://nuang.app`
- 허용 callback:
  - `https://nuang.app/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `https://nuang.app/auth/link/callback`
  - `http://localhost:3000/auth/link/callback`
  - 기존 운영 preview callback 1개
- Google, Kakao provider: 활성
- 신규 사용자 가입: 활성
- 이메일 확인: 활성
- Supabase `Allow manual linking`: 활성
- 앱 DB provider registry의 Google·Kakao `link_enabled`: 활성
- 앱 DB `manual_provider_link` feature flag: 활성

### 계정 무결성

운영 DB 감사 결과:

| 검사 | 영향 행 수 |
| --- | ---: |
| `auth_user_orphan` | 0 |
| `disabled_or_unknown_provider` | 0 |
| `identity_required_field_missing` | 0 |
| `supabase_user_multiple_accounts` | 0 |
| `orphan_account` | 10 |

수동 연결 활성화를 막는 네 검사는 모두 0이다. `orphan_account` 10건은 즉시 삭제 대상이 아니다. 실제 사용자 데이터 보유 여부를 확인한 뒤 별도 정리해야 한다.

## 3. Vercel 실제 설정

- 팀/계정: `woorim960s-projects`
- 프로젝트: `nuang`
- 플랜: Hobby
- 운영 도메인 alias: `https://nuang.app`
- 저장소 설정: `vercel.json`의 함수 리전 `icn1`
- 실제 운영 배포 빌드 출력에서도 `[icn1]` 확인
- Runtime Logs: Hobby 기준 1시간
- 운영 배포 보존: 프로젝트 설정 30일, 최근 운영 배포 10개 보존
- Web Analytics: 활성

주의사항:

- 함수 실행 리전이 서울이어도 Vercel 전체 서비스 데이터·로그·빌드 산출물이 모두 한국에만 저장된다는 뜻은 아니다.
- Vercel 공개 DPA는 주 처리 시설이 미국이고 하위처리자 운영 지역으로 이전될 수 있다고 설명하지만, 해당 DPA 본문은 Pro·Enterprise 적용이라고 명시한다. 현재 Hobby 운영에 동일 계약이 체결됐다고 표시하지 않는다.

공식 근거:

- https://vercel.com/docs/functions/configuring-functions/region
- https://vercel.com/docs/logs/runtime
- https://vercel.com/changelog/hobby-projects-now-default-to-30-day-deployment-retention
- https://vercel.com/legal/dpa

## 4. Resend 실제 설정

- 플랜: Free
- 발송 도메인: `notice.nuang.app`
- 도메인 상태: verified
- 발송 리전: Tokyo, `ap-northeast-1`
- 도메인 추적: 미설정. 인증·복구 메일에 불필요한 클릭·열람 추적을 추가하지 않는 현재 상태를 유지한다.
- TLS: Opportunistic
- Free 한도: 월 3,000통, 일 100통

Resend의 리전 선택은 메일 발송 경로만 결정한다. 이메일 메타데이터, 로그, API 기록을 포함한 계정 데이터는 선택한 발송 리전과 무관하게 미국에 저장된다. Resend DPA는 서비스 계약 종료 후 고객·사용자 데이터를 90일 이내 삭제한다고 설명한다.

공식 근거:

- https://resend.com/docs/dashboard/domains/regions
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/static/documents/resend-dpa-signed.pdf

## 5. Google OAuth 운영 검증

### 콘솔 설정

- 프로젝트: NUANG (`nuang-501821`)
- 사용자 유형: External
- 게시 상태: 프로덕션 단계
- 앱 이름: NUANG
- 홈페이지: `https://nuang.app`
- 개인정보 처리방침: `https://nuang.app/policies/privacy`
- 이용약관: `https://nuang.app/policies/terms`
- 승인 도메인: `nuang.app`
- 승인 JavaScript 원본:
  - `http://localhost:3000`
  - `https://nuang.app`
- 승인 redirect URI:
  - `https://xkhulgpefeupfyugbpnf.supabase.co/auth/v1/callback`
- 요청 범위: 이름·프로필 이미지·이메일을 위한 기본 `email profile`; 추가 민감·제한 범위 없음

### 운영 E2E

1. `https://nuang.app/login`에서 Google 시작 — 통과
2. Google 계정 선택과 기본 정보 동의 — 통과
3. Supabase callback 후 `https://nuang.app/my?auth=connected` 복귀 — 통과
4. `마이 > 설정 > 로그인 및 보안`에서 Google 연결 1개와 현재 로그인 표시 — 통과
5. 뉴앙 로그아웃 후 `/home` 복귀 — 통과
6. 로그아웃 상태에서 보호 화면 접근 시 `/login?next=...` 이동 — 통과
7. Google 재로그인 후 원래 `/my/settings/account?auth=connected` 복귀 — 통과

### 비밀키 상태

Google 콘솔은 생성된 client secret의 원문을 다시 표시하거나 다운로드하지 않는다. 교체 과정에서 새 비밀키 1개가 추가됐지만 원문을 받을 수 없어 즉시 `사용 중지됨`으로 전환했다. 기존 활성 비밀키는 계속 동작하며 Google 운영 로그인 E2E로 확인했다. 완전한 정기 교체는 Google이 새 비밀키 원문을 보여 주는 최초 생성 순간에 운영자가 안전한 비밀 전달 경로로 Supabase에 입력할 수 있을 때 진행한다.

## 6. Kakao OAuth 운영 검증

### 개발자 콘솔·Supabase 설정

- 앱 ID: `1508048`
- 앱 유형: 국내 사업자 비즈 앱
- 앱 이름: 뉴앙
- 회사명: 딱좋은라이프
- 앱 대표 도메인: `https://nuang.app` 등록 완료
- Kakao provider 활성
- Kakao Login: ON
- OpenID Connect: OFF. 현재 Supabase OAuth user-info 흐름에 필요하지 않아 추가 토큰 범위를 열지 않는다.
- 수동 계정 연결 활성
- REST API login redirect URI: `https://xkhulgpefeupfyugbpnf.supabase.co/auth/v1/callback`
- Kakao Login client secret: 활성, 교체 후 Supabase에 새 값 반영, 운영 로그인으로 검증
- 운영 로그인 callback: `https://nuang.app/auth/callback`
- 운영 연결 callback: `https://nuang.app/auth/link/callback?next=%2Fmy%2Fsettings%2Faccount`
- 닉네임 `profile_nickname`: 필수 동의
- 프로필 사진 `profile_image`: 선택 동의
- 카카오계정 이메일 `account_email`: 필수 동의·수집
- 사용하지 않는 카카오톡 메시지 `talk_message`: 선택 동의에서 `사용 안 함`으로 변경
- 이름·성별·연령대·생일·출생연도·전화번호·CI·친구목록 등 미사용 범위: 요청하지 않음 또는 사용 안 함
- 앱은 이메일을 공개 프로필에 노출하지 않으며 계정 식별·연결에만 사용

### 운영 E2E

1. `https://nuang.app/login`에서 카카오 시작 — 통과
2. Kakao authorization → Supabase callback → `/my/settings/account?auth=connected` 복귀 — 통과
3. 현재 로그인 방법이 카카오로 표시되고 기존 프로필·복구 연락처가 유지됨 — 통과
4. 로그아웃 후 `/home` 복귀 — 통과
5. 로그아웃 상태에서 보호 화면 접근 시 `/login?next=...` 이동 — 통과
6. 카카오 재로그인 후 원래 계정 설정 화면 복귀 — 통과
7. 재로그인 전후 동일 handle, 이름, 게시물 14개, 검사 결과 26개 유지 — 통과

### 수동 연결 충돌 보호

- 운영 Google identity와 Kakao identity는 서로 다른 `supabase_user_id`와 `account_id`에 이미 연결되어 있다.
- Google 계정에서 기존 Kakao identity 연결 시도 — 거부, Google 기록 유지
- Kakao 계정에서 기존 Google identity 연결 시도 — 거부, Kakao 프로필·게시물·검사 결과 유지
- 이는 계정 탈취와 무손실 검증 없는 자동 병합을 막는 의도된 동작이다.
- 이 단계에서는 사용자의 삭제 승인 전까지 기존 운영 계정을 임의 삭제하거나 병합하지 않았다.

### 재가입과 긍정 연결 왕복

- 사용자가 삭제를 승인한 기존 Google `WOORIM PARK` 계정과 Kakao `박우림` 계정 및 연결 데이터를 삭제했다.
- 삭제 뒤 기존 account·profile·identity·Auth user·account FK 참조·재가입 차단 tombstone이 모두 0건임을 확인했다.
- `WOORIM PARK` Google로 다시 가입해 이전 기록이 없는 새 프로필을 생성했다.
- 새 Google 계정에서 Kakao 연결 — 통과
- 운영 DB에서 Google·Kakao가 동일 `account_id`·`supabase_user_id`를 가리킴 — 통과
- Kakao 재로그인과 Google 재로그인이 동일한 새 handle, 게시물 0개, 검사 결과 0개를 표시 — 통과
- 상세 증빙: `docs/NUANG_ACCOUNT_DELETION_REREGISTRATION_EVIDENCE_2026-08-05.md`

공식 근거:

- https://developers.kakao.com/docs/en/kakaologin/prerequisite
- https://developers.kakao.com/docs/en/kakaologin/faq
- https://developers.kakao.com/docs/en/kakaologin/utilize

## 7. 운영 판정

- `processors_and_overseas`: 실제 대시보드와 공식 문서 대조 완료. 외부 법률 승인과 별개인 내부 사전검토 증빙으로 `ready` 처리한다.
- `oauth_identity`: Google·Kakao 운영 로그인, 충돌 보호, 계정 삭제·재가입, 긍정 연결과 양 provider 재로그인까지 내부 사전대조 완료. 외부 법률 승인과 분리해 `ready`로 기록한다.
- `production_oauth` 출시 게이트: 필수 운영 왕복을 모두 통과해 `passed`로 변경한다.
- Supabase Free에 자동 백업이 없으므로 베타 운영 중 데이터 복구를 플랫폼 백업에 의존하면 안 된다. 정식 공개 확대 전에는 Pro 일일 백업 또는 별도 암호화 백업·복구 훈련 중 하나를 결정해야 한다.
