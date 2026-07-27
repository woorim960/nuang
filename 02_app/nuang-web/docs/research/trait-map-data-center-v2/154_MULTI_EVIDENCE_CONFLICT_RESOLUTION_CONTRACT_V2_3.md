# 154. 다중 근거 충돌 판정 계약 v2.3

- 상태: `FAIL_CLOSED_CONFLICT_RULES_READY_NO_REAL_DECISIONS`
- 판정 차원: **8개**
- 우선순위 규칙: **8개**
- 합성 충돌 시험: **12/12 통과**
- 실제 판정 / canonical 수정 / 운영 allowlist: **0 / 0 / 0**

## 핵심 원칙

- 서로 다른 근거를 단순 합산하거나 다수결로 승인하지 않는다.
- 문장과 가까운 근거·상황·응답 층을 구분한다.
- 안전 실패는 다른 통과 결과보다 우선한다.
- 합성·내부 AI 판정은 독립 검토나 실제 타당도 근거를 대신하지 않는다.
- 문장을 수정하면 이전 결과를 자동 승계하지 않고 영향받은 gate를 다시 연다.
- 승인되지 않은 상태나 누락값은 기본 차단한다.

## 충돌 우선순위

1. `RESOLVE-SAFETY` — withdraw_or_rewrite: 유해·낙인·단정 표현은 다른 근거가 좋아도 공개하지 않는다.
2. `RESOLVE-TRACE` — blocked_trace: 출처와 canonical 계보를 재현할 수 없으면 평가 자체를 진행하지 않는다.
3. `RESOLVE-SCOPE` — blocked_scope_or_context: 다른 구성개념·상황의 결과를 현재 문장 직접 근거로 바꾸지 않는다.
4. `RESOLVE-DIRECT-NULL` — narrow_rewrite_or_archive: 문장과 가장 가까운 직접 검증이 지지하지 않으면 넓은 문장을 유지하지 않는다.
5. `RESOLVE-REVIEW-SPLIT` — adjudicate_without_release: 역할 간 이견을 평균내어 승인하지 않고 쟁점 구절별로 다시 판정한다.
6. `RESOLVE-COMPREHENSION` — revise_and_retest: 연구자가 이해해도 사용자가 다른 뜻으로 읽으면 공개 문장으로 사용할 수 없다.
7. `RESOLVE-ALL-TECHNICAL-PASS` — eligible_research_candidate_not_public: 연구 gate 통과와 고객 화면 발행은 분리한다.
8. `RESOLVE-SURFACE-APPROVAL` — eligible_for_explicit_surface_allowlist: 승인된 canonical ID와 화면만 명시적 allowlist에 넣는다.

## 수정 뒤 다시 여는 gate

- 문구만 수정: 인지 면담·독립 문장 검토·중복·안전·32개 재조합
- 의미 범위 축소: 근거 범위·직접 검증·인지 면담·독립 검토·32개 재조합
- 축/방향 변경: 계보·근거·직접 검증·32개 재조합·비교·리포트 영향 전체
- 철회: 모든 화면 allowlist 제거와 32개 성향 fallback

이 계약은 충돌을 자동 승인하지 않고 안전하게 보류하는 규칙을 시험한다. 합성 fixture는 독립 검토나 실제 연구 결과가 아니며, 현재 운영 허용 문장은 0개다.
