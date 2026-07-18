# NUANG M04 전 코어 전문가 blind review 실행 키트

작성일: 2026-07-18 KST  
문서 상태: `EXECUTION_KIT_V0_1_INTERNAL_REVIEW`  
측정 상태: `NOT_AUTHORIZED_FOR_SCORING_RELEASE_OR_DB_MIGRATION`  
키트 버전: `m04-core-expert-kit.v0.1`  
대상: 전 5영역 12개 facet, 후보 150문항

관련 기준:

- [검사 검증 계획](./NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md)
- [M03 전 영역 통합 감사](./NUANG_M03_ALL_DOMAIN_INTEGRATED_SEAM_AND_METHOD_AUDIT.md)
- [전문 팀 운영 모델](./NUANG_EXPERT_TEAM_OPERATING_MODEL.md)
- [검토자 안내](./research/core-m04/reviewer/01_REVIEWER_BRIEF.md)
- [blind 구성개념 코드북](./research/core-m04/reviewer/02_BLIND_CONSTRUCT_CODEBOOK.md)
- [응답 가이드](./research/core-m04/reviewer/03_STAGE1_STAGE2_RESPONSE_GUIDE.md)
- [내부 운영 runbook](./research/core-m04/internal/01_COORDINATOR_RUNBOOK.md)
- [사전등록 템플릿](./research/core-m04/internal/02_PREREGISTRATION_TEMPLATE.md)
- [판정 가이드](./research/core-m04/internal/03_ADJUDICATION_GUIDE.md)
- [응답 수신·잠금 사양](./NUANG_M04_REVIEW_INTAKE_AND_LOCK_SPEC.md)
- [자동 검증 결과](./research/core-m04/generated/internal/validation_report.json)
- [내부 AI blind critique v0.1 결과](./NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md)

## 0. 결론

최신 후보 원장의 150문항을 운영 앱 seed로 옮기지 않고, 먼저 독립 blind review를 수행할 수 있는 재현 가능한 패킷으로 고정했다.

```text
M03 후보 원장 150개
→ 실제 ID·영역·facet·HIGH/LOW·score role을 opaque ID로 가림
→ 검토자별 50문항 × 3회 Stage 1
→ 세 Stage 1 모두 잠금
→ 같은 세 회차의 target 공개 Stage 2
→ 사전 기준 집계와 소수 의견 보존
→ KEEP / COPY_REVISE / CONSTRUCT_REWRITE / HOLD / EXCLUDE
→ 통과·수정 후보만 M05 모바일 인지 검토로 이동
```

이 키트는 검토 형식과 데이터 계보를 완성한 것이다. 자동 검증이나 내부 AI 역할 검토는 문항의 타당성을 증명하지 않으며, 실제 사용자 이해·정량 구조·신뢰도·공정성 검증을 대체하지 않는다.

## 1. 검토 범위

| 영역 | facet               | 후보 수 | 현재 역할                           |
| ---- | ------------------- | ------: | ----------------------------------- |
| SE   | SE-RE, SE-AI        |      24 | 대표 E/I 후보                       |
| OE   | OE-AE, OE-CI, OE-IE |      36 | 대표 R/N 후보                       |
| RO   | RO-EC, RO-RN        |      30 | 대표 G/A 18, 본인 전용 상세 연구 12 |
| SM   | SM-EP, SM-OS, SM-RL |      36 | 대표 K/M 24, 조건부 제3 facet 12    |
| ER   | ER-IR, ER-WD        |      24 | 대표 C/Q 후보                       |

역할별 총계:

- 대표 코드 기본 증거: 120
- SM-RL 조건부 주점수 후보: 12
- RO 실제 반응 과정 보조층: 6
- RO-RN 본인 전용 상세 연구: 12
- HIGH 75 / LOW 75

Stage 1에서는 위 역할과 숫자를 검토자에게 공개하지 않는다.

## 2. 세 회차로 나눈 이유

검토자 한 명이 150문항을 한 세션에 평가하면 후반 피로, 같은 응답 반복, 영역 추측, 짝 문항 기억이 커질 수 있다. 따라서 각 검토자에게 서로 다른 순서로 50문항씩 세 회차를 제공한다.

- 모든 검토자는 150문항 전체를 본다.
- 한 문항은 최종적으로 모든 유효 검토자의 독립 판단을 받는다.
- HIGH/LOW 짝 문항은 전체 순서에서 정확히 75칸 떨어져 같은 회차에 함께 나오지 않는다.
- 각 회차는 5영역, 12 facet, 양 방향을 모두 포함한다.
- 같은 영역은 최대 3개, 같은 facet은 최대 2개, 같은 방향은 최대 3개 연속한다.
- Stage 2는 해당 검토자의 W1·W2·W3 Stage 1이 모두 잠긴 뒤에만 공개한다.

## 3. 생성 파일과 공개 경계

| 위치                                                       | 공개 대상                   | 내용                                   |
| ---------------------------------------------------------- | --------------------------- | -------------------------------------- |
| `generated/reviewer/Rxx_Wx_stage1_blind.csv`               | 해당 검토자                 | opaque ID, 상황 라벨, 질문, 빈 평가 열 |
| `generated/internal/DO_NOT_RELEASE...stage2...csv`         | Stage 1 잠금 뒤 해당 검토자 | target·방향·역할 공개 평가표           |
| `generated/internal/opaque_item_mapping.csv`               | 제한된 운영자               | 실제 후보 ID와 opaque ID 대응          |
| `generated/internal/reviewer_roster_template.csv`          | 운영자                      | 역할·독립성·단계 잠금 상태             |
| `generated/internal/packet_lock_log.csv`                   | 운영자                      | 발송·수신·hash·잠금 기록               |
| `generated/internal/adjudication_decision_log.csv`         | 판정 담당                   | 문항별 집계·결정·revision              |
| `generated/internal/mapping_confusion_matrix_template.csv` | 분석 담당                   | target × first mapping 혼동표          |
| `generated/internal/packet_manifest.json`                  | 운영·감사                   | 파일 hash와 source 계보                |
| `generated/internal/validation_report.json`                | 운영·감사                   | 배열 제약 자동 검증                    |

`internal` 전체 폴더 링크를 검토자에게 전달하지 않는다.

## 4. Stage 1 검토 내용

검토자는 target을 모르는 상태에서 다음을 평가한다.

1. 가장 직접적으로 묻는 구성개념
2. 강하게 겹치는 두 번째 구성개념
3. HIGH/LOW 방향 추정 또는 구분 어려움
4. 한 번 읽고 이해되는 정도
5. 하나의 반응만 묻는 정도
6. 다양한 2030 사용자가 경험할 장면인지
7. 지난 6개월 반복 빈도로 답할 수 있는지
8. 어느 방향이 더 좋아 보이는지
9. 능력·접근·교육·문화·역할·임상·사회적 바람직성 위험

## 5. Stage 2 검토 내용

세 blind 회차가 모두 잠기면 target과 내부 역할을 공개하고 다음을 평가한다.

- target 직접 관련성
- keyed direction 적합성
- facet 내용 범위 기여
- 가장 가까운 인접 구성개념과의 분리 가능성
- 공개·과정·비공개 score role 적합성
- `KEEP`, `COPY_REVISE`, `CONSTRUCT_REWRITE`, `HOLD`, `EXCLUDE` 권고

Stage 2에서 판단이 달라져도 Stage 1 원본을 수정하지 않는다.

## 6. 사전 판정 기준

첫 응답을 열기 전에 사전등록 템플릿을 잠근다. 기본 제안 기준은 다음과 같다.

- 유효 독립 검토자 6명 이상
- 심리측정 2, 성격심리 1, 한국어 문항 1, 2030 UX 1, 접근성·편향 1 역할 충족
- target first mapping 75% 이상
- target 관련성 중앙값 3/4 이상
- 명확성·단일 반응성 중앙값 3/4 이상
- 미해결 치명 위험 0
- 동일 비target mapping 30% 이상이면 seam flag

기준을 충족해도 소수의 접근성·낙인·개인정보 위험은 자동 기각하지 않고 별도 판정한다.

## 7. 실행 전 하드 게이트

- [ ] 역할별 검토자와 독립성·이해상충 확인
- [ ] 사전등록·허용 누락·중단 규칙 잠금
- [ ] 검토 데이터 보관·삭제·접근 권한 승인
- [ ] 세 Stage 1 잠금 뒤 Stage 2를 여는 권한 시험
- [ ] 잘못된 target 공개 시 중단·폐기 절차 시험
- [ ] 내부 역할 검토와 외부 검증 근거를 구분하는 보고 규칙 승인

이 항목이 비어 있으면 M04를 `완료`로 표시하거나 문항을 앱·DB에 이관하지 않는다.

## 8. 재생성·drift 확인

```bash
npm run research:core:expert-kit
npm run research:core:expert-kit:check
npm run research:core:review-intake:preflight
```

후보 문구, target, 방향, 역할, source 문서가 바뀌면 기존 패킷을 조용히 덮어쓰지 않는다. 프로토콜 버전을 올리고 기존 패킷은 `RETIRED`로 보존한다.

## 9. 완료 정의

키트 제작 완료:

- 150개 후보·75개 짝·75 HIGH·75 LOW가 재현된다.
- 검토자 8명 × Stage 1 세 회차와 대응 Stage 2가 생성된다.
- Stage 1 target leak이 없다.
- mapping·roster·lock·판정·manifest·validation이 연결된다.
- 생성물 drift check가 통과한다.
- 응답 원본 hash, Stage 2 공개 순서, 허용 값, 자동 집계의 회귀 검사가 통과한다.

M04 연구 완료는 별개다. 유효한 독립 응답, 사전 기준 집계, 판정, revision, 소수 의견이 모두 잠겨야 한다.

## 10. 다음 단계

내부 AI 역할 dry-run v0.1은 완료됐고, RO-EC의 `HIGH/LOW` 방향 앵커 누락을 포함한 protocol·문항 위험을 발견했다. 이 결과는 외부 M04 완료가 아니다.

1. v0.1 원본과 hash를 보존하고 v0.2에 facet별 direction anchor를 명시한다.
2. 우선 차단 5개와 seam 6개의 revision·retire 계보를 기록한다.
3. 실제 사람 전문가의 독립 Stage 1을 실행하고 세 회차를 잠근다.
4. Stage 2와 adjudication으로 M05 후보 revision을 만든다.
5. 통과·수정된 후보만 현재 승인된 S03-R UI 셸의 연구용 데이터로 연결한다.
6. 운영 seed·DB·코드 발급은 M06~M09와 release 승인 뒤에만 변경한다.
