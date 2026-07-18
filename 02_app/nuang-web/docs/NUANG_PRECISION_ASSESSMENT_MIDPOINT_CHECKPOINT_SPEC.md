# NUANG 정밀 성향 검사 절반 휴식 checkpoint 설계·구현 계약

작성일: 2026-07-18 KST  
상태: `MIDPOINT_CHECKPOINT_V2_OWNER_APPROVED_DIRECTION`  
화면 상태: `CORE_ASSESSMENT_RUNNER(mode=precision, surface=HALFWAY_CHECKPOINT)`  
상위 계약: [NUANG_CORE_ASSESSMENT_RUNNER_PRECISION_MODE_SPEC.md](./NUANG_CORE_ASSESSMENT_RUNNER_PRECISION_MODE_SPEC.md)

> 별도 페이지·route·runner를 만들지 않는다. 현재 응답의 안전한 로컬 보관이 끝나고 전체 진행률이 절반 경계를 처음 넘었을 때, 같은 runner shell 안에서 질문 body만 짧은 휴식 선택 화면으로 바꾼다.

## 0. 목표

- 사용자가 강제 대기 없이 즉시 계속할 수 있다.
- 피로한 사용자는 한 번의 탭으로 홈에 나갔다가 다음 미응답 문항부터 이어갈 수 있다.
- 중간 점수나 성향 방향을 보여주지 않아 이후 응답을 유도하지 않는다.
- 검사 문항 화면과 같은 app bar, 연속 진행선, neutral surface, safe-area를 유지한다.
- checkpoint는 attempt마다 최대 한 번만 나타난다.

## 1. 고객 화면

```text
[X]          정밀 성향 검사          33 / 66
━━━━━━━━━━━━━━ 연속 진행선 ━━━━━━━━━━━━━━

                 휴식 전용 뉴앙 캐릭터

                 절반까지 답했어요

       바로 이어가거나,
       잠시 쉬었다가 계속해도 괜찮아요.

              최근 6개월 동안 반복된
              평소 모습을 떠올려 주세요.

        검사를 마치면 다섯 글자 뉴앙 코드와
      나를 더 자세히 설명하는 리포트가 열려요.

[               홈에서 이어하기               ]
[                 계속 답하기                 ]

지금까지 답한 내용은 이 기기에서 7일 동안 이어볼 수 있어요.
```

시안의 `33 / 66`은 레이아웃 fixture다. 실제 화면은 pinned release와 attempt의 계산값을 사용한다. 본문에는 남은 질문 수를 다시 표시하지 않는다.

## 2. 카피·CTA

확정 후보:

- 제목: `절반까지 답했어요`
- 설명: `바로 이어가거나, 잠시 쉬었다가 계속해도 괜찮아요.`
- 기준 환기: `최근 6개월 동안 반복된 평소 모습을 떠올려 주세요.`
- 결과 기대: `검사를 마치면 다섯 글자 뉴앙 코드와 나를 더 자세히 설명하는 리포트가 열려요.`
- primary: `계속 답하기`
- secondary: `홈에서 이어하기`
- 비회원 로컬 보관: `지금까지 답한 내용은 이 기기에서 7일 동안 이어볼 수 있어요.`

로그인·다른 기기 동기화가 실제로 보장되는 경우에만 서버 계약에 맞는 다른 보관 문구를 제공한다. `자동 저장`, `클라우드에 저장`, `어디서나 이어하기`를 추측해 쓰지 않는다.

피해야 할 표현:

- `잘하고 있어요`, `대단해요`, `정확해지고 있어요`
- `거의 다 왔어요`, `조금만 더 힘내요`
- `50% 달성`, 점수, 보상, 정답, 실시간 코드
- countdown, 강제 호흡, 버튼 지연, guilt copy

## 3. 시각 원칙

- 바깥 phone frame, shadow, 전체 보라 배경을 사용하지 않는다.
- 일반 runner의 app bar·진행선 위치와 좌우 여백을 그대로 유지한다.
- 질문 body만 넓은 여백 중심 checkpoint로 교체한다.
- CTA는 320px에서도 가로 분할하지 않고 세로로 배치한다.
- secondary를 먼저, 엄지에 가까운 최하단에 primary를 둔다.
- nested card, 여러 색상 블록, badge, streak, confetti를 사용하지 않는다.
- 본문의 남은 질문 수·예상 시간은 제거한다. `remainingItemCount`는 진행·복원 계산을 위해 내부 데이터로만 유지한다.
- 회상 기준은 두 block span으로 의미 단위 두 줄을 만든다. 200% 확대에서는 내용 보존을 위해 추가 줄바꿈을 허용한다.
- progress가 절반 경계를 넘을 때 한 번만 220–580ms highlight가 지나가고 정지한다.
- checkpoint body와 캐릭터는 한 번 settle하고, 캐릭터·glow·접지 그림자가 두 번만 아주 작게 호흡한 뒤 완전히 정지한다.
- 결과 기대 문구는 캐릭터 settle 뒤 한 번만 짧게 나타난다.
- reduced motion에서는 progress highlight·body·캐릭터 이동을 제거한다.

## 4. 휴식 전용 캐릭터

운영 후보 자산:

- WebP: `public/assets/assessment/nuang-checkpoint-mascot-v1.webp`
- alpha master: `public/assets/assessment/nuang-checkpoint-mascot-v1.png`
- generation source: `public/assets/assessment/nuang-checkpoint-mascot-v1-source.png`

표현:

- 기존 뉴앙 main mascot의 얼굴·보라 palette·상단 불꽃 실루엣을 유지한다.
- 편안하게 앉아 어깨를 이완한 고급 2D cel-shading 포즈다.
- 졸림, 피로, 분석 중, 보상, 축하로 보이지 않는다.
- 텍스트, UI, 로고, 시계, 컵, 메달, 트로피, confetti, 별, glowing core가 없다.
- 장식이므로 `alt=""`와 `aria-hidden=true`를 적용한다.
- 390px 약 96–104px, 320px 약 80–84px로 표시한다.

기존 로딩 캐릭터는 빛나는 핵을 모으는 동작이 `분석 중`으로 해석될 수 있어 checkpoint에 재사용하지 않는다.

## 5. 노출 조건

```ts
thresholdCount = Math.ceil(totalRequiredItemCount * 0.5);
completedCount = importedAnswerCount + completedDeliveryAnswerCount;
```

아래 조건을 모두 만족할 때만 표시한다.

1. `mode === 'precision'`
2. `midpointCheckpointEnabled === true`
3. fixed release count가 attempt에 pin 되어 있음
4. 이전 완료 수 `< thresholdCount`
5. 새 완료 수 `>= thresholdCount`
6. 새 완료 수 `< totalRequiredItemCount`
7. `HALFWAY_BREAK_V1`이 아직 노출되지 않음
8. 현재 응답의 로컬 보관 성공
9. 현재 세션에서 실제 부담이 발생함: 기본 후보 `sessionAnsweredCount >= 8 || activeElapsedMs >= 180000`
10. 남은 문항이 전체의 10%보다 많음

예외:

- 홀수 65개 release는 33개 완료 후 표시한다.
- `UNSURE`도 문항 완료 수에는 포함하지만 유효 점수 문항 수에는 포함하지 않는다.
- imported 답만으로 threshold를 넘은 attempt는 시작 직후 보여주지 않고 `SKIPPED_ALREADY_PASSED` 처리한다.
- 마지막 문항과 checkpoint가 겹치면 완료를 우선한다.
- local 실패 중에는 표시하지 않는다.
- remote sync만 실패하고 local 성공이면 표시할 수 있다.
- 이전 이동·답 변경으로 threshold를 다시 넘어도 재노출하지 않는다.

상태 우선순위:

```text
1. 로컬 저장 실패
2. 마지막 문항 완료
3. 절반 checkpoint 신규 trigger
4. 다음 문항
```

## 6. milestone 데이터

```ts
type AssessmentMilestoneId = 'HALFWAY_BREAK_V1';

type AssessmentMilestoneState = {
  milestoneId: AssessmentMilestoneId;
  thresholdCount: number;
  contentVersion: string;
  status:
    | 'NOT_REACHED'
    | 'PENDING'
    | 'SHOWN'
    | 'CONTINUED'
    | 'DEFERRED'
    | 'SKIPPED_ALREADY_PASSED'
    | 'SKIPPED_AT_COMPLETION';
  triggeredAt: string | null;
  shownAt: string | null;
  resolvedAt: string | null;
};
```

attempt는 `milestoneStates`를 보관한다. threshold는 attempt 생성 시 pin 하고 release가 바뀌어도 진행 중 attempt의 값을 바꾸지 않는다.

이번 카피·motion 개정은 `milestoneId=HALFWAY_BREAK_V1`을 유지하고 `contentVersion=midpoint-copy-motion.v2`로 구분한다. milestone ID를 바꿔 같은 attempt에 checkpoint가 다시 나타나게 하지 않는다.

서버 동기화 후보:

```text
assessment.assessment_attempt_milestone
- attempt_id
- milestone_id
- threshold_count
- content_version
- status
- triggered_at
- shown_at
- resolved_at
primary key(attempt_id, milestone_id)
```

## 7. 저장·복귀

50%를 통과한 응답을 저장할 때 아래 세 항목을 같은 IndexedDB transaction에 기록한다.

```text
현재 응답
+ 다음 currentItemId
+ milestone NOT_REACHED → PENDING
```

렌더 직전 `PENDING → SHOWN`을 compare-and-set 한다.

- 계속 답하기: `SHOWN → CONTINUED`, route 변경 없이 저장된 다음 미응답 문항 표시
- 홈에서 이어하기: `SHOWN → DEFERRED`, milestone 저장 확인 후 홈 이동
- 홈의 CTA: `정밀 검사 이어하기`, 소개 화면 없이 다음 미응답 문항로 직행
- checkpoint 도중 앱 종료: 이미 `SHOWN`이면 재진입 때 다시 보여주지 않음
- 다음 문항의 이전 버튼: checkpoint가 아니라 실제 직전 질문으로 이동
- checkpoint는 browser history에 push하지 않음

두 탭 중복은 attempt Web Lock과 같은 transaction의 `PENDING → SHOWN` compare-and-set으로 막는다. row를 획득한 client 하나만 checkpoint를 표시한다.

## 8. 저장 실패 시 차이

- local 보관 실패면 `홈에서 이어하기`와 7일 보관 문구를 노출하지 않는다.
- 먼저 blocking 복구 상태 `응답을 안전하게 보관하지 못했어요 · 다시 시도`를 해결한다.
- remote sync 실패·local 성공은 checkpoint와 계속 답하기를 허용한다.
- checkpoint 체류 시간은 문항 응답시간·점수·응답 품질 계산에서 제외한다.

## 9. 접근성

- checkpoint는 modal이 아니라 runner의 주 body 상태다.
- `section aria-labelledby=halfway-title`, 유일한 `h1`, `aria-live=polite`를 사용한다.
- progressbar는 현재/전체와 같은 값을 안내한다.
- 질문 radiogroup은 checkpoint 중 접근성 트리에 남기지 않는다.
- 캐릭터 없이도 제목·설명·CTA만으로 의미가 완성된다.
- 두 CTA는 최소 48px이고 시간 제한·자동 닫힘이 없다.
- 320px·200% 확대에서 본문과 CTA가 겹치지 않는다.
- 상단 X와 OS back은 기존 검사 이탈 sheet를 연다.

## 10. 이벤트·개인정보

허용 이벤트:

- `assessment_milestone_triggered`
- `assessment_milestone_viewed`
- `assessment_milestone_action`
- `assessment_resumed_after_milestone`

허용 속성:

- `mode=precision`, `milestone_id=halfway_break`, `release_id`
- `content_version`, `progress_bucket=halfway`, `action=continue|defer`
- `entry_context`, 넓은 범위의 `elapsed_bucket`

금지:

- 직접 응답, unsure 여부·이유
- itemId, contextLabel, promptText
- 성향 코드·축 점수·예측 결과
- attempt·account·report 식별자
- 정확한 checkpoint 체류 시간

`defer`는 이탈 실패가 아니라 사용자가 선택한 정상 휴식 행동이다.

## 11. 구현 경계

추가 후보:

- `AssessmentHalfwayCheckpoint.tsx`
- `assessment-milestone.ts`
- `assessment-milestone.test.ts`

수정 후보:

- `types.ts`: milestone 타입과 attempt 필드
- `assessment-storage.ts`: threshold와 원자 상태 전환
- `useAssessmentRunner.ts`: `HALFWAY_CHECKPOINT` surface와 우선순위
- `AssessmentRunner.tsx`: 공통 shell 안 body 분기
- analytics adapter와 server sync migration

만들지 않음:

- checkpoint 전용 route·page·runner·attempt·progress

## 12. 승인 기준

- 강제 대기·countdown 없이 primary를 즉시 누를 수 있다.
- 320·390·520px와 200% 확대에서 두 CTA와 safe area가 겹치지 않는다.
- checkpoint가 attempt당 최대 한 번만 나타난다.
- imported 답이나 짧은 재개 직후 부적절하게 나타나지 않는다.
- local 실패 중 `홈에서 이어하기`를 약속하지 않는다.
- 계속 뒤 문항 순서·응답·progress가 변하지 않는다.
- defer 뒤 홈에서 정확한 다음 문항을 복원한다.
- progress와 현재/전체가 같은 값을 가리킨다.
- 키보드·화면 읽기·reduced motion으로 두 행동을 완료할 수 있다.
- 이벤트에 응답·성향·식별 정보가 없다.

## 13. v2 사용자 피드백 반영

1. 본문의 `남은 질문 33개`와 list icon·상하 divider를 제거했다.
2. 회상 기준을 `최근 6개월 동안 반복된 / 평소 모습을 떠올려 주세요.`의 의미 단위 두 줄로 정리했다.
3. 속도·잔여량을 과장하지 않고 `다섯 글자 뉴앙 코드 + 상세 리포트`라는 실제 결과 기대를 추가했다.
4. 캐릭터는 650ms settle 뒤 약 1.4초 호흡을 두 번만 하고 멈추며, glow와 접지 그림자도 같은 의미로 반응한다.
5. `금방`, `거의 다 왔어요`, `조금만 더`, `곧 결과가 나와요`는 실제 남은 양과 다를 수 있어 사용하지 않는다.
