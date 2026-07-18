# M04 internal AI blind critique v0.1

상태: `INTERNAL_CRITIQUE_V0_1_COMPLETE_NOT_EXTERNAL_VALIDATION`  
protocol: `m04-core-expert-kit.v0.1`  
목적: 실제 전문가·사용자 검토 전에 packet, 문항, 응답 계약, 분석 파이프라인의 문제를 독립 역할 관점에서 조기 발견

## 증거 경계

- 이 폴더의 응답은 AI 에이전트 역할 검토다.
- 외부 심리측정 전문가 검토, 2030 사용자 인지 인터뷰, 정량 파일럿과 합산하지 않는다.
- `M04 완료`, `검증된 문항`, `타당도 확보`의 근거로 사용하지 않는다.
- 자동 분석은 `--allow-incomplete-preview`로만 실행하고 `final_decision`을 작성하지 않는다.
- 발견된 문제는 실제 M04/M05에서 확인할 가설과 우선순위로만 사용한다.

## 독립 역할 슬롯

| slot | 역할                     | 검토 범위                                            |
| ---- | ------------------------ | ---------------------------------------------------- |
| R01  | 심리측정·척도 설계 1     | 구성개념 mapping, 단일 반응성, 반복 빈도 척도 적합성 |
| R02  | 한국어 문항·쉬운 말      | 문법, 즉시 이해, 상황·질문 중복, 부정·제한 표현      |
| R03  | 2030 모바일 UX·인지 부담 | 한 번 읽기, 경험 보편성, 모바일 응답 부담            |
| R04  | 성격·사회심리            | 인접 성향 오염, 상태·능력·역할 혼입                  |
| R05  | 심리측정·척도 설계 2     | R01과 독립된 mapping·방향·방법효과 판단              |
| R06  | 접근성·문화·편향         | 접근 경험, 교육·직업·관계·문화 전제, 낙인·바람직성   |

R07·R08은 이번 내부 critique에서 사용하지 않는다.

## blind 규칙

각 슬롯은 자신의 Stage 1 세 packet과 reviewer brief·blind codebook·응답 가이드만 본다. 다음은 Stage 1 세 회차 잠금 전 금지한다.

- `generated/internal` 전체
- Stage 2 target reveal
- opaque mapping
- M01·M03 source 문서
- 다른 reviewer packet과 응답
- 다른 reviewer의 판단 요약

## 실행 순서

1. R01~R06 Stage 1을 독립 수행한다.
2. 각 원본 hash와 잠금 시각을 기록한다.
3. 여섯 슬롯의 Stage 1 세 회차가 모두 잠긴 뒤에만 Stage 2를 공개한다.
4. 동일 슬롯이 자신의 Stage 2를 수행한다.
5. 자동 집계는 내부 preview 상태로 생성한다.
6. 자동 판정과 원문 반론을 실제 M04/M05 확인 과제로 전환한다.

## 완료 결과

- Stage 1: 18 files · 900 rows
- Stage 2: 18 files · 900 rows
- intake·hash·잠금·Stage 2 공개 순서: `PASS`
- 자동 triage: pass-to-cognitive 88, copy 26, access hold 23, construct rewrite 8, risk hold 4, exclude/rebuild 1
- 우선 차단: 5개
- 동일 비target seam: 6개
- protocol 발견: RO-EC의 `HIGH/LOW` 방향 앵커 누락

해석과 다음 조치는 [내부 AI blind critique 결과](../../../../NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md)를 기준으로 한다.
