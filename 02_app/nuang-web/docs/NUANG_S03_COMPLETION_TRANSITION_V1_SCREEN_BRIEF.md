# NUANG S03-R.COMPLETE 검사 완료·결과 준비 전환 v1 화면 brief

작성일: 2026-07-18 KST  
상태: `PRODUCTION_IMPLEMENTED_EXPERT_GATE_PASS`  
작업 ID: `UIX-01C_COMPLETION_TRANSITION_PRODUCTION`  
적용 범위: 빠른·정밀 코어 공통 검사 실행기의 마지막 응답 완료부터 결과 화면 이동 직전까지

관련 기준:

- [NUANG_EXPERT_TEAM_OPERATING_MODEL.md](./NUANG_EXPERT_TEAM_OPERATING_MODEL.md)
- [NUANG_S03_STATE_SUITE_V5_SCREEN_BRIEF.md](./NUANG_S03_STATE_SUITE_V5_SCREEN_BRIEF.md)
- [NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md](./NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md)
- [NUANG_S04_R_QUICK_RESULT_REPORT_V3_SCREEN_BRIEF.md](./NUANG_S04_R_QUICK_RESULT_REPORT_V3_SCREEN_BRIEF.md)
- [NUANG_S05_R_PRECISION_ASSESSMENT_INTRO_V2_SCREEN_BRIEF.md](./NUANG_S05_R_PRECISION_ASSESSMENT_INTRO_V2_SCREEN_BRIEF.md)

## 0. 전문가 에이전트 통합 판정

Product Strategy·UX Research·Korean UX Writing, Psychometrics·Personality Psychology, Product/UI·Motion Design 에이전트가 독립 검토한 뒤 서로의 안을 반론 검토했다.

시뮬레이션 단계의 조건부 승인을 실제 코드·모바일 반응형·접근성·측정 무결성으로 재검증한 최종 판정은 `PASS`다. 이 판정은 완료·저장·결과 표시 파이프라인의 기술적 release gate이며, 문항과 척도의 심리측정 타당도·신뢰도는 별도 파일럿 기준을 유지한다.

1. 이 상태는 고도 분석을 연출하는 로딩 화면이 아니라 마지막 응답을 안전하게 완료하고 재현 가능한 결과로 넘기는 짧은 완료 transaction이다.
2. 사용자가 승인한 뉴앙 로딩 캐릭터와 동작은 그대로 유지한다.
3. 결과가 이미 준비됐다면 화면을 보여주기 위해 일부러 기다리게 하지 않는다.
4. 화면 문구는 실제 lifecycle에 연결하고 가짜 퍼센트·가짜 처리 단계·근거 없는 `곧`을 사용하지 않는다.
5. 빠른 검사 결과는 첫 viewport까지 늦어도 한 번 `예비 결과`임을 명시한다.
6. release·누락 응답·불확실성·멱등성 검증을 통과한 결과만 자동으로 연다.

## 1. 화면 ID 정합성 결정

최신 승인 문서의 화면 ID를 보존한다.

```text
S03-R              빠른·정밀 공통 검사 실행기
└─ S03-R.COMPLETE  검사 완료·결과 준비 전환 상태

S04-R              첫 성향 결과 리포트
S05-R              정밀 성향 검사 소개
```

따라서 이전 계획서에서 사용한 `S05-R 검사 완료·결과 준비` 명칭은 더 이상 사용하지 않는다. `S05-R`을 결과 준비 화면에 다시 쓰면 현재 정밀 성향 검사 소개와 충돌하므로 차단한다.

고객에게는 어떤 화면 ID도 노출하지 않는다.

## 2. 한 문장 목표

마지막 답을 잃지 않았다는 확신과 결과가 이어진다는 기대를 주되, 실제 처리보다 정교해 보이는 연출 없이 가장 짧고 자연스럽게 첫 성향 결과로 연결한다.

## 3. 책임과 비책임

### 3.1 이 상태가 책임지는 것

- 마지막 응답과 완료 snapshot의 보관 확인
- 연속 탭과 중복 완료 요청 차단
- assessment·item·scoring·copy·code release 호환성 확인
- 누락·판단 어려움·불확실성 판정
- 결과 생성과 재조회 가능한 보관 확인
- 실제 처리 상태 안내
- 느림·실패·재시도·재진입 복구
- 결과 준비 완료 뒤 자동 이동

### 3.2 이 상태가 책임지지 않는 것

- 성향 결과의 전체 해석과 면책 설명
- 정밀 검사의 가치 설명과 시작 결정
- 공유·피드·비교 행동
- 로그인·계정 연결 권유
- 인위적인 체류시간 확보
- 실제로 수행하지 않는 AI·심층 분석 연출

## 4. 실제 사용자 흐름

```text
마지막 문항에서 응답 선택·보관 성공
→ `결과 보기` 첫 탭 즉시 잠금
→ 완료 snapshot 생성·검증
→ 300ms 안에 결과 준비 완료
   └─ 전환 화면 없이 S04-R 또는 정밀 결과로 이동
→ 300ms를 넘김
   └─ 같은 검사 shell 안에서 S03-R.COMPLETE 표시
→ 결과 준비 완료
   └─ 이미 표시된 surface를 350–450ms만 안정화한 뒤 자동 이동
→ 4초 이상
   └─ 같은 구조에서 느림 안내
→ 10초 이상 또는 실패
   └─ 복구 행동 제공
```

`350–450ms`는 이미 화면에 나타난 경우 깜빡임을 막는 시각 안정화 시간이다. 결과를 빨리 만들었는데도 캐릭터 동작을 보여주기 위해 화면을 강제로 노출하는 시간이 아니다. 순수 연출을 위한 1.2초 이상의 추가 대기는 차단한다.

## 5. 진입·생략·이탈 조건

| 조건                                | 처리                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| 마지막 응답 로컬 보관 미확인        | 마지막 문항에 머물고 기존 응답 보관 복구 UI를 표시한다.            |
| 완료·결과 준비가 300ms 안에 끝남    | 전용 surface를 생략하고 결과로 직접 이동한다.                      |
| 300ms 뒤에도 처리 중                | `S03-R.COMPLETE.PREPARING`을 표시한다.                             |
| 결과가 이미 존재함                  | 같은 결과를 다시 열고 새 결과를 만들지 않는다.                     |
| 앱 재진입 시 완료 snapshot만 존재함 | 같은 completion request로 결과 준비를 복구한다.                    |
| 앱 재진입 시 결과 존재              | 결과 화면으로 직접 이동한다.                                       |
| 로컬 채점 가능·오프라인             | 결과를 로컬에서 만들고 원격 동기화 실패로 결과 열기를 막지 않는다. |
| 서버 작업만 가능·오프라인           | 연결 복구 상태를 표시한다. 보관이 확인된 사실만 말한다.            |

정상 준비 상태에는 닫기·뒤로·홈 버튼을 두지 않는다. 10초 이상 지연되거나 실패했을 때만 복구 행동을 보여준다. 이때 `나중에 확인하기`는 결과가 백그라운드에서 완성된다고 약속하지 않고, 저장된 진행 상태를 유지한 채 홈으로 안전하게 이탈한다.

## 6. 최종 고객 문구

### 6.1 빠른 검사

상단은 기존 검사 제목과 마지막 문항 수를 유지한다.

```text
빠른 코어                               20 / 20
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%
```

제목:

```text
첫 성향 결과를
준비하고 있어요
```

본문:

```text
지금까지 답한 내용을 바탕으로
지금의 나와 가장 가까운 성향을 정리하고 있어요.
```

빠른 결과의 첫 viewport에는 제거할 수 없는 `첫 성향 결과 · 예비 코드` disclosure를 둔다. 완료 전환 화면에서 긴 연구 한계나 면책문을 반복하지 않는다.

### 6.2 정밀 검사

제목:

```text
성향 결과를 준비하고 있어요
```

본문:

```text
여러 상황에서 답한 내용을 모아
성향 결과를 자세히 정리하고 있어요.
```

응답 근거가 부족하면 다섯 글자 전체를 발급하지 않을 수 있으므로 준비 단계에서 코드 발급을 먼저 보장하지 않는다. 정밀 검사에서도 `최종·확정·진짜 성격`은 사용하지 않는다.

### 6.3 실제 lifecycle 상태 문구

문구는 시간으로 임의 순환하지 않고 실제 확인된 상태가 바뀔 때만 갱신한다.

| 내부 상태             | 빠른 검사 고객 문구           | 정밀 검사 고객 문구                       |
| --------------------- | ----------------------------- | ----------------------------------------- |
| `FINALIZING_RESPONSE` | `마지막 답을 확인하고 있어요` | 동일                                      |
| `VALIDATING_SNAPSHOT` | `답한 내용을 확인하고 있어요` | 동일                                      |
| `BUILDING_RESULT`     | `첫 결과를 정리하고 있어요`   | `뉴앙 코드와 세부 성향을 정리하고 있어요` |
| `READY`               | `결과가 준비됐어요`           | 동일                                      |

처리가 매우 빠르면 모든 중간 문구를 억지로 보여주지 않는다.

### 6.4 4초 이상 느림

제목:

```text
결과 준비가 조금 더 걸리고 있어요
```

본문:

```text
답한 내용은 이 기기에 보관됐어요.
결과 준비를 이어가고 있어요.
```

완료 snapshot 보관이 실제 확인된 경우에만 `보관됐어요`를 사용한다. 느림을 꼼꼼함이나 정확도 향상으로 포장하지 않는다.

### 6.5 10초 이상 지연

제목:

```text
결과 준비가 예상보다
오래 걸리고 있어요
```

본문:

```text
답한 내용은 이 기기에 보관됐어요.
결과 준비 상태를 다시 확인할 수 있어요.
```

주 행동은 `다시 확인`, 보조 행동은 `나중에 확인하기`다. 다시 검사에 들어오면 같은 completion request를 이어간다.

### 6.6 결과 준비 실패

제목:

```text
결과를 준비하지 못했어요
```

본문:

```text
답한 내용은 이 기기에 보관됐어요.
다시 시도하면 결과 준비를 이어갈 수 있어요.
```

주 행동은 `다시 시도`, 보조 행동은 `나중에 확인하기`다. 같은 snapshot과 completion request를 재사용하며 검사를 다시 답하게 하지 않는다. 보관이 확인되지 않았다면 보관 문구를 제거하고 마지막 문항의 보관 복구 상태로 돌아간다.

### 6.7 응답 근거 부족

`INSUFFICIENT_EVIDENCE`를 로딩·실패로 위장하거나 임의 코드를 발급하지 않는다.

```text
성향을 보여주려면 답이 조금 더 필요해요

판단하기 어렵다고 답한 질문을
조금만 다시 확인해 주세요.

[답 다시 확인하기]
```

코드가 없는 근거 부족 결과도 completion request·응답 hash·assessment/scoring/code/copy version과 함께 저장한다. 재진입하면 같은 상태를 복원하고, 답을 수정하면 이전 근거 부족 snapshot을 제거한 뒤 새 완료 요청을 만든다.

## 7. 시각 구조

새 이미지를 만들지 않고 다음 승인 asset을 그대로 사용한다.

- 운영 asset: `public/assets/assessment/nuang-loading-mascot-v2.png`
- 투명 master: `public/assets/assessment/nuang-loading-mascot-v2-alpha.png`
- 대체 텍스트: `성향 신호를 모아 빛나는 핵을 품은 뉴앙 캐릭터`

구조:

```text
safe-area top
app bar: 검사 제목 · 마지막 문항 수
100% 연속 진행선
minmax(0, 1fr) 중앙 visual·copy 영역
  승인 뉴앙 캐릭터
  제목
  본문
status·action 예약 영역
safe-area bottom
```

`응답 완료` 태그는 제거한다. 완료 여부는 마지막 문항 수, 100% 진행선, 제목으로 충분히 전달된다. 태그를 제거한 자리를 다른 badge나 장식으로 채우지 않는다.

고급감은 넓은 neutral 여백, 정확한 중심축, 승인 캐릭터, 실제 상태와 연결된 motion에서 만든다. phone card·과도한 보라 배경·spinner·회전 궤도·confetti·가짜 분석 파형은 사용하지 않는다.

## 8. 상태가 바뀌어도 뒤틀리지 않는 layout

```css
min-height: 100dvh;
grid-template-rows:
  auto
  auto
  minmax(0, 1fr)
  auto;
```

- 제목은 최대 2줄, 본문은 의미 단위 2–3줄을 허용한다.
- status·action 영역은 정상 상태부터 최소 높이를 예약한다.
- 느림·오류·CTA가 나타나도 캐릭터·제목·본문의 기준 위치가 바뀌지 않는다.
- 낮은 높이와 200% 확대에서는 중앙 body만 세로 scroll을 허용한다.
- 고정 phone height를 사용하지 않는다.

### 8.1 반응형 기준

| viewport | 좌우 여백 |     캐릭터 | 본문 최대 너비 | 비고                           |
| -------- | --------: | ---------: | -------------: | ------------------------------ |
| 320px    |      16px |  156–164px |          280px | 낮은 높이는 136–148px까지 축소 |
| 360px    |      20px |  172–176px |          304px | 상태 문구 최대 288px           |
| 390px    |   20–24px |      184px |          320px | 캐릭터·제목·본문 중심축 일치   |
| 430px    |      24px |      192px |          320px | 글자를 키우지 않고 여백 확장   |
| 520px    |      32px | 최대 200px |          336px | 바깥 phone frame 없음          |

## 9. motion 계약

기존 승인 방향을 보존한다.

| 요소            | 값                               | 의미                            |
| --------------- | -------------------------------- | ------------------------------- |
| 질문 body 퇴장  | 180ms fade                       | 같은 shell에서 완료 상태로 전환 |
| 완료 body 진입  | 280ms fade·scale                 | 새 페이지처럼 튀지 않는 settle  |
| 캐릭터 호흡     | 2.6초                            | 처리가 계속됨                   |
| 중앙 핵 pulse   | 1.6초                            | 답이 한 결과로 모임             |
| 다섯 신호 cycle | 약 3.2초 stagger                 | 완료율이 아닌 반복 중 상태      |
| 상태 문구 교체  | 180ms fade                       | 실제 lifecycle 변화             |
| 결과 ready      | 신호가 한 번 정돈된 뒤 crossfade | 자동 이동 예고                  |

- 신호가 하나씩 완료되는 체크처럼 보이지 않게 모였다가 사라지는 반복 motion으로 표현한다.
- 지연돼도 motion 속도·진폭을 키우지 않는다.
- 실패가 확인되면 호흡·핵·신호 반복을 멈추고 정적 캐릭터를 유지한다.
- 앱이 background로 이동하면 반복 motion을 멈춘다.
- `prefers-reduced-motion`에서는 모든 위치·크기·glow 변화를 멈추고 문구만 유지한다.

## 10. 상태·컴포넌트 계약

```ts
type AssessmentCompletionState =
  | "STABILIZING"
  | "FINALIZING_RESPONSE"
  | "VALIDATING_SNAPSHOT"
  | "BUILDING_RESULT"
  | "SLOW"
  | "OFFLINE"
  | "FAILED"
  | "INSUFFICIENT_EVIDENCE"
  | "READY";
```

권장 책임 분리:

```text
AssessmentRunner
└─ 마지막 CTA 잠금·질문 surface 퇴장

CompletionOrchestrator
├─ 완료 snapshot·release 검증
├─ 멱등 완료 요청
├─ 채점·불확실성 판정
└─ 결과 원자 저장·재조회

AssessmentCompletionState
├─ 승인 캐릭터·motion
├─ 실제 lifecycle 문구
├─ 느림·오프라인·실패
└─ 재시도·자동 이동
```

초기 질문 로딩과 완료 전환은 같은 `AssessmentTransitionShell`과 `NuangLoadingVisual`을 재사용하되 제목·본문·lifecycle·복구 행동만 다르게 주입한다.

## 11. 데이터·release 필수 조건

`READY`와 자동 이동은 다음 조건을 모두 통과해야 한다.

1. attempt에 `assessment_release_id`가 고정되어 있다.
2. snapshot의 item ID가 해당 release에 존재하며 중복되지 않는다.
3. 마지막 응답의 로컬 보관이 확인된다.
4. `VALID` 응답과 `UNSURE` 응답이 상호 배타적으로 저장된다.
5. 기대 item과 snapshot 응답 수의 완결성 검사를 통과한다.
6. 문항·척도·채점 방향과 `scoring_model_version`이 호환된다.
7. 결과에 construct·item·scoring·report-copy·code-scheme version을 보존한다.
8. 결과 상태가 `CLEAR · SPLIT_PROFILE · NEAR_BOUNDARY · INSUFFICIENT_EVIDENCE` 중 하나로 산출된다.
9. 축별 최소 유효 근거와 누락 허용 규칙을 통과한다.
10. 결과가 원자적으로 저장되고 같은 ID로 다시 읽힌다.
11. 동일 `completion_request_id` 재요청은 같은 snapshot과 같은 결과를 돌려준다.

`판단하기 어려움`은 완료 응답이지만 정상 중간값으로 조용히 변환하지 않는다. 축별 근거가 부족하면 해당 글자를 임의 발급하지 않는다. 진행 중 attempt의 release를 최신 release로 자동 교체하지 않는다.

현재 로컬 MVP는 `attempt.id`를 결과 경로의 안정된 identity로 사용하고 `completionRequestId`, 응답 snapshot hash, version bundle, result evidence status를 같은 IndexedDB 레코드에 저장한다. assessment release와 scoring release는 직접 결속하며, 빠른 검사 응답은 승인된 source/target release manifest를 통과할 때만 정밀 검사에 재사용한다. 결과 화면은 지원 가능한 버전·응답 재해시·상태·코드 구조 검증을 통과한 snapshot만 표시·claim·공유한다. 서버 DB로 확장하는 `RBL-07`에서는 같은 필드를 versioned migration으로 보존한다.

## 12. 접근성

- lifecycle 문구만 `role="status"`, `aria-live="polite"`로 갱신한다.
- 실패는 `role="alert"`로 한 번만 알린다.
- 장식 신호는 접근성 tree에서 제외한다.
- 가짜 progress value를 제공하지 않는다. 상단의 문항 progress만 100%로 유지한다.
- 재시도 CTA는 최소 48px다.
- 텍스트 대비는 4.5:1 이상이며 오류를 색만으로 구분하지 않는다.
- 상태 문구 영역 높이를 예약해 layout shift를 막는다.
- 320px·200% 확대·화면 읽기 순서·reduced motion을 함께 검증한다.

## 13. 분석·개인정보 원칙

- 결과 준비 체류시간은 성능·오류 분석에만 사용하고 개인의 성향 추론값과 불필요하게 결합하지 않는다.
- 원문 응답·판단 어려움 이유·내부 점수는 analytics event에 넣지 않는다.
- `completion_request_id`와 내부 오류 코드는 고객 문구에 노출하지 않는다.
- 로컬 결과 열기를 계정 동기화 성공에 종속시키지 않는다.

## 14. 구현·검증 계약

### unit

- 300ms threshold와 350–450ms 안정화
- 같은 completion request의 동일 결과 반환
- quick·full 문구와 목적지 분기
- 누락·판단 어려움·boundary·insufficient evidence
- release mismatch 차단

### component

- 마지막 CTA 연속 탭 1회 처리
- 0–300ms 직접 이동
- 300ms 이상 전환 surface
- 4초 slow와 10초 recovery
- 실패 motion 정지와 재시도
- 정상 상태 CTA 없음
- 정상·느림 상태 홈 CTA 없음, 복구·실패에만 안전 이탈 제공
- 실제 lifecycle 문구만 변경
- reduced motion

### integration·E2E

- 온보딩 → 빠른 검사 → 첫 성향 결과
- 정밀 검사 → 상세 결과
- 마지막 응답 보관 실패 → 복구 → 완료
- 완료 중 앱 종료 → 같은 attempt 복구
- 결과 생성 뒤 route 실패 → 같은 결과 재열기
- 오프라인 로컬 채점과 이후 동기화
- 중복 탭·새로고침·뒤로가기에도 결과 중복 없음

### visual·accessibility

- 320·360·390·430·520px
- 낮은 높이와 safe area
- 200% 확대
- light·dark theme
- 4초·10초 상태 전환 전후 layout shift 없음
- 화면 읽기 순서와 중복 announcement 없음

2026-07-18 production 검증 결과:

- 전체 unit/component 테스트 `83 files · 321 tests` 통과
- completion·storage·runner·result·scoring 집중 테스트 통과
- TypeScript typecheck·ESLint·`git diff --check` 통과
- Next.js production build 통과
- 실제 in-app browser `390×844`, `320×568` 검수에서 가로 넘침 없음
- 320 저높이에서 핵심 제목과 56px 주 CTA가 첫 화면 안에 유지됨
- Psychometrics·Product/UX Writing·Visual Design 세 독립 에이전트 최종 `PASS`

## 15. 구현 차단 조건

- 시간으로 돌리는 가짜 처리 문구
- 임의 퍼센트·정확도·분석 깊이 연출
- 결과 저장·재조회 확인 전 자동 이동
- 빠른 결과의 예비성 제거
- 누락 응답에 임의 코드 발급
- 최신 release로 조용히 교체
- 같은 요청에서 결과 중복 생성
- 실패했는데 motion을 계속 돌려 처리 중으로 보이게 함
- 홈 복구 구조 없이 `홈에서 기다리기` 노출
- 결과 준비 실패 후 검사를 처음부터 다시 요구

## 16. Product Owner 승인·구현 결과

승인·구현 단위는 다음 네 가지다.

1. `S03-R.COMPLETE` 화면 ID와 책임 경계
2. 빠른·정밀 검사별 최종 문구와 줄바꿈
3. 기존 뉴앙 로딩 캐릭터·motion 보존과 `응답 완료` 태그 제거
4. 0–300ms 생략, 노출 시 350–450ms 안정화, 4초 느림, 10초 복구 기준

모바일 시뮬레이션 v1 승인 뒤 production component·completion orchestrator·versioned data contract·결과 snapshot validator를 실제 검사 실행기에 연결했다. 빠른 완료·300ms 노출·4초 느림·10초 복구·실패·근거 부족·재시도·안전 이탈·자동 결과 이동을 fixture가 아닌 실제 로컬 attempt lifecycle로 처리한다.

## 17. 모바일 시뮬레이션 v1

검토 파일:

- `/Users/woorim/.codex/visualizations/2026/07/17/019f6e3f-b857-77c2-8d56-eb405899e54f/nuang-assessment-completion-simulator.html`

시뮬레이션에서 조작할 수 있는 상태:

- 빠른 검사·정밀 검사
- 300ms 안에 준비되어 전환 화면을 생략하는 흐름
- 준비 화면이 실제로 표시되는 흐름
- 4초 시점의 느림 안내
- 10초 시점의 복구 안내
- 결과 준비 실패와 재시도

검토용 상단 버튼과 결과 축약 미리보기는 실제 고객 화면에 포함하지 않는다. 시뮬레이션의 3초 재생 시간, `20 / 20`·`60 / 60`, `ERGKC`는 동작 확인용 fixture다. production은 attempt의 실제 문항 수, 완료 snapshot 상태, scoring·result lifecycle, 실제 결과 route에 연결한다.

## 18. Production 구현 경로

- `src/features/assessment/AssessmentCompletionState.tsx`
- `src/features/assessment/AssessmentCompletionState.module.css`
- `src/features/assessment/AssessmentRunner.tsx`
- `src/features/assessment/assessment-completion.ts`
- `src/features/assessment/assessment-storage.ts`
- `src/features/assessment/assessment-response-reuse.ts`
- `src/features/assessment/assessment-result-snapshot.ts`
- `src/features/result/LocalResultView.tsx`

최종 전문가 gate에서 출시 차단 이슈는 없다. 비차단 후속 항목은 실제 iOS·Android에서 320px 저높이의 미세한 세로 bounce 관찰, 상태별 시각 회귀 캡처 고정, release 간 재사용 문항의 고정 manifest 운영, snapshot facet 구조 방어 강화다.
