# M04 OE 문항 판정 가이드

문서 버전: `m04-oe-expert-kit.v0.1`  
사용 시점: 모든 유효 reviewer의 Stage 1·2 잠금과 사전등록 분석 완료 후  
원칙: 판정 회의는 독립 자료를 대체하지 않고, 증거와 다음 revision을 연결한다.

## 1. 회의 전 준비물

- 잠긴 사전등록과 deviation log
- 유효/제외 reviewer 목록과 이유
- Stage 1 첫·두 번째 mapping, 방향, 4개 평정, desirability, risk flag
- Stage 2 관련성·방향 적합성·범위 기여·분리 평정·권고
- 문항별 자유 서술 원문
- facet·상황 버킷·direction·polarity set 균형표
- 빈 `adjudication_decision_log.csv`

문항 작성 근거와 예상 target은 Stage 1·2 결과표가 고정된 다음 회의 자료에 추가한다.

## 2. 판정 순서

1. protocol deviation과 제외 결정을 먼저 확정한다.
2. target 첫 mapping과 반복된 비target seam을 본다.
3. 방향 혼동과 `UNCLEAR`의 이유를 본다.
4. target 관련성·명확성·단일 반응성·척도 적합성 분포를 본다.
5. 능력·접근·교육·매체·사회적 바람직성 위험을 검토한다.
6. fatal risk와 소수 의견을 다수 의견보다 먼저 토론한다.
7. item 결정과 revision 수준을 기록한다.
8. 마지막에만 set 전체 균형과 M05 form 구성을 확인한다.

## 3. 최종 상태

| 상태                 | 의미                                                   | 다음 행동                          |
| -------------------- | ------------------------------------------------------ | ---------------------------------- |
| `PASS_TO_COGNITIVE`  | 현재 문구를 실제 사용자 이해 검증으로 이동 가능        | M05 form에 포함                    |
| `COPY_REVISE`        | target은 유지하되 쉬운 말·범위·부정문·척도 적합성 수정 | minor revision 발행 후 M05         |
| `CONSTRUCT_REWRITE`  | 상황 또는 반응이 다른 구성개념을 주로 묻음             | major revision, 필요 시 M04 재검토 |
| `HOLD_FOR_ACCESS`    | 접근·감각·노출 문제가 내용 평가를 지배함               | 대체 상황/방식 설계 후 재검토      |
| `EXCLUDE_OR_REBUILD` | 현재 문항으로 의도한 해석을 지지하기 어려움            | retire 또는 새 candidate ID        |

## 4. revision 수준

| 수준          | 예                                | ID 처리                      | 재검증                  |
| ------------- | --------------------------------- | ---------------------------- | ----------------------- |
| patch         | 오탈자·띄어쓰기                   | revision 증가                | lint·기록               |
| minor         | 쉬운 동사·범위·부정 표현 수정     | 같은 candidate의 새 revision | M05 필수                |
| major         | 상황·표적 반응 변경               | 같은 계보의 major revision   | 제한적 M04 재검토 + M05 |
| new candidate | target facet·keyed direction 변경 | 새 candidate ID              | M03부터 다시            |
| retire        | 사용 중단                         | ID 재사용 금지               | 이유 보존               |

## 5. 회의에서 금지할 shortcut

- 평균 관련성이 높다는 이유로 낮은 blind mapping을 무시함
- reviewer가 target을 몰라서 틀렸다고 해석함
- 한 명뿐인 접근성·낙인 우려를 표 수가 적다고 삭제함
- M05 form의 문항 수를 맞추려고 낮은 품질 문항을 통과시킴
- R을 현실적 능력, N을 창의적·지적인 사람으로 확대 해석함
- LOW 문항만 부정문·제한어로 남겨 방향과 문법을 혼동시킴
- 문구를 크게 바꾼 뒤 기존 평정이 새 문구에도 유효하다고 간주함

## 6. decision log 필수 기록

- 유효 expert 수와 target mapping 수·비율
- 동일 비target 30% seam flag
- 관련성·명확성 중앙값
- 열린 fatal risk와 처리 근거
- proposed decision과 final decision이 다른 이유
- 정확한 revision 요구사항
- 반대 의견·보류 의견
- 승인자와 시각

합의가 되지 않으면 억지로 `PASS`하지 않는다. `HOLD_FOR_ACCESS` 또는 `CONSTRUCT_REWRITE`로 남기고 추가 증거가 무엇인지 기록한다.
