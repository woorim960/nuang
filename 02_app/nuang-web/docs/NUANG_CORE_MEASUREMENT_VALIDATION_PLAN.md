# NUANG Core Measurement Validation Plan

작성일: 2026-07-17 KST  
상태: 검사 콘텐츠·채점 재기준화 계획  
적용 대상: 빠른 코어, 정밀 코어, 5글자 뉴앙 코드, 결과 리포트  
원칙: 검사 타당성 승인 전 문항·채점·DB release를 운영 배포하지 않는다.

## 진행 현황

| 작업                                                 | 상태                                                         | 산출물                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| M00 운영 동결                                        | 적용 중                                                      | 이 계획서 및 기존 provisional 상태                                                                                     |
| CL01 코드 언어 재설계 v1                             | `SUPERSEDED_BY_V2`                                           | [NUANG_CODE_LANGUAGE_REDESIGN_V1.md](./NUANG_CODE_LANGUAGE_REDESIGN_V1.md)                                             |
| CL02 MBTI 대조·코드 알파벳 v2                        | `SUPERSEDED_BY_ORDER_REVIEW_V3`                              | [NUANG_CODE_CROSSWALK_AND_ALPHABET_V2.md](./NUANG_CODE_CROSSWALK_AND_ALPHABET_V2.md)                                   |
| CL03 코드 순서·5영역 적합성 v3                       | `OWNER_APPROVED_DESIGN`                                      | [NUANG_CODE_ORDER_AND_CORE_AXIS_REVIEW_V3.md](./NUANG_CODE_ORDER_AND_CORE_AXIS_REVIEW_V3.md)                           |
| CL04 OE R/N 문자쌍 검토                              | `OWNER_APPROVED_DESIGN`                                      | [NUANG_OE_CODE_SYMBOL_REVIEW.md](./NUANG_OE_CODE_SYMBOL_REVIEW.md)                                                     |
| CL05 5글자 최종 의미 정합성 감사                     | `OWNER_APPROVED_DESIGN_RO_REBASELINED_V2`                    | [NUANG_FINAL_CODE_SEMANTIC_AUDIT.md](./NUANG_FINAL_CODE_SEMANTIC_AUDIT.md)                                             |
| CL06 전체 코드 세부 성향·과정 프로필 아키텍처        | `OWNER_DIRECTION_APPROVED_VALIDATION_REQUIRED`               | [NUANG_ALL_CODE_DETAIL_PROFILE_ARCHITECTURE.md](./NUANG_ALL_CODE_DETAIL_PROFILE_ARCHITECTURE.md)                       |
| EV01 연구 레퍼런스·반영 원장                         | `OWNER_APPROVED_BASELINE`                                    | [NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md](./NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md)               |
| S12-EVIDENCE 코드 지도 신뢰 설명 페이지              | `OWNER_APPROVED_CONTENT_UX`                                  | [NUANG_CODE_TRUST_PAGE_CONTENT_SPEC.md](./NUANG_CODE_TRUST_PAGE_CONTENT_SPEC.md)                                       |
| M01-SE 구성개념 명세                                 | `OWNER_APPROVED_DESIGN`                                      | [NUANG_M01_SE_CONSTRUCT_DEFINITION.md](./NUANG_M01_SE_CONSTRUCT_DEFINITION.md)                                         |
| M01-RO 구성개념 명세                                 | `OWNER_APPROVED_REBASELINED_V2`                              | [NUANG_M01_RO_CONSTRUCT_DEFINITION.md](./NUANG_M01_RO_CONSTRUCT_DEFINITION.md)                                         |
| M01-ER 구성개념 명세                                 | `OWNER_APPROVED_DESIGN`                                      | [NUANG_M01_ER_CONSTRUCT_DEFINITION.md](./NUANG_M01_ER_CONSTRUCT_DEFINITION.md)                                         |
| M01-SM 구성개념 명세                                 | `OWNER_APPROVED_DESIGN`                                      | [NUANG_M01_SM_CONSTRUCT_DEFINITION.md](./NUANG_M01_SM_CONSTRUCT_DEFINITION.md)                                         |
| M01-OE 구성개념 명세                                 | `OWNER_APPROVED_DESIGN`                                      | [NUANG_M01_OE_CONSTRUCT_DEFINITION.md](./NUANG_M01_OE_CONSTRUCT_DEFINITION.md)                                         |
| M02 공통 문항 사양·UI·데이터 문법                    | `OWNER_APPROVED_BASELINE`                                    | [NUANG_M02_ITEM_AND_RESPONSE_SPEC.md](./NUANG_M02_ITEM_AND_RESPONSE_SPEC.md)                                           |
| M03-SE-RE 교류 활력 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_SE_RE_CANDIDATE_ITEM_BANK.md](./NUANG_M03_SE_RE_CANDIDATE_ITEM_BANK.md)                                     |
| M03-SE-AI 주도적 표현 후보 문항 은행                 | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_SE_AI_CANDIDATE_ITEM_BANK.md](./NUANG_M03_SE_AI_CANDIDATE_ITEM_BANK.md)                                     |
| M03-SE-SET 2-facet 세트 균형 감사                    | `PASS_FOR_FULL_CORE_M03_CONTINUATION`                        | [NUANG_M03_SE_TWO_FACET_SET_BALANCE_AUDIT.md](./NUANG_M03_SE_TWO_FACET_SET_BALANCE_AUDIT.md)                           |
| M03-OE-AE 미적 경험 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_OE_AE_CANDIDATE_ITEM_BANK.md](./NUANG_M03_OE_AE_CANDIDATE_ITEM_BANK.md)                                     |
| M03-OE-CI 상상 확장 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_OE_CI_CANDIDATE_ITEM_BANK.md](./NUANG_M03_OE_CI_CANDIDATE_ITEM_BANK.md)                                     |
| M03-OE-IE 지적 탐구 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_OE_IE_CANDIDATE_ITEM_BANK.md](./NUANG_M03_OE_IE_CANDIDATE_ITEM_BANK.md)                                     |
| M03-OE-SET 3-facet 세트 균형 감사                    | `OWNER_APPROVED_FOR_M04_RESEARCH_DESIGN`                     | [NUANG_M03_OE_THREE_FACET_SET_BALANCE_AUDIT.md](./NUANG_M03_OE_THREE_FACET_SET_BALANCE_AUDIT.md)                       |
| M03-RO-SET 두 facet·다층 24문항 세트 감사            | `PASS_TO_SM_CANDIDATE_DESIGN_WITH_RO_RN_SEPARATE_TRACK`      | [NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md](./NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md)     |
| M03-SM-EP 실행·지속 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_SM_EP_CANDIDATE_ITEM_BANK.md](./NUANG_M03_SM_EP_CANDIDATE_ITEM_BANK.md)                                     |
| M03-SM-OS 질서·구조 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_SM_OS_CANDIDATE_ITEM_BANK.md](./NUANG_M03_SM_OS_CANDIDATE_ITEM_BANK.md)                                     |
| M03-SM-RL 맡은 일 이행 탐색 후보 문항 은행           | `OWNER_APPROVED_EXPLORATORY_FOR_EXPERT_AND_COGNITIVE_REVIEW` | [NUANG_M03_SM_RL_CANDIDATE_ITEM_BANK.md](./NUANG_M03_SM_RL_CANDIDATE_ITEM_BANK.md)                                     |
| M03-SM-SET 2/3-facet 36문항 세트 감사                | `OWNER_APPROVED_FOR_ER_CANDIDATE_DESIGN`                     | [NUANG_M03_SM_TWO_VS_THREE_FACET_SET_BALANCE_AUDIT.md](./NUANG_M03_SM_TWO_VS_THREE_FACET_SET_BALANCE_AUDIT.md)         |
| M03-ER-IR 감정 동요 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_ER_IR_CANDIDATE_ITEM_BANK.md](./NUANG_M03_ER_IR_CANDIDATE_ITEM_BANK.md)                                     |
| M03-ER-WD 걱정·주저 후보 문항 은행                   | `OWNER_APPROVED_FOR_EXPERT_AND_COGNITIVE_REVIEW`             | [NUANG_M03_ER_WD_CANDIDATE_ITEM_BANK.md](./NUANG_M03_ER_WD_CANDIDATE_ITEM_BANK.md)                                     |
| M03-ER-SET 2-facet 안전·임상 오염·세트 감사          | `OWNER_APPROVED_FOR_INTEGRATED_SEAM_AUDIT`                   | [NUANG_M03_ER_TWO_FACET_SAFETY_AND_SET_BALANCE_AUDIT.md](./NUANG_M03_ER_TWO_FACET_SAFETY_AND_SET_BALANCE_AUDIT.md)     |
| M03-ALL 전 5영역 seam·상황·문구 효과 통합 감사       | `OWNER_APPROVED_ITEM_DESIGN_GATE_COMPLETE`                   | [NUANG_M03_ALL_DOMAIN_INTEGRATED_SEAM_AND_METHOD_AUDIT.md](./NUANG_M03_ALL_DOMAIN_INTEGRATED_SEAM_AND_METHOD_AUDIT.md) |
| M03-RO-R1 G/A 주점수 후보 3G·3A 보강                 | `OWNER_APPROVED_MERGED_INTO_RO_EC_V0_5`                      | [NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md](./NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md)                               |
| M04/05-OE 전문가 blind mapping·인지 인터뷰 실행 사양 | `OWNER_APPROVED_FOR_EXECUTION_KIT_DESIGN`                    | [NUANG_M04_OE_EXPERT_AND_COGNITIVE_REVIEW_PROTOCOL.md](./NUANG_M04_OE_EXPERT_AND_COGNITIVE_REVIEW_PROTOCOL.md)         |
| M04-OE 전문가 blind review 실행 키트                 | `TEMPLATE_COMPLETE_HOLD_FOR_FULL_CORE_REBASELINE`            | [NUANG_M04_OE_EXPERT_REVIEW_EXECUTION_KIT.md](./NUANG_M04_OE_EXPERT_REVIEW_EXECUTION_KIT.md)                           |
| M04-CORE 전 코어 전문가 blind review 실행 키트       | `INTERNAL_AI_DRY_RUN_COMPLETE_V0_2_PATCH_EXTERNAL_PENDING`   | [NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md](./NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md)                     |
| MVP-RBL 측정·제품 재기준화                           | `RBL_02_INTERNAL_DRY_RUN_COMPLETE_UIX_LOCALHOST_REVIEW`      | [NUANG_MVP_MEASUREMENT_PRODUCT_REBASELINE.md](./NUANG_MVP_MEASUREMENT_PRODUCT_REBASELINE.md)                           |

M01-SE 검토본에서는 `SE-RE 관계 참여`를 더 좁은 `교류 활력`으로 재정의하고, 고객 명칭은 `함께할 때의 에너지`를 제안했다. 사용자 검토에서 S/T 코드의 즉시 이해 문제가 확인됐고, MBTI 대조 과정에서 v1의 F·P 글자 충돌도 발견됐다. CL03은 고객 자리 순서를 `SE → OE → RO → SM → ER`로 제안하고, 5개 broad domain은 유지하되 각 영역의 세부 성향 구조를 별도로 검증하기로 했다. 후속 M01-OE에서는 3-facet을 사용자 선택으로 채택했다.

M01-RO 검토에서는 기존 `D = 거리와 선택 존중`이 낮은 RO가 아니라 `공감적 관심 낮음 + 선택·존엄 존중 높음`인 분리 프로필에 가깝다는 구조 모순을 확인했다. 후속 24문항 감사에서는 RO-EC와 RO-RN을 합친 대표 G/A가 RO-EC 전용 `G → A`와 다른 범위를 뜻하는 문제도 확인했다. 사용자 승인 A안에 따라 G/A는 RO-EC 관계 주의 방향으로 좁혔다. G는 `원인·해결이 먼저 보이는 편`, A는 `상대 마음이 먼저 보이는 편`이다. RO-RN은 G/A에 합산하지 않는 본인 전용 상세 신호로 분리한다.

M01-ER 검토에서는 ER을 모든 감정의 풍부함이 아니라 좌절·불확실성·평가 앞의 `불편 정서 반응성`으로 한정했다. 공개 코어는 `감정 동요 + 걱정·주저`의 2-facet으로 유지하고 Depression 관련 내용은 별도 웰빙·전문 영역으로 분리한다. 다섯 번째 자리는 `C/Q`로 확정하고 `C = 차분하게 반응(Calm)`, `Q = 걱정·감정이 빨리 커짐(Quick-reacting)`으로 정의했다. 두 facet 방향이 다르면 `두 반응이 다르게 나타나요`, 실제 경계 상태면 `C와 Q가 비슷해요`로 구분한다. 기존 ER 12문항과 빠른 4문항은 자동 승계하지 않는다.

M01-SM 검토에서는 실행·지속과 질서·구조가 Conscientiousness 계열의 상위 영역을 구성할 근거는 유지했다. 그러나 낮은 SM 점수에서 측정하지 않은 유연성·적응력·즉흥성을 추론하는 오류를 확인했고, 현재 구성개념에 MBTI J/P를 사용하는 안을 사용자 승인으로 폐기했다. BFI-2의 Responsibility 범위를 반영한 `맡은 일 이행` 제3 facet 후보를 2-facet 모형과 비교한다. 네 번째 문자는 `K = 꾸준히 이어감 / M = 상황에 따라 달라짐`으로 사용자 승인했으며, 현재 작업 범례는 `E/I · R/N · G/A · K/M · C/Q`다.

M03-SM 초안에서는 EP·OS·RL마다 6개 상황 버킷과 HIGH 6개·LOW 6개를 만들어 총 36개 후보를 구성했다. 3-facet은 더 자세하다는 이유만으로 채택하지 않는다. RL은 EP의 관계 상황 반복, SE·RO 교차 적재, 사회적 바람직성, M의 무책임 낙인 위험을 우선 검증한다. 공개 K/M은 검증 전까지 EP+OS 의미를 기준선으로 유지하며, RL은 결과에 따라 K/M 포함·본인 전용 상세·제외 중 하나로 결정한다.

M03-ER 초안에서는 IR·WD마다 6개 상황 버킷과 Q 방향 6개·C 방향 6개를 만들어 총 24개 후보를 구성했다. 공개 코어는 일상적인 중간 강도의 불편 정서만 측정하며, 우울·자해·자살·공황·외상·강박 선별 내용을 제외한다. 최근 2주 상태는 선택적 비채점 문맥으로만 검토하고 C/Q 점수나 공개 정보에 사용하지 않는다. 현재 후보는 외부 말·행동 층위를 측정하지 않으므로 Q→C 과정 프로필을 발급할 수 없다.

M01-OE 검토에서는 분위기·상상 경험과 새로운 개념·원리·관점에 대한 탐색 관심이 Openness/Intellect 계열의 상위 영역을 구성할 근거는 유지했다. 그러나 낮은 OE 점수에서 측정하지 않은 현실성·실용 능력·정보 정리 능력을 추론하는 오류를 확인했다. N은 MBTI N과 같은 높은 방향을 유지하되 동일한 검사는 아니며, R은 현실적 능력이 아니라 `익숙하고 구체적인 대상에 관심이 머무는 경향`으로 좁혀 사용자 승인했다. 사용자는 `미적 경험 + 상상 확장 + 지적 탐구` 3-facet도 선택했으며, 파일럿은 구조 재선택이 아니라 세 facet의 구분성·신뢰도·상위 OE 구성 가능성을 검증한다.

CL05에서는 다섯 자리와 열 개 글자의 의미·비측정 범위·인접 영역·분리 프로필·경계 상태를 한 번에 감사했다. 정의 수준의 중복은 차단했지만 한국어 문항·채점·요인구조의 실제 타당성은 아직 검증 전이다. EV01은 MBTI·Big Five·BFAS·BFI-2·HEXACO·IPIP와 검사 개발 표준을 제품 결정에 연결한 추적 원장이다. S12-EVIDENCE는 이 내용을 코드 지도 안에서 쉬운 한국어와 현재 검증 상태로 공개하는 별도 페이지 명세이며, 세 산출물 모두 사용자 검토 전에는 운영 코드·DB를 변경하지 않는다.

CL06은 대표 코드 아래의 결과 해상도를 `모든 영역의 세부 성향 지도`와 `검증된 영역의 과정 흐름`으로 분리했다. `G → A`는 대표 G/A와 동일한 RO-EC 범위에서 우선 파일럿하고, RO-RN은 본인 전용 상세 신호로 별도 검증한다. `Q → C`와 `K → M`은 후속 연구 후보이며 E/I와 R/N은 현재 facet 지도를 우선한다. 화살표 없는 문자열은 facet 조합과 충돌할 수 있어 정식 과정 코드로 사용하지 않는다.

## 0. 핵심 결론

상황 라벨만 기존 질문에서 분리하는 방식으로는 검사 품질이 높아지지 않는다. 먼저 `무엇을 측정하는가`를 정의하고, 그 정의에 맞는 `상황 + 하나의 관찰 가능한 반응`을 새로 설계해야 한다.

문항 하나가 5글자 코드를 직접 판정해서는 안 된다.

```text
문항 응답
→ 하나의 세부 성향에 대한 관찰 증거
→ 같은 세부 성향의 여러 문항을 종합
→ 한 성향 축의 연속 점수와 불확실성
→ 다섯 축을 종합한 기억용 5글자 코드
→ 검증된 범위 안의 리포트 문구
```

5글자 코드는 결과를 기억하기 쉽게 만드는 표현층이다. 측정의 원본은 다섯 축의 연속 점수, 세부 성향 점수, 응답 품질, 불확실성이다.

## 1. 현재 구현에서 확인된 위험

### 1.1 콘텐츠 상태

- 정밀 코어 원본 `core-public-item-set-provisional.v0.9.json`은 `OWNER_REVIEW_REQUIRED_NOT_FOR_PUBLIC_DEPLOYMENT` 상태다.
- 결과 문구도 `provisional_internal_qa` 상태다.
- JSON의 `qa_checks: PASS`는 내부 문구 체크리스트다. 실제 사용자 이해, 요인구조, 신뢰도, 타당도 검증을 대체하지 않는다.
- 원문이 IPIP 계열 공개 문항을 참고했더라도, 한국어 재작성과 뉴앙의 5축·세부 성향 재매핑에는 별도의 검증이 필요하다.

### 1.2 빠른 코어의 증거량

- 빠른 코어는 10개 세부 성향당 2문항, 총 20문항이다.
- 현재 `minValidResponses=1`이므로 세부 성향당 한 문항만 답해도 유효 점수가 된다.
- 두 문항 또는 한 문항으로 세부 리포트를 확정적으로 설명하면 문항 고유 오차의 영향을 크게 받을 수 있다.
- 빠른 코어는 검증 전까지 `예비 5축 방향`만 보여주고 세부 성향을 확정적으로 설명하지 않는다.

### 1.3 코드 경계

- 현재 채점은 축 점수가 `50 이상`이면 high symbol, 미만이면 low symbol을 부여한다.
- 정확히 50점인 중간 응답도 한쪽 글자로 배정된다.
- 45~55를 균형 구간으로 표시하더라도 코드 자체는 이미 한쪽으로 확정된다.
- 경계에 가까운 사람은 측정오차 범위를 포함해 `두 방향이 비슷함`으로 처리하고, 필요하면 코드 확정을 보류하거나 대안 코드를 함께 제공해야 한다.

### 1.4 문항 표현

- 기존 상황 라벨은 질문의 앞부분을 다시 표현해 중복이 생겼다.
- 상황과 행동이 한 문항 안에서 섞여 있어 응답자가 어떤 장면을 떠올려야 하는지 달라질 수 있다.
- 공감, 성실, 존중처럼 사회적으로 바람직해 보이는 문항은 실제 성향보다 좋은 사람처럼 답하려는 영향을 받을 수 있다.
- 비슷한 문항이 같은 세부 성향이 아니라 인접 성향을 동시에 측정할 위험이 있다.

## 2. 현재 측정 구조

| 성향 축               | 현재 세부 성향                                            | 코드 글자 | 재검증해야 할 핵심 질문                                                                                                            |
| --------------------- | --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| SE 사람 사이 에너지   | SE-RE 교류 활력, SE-AI 주도적 표현                        | E / I     | 사람에게서 얻는 에너지와 먼저 표현하는 행동이 한 축으로 묶이는가?                                                                  |
| ER 걱정과 감정 반응   | ER-IR 감정 동요, ER-WD 걱정·주저                          | C / Q     | 두 facet이 같은 상위 영역을 구성하는가, 긍정 감정·임상 상태와 구분되는가, 분리 프로필과 실제 경계를 정확히 설명하는가?             |
| SM 일상을 꾸리는 방식 | SM-EP 실행·지속, SM-OS 질서·구조, SM-RL 맡은 일 이행 후보 | K / M     | 2-facet·3-facet 중 무엇이 적합한가, K/M을 정확히 이해·회상하는가?                                                                  |
| RO 관계 주의 방향     | RO-EC 관계 주의 방향; RO-RN은 분리 상세 신호              | G / A     | 원인·해결과 상대 마음의 주의 방향이 구분되는가, G/A가 이를 정확히 전달하는가, 생각·실제 반응과 사회적 바람직성을 통제할 수 있는가? |
| OE 생각과 탐색        | OE-AE 미적 경험, OE-CI 상상 확장, OE-IE 지적 탐구         | R / N     | 세 facet이 구분되면서 상위 OE를 구성하는가, R/N이 능력·MBTI 동일 검사로 오해되지 않는가?                                           |

위 표의 구조는 가설이지 아직 확정된 사실이 아니다. 문항을 이 구조에 억지로 맞추지 않고, 전문가 검토와 사용자 데이터에서 구조가 재현되는지 확인한다.

## 3. 단계별 진행 계획

### M00. 운영 동결과 책임 범위 확정

할 일:

- 현재 빠른·정밀 코어 문항을 `provisional`로 고정한다.
- 기존 20개 상황 라벨 초안은 폐기하지 않고 실패 기록으로 보존하되 구현 대상에서 제외한다.
- S03 UI 셸은 유지하지만 문항·채점·DB release 구현은 측정 승인까지 멈춘다.
- 심리측정 전문가 또는 성격심리 전공 검토자를 검사 승인 책임에 포함한다.
- 뉴앙은 의료·임상 진단이 아닌 자기이해용 성향 검사임을 명확히 한다.

산출물:

- 측정 개발 책임표
- 사용 목적·비사용 목적
- provisional 콘텐츠 목록

통과 조건:

- 누가 문항, 채점, 통계, 사용자 문구를 승인하는지 명확하다.

### M01. 5축·세부 성향 구성개념 명세

각 성향 축과 세부 성향에 아래 항목을 작성한다.

- 한 문장 정의
- 높은 방향과 낮은 방향의 관찰 가능한 모습
- 포함하는 행동
- 포함하지 않는 행동
- 혼동하기 쉬운 인접 성향
- 적용 가능한 상황과 적용하면 안 되는 상황
- 결과 리포트에서 말할 수 있는 주장
- 결과 리포트에서 말하면 안 되는 주장
- 5글자 코드의 두 글자가 의미하는 범위

예를 들어 `SE-AI 주도적 표현`은 말을 잘하는 능력, 리더십, 외향성 전체가 아니라 `집단에서 의견이나 선택지를 먼저 밖으로 꺼내는 경향`처럼 경계를 좁혀야 한다.

산출물:

- `construct_definition_version`
- 5축·승인된 세부 성향 명세표
- 인접 성향 구분표
- 리포트 주장 연결표

통과 조건:

- 전문가가 정의만 보고 각 문항의 목표 세부 성향을 구분할 수 있다.
- 한 세부 성향의 정의가 다른 세부 성향과 중복되지 않는다.

### M02. 문항 사양과 UI 문법 확정

고객에게는 두 줄로 보여주되 하나의 의미 단위로 작성한다.

```text
상황 라벨: 여럿이 결정을 미루고 있을 때
질문 문장: 내가 먼저 선택지를 제안하는 편이다.
```

작성 규칙:

- `contextLabel`에는 상황 조건만 쓴다.
- `promptText`에는 그 상황에서 나타나는 하나의 행동·생각·감정 반응만 쓴다.
- 질문 문장에서 상황을 다시 반복하지 않는다.
- 한 문항에 두 행동을 묻지 않는다.
- 빈도, 강도, 선호, 능력을 한 문항에서 섞지 않는다.
- 도덕성·능력·성공 가능성처럼 읽히는 표현을 피한다.
- 직장인, 학생, 연애 중인 사람에게만 해당하는 장면을 공통 코어에 사용하지 않는다.
- 지난 6개월의 평소 모습이라는 회상 기간은 검사 시작 안내에서 한 번만 제공한다.
- 모든 문항에서 같은 응답 판단 기준을 유지한다. 현재 `내 모습` 척도와 빈도 척도 중 무엇이 더 자연스러운지는 인지 인터뷰에서 비교한다.

내부 문항 사양 필드:

- 목표 축·세부 성향
- 측정 방향
- 측정하려는 단일 반응
- 상황 범위
- 인접 성향 오염 위험
- 사회적 바람직성 위험
- 예상되는 낮은·중간·높은 응답 이유
- 라벨과 질문의 토큰 중복률
- 문항 작성 근거와 출처 권리

산출물:

- item writing guide
- DB 필드 확장안
- 자동 문구 lint 규칙

통과 조건:

- 상황 라벨을 가리면 질문에 상황이 중복되지 않는다.
- 질문을 가리면 라벨에는 답의 방향이 들어 있지 않다.
- 두 줄을 함께 읽었을 때 한 가지 반응만 묻는다.

### M03. 후보 문항 은행 생성

빠른 20문항을 바로 다시 쓰지 않는다. 먼저 충분한 후보를 만든다.

- 승인된 각 세부 성향마다 다양한 일상 장면을 수집한다.
- 세부 성향당 여러 후보를 만들고 정방향·명확한 역방향을 균형 있게 검토한다.
- 같은 문장 구조와 같은 장면이 반복되지 않게 한다.
- 기존 60문항은 자동 승계하지 않고 후보 은행의 하나로 재심사한다.
- 빠른 코어 문항은 통계 검증 후 정보량과 대표성이 높은 문항에서 파생한다.

계획 범위:

- 초기 후보: 세부 성향당 약 8~12개
- 전문가 검토·인지 인터뷰용: 세부 성향당 약 6~8개
- 정밀 코어 목표: 검증 결과에 따라 세부 성향당 약 6개
- 빠른 코어 목표: 검증 결과에 따라 세부 성향당 약 2개 이상

20문항이 충분하지 않으면 20이라는 숫자를 지키기 위해 정확성을 희생하지 않는다. 문항 수를 늘리거나 빠른 결과의 설명 범위를 줄인다.

산출물:

- 후보 문항 은행
- 문항별 작성 근거
- 장면 커버리지 지도

통과 조건:

- 각 세부 성향이 하나의 비슷한 장면이 아니라 여러 일상 장면으로 측정된다.

### M04. 독립 전문가 내용타당도 검토

권장 검토 구성:

- 심리측정 전문가
- 성격·사회심리 전문가
- 한국어 문항·설문 작성 전문가
- 2030 사용자 맥락을 이해하는 UX 리서처
- 필요 시 편향·접근성 검토자

검토 항목:

- 목표 구성개념과의 관련성
- 세부 성향 전체를 충분히 다루는지
- 문장의 이해 가능성
- 인접 성향과의 중복
- 사회적 바람직성
- 문화·성별·직업·관계 상태 편향
- 응답 척도와의 일치
- 결과 리포트로 설명 가능한 문항인지

`blind target mapping`을 함께 수행한다. 문항의 목표 facet을 알려주지 않고 전문가가 어느 facet인지 분류하게 해, 일치하지 않는 문항은 재작성하거나 제외한다.

산출물:

- 문항별 전문가 평가표
- 수정·보류·제외 결정
- 내용타당도 근거

통과 조건:

- 관련성·포괄성·이해 가능성에 대한 근거가 확보된다.
- 목표 세부 성향을 구분하지 못하는 문항은 통과하지 않는다.

### M05. 2030 대상 인지 인터뷰

실제 사용자가 문항을 어떻게 해석하는지 확인한다.

진행:

- 소규모 인터뷰를 2~3회 반복하고, 크게 수정한 문항은 다음 회차에서 다시 검증한다.
- 참여자는 성별, 직업·학생 여부, 관계 상태, 생활환경이 한쪽에 몰리지 않게 구성한다.
- 생각 말하기와 구체적 질문을 함께 사용한다.

문항별 질문:

- 이 문항을 본인 말로 다시 설명해 주세요.
- 어떤 상황을 떠올렸나요?
- 무엇을 묻는 질문이라고 생각했나요?
- 왜 그 응답을 선택했나요?
- 두 가지 이상을 동시에 묻는다고 느꼈나요?
- 좋은 사람처럼 답해야 할 것 같았나요?
- `판단하기 어려워요`를 선택한 이유는 무엇인가요?

UI 검증도 함께 한다.

- 상황 라벨과 질문이 하나의 문장처럼 이해되는가?
- 작은 퍼플 라벨이 장식이 아니라 조건으로 인식되는가?
- 긴 문항에서 라벨과 질문의 관계를 잃지 않는가?

산출물:

- 문항별 오해 유형
- 응답 과정 기록
- 수정 전·후 이력

통과 조건:

- 사용자가 의도한 상황과 반응을 같은 의미로 해석한다.
- 반복되는 오해나 응답 선택 장애가 남아 있지 않다.

### M06. 정량 파일럿 설계와 수집

파일럿 전에 분석 계획과 제외 규칙을 정한다.

- 대상 사용자 모집 기준
- 개발 표본과 확인 표본 분리
- 기기·연령·성별 등 하위집단 분석 계획
- 재검사 표본과 간격
- 비교할 외부 검증 척도와 사용 권리
- 불성실 응답, 지나치게 빠른 응답, 같은 번호 반복 응답 처리
- `판단하기 어려워요` 처리
- 문항 삭제·유지 기준

표본 수는 고정 숫자를 임의로 정하지 않고 후보 문항 수, 예상 요인구조, 측정동일성 분석, 탈락률을 바탕으로 심리측정 전문가와 사전 산출한다. 개발용 탐색과 확인용 검증을 같은 표본 하나로 끝내지 않는다.

산출물:

- 사전 분석 계획
- 익명화된 파일럿 데이터
- 데이터 품질 보고서

통과 조건:

- 목표 사용자 집단의 범위를 충분히 포함하고 독립 확인 분석이 가능하다.

### M07. 문항·요인구조·신뢰도 검증

검증 항목:

- 응답 분포, 천장·바닥 효과
- 판단하기 어려움 비율
- 문항 간 상관과 수정 문항-총점 상관
- 목표 요인 적재와 교차 적재
- 탐색적 요인분석과 독립 표본 확인적 요인분석
- 5축·승인된 세부 성향의 위계 구조 적합성
- 내적 일관성은 alpha 하나에만 의존하지 않고 omega 등 적절한 지표를 함께 사용
- 재검사 신뢰도와 측정오차
- 관련 척도와의 수렴·변별 타당도
- 집단별 측정동일성과 문항편향(DIF)

기존 구조와 다른 결과가 나오면 데이터를 구조에 억지로 맞추지 않는다. 축 정의, facet 구성, 문항, 또는 코드 구조를 수정한다.

산출물:

- 문항 성능표
- 요인구조 비교 보고서
- 신뢰도·타당도 보고서
- 제외·수정 문항 목록

통과 조건:

- 각 문항이 목표 성향을 안정적으로 측정하며 인접 성향을 과도하게 함께 측정하지 않는다.
- 동일한 구조가 독립 표본에서도 재현된다.

### M08. 채점과 5글자 코드 보정

현재의 단순 평균과 50점 분할은 검증 대상이다.

할 일:

- 동일 가중 평균과 요인점수·IRT 기반 점수의 장단점 비교
- 역문항의 방법 효과 확인
- 판단하기 어려움과 부분 응답의 최소 증거 기준 재설정
- 축 점수의 표준오차 또는 불확실성 구간 산출
- 경계 구간의 코드 확정·보류 규칙 설계
- 빠른 코어와 정밀 코어의 축 방향 일치율·코드 안정성 검증
- 재검사에서 작은 응답 변화로 코드가 반복 변경되는지 시뮬레이션

원칙:

- 빠른 코어는 세부 facet 확정 리포트가 아니라 예비 축 방향을 제공한다.
- 경계에서는 한 글자를 과도하게 확정하지 않는다.
- 정밀 코어도 측정 불확실성을 숨기지 않는다.
- `정확도 90%`처럼 기준이 불분명한 숫자는 사용하지 않는다.

산출물:

- scoring release
- minimum evidence 규칙
- boundary·alternative code 규칙
- quick/full 결과 계약

통과 조건:

- 코드가 문항 한두 개의 작은 변화에 과도하게 흔들리지 않는다.
- 같은 점수 범위에서 리포트와 코드가 모순되지 않는다.

### M09. 결과 리포트의 주장 타당도 검토

점수가 검증돼도 리포트 문장이 과장되면 신뢰가 무너진다.

- 각 리포트 문장을 어떤 domain·facet·점수 범위가 뒷받침하는지 연결한다.
- 장점·주의점·관계 팁이 측정되지 않은 능력, 도덕성, 성공 가능성을 추론하지 않게 한다.
- 빠른 결과와 정밀 결과의 권위를 구분한다.
- 사용자에게 낙인, 평가, 진단으로 읽히는지 별도 인터뷰한다.
- `나를 잘 설명한다`와 `나를 단정한다`를 구분해 만족도와 거부감을 함께 측정한다.

산출물:

- score-to-copy traceability matrix
- 결과 문구 사용자 검토
- 금지 주장 목록

통과 조건:

- 모든 고객 문구가 검증된 점수 근거로 추적 가능하다.

### M10. 제한 출시와 지속 검증

- 내부 QA → 동의한 베타 사용자 → 제한 출시 → 일반 출시 순서로 넓힌다.
- release마다 문항·상황·채점·리포트·검증 근거를 불변 버전으로 보관한다.
- 같은 release 안에서 문구를 조용히 수정하지 않는다.
- 상황 라벨이나 질문 변경도 새 item/release version으로 처리한다.
- 완료율, 판단하기 어려움, 문항별 이탈, 응답시간, 코드 경계 비율, 재검사 변화, 사용자 이의 제기를 모니터링한다.
- 집단별 문항 기능 차이와 시간에 따른 문항 drift를 정기적으로 점검한다.

DB 구현은 이 단계 전에 준비할 수 있지만, 운영 `published` 상태는 측정 승인 이후에만 허용한다.

산출물:

- validation status가 포함된 DB release
- 출시 체크리스트
- 모니터링 대시보드와 재검증 일정

통과 조건:

- 측정 품질, UX, 개인정보, 운영 롤백을 모두 통과한다.

## 4. DB 데이터 모델에 추가할 측정 필드

기존 `context_label`, `prompt_text`, `domain_id`, `facet_id`, `is_reverse` 외에 아래 필드를 검토한다.

| 필드                           | 목적                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| `construct_definition_version` | 어떤 축·세부 성향 정의를 기준으로 썼는지 추적                        |
| `item_version`                 | 문항 자체의 수정 이력                                                |
| `locale`                       | 한국어 문항과 향후 번역본 구분                                       |
| `response_reference`           | 지난 6개월의 평소 모습 등 응답 기준                                  |
| `behavior_target`              | 내부 검토용 단일 행동·반응 정의                                      |
| `content_bucket`               | 같은 facet 안의 장면 커버리지                                        |
| `validation_status`            | draft, expert_reviewed, cognitive_tested, pilot_validated, published |
| `evidence_version`             | 문항 성능과 검증 보고서 버전 연결                                    |
| `source_family`                | 원출처와 권리 추적                                                   |
| `social_desirability_risk`     | 사회적 바람직성 위험 기록                                            |

고객 응답 row에는 위 문항 콘텐츠를 복제하지 않는다. attempt의 release ID로 당시 문항과 검증 상태를 재현한다.

## 5. UI/UX에 남길 것과 보류할 것

유지:

- 한 문항 집중 화면
- 연속형 진행선
- 엄지 도달 하단 행동
- `판단하기 어려워요`
- 상황 라벨과 질문의 두 단계 시각 위계

보류·재검증:

- 현재 20개 상황 라벨과 질문 조합
- `내 모습이다` 응답 척도가 모든 문항에 적합한지
- 빠른 20문항 고정
- 50점 기준 코드 확정
- 빠른 결과의 세부 facet 설명
- 현재 60문항의 운영 배포

## 6. 실제 진행 순서

지금 바로 시작할 다음 작업은 M01이다.

1. 5개 축 중 `SE 사람 사이 에너지`를 먼저 선택한다.
2. `SE-RE 관계 참여`와 `SE-AI 주도적 표현`의 정의·포함·제외·인접 성향을 작성한다.
3. 두 세부 성향이 하나의 상위 축을 이루는 논리를 검토한다.
4. 사용자와 함께 정의를 승인한다.
5. 승인된 정의만 사용해 M02 문항 사양과 M03 후보 문항을 만든다.
6. 같은 방식으로 ER → SM → RO → OE를 한 축씩 진행한다.

한 번에 60문항을 다시 쓰지 않는다. 축 하나의 정의와 문항 사양을 승인한 뒤 다음 축으로 이동한다.

## 7. 근거 자료

- [Standards for Educational and Psychological Testing](https://www.testingstandards.net/) — 검사 점수 해석과 사용에 대한 타당성 근거를 요구하는 공동 기준
- [Boateng et al. (2018), Best Practices for Developing and Validating Scales](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2018.00149/full) — 문항 개발, 사전검사, 표본 수집, 문항 축소, 요인구조, 신뢰도, 타당도 단계
- [Clark & Watson (2019), Constructing Validity](https://pmc.ncbi.nlm.nih.gov/articles/PMC6754793/) — 구성개념 경계, 문항 풀, 수렴·변별 타당도 중심의 척도 개발
- [COSMIN content validity methodology](https://pmc.ncbi.nlm.nih.gov/articles/5891557/) — 관련성, 포괄성, 이해 가능성 중심의 내용타당도
- [Effective questionnaire design using cognitive interviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC9524256/) — 문항 이해, 판단 과정, 응답 선택을 확인하는 인지 인터뷰
- [Soto & John (2017), BFI-2](https://pubmed.ncbi.nlm.nih.gov/27055049/) — domain·facet 위계형 성격 척도의 개념적·경험적 문항 구성 사례
