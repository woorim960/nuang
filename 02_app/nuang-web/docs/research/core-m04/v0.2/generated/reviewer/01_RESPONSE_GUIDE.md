# M04 v0.2 수정 후보 제한 blind review 안내

protocol: `m04-core-expert-kit.v0.2-targeted`  
대상: v0.1 내부 dry-run에서 major revision 또는 새 후보가 필요했던 8문항

## 검토 순서

1. `00_STAGE1_CODEBOOK.md`를 읽는다.
2. 자신의 `Rxx_stage1_blind.csv` 8행을 독립적으로 평가한다.
3. Stage 1 원본을 제출하고 hash 잠금 확인을 받는다.
4. 잠금 확인 전에는 `internal` 폴더나 Stage 2 파일을 열지 않는다.
5. 잠금 뒤 자신의 Stage 2 target reveal 8행을 평가한다.

## Stage 1 입력

- 첫 구성개념: 코드북 12개 코드, `METHOD`, `NONE`
- 두 번째 구성개념: 같은 허용 값 또는 `NONE`
- 방향: `HIGH`, `LOW`, `UNCLEAR`
- 네 평정: 명확성, 단일 반응성, 보편성, 최근 6개월 빈도 척도 적합성 `1`~`4`
- 위험: 기존 M04 위험 코드를 `;`로 연결하거나 `NONE`
- 치명 위험이 없으면 `fatal_risk_note`에 `NONE`

## Stage 2 입력

- target 관련성, 방향 적합성, 인접 성향 분리 `1`~`4`
- 범위 기여: `REDUNDANT`, `SOME`, `IMPORTANT`
- 권고: `KEEP`, `COPY_REVISE`, `CONSTRUCT_REWRITE`, `HOLD`, `EXCLUDE`
- 근거를 `final_rationale`에 기록한다.

## 주의

- HIGH/LOW는 좋고 나쁨이나 능력의 높고 낮음이 아니다.
- RO-EC는 `HIGH = 상대 마음·안녕 먼저`, `LOW = 원인·사건·해결 먼저`다.
- target을 본 뒤 Stage 1을 수정하지 않는다.
- 이 제한 검토만으로 전체 M04나 문항 타당도를 승인하지 않는다.
