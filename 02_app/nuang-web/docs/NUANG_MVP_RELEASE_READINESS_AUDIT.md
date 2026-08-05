# NUANG MVP 출시 전 최종 기능·테스트 감사

> 보존된 시점 감사: 아래 NO-GO 판정은 운영 migration·OAuth·베타 정책 결정 전
> 상태다. 현재 NUANG Beta 출시 판단은
> `NUANG_BETA_RELEASE_OPERATING_PLAN.md`와
> `scripts/mvp-go-live-gates.json`을 우선한다. 외부 법률 검토와 사람 측정 검증은
> 완료가 아니라 `유예 · 승인 아님`이다.

- 감사 기준일: 2026-08-05 KST
- 대상: `02_app/nuang-web`의 App Router 화면·API·layout, `src/features`, 운영 스크립트, Supabase 핵심 스키마·RPC
- 로컬 엔지니어링 판정: **PASS** — 전체 테스트·정적 검사·프로덕션 빌드·프로덕션 서버 E2E 통과
- 운영 통합 판정: **NO-GO** — 신규 보안 RPC 2개가 운영 DB에 아직 미적용
- 공개 출시 판정: **NO-GO** — 측정 승인, 법률 문서 승인, 실제 소셜 OAuth 확인도 남아 있음

## 1. 감사 범위와 추적 방식

`src/app`의 모든 `page.tsx`, `route.ts`, `layout.tsx`를 자동 수집했다. 총 172개 앱 진입 표면을 18개 기능 도메인으로 분류했고, 각 도메인이 실제 소스와 자동 테스트 근거를 가지도록 출시 게이트를 추가했다.

상세 기능·경로·HTTP 메서드·테스트 파일 목록은 [NUANG_MVP_RELEASE_FUNCTION_INVENTORY.md](./NUANG_MVP_RELEASE_FUNCTION_INVENTORY.md)에 있다. 기능 또는 경로가 추가됐는데 분류·테스트 근거가 없거나 생성 문서가 오래되면 `npm run release:inventory:check`가 실패한다.

이번 감사의 18개 기능 도메인은 다음과 같다.

1. 관리자와 운영 통제
2. 광고와 제휴 문의
3. 마케팅 이메일
4. 연구 참여와 분석
5. 함께하는 밸런스 게임
6. 공개 프로필과 소셜 안전
7. 커뮤니티 피드
8. 1:1 성향 비교
9. 결과 공유
10. 피드백과 제품 분석
11. 온보딩·로그인·동의
12. 마이·계정·개인 데이터
13. 코어·주제·친구 검사
14. 별난 성향 연구소와 도움 연결
15. 뉴앙 코드와 성향지도
16. 결과 리포트
17. 앱 셸·홈·주요 내비게이션
18. 정책·보안·플랫폼 기반

여기서 “테스트가 있다”는 것은 모든 사용자 기능 도메인과 모든 App Router 진입점이 자동 테스트 근거에 연결됐다는 뜻이다. 모든 내부 함수의 모든 가능한 분기를 개별 테스트했다는 과장된 의미로 사용하지 않는다.

## 2. 최종 자동 검증 결과

| 검증                      | 결과 | 확인 내용                                                                               |
| ------------------------- | ---- | --------------------------------------------------------------------------------------- |
| 기능 인벤토리             | PASS | 18개 도메인, 172개 앱 표면, 자동 테스트 파일 459개 추적                                 |
| Vitest                    | PASS | 458개 파일, 2,107개 테스트 전부 통과                                                    |
| Playwright E2E            | PASS | 모바일·데스크톱 합계 12개 시나리오 통과                                                 |
| TypeScript                | PASS | `tsc --noEmit` 오류 없음                                                                |
| ESLint                    | PASS | 정적 규칙 오류 없음                                                                     |
| 프로덕션 빌드             | PASS | Next.js 16.2.12 Webpack 빌드, 정적 페이지 114개 생성                                    |
| 제품·연구 harness         | PASS | 현재 제품 계약, M04 키트, Gate C 키트, ENAKQ 산출물 동기화 통과                         |
| 환경 변수                 | PASS | 로컬·auth·server 필수 환경 변수 존재                                                    |
| 운영 Supabase readiness   | FAIL | 기존 테이블·RLS·RPC는 통과. 신규 원자적 차단·비교 RPC 2개 미적용                        |
| 인증 커뮤니티 원격 스모크 | PASS | 임시 계정, 필수 동의, 투표 글, 투표, 댓글, 인증 read model, 명시적 삭제와 잔여 0건 확인 |
| 런타임 의존성 감사        | PASS | `npm audit --omit=dev`: 알려진 취약점 0건                                               |
| 전역 테마 신규 위반       | PASS | 기존 부채 780건을 기준선으로 고정, 신규 위반 0건                                        |

E2E는 개발 서버가 아닌 `next start` 프로덕션 서버에서 수행한다. 첫 방문 온보딩, 로그인 필수 동의, 서명 없는 OAuth callback 차단, protocol-relative redirect 차단, legacy 함께 경로 redirect, 핵심 공개 화면의 렌더링·가로 overflow·런타임 오류를 모바일과 데스크톱에서 확인한다.

인앱 브라우저의 localhost 직접 연결은 브라우저 URL 보안 정책에 의해 차단됐다. 제품 오류와 분리해 기록했고, 동일한 공개 화면 검증은 Playwright와 실제 로컬 서버 요청 로그로 완료했다.

## 3. 이번에 추가하거나 수정한 내용

### 기능·테스트 문서화

- `scripts/mvp-release-catalog.json`: 18개 기능 도메인, 상세 기능, 진입점 패턴, 소스, 테스트 근거 정의
- `scripts/generate-mvp-release-inventory.mjs`: 모든 App Router 표면과 HTTP 메서드를 수집해 출시 인벤토리 생성·동기화 검사
- `docs/NUANG_MVP_RELEASE_FUNCTION_INVENTORY.md`: 172개 화면·API·layout 전수 목록
- `src/config/mvp-release-inventory.test.ts`: 미분류 화면/API, 테스트 없는 도메인, 누락 기능 디렉터리, 잘못된 route/page export를 자동 차단
- `src/config/operational-script-syntax.test.ts`: 핵심 출시·운영 스크립트 8개의 실행 문법 회귀 방지

### 발견한 결함과 수정

- 폐기된 코드 체계와 과거 UI 문구를 강제하던 1,337줄 제품 harness를 현재 제품 canon·개인정보·측정 gate 중심의 구조 검증으로 교체
- 기능 요구사항의 구형 `S/T · C/V · F/O · A/D · E/P` 설명을 현재 `E/I · R/N · G/A · K/M · C/Q` 체계로 교정
- 부드러운 온보딩 스크롤 도중 마지막 CTA가 너무 일찍 나타나는 경합을 수정하고 회귀 테스트 추가
- 계정 결과 삭제 테스트가 동적 성향 프로필 재계산 read를 모킹하지 못해 전체 suite에서 실패하던 테스트 계약 보완
- 오래된 E2E 문구·callback 기대값을 현재 화면 계약에 맞추고 11개 주요 공개 화면 smoke 추가
- 기본 Turbopack 프로덕션 빌드가 CPU 사용 없이 장시간 정지한 문제를 확인하고, 출시 빌드를 `next build --webpack`으로 고정해 15.4초 컴파일과 전체 정적 생성을 완료
- 운영 readiness에 동적 성향 프로필, 검사 콘텐츠 스튜디오, 밸런스 게임 전체 테이블과 고속 RPC 검증 추가
- 인증 커뮤니티 스모크가 마감된 고정 공식 투표에 의존하던 문제를 제거. 테스트가 자체 투표를 만들고 필수 동의·투표·댓글·read model을 검증한 뒤 모든 원격 데이터를 명시적으로 삭제하도록 수정
- 오래된 ENAKQ 전문가 packet manifest 재생성
- 테마 검증을 “기존 부채”와 “신규 위반”으로 분리해 이후 변경이 새로운 직접 색상·임의 타이포를 추가하면 실패하도록 고정
- 인증 쿠키가 없는 공개 요청에서 Supabase 세션 검증을 건너뛰고, 전역 검사 동기화를 idle 시점으로 옮겨 초기 화면 진입 비용을 줄임
- 홈 검사 카탈로그를 60초 캐시하고 독립 서버 조회를 병렬화했으며, 비로그인 마이 화면의 중복 인증·동기화·계정 API 호출을 제거
- 빠른 화면 이동은 전역 로딩 오버레이를 표시하지 않도록 전환 지연을 줄임
- 밸런스 게임 최종 결과 이후 무한 polling을 중단하고, 비공개 방 변경이 커뮤니티 피드 캐시를 불필요하게 무효화하지 않도록 수정
- 공개 리포트 기본 공개 범위와 비교 동의를 fail-closed로 변경하고, 동의 철회·프로필 숨김·회원 정지 시 공개 snapshot과 비교를 비활성화하는 migration 추가
- 차단 관계 조회 실패와 connections 우회를 닫고, 차단 시 양방향 팔로우·알림을 한 트랜잭션에서 정리하도록 변경
- 비교 리포트와 필수 visibility audit event를 하나의 DB 함수에서 생성해 부분 저장을 차단
- 계정 삭제는 Storage 미디어가 모두 삭제된 뒤에만 DB/auth 삭제를 실행하고, 미디어 삭제 실패를 503으로 fail-closed 처리
- 모든 API JSON mutation에 공통 교차 출처 검사와 1MB 선언 크기 제한을 적용하고, 스키마 기반 JSON reader는 실제 스트림을 512KB에서 중단
- 피드 사진 업로드를 병렬화하고 운영 Vercel Function 상한 아래인 총 4MB로 검증해 운영 413 실패를 사전 차단
- 내 리포트에서 코어·주제·실험·계정·비교 기록을 JSON으로 내보내는 사용자 기능과 테스트 추가

## 4. 공개 출시 전 반드시 끝내야 하는 항목

### P0 — 운영 DB 보안 migration 적용

`202608050002`부터 `202608050006`까지의 공개 범위·비교 철회·관리자 숨김·원자적 비교·원자적 차단 migration이 로컬 코드에 있다. 운영 REST readiness에서 기존 스키마는 정상이나 마지막 두 RPC가 없음을 확인했다. 현재 `.env.local`의 `DATABASE_URL`은 REST와 별개로 서울 pooler 비밀번호 인증에 실패해 자동 적용을 중단했다. 올바른 운영 DB 비밀번호 또는 Supabase migration 권한으로 적용한 뒤 `npm run smoke:server:readiness`에서 두 항목까지 PASS해야 한다.

### P0 — 측정 release 승인

현재 `nextNuangCodeScheme`은 `candidate`이며 다음 네 gate가 모두 `not_started`다.

- cognitive review
- fairness and invariance
- quantitative pilot
- reliability and structure

M04 preflight의 실제 독립 전문가 제출도 0건이다. 코드를 임의로 `validated` 또는 `active`로 변경하지 않았다. 고객에게 대표 성향과 코드가 검증된 결과처럼 전파되는 공개 프로필·공유·피드·비교 기능은 승인된 `measurement_release_id`가 생길 때까지 출시하면 안 된다.

### P0 — 이용약관·개인정보 처리방침 최종 승인

두 정책 route와 noindex는 구현돼 있고 내용 테스트도 통과하지만, 제품 요구사항은 외부 최종 법률 승인을 출시 조건으로 둔다. 현재 코드 이름도 `policySkeleton`이다. 운영자 정보, 처리위탁, 국외 처리, 보관기간, 미성년자 기준을 실제 운영 계약과 대조해 승인한 뒤 noindex 해제 여부를 결정해야 한다.

### P0 — 실제 소셜 OAuth 왕복 확인

서명 intent, callback fail-closed, redirect 공격 차단은 자동 테스트했다. 다만 Google·Kakao의 실제 운영 provider 로그인 왕복은 브라우저 수동 확인이 남았다. Naver client 값은 선택 환경 변수로 비어 있으며 현재 MVP에서 닫힌 상태가 정상이다.

## 5. 차단하지 않지만 계획적으로 줄여야 하는 부채

### 테마 토큰 부채

직접 색상, 비토큰 font size/weight 등 780개 occurrence가 27개 파일에 남아 있다. 대부분 관리자 검사 스튜디오, 마케팅 콘솔, 통합 리포트 CSS에 집중돼 있다. 대규모 자동 치환은 현재 UI를 훼손할 수 있어 이번 감사에서는 정확한 값·파일·규칙별 기준선을 남기고 신규 위반만 0으로 잠갔다.

### Prettier 전역 부채

전체 저장소 `prettier --list-different`에는 연구 원고·생성 산출물·기존 소스 포함 556개 파일이 남는다. 이번에 추가·수정한 출시 감사 파일은 별도로 Prettier 통과를 확인했다. 생성물 정책과 소스 코드 정책을 분리한 뒤 단계적으로 정리하는 편이 안전하다.

### 선택 기능 비활성 환경

Naver OAuth, 광고 전달, AdSense, 쿠팡 파트너스, 마케팅 대량 발송 관련 선택 환경 변수는 비어 있다. 현재 기능 flag가 닫혀 있으므로 핵심 MVP 차단 사유는 아니지만, 해당 기능을 MVP 범위에 넣는다면 별도 go-live 검증이 필요하다.

### 피드 미디어 직접 업로드

현재는 [Vercel Function의 공식 4.5MB 요청 상한](https://vercel.com/docs/functions/limitations#request-body-size)을 넘지 않도록 게시물당 사진 총합을 4MB로 제한하고 서버 내부 업로드는 병렬화했다. 기능은 안정적으로 동작하지만, 사진 수와 해상도를 늘리려면 signed URL을 이용한 Supabase Storage 직접 업로드로 전환해야 한다.

## 6. 최종 GO 조건

다음 조건을 모두 만족하면 공개 MVP를 GO로 바꿀 수 있다.

1. 운영 DB에 `202608050002`~`202608050006` 적용
2. 측정 네 gate 완료와 승인된 `measurement_release_id` 배포
3. 최종 이용약관·개인정보 처리방침 승인
4. Google·Kakao 운영 OAuth 실제 로그인·계정 연결·로그아웃 smoke 통과
5. `npm run qa:mvp:complete` 통과
6. `npm run smoke:server:readiness` 전 항목 통과
7. 임시 데이터 삭제를 포함한 인증 커뮤니티 smoke 통과
8. 출시 candidate와 배포 commit이 동일함을 확인

## 7. 재현 명령

```bash
npm run release:inventory:check
npm run qa:mvp:complete
npm run db:mvp-security:check
NUANG_ALLOW_REMOTE_MIGRATION=true npm run db:mvp-security:apply
npm run env:check:auth
npm run env:check:server
npm run smoke:server:readiness
NUANG_ALLOW_TEMP_REMOTE_SMOKE=true npm run smoke:community:authenticated
npm audit --omit=dev
```

원격 smoke는 실제 운영형 Supabase에 임시 데이터를 만들기 때문에 전용 플래그가 필요하며, 성공 판정은 `cleanup: "ok"`와 잔여 데이터 0건까지 포함한다.
