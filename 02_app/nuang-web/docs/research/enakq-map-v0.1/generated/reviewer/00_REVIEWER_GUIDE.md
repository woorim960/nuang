# ENAKQ 성향지도 외부 전문가 검토 안내

패킷: `ENAKQ-EXPERT-PACKET.v0.1`  
프로토콜: `enakq-trait-map-expert-review.v0.1`  
상태: `EXTERNAL_REVIEW_NOT_STARTED`

## 목적

이 패킷은 ENAKQ 연구 초안의 158개 claim이 현재 뉴앙 점수와 외부 근거로 설명할 수 있는 범위 안에 있는지 검토하기 위한 것이다. 사용자가 문장에 공감하는지와 심리측정 타당성을 같은 것으로 취급하지 않는다.

검토 패킷 생성은 전문가 검토 완료를 뜻하지 않는다. reviewer roster는 아직 `not_recruited`이며, 실제 자격과 독립성을 확인한 사람의 응답만 외부 검토 근거로 인정한다. AI나 내부 에이전트의 응답을 외부 전문가 승인으로 기록하지 않는다.

## 역할별 배정

| 역할           | 검토 claim 수 | 초점                                                     |
| -------------- | ------------: | -------------------------------------------------------- |
| 성격심리       |            86 | 구성개념 경계, 상태·성향 구분, 상황 일반화, 조합 해석    |
| 심리측정       |           119 | 필수 입력, 근거 적합성, 점수에서 문장으로의 추론 범위    |
| 관계/임상 안전 |            98 | 관계 결정론, 임상·낙인·문화 규범, 개인정보와 사용자 안전 |

각 역할에는 독립된 검토자 2명을 목표로 한다. 한 claim이 여러 역할에 배정되면 각 분야에서 각각 2개의 독립 응답을 받아야 한다.

## 판정

- `accept`: 현재 의미와 범위를 그대로 유지할 수 있다.
- `revise`: 핵심 의미는 유지할 수 있지만 구체적인 수정이 필요하다.
- `reject`: 현재 claim을 제품 지식으로 유지하면 안 된다.
- `insufficient_evidence`: 판단에 필요한 연구·측정·문맥 자료가 부족하다.

`revise`에는 `required_revision`을 반드시 작성한다. `accept`는 `risk_flags=none`일 때만 가능하다. 모든 판정에는 한 문장 이상의 `rationale`을 작성한다.

## 1–4점 평정

| 점수 | 의미                              |
| ---: | --------------------------------- |
|    1 | 부적절하거나 중대한 수정이 필요   |
|    2 | 중요한 문제가 있어 현재 사용 불가 |
|    3 | 제한 또는 작은 수정 뒤 사용 후보  |
|    4 | 현재 범위에서 적절                |

평정 대상은 구성개념 적합성, 근거 적합성, 추론 범위, 언어·사용자 안전이다. 전문 범위를 벗어난 평정은 낮은 점수를 억지로 주지 말고 `insufficient_evidence`와 이유를 남긴다.

## 위험 플래그

`ability_inference`, `clinical_overreach`, `cultural_norm`, `deterministic_language`, `discrimination_risk`, `evidence_mismatch`, `privacy_scope`, `relationship_determinism`, `stigma_or_value_judgment`, `unmeasured_inference`, `unclear_korean`, `other`, `none`

여러 플래그는 세미콜론으로 구분한다. `none`은 다른 값과 함께 사용할 수 없다.

## 작업 방법

1. roster에서 본인의 reviewer ID와 역할을 확인한다.
2. 역할별 W1부터 순서대로 검토하되, 한 wave를 끝낸 뒤 파일을 잠근다.
3. `source_excerpt`는 claim이 쓰인 canonical 원문 문단이다. 한 문단에 여러 claim이 있을 수 있으므로 해당 `claim_id`의 의미만 판정한다.
4. 외부 연구가 존재한다는 사실과 뉴앙 claim이 검증됐다는 결론을 구분한다.
5. 이해하기 쉬움, 자기일치감, 재미를 정확성의 증거로 사용하지 않는다.
6. 갈등이 있거나 전문 범위를 벗어난 claim은 숨기지 말고 conflict와 한계를 기록한다.

## 승인 규칙

검토자가 `accept`를 선택해도 claim은 곧바로 `APPROVED`가 되지 않는다. 역할별 독립 검토, 불일치 조정, 한국어 인지 인터뷰, 정량 파일럿, 제품 중복·개인정보 검수를 모두 통과해야 운영 승인 후보가 된다.
