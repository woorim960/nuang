# NUANG MVP 출시 기능 인벤토리

- 기준일: 2026-08-15
- 출시 후보: NUANG MVP
- 기능 도메인: 18개
- 앱 진입 표면: 195개 (화면 95, API·callback 91, layout 9)
- 자동 테스트: 540개 파일, 정적 집계 2399개 테스트 케이스

이 문서는 `src/app`의 모든 `page.tsx`, `route.ts`, `layout.tsx`를 실제 파일에서 수집해 기능 도메인과 연결한 출시 인벤토리다. 기능·화면·API가 추가됐는데 분류나 테스트 근거가 없으면 `npm run release:inventory:check`가 실패한다.

상세 데이터·개인정보·상태 계약은 `docs/NUANG_APP_FUNCTIONAL_REQUIREMENTS.md`를 함께 따른다. 이 문서는 현재 구현 표면과 테스트 추적성을 담당한다.

## 전체 기능 요약

| ID                         | 기능 도메인                  | 앱 표면 | 테스트 근거 |
| -------------------------- | ---------------------------- | ------: | ----------: |
| `admin_operations`         | 관리자와 운영 통제           |      45 |           4 |
| `advertising`              | 광고와 제휴 문의             |       9 |           4 |
| `marketing_email`          | 마케팅 이메일                |       3 |           4 |
| `research`                 | 연구 참여와 분석             |      14 |           4 |
| `together_balance_game`    | 함께하는 밸런스 게임         |      13 |           4 |
| `public_profile_safety`    | 공개 프로필과 소셜 안전      |      10 |           4 |
| `community_feed`           | 커뮤니티 피드                |      16 |           4 |
| `public_comparison`        | 1:1 성향 비교                |       6 |           4 |
| `sharing`                  | 결과 공유                    |       6 |           6 |
| `feedback_analytics`       | 피드백과 제품 분석           |       5 |           4 |
| `auth_consent_onboarding`  | 온보딩·로그인·동의           |      14 |           4 |
| `account_my`               | 마이·계정·개인 데이터        |      22 |           4 |
| `assessments`              | 코어·주제·친구 검사          |       6 |           4 |
| `labs_help`                | 별난 성향 연구소와 도움 연결 |       6 |           4 |
| `nuang_code_map`           | 뉴앙 코드와 성향지도         |       2 |           4 |
| `result_reports`           | 결과 리포트                  |       6 |           6 |
| `home_navigation`          | 앱 셸·홈·주요 내비게이션     |       6 |           4 |
| `policy_security_platform` | 정책·보안·플랫폼 기반        |       6 |           6 |

## 관리자와 운영 통제

기능 ID: `admin_operations`

운영자 인증을 전제로 회원, 콘텐츠, 광고, 마케팅, 연구, 피드백, 감사 기록과 시스템 상태를 관리한다.

### 제공 기능

- 관리자 접근 제어와 운영자 식별
- 회원 상세 조회와 안전 조치
- 커뮤니티 콘텐츠·외부 링크 검토와 원자적 moderation
- 검사 콘텐츠 스튜디오의 조회·검증·배포 자료 관리
- 광고 캠페인·소재·문의·인벤토리·kill switch 운영
- 마케팅 캠페인·미리보기·발송 운영
- 연구 의사결정·리워드·갱신 운영
- 피드백·동의·감사 로그·시스템 준비 상태 조회

### 구현 위치

- `src/features/admin`

### 자동 테스트 근거

- `src/features/admin/server-admin-access.test.ts`
- `src/features/admin/admin-atomic-operations.test.ts`
- `src/features/admin/AdminAssessmentStudio.test.tsx`
- `src/app/api/admin/experiences/route.test.ts`

### 화면·API 진입점

| 경로                                                  | 종류·메서드           | 소스                                                                  |
| ----------------------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| `/admin`                                              | layout                | `src/app/admin/layout.tsx`                                            |
| `/admin`                                              | page                  | `src/app/admin/page.tsx`                                              |
| `/admin/advertising`                                  | page                  | `src/app/admin/advertising/page.tsx`                                  |
| `/admin/analytics`                                    | page                  | `src/app/admin/analytics/page.tsx`                                    |
| `/admin/audit`                                        | page                  | `src/app/admin/audit/page.tsx`                                        |
| `/admin/community`                                    | page                  | `src/app/admin/community/page.tsx`                                    |
| `/admin/consents`                                     | page                  | `src/app/admin/consents/page.tsx`                                     |
| `/admin/content`                                      | page                  | `src/app/admin/content/page.tsx`                                      |
| `/admin/content/trait-map`                            | page                  | `src/app/admin/content/trait-map/page.tsx`                            |
| `/admin/events`                                       | page                  | `src/app/admin/events/page.tsx`                                       |
| `/admin/experiences`                                  | page                  | `src/app/admin/experiences/page.tsx`                                  |
| `/admin/feedback`                                     | page                  | `src/app/admin/feedback/page.tsx`                                     |
| `/admin/legal`                                        | page                  | `src/app/admin/legal/page.tsx`                                        |
| `/admin/marketing`                                    | page                  | `src/app/admin/marketing/page.tsx`                                    |
| `/admin/members`                                      | page                  | `src/app/admin/members/page.tsx`                                      |
| `/admin/members/[accountId]`                          | page                  | `src/app/admin/members/[accountId]/page.tsx`                          |
| `/admin/research`                                     | page                  | `src/app/admin/research/page.tsx`                                     |
| `/admin/research/cognitive-interview`                 | page                  | `src/app/admin/research/cognitive-interview/page.tsx`                 |
| `/admin/research/gate-c/rewards`                      | page                  | `src/app/admin/research/gate-c/rewards/page.tsx`                      |
| `/admin/system`                                       | page                  | `src/app/admin/system/page.tsx`                                       |
| `/api/admin/advertising/campaigns`                    | POST, PUT             | `src/app/api/admin/advertising/campaigns/route.ts`                    |
| `/api/admin/advertising/creatives`                    | POST, PUT             | `src/app/api/admin/advertising/creatives/route.ts`                    |
| `/api/admin/advertising/inquiries`                    | POST                  | `src/app/api/admin/advertising/inquiries/route.ts`                    |
| `/api/admin/advertising/inquiries/[inquiryId]/detail` | GET                   | `src/app/api/admin/advertising/inquiries/[inquiryId]/detail/route.ts` |
| `/api/admin/advertising/inventory`                    | POST                  | `src/app/api/admin/advertising/inventory/route.ts`                    |
| `/api/admin/advertising/kill-switch`                  | POST                  | `src/app/api/admin/advertising/kill-switch/route.ts`                  |
| `/api/admin/advertising/mail-operations`              | POST                  | `src/app/api/admin/advertising/mail-operations/route.ts`              |
| `/api/admin/audit/export`                             | GET                   | `src/app/api/admin/audit/export/route.ts`                             |
| `/api/admin/community`                                | POST                  | `src/app/api/admin/community/route.ts`                                |
| `/api/admin/community/content`                        | POST                  | `src/app/api/admin/community/content/route.ts`                        |
| `/api/admin/community/links`                          | POST                  | `src/app/api/admin/community/links/route.ts`                          |
| `/api/admin/content`                                  | POST                  | `src/app/api/admin/content/route.ts`                                  |
| `/api/admin/core-result-feedback`                     | POST                  | `src/app/api/admin/core-result-feedback/route.ts`                     |
| `/api/admin/experiences`                              | GET, PATCH, POST, PUT | `src/app/api/admin/experiences/route.ts`                              |
| `/api/admin/feedback`                                 | POST                  | `src/app/api/admin/feedback/route.ts`                                 |
| `/api/admin/legal`                                    | POST                  | `src/app/api/admin/legal/route.ts`                                    |
| `/api/admin/marketing/campaigns`                      | PATCH, POST, PUT      | `src/app/api/admin/marketing/campaigns/route.ts`                      |
| `/api/admin/marketing/operations`                     | POST                  | `src/app/api/admin/marketing/operations/route.ts`                     |
| `/api/admin/marketing/preview`                        | POST                  | `src/app/api/admin/marketing/preview/route.ts`                        |
| `/api/admin/members/[accountId]`                      | POST                  | `src/app/api/admin/members/[accountId]/route.ts`                      |
| `/api/admin/research/decisions`                       | POST                  | `src/app/api/admin/research/decisions/route.ts`                       |
| `/api/admin/research/gate-c/rewards`                  | GET, POST             | `src/app/api/admin/research/gate-c/rewards/route.ts`                  |
| `/api/admin/research/refresh`                         | POST                  | `src/app/api/admin/research/refresh/route.ts`                         |
| `/api/admin/trait-map-guide-content`                  | POST                  | `src/app/api/admin/trait-map-guide-content/route.ts`                  |
| `/api/admin/trait-map-guide-review`                   | POST                  | `src/app/api/admin/trait-map-guide-review/route.ts`                   |

## 광고와 제휴 문의

기능 ID: `advertising`

광고주 안내와 문의 접수부터 운영 캠페인·소재 전달, 이벤트 수집, 메일 outbox까지 제공한다.

### 제공 기능

- 광고 상품 안내와 문의 폼 제출·완료
- 광고 노출·클릭·피드백 이벤트 수집
- 광고 세션과 빈도·전달 정책 적용
- 문의 보안 검증과 관리자 처리
- Resend webhook 검증과 광고 메일 outbox 처리

### 구현 위치

- `src/features/advertising`

### 자동 테스트 근거

- `src/features/advertising/AdvertisingLanding.test.tsx`
- `src/features/advertising/AdvertisingInquiryForm.test.tsx`
- `src/features/advertising/server-advertising-delivery.test.ts`
- `src/app/api/advertising/events/route.test.ts`

### 화면·API 진입점

| 경로                                      | 종류·메서드 | 소스                                                      |
| ----------------------------------------- | ----------- | --------------------------------------------------------- |
| `/ads.txt`                                | GET         | `src/app/ads.txt/route.ts`                                |
| `/advertise`                              | page        | `src/app/advertise/page.tsx`                              |
| `/advertise/inquiry`                      | page        | `src/app/advertise/inquiry/page.tsx`                      |
| `/advertise/inquiry/complete`             | page        | `src/app/advertise/inquiry/complete/page.tsx`             |
| `/api/advertising/events`                 | POST        | `src/app/api/advertising/events/route.ts`                 |
| `/api/advertising/feedback`               | POST        | `src/app/api/advertising/feedback/route.ts`               |
| `/api/advertising/inquiries`              | POST        | `src/app/api/advertising/inquiries/route.ts`              |
| `/api/internal/advertising/email-webhook` | POST        | `src/app/api/internal/advertising/email-webhook/route.ts` |
| `/api/internal/advertising/outbox/drain`  | POST        | `src/app/api/internal/advertising/outbox/drain/route.ts`  |

## 마케팅 이메일

기능 ID: `marketing_email`

선택 동의를 기반으로 마케팅 캠페인을 구성하고 발송·수신거부 상태를 안전하게 관리한다.

### 제공 기능

- 마케팅 캠페인 구성과 운영 미리보기
- 동의 기반 수신 대상 제한
- 서명된 수신거부 토큰 처리
- 메일 outbox drain과 발송 설정
- 사용자 마케팅 수신 설정 편집

### 구현 위치

- `src/features/marketing`
- `src/features/account/MarketingPreferenceEditor.tsx`

### 자동 테스트 근거

- `src/features/marketing/marketing-email-contract.test.ts`
- `src/features/marketing/server-marketing-email-renderer.test.ts`
- `src/features/marketing/server-marketing-unsubscribe-token.test.ts`
- `src/features/account/MarketingPreferenceEditor.test.tsx`

### 화면·API 진입점

| 경로                                   | 종류·메서드 | 소스                                                   |
| -------------------------------------- | ----------- | ------------------------------------------------------ |
| `/api/internal/marketing/outbox/drain` | POST        | `src/app/api/internal/marketing/outbox/drain/route.ts` |
| `/api/marketing/unsubscribe`           | POST        | `src/app/api/marketing/unsubscribe/route.ts`           |
| `/email/unsubscribe`                   | page        | `src/app/email/unsubscribe/page.tsx`                   |

## 연구 참여와 분석

기능 ID: `research`

공개 연구 안내, Gate C와 M05 참여, 제출·완료·철회, 보상 신청, 내부 분석 화면을 격리된 계약으로 제공한다.

### 제공 기능

- 연구 허브와 공개 연구 안내
- Gate C 세션 생성·응답 제출·완료·철회
- 연구 보상 신청·조회·삭제
- M05 인지 검토 참여 흐름
- 성향지도 피드백 수집과 내부 분석
- 연구 데이터와 제품 계정 데이터의 격리

### 구현 위치

- `src/features/research`
- `src/research`

### 자동 테스트 근거

- `src/features/research/gate-c/GateCPublicStudy.test.tsx`
- `src/features/research/gate-c/gate-c-server-security.test.ts`
- `src/features/research/m05/M05ParticipantRunner.test.tsx`
- `src/app/api/research/gate-c/public-route.test.ts`

### 화면·API 진입점

| 경로                                                 | 종류·메서드       | 소스                                                                 |
| ---------------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| `/api/research/gate-c/reward-entries`                | DELETE, GET, POST | `src/app/api/research/gate-c/reward-entries/route.ts`                |
| `/api/research/gate-c/sessions`                      | POST              | `src/app/api/research/gate-c/sessions/route.ts`                      |
| `/api/research/gate-c/sessions/[sessionId]/complete` | POST              | `src/app/api/research/gate-c/sessions/[sessionId]/complete/route.ts` |
| `/api/research/gate-c/submissions`                   | DELETE            | `src/app/api/research/gate-c/submissions/route.ts`                   |
| `/api/research/trait-map-feedback`                   | GET, POST         | `src/app/api/research/trait-map-feedback/route.ts`                   |
| `/research`                                          | layout            | `src/app/research/layout.tsx`                                        |
| `/research`                                          | page              | `src/app/research/page.tsx`                                          |
| `/research/gate-c`                                   | page              | `src/app/research/gate-c/page.tsx`                                   |
| `/research/gate-c/[formId]`                          | page              | `src/app/research/gate-c/[formId]/page.tsx`                          |
| `/research/gate-c/internal`                          | page              | `src/app/research/gate-c/internal/page.tsx`                          |
| `/research/gate-c/internal/analysis`                 | page              | `src/app/research/gate-c/internal/analysis/page.tsx`                 |
| `/research/result-preview/enakq`                     | page              | `src/app/research/result-preview/enakq/page.tsx`                     |
| `/research/trait-map/enakq`                          | page              | `src/app/research/trait-map/enakq/page.tsx`                          |
| `/research/trait-map/internal/analysis`              | page              | `src/app/research/trait-map/internal/analysis/page.tsx`              |

## 함께하는 밸런스 게임

기능 ID: `together_balance_game`

2~8명이 동일 문항을 선택하고 개인·그룹의 공통점과 차이를 결과 리포트로 확인한다.

### 제공 기능

- 전체·인기·취향·관계·재미 주제팩 탐색
- 방 이름·방장 닉네임·인원·문항 수·참여 방식 설정
- 익명 또는 로그인 참여자의 방 생성·코드 입장·좌석 예약
- 좌우 2지선다 응답의 즉시·멱등 저장
- 방장 마감·참여자 제거·완료 상태 동기화
- 전체·참여자별 비교와 문항별 물결 게이지 결과
- 공개 모집과 결과의 커뮤니티 공유
- 메인 캐릭터 기반 익명 프로필 배정
- 서울 리전·통합 RPC·캐시 기반 성능 최적화

### 구현 위치

- `src/features/together-balance`

### 자동 테스트 근거

- `src/features/together-balance/BalanceGameLanding.test.tsx`
- `src/features/together-balance/BalanceGameSetup.test.tsx`
- `src/features/together-balance/BalanceGameRoom.test.tsx`
- `src/features/together/together-balance-game-db-schema.test.ts`

### 화면·API 진입점

| 경로                                                                          | 종류·메서드 | 소스                                                                                          |
| ----------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `/api/together/balance-game/rooms`                                            | POST        | `src/app/api/together/balance-game/rooms/route.ts`                                            |
| `/api/together/balance-game/rooms/[code]/complete`                            | POST        | `src/app/api/together/balance-game/rooms/[code]/complete/route.ts`                            |
| `/api/together/balance-game/rooms/[code]/feed-share`                          | POST        | `src/app/api/together/balance-game/rooms/[code]/feed-share/route.ts`                          |
| `/api/together/balance-game/rooms/[code]/finalize`                            | POST        | `src/app/api/together/balance-game/rooms/[code]/finalize/route.ts`                            |
| `/api/together/balance-game/rooms/[code]/join`                                | POST        | `src/app/api/together/balance-game/rooms/[code]/join/route.ts`                                |
| `/api/together/balance-game/rooms/[code]/participants/[participantId]/remove` | POST        | `src/app/api/together/balance-game/rooms/[code]/participants/[participantId]/remove/route.ts` |
| `/api/together/balance-game/rooms/[code]/preview`                             | GET         | `src/app/api/together/balance-game/rooms/[code]/preview/route.ts`                             |
| `/api/together/balance-game/rooms/[code]/responses/[itemId]`                  | PUT         | `src/app/api/together/balance-game/rooms/[code]/responses/[itemId]/route.ts`                  |
| `/api/together/balance-game/rooms/[code]/state`                               | GET         | `src/app/api/together/balance-game/rooms/[code]/state/route.ts`                               |
| `/assessments/together/balance-game`                                          | page        | `src/app/assessments/together/balance-game/page.tsx`                                          |
| `/assessments/together/balance-game/rooms/[code]`                             | page        | `src/app/assessments/together/balance-game/rooms/[code]/page.tsx`                             |
| `/assessments/together/balance-game/rooms/[code]/result`                      | page        | `src/app/assessments/together/balance-game/rooms/[code]/result/page.tsx`                      |
| `/assessments/together/balance-game/setup`                                    | page        | `src/app/assessments/together/balance-game/setup/page.tsx`                                    |

## 공개 프로필과 소셜 안전

기능 ID: `public_profile_safety`

사용자가 허용한 프로필 요약만 공개하고 팔로우·차단·신고·검색·연결 관계를 안전하게 제공한다.

### 제공 기능

- 공개 프로필·대표 코드·공개 리포트 조회
- 팔로워·팔로잉 연결 목록
- 프로필 검색과 공개 카드 projection
- 팔로우·언팔로우
- 차단 목록 조회·차단 해제
- 프로필·콘텐츠 신고와 안전 조치
- 프로필 및 리포트 공개 범위 설정

### 구현 위치

- `src/features/public-profile`
- `src/features/moderation`

### 자동 테스트 근거

- `src/features/public-profile/CommunityProfileScreen.test.tsx`
- `src/features/public-profile/public-profile-db-schema.test.ts`
- `src/app/api/community/blocks/route.test.ts`
- `src/app/api/community/profiles/search/route.test.ts`

### 화면·API 진입점

| 경로                                                    | 종류·메서드    | 소스                                                                    |
| ------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `/api/community/blocks`                                 | DELETE, GET    | `src/app/api/community/blocks/route.ts`                                 |
| `/api/community/follow`                                 | POST           | `src/app/api/community/follow/route.ts`                                 |
| `/api/community/profile-safety`                         | POST           | `src/app/api/community/profile-safety/route.ts`                         |
| `/api/community/profiles/search`                        | GET            | `src/app/api/community/profiles/search/route.ts`                        |
| `/api/profile-report-visibility`                        | PATCH          | `src/app/api/profile-report-visibility/route.ts`                        |
| `/api/profile-visibility`                               | GET, POST, PUT | `src/app/api/profile-visibility/route.ts`                               |
| `/feed/profiles/[publicSnapshotId]`                     | page           | `src/app/feed/profiles/[publicSnapshotId]/page.tsx`                     |
| `/feed/profiles/[publicSnapshotId]/connections`         | page           | `src/app/feed/profiles/[publicSnapshotId]/connections/page.tsx`         |
| `/feed/profiles/[publicSnapshotId]/report`              | page           | `src/app/feed/profiles/[publicSnapshotId]/report/page.tsx`              |
| `/feed/profiles/[publicSnapshotId]/reports/[reportKey]` | page           | `src/app/feed/profiles/[publicSnapshotId]/reports/[reportKey]/page.tsx` |

## 커뮤니티 피드

기능 ID: `community_feed`

성향 중심 글·질문·투표·밸런스 모집·리포트 공유 콘텐츠를 읽고 작성하며 반응한다.

### 제공 기능

- 공식 콘텐츠와 사용자 글의 통합 피드 읽기
- 글·오늘의 질문·2지선다 투표 작성과 수정
- 댓글·좋아요·공감 반응·저장·관심 없음
- 투표 참여와 전체·뉴앙 코드별 익명 통계
- 태그 탐색·검색·관점 모음·내 글
- 알림 목록과 게시물 상세
- 밸런스 게임 모집·결과 공유 카드
- 외부 링크 안전 정책과 moderation 상태 처리
- 최적화된 피드 사진 저장과 내부 정리 작업

### 구현 위치

- `src/features/feed`

### 자동 테스트 근거

- `src/features/feed/CommunityFeed.test.tsx`
- `src/features/feed/feed-api.test.ts`
- `src/features/feed/server-writes.test.ts`
- `src/features/feed/FeedPollCard.test.tsx`

### 화면·API 진입점

| 경로                               | 종류·메서드 | 소스                                               |
| ---------------------------------- | ----------- | -------------------------------------------------- |
| `/api/feed`                        | GET, POST   | `src/app/api/feed/route.ts`                        |
| `/api/internal/feed-media/cleanup` | GET, POST   | `src/app/api/internal/feed-media/cleanup/route.ts` |
| `/feed`                            | page        | `src/app/feed/page.tsx`                            |
| `/feed/balance/[postId]/edit`      | page        | `src/app/feed/balance/[postId]/edit/page.tsx`      |
| `/feed/balance/new`                | page        | `src/app/feed/balance/new/page.tsx`                |
| `/feed/me`                         | page        | `src/app/feed/me/page.tsx`                         |
| `/feed/new`                        | page        | `src/app/feed/new/page.tsx`                        |
| `/feed/notifications`              | page        | `src/app/feed/notifications/page.tsx`              |
| `/feed/perspectives`               | page        | `src/app/feed/perspectives/page.tsx`               |
| `/feed/polls/[pollId]/stats`       | page        | `src/app/feed/polls/[pollId]/stats/page.tsx`       |
| `/feed/posts/[postId]`             | page        | `src/app/feed/posts/[postId]/page.tsx`             |
| `/feed/posts/[postId]/edit`        | page        | `src/app/feed/posts/[postId]/edit/page.tsx`        |
| `/feed/questions/[postId]/edit`    | page        | `src/app/feed/questions/[postId]/edit/page.tsx`    |
| `/feed/questions/new`              | page        | `src/app/feed/questions/new/page.tsx`              |
| `/feed/search`                     | page        | `src/app/feed/search/page.tsx`                     |
| `/feed/tags/[tag]`                 | page        | `src/app/feed/tags/[tag]/page.tsx`                 |

## 1:1 성향 비교

기능 ID: `public_comparison`

현재 사용자와 공개 프로필 상대의 허용된 성향 요약만 이용해 관계 리듬을 비교한다.

### 제공 기능

- 공개 프로필에서 비교 생성
- 비교 리포트 소유권·정밀 결과·정책 버전 검증
- 같은 코드 자리와 다른 코드 자리 설명
- 오해 장면·대화 질문·조율 가이드
- stale·disabled·deleted unavailable 상태
- 내 리포트에서 비교 다시 열기와 삭제
- 직접 응답·원점수·상대 비공개 추론 차단

### 구현 위치

- `src/features/together`

### 자동 테스트 근거

- `src/features/together/PublicComparisonReportView.test.tsx`
- `src/features/together/public-comparison-contract.test.ts`
- `src/features/together/public-comparison-db-schema.test.ts`
- `src/app/together/comparison/[comparisonReportId]/page.test.tsx`

### 화면·API 진입점

| 경로                                        | 종류·메서드  | 소스                                                        |
| ------------------------------------------- | ------------ | ----------------------------------------------------------- |
| `/api/public-comparison-report`             | DELETE, POST | `src/app/api/public-comparison-report/route.ts`             |
| `/api/public-comparisons`                   | POST         | `src/app/api/public-comparisons/route.ts`                   |
| `/reports/comparison/[comparisonReportId]`  | page         | `src/app/reports/comparison/[comparisonReportId]/page.tsx`  |
| `/together/comparison-preview`              | page         | `src/app/together/comparison-preview/page.tsx`              |
| `/together/comparison-unavailable/[status]` | page         | `src/app/together/comparison-unavailable/[status]/page.tsx` |
| `/together/comparison/[comparisonReportId]` | page         | `src/app/together/comparison/[comparisonReportId]/page.tsx` |

## 결과 공유

기능 ID: `sharing`

결과의 공개 가능한 스냅샷만 기간 제한 주소 또는 피드 리포트로 공유한다.

### 제공 기능

- 30일 만료 공유 주소 생성
- 비회원 결과 요약의 180일 만료 서명 주소 생성
- token hash 기반 공개 조회와 철회
- 만료·철회·삭제·비활성 상태 처리
- 결과 리포트의 피드 공유 projection
- noindex와 직접 응답·원점수·식별 정보 비노출
- 브라우저 복사 실패 시 수동 복사 fallback

### 구현 위치

- `src/features/share`

### 자동 테스트 근거

- `src/features/share/ReportShareSheet.test.tsx`
- `src/features/share/public-share-server.test.ts`
- `src/features/share/server-guest-report-share-token.test.ts`
- `src/app/share/[token]/page.test.tsx`
- `src/app/api/report-share-links/route.test.ts`
- `src/app/api/guest-report-share-links/route.test.ts`

### 화면·API 진입점

| 경로                            | 종류·메서드 | 소스                                            |
| ------------------------------- | ----------- | ----------------------------------------------- |
| `/api/guest-report-share-links` | POST        | `src/app/api/guest-report-share-links/route.ts` |
| `/api/report-share-links`       | POST        | `src/app/api/report-share-links/route.ts`       |
| `/api/revoke-share`             | POST        | `src/app/api/revoke-share/route.ts`             |
| `/api/share-links`              | POST        | `src/app/api/share-links/route.ts`              |
| `/feed/reports/[postId]`        | page        | `src/app/feed/reports/[postId]/page.tsx`        |
| `/share/[token]`                | page        | `src/app/share/[token]/page.tsx`                |

## 피드백과 제품 분석

기능 ID: `feedback_analytics`

선택 동의와 개인정보 경계를 지키며 제품 피드백, 검사 품질 관찰, 분석 이벤트를 수집한다.

### 제공 기능

- 사용자 피드백 작성과 내 피드백 조회
- 결과·코어 리포트 품질 평가
- 검사 문항 품질 관찰 수집
- 선택 동의 기반 제품 분석 이벤트
- 광고 피드백과 제품 피드백 데이터 분리

### 구현 위치

- `src/features/feedback`
- `src/features/assessment/AssessmentResultQualityPrompt.tsx`

### 자동 테스트 근거

- `src/features/feedback/ProductFeedbackForm.test.tsx`
- `src/features/feedback/product-feedback-db-schema.test.ts`
- `src/app/api/analytics/events/route.test.ts`
- `src/app/api/assessment-quality-observations/route.test.ts`

### 화면·API 진입점

| 경로                                   | 종류·메서드 | 소스                                                   |
| -------------------------------------- | ----------- | ------------------------------------------------------ |
| `/api/analytics/events`                | POST        | `src/app/api/analytics/events/route.ts`                |
| `/api/assessment-quality-observations` | POST        | `src/app/api/assessment-quality-observations/route.ts` |
| `/api/core-result-feedback`            | POST        | `src/app/api/core-result-feedback/route.ts`            |
| `/api/feedback`                        | POST        | `src/app/api/feedback/route.ts`                        |
| `/my/feedback`                         | page        | `src/app/my/feedback/page.tsx`                         |

## 온보딩·로그인·동의

기능 ID: `auth_consent_onboarding`

비회원 우선 사용을 유지하면서 필요한 순간에 안전한 OAuth 로그인, 계정 연결, 연령·필수·선택 동의를 처리한다.

### 제공 기능

- 첫 방문 서비스 가이드와 완료 상태 저장
- Kakao·Google OAuth 시작과 callback
- 내부 경로만 허용하는 안전한 인증 redirect
- 필수 약관·개인정보·만 14세 확인과 선택 분석·마케팅 동의
- 다중 OAuth 계정 연결·해제와 복구
- 인증 사용자와 내부 account 식별자의 안전한 연결
- 환경 미설정·취소·실패 닫힌 상태

### 구현 위치

- `src/features/auth`
- `src/features/consent`
- `src/features/onboarding`

### 자동 테스트 근거

- `src/features/onboarding/OnboardingGuideCarousel.test.tsx`
- `src/features/auth/sign-in-intent-security.test.ts`
- `src/features/consent/AccountConnectPanel.test.tsx`
- `src/app/auth/callback/route.test.ts`

### 화면·API 진입점

| 경로                              | 종류·메서드 | 소스                                              |
| --------------------------------- | ----------- | ------------------------------------------------- |
| `/api/auth/consent-intent`        | POST        | `src/app/api/auth/consent-intent/route.ts`        |
| `/api/auth/sign-in-intents`       | POST        | `src/app/api/auth/sign-in-intents/route.ts`       |
| `/api/me/auth/link-intents`       | POST        | `src/app/api/me/auth/link-intents/route.ts`       |
| `/api/me/auth/methods`            | GET         | `src/app/api/me/auth/methods/route.ts`            |
| `/api/me/auth/methods/[provider]` | DELETE      | `src/app/api/me/auth/methods/[provider]/route.ts` |
| `/api/me/consents`                | GET, PATCH  | `src/app/api/me/consents/route.ts`                |
| `/api/me/required-consents`       | POST        | `src/app/api/me/required-consents/route.ts`       |
| `/api/mobile/auth/finalize`       | POST        | `src/app/api/mobile/auth/finalize/route.ts`       |
| `/auth/callback`                  | GET         | `src/app/auth/callback/route.ts`                  |
| `/auth/link/callback`             | GET         | `src/app/auth/link/callback/route.ts`             |
| `/consent/required`               | page        | `src/app/consent/required/page.tsx`               |
| `/login`                          | page        | `src/app/login/page.tsx`                          |
| `/mobile/auth/callback`           | page        | `src/app/mobile/auth/callback/page.tsx`           |
| `/onboarding`                     | page        | `src/app/onboarding/page.tsx`                     |

## 마이·계정·개인 데이터

기능 ID: `account_my`

대표 성향과 내 리포트를 다시 열고 프로필·연락처·연결 계정·공개 범위·데이터 권리를 관리한다.

### 제공 기능

- 비회원·회원별 마이 요약과 대표 뉴앙 코드
- 내 프로필 조회·편집과 공개 프로필 preview
- 검사·주제·연구소·비교 리포트 통합 목록
- 진행 중 검사 이어하기와 결과 다시 열기
- 비공개 연락처와 이메일 인증
- 연결 로그인 수단 관리
- 계정 활동 기록·차단 목록·알림 준비 상태
- 로컬 데이터 export·결과 삭제·계정 삭제
- 결과 변경 후 동적 대표 성향 재계산

### 구현 위치

- `src/features/account`

### 자동 테스트 근거

- `src/features/account/MyOverview.test.tsx`
- `src/features/account/server-reads.test.ts`
- `src/features/account/delete-result-write.test.ts`
- `src/features/account/server-account-deletion.test.ts`

### 화면·API 진입점

| 경로                                         | 종류·메서드        | 소스                                                         |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| `/api/account`                               | DELETE             | `src/app/api/account/route.ts`                               |
| `/api/account-results`                       | DELETE, GET        | `src/app/api/account-results/route.ts`                       |
| `/api/me/contact`                            | DELETE, GET, PATCH | `src/app/api/me/contact/route.ts`                            |
| `/api/me/contact/email-verification/confirm` | POST               | `src/app/api/me/contact/email-verification/confirm/route.ts` |
| `/api/me/contact/email-verification/request` | POST               | `src/app/api/me/contact/email-verification/request/route.ts` |
| `/api/me/events`                             | GET                | `src/app/api/me/events/route.ts`                             |
| `/api/me/events/[entryId]`                   | DELETE             | `src/app/api/me/events/[entryId]/route.ts`                   |
| `/api/me/onboarding`                         | GET, PATCH         | `src/app/api/me/onboarding/route.ts`                         |
| `/api/me/profile`                            | GET, PATCH         | `src/app/api/me/profile/route.ts`                            |
| `/my`                                        | page               | `src/app/(tabs)/my/page.tsx`                                 |
| `/my`                                        | layout             | `src/app/my/layout.tsx`                                      |
| `/my/events`                                 | page               | `src/app/my/events/page.tsx`                                 |
| `/my/profile`                                | page               | `src/app/my/profile/page.tsx`                                |
| `/my/profile/edit`                           | page               | `src/app/my/profile/edit/page.tsx`                           |
| `/my/reports`                                | page               | `src/app/my/reports/page.tsx`                                |
| `/my/reports/history`                        | page               | `src/app/my/reports/history/page.tsx`                        |
| `/my/settings`                               | page               | `src/app/my/settings/page.tsx`                               |
| `/my/settings/account`                       | page               | `src/app/my/settings/account/page.tsx`                       |
| `/my/settings/account/delete`                | page               | `src/app/my/settings/account/delete/page.tsx`                |
| `/my/settings/blocked`                       | page               | `src/app/my/settings/blocked/page.tsx`                       |
| `/my/settings/notifications`                 | page               | `src/app/my/settings/notifications/page.tsx`                 |
| `/my/settings/visibility`                    | page               | `src/app/my/settings/visibility/page.tsx`                    |

## 코어·주제·친구 검사

기능 ID: `assessments`

비회원도 빠른·정밀 코어와 생활 주제 검사를 수행하고 자동 저장·복구·채점·결과 생성까지 완료한다.

### 제공 기능

- 빠른 코어와 정밀 코어의 시작·사전 안내·문항 진행
- 한 문항 집중형 5점 응답과 판단 어려움 사유
- IndexedDB 자동 저장·7일 이어하기·중간 체크포인트·재개
- 멱등 완료·근거 부족 보강 문항·결과 스냅샷
- 생활 주제 검사 카탈로그·진행·동적 성향 근거 반영
- 친구 성향 맞히기 초대와 결과
- 로그인 후 로컬 결과 claim과 계정 동기화
- 검사 콘텐츠 릴리스 runtime과 fallback
- 품질 피드백과 문항 관찰

### 구현 위치

- `src/features/assessment`
- `src/lib/scoring`

### 자동 테스트 근거

- `src/features/assessment/AssessmentRunner.test.tsx`
- `src/features/assessment/assessment-storage.test.ts`
- `src/features/assessment/assessment-completion.test.ts`
- `src/lib/scoring/core.test.ts`

### 화면·API 진입점

| 경로                         | 종류·메서드       | 소스                                         |
| ---------------------------- | ----------------- | -------------------------------------------- |
| `/api/assessment-progress`   | GET, PUT          | `src/app/api/assessment-progress/route.ts`   |
| `/api/claim-result`          | GET, POST         | `src/app/api/claim-result/route.ts`          |
| `/api/free-topic-results`    | DELETE, GET, POST | `src/app/api/free-topic-results/route.ts`    |
| `/assessments/[slug]`        | page              | `src/app/assessments/[slug]/page.tsx`        |
| `/assessments/friend-match`  | page              | `src/app/assessments/friend-match/page.tsx`  |
| `/assessments/topics/[slug]` | page              | `src/app/assessments/topics/[slug]/page.tsx` |

## 별난 성향 연구소와 도움 연결

기능 ID: `labs_help`

생활형 재미 검사는 로컬 결과로 제공하고 민감·위기 주제는 점수화하지 않은 도움 자원으로 연결한다.

### 제공 기능

- 별난 성향 연구소 카탈로그·문항·로컬 저장·결과
- 연구소 결과 기록과 삭제
- 코어 코드와 대표 성향을 바꾸지 않는 경계 안내
- 긴급 전화와 공식 도움 자원 연결
- 도움 화면 이용 맥락의 계정·결과 비저장
- 민감·임상 주제의 재미 검사 노출 차단

### 구현 위치

- `src/features/lab`
- `src/features/help`

### 자동 테스트 근거

- `src/features/lab/lab-assessments.test.ts`
- `src/features/lab/lab-storage.test.ts`
- `src/features/help/help-resources.test.ts`
- `src/app/help/page.test.tsx`

### 화면·API 진입점

| 경로                     | 종류·메서드       | 소스                                     |
| ------------------------ | ----------------- | ---------------------------------------- |
| `/api/lab-results`       | DELETE, GET, POST | `src/app/api/lab-results/route.ts`       |
| `/help`                  | page              | `src/app/help/page.tsx`                  |
| `/help/account-deletion` | page              | `src/app/help/account-deletion/page.tsx` |
| `/labs/[slug]`           | page              | `src/app/labs/[slug]/page.tsx`           |
| `/labs/[slug]/result`    | layout            | `src/app/labs/[slug]/result/layout.tsx`  |
| `/labs/[slug]/result`    | page              | `src/app/labs/[slug]/result/page.tsx`    |

## 뉴앙 코드와 성향지도

기능 ID: `nuang_code_map`

현재 승인 후보 체계의 32개 코드를 일관된 이름·방향·안전 경계와 함께 탐색한다.

### 제공 기능

- E/I · R/N · G/A · K/M · C/Q 다섯 자리 코드 생성
- 32개 코드 이름·가족·요약 탐색
- 내 코드와 전체 코드 지도 연결
- 코드 자리·세부 신호·상황별 설명
- 현재 measurement release와 콘텐츠 lineage 확인
- 진단·능력·관계 성공·고정 행동으로 읽히지 않는 가드레일
- 내부 facet key와 연구 전용 claim의 고객 화면 차단

### 구현 위치

- `src/features/map`
- `src/features/nuang-code`

### 자동 테스트 근거

- `src/features/map/TraitMapPreviewTemplate.test.tsx`
- `src/features/nuang-code/next-code-scheme.test.ts`
- `src/features/nuang-code/trait-map-32-profile-completeness-v2.test.ts`
- `src/features/nuang-code/trait-map-safety-contract.test.ts`

### 화면·API 진입점

| 경로          | 종류·메서드 | 소스                                 |
| ------------- | ----------- | ------------------------------------ |
| `/map`        | page        | `src/app/(tabs)/map/page.tsx`        |
| `/map/[code]` | page        | `src/app/(tabs)/map/[code]/page.tsx` |

## 결과 리포트

기능 ID: `result_reports`

로컬·계정 결과를 동일한 사용자 경험으로 열고 코드, 코드 지도, 세부 신호, 해석 경계와 다음 행동을 제공한다.

### 제공 기능

- 로컬 코어 결과와 계정 결과 리포트
- 빠른·정밀 결과별 정보 깊이와 정밀 검사 확장
- 통합 코어 리포트 섹션·읽기 내비게이션·피드백
- 생활 주제 결과와 현재 대표 성향 영향 설명
- 결과 이미지·기기 공유·공유 주소·피드 공유
- 결과 삭제와 목록 복귀
- 점수 우열·진단·경계 낙인 금지

### 구현 위치

- `src/features/result`
- `src/features/result-persistence`

### 자동 테스트 근거

- `src/features/result/LocalResultView.test.tsx`
- `src/features/result/AccountResultView.test.tsx`
- `src/features/result/unified-core-report/CoreResultReportTemplate.test.tsx`
- `src/features/result/report-copy.test.ts`
- `src/features/result-persistence/ResultContinuityCard.test.tsx`
- `src/features/result-persistence/result-continuity.test.ts`

### 화면·API 진입점

| 경로                                                | 종류·메서드 | 소스                                                                |
| --------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `/assessments/topics/[slug]/result`                 | layout      | `src/app/assessments/topics/[slug]/result/layout.tsx`               |
| `/assessments/topics/[slug]/result/[localResultId]` | page        | `src/app/assessments/topics/[slug]/result/[localResultId]/page.tsx` |
| `/reports`                                          | layout      | `src/app/reports/layout.tsx`                                        |
| `/results`                                          | layout      | `src/app/results/layout.tsx`                                        |
| `/results/account/[resultReportId]`                 | page        | `src/app/results/account/[resultReportId]/page.tsx`                 |
| `/results/local/[localResultId]`                    | page        | `src/app/results/local/[localResultId]/page.tsx`                    |

## 앱 셸·홈·주요 내비게이션

기능 ID: `home_navigation`

모바일 우선 앱 셸에서 현재 상태에 맞는 다음 행동과 홈·커뮤니티·성향지도·마이 이동을 제공한다.

### 제공 기능

- 루트에서 홈으로 안전한 진입
- 홈의 추천·나 알아보기·함께하기·연구소 URL 상태
- 진행 중 검사·최근 결과·첫 검사 중 최우선 다음 행동
- 모바일 하단 주요 메뉴와 현재 위치 표시
- 전역 경로 전환 상태와 뒤로가기
- 폐기된 함께 최상위 경로의 현재 제품 표면 redirect
- 접근성·safe area·반응형 앱 프레임

### 구현 위치

- `src/features/home`
- `src/features/navigation`

### 자동 테스트 근거

- `src/features/home/HomeDashboard.test.tsx`
- `src/features/navigation/NuangNextActionFlow.test.tsx`
- `src/app/(tabs)/home/page.test.tsx`
- `tests/e2e/smoke.spec.ts`

### 화면·API 진입점

| 경로           | 종류·메서드 | 소스                                  |
| -------------- | ----------- | ------------------------------------- |
| `/`            | layout      | `src/app/(tabs)/layout.tsx`           |
| `/`            | layout      | `src/app/layout.tsx`                  |
| `/`            | page        | `src/app/page.tsx`                    |
| `/assessments` | page        | `src/app/(tabs)/assessments/page.tsx` |
| `/home`        | page        | `src/app/(tabs)/home/page.tsx`        |
| `/together`    | page        | `src/app/(tabs)/together/page.tsx`    |

## 정책·보안·플랫폼 기반

기능 ID: `policy_security_platform`

정책 문서, 검색 노출, noindex, CSP, 환경 닫힘 상태, Supabase 경계, 전역 테마와 오류 처리를 출시 기준으로 유지한다.

### 제공 기능

- 이용약관·개인정보 처리방침 표시와 승인 상태
- 검색엔진별 고유 제목·설명·대표 이미지와 canonical 제공
- 사이트맵·robots·구조화 데이터·파비콘·앱 아이콘 관리
- 공개하면 안 되는 화면의 noindex
- CSP 보고 수집과 보안 헤더
- 환경 변수 누락 시 명시적 closed state
- Supabase auth session·proxy·service role 경계
- 전역 테마·금지 문구·이모지 회귀 검사
- 404·오류·로딩·접근성 공통 상태

### 구현 위치

- `src/features/policy`
- `src/features/copy`
- `src/features/seo`
- `src/features/mobile`
- `src/lib/api`
- `src/lib/supabase`

### 자동 테스트 근거

- `src/features/policy/PolicySkeletonView.test.tsx`
- `src/features/seo/site-config.test.ts`
- `src/app/seo-routes.test.ts`
- `src/app/noindex-metadata.test.ts`
- `src/lib/api/closed-state.test.ts`
- `src/app/api/security/csp-report/route.test.ts`

### 화면·API 진입점

| 경로                                      | 종류·메서드 | 소스                                                      |
| ----------------------------------------- | ----------- | --------------------------------------------------------- |
| `/.well-known/apple-app-site-association` | GET         | `src/app/.well-known/apple-app-site-association/route.ts` |
| `/.well-known/assetlinks.json`            | GET         | `src/app/.well-known/assetlinks.json/route.ts`            |
| `/api/security/csp-report`                | POST        | `src/app/api/security/csp-report/route.ts`                |
| `/policies/privacy`                       | page        | `src/app/policies/privacy/page.tsx`                       |
| `/policies/terms`                         | page        | `src/app/policies/terms/page.tsx`                         |
| `/support`                                | page        | `src/app/support/page.tsx`                                |

## 출시 추적 규칙

- 모든 App Router 화면·API·callback·layout은 정확한 기능 도메인에 분류한다.
- 각 기능 도메인은 실제로 존재하는 소스 루트와 자동 테스트 근거를 하나 이상 가져야 한다.
- API route는 지원 HTTP 메서드를 소스에서 추출해 문서화한다.
- 기능 동작 검증은 도메인 단위·통합 테스트와 브라우저 E2E를 함께 사용한다.
- 외부 OAuth, 메일 발송, 운영 RLS처럼 실제 credential이 필요한 항목은 자동 테스트와 별도로 출시 감사 보고서에 실환경 결과를 남긴다.
- 이 문서는 직접 수정하지 않고 `npm run release:inventory`로 갱신한다.
