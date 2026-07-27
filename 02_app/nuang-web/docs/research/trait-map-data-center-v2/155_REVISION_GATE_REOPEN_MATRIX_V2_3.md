# 155. Revision gate 재개방 matrix v2.3

- 상태: `REOPEN_MATRIX_AND_SYNTHETIC_IMPACT_TEST_READY`
- 변경 유형: **4개**
- gate 목록: **12개**
- 합성 영향 사례: **4개**
- 검사한 profile 참조: **9216개**
- canonical/profile/발행 commit: **0 / 0 / 0**

## 변경 유형별 원칙

- **wording_only** — 축·방향·상황·주장 범위는 유지하고 쉬운 말·문장 구조만 바꾼다.
  - 다시 여는 gate: independent_seven_role_review, cognitive_interview, comprehension_test, unsafe_language, duplicate_output, profile_recomposition_32, neighbor_differentiation, publication_surface_approval
- **semantic_narrowing** — 기존 문장의 적용 상황·관계·행동 범위를 더 좁힌다.
  - 다시 여는 gate: semantic_scope, context_applicability, scenario_direct_validation, independent_seven_role_review, cognitive_interview, comprehension_test, unsafe_language, duplicate_output, profile_recomposition_32, neighbor_differentiation, publication_surface_approval
- **axis_or_direction_change** — semanticAxes, axisSignature 또는 한 축의 방향을 바꾼다.
  - 다시 여는 gate: source_trace, semantic_scope, context_applicability, scenario_direct_validation, independent_seven_role_review, cognitive_interview, comprehension_test, unsafe_language, duplicate_output, profile_recomposition_32, neighbor_differentiation, publication_surface_approval
- **withdrawal** — canonical variant를 사용 중단하고 모든 화면에서 제거한다.
  - 다시 여는 gate: profile_recomposition_32, neighbor_differentiation, publication_surface_approval

## 합성 영향 시험

- `wording_only`: 16개 성향 코드 참조 영향, 8개 gate 재개방
- `semantic_narrowing`: 8개 성향 코드 참조 영향, 11개 gate 재개방
- `axis_or_direction_change`: 4개 성향 코드 참조 영향, 12개 gate 재개방
- `withdrawal`: 8개 성향 코드 참조 영향, 3개 gate 재개방

변경 문장을 참조하는 성향만 직접 내용 영향으로 표시하지만, 전체 32개 재조합·중복·한 글자 이웃 검사는 항상 다시 실행한다. 합성 시험은 실제 문장이나 발행 상태를 바꾸지 않았다.
