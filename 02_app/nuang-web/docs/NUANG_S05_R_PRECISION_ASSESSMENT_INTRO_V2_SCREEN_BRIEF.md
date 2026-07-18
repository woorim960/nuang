# NUANG S05-R 정밀 성향 검사 소개 v2 화면 brief

작성일: 2026-07-18 KST  
상태: `PRODUCTION_V1_LOCALHOST_OWNER_REVIEW`  
작업 ID: `UIX-02_PRECISION_ENTRY_V2_PRODUCTION`  
대체 문서: [NUANG_S05_R_PRECISION_ASSESSMENT_INTRO_V1_SCREEN_BRIEF.md](./NUANG_S05_R_PRECISION_ASSESSMENT_INTRO_V1_SCREEN_BRIEF.md)

## 0. v2 결론

v1의 진입 상태 시뮬레이터와 보라색 중심 카드 구성을 폐기하고, S05-R을 `정밀 성향 검사를 처음 시작하기 전 한 번만 보여주는 가치 설명·결정 화면`으로 단순화한다.

1. 고객 문구에서 `빠른 결과`를 전부 제거하고 `첫 성향 검사`, `첫 성향 결과`, 문맥상 `방금 확인한 성향`으로 바꾼다.
2. 진행 중인 정밀 검사는 S05-R을 건너뛰고 공통 검사 실행기로 바로 이어간다.
3. 완료된 정밀 검사가 있으면 S05-R이 아니라 대표 코드 리포트로 이동한다.
4. S05-R은 `왜 하는지 → 무엇을 받는지 → 안심할 수 있는지 → 시작`만 보여준다.
5. 화면 전체를 보라색으로 칠하지 않고 neutral surface에 브랜드 강조색을 작은 코드 mark와 동작에만 사용한다.
6. 화면 안의 카드 중첩, 상태 선택기, release 설명, 응답 수 fixture, 반복 lens motion을 제거한다.
7. 실제 구현은 S번호가 아니라 의미 ID와 mode를 사용한다.

```text
QUICK_RESULT_REPORT
→ PRECISION_ASSESSMENT_INTRO
→ CORE_ASSESSMENT_RUNNER(mode=precision)
→ PRECISION_RESULT_REPORT
```

`S06-R 정밀 실행기`라는 별도 component를 만들지 않는다. 이미 설계된 S03-R 공통 runner pattern을 `mode=precision`으로 재사용한다.

## 1. 고객 용어 계약

| 내부 코드·기술 문서       | 고객 화면 기본 명칭 | 문맥 안의 자연스러운 표현           |
| ------------------------- | ------------------- | ----------------------------------- |
| `QUICK`, quick assessment | 첫 성향 검사        | 처음 해본 검사                      |
| quick result              | 첫 성향 결과        | 방금 확인한 성향, 방금 본 검사 결과 |
| provisional code          | 예비 코드           | 방금 확인한 코드                    |
| precision/full assessment | 정밀 성향 검사      | 내 대표 코드를 알아보는 검사        |
| representative code       | 대표 코드           | 내 대표 코드                        |

- `빠른 결과`는 결과 생성 속도가 빠르다는 뜻으로 오해되므로 고객 화면에서 금지한다.
- 내부 DB·API·analytics의 `QUICK`, `quickAttemptId`는 migration 비용과 기술 의미 때문에 유지할 수 있다.
- `첫 성향 검사`는 짧고 쉽게 시작하는 첫 검사라는 제품 역할을 말하며, 검사 품질이 낮다는 뜻이 아니다.
- S04-R tag도 `첫 성향 결과 · 예비 코드`로 바꾼다.

## 2. S05-R이 사용되는 정확한 순간

### 첫 방문 골든 패스

```text
첫 실행 가이드
→ 첫 성향 검사
→ 첫 성향 결과 리포트
→ 내 성향을 더 자세히 알아보기
→ S05-R 정밀 성향 검사 소개
→ 공통 runner(mode=precision)
→ 대표 코드 리포트
→ 홈
```

### 재방문

```text
첫 성향 결과만 있음 + 정밀 검사 미시작
→ 홈 primary: 내 대표 코드 알아보기
→ S05-R

정밀 검사 진행 중
→ 홈 primary: 정밀 검사 이어하기
→ S05-R 생략
→ 마지막 확인 응답 다음 문항

정밀 검사 완료
→ 홈 primary: 내 대표 코드 보기
→ S05-R 생략
→ 대표 코드 리포트
```

### 관계 비교·코드 지도 gate

대표 코드가 필요한 기능에서 진입했다면 짧은 gate 설명 뒤 S05-R을 보여주고 `returnDestination`을 보존한다. 정밀 검사 완료 뒤 사용자가 원래 하려던 비교·코드 지도 기능으로 돌아간다.

### 재검사

이미 정밀 검사를 완료한 사용자의 재검사는 S05-R 최초 소개와 다른 흐름이다. 기존 결과 보존, 재검사 이유, 새 release 여부를 별도 화면 또는 sheet에서 안내한다.

## 3. route guard

S05-R을 그릴지 클라이언트가 추측하지 않는다. entry resolver가 다음 결정을 먼저 내린다.

```ts
type PrecisionEntryDecision =
  | {
      action: "SHOW_INTRO";
      entrySource:
        | "FIRST_RESULT"
        | "HOME"
        | "COMPARE_GATE"
        | "CODE_MAP_GATE"
        | "DEEP_LINK";
      sourceAttemptId: string | null;
      provisionalCode: string | null;
      reusableAnswerCount: number;
      remainingItemCount: number | null;
      estimatedMinutesMin: number | null;
      estimatedMinutesMax: number | null;
      returnDestination: string | null;
      measurementReleaseId: string;
      contentVersion: string;
    }
  | { action: "REDIRECT_ATTEMPT"; attemptId: string }
  | { action: "REDIRECT_REPORT"; reportId: string }
  | { action: "REDIRECT_FIRST_ASSESSMENT" };
```

판정 순서:

```text
현재 measurement release의 완료 정밀 결과
→ REDIRECT_REPORT

현재 release의 진행 중 정밀 attempt
→ REDIRECT_ATTEMPT

정밀 검사를 시작할 수 있는 상태
→ SHOW_INTRO

정밀 검사에 필요한 선행 결과도 없음
→ REDIRECT_FIRST_ASSESSMENT
```

`returnDestination`은 허용된 내부 route만 받는다. 외부 URL, 소유권이 없는 result·attempt ID, 고객이 접근할 수 없는 기능으로 이동시키지 않는다.

## 4. v2 고객 콘텐츠

### 앱바

- 제목: `정밀 성향 검사`
- 첫 결과 진입 back: `결과로`
- 접근성 이름: `첫 성향 결과로 돌아가기`
- 홈·gate 진입에서는 진입 source에 맞춰 `홈으로` 또는 원래 기능명으로 바꾼다.

### Hero

- 보조 문구: `내 대표 코드를 찾는 다음 단계`
- 제목: `내 성향을 더 자세히 알아볼까요?`
- 설명: `방금 확인한 성향을 출발점으로, 더 다양한 생활 상황에서 나의 모습을 살펴봐요.`

검사 허브·deep link 진입에서 방금 확인한 결과가 없다면 다음 설명으로 교체한다.

`더 다양한 생활 상황에서 나의 모습을 살펴보고, 다섯 글자 대표 코드와 상세 리포트로 정리해요.`

### 코드 연결 시각화

```text
방금 확인한 코드
E R G K C
     →
내 대표 코드와 상세 리포트
```

- `지금 먼저 보인 방향`, `더 자세히 확인한 뒤`처럼 해석이 필요한 문구는 제거한다.
- 대표 코드가 반드시 같은 글자로 확정된다는 애니메이션은 사용하지 않는다.
- 다섯 글자와 연결선은 `더 많은 근거와 설명을 더한다`는 과정만 보여준다.
- `첫 성향 결과도 내 리포트에서 다시 볼 수 있어요`를 긍정형 보존 안내로 제공한다.

### 검사를 마치면

1. `다섯 글자의 의미가 더 분명해져요`
   - 여러 상황에서 반복해서 나타나는 성향을 확인한다.
2. `나를 설명하는 내용이 더 구체적이에요`
   - 상황에 따라 달라지는 모습과, 일부 성향에서 검증된 처음 드는 생각·실제 나타나는 반응을 제공한다.
3. `가족·친구·연인과 비교할 수 있어요`
   - 원하는 사람과 공통점과 차이점을 더 자세히 살핀다.

`정확도가 높아진다`, `신뢰도가 N배다`처럼 파일럿 근거가 없는 주장은 하지 않는다.

### 시작하기 전에

재사용 호환 검증을 통과한 경우에만:

- `첫 성향 검사에서 이미 답한 내용은 다시 묻지 않아요.`
- 실제 데이터가 준비되면 `이미 답한 N개 질문은 다시 묻지 않아요.`로 개인화할 수 있다.

항상 제공:

- `답변 내용은 다른 사람에게 공개되지 않으며, 중간에 멈춰도 이어서 할 수 있어요.`

### 행동

- primary: `내 대표 코드 알아보기`
- first result 진입 secondary: `나중에 할게요` → 홈
- 홈·gate 진입에서는 상단 back과 목적이 중복되면 secondary를 숨긴다.

## 5. v1에서 제거한 것

- 고객-facing `빠른 결과`
- 바깥 `새로 시작·빠른 답 이어쓰기·진행 중 이어하기` 상태 버튼
- `24개 응답부터 이어서` fixture
- release·채점키 호환 조건 설명
- `틀렸다는 뜻은 아니에요` 같은 방어적 문장
- `왜 정밀 검사가 필요한가요?` 추가 disclosure
- 앱 전체 보라색 배경
- hero 이중 gradient와 우측 장식 ring
- 캐릭터 위의 부유 lens
- 보라·민트·핑크의 서로 다른 benefit icon 면
- 큰 sticky footer가 본문을 덮는 내부 scroll

기술 조건과 검사 연구 근거는 소개 화면이 아니라 별도 `뉴앙 검사는 어떻게 만들어지나요?` 신뢰 페이지에서 제공한다.

## 6. 고객 만족을 위해 추가할 기능

### P0 · MVP 필수

1. `entrySource`별 intro 문구와 back 목적지
2. 진행 중이면 intro 생략 후 직접 재개
3. 완료 결과가 있으면 대표 코드 리포트로 직접 이동
4. `returnDestination` 보존과 완료 뒤 원래 기능 복귀
5. 검증된 답 재사용과 `다시 묻지 않음` 조건부 안내
6. 시작 attempt 중복 생성 방지
7. 시작 loading·실패·재시도 상태
8. 답변 비공개와 결과 공유 범위 분리
9. release 만료·오프라인·응답 저장 실패 복구
10. 첫 결과와 기존 정밀 결과 보존

### P1 · 만족과 재미

1. S04 코드와 캐릭터가 S05로 자연스럽게 이어지는 shared-element transition
2. 관계 비교에서 진입한 경우 `대표 코드를 확인하면 원하는 사람과 공통점과 차이점을 살펴볼 수 있어요`로 효용 개인화
3. runner의 중립적 progress milestone과 캐릭터 반응
4. 정밀 리포트에서 열리는 `대표 코드·상세 설명·관계 비교` outcome preview
5. 시작 성공 haptic과 220ms 안팎의 짧은 브랜드 전환

runner의 milestone은 답변 방향이나 중간 점수를 노출하지 않는다. `한 자리에서 어떤 답이 강해졌다`는 피드백은 후속 응답을 오염시킬 수 있다.

### P2 · 데이터 축적 뒤

- 실제 완료시간 분포 기반 개인 예상 시간 범위
- 중단 구간별 콘텐츠·문항 묶음 최적화
- 사용자에게 도움이 되는 시점에만 나타나는 정밀 검사 재안내

### 보류

- streak, 포인트, 배지, leaderboard
- 검사 중간 코드 점수·방향 공개
- urgency와 countdown
- 근거 없는 정확도·신뢰도 수치
- adaptive testing 실시간 도입
- 정밀 검사 시작 전 강제 로그인

검사의 재미는 점수 경쟁이 아니라 `이미 한 답이 이어지고, 무엇을 더 알게 되며, 완료 뒤 어떤 기능이 열리는지`를 분명히 보여주는 데서 만든다.

## 7. 예상 시간·문항 수

고객은 시작 전 노력의 크기를 알아야 한다. 다만 파일럿 전 숫자를 임의로 만들지 않는다.

- `remainingItemCount`는 활성 release와 재사용된 답을 제외한 서버 계산값이다.
- 예상 시간은 release별 실제 완료시간 중앙값과 충분한 표본이 있을 때만 범위로 제공한다.
- 예: `남은 질문 42개 · 약 8–12분`은 실제 값이 준비된 뒤에만 노출한다.
- 값이 없으면 숫자를 감추고 `중간에 멈춰도 이어서 할 수 있어요`만 제공한다.
- 숫자는 코드 정확도나 사용자 능력 점수처럼 보이지 않게 effort 정보로만 표시한다.

## 8. 시각 디자인 계약

### 색

- app surface는 `--card`, 바깥은 `--background`를 사용한다.
- 보라는 전체 배경이 아니라 코드 mark, 연결선, 선택·동작의 작은 강조에만 사용한다.
- 핑크·민트 장식색을 이 화면에서 제거한다.
- CTA는 gradient보다 한 가지 primary surface를 사용한다.
- hairline은 `--border`, 본문은 `--foreground`, 보조 문구는 `--muted-foreground`를 사용한다.
- light·dark theme에서 모두 같은 semantic token 계약을 지킨다.

### 여백

- 전체 콘텐츠 좌우 여백: `clamp(18px, 5.8vw, 24px)`
- 390px section 간격: 32–40px
- 320px section 간격: 28–36px
- hero 제목·설명은 전체 콘텐츠 폭을 사용한다.
- 캐릭터와 code rail은 제목 아래 별도 행에 둔다.
- 모든 본문·divider·CTA의 왼쪽 기준선을 하나로 맞춘다.

### 캐릭터와 icon

- 캐릭터는 hero 한 곳에서만 사용한다.
- 코드로 만든 lens나 모호한 장식물을 겹치지 않는다.
- 캐릭터 뒤에는 accent 기반의 매우 약한 halo와 접지 그림자만 둔다.
- benefit icon은 같은 크기의 단색 Lucide line icon으로 통일한다.
- 운영체제 emoji는 사용하지 않는다.

### motion

- hero는 8px 아래에서 한 번 안착한다.
- 다섯 코드 글자는 짧은 순차 reveal을 사용한다.
- 연결선은 한 번만 채워진다.
- benefit은 60–80ms 간격으로 짧게 나타난다.
- 반복 부유 motion은 사용하지 않는다.
- primary를 누르면 즉시 loading label, disabled, `aria-busy=true`로 중복 탭을 막는다.
- 실패 시 CTA 위 또는 아래에 복구 가능한 오류와 재시도를 제공한다.
- `prefers-reduced-motion`에서는 모든 reveal을 즉시 완료한다.

## 9. 반응형·접근성

- production은 중첩 app scroll이 아니라 document scroll을 사용한다.
- 320px에서 콘텐츠 유효 폭을 최소 284px 확보한다.
- 320px에서는 제목과 캐릭터를 같은 행에 넣지 않는다.
- code rail 아래 행에서만 `journey + 72px 캐릭터`로 재배치한다.
- 390px 캐릭터는 88–96px, 320px에서는 72–82px를 사용한다.
- full-width CTA는 48px 이상, 핵심 touch target은 44px 이상을 목표로 한다.
- safe area는 `env(safe-area-inset-bottom)`으로 처리한다.
- 200% 확대·긴 한국어·landscape에서도 수평 overflow가 없어야 한다.
- `h1`은 한 개, 효용은 semantic list를 사용한다.
- loading 결과는 `aria-live=polite`, 실패는 `role=alert`로 안내한다.
- focus를 footer로 강제로 이동하지 않는다.
- CTA는 본문을 덮지 않는다.

## 10. API·DB 구현 계약

### entry API

- `GET /api/assessments/nu-core-full/entry-context`
- anonymous IndexedDB resolver와 account server resolver가 같은 `PrecisionEntryDecision`을 반환한다.

### attempt 시작

```text
POST /api/assessments/nu-core-full/attempts
body:
  sourceAttemptId
  entryContextVersion
  idempotencyKey
  returnDestination
```

- 신규 생성: `201`
- 다른 탭·중복 탭으로 이미 생성됨: 기존 active attempt `200`
- attempt 생성 성공 전 runner로 이동하지 않는다.
- 시작 실패 시 화면을 유지하고 재시도한다.

### 답 재사용

현재 quick/full의 item-set release ID가 다르므로 `quick.release_id = precision.release_id` 조건을 사용하면 안 된다. 공통 `measurement_release_id`와 명시적인 reuse manifest가 필요하다.

```text
quick.measurement_release_id = precision.measurement_release_id
AND reuse_manifest가 quick item-set release → precision item-set release를 허용
AND 각 문항의
  item_id
  item_content_version
  response_scale_version
  scoring_key_version
  construct_version
  reverse_scoring
가 모두 일치
```

재사용 응답은 정밀 attempt에 당시 값과 version을 불변 복사하고 `imported_from_response_id`로 출처를 남긴다.

### DB migration 필드

`assessment_attempt`:

- `measurement_release_id`
- `source_attempt_id`
- `last_confirmed_item_id`
- `resume_expires_at`
- `updated_at`
- `start_idempotency_key`
- assessment 진행 상태와 account claim 상태 분리
- 로그인 계정의 동일 release active attempt partial unique index

`assessment_response`:

- `item_content_version`
- `response_scale_version`
- `scoring_key_version`
- `construct_version`
- `imported_from_response_id`
- `confirmed_at`
- `updated_at`

anonymous IndexedDB에는 `assessmentId:measurementReleaseId` active unique key 또는 deterministic attempt ID와 Web Lock을 사용한다. 현재 `get → create → put`만으로는 다중 탭 중복을 막지 못한다.

## 11. 분석 이벤트

```text
precision_entry_resolved
precision_intro_viewed
precision_intro_primary_tapped
precision_intro_deferred_to_home
precision_intro_back_tapped
precision_attempt_start_requested
precision_attempt_start_succeeded
precision_attempt_start_failed
precision_attempt_existing_returned
precision_answers_reused
precision_resume_succeeded
```

허용 속성:

- `entry_source`
- `entry_state`
- `measurement_release_id`
- `content_version`
- `reusable_count_bucket`
- `answered_count_bucket`
- `latency_bucket`
- `failure_category`

금지 속성:

- 응답값·item ID·문항 원문
- 코드·세부 성향 점수·가까운 자리
- attempt·report·account ID
- 개인 식별 정보

S05의 `나중에 할게요`를 실패로 분류하지 않는다. 시작 실패율, 중복 attempt율, 재개 성공률, 정밀 검사 완료율, 미룬 뒤 재방문 완료율을 함께 본다.

## 12. 설계 참고 기준

- Apple HIG는 guided flow에서 쉽게 빠져나오고 이전 상태로 복구할 수 있어야 하며, 앱의 의도를 처음부터 명확히 하라고 권고한다.
- Android adaptive guidance는 화면을 단순히 늘리지 말고 width에 따라 reflow·presentation change를 적용하고 content max-width를 제한하라고 권고한다.
- WCAG 2.2는 touch target의 최소 크기와 간격을 요구하며, 핵심 순차 행동에는 44×44px 이상의 enhanced target을 권장한다.

참고:

- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/design/human-interface-guidelines/onboarding
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced

## 13. 승인 기준

- [x] 고객 화면에 `빠른 결과`가 없다.
- [x] 첫 성향 검사와 정밀 성향 검사의 관계가 5초 안에 이해된다.
- [x] S05-R은 최초 시작 결정에만 쓰이고 진행 중·완료 사용자는 우회한다.
- [x] 사용자에게 보이는 정보가 `무엇을 받는지·비공개·이어하기·시작`으로 정리되어 있다.
- [x] 답 재사용 문구는 호환 검증을 통과했을 때만 보인다.
- [x] 비교·지도 gate의 원래 목적지를 정밀 결과까지 보존한다.
- [x] 화면 전체 보라색·복수 장식색·반복 lens motion이 없다.
- [ ] 320px과 390px에서 여백·의미 단위 줄바꿈·CTA가 안정적이다.
- [x] primary loading 중 중복 탭이 차단된다.
- [x] 시작 실패에서 화면을 잃지 않고 재시도할 수 있다.
- [x] 공통 runner를 `mode=precision`으로 재사용한다.
- [x] 고정 답 재사용 manifest와 versioned IndexedDB 필드가 준비되어 있다.
- [ ] 서버 DB versioned migration과 오프라인 서버 복구를 구현한다.

## 14. Production v1 구현 상태

별도 S06 component를 만들지 않고 `/assessments/nu-core-full` 안에 다음 수직 경로를 연결했다.

```text
local entry resolver
→ 최초 소개 / 진행 중 재개 / 완료 리포트 / 첫 검사 이동
→ 연속 탭이 차단된 attempt 시작
→ 고정 release manifest와 문항 의미·축·채점 방향 검증
→ 승인된 S03-R 공통 runner(mode=full)
→ 정밀 결과
→ 저장된 return destination
```

구현 경로:

- `src/features/assessment/PrecisionAssessmentIntro.tsx`
- `src/features/assessment/PrecisionAssessmentIntro.module.css`
- `src/features/assessment/precision-entry.ts`
- `src/features/assessment/assessment-response-reuse.ts`
- `src/features/assessment/assessment-storage.ts`
- `src/app/assessments/[slug]/page.tsx`
- `src/features/result/LocalResultView.tsx`

localhost 검토 주소:

`http://localhost:3000/assessments/nu-core-full?preview=intro&from=home&backTo=%2Fhome`

`preview=intro`는 development 환경에서만 활성화되며 production에서는 attempt 상태 resolver가 화면을 결정한다. 다음 gate는 Product Owner의 320·390px 시각 검토와 서버 DB migration이다.
