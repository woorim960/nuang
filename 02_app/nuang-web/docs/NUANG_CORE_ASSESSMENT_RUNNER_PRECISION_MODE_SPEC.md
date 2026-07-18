# NUANG 공통 성향 검사 실행기 — 정밀 모드 설계·구현 계약

작성일: 2026-07-18 KST  
상태: `PRODUCTION_RUNNER_PROTOTYPE_PARITY_V1_LOCALHOST_REVIEW`  
화면 ID: `CORE_ASSESSMENT_RUNNER(mode=precision)`  
공통 기준: [NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md](./NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md)  
문항·응답 기준: [NUANG_M02_ITEM_AND_RESPONSE_SPEC.md](./NUANG_M02_ITEM_AND_RESPONSE_SPEC.md)
절반 checkpoint: [NUANG_PRECISION_ASSESSMENT_MIDPOINT_CHECKPOINT_SPEC.md](./NUANG_PRECISION_ASSESSMENT_MIDPOINT_CHECKPOINT_SPEC.md)  
응답 보관 복구: [NUANG_PRECISION_ASSESSMENT_SAVE_RECOVERY_SPEC.md](./NUANG_PRECISION_ASSESSMENT_SAVE_RECOVERY_SPEC.md)

> 정밀 검사는 별도의 S06 runner가 아니다. 빠른 검사와 같은 `AssessmentRunner`를 사용하고, 문항 release·진입 준비·진행 시작값·완료 결과 종류만 `mode=precision` 설정으로 바꾼다.

2026-07-18 구현 메모: 승인된 `nuang-precision-runner-production-v1-preview.html`의 정보 위계·치수·응답 행·non-reflow 판단 어려움 요약·floating bottom sheet·sticky thumb dock·문항 방향 모션을 공통 `AssessmentRunner`에 이식했다. 프로토타입의 임시 색상은 복사하지 않고 앱의 현재 Foundation token을 사용한다.

## 0. 이번 단계의 결론

- 바깥 phone card, 기기 shadow, 상태바, 잘린 viewport를 제거하고 실제 앱 surface로 제작한다.
- 정상 문항에서는 neutral surface와 뉴앙 보라 accent 하나만 쓴다.
- 상황 라벨, 질문, 5단계 응답, 판단 어려움, 이전·다음만 남긴다.
- 축 이름, 세부 신호, 코드 글자, HIGH/LOW, 점수, 실시간 결과 예측은 노출하지 않는다.
- `판단 어려움`은 본문을 미는 펼침 영역이 아니라 화면 위에 뜨는 adaptive bottom sheet로 제공한다.
- 정상 저장 성공 문구는 표시하지 않는다. 실패와 데이터 손실 위험이 있을 때만 안내한다.
- 긴 검사의 재미는 장식이 아니라 선택 반응, 짧은 방향 전환, 이어진 진행선, 절제된 휴식 checkpoint로 만든다.

## 1. 실제 사용자 흐름

```text
간단 성향 결과 또는 검사 허브
→ 정밀 성향 검사 소개
→ 정밀 attempt 준비
   ├─ 호환되는 간단 검사 답변을 불변 복사
   ├─ release와 문항 순서 고정
   └─ 첫 미응답 문항 결정
→ CORE_ASSESSMENT_RUNNER(mode=precision)
→ 결과 준비·복구 상태
→ 정밀 성향 결과
```

라우트 권장안:

```text
/assessments/nu-core-full/intro
/assessments/nu-core-full
/results/local/[attemptId]
```

- 새 시작은 소개 화면을 거친다.
- 홈의 `정밀 검사 이어하기`는 active attempt로 곧바로 복귀한다.
- active attempt가 없는 runner 직접 접근은 새 검사를 몰래 만들지 않고 intro로 `replace`한다.
- 완료된 attempt는 runner가 아니라 해당 결과로 이동한다.

## 2. production surface 구조

```text
실제 앱 배경
├─ sticky app bar
│  ├─ 검사 나가기
│  ├─ 정밀 성향 검사
│  └─ 현재 / 전체
├─ 하나로 이어진 progress
├─ 문항 body
│  ├─ 답하는 기준 help
│  ├─ contextLabel
│  ├─ promptText
│  ├─ 1–5 radiogroup
│  └─ 판단 어려움 trigger 또는 같은 높이의 선택 요약
├─ adaptive bottom sheet
└─ sticky action dock + safe area
```

520px보다 넓은 화면에서는 내용만 최대 520px로 제한한다. 앱 배경은 계속 이어지며 가운데에 둥근 스마트폰 카드가 떠 있는 모습을 만들지 않는다.

## 3. 상단과 진행률

- 앱바 고객 제목은 `정밀 성향 검사`로 통일한다.
- 닫기는 44px 이상 `button`이며 즉시 이동하지 않고 검사 중단 sheet를 연다.
- 현재/전체와 progress는 같은 계산 함수를 사용한다.
- 진행선은 4px 하나로 이어진 선이며 문항별 조각, 점, orbit을 사용하지 않는다.
- 전체 문항 수는 화면 코드에 60·66 등으로 고정하지 않고 attempt의 release에서 읽는다.
- 마지막 문항은 본문 태그를 추가하지 않는다. 현재/전체, 100% 진행선, `결과 보기` CTA로 충분히 전달한다.

### 간단 검사 답 재사용

호환 답이 13개이고 첫 신규 문항이 14번째라면 runner는 `14 / N`에서 시작한다. 첫 진입에만 질문을 밀지 않는 안내를 보여준다.

```text
첫 검사에서 답한 13개 질문을 이어서 반영했어요.
```

실제 숫자는 `importedAnswerCount`에서 읽는다. `자동 반영`, 저장 위치, 기술 버전은 고객에게 설명하지 않는다.

## 4. 답하는 기준과 문항 위계

고정 help action:

```text
답하는 기준 · 최근 6개월의 평소 모습
```

탭하면 화면을 밀지 않는 sheet에서 설명한다.

```text
특별히 잘됐거나 힘들었던 한 번보다,
비슷한 상황에서 반복해서 나타난 평소 모습을 기준으로 답해 주세요.

비슷한 경험이 거의 없다면
‘이 상황은 답하기 어려워요’를 선택해도 괜찮아요.
```

문항 위계:

- `contextLabel`: 13–14px, accent, medium. `상황` pill이나 문항별 아이콘을 붙이지 않는다.
- `promptText`: 화면의 유일한 `h1`, 320px 24/34 이상, 390px 26/36 권장.
- `contextLabel`과 `promptText`를 한 문장으로 합치거나 같은 상황을 반복하지 않는다.
- `contextLabel + promptText`는 문항 전환 때 하나의 atomic live region으로 갱신한다.
- 화면에 axis, facet, response layer 내부명, 채점 방향을 표시하지 않는다.

문항 화면에 쓰는 문구는 published measurement release에서만 가져온다. production surface 시안의 예문과 `14 / 66`은 배치·동작 검증용 fixture이며 운영 첫 문항이나 실제 총 문항 수를 확정하지 않는다.

## 5. 5단계 응답

고객 카피:

1. `거의 그렇지 않아요`
2. `드문 편이에요`
3. `반반이에요`
4. `자주 그래요`
5. `거의 항상 그래요`

규칙:

- native radio와 radiogroup을 사용한다.
- 한 행 전체가 최소 52px touch target이다.
- 선택 전에는 어느 행도 크기·색으로 먼저 강조하지 않는다.
- 선택은 accent-soft surface, accent border, radio inner dot으로 전달한다.
- 선택 시 행을 좌우로 움직이지 않는다.
- 선택 뒤 자동으로 다음 문항으로 넘기지 않는다.
- 정상 3점과 판단 어려움은 데이터·UI·채점 의미가 다르다.
- 첫 문항에서도 이전 버튼 자리를 숨기지 않고 disabled로 두어 dock 정렬이 흔들리지 않게 한다.

## 6. 판단 어려움 non-reflow 계약

trigger:

```text
이 상황은 답하기 어려워요
```

adaptive bottom sheet 이유:

1. `비슷한 경험이 거의 없어요`
2. `상황에 따라 많이 달라요`
3. `문장이 이해되지 않아요`
4. `답하고 싶지 않아요`

- sheet를 열기만 해서는 기존 1–5 응답을 지우지 않는다.
- 이유를 확정할 때 1–5 값을 null로 바꾸고 `UNSURE` 응답을 원자적으로 저장한다.
- 선택 후 원래 trigger 자리를 같은 높이의 요약으로 교체한다.
- 요약에는 `답하기 어려움 · 선택한 이유 · 변경`을 표시한다.
- `변경`으로 이유를 다시 고를 수 있고 이전·이어하기에서도 이유를 복원한다.
- 판단 어려움은 완료 진행률에는 포함할 수 있지만 유효 점수 문항 수에는 포함하지 않는다.
- sheet는 `role=dialog`, `aria-modal`, 제목 연결, native reason radiogroup, Escape, backdrop 닫기, focus trap과 trigger focus 복귀를 지원한다.

## 7. 하단 엄지 dock

- 이전은 48×54px icon action과 `aria-label=이전 문항`을 사용한다.
- 다음은 남은 폭 전체를 쓰고 54–56px 높이를 유지한다.
- 미응답은 다음 disabled, 응답 또는 판단 어려움 확정 뒤 활성화한다.
- 마지막 문항에서는 CTA를 `결과 보기`로 바꾸고 중복 탭을 잠근다.
- dock은 safe area를 포함하고 질문이 길어져도 사라지지 않는다.
- 320px·200% 확대에서는 body가 자연스럽게 스크롤되고 마지막 응답과 dock이 겹치지 않는다.

## 8. 이탈·이어하기

상단 닫기는 다음 sheet를 연다.

```text
검사를 잠시 멈출까요?
지금까지 답한 내용은 그대로 두고 나중에 이어할 수 있어요.

[계속 검사하기]
[홈에서 이어하기]
```

- `홈에서 이어하기`는 저장 완료가 확인된 경우에만 위 문구를 쓴다.
- 로컬 저장 실패 중이면 데이터 손실 위험과 `다시 저장`을 먼저 보여준다.
- 저장된 sequence, `currentItemId`, 1–5 응답, 판단 어려움 이유를 함께 복원한다.
- `returnDestination`은 임의 URL이 아니라 허용 enum으로 관리한다.
- 만료 attempt는 조용히 복원하지 않고 만료와 새 시작을 설명한다.

## 9. 정밀 검사 피로 관리

절반 checkpoint 상세 계약: [NUANG_PRECISION_ASSESSMENT_MIDPOINT_CHECKPOINT_SPEC.md](./NUANG_PRECISION_ASSESSMENT_MIDPOINT_CHECKPOINT_SPEC.md)

P0:

- 50%에서 한 번만 `절반까지 답했어요. 잠깐 쉬어도 괜찮아요.` checkpoint를 검토한다.
- `계속하기`와 `나중에 이어하기`를 제공한다.
- 25%·75%의 반복 격려 toast는 파일럿에서 도움이 확인된 경우에만 추가한다.
- 남은 시간은 실제 파일럿 분포가 없으면 표시하지 않는다.

금지:

- 질문마다 캐릭터·confetti·streak·badge
- 축별 chapter와 파트 제목
- 실시간 코드 글자·점수·정확도·결과 예측
- 반복 회전·orbit·무의미한 loop animation

## 10. motion

- 응답 선택: 160–180ms, surface·border·radio만 전환
- 다음 문항: 이전 body 8px 왼쪽, 새 body 8px 오른쪽에서 220ms 내 전환
- 이전 문항: 반대 방향
- progress: 220–240ms
- bottom sheet: 240ms translateY와 180ms scrim
- CTA press: 80–120ms, scale 0.985 이내
- app bar와 dock은 문항 전환 때 움직이지 않는다.
- `prefers-reduced-motion`에서는 위치 이동을 제거하고 opacity 또는 즉시 전환한다.

## 11. 공통 component와 데이터 계약

```ts
type AssessmentMode = 'quick' | 'precision';

type RunnerConfig = {
  mode: AssessmentMode;
  title: string;
  releaseId: string;
  attempt: AssessmentAttempt;
  deliveryItemIds: string[];
  importedAnswerCount: number;
};

type CoreAnswer =
  | {
      responseStatus: 'VALID';
      responseValue: 1 | 2 | 3 | 4 | 5;
      unsureReason: null;
      answeredAt: string;
    }
  | {
      responseStatus: 'UNSURE';
      responseValue: null;
      unsureReason:
        | 'NO_EXPERIENCE'
        | 'CONTEXT_VARIES'
        | 'WORDING_UNCLEAR'
        | 'PREFER_NOT_TO_ANSWER';
      answeredAt: string;
    };
```

필수 attempt 필드:

- `id`, `assessmentId`, `releaseId`, `mode`
- `sourceAttemptId`, `deliveryItemIds`, `importedAnswerCount`
- `currentItemId`, `responses`, `state`
- `createdAt`, `updatedAt`, `expiresAt`, `completionRequestId`
- `returnDestination`, `localPersistStatus`, `remoteSyncStatus`, `completionStatus`

답 재사용은 runner mount에서 수행하지 않는다. intro의 attempt 준비 service가 호환 답을 불변 복사하고 sequence와 첫 미응답 문항을 고정한 뒤 runner로 이동한다.

## 12. progress와 저장

```text
전체 = release 전체 문항 수
완료 = importedAnswerCount + 이번 정밀 attempt에서 완료한 수
표시 순번 = importedAnswerCount + delivery index + 1
```

- 신규 시작은 published release를 사용한다.
- 이어하기는 attempt에 pin 된 정확한 `releaseId`를 사용한다.
- 다른 release로 조용히 대체하지 않는다.
- 화면 선택과 현재 위치는 같은 IndexedDB transaction으로 저장한다.
- 로컬 성공·원격 sync 실패는 다음 진행을 허용하고 비차단 재시도를 제공한다.
- 로컬 실패는 메모리 선택을 유지하되 다음을 차단하고 복구 행동을 제공한다.
- 정상 저장 성공을 고객에게 반복 표시하지 않는다.

## 13. 완료 계약

```text
마지막 응답 로컬 저장 확인
→ 중복 탭 잠금
→ completionRequestId 생성·보존
→ 응답 완결성 확인
→ 완료 snapshot 고정
→ 채점·리포트 job
→ 결과 준비 상태
→ 정밀 결과
```

완료는 멱등이어야 하며 같은 request는 결과 하나만 만든다. 정밀 모드 준비 문구는 `답변을 확인하고 성향 결과를 정리하고 있어요.`를 사용한다. 결과 생성 실패는 문항을 다시 답하게 하지 않고 같은 snapshot으로 job을 재시도한다.

## 14. 구현 경계

```text
AssessmentRunnerEntry
├─ release load
├─ active attempt resolve
├─ intro guard
└─ loading/error state

useAssessmentRunner
├─ 현재 문항·이동
├─ 응답·판단 어려움
├─ 로컬 저장·원격 sync
├─ 이탈·이어하기
└─ 완료 상태

AssessmentRunner
└─ quick·precision 공통 DOM

UnsureReasonSheet
AssessmentExitSheet
AssessmentRecoveryOverlay
AssessmentCompletionState
```

`AssessmentRunner` 안에 precision 전용 레이아웃을 복제하지 않는다. response label, unsure reason, 회상 기간은 `responseFormat` 한 원장에서 읽는다.

## 15. QA 승인 기준

- 320, 390, 520px에서 수평 overflow가 없다.
- 200% 확대에서 상황·질문·5개 응답·dock이 겹치지 않는다.
- 첫 응답을 선택하면 다음이 활성화되고 자동 이동하지 않는다.
- 다음·이전에서 질문, 응답, 판단 어려움 이유, 현재/전체, progress가 함께 복원된다.
- 판단 어려움 sheet를 열었다 취소하면 기존 1–5 응답이 유지된다.
- 이유 확정 시 VALID와 UNSURE가 원자적으로 교체된다.
- trigger와 선택 요약 높이가 안정적이며 body가 갑자기 밀리지 않는다.
- 닫기, Escape, backdrop, focus trap, focus 복귀가 동작한다.
- 정상 저장 성공 문구, 내부 화면 ID, 축·채점 방향이 노출되지 않는다.
- reduced motion, 키보드, screen reader로 검사 완료가 가능하다.
- console error·warning이 없다.

## 16. 다음 작업

1. localhost에서 320·390px 기준 prototype parity를 Product Owner가 시각 검토한다.
2. 실제 기기에서 200% 확대, 긴 문항, safe area, keyboard focus·Escape·focus 복귀를 확인한다.
3. DB release·attempt·response migration과 API 계약을 적용한다.
4. 승인된 measurement release가 준비되면 fixture 문항을 published 문항으로 교체한다.
5. native reason radiogroup과 완전한 focus trap을 접근성 QA에서 최종 검증한다.
