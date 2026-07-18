# NUANG 정밀 성향 검사 응답 보관 실패·복구 설계서

작성일: 2026-07-18 KST  
상태: `PRECISION_SAVE_RECOVERY_V1_OWNER_REVIEW`  
선행 화면: [NUANG_PRECISION_ASSESSMENT_MIDPOINT_CHECKPOINT_SPEC.md](./NUANG_PRECISION_ASSESSMENT_MIDPOINT_CHECKPOINT_SPEC.md)  
공통 계약: [NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md](./NUANG_S03_RECOVERY_STATE_SUITE_V1_SCREEN_BRIEF.md)

## 1. 목표

정밀 검사 응답을 기기에 보관하지 못했을 때 사용자가 다음 세 사실을 즉시 이해하게 한다.

1. 방금 선택한 답은 현재 화면에 그대로 남아 있다.
2. 보관이 확인되기 전에는 다음 질문으로 넘어가지 않는다.
3. 검사를 다시 시작하지 않고 현재 자리에서 바로 복구할 수 있다.

## 2. 기본 화면 계약

- 현재 질문·상황 라벨·선택한 1–5 응답·진행선·하단 dock을 유지한다.
- 정상 상태에서는 저장 문구를 노출하지 않는다.
- `localPersistStatus=failed`일 때만 dock 위 복구 card를 표시한다.
- 복구 card가 나타나도 질문·응답 영역의 위치는 바꾸지 않는다.
- 선택한 응답은 메모리에 유지하지만, 기기 보관 성공처럼 표현하지 않는다.
- `다음`은 보관 성공 전까지 비활성화한다.
- `이전 문항`은 허용하고, 실패한 문항으로 돌아오면 메모리 선택과 복구 card를 함께 복원한다.

## 3. 고객 문구

### 실패

- 제목: `선택한 답을 아직 보관하지 못했어요`
- 설명: `답은 화면에 그대로 있어요. 다시 시도하면 계속할 수 있어요.`
- 행동: `다시 시도`

### 재시도 중

- 제목: `선택한 답을 보관하고 있어요`
- 설명: `화면의 선택은 그대로 유지돼요. 잠시만 기다려 주세요.`
- 행동 상태: `보관하는 중`

### 복구 성공

- 제목: `선택한 답을 보관했어요`
- 설명: `안전하게 보관했어요. 이제 계속해서 답할 수 있어요.`
- 후속 확인: `답을 보관했어요. 이어서 답할 수 있어요.`

`자동 저장`, 저장 위치, 내부 DB·IndexedDB 이름, 오류 코드는 고객 화면에 노출하지 않는다.

## 4. 상호작용

```text
응답 선택
→ 메모리 선택 반영
→ 기기 보관 실패
→ 복구 card + 다음 차단
→ 다시 시도
→ local transaction 재실행
→ 성공 확인
→ 다음 활성화
```

- `다시 시도` 연속 탭은 한 번의 저장 요청만 수행한다.
- 재시도 중에는 CTA를 비활성화하고 실제 보관 작업과 연결된 진행 동작을 보여준다.
- 성공 후 card를 닫고 `다음`에 초점을 이동한다.
- 복구 성공 안내는 실패 뒤 한 번만 제공한다. 정상 문항마다 반복하지 않는다.
- 이전 문항을 다녀와도 실패한 문항의 메모리 선택을 잃지 않는다.

## 5. 저장 실패 중 나가기

상단 닫기를 누르면 정상 이탈 문구를 사용하지 않는다.

```text
이 답을 아직 보관하지 못했어요
지금 나가면 이 문항에서 선택한 답은 잃을 수 있어요.

[다시 시도]
[이 선택 없이 나가기]
```

- `다시 시도`는 sheet를 닫고 동일 복구 작업을 실행한다.
- `이 선택 없이 나가기`는 이전까지 성공적으로 보관된 답만 유지한다.
- 이탈 뒤 재진입 시 보관되지 않은 응답을 복원했다고 표시하지 않는다.

## 6. 상태와 데이터

```ts
type LocalPersistStatus = 'idle' | 'pending' | 'saved' | 'failed';

type PendingAnswer = {
  itemId: string;
  responseStatus: 'VALID' | 'UNSURE';
  responseValue: 1 | 2 | 3 | 4 | 5 | null;
  unsureReason: string | null;
  answeredAt: string;
};
```

- 화면의 `pendingAnswer`와 마지막 성공 snapshot을 구분한다.
- 응답 값과 `currentItemId`는 같은 IndexedDB transaction으로 저장한다.
- 원격 sync 실패와 로컬 보관 실패를 분리한다.
- 로컬 성공·원격 실패는 다음 진행을 허용하고 백그라운드 재시도한다.
- 로컬 실패는 메모리 선택을 유지하되 다음 진행을 차단한다.
- 진단용 `lastErrorCode`는 고객 문구와 분리한다.

## 7. motion

- card 진입: 240ms 이내의 짧은 위쪽 이동
- 재시도: 실제 요청 동안 icon 회전과 상단 진행선
- 성공: shield check의 1회 scale 전환
- card 종료: 200ms 이내의 짧은 아래쪽 이동
- 질문·app bar·progress·dock은 복구 card 상태 변화에 맞춰 흔들리지 않는다.
- `prefers-reduced-motion`에서는 위치 이동과 회전을 제거하고 문구·상태만 갱신한다.

## 8. 접근성

- 실패 card는 `role=alert`, `aria-live=assertive`를 사용한다.
- 상태를 색만으로 구분하지 않고 제목·설명·버튼 상태를 함께 바꾼다.
- 재시도 중 중복 입력을 막고 완료 후 `다음`으로 초점을 이동한다.
- 나가기 sheet는 `role=dialog`, `aria-modal`, 제목 연결, Escape·backdrop 닫기와 trigger 초점 복귀를 지원한다.
- 320·390·520px와 200% 확대에서 가로 overflow, card·dock 겹침, 잘린 문구가 없어야 한다.

## 9. QA 승인 기준

- [ ] 선택한 응답은 실패 전후 같은 값으로 보인다.
- [ ] 실패 상태에서 `다음`은 비활성화된다.
- [ ] 재시도 연속 탭이 중복 transaction을 만들지 않는다.
- [ ] 성공 뒤 `다음`이 활성화되고 다음 문항으로 이동한다.
- [ ] 이전 문항 왕복 뒤 실패 상태와 메모리 선택이 복원된다.
- [ ] 저장 실패 중 나가기 문구가 정상 저장을 약속하지 않는다.
- [ ] 정상 상태에는 저장 성공 문구가 없다.
- [ ] reduced motion·키보드·screen reader로 복구할 수 있다.

## 10. 다음 단계

이 화면을 사용자 승인한 뒤 `AssessmentRunner` 공통 mode 구조에 midpoint checkpoint와 recovery overlay를 함께 연결한다. 그 다음 실제 IndexedDB transaction, attempt snapshot, 원격 sync 재시도와 DB/API 계약을 구현하고 320·390·520px 회귀 테스트를 수행한다.
