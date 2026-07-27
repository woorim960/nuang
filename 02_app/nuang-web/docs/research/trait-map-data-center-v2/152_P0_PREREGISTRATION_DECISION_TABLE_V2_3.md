# 152. P0 사전등록 결정표 v2.3

- 상태: `DECISION_TABLE_LOCKED_SAMPLE_SIZE_AND_EXTERNAL_REGISTRATION_PENDING`
- 모듈: **6개**
- 축-모듈: **10개**
- 주 결과 / 보조 결과: **20 / 20**
- 표본 수 잠금 / 외부 사전등록 / 실행: **0 / 0 / 0**

## 무엇을 잠갔나

- first_thought와 actual_response를 주 결과로 구분한다.
- attention과 communication은 보조 결과로 구분한다.
- 참여자 단위 discovery-confirmation 분리, 무중복 표본, 동일 방향 confirmation을 요구한다.
- 결과를 보기 전에 제외·결측·다중비교·민감도·중단 규칙을 고정한다.
- 통계 신호는 canonical 문장 전체를 직접 지지하지 않는다.

## 아직 잠그지 못한 것

실제·feasibility 자료가 없으므로 모듈별 표본 수는 임의로 만들지 않았다. 효과 방향을 가린 실행 가능성 자료와 power simulation을 거쳐 외부 registry에 목표 N·최대 N을 타임스탬프로 잠근 뒤에만 본 수집을 시작한다.

## 실행 경계

현재 실제 참여자, 실행 모듈, canonical 지지, 고객 발행 승인은 모두 0이다. 이 문서는 실행 준비 결정표이며 사전등록 완료나 타당도 근거가 아니다.
