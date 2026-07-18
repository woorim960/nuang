# NUANG Feed MVP Interaction Design

작성일: 2026-07-10 KST

상태: 구현 전 승인 요청 문서에서 사용자 승인 반영 후 구현 중. 이 문서는 피드 MVP 고도화의 상세 설계안이며, 승인된 범위 밖의 DB migration, API write, 화면 노출 구현은 다시 사용자 승인을 받는다.

## 목적

피드는 뉴앙의 체류 경험을 만드는 핵심 SNS 화면이다. 사용자는 피드에서 사람들의 소식을 보되, 일반 커뮤니티가 아니라 `나를 이해하고 서로를 더 이해하는 성향 탐구 놀이터`로 느껴야 한다.

이번 MVP 고도화의 목적:

- 기존 인스타그램/스레드형 피드 UI 리듬은 유지한다.
- 피드와 커뮤니티를 따로 부르지 않고 `피드`만 사용한다.
- 사용자가 분류를 직접 고르는 복잡한 UX를 줄인다.
- 피드 작성 순간에 자연스럽게 성향 기반 콘텐츠가 만들어지게 한다.
- 검사 리포트 공유는 각 리포트 화면에서 시작하고, 피드 작성기에서는 글, 오늘의 질문, 밸런스 게임만 노출한다.
- 오늘의 질문, 밸런스 게임, 리포트 공유 preview를 피드의 핵심 재미 장치로 만든다.
- 뉴앙 코드별 통계를 통해 `내 코드와 비슷한 사람들은 어떻게 답했을까?`라는 호기심을 만든다.

## 현재 기반

이미 있는 것:

- `/feed` 별도 화면
- 인스타그램/스레드형 단일 스트림 UI
- 스토리 영역
- 기본 글 composer
- 서버 read payload
- feed schema
- `feed_post`, `feed_comment`, `feed_reaction`, `feed_bookmark`, `feed_preference`
- `not_interested`
- seed card 반응/저장
- 공개 프로필 팝업 연결

부족한 것:

- 작성 형식 선택 UX가 아직 단순 select다.
- `오늘의 질문`은 질문 제안 흐름이 아니라 단순 source 값이다.
- `밸런스 게임` 투표 모델이 없다.
- 투표 후 결과와 뉴앙 코드별 통계가 없다.
- 리포트 공유 preview는 피드 작성기 선택지가 아니라 리포트 화면의 공유 액션에서 생성된다.
- 피드 post source에 `report_share`, `balance_game`이 없다.

## MVP 범위

이번 단계에서 구현 후보로 제안하는 범위:

1. 피드 작성 형식
2. 오늘의 질문 작성 흐름
3. 밸런스 게임 투표 글
4. 리포트 공유 preview
5. 투표 결과
6. 뉴앙 코드별 통계 보기
7. 기본 moderation과 민감 질문 제한

이번 단계에서 열지 않는 것:

- DM
- 팔로우 시스템
- 알고리즘 추천 고도화
- 영상/이미지 업로드
- 실시간 알림
- 궁합 점수
- 연애 성공 가능성
- 민감 검사 결과 기반 피드
- 성인용 질문

## 작성 형식

피드 작성 화면 상단에는 사용자가 직접 작성할 수 있는 세 가지 형식만 둔다.

| 형식 | 사용자 화면 이름 | 역할 |
|---|---|---|
| free_text | 글 | 사용자가 자유롭게 쓰는 글 |
| daily_question | 오늘의 질문 | 서비스가 쉬운 질문을 제안하고 사용자가 답함 |
| balance_game | 밸런스 게임 | 질문과 선택지 중 하나를 고르고 업로드함 |

UI 원칙:

- 둥근 태그 UI처럼 보이지 않게 한다.
- 컬러 박스 안 아이콘을 쓰지 않는다.
- 선택지는 얇은 하단선, 굵기, 간격으로 구분한다.
- 기본 첫 선택은 `글`이다.
- 한 화면에서 너무 많은 선택지를 보여주지 않는다.
- 상세 입력은 선택한 형식에만 필요한 만큼 나타난다.
- `리포트 공유`는 피드 composer 선택지로 노출하지 않는다.

권장 UI:

- composer 상단: `글`, `오늘의 질문`, `밸런스 게임`
- 선택 상태: 텍스트 굵기 + 얇은 underline
- 본문 영역: Instagram/Threads처럼 단순한 textarea
- 하단: 보조 문구 1줄 + 게시 버튼

## 오늘의 질문

사용자 경험:

1. 사용자가 피드 composer에서 `오늘의 질문`을 누른다.
2. 서비스가 질문 하나를 보여준다.
3. 사용자는 그 질문에 답하듯 글을 작성한다.
4. 게시된 피드에는 질문과 답변이 함께 보인다.
5. 다른 사용자는 글처럼 반응, 댓글, 저장할 수 있다.

질문 예시:

- `오늘 저녁 시간은 누구와 함께 보내시나요?`
- `요즘 나를 가장 편하게 해주는 루틴은 무엇인가요?`
- `오늘 누군가에게 고마웠던 순간이 있었나요?`
- `혼자 있고 싶은 날, 나는 어떤 신호를 보내나요?`
- `기분이 좋아졌다는 걸 가장 먼저 느끼는 순간은 언제인가요?`

데이터 설계:

- source: `daily_question`
- source_id: 질문 template id
- body: 사용자 답변
- public_projection_payload:
  - promptId
  - promptText
  - promptVersion

MVP 운영:

- 질문 template은 우선 코드 seed로 관리한다.
- 추후 운영자가 바꾸기 쉬워야 하므로 DB table로 확장 가능하게 id와 version을 둔다.
- 질문은 민감도 낮은 생활형 질문부터 시작한다.

## 밸런스 게임

사용자 경험:

1. 사용자가 composer에서 `밸런스 게임`을 누른다.
2. 서비스가 질문과 선택지를 보여준다.
3. 사용자는 하나를 고르고, 원하면 짧은 설명을 덧붙인다.
4. 게시 후 다른 사용자는 선택지를 눌러 투표한다.
5. 투표 전에는 전체 결과를 흐리게 보여주거나 숨긴다.
6. 투표 후 전체 선택 수와 비율을 보여준다.
7. `뉴앙 코드별 통계 보기`를 누르면 코드별 선택 비율 화면으로 이동한다.

MVP 질문 예시:

- `나 혼자 여행 간다면?` 선택지: `산`, `바다`
- `평소 내가 고르는 음식은?` 선택지: `짜장`, `짬뽕`
- `하루 쉬는 날 더 끌리는 건?` 선택지: `아무 계획 없이 쉬기`, `가고 싶던 곳 다녀오기`
- `내가 더 힘든 상황은?` 선택지: `말없이 멀어지는 사람`, `계속 확인하려는 사람`

MVP에서 보류할 질문:

- 외도, 성적 주제, 폭력, 자해, 약물, 정신질환, 특정 집단 혐오로 번질 수 있는 질문
- `육체적 바람 vs 심리적 바람` 같은 강한 관계 주제

데이터 설계:

- source: `balance_game`
- feed.feed_poll
  - id
  - post_id
  - prompt_id
  - question
  - status
  - created_at
- feed.feed_poll_option
  - id
  - poll_id
  - option_key
  - label
  - sort_order
- feed.feed_poll_vote
  - id
  - poll_id
  - option_id
  - account_id
  - nuang_code
  - profile_name
  - created_at
  - deleted_at
  - unique active vote per account per poll

투표 원칙:

- 투표는 로그인 사용자만 가능하다.
- 비회원이 투표하려 하면 로그인 화면으로 보낸다.
- 사용자는 한 투표에 하나의 선택만 할 수 있다.
- 재선택을 허용할지는 MVP에서 막는다. 추후 변경 가능하다.
- 투표 집계는 개인을 식별할 수 없게 보여준다.

뉴앙 코드 저장:

- 투표 당시 사용자의 현재 뉴앙 코드를 vote snapshot으로 저장한다.
- 이유: 시간이 지나 코드가 바뀌어도 당시 통계가 흔들리지 않게 하기 위해서다.
- 저장 항목은 `nuang_code`, `profile_name` 정도만 사용한다.
- 원점수, 직접 응답, 세부 신호 원본은 저장하지 않는다.

## 뉴앙 코드별 통계 보기

사용자 경험:

1. 사용자가 밸런스 게임에 투표한다.
2. 전체 결과를 본다.
3. 더 궁금하면 `뉴앙 코드별 통계 보기`를 누른다.
4. 화면에는 각 뉴앙 코드별 선택 비율이 나온다.

표시 방식:

- 기본은 전체 결과를 먼저 보여준다.
- 코드별 통계는 별도 화면 또는 bottom sheet로 연다.
- MVP에서는 별도 route 권장: `/feed/polls/[pollId]/stats`
- 각 코드 row:
  - 뉴앙 코드
  - 코드 이름
  - 선택지별 비율
  - 응답 수

프라이버시 기준:

- 특정 뉴앙 코드의 응답 수가 1명 이상이면 코드별 비율을 보여준다.
- 특정 뉴앙 코드의 응답 수가 0명이면 해당 코드는 목록에서 숨긴다.
- 전체 투표 수가 2명 이상이면 코드별 통계로 진입할 수 있다.
- 비공개 프로필 사용자의 투표도 통계에는 익명 집계로만 반영할 수 있다.
- 개인 선택 목록은 누구에게도 공개하지 않는다.
- 코드별 통계에서는 누가 투표했는지 알 수 없다. 선택한 사람 목록, 계정 식별자, 프로필 링크는 절대 노출하지 않는다.

## 리포트 공유 Preview

사용자 경험:

1. 사용자가 결과 리포트에서 `공유하기`를 누른다.
2. 공유 방식 선택 중 `피드에 공유`를 선택한다.
3. 서비스가 공개 가능한 preview만 포함한 피드 글을 생성한다.
4. 피드에서는 핵심 preview만 보이고, 누르면 공유용 리포트로 이동한다.
5. 피드에 공유된 리포트 preview와 연결은 작성자가 해당 피드 글을 삭제하기 전까지 유지된다.

피드 preview 구성:

- 뉴앙 코드
- 코드 이름
- 캐릭터/프로필 이미지
- 코드 지도 요약
- 검사 이름
- 완료일
- `리포트 보기`

피드 preview 금지:

- 직접 응답
- 원점수
- 내부 채점 payload
- 민감 검사 결과
- 도움 요청 기록
- OAuth 정보
- 이메일

데이터 설계:

- source: `report_share`
- attachment_payload:
  - type: `result_summary`
  - resultReportId
  - shareToken 또는 shareUrl id
  - assessmentId
  - title
  - feedLifetime: `until_post_deleted`
- public_projection_payload:
  - nuangCode
  - profileName
  - profileImage
  - completedAt
  - domainSummary
  - reportHref

공유 링크 원칙:

- 일반 링크 복사 공유와 피드 공유는 수명이 다르다.
- 일반 링크 복사 공유는 기존 공유 정책을 따를 수 있다.
- 피드에 공유된 리포트는 30일 자동 만료를 적용하지 않는다.
- 작성자가 해당 피드 글을 삭제하지 않는 한 피드의 리포트 preview와 연결은 유지된다.
- 사용자가 공유 링크를 별도 관리하지 않게 한다.

## API 설계

기존 `/api/feed`를 확장한다.

추가 요청:

```ts
create_post source:
  | "free_text"
  | "daily_question"
  | "balance_game"
  | "report_share"
```

추가 action 후보:

```ts
vote_poll
remove_poll_vote
```

MVP 권장:

- post 생성은 기존 `create_post`를 확장한다.
- 투표는 별도 action `vote_poll`로 처리한다.
- 통계 읽기는 `GET /api/feed/polls/[pollId]/stats` 또는 server read 함수로 분리한다.

검증:

- daily_question은 유효한 prompt id만 허용한다.
- balance_game은 서버가 제공한 prompt id와 option만 허용한다.
- report_share는 해당 계정이 접근 가능한 결과 리포트만 허용한다.
- 모든 write는 로그인 필수다.
- public_projection_payload는 서버에서 생성한다. 클라이언트가 보낸 공개 요약을 그대로 믿지 않는다.

## DB 변경 제안

새 migration 후보:

`supabase/migrations/202607100003_feed_mvp_interactions.sql`

변경 내용:

- feed.feed_post source check에 `balance_game`, `report_share` 추가
- feed.feed_poll 추가
- feed.feed_poll_option 추가
- feed.feed_poll_vote 추가
- RLS 추가
- API role grant 추가
- schema reload notify 추가

추후 운영용 확장:

- feed.feed_prompt_template
- feed.feed_prompt_release
- feed.feed_poll_stats_daily

MVP에서는 prompt template DB화는 보류하고 코드 seed로 시작 가능하다.

## 화면 구조

### /feed

유지:

- 상단 NUANG header
- 추천/팔로잉 탭
- 스토리 영역
- 단일 스트림
- 얇은 경계선
- 여백과 타이포 중심
- 프로필 클릭 팝업

개선:

- Composer select 제거
- 작성 형식 텍스트 탭 도입
- 선택한 형식별 입력 UI
- report preview card
- poll card

### 밸런스 게임 피드 카드

구조:

- 작성자
- 질문
- 선택지 2개
- 내가 선택한 항목
- 전체 비율
- 참여 수
- `뉴앙 코드별 통계 보기`

UI:

- 선택지는 큰 버튼처럼 과하게 만들지 않는다.
- 얇은 선, 퍼센트 바, 텍스트 중심으로 구성한다.
- 컬러 박스 아이콘과 둥근 태그 UI를 쓰지 않는다.

### 리포트 공유 피드 카드

구조:

- 작성자 문장
- 리포트 preview
- 뉴앙 코드
- 코드 이름
- 캐릭터/프로필 이미지
- `리포트 보기`

UI:

- 카드처럼 보이되 과한 그라데이션을 쓰지 않는다.
- Instagram/Threads 피드 안의 첨부 preview처럼 자연스럽게 들어간다.

## Moderation

MVP 기본 원칙:

- 모든 새 post는 `pending_review`로 저장한다.
- MVP 데모에서는 운영자가 직접 published로 바꿀 수 있다.
- 또는 dev/demo 환경에서는 seed와 내 글만 즉시 표시하는 별도 정책을 둘 수 있다.

자동 제한:

- 민감 키워드가 포함된 밸런스 게임 prompt는 생성 불가
- 직접 응답, 원점수, 민감 검사 결과 포함 불가
- 비방, 혐오, 성적 콘텐츠, 위기 콘텐츠는 신고/제한 대상

## 구현 순서 제안

F-001. Feed MVP contract 확장

- feed source에 `balance_game`, `report_share` 추가
- request schema 추가
- attachment/projection 타입 추가
- 테스트 추가

F-002. Prompt seed 추가

- 오늘의 질문 seed
- 밸런스 게임 seed
- 민감 질문 금지 테스트

F-003. DB migration 설계

- poll table
- vote table
- RLS
- grants
- schema test

F-004. Composer UI 개선

- select 제거
- 작성 형식 텍스트 탭
- today question prompt
- balance game option picker
- report share placeholder

F-005. Poll card 렌더링

- 선택 전 UI
- 선택 후 전체 결과
- 로그인 필요 상태
- seed poll preview

F-006. Vote API

- vote_poll action
- unique active vote
- account required
- current nuang code snapshot

F-007. Poll stats screen

- `/feed/polls/[pollId]/stats`
- 전체 통계
- 뉴앙 코드별 통계
- 0명 코드만 숨김

F-008. Report share preview

- 결과 리포트에서 피드 공유 진입
- share token 생성/재사용
- public projection 생성
- feed card 렌더링

F-009. QA

- `npm run harness:check`
- feed contract tests
- schema tests
- composer tests
- poll card tests
- server write tests
- smoke with demo seed

## 승인 요청

구현 전 승인받아야 할 항목:

1. 피드 작성 형식을 `글`, `오늘의 질문`, `밸런스 게임` 세 가지로 둔다.
2. 오늘의 질문은 사용자가 분류를 입력하는 방식이 아니라 서비스가 질문을 제안하는 방식으로 구현한다.
3. 밸런스 게임은 MVP에서 2지선다 투표만 지원한다.
4. 뉴앙 코드별 통계는 1명 이상 투표한 코드만 보여주고, 0명인 코드는 숨긴다. 전체 투표 수가 2명 이상이면 코드별 통계로 진입할 수 있다.
5. 리포트 공유 preview는 리포트 화면에서 시작하며, 공유용 결과 리포트의 공개 요약만 사용하고 피드 글이 삭제되기 전까지 유지한다.
6. 피드 source에 `balance_game`, `report_share`를 추가한다.
7. poll/vote DB migration을 새로 추가한다.
8. 민감 질문과 성인성 질문은 MVP에서 열지 않는다.
