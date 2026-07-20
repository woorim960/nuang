# ENAKQ Claim Registry · Fixture 계약 v0.1

작성일: 2026-07-20 KST  
계약: `nuang-trait-claim-registry.v0.1`, `nuang-trait-profile-fixture.v0.1`  
상태: `RESEARCH_CONTRACT_IMPLEMENTED_NOT_FOR_PRODUCTION`

## 1. 이번 단계의 목적

ENAKQ의 55,513자 연구 원문을 그대로 DB나 사용자 화면에 넣지 않는다. 먼저 사용자에게 전달할 수 있는 가장 작은 의미 단위인 claim을 고유하게 등록하고, 실제로 측정된 데이터가 있을 때만 해당 claim을 선택할 수 있는 계약을 만든다.

이 계약은 다음 문제를 막는다.

- 같은 의미를 성향지도·개인 리포트·비교 리포트에서 반복 노출하는 문제
- 검증이 끝나지 않은 조합 가설을 사실처럼 발행하는 문제
- 처음 드는 생각이나 실제 나타나는 반응을 측정하지 않고 코드만으로 추정하는 문제
- 본인 전용 과정 정보를 상대 비교나 공개 프로필에 사용하는 문제
- 연구 원문이 수정됐는데 앱용 데이터가 과거 상태로 남는 문제

## 2. 단일 출처와 생성 흐름

```text
5개 ENAKQ 연구 원문 + 5개 근거 원장
                  ↓
generate-enakq-claim-registry.mjs
                  ↓
158개 canonical claim registry
                  ↓
Zod 계약 검증 + 결과 fixture + 화면별 선택기
                  ↓
전문가·인지·정량 검토를 통과한 claim만 운영 후보
```

- 원문 문단의 `block` 주석이 claim의 출처 위치를 제공한다.
- 근거 원장의 claim 표가 근거 상태와 외부·내부 근거 묶음을 제공한다.
- 생성기는 같은 claim의 상태가 원장마다 다르거나, 등록되지 않은 claim을 원문이 참조하거나, source block이 없는 claim이 있으면 실패한다.
- `npm run research:enakq:claim-registry:check`는 원문·원장과 생성 결과의 바이트 단위 일치를 확인한다.

## 3. contentKey 규칙

형식은 아래와 같다.

```text
trait-map.{lowercase-code}.{stable-meaning-key}
```

예시:

```text
claimId:    ENAKQ.general.definition.E
contentKey: trait-map.enakq.general.definition.e
```

`claimId`와 `contentKey`는 문구가 다듬어져도 의미가 같다면 유지한다. 의미 자체가 달라진 경우 새 claim과 새 `contentKey`를 만든다. 한 화면의 합성기는 이미 사용한 `contentKey`를 다시 렌더하지 않는다.

## 4. 레지스트리 필드

| 필드                                   | 역할                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `claimId`                              | 변경되지 않는 연구·제품 추적 식별자                         |
| `contentKey`                           | 한 화면에서 같은 의미의 반복을 막는 키                      |
| `canonicalSectionId`                   | 해당 의미를 가장 자세히 설명하는 성향지도 장                |
| `claimKind`                            | 정의·처음 생각·실제 반응·강점·마찰·오해·질문·경계 등의 역할 |
| `contexts`                             | 전체·가족·친구·연인·마음 가는 사람·업무 범위                |
| `evidenceStatus`                       | 현재 근거와 남은 검증 상태                                  |
| `publicationState`                     | 연구 전용·검토 후보·운영 승인 구분                          |
| `requiredSignals`                      | 이 문장을 개인화하려면 실제로 있어야 하는 데이터            |
| `privacyScope`                         | 본인 전용·비교 가능·공개 가능 범위                          |
| `candidateSurfaces`                    | 검증 뒤 사용할 수 있는 화면 후보이며 현재 노출 허가가 아님  |
| `sourceBlockRefs`                      | 55,513자 원문의 문단 위치                                   |
| `sourceParts`                          | 해당 claim을 다루는 Part 목록                               |
| `externalEvidence`, `internalEvidence` | 근거 원장에 기록된 추적 묶음                                |

## 5. 현재 158개 claim 상태

### 근거 상태

| 상태                           |  수 |
| ------------------------------ | --: |
| `HOLD`                         |  65 |
| `COGNITIVE_REVIEW_REQUIRED`    |  36 |
| `EXTERNAL_SUPPORTED_BOUNDARY`  |  13 |
| `NUANG_MAPPED_PROVISIONAL`     |  13 |
| `SAFETY_POLICY`                |  11 |
| `QUANT_VALIDATION_REQUIRED`    |   8 |
| `EXTERNAL_SUPPORTED`           |   4 |
| `DESIGN_APPROVED_NOT_EXECUTED` |   4 |
| `EVIDENCE_DOCUMENTED`          |   2 |
| `EXTERNAL_SUPPORTED_METHOD`    |   2 |
| `APPROVED`                     |   0 |

### 발행 상태

| 상태               |  수 | 의미                                                 |
| ------------------ | --: | ---------------------------------------------------- |
| `research_only`    | 126 | 내부 감사와 후속 연구에서만 사용                     |
| `review_candidate` |  32 | 경계·방법·안전 문장 검토 후보, 운영 공개는 아직 불가 |
| `approved`         |   0 | 현재 운영에서 사용할 수 있는 claim 없음              |

외부 연구가 넓은 구성개념을 지지하거나 안전 정책이 필요하다는 이유만으로 ENAKQ 사용자 문구가 승인되는 것은 아니다. 현재 `production` 선택기는 158개를 모두 숨긴다.

## 6. 개인정보와 화면 범위

| 범위              |  수 | 규칙                                                                      |
| ----------------- | --: | ------------------------------------------------------------------------- |
| `self_only`       |   9 | 처음 드는 생각·실제 반응 등 본인 측정 자료가 있을 때만 본인 화면에서 사용 |
| `comparison_safe` | 115 | 검증·동의·관계 맥락 조건을 통과한 뒤 비교 후보가 될 수 있음               |
| `public_safe`     |  34 | 정의·경계 등 공개 후보이나 `APPROVED` 전에는 공개하지 않음                |

`self_only` claim은 `candidateSurfaces`에 비교 리포트나 공개 프로필을 넣을 수 없다. 선택기에도 같은 차단을 한 번 더 적용한다. 이중 방어로 향후 필드가 잘못 연결되더라도 개인 과정 정보가 상대 화면으로 새지 않게 한다.

## 7. 세 가지 합성 fixture

실제 사용자 데이터가 아닌 합성 자료만 사용한다.

### `ENAKQ.clear.v0.1`

- 다섯 축이 모두 50%에서 충분히 떨어진 선명형
- 세부 성향도 대표 방향과 대체로 일치
- 대표 정의와 상황 후보가 과도하게 단정되지 않는지 확인

### `ENAKQ.boundary.v0.1`

- 다섯 축이 모두 51~55%인 경계형
- 현재 더 가까운 글자는 ENAKQ로 유지하되 양쪽 모습이 함께 나타날 수 있다는 설명 필요
- 한쪽 성향을 확정적으로 설명하는 문구를 찾는 반례 자료

### `ENAKQ.facet-split.v0.1`

- 대표 축은 ENAKQ지만 같은 축 안의 일부 세부 성향은 반대 방향
- 대표 글자만으로 하위 성향을 모두 같다고 설명하는 오류를 확인
- 세부 데이터 없이 조합 claim을 보여주지 않는지 확인

모든 fixture는 합성 자료이며 직접 응답과 원점수 payload를 포함하지 않는다. 코드 글자는 축 점수에서 다시 계산하고, 경계 표시는 50%에서 5%p 이내라는 규칙과 자동 대조한다.

## 8. 선택 모드

| 모드             | 용도                  | 선택 규칙                                          |
| ---------------- | --------------------- | -------------------------------------------------- |
| `research_audit` | 내부 반례·누락 감사   | 필수 신호와 개인정보 범위를 만족한 연구 claim 확인 |
| `review_preview` | 외부 전문가·인지 검토 | `review_candidate` 이상만 확인                     |
| `production`     | 실제 사용자 화면      | `approved`만 선택; 현재 결과는 0개                 |

화면별 선택 과정에서도 `contentKey`를 Set으로 추적해 같은 의미를 두 번 반환하지 않는다.

## 9. 자동 검증

현재 자동 검증 범위:

- 158개 claim 및 158개 고유 `contentKey`
- claim과 source block의 연결 누락 0건
- 동일 claim의 근거 상태 충돌 0건
- `HOLD`를 검토·운영 상태로 올리는 시도 차단
- `APPROVED` 근거 없이 운영 승인하는 시도 차단
- 본인 전용 claim을 비교·공개 화면 후보로 두는 시도 차단
- 필수 신호가 없는 claim 자동 숨김
- 선명형·경계형·세부 성향 분화형 fixture 구조 검증
- fixture 코드와 다섯 축 점수 불일치 차단
- 동일 `contentKey` 중복 차단

## 10. 아직 하지 않은 일

- 158개 claim에 사용자용 `shortCopy`·`longCopy`를 발행하지 않았다.
- DB migration이나 운영 seed를 만들지 않았다.
- 성향지도·리포트 UI에 연결하지 않았다.
- 외부 자격 전문가 검토, 한국어 인지 인터뷰, 정량 파일럿을 완료하지 않았다.
- `APPROVED` claim은 아직 없다.

이 순서를 지켜야 연구 초안을 앱에 먼저 노출한 뒤 수정하는 일을 피할 수 있다.

## 11. 다음 단계

1. 158개 레지스트리를 성격심리·심리측정·관계/임상 안전 검토용 패킷으로 변환한다.
2. 검토자는 claim마다 `accept`, `revise`, `reject`, `insufficient_evidence`와 이유를 기록한다.
3. 내부 수정 뒤 2030 한국어 사용자를 대상으로 이해·오해·낙인·자기일치감을 분리해 인지 인터뷰한다.
4. 문항·점수와 claim 연결을 정량 파일럿에서 검증한다.
5. 모든 게이트를 통과한 claim만 사용자 문구로 다듬고 `APPROVED` 후보로 올린다.
6. 그 뒤에만 DB와 성향지도·개인 리포트·비교 리포트 UI를 연결한다.
