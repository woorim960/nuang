# 151. P0 양성 합성 경계 시험 v2.3

- 상태: `TECHNICAL_POSITIVE_STOPPED_AT_SYNTHETIC_BOUNDARY`
- 공개 상태: `research_only`
- 모형 출력: **80개**
- discovery-confirmation 조합: **40개**
- 기술 임계값 통과: **40개**
- 문장 검토 자격/canonical 지지/수정/공개 승인: **0 / 0 / 0 / 0**

## 목적

강한 효과처럼 보이는 합성 값이 들어와도 실제 독립 표본과 검토 절차가 없으면 고객 문구나 공개 승인으로 넘어가지 않는지 확인한다. 이 시험은 실제 효과를 추정하지 않는다.

## 결과

- 통과 — 40개 discovery-confirmation 조합이 기술 임계값을 통과한다.
- 통과 — 80개 출력 모두 synthetic 전용 정지 상태에 머문다.
- 통과 — 문장 검토 자격, canonical 지지, 수정, 공개 승인은 모두 0이다.

## 멈춘 경계

`real_independent_sample_required`

- 실제 참여자 표본
- 독립 discovery 표본
- 독립 confirmation 표본
- 사전등록 실행 기록
- 실제 품질·결측·불변성·민감도 분석
- 독립 문장 검토
- 고객 이해도 검토

## 해석 제한

표본 수는 0명이고 추론 모형은 실행하지 않았다. 양성 수치는 판정 경계를 시험하려고 넣은 fixture 값일 뿐 뉴앙 축, 상황 또는 canonical 문장을 지지하지 않는다.

## 다음 gate

134~151 산출물을 공개 gate와 현재 manifest에 연결하고 전체 재현성 검사를 수행한다.
