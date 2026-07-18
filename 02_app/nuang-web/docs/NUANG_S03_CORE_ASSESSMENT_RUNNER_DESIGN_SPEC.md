# NUANG S03 Core Assessment Runner Design Specification

작성일: 2026-07-17 KST  
상태: `ITEM_DESIGN_GATE_COMPLETE` · `S03_R_RECOVERY_SUITE_V1_OWNER_REVIEW`  
기준: `NUANG_APP_FUNCTIONAL_REQUIREMENTS.md`, `NUANG_UI_UX_MASTER_DESIGN_BLUEPRINT.md`, UI Foundation v5

최신 문항·응답 계약: [NUANG_M02_ITEM_AND_RESPONSE_SPEC.md](./NUANG_M02_ITEM_AND_RESPONSE_SPEC.md)

정밀 모드 production surface·구현 계약: [NUANG_CORE_ASSESSMENT_RUNNER_PRECISION_MODE_SPEC.md](./NUANG_CORE_ASSESSMENT_RUNNER_PRECISION_MODE_SPEC.md)

화면별 brief: [NUANG_S03_R_V3_SCREEN_BRIEF.md](./NUANG_S03_R_V3_SCREEN_BRIEF.md)  
상태 suite brief: [NUANG_S03_STATE_SUITE_V5_SCREEN_BRIEF.md](./NUANG_S03_STATE_SUITE_V5_SCREEN_BRIEF.md)

복구 상태 brief: [NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md](./NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md)

> 이 문서의 UI 셸 원칙은 유지한다. 문항 문법, 1~5 응답 카피, 판단 어려움 이유, 최소 문항 수, 데이터 필드는 M02 최신 계약을 우선한다. 기존 `내 모습이다` 응답 카피와 빠른 20·정밀 60문항 숫자는 확정값이 아니다.

UI 복귀 순서: [NUANG_ITEM_DESIGN_TO_UI_UX_RETURN_PLAN.md](./NUANG_ITEM_DESIGN_TO_UI_UX_RETURN_PLAN.md)  
`RBL-01A~E-R1`과 150개 통합 재감사를 완료했다. 이제 이 화면을 `S03-R runner v3`로 다시 설계한다. M04~M07 전체가 끝날 때까지 기다리지 않고, 완성된 prototype을 M05 인지 인터뷰와 M06 파일럿에 사용한다.

DB 변경 계약: `NUANG_S03_CONTEXT_LABEL_DB_MIGRATION_PLAN.md`

빠른 코어 라벨 매트릭스: `NUANG_QUICK_CORE_CONTEXT_LABEL_CONTENT_MATRIX.md`

검사 타당화 계획: `NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md`

## 0. 확정된 설계 결정

- 첫 방문자는 G04에서 별도 소개 화면 없이 빠른 코어 첫 문항으로 이동한다.
- 빠른 코어와 정밀 코어는 문항 수와 관계없이 하나의 runner 패턴을 공유한다. 문항 수는 승인된 release가 제공하며 현재 20·60개로 고정하지 않는다.
- 진행률은 문항별 segment가 아니라 하나로 이어진 progress bar로 표현한다.
- 정상 상태의 `자동 저장` 문구는 표시하지 않는다. 저장은 배경 동작이며, 실패·복구처럼 사용자의 판단이 필요한 순간에만 안내한다.
- `이 상황은 답하기 어려워요`는 장식이나 건너뛰기가 아니라 이유와 함께 저장·복원되는 정식 응답 상태다.
- 이전은 44px icon action, 다음은 나머지 폭을 사용하는 주 행동으로 하단 dock에 둔다.
- 하단 dock은 safe area를 포함하며 스크롤 중에도 엄지 도달 영역에 유지한다.
- 검사 중에는 하단 탭바, 결과 preview, 캐릭터 장식, 점수, 보상을 노출하지 않는다.
- 각 문항은 `상황 라벨(contextLabel)`과 `질문 문장(text)`을 별도 필드로 가진다. 상황 라벨은 작은 뉴앙 퍼플 텍스트, 질문은 주 제목으로 표시한다.
- `S03`, `S05` 같은 내부 화면 ID와 개발 인계 문구는 고객 화면에 절대 노출하지 않는다.

## 1. 화면 목표

사용자는 한 화면에서 아래 세 가지를 즉시 이해해야 한다.

1. 지금 무엇을 기준으로 답해야 하는가.
2. 어느 문항까지 왔고 다음 행동은 무엇인가.
3. 선택한 답이 유지되며 이전 문항으로 돌아가도 복원되는가.

빠른 코어 첫 문항 진입 후 5초 안에 첫 응답을 선택할 수 있어야 한다. 검사 자체가 심리 진단이나 정답 맞히기처럼 느껴지지 않아야 하며, 긴 설명이나 저장 안내가 응답보다 먼저 경쟁하지 않아야 한다.

## 2. 범위와 비범위

### 포함

- 빠른 코어와 정밀 코어의 공통 진행 화면
- 문항 로딩, 미응답, 응답 선택, 응답 변경, 판단하기 어려움
- 이전·다음·마지막 문항 이동
- 진행률, 현재/전체 문항 수
- 로컬 저장 성공·지연·실패와 메모리 유지
- 이어하기와 이전 응답 복원
- 작은 화면, 긴 문항, 키보드, 화면 읽기, reduced motion

### 제외

- 검사 중단 확인 sheet의 최종 시각 디자인: S04
- 채점·결과 생성 전환: S05
- 빠른 결과 리포트: S06
- 홈, 피드, 로그인, 공유, 비교

## 3. 진입과 이탈

### 진입

| 진입 맥락               |            시작 위치 | 처리                                           |
| ----------------------- | -------------------: | ---------------------------------------------- |
| G04 빠른 코어 시작      |                  1번 | 새 로컬 attempt 생성                           |
| 홈·검사 허브의 이어하기 |          저장된 위치 | 현재 문항과 기존 응답 복원                     |
| 정밀 코어 새 시작       |       첫 미응답 문항 | 재사용 가능한 빠른 코어 응답을 초기값으로 적용 |
| 깊은 링크               | 저장된 위치 또는 1번 | 만료 attempt는 새로 시작                       |

### 이탈

- 상단 닫기는 즉시 다른 route로 보내지 않고 S04 중단·이어하기 sheet를 연다.
- 브라우저·OS 뒤로가기도 같은 이탈 계약을 사용한다.
- 마지막 문항 완료 전 결과 route로 이동하지 않는다.
- 저장 실패 상태에서 이탈하면 `앱을 닫으면 이번 응답을 잃을 수 있어요`를 S04에서 명시한다.

## 4. 정보와 레이아웃 계층

### 4.1 Focused shell

1. 상단 app bar
   - 좌측: 닫기
   - 중앙: `빠른 코어` 또는 `정밀 코어`
   - 우측: `현재 / 전체`
2. 하나로 이어진 progress bar
3. 문항 영역
   - 상황 라벨: 예) `계획이 갑자기 바뀔 때`
   - 질문 문장: 예) `새로운 방법을 찾기보다 원래 계획을 지키고 싶은 편이다.`
4. 응답 영역
   - 1~5 scale
   - 낮은 위계로 분리된 `이 상황은 답하기 어려워요`
5. 하단 action dock
   - 이전
   - 다음 또는 결과 보기

`최근 6개월 동안 반복된 평소 모습`이라는 공통 응답 기준은 검사 시작 안내와 접근 가능한 도움말에 한 번 제공한다. 모든 문항 위에 반복해 상황 라벨과 경쟁시키지 않는다.

### 4.2 문항 콘텐츠·데이터 계약

```ts
export type AssessmentItem = {
  itemId: string;
  domainId: string;
  facetId: string;
  contextLabel: string | null;
  text: string;
  isReverse: boolean;
};
```

- 저장·API 이름은 `context_label`, 프론트 도메인 모델은 `contextLabel`로 매핑한다.
- `contextLabel`은 화면에 보여주는 작성형 콘텐츠이며 `facetId`, `domainId`, 채점 방향에서 자동 생성하지 않는다.
- 기존 release와 안전하게 호환하기 위해 전송 타입은 nullable로 시작하되, 새 코어 release의 발행 검증에서는 trim 후 비어 있지 않은 값을 필수로 한다.
- 상황 라벨은 질문이 성립하는 중립적 장면만 짧게 설명한다. 바람직한 행동, 감정 평가, 답의 방향, 내부 축 이름을 넣지 않는다.
- 권장 형식은 한국어 한 구절, 한 줄 우선, 작은 화면에서 최대 두 줄이다. 마침표와 질문형 표현을 피하고 `~할 때`, `~하는 자리에서`처럼 끝낸다.
- 상황 라벨과 질문은 한 쌍으로 내용 검수를 받는다. 라벨 변경도 응답 해석을 바꿀 수 있으므로 단순 UI 문구 수정으로 취급하지 않고 새 `releaseId`와 콘텐츠 검토를 거친다.
- 기존 질문의 앞부분을 기계적으로 잘라 라벨로 만들지 않는다. 구현 전 승인 후보 release 전체에 대해 `itemId / contextLabel / promptText / 검수 상태` 콘텐츠 매트릭스를 만들고 문항별로 승인한다.
- 콘텐츠 hash·release payload에는 `contextLabel`을 포함한다. 로컬 attempt에는 라벨을 중복 저장하지 않고 `releaseId + itemId`로 불변 release 콘텐츠를 다시 찾는다.
- 오프라인 이어하기를 위해 release item cache에는 `contextLabel`과 `text`를 함께 보관한다. 캐시에서 라벨만 누락된 구 release는 빈 간격 없이 질문을 위로 당겨 표시한다.
- 직접 응답과 마찬가지로 상황 라벨 원문은 분석 이벤트 payload에 보내지 않는다.

예시:

```ts
{
  itemId: "NU-C17-SMEP-01",
  domainId: "SM",
  facetId: "SM-EP",
  contextLabel: "해야 할 일을 시작할 때",
  text: "해야 할 일이 생기면 미루기보다 시작하는 편이다.",
  isReverse: false,
}
```

### 4.3 크기 원칙

- 앱 콘텐츠 최대 폭: 520px
- 기본 검토 폭: 390px
- 추가 검증: 320, 360, 430, 520px
- app bar: 최소 56px
- 주요 터치 영역: 최소 44×44px
- 주 행동: 52px 후보를 기준으로 실제 폰에서 검증
- progress track: 약 4px, 양 끝 round
- 하단 dock: `env(safe-area-inset-bottom)` 포함
- 문항과 응답은 스크롤할 수 있지만 action dock과 겹치지 않게 하단 여백을 확보한다.

## 5. 문구 계약

| 위치           | 문구                                                    | 규칙                                                                      |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| 상황 라벨      | `계획이 갑자기 바뀔 때`                                 | 문항별 작성 필드, 작은 뉴앙 퍼플 텍스트, 질문의 정답 방향을 암시하지 않음 |
| 공통 답변 기준 | `최근 6개월 동안 반복된 평소 모습을 떠올려 주세요.`     | 검사 시작·도움말에서 제공하고 매 문항 반복 노출하지 않음                  |
| 판단 불가      | `이 상황은 답하기 어려워요`                             | 이유 선택 패널과 연결하고 1~5의 중앙 응답과 구분                          |
| 일반 이동      | `다음`                                                  | 응답 전 disabled                                                          |
| 마지막 이동    | `결과 보기`                                             | 마지막 응답 저장 성공 또는 메모리 유지 후 활성화                          |
| 로딩           | `검사를 준비하고 있어요.`                               | skeleton과 status 사용, 가짜 분석 금지                                    |
| 저장 실패      | `응답을 저장하지 못했어요. 앱을 닫으면 잃을 수 있어요.` | 기술 오류 원문 금지                                                       |
| 저장 재시도    | `다시 저장`                                             | 응답값을 분석 이벤트에 포함하지 않음                                      |
| 완료 처리      | `답변을 바탕으로 첫 성향을 정리하고 있어요.`            | 실제 처리 시간이 체감될 때만 표시; 즉시 완료되면 바로 결과로 이동         |

`자동 저장`, `N개 응답`, IndexedDB 이름, `S03`, `S05`, route 이름은 정상 검사 화면에 노출하지 않는다. 저장 위치와 보관 기간은 시작·이탈·데이터 안내에서만 설명한다.

## 6. 응답 상호작용

### 6.1 선택

- 응답 전체 행이 하나의 터치 영역이다.
- scale은 한 문항 안에서 항상 같은 순서를 유지한다.
- 선택 시 배경·경계·check가 160~200ms 안에 함께 반응한다.
- 선택 색은 뉴앙 퍼플 하나만 사용하며 특정 선택지를 미리 강조하지 않는다.
- 응답을 바꾸면 마지막 선택 하나만 유지한다.
- 응답 선택과 동시에 로컬 저장을 시도하고 다음 행동을 활성화한다.

### 6.2 이 상황은 답하기 어려움

- 1~5 scale 아래에 시각적으로 분리하고 선택 시 이유 패널을 연다.
- `경험이 거의 없음`, `상황에 따라 크게 다름`, `문장 이해가 어려움`, `답하고 싶지 않음` 중 하나를 선택하면 1~5 선택은 해제된다.
- `responseStatus=UNSURE`와 이유를 저장하고 다음 문항으로 이동할 수 있다. 3점으로 대체하지 않는다.
- 이전 이동·이어하기에서 상태와 이유를 복원한다.
- 판단하기 어려움을 많이 선택했다고 경고하거나 결과 품질을 위협하는 문구를 즉시 보여주지 않는다.

### 6.3 다음과 이전

- 미응답 문항에서는 다음이 disabled다.
- 다음은 현재 문항 응답이 메모리에 존재하면 활성화한다.
- 다음 문항 진입 후 progress와 현재 문항 숫자를 함께 갱신한다.
- 이전은 첫 문항에서 disabled다.
- 이전 문항 진입 시 저장된 응답을 선택 상태로 복원한다.
- 마지막 문항에서는 `다음`을 `결과 보기`로 변경한다.
- 빠른 반복 탭으로 중복 완료가 발생하지 않도록 전환 중 action을 잠근다.

## 7. 상태 모델

| 상태                   | 화면 표현                                              | 가능한 행동             |
| ---------------------- | ------------------------------------------------------ | ----------------------- |
| attempt loading        | shell 구조를 유지한 loading, `검사를 준비하고 있어요.` | 없음 또는 재시도        |
| ready unanswered       | 중립 응답 목록, disabled 다음                          | 응답, 이전, 닫기        |
| ready answered         | 선택 상태 복원, 활성화된 다음                          | 응답 변경, 이전, 다음   |
| save in progress       | 선택 상태 즉시 반영, 상시 문구 없음                    | 중복 선택만 짧게 잠금   |
| save success           | 추가 문구 없음                                         | 이전·다음               |
| save delayed           | 800ms 이상에서 작은 비차단 상태 후보                   | 계속 응답 가능          |
| save failed            | dock 위 오류와 `다시 저장`, 선택은 메모리에 유지       | 재시도, 계속 진행, 닫기 |
| last item              | 다음 라벨을 `결과 보기`로 변경                         | 응답, 이전, 완료        |
| completion in progress | 결과 보기 잠금, 실제 처리 상태만 표시                  | 중복 제출 불가          |
| attempt expired        | 새 검사 시작 안내                                      | 처음부터 시작           |

네트워크 오프라인은 로컬 IndexedDB 저장을 막지 않으므로 검사 화면에 오류로 표시하지 않는다. 로컬 저장소 접근 자체가 실패했을 때만 저장 실패 상태를 사용한다.

## 8. 저장과 개인정보

- 저장 위치: 현재 브라우저·기기의 IndexedDB `nuang-local/assessmentAttempts`
- 진행 중 attempt 보관: 7일
- 완료 로컬 결과 보관: 30일
- release item cache에는 `itemId`, `contextLabel`, `text`를 함께 보관하고 attempt 응답 레코드에는 상황 라벨을 복제하지 않는다.
- 비로그인 진행 데이터는 다른 기기·브라우저로 자동 이동하지 않는다.
- 브라우저 데이터 삭제 시 로컬 attempt도 사라질 수 있다.
- 직접 응답, itemId, scale 값, 판단하기 어려움 여부를 분석 이벤트 payload에 넣지 않는다.
- 로그인·공유·비교 기능이 직접 응답을 공개 projection으로 사용하지 않는다.

## 9. 저장 실패 복구

1. 사용자의 선택은 React 메모리 상태에 즉시 유지한다.
2. 실패한 문항과 현재 위치를 retry queue에 둔다.
3. dock 위에 compact error를 표시하고 `다시 저장`을 제공한다.
4. 사용자는 현재 세션에서 다음 문항으로 계속 진행할 수 있다.
5. 저장이 복구되면 오류 영역을 제거하고 별도 성공 toast를 반복하지 않는다.
6. 이탈 시에는 저장되지 않은 응답이 있음을 S04 sheet에서 명확히 알린다.

## 10. 모션과 촉각

- 응답 선택: 160~200ms color·border·check 변화
- progress: 200~240ms width 변화
- 다음 문항: 진행 방향을 알 수 있는 8~12px 이내의 짧은 수평 이동 또는 동등한 전환
- 이전 문항: 반대 방향의 같은 규칙
- 마지막 완료: 버튼 상태 전환만 사용하고 confetti·분석 파형을 사용하지 않는다.
- 촉각은 사용자의 직접 선택 성공에만 매우 약하게 제공할 수 있다.
- reduced motion에서는 위치 이동을 제거하고 즉시 전환한다.

## 11. 접근성

- 상황 라벨은 문항 `h1` 바로 앞의 설명 텍스트이며, 문항 전환 시 상황 라벨과 질문을 하나의 atomic live region으로 함께 갱신한다.
- 문항 문장은 화면의 `h1` 하나다.
- 응답은 native radio와 `radiogroup` 이름을 사용한다.
- `이 상황은 답하기 어려워요` trigger와 이유 선택은 screen reader가 1~5의 대안 응답임을 이해할 수 있게 연결한다.
- progress는 `role=progressbar`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`를 가진다.
- 화면 읽기 도구에는 `20개 중 3번째 문항`처럼 현재 위치를 제공한다.
- 오류만 `role=alert` 또는 적절한 live region으로 알리고 정상 저장은 반복 낭독하지 않는다.
- focus 순서: 닫기 → 문항 → 응답 1~5 → 이 상황은 답하기 어려움 → 이전 → 다음.
- 키보드 화살표로 radio 선택을 이동할 수 있어야 한다.
- 200% 확대와 320px에서 문항·응답·dock이 겹치지 않는다.
- 색만으로 선택과 disabled 상태를 전달하지 않는다.

## 12. 반응형·긴 콘텐츠

- 문항이 세 줄을 넘으면 응답 영역을 아래로 밀고 본문만 자연스럽게 스크롤한다.
- 하단 dock은 고정되지만 마지막 응답이 dock 뒤에 가려지지 않게 padding을 둔다.
- 320px에서 이전은 아이콘과 접근성 이름만 유지하고 다음은 남은 폭을 사용한다.
- 520px에서는 행 너비만 확장하고 글자 크기와 카드 수를 늘리지 않는다.
- 가로 모드에서도 현재 문항, 최소 한 개 응답, dock이 동시에 조작 가능해야 한다.
- 시스템 키보드가 열릴 수 있는 오류·도움 입력 상태에서는 dock이 키보드와 겹치지 않아야 한다.

## 13. 측정 이벤트

| 이벤트                        | 시점              | 허용 속성                             |
| ----------------------------- | ----------------- | ------------------------------------- |
| `assessment_started`          | 새 attempt 생성   | mode, release_id, entry_context       |
| `assessment_resumed`          | 기존 attempt 복원 | mode, position_bucket, elapsed_bucket |
| `assessment_item_viewed`      | 문항 표시         | mode, position, total_count           |
| `assessment_item_completed`   | 응답 저장 시도    | mode, position, elapsed_bucket        |
| `assessment_previous_clicked` | 이전 이동         | mode, position                        |
| `assessment_save_failed`      | 로컬 저장 실패    | mode, error_category                  |
| `assessment_completed`        | 완료 처리 성공    | mode, total_elapsed_bucket            |

직접 응답값, itemId, 상황 라벨 원문, 문항 원문, 판단하기 어려움 여부, 계정 식별자는 보내지 않는다.

## 14. 구현 변경점

현재 `AssessmentRunner`에서 유지할 부분:

- native radio와 radiogroup
- IndexedDB 기반 attempt 생성·응답·위치 저장
- 이전 응답 복원
- 빠른 코어 응답의 정밀 코어 재사용
- progressbar의 접근성 값
- 하단 safe area

승인 후 변경할 부분:

- `NUANG_S03_CONTEXT_LABEL_DB_MIGRATION_PLAN.md` 기준으로 버전별 문항 콘텐츠 DB 테이블과 `context_label` 컬럼, RLS, seed, read contract를 구현
- `AssessmentItem`에 `contextLabel: string | null`을 추가하고 seed·release loader·offline cache의 `context_label → contextLabel` 매핑을 구현
- 새 코어 release 발행 validator에서 `contextLabel` 누락·공백·과도한 길이·유도 표현을 검사하고, 기존 release에는 라벨 없는 fallback을 유지
- 화면에서 상황 라벨을 질문과 별도 DOM 요소로 렌더링하고 라벨이 null인 구 release에서는 빈 공간을 만들지 않음
- white·black hardcode를 Foundation v5 토큰으로 교체
- 정상 상태의 `N개 응답 · 자동 저장됨` 제거
- app bar 아래 progress를 Foundation v5의 연속형 line으로 정리
- 이전 half-width button을 44px icon action으로 축소하고 다음을 주 행동으로 확대
- 직접 route link인 상단 뒤로가기를 S04 sheet trigger로 변경
- save·load·complete에 오류 복구 상태 추가
- 질문 전환 motion과 reduced-motion 대체 추가
- 빠른/정밀/마지막/이어하기/저장 실패 component test 확장

## 15. 완료 기준

- 320, 360, 390, 430, 520px에서 수평 overflow와 dock 겹침이 없다.
- 모든 새 코어 문항에서 상황 라벨과 질문이 별도 필드·별도 시각 위계로 표시되고, 구 release의 null fallback도 레이아웃을 깨뜨리지 않는다.
- 상황 라벨은 채점에 관여하지 않으며 release 변경·오프라인 캐시·이어하기에서도 같은 문구를 유지한다.
- 빠른·정밀 release의 승인된 문항 수가 달라도 동일한 runner로 표시된다.
- 연속형 progress와 현재/전체 숫자가 같은 위치를 가리킨다.
- 모든 1~5 응답과 판단 어려움 이유를 선택·변경·복원할 수 있다.
- 미응답에서는 다음이 비활성화되고 마지막 문항에서는 결과 보기로 바뀐다.
- 정상 저장 문구는 없고 실패 상태에만 복구 행동이 나타난다.
- 오프라인에서도 로컬 검사를 계속할 수 있다.
- 중복 완료와 데이터 손실 없이 결과 route로 이동한다.
- 화면 읽기, 키보드, reduced motion으로 같은 과업을 완료할 수 있다.
- 브라우저 console error·warning이 없다.

## 16. 다음 단계

문항 내부 설계 게이트는 완료됐다. 다음 작업은 구현보다 화면 설계가 먼저다.

1. `UIX-00`에서 S03-R의 진입 맥락, 사용자 질문, 주 행동, 필수 상태를 하나의 brief로 잠갔다.
2. 390px v2의 상황 라벨·질문·1~5·판단 어려움 non-reflow sheet·하단 엄지 동선·동적 방향을 사용자 승인했다.
3. 상태 suite v5의 로딩 문구 위계·2D 뉴앙 캐릭터·성향 신호 수집 motion·마지막 문항 단순화 방향을 승인했다.
4. `UIX-01`에서 질문 준비 지연·응답 보관 실패·결과 생성 지연·결과 생성 실패의 복구 상태 suite v1을 승인했다.
5. 현재 `UIX-02`에서 S04-R 빠른 결과 리포트 v1의 예비 코드·비슷한 자리·응답 부족·정밀 검사·홈 복귀를 검토한다.
6. 승인된 시안을 실제 동작 prototype에 반영하고 M05 모바일 인지 인터뷰에 사용한다.

현재 구현의 `N개 응답 · 자동 저장됨`, 직접 `/assessments` 이동, 동일 폭 이전/다음, legacy 응답 카피, 상황 라벨 미표시는 v3 설계에서 교체할 명시적 drift다. DB migration과 production scoring 연결은 화면·연구 계약과 별도로 승인하며, provisional 후보를 검증된 운영 release처럼 공개하지 않는다.
