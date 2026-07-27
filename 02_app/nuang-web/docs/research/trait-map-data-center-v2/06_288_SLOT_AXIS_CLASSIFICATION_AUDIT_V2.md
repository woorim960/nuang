# 288개 상황 슬롯 축 분류 자동 감사 v2

- 상태: `AUTOMATED_STRUCTURE_PASSED_EXPERT_CLASSIFICATION_REQUIRED`
- 발행 상태: `research_only`
- 대상: 72개 상황 × 주의·처음 드는 생각·실제 나타나는 반응·말하기 4채널

## 결론

288개 슬롯의 원문, 코드 목록, 근거 ID, 기존 통제축은 후보 명세로 빠짐없이
옮겨졌다. 자동 구조 감사에서 발견된 계보 누락이나 기존 축 유실은
0건이다.

하지만 이는 **내용 승인이 끝났다는 뜻이 아니다.** 기존 축으로 설명되지 않았던
116개 중 자동 단서가 양쪽 방향을 모두 찾아낸 슬롯은
13개이고,
103개는 아직 축을 정할 수 없다.
자동으로 억지 분류하지 않고 전문가 검토 대상으로 보존했다.

## 핵심 수치

- 전체 슬롯: 288
- 기존 통제축이 있는 슬롯: 172
- 기존 축 외 후보가 추가된 슬롯: 50
- 복합축 후보 슬롯: 66
- 세 축 이상 복잡 후보: 15
- 고위험 검토 슬롯: 240
- 재합성 승인 슬롯: 0

## 축별 후보 분포

| 축  | 기존 직접 비교 | 새 의미 후보 | 전체 후보 |
| --- | -------------: | -----------: | --------: |
| SE  |             40 |            2 |        42 |
| OE  |             40 |           16 |        56 |
| RO  |             40 |           36 |        76 |
| SM  |             40 |           14 |        54 |
| ER  |             40 |            2 |        42 |

새 의미 후보 수는 정확도 점수가 아니다. 문장 속 양쪽 방향 단서가 발견돼 직접
검토할 가치가 있다는 뜻이다.

## 순차 검토 작업군

| 순서 | 작업군                       | 슬롯 | 완료 목표                                                                                           |
| ---: | ---------------------------- | ---: | --------------------------------------------------------------------------------------------------- |
|    1 | A_UNRESOLVED_UNACCOUNTED     |  103 | 현재 축 신호도 양쪽 의미 단서도 없어 원문 대비를 직접 읽고 축 없음·단일축·복합축을 결정한다.        |
|    2 | B_SUGGESTED_UNACCOUNTED      |   13 | 기존에는 축 설명이 없었지만 양쪽 문장 단서로 새 후보가 생겼다. 맥락 단어 오탐을 먼저 제거한다.      |
|    3 | C_CONTROLLED_WITH_EXTRA_AXIS |   50 | 기존 직접 비교 축 외의 새 의미 축이 제안됐다. 실제 상호작용인지 문장 장식인지 구분한다.             |
|    4 | D_CONTROLLED_LINEAGE_MERGE   |  122 | 기존 축은 유지하되 같은 축 조합에서 갈라진 부모 계보 문장을 정보 손실 없이 하나로 합칠 준비를 한다. |

## 세 축 이상 후보

- `.scenario.friend.new_encounter.attention`: 기존 SE, OE → 후보 SE, OE, RO
- `.scenario.general.aftermath.attention`: 기존 SE, ER → 후보 SE, OE, RO, ER
- `.scenario.general.aftermath.process`: 기존 SE, ER → 후보 SE, RO, ER
- `.scenario.general.aftermath.response`: 기존 SE, ER → 후보 SE, RO, SM, ER
- `.scenario.general.need_expression.process`: 기존 SE → 후보 SE, OE, RO
- `.scenario.general.new_encounter.attention`: 기존 SE, OE → 후보 SE, OE, RO
- `.scenario.general.new_encounter.response`: 기존 SE, OE → 후보 SE, OE, ER
- `.scenario.general.ordinary_choice.attention`: 기존 OE, SM → 후보 OE, RO, SM
- `.scenario.general.ordinary_choice.response`: 기존 OE, SM → 후보 SE, OE, SM
- `.scenario.general.plan_change.attention`: 기존 SM, ER → 후보 OE, SM, ER
- `.scenario.general.plan_change.response`: 기존 SM, ER → 후보 RO, SM, ER
- `.scenario.general.uncertainty.communication`: 기존 OE, ER → 후보 OE, RO, ER
- `.scenario.general.uncertainty.response`: 기존 OE, ER → 후보 SE, OE, RO, SM, ER
- `.scenario.partner.new_encounter.attention`: 기존 OE → 후보 OE, RO, SM
- `.scenario.person_of_interest.need_expression.process`: 기존 SE → 후보 SE, RO, ER

이 목록은 풍부한 설명으로 바로 합성하지 않는다. 상황 문구 자체가 여러 축의
단어를 우연히 포함했는지, 실제로 두 축 상호작용이 필요한지를 먼저 분리한다.

## 다음 게이트

1. A 작업군 103개는 축 없음도 정답 후보로 허용하며 의미를 억지로 다섯 축에 끼워 맞추지 않는다.
2. B 작업군 13개와 C 작업군 50개는 문장 단서가 상황 자체의 단어인지 실제 성향 차이인지 검토한다.
3. 세 축 이상 후보 15개는 자동 상호작용 문장을 만들지 않고 우선 분리·축소 가능성을 검토한다.
4. 관계 결과·정신건강·능력·업무 위험이 있는 240개는 관계심리·임상안전 검토를 포함한다.
5. 288개 전부의 축 결정과 canonical 조합 문장이 승인되기 전에는 32개 원장을 재생성하거나 고객 화면에 발행하지 않는다.
