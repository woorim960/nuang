# 뉴앙 성향지도 7개 역할 콘텐츠 검토 계약 v2

- 계약 ID: `NUANG-TRAIT-MAP-SEVEN-ROLE-REVIEW.v2`
- 상태: `LOCKED_FOR_CAB_01_REVIEW`
- 적용 단위: 713개 canonical 콘텐츠 entry
- 고객 발행 상태: `research_only`

## 1. 이 계약이 필요한 이유

자동 검사는 누락·중복·금지 표현·참조 오류를 빠르게 찾을 수 있지만, 문장이
실제로 성향을 정확히 설명하는지까지 승인할 수는 없다. 뉴앙은 다음 세 가지를
분리한다.

1. **자동 검사 통과**: 형식·출처 연결·개인정보 범위·재조합 구조가 맞다.
2. **7개 역할 검토 통과**: 문장의 의미·근거·안전·이해 가능성·제품 적합성이 맞다.
3. **실제 사용자 검증 통과**: 사용자가 의도한 뜻으로 이해하고, 뉴앙 점수와의
   연결이 정량·정성 자료에서 확인된다.

앞 단계가 끝났다고 다음 단계까지 통과한 것으로 기록하지 않는다.

## 2. 공통 결정값

| 결정 | 뜻 | 다음 조치 |
| --- | --- | --- |
| `approve` | 이 역할의 기준에서는 현재 버전을 그대로 다음 검토로 보낼 수 있다. | 다른 역할 검토를 계속한다. |
| `revise` | 핵심 뜻은 유지할 수 있으나 문장이나 근거 연결을 고쳐야 한다. | 새 버전 초안을 만들고 같은 역할이 다시 확인한다. |
| `hold` | 현재 자료만으로 판단하기 어렵거나 추가 근거·사용자 자료가 필요하다. | 필요한 자료와 해제 조건을 기록한다. |
| `reject` | 구성개념이 틀렸거나 안전하게 고칠 수 없는 주장이다. | 현재 버전을 폐기하고 대체 claim을 새로 설계한다. |

`approve`에도 근거와 짧은 판정 메모가 필요하다. 빈 메모, 검토자 식별값 없음,
검토 시각 없음은 완료로 계산하지 않는다.

## 3. 공통 issue code

### 성격심리

- `PSY_CONSTRUCT_MISMATCH`: 뉴앙 축과 다른 구성개념을 설명함
- `PSY_AXIS_DIRECTION_AMBIGUOUS`: 어느 축 방향인지 불분명함
- `PSY_REASON_BEHAVIOR_LEAP`: 가치·생각에서 행동으로 근거 없이 뛰어넘음
- `PSY_CONTEXT_OVERGENERALIZATION`: 한 상황의 경향을 모든 상황으로 넓힘
- `PSY_ABILITY_OR_MORAL_INFERENCE`: 능력·도덕성·우열을 암시함

### 심리측정

- `MET_SCORE_INFERENCE_UNVALIDATED`: 검증되지 않은 점수 차이를 실제 차이로 단정함
- `MET_AXIS_CONTAMINATION`: 다른 축의 의미가 섞임
- `MET_DICHOTOMY_OVERCLAIM`: 연속적인 차이를 완전한 두 종류처럼 설명함
- `MET_MIXED_CASE_MISSING`: 경계형·혼합형에서 문장이 성립하지 않음
- `MET_ITEM_CLAIM_MISMATCH`: 문항이 관찰하는 것보다 더 큰 주장을 함

### 연구방법

- `RES_SOURCE_TRACE_BROKEN`: source·finding·문장 계보가 끊김
- `RES_EVIDENCE_INDIRECT`: 근거가 해당 claim과 간접적으로만 연결됨
- `RES_NULL_OR_CONTRARY_IGNORED`: 무효·반대 결과를 검토하지 않음
- `RES_CULTURAL_TRANSFER_UNCHECKED`: 문화·언어 이전을 확인하지 않음
- `RES_HIGH_RISK_EVIDENCE_SHORTAGE`: 고위험 claim에 독립 근거가 부족함

### 쉬운 한국어

- `KOR_TRANSLATIONESE`: 번역체이거나 일상에서 쓰지 않는 표현임
- `KOR_ABSTRACT_OR_AMBIGUOUS`: 방향·리듬·장면처럼 문맥 없이 모호함
- `KOR_MULTIPLE_IDEAS`: 한 문장에 서로 다른 핵심이 너무 많이 들어감
- `KOR_SUBJECT_OR_ACTION_UNCLEAR`: 누가 무엇을 하는지 바로 알기 어려움
- `KOR_MOBILE_SCAN_FAILURE`: 모바일 줄바꿈에서 뜻이 깨지거나 너무 김

### 안전·개인정보

- `SAFE_PRIVATE_SIGNAL_LEAK`: `self_only` 내용을 프로필·공유·비교로 내보냄
- `SAFE_DIAGNOSIS_OR_STIGMA`: 진단·낙인으로 읽힐 수 있음
- `SAFE_RELATIONSHIP_OUTCOME`: 호감·관계 성공·상대 마음을 확정함
- `SAFE_SENSITIVE_INFERENCE`: 사용자가 제공하지 않은 민감정보를 추론함
- `SAFE_DETERMINISTIC_LABEL`: 사람을 고정적이고 바뀌지 않는 존재로 규정함

### 제품 콘텐츠

- `PROD_WRONG_SURFACE`: 요약·상세·프로필·공유 중 잘못된 화면에 배치됨
- `PROD_DUPLICATE_VALUE`: 앞뒤 내용과 같은 정보가 반복됨
- `PROD_SUMMARY_DETAIL_MISMATCH`: 요약과 상세가 서로 다른 뜻을 말함
- `PROD_LOW_USER_VALUE`: 정확하지만 사용자가 자신이나 상대를 이해하는 데 도움이 적음
- `PROD_POOR_SCAN_ORDER`: 중요한 내용이 뒤에 묻히거나 읽는 순서가 어색함

### 데이터 품질

- `DATA_ID_OR_VERSION_ERROR`: contentKey·canonical ID·version이 잘못됨
- `DATA_PROVENANCE_MISSING`: 원문·교정·제외 계보가 빠짐
- `DATA_RECOMPOSITION_ERROR`: 32개 코드 재조합에서 예상 밖 문장이 바뀜
- `DATA_PRIVACY_CONTRACT_ERROR`: privacyScope와 허용 화면이 맞지 않음
- `DATA_ROLLBACK_UNAVAILABLE`: 철회 시 돌아갈 버전이나 대체 문장이 없음

## 4. 역할별 필수 판정

### 4.1 성격심리 검토

- 축 방향과 문장의 핵심 행동이 일치하는가
- 생각·가치·행동을 같은 것으로 취급하지 않는가
- 상황 단서와 행동 이유가 자연스럽게 이어지는가
- 능력·도덕성·관계 결과를 성향으로 단정하지 않는가
- 한 글자 이웃과 비교했을 때 바뀐 축의 의미만 달라지는가

### 4.2 심리측정 검토

- 문항·점수·claim의 범위가 서로 맞는가
- 연속 점수를 완전한 두 부류처럼 말하지 않는가
- 경계형·혼합형에서도 과장 없이 읽히는가
- 다른 축이나 반응 스타일이 결과를 대신 설명하지 않는가
- 뉴앙 자체 검증 전인 연결은 `validation_required`로 남아 있는가

### 4.3 연구방법 검토

- source와 finding을 구분해 추적할 수 있는가
- 근거가 해당 상황·관계·행동 claim에 직접적인가
- 반대·무효 결과와 표본 한계를 함께 검토했는가
- 한국어·한국 문화에 옮길 때 추가 확인이 필요한가
- 고위험 claim은 독립 근거와 뉴앙 사용자 자료가 충분한가

### 4.4 쉬운 한국어 검토

- 남녀노소 누구나 첫 독해에서 뜻을 알 수 있는가
- 한 문장에는 핵심 내용을 하나만 담았는가
- 행동과 이유를 일상적인 말로 구체적으로 설명하는가
- 번역체·추상 명사·모호한 면책 표현이 반복되지 않는가
- 모바일에서 읽을 때 의미 단위가 자연스럽게 끊기는가

### 4.5 안전·개인정보 검토

- `self_only` 정보가 공개 화면으로 새지 않는가
- 진단·낙인·능력·호감·관계 성공을 확정하지 않는가
- 특정 성향을 우월하거나 위험한 유형으로 만들지 않는가
- 사용자가 제공하지 않은 민감한 특징을 추론하지 않는가
- 필요한 제한은 짧고 정확하게 적용하며 면책 문구를 반복하지 않는가

### 4.6 제품 콘텐츠 검토

- 요약은 핵심을, 상세는 이유와 상황 차이를 제공하는가
- 같은 정보를 다른 카드와 제목으로 반복하지 않는가
- 결과·성향지도·비교·프로필·공유에서 필요한 정보만 보이는가
- 사용자가 자신이나 궁금한 사람을 이해하는 데 실제 도움이 되는가
- 모바일에서 중요한 문장부터 자연스럽게 읽히는가

### 4.7 데이터 품질 검토

- ID·버전·축 서명·상황·claim 참조가 안정적인가
- 수정·제외·새 문장 작성의 계보가 모두 남아 있는가
- 32개 코드 재조합과 한 글자 이웃 검사가 통과했는가
- 개인정보 범위와 허용·금지 화면이 일치하는가
- 발행 후 문제 발생 시 이전 버전으로 안전하게 돌아갈 수 있는가

## 5. 완료 계산 규칙

entry 하나가 `expert_reviewed`가 되려면 다음을 모두 만족해야 한다.

1. 7개 역할이 모두 `approve`
2. 각 역할에 note·reviewerRef·reviewedAt 존재
3. `revise·hold·reject`가 한 개도 없음
4. 자동 게이트가 모두 통과 상태
5. 현재 version과 검토한 version이 동일

`expert_reviewed`는 고객 승인과 다르다. 사용자 이해도·구성개념·공정성 검증이
끝나기 전에는 계속 `research_only`로 둔다.

## 6. CAB-01 우선순위

1. `P0`: 새 근거 제한 문단 4개와 표적 축 교정에 포함된 총 24개 변형
2. `P1`: 서로 다른 원문 정보를 둘 이상 보존한 변형
3. `P2`: 단일 원문 기반의 표준 변형

우선순위는 위험의 크기이지 품질 등급이 아니다. `P0`는 수정 폭이 컸기 때문에
먼저 읽는다는 뜻이다.

## 7. 방법론 기준

- [Standards for Educational and Psychological Testing](https://www.testingstandards.net/):
  점수 해석과 사용 목적에 맞는 타당도 근거를 요구하는 상위 기준
- [COSMIN](https://www.cosmin.nl/)과
  [내용타당도 방법론](https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/):
  관련성·포괄성·이해 가능성을 분리해 확인하는 기준
- [International Test Commission 검사 적응 지침](https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf):
  단순 번역이 아니라 구성개념·문화·운영·해석까지 확인하는 기준
- [BFI-2 공식 자료](https://www.colby.edu/academics/departments-and-programs/psychology/research-opportunities/personality-lab/the-bfi-2/):
  넓은 성향 영역과 더 좁은 facet을 구분해 해석하는 참고 기준

이 기준 자료가 뉴앙의 5축과 32개 조합을 직접 검증해 주는 것은 아니다. 뉴앙
문장과 점수의 연결은 별도의 정성·정량 검증을 거쳐야 한다.
