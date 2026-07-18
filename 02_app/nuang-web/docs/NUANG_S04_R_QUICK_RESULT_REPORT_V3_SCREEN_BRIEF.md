# NUANG S04-R 빠른 결과 리포트 v3 화면 brief

작성일: 2026-07-18 KST  
상태: `S04_R_QUICK_RESULT_V3_OWNER_REVIEW`  
작업 ID: `UIX-02_QUICK_RESULT_MOTION_SPACING_REVIEW`  
대체 문서: [NUANG_S04_R_QUICK_RESULT_REPORT_V2_SCREEN_BRIEF.md](./NUANG_S04_R_QUICK_RESULT_REPORT_V2_SCREEN_BRIEF.md)

## 0. 개정 결론

v2의 정보 구조와 공유 정책은 유지하고, 모바일 앱 프레임·접힘·공유 sheet·다음 단계 CTA의 시각 규칙을 하나로 통일한다.

1. 공유 sheet의 좌우 폭을 바깥 preview가 아니라 실제 `.s04-app` surface와 정확히 맞춘다.
2. `왜 예비 결과인가요?`는 브라우저 기본 `details`를 쓰지 않고 높이·투명도·chevron이 함께 움직이는 접근 가능한 disclosure로 바꾼다.
3. 공유는 backdrop fade, sheet lift, 내용 순차 reveal, 완료 안내 reveal을 적용한다.
4. 하단 CTA는 sticky로 화면을 가리지 않고 결과를 읽은 뒤 만나는 다음 단계 card로 유지한다.
5. 모든 상태 tag는 동일한 왼쪽 정렬선과 내부 수직 정렬을 사용한다.
6. 공유 sheet의 정보 간격을 넓히고 공개 범위·외부 공유·피드 공유를 서로 다른 그룹으로 분리한다.

## 1. 모바일 폭 계약

S04 시뮬레이션에는 검토용 바깥 `.card.s04-phone`과 실제 앱 surface인 `.s04-app`이 있다. 공유 sheet는 phone card의 바깥 폭이 아니라 `.s04-app` 폭을 사용한다.

| 검토 폭       | 실제 앱 surface | 공유 sheet | 결과                   |
| ------------- | --------------: | ---------: | ---------------------- |
| 320px preview |           264px |      264px | 정확히 일치            |
| 390px preview |           334px |      334px | 정확히 일치            |
| 넓은 preview  |      최대 366px | 최대 366px | phone 안에서 중앙 정렬 |

- sheet 내부 좌우 padding은 본문과 같은 `1.25rem`을 사용한다.
- 320px에서는 링크 복사와 다른 앱 공유를 세로로 재배치한다.
- 320px과 390px 모두 sheet 내부 수평 overflow와 별도 내부 scroll을 만들지 않는다.
- 실제 앱 구현에서는 app shell portal 또는 검증된 dialog/sheet component로 같은 너비와 safe area를 보장한다.

## 2. tag 정렬 규칙

적용 대상:

- `첫 성향 결과 · 예비 코드`
- `조금 더 확인이 필요해요`
- `공개되는 내용`

공통 규칙:

- tag 바깥은 `s04-tag-row`, 안쪽은 `viz-badge`와 `s04-tag-label` 조합을 사용한다.
- 작은 원형 mark와 텍스트를 `inline-flex · align-items:center`로 묶는다.
- hero와 공유 sheet의 tag는 각 section 본문의 왼쪽 정렬선과 정확히 일치한다.
- 운영체제 emoji나 장식 목적의 데스크톱 아이콘을 넣지 않는다.
- 320px QA에서 hero tag와 공유 tag의 왼쪽 좌표 차이는 `0px`이어야 한다.

## 3. 예비 결과 disclosure

`왜 예비 결과인가요?`는 사용자가 눌렀을 때 아래 요소가 한 동작으로 이어진다.

```text
닫힘
→ chevron 180° 회전
→ 본문 높이 0 → 실제 높이
→ 본문 opacity 0 → 1
→ 위에서 아래로 0.25rem 안착
```

- toggle은 native `button`을 사용한다.
- `aria-expanded`, `aria-controls`, panel의 `aria-hidden`을 실제 상태와 동기화한다.
- 열림 260ms, opacity 180ms를 기준으로 하고 `prefers-reduced-motion`에서는 즉시 전환한다.
- panel을 닫았을 때 레이아웃에 빈 높이가 남지 않는다.
- 설명은 신뢰 정보를 담되 결과 읽기의 기본 흐름을 방해하지 않는다.

## 4. 공유 sheet motion과 간격

### 열림·닫힘

- backdrop은 200ms fade와 7px blur로 현재 화면과 공유 작업을 분리한다.
- sheet는 아래에서 `1.5rem` 올라오며 scale `0.985 → 1`로 320ms 안착한다.
- 제목, 공개 preview, 공유 방법은 55ms·95ms·135ms 순서로 짧게 나타난다.
- 닫을 때는 같은 방향을 역으로 사용하고 완료 뒤 DOM을 숨긴다.
- 열려 있는 동안 결과 본문과 하단 CTA는 `inert`로 조작되지 않는다.
- 닫기 뒤 포커스는 원래 `공유` 버튼으로 돌아간다.

### 정보 그룹

```text
제목과 설명
→ 공개되는 내용
   → ERGKC / 예비 결과
   → 공개 요약
   → 제외되는 개인정보
→ 카카오톡
→ 링크 복사 / 다른 앱
→ 30일 안내
→ 뉴앙 안에서 공유
   → 피드에 공유
→ 처리 결과
```

- 공개 preview는 위아래 divider와 충분한 padding으로 다른 행동과 분리한다.
- 개인정보 안내에는 앱용 line icon과 텍스트를 함께 사용한다.
- 카카오톡은 외부 공유의 주 행동, 링크와 기기 공유는 보조 행동이다.
- 피드 공유는 외부 전송과 다른 수명이므로 별도 label 아래에 둔다.
- 처리 결과는 `aria-live=polite`와 짧은 reveal motion으로 제공한다.

## 5. 하단 다음 단계 CTA 검토

결과 화면에서는 sticky CTA가 항상 화면을 가리는 것보다, 결과를 충분히 읽은 뒤 만나는 다음 단계 영역이 적합하다. 따라서 위치는 유지하고 정보 위계만 개선한다.

- 기본 제목은 `정밀 검사에서 더 또렷하게`다.
- 설명은 `더 다양한 상황`과 `다섯 코드 자리의 구체적 안내`라는 효용을 먼저 말한다.
- 왼쪽의 동일한 app icon system으로 다음 행동 영역임을 빠르게 구분한다.
- `정밀 검사로 더 알아보기`만 primary full-width CTA다.
- `홈으로 돌아가기`는 ghost full-width action으로 시각적 경쟁을 줄인다.
- 결과 상태가 비슷하면 `비슷한 자리를 더 또렷하게`, 응답이 부족하면 `조금 더 확인하고 코드로 묶어볼까요?`로 이유를 바꾼다.
- 자동 시작, 시간 압박, 저장 위치 설명은 넣지 않는다.

## 6. 접근성·반응형·motion QA

- 320px과 390px에서 앱 surface와 공유 sheet 폭이 정확히 일치한다.
- 두 폭 모두 문서와 sheet의 수평 overflow가 없다.
- 320px에서도 공유 sheet가 viewport 안에 들어오고 내부 scroll이 생기지 않는다.
- disclosure 닫힘 높이는 `0`, 열림 뒤 실제 본문 높이를 사용한다.
- 공유 sheet의 네 가지 방법과 닫기·Escape·바깥 영역 동작을 유지한다.
- 모든 button은 접근 가능한 이름을 갖고 duplicate ID가 없어야 한다.
- `INSUFFICIENT_EVIDENCE`에는 공유를 숨기고 정밀 검사·홈 행동만 유지한다.
- 의미 없는 반복 motion과 운영체제 emoji는 사용하지 않는다.

## 7. 다음 단계

v3 승인 뒤 S04-R의 첫 읽기·신뢰 disclosure·공유·정밀 검사 CTA를 완료하고 S05-R 정밀 검사 소개 화면으로 이동한다. 실제 React component와 SDK 연결은 승인된 measurement release와 versioned migration 일정에 맞춰 구현한다.
