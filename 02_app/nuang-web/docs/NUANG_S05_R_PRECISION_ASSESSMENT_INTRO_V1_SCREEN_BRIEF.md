# NUANG S05-R 정밀 검사 소개 v1 화면 brief

작성일: 2026-07-18 KST  
상태: `S05_R_PRECISION_INTRO_V1_OWNER_REVIEW`  
작업 ID: `UIX-02_PRECISION_ENTRY_REVIEW`  
선행 화면: [NUANG_S04_R_QUICK_RESULT_REPORT_V3_SCREEN_BRIEF.md](./NUANG_S04_R_QUICK_RESULT_REPORT_V3_SCREEN_BRIEF.md)

## 0. 화면 ID 재정렬

현재 MVP 골든 패스는 `S03-R 빠른 검사 → S04-R 빠른 결과 → S05-R 정밀 검사 소개`로 이어진다. 초기 마스터 설계서에서 정밀 검사 소개에 사용했던 `S07` 역할을 현재 `S05-R`로 앞당겨 재배치한 것이다.

- 초기 설계서의 옛 `S05 결과 준비` 번호를 재사용한다는 뜻이 아니다.
- 결과 준비·오류 화면은 S03 상태 suite에서 이미 별도 상태로 다룬다.
- 이후 문서와 구현에서는 현재 화면명을 `S05-R 정밀 검사 소개`로 고정한다.
- 초기 설계서의 옛 `S08 정밀 검사 실행기`는 승인 뒤 현재 후속 화면 ID로 다시 연결한다.

## 1. 화면의 단일 목적

사용자가 빠른 결과 리포트의 `정밀 검사로 더 알아보기`를 누른 뒤 10초 안에 다음 네 가지를 이해하게 한다.

1. 방금 본 빠른 결과가 틀렸거나 사라지는 것이 아니다.
2. 정밀 검사는 다섯 코드 자리를 더 다양한 상황에서 반복 확인한다.
3. 결과로 대표 코드와 자리별 상세 설명을 받는다.
4. 지금 시작하거나 홈으로 돌아갈 수 있고, 진행 중인 검사는 나중에 이어볼 수 있다.

이 화면은 결제를 압박하거나 빠른 결과의 신뢰를 낮추는 판매 화면이 아니다. `빠른 결과에서 정밀 결과로 자연스럽게 이어지는 설명과 선택`이 핵심이다.

## 2. 확정 메시지

### Hero

- tag: `정밀 검사`
- 제목: `더 다양한 상황에서 내 모습을 살펴봐요`
- 설명: `빠른 결과는 그대로 두고, 다섯 코드 자리가 상황에 따라 어떻게 나타나는지 더 자세히 확인해요.`

### 결과 연결 시각화

```text
지금 먼저 보인 방향
ERGKC · 예비 코드
        ↓
더 자세히 확인한 뒤
대표 코드 + 자리별 상세
```

이 시각화는 예비 코드가 반드시 같은 대표 코드로 확정된다는 약속이 아니다. `먼저 보인 방향에 더 많은 근거와 설명을 더한다`는 과정을 보여준다.

### 정밀 검사에서 더 알게 되는 것

1. `다섯 코드 자리를 더 또렷하게`
   - 여러 상황에서 반복해서 나타나는 방향을 모아 대표 코드를 확인한다.
2. `비슷한 자리가 언제 달라지는지`
   - 한쪽으로 단정하기 어려운 자리는 어떤 상황에서 달라지는지도 살핀다.
3. `생각과 실제 반응을 나눠서`
   - 검증된 영역에서만 `처음 드는 생각`과 `실제 나타나는 반응`을 따로 안내한다.

마지막 문장은 모든 축에서 다층 반응 코드를 제공한다고 과장하지 않는다. 출시 검증을 통과한 영역에만 노출하는 것이 신뢰 계약이다.

## 3. 탐색 구조

```text
상단 왼쪽: 결과로
  → 직전 S04-R 빠른 결과 리포트로 복귀

하단 primary: 정밀 검사 시작하기 / 이어서 하기
  → 후속 정밀 검사 실행기로 이동

하단 secondary: 홈으로 돌아가기
  → 홈으로 이동
```

- 상단에는 `홈`을 두지 않는다. 직전 화면으로 돌아가는 행동과 홈 이동이 중복되지 않게 한다.
- 하단 primary는 엄지 도달 영역에 고정한다.
- 하단 secondary는 primary보다 약한 ghost action으로 유지한다.
- 브라우저·OS back도 `결과로`와 같은 이전 화면 복귀 의미를 사용한다.

## 4. 진입 상태 계약

시뮬레이션의 바깥 상태 버튼은 검토용이며 실제 고객에게 노출하지 않는다. 고객 화면은 서버가 판정한 한 상태만 보여준다.

### `FRESH`

- 조건: 이어갈 정밀 검사 시도가 없고, 빠른 답을 정밀 검사에 재사용할 수 없음
- 안내 제목: `빠른 결과는 그대로 남아 있어요`
- 안내: 더 다양한 상황을 새로 확인하지만 예비 결과가 사라지거나 틀렸다는 뜻은 아님
- primary: `정밀 검사 시작하기`

### `REUSE_COMPATIBLE`

- 조건: 빠른 검사와 정밀 검사가 동일한 release·문항 ID·응답 척도·채점 방향을 사용해 답 재사용이 검증됨
- 안내 제목: `이어 쓸 수 있는 답은 그대로 반영해요`
- 안내: 호환되는 답은 다시 묻지 않고 새로 확인할 상황부터 제공
- primary: `이어서 정밀 검사하기`

빠른 답 재사용은 제품 문구만으로 약속하지 않는다. 아래 조건을 모두 만족해야 한다.

```text
quick.release_id = precision.release_id
AND quick.item_id = precision.item_id
AND response_scale_version 일치
AND scoring_key_version 일치
AND reverse_scoring 규칙 일치
AND answer가 무효화·삭제되지 않음
```

### `RESUMABLE`

- 조건: 완료되지 않은 동일 release의 정밀 검사 시도가 있고 재개 가능한 보존 기간 안에 있음
- 안내 제목: `이어보던 정밀 검사가 있어요`
- 보조 정보: `N개 응답부터 이어서`
- primary: `이어서 하기`
- 이동: 마지막으로 서버가 확인한 응답 다음 문항

우선순위는 `RESUMABLE > REUSE_COMPATIBLE > FRESH`로 고정한다. 이미 진행 중인 정밀 검사가 있으면 새 시도 생성이나 빠른 답 가져오기로 덮어쓰지 않는다.

## 5. 데이터·API 설계 반영

실제 구현 시 클라이언트가 상태를 추측하지 않고 진입 context API가 결정한다.

### 응답 예시

```ts
type PrecisionEntryContext = {
  entryState: 'FRESH' | 'REUSE_COMPATIBLE' | 'RESUMABLE';
  assessmentReleaseId: string;
  quickAttemptId: string | null;
  precisionAttemptId: string | null;
  provisionalCode: string | null;
  reusableAnswerCount: number;
  answeredItemCount: number;
  nextItemId: string | null;
  resumeExpiresAt: string | null;
  contentVersion: string;
};
```

### 저장 모델 요구사항

- `assessment_attempt.kind`: `QUICK | PRECISION`
- `assessment_attempt.status`: `IN_PROGRESS | COMPLETED | EXPIRED | INVALIDATED`
- `assessment_attempt.assessment_release_id`
- `assessment_attempt.source_attempt_id`: 빠른 답 재사용 시 원본 quick attempt
- `assessment_attempt.last_confirmed_item_id`
- `assessment_attempt.resume_expires_at`
- `assessment_answer.item_id`
- `assessment_answer.response_scale_version`
- `assessment_answer.scoring_key_version`
- `assessment_answer.imported_from_answer_id`: 재사용된 답의 출처 추적
- `assessment_answer.confirmed_at`: 서버가 정상 저장을 확인한 시점

`answeredItemCount`는 화면에 표시하기 위한 서버 집계값이다. 클라이언트의 로컬 배열 길이로 재개 위치를 정하지 않는다.

### 시작 행동

```text
FRESH
→ create precision attempt
→ 첫 문항

REUSE_COMPATIBLE
→ create precision attempt with compatible answers
→ 첫 미응답 문항

RESUMABLE
→ existing precision attempt 유지
→ nextItemId
```

시작 요청은 idempotency key를 사용한다. 사용자가 버튼을 여러 번 눌러도 정밀 검사 시도가 중복 생성되면 안 된다.

## 6. 문항 수·예상 시간 정책

v1 소개 화면에는 문항 수와 예상 시간을 고정 문구로 쓰지 않는다.

- 정밀 검사 문항 수는 활성 assessment release가 결정한다.
- 빠른 답 재사용 여부에 따라 남은 문항 수가 달라질 수 있다.
- 파일럿 전 `약 N분`, `N문항`을 약속하면 이탈과 신뢰 하락의 원인이 된다.
- 추후 실제 완료시간 분포가 확보되면 `남은 문항 수`와 `예상 범위`를 서버 값으로 선택 노출한다.
- 예상 시간은 단일 숫자보다 실제 중앙값 기반 범위를 사용한다.

## 7. 시각·motion 규칙

- S04-R과 같은 warm ivory·lavender·purple palette를 유지한다.
- Hero는 한 개의 강한 시각 영역만 사용하고 카드 안에 장식 카드를 반복하지 않는다.
- 기존 뉴앙 캐릭터를 재사용해 화면 간 브랜드 연속성을 만든다.
- 코드 연결선은 입장 시 한 번만 채워져 `빠른 → 정밀`의 흐름을 보여준다.
- 세 가지 효용은 짧은 순차 reveal로 읽기 순서를 만든다.
- 캐릭터 옆 lens는 작고 느린 반복 motion만 사용하며 측정 결과나 진행 상태로 오해되지 않게 한다.
- 하단 primary는 press·hover에 작은 이동만 주고 과도한 bounce를 쓰지 않는다.
- `prefers-reduced-motion`에서는 모든 reveal과 반복 motion을 즉시 완료한다.
- 운영체제 emoji는 사용하지 않고 Lucide 또는 앱 전용 자산만 사용한다.

## 8. 반응형·접근성 계약

- 320px부터 390px까지 본문과 CTA의 수평 overflow가 없어야 한다.
- `대표 코드`와 `+ 자리별 상세`는 좁은 폭에서 단어 중간이 아니라 의미 단위로 줄바꿈한다.
- 상단 back, primary, secondary는 최소 44px 터치 영역을 보장한다.
- 하단 sticky action 배경은 본문 문구가 비쳐 겹쳐 보이지 않게 한다.
- app surface 내부만 세로 scroll하고 바깥 문서와 이중 scroll 경쟁을 만들지 않는다.
- 모든 button은 접근 가능한 이름을 갖는다.
- 상태 안내와 행동 결과는 `aria-live=polite`로 제공한다.
- 상태가 바뀌어도 제목·버튼 위치가 갑자기 크게 이동하지 않게 한다.

## 9. 분석 이벤트

```text
precision_intro_viewed
  entry_state
  assessment_release_id
  reusable_answer_count
  answered_item_count

precision_intro_primary_tapped
  entry_state
  destination

precision_intro_back_to_result_tapped
precision_intro_home_tapped
precision_attempt_start_succeeded
precision_attempt_start_failed
```

이벤트에는 응답 원문, 세부 성향 점수, 개인 식별 가능한 공유 데이터를 넣지 않는다.

## 10. 승인 기준

- [ ] 빠른 결과가 무효화된다는 인상을 주지 않는다.
- [ ] 정밀 검사의 효용을 `더 다양한 상황·다섯 자리·자리별 상세`로 설명한다.
- [ ] 다층 반응 안내는 검증된 영역에만 한정한다.
- [ ] `결과로`, primary, `홈으로 돌아가기`의 목적이 서로 겹치지 않는다.
- [ ] 세 진입 상태의 문구와 primary label이 맞게 전환된다.
- [ ] `RESUMABLE`이 다른 상태보다 우선한다.
- [ ] 빠른 답 재사용은 버전 호환 검증을 통과한 경우에만 노출한다.
- [ ] 중복 정밀 attempt를 만들지 않는다.
- [ ] 320px과 390px에서 의미 단위 줄바꿈과 하단 터치 영역을 유지한다.
- [ ] reduced motion과 screen reader 상태 안내가 동작한다.

## 11. 다음 단계

이 화면 승인 뒤 정밀 검사 실행기의 첫 화면과 진행 구조를 설계한다. 현재 순서에서는 후속 화면을 `S06-R 정밀 검사 실행기`로 연결하되, 기존 마스터 설계서의 옛 S08 역할과 데이터 계약을 함께 이관한다.
